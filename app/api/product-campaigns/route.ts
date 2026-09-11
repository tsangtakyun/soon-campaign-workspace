import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const CAMPAIGN_KINDS = new Set(['product', 'service', 'offer'])
const OBJECTIVES = new Set(['sales', 'launch', 'awareness', 'leads'])

function text(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function lines(value: unknown, limit = 20) {
  return Array.from(new Set(text(value).split(/\n|,/).map((item) => item.trim()).filter(Boolean))).slice(0, limit)
}

async function requestAccess(workspaceId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { access, user }
}

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId') || ''
    if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
    const auth = await requestAccess(workspaceId)
    if (auth.error) return auth.error

    const { data, error } = await auth.access.admin
      .from('marketing_campaigns')
      .select('id,name,status,campaign_type,objective,primary_metric,generation_status,created_at,updated_at,product_id,delivery_manifest,product:products(id,kind,name,source_url,price_label,status)')
      .eq('workspace_id', workspaceId)
      .in('campaign_type', ['product_launch', 'service_campaign', 'offer_campaign'])
      .order('created_at', { ascending: false })
    if (error) throw error
    const campaigns = data || []
    const campaignIds = campaigns.map((campaign: any) => campaign.id)
    const productIds = campaigns.map((campaign: any) => campaign.product_id).filter(Boolean)
    const [projectResult, jobResult, postResult, assetResult] = await Promise.all([
      campaignIds.length
        ? auth.access.admin.from('content_projects').select('id,campaign_id,stage,brief,production').eq('workspace_id', workspaceId).in('campaign_id', campaignIds)
        : { data: [], error: null },
      campaignIds.length
        ? auth.access.admin.from('creative_generation_jobs').select('id,campaign_id,content_project_id,status').eq('workspace_id', workspaceId).in('campaign_id', campaignIds)
        : { data: [], error: null },
      campaignIds.length
        ? auth.access.admin.from('campaign_posts').select('id,campaign_id,content_project_id,status,scheduled_at,posted_at').eq('workspace_id', workspaceId).in('campaign_id', campaignIds)
        : { data: [], error: null },
      productIds.length
        ? auth.access.admin.from('product_assets').select('product_id,url,is_primary,created_at').eq('workspace_id', workspaceId).in('product_id', productIds).order('created_at')
        : { data: [], error: null },
    ])
    const { data: projects, error: projectError } = projectResult
    const { data: jobs, error: jobError } = jobResult
    const { data: posts, error: postError } = postResult
    const { data: assets, error: assetError } = assetResult
    if (projectError || jobError || postError || assetError) throw projectError || jobError || postError || assetError

    const summaries = campaigns.map((campaign: any) => {
      const campaignProjects = (projects || []).filter((item: any) => item.campaign_id === campaign.id)
      const campaignJobs = (jobs || []).filter((item: any) => item.campaign_id === campaign.id)
      const campaignPosts = (posts || []).filter((item: any) => item.campaign_id === campaign.id)
      const completedProjectIds = new Set(campaignJobs.filter((item: any) => item.status === 'completed').map((item: any) => item.content_project_id))
      const weeks: Record<string, { total: number; ready: number; approved: number; pendingApproval: number; changesRequested: number; scheduled: number; published: number }> = {}
      campaignProjects.forEach((project: any) => {
        const week = String(Math.max(1, Math.min(4, Number(project.brief?.campaignWeek) || 1)))
        const current = weeks[week] || { total: 0, ready: 0, approved: 0, pendingApproval: 0, changesRequested: 0, scheduled: 0, published: 0 }
        const approval = project.production?.approval?.status
        const post = campaignPosts.find((item: any) => item.content_project_id === project.id)
        current.total += 1
        if (completedProjectIds.has(project.id)) current.ready += 1
        if (approval === 'approved') current.approved += 1
        if (completedProjectIds.has(project.id) && !approval) current.pendingApproval += 1
        if (approval === 'changes_requested') current.changesRequested += 1
        if (post?.status === 'scheduled' || post?.scheduled_at) current.scheduled += 1
        if (post?.status === 'published' || post?.posted_at) current.published += 1
        weeks[week] = current
      })
      const total = campaignProjects.length
      const ready = campaignProjects.filter((project: any) => completedProjectIds.has(project.id)).length
      const approved = campaignProjects.filter((project: any) => project.production?.approval?.status === 'approved').length
      const changesRequested = campaignProjects.filter((project: any) => project.production?.approval?.status === 'changes_requested').length
      const pendingApproval = campaignProjects.filter((project: any) => completedProjectIds.has(project.id) && !project.production?.approval?.status).length
      const scheduled = campaignPosts.filter((post: any) => post.status === 'scheduled' || post.scheduled_at).length
      const published = campaignPosts.filter((post: any) => post.status === 'published' || post.posted_at).length
      const primaryAsset = (assets || []).find((asset: any) => asset.product_id === campaign.product_id && asset.is_primary)
        || (assets || []).find((asset: any) => asset.product_id === campaign.product_id)
      return { ...campaign, imageUrl: primaryAsset?.url || null, progress: { total, ready, approved, changesRequested, pendingApproval, scheduled, published, weeks } }
    })
    return NextResponse.json({ campaigns: summaries, pendingApproval: summaries.reduce((sum: number, campaign: any) => sum + campaign.progress.pendingApproval, 0) })
  } catch (error) {
    console.error('[product-campaigns] list failed', error)
    return NextResponse.json({ error: '未能載入 Product Campaigns', detail: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let productId: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = text(body.workspaceId, 80)
    const name = text(body.name, 200)
    const kind = CAMPAIGN_KINDS.has(body.kind) ? body.kind as 'product' | 'service' | 'offer' : 'product'
    const objective = OBJECTIVES.has(body.objective) ? body.objective as string : 'sales'
    if (!isUuid(workspaceId) || !name) {
      return NextResponse.json({ error: '請提供有效 Workspace 及名稱' }, { status: 400 })
    }

    const auth = await requestAccess(workspaceId)
    if (auth.error) return auth.error
    if (!auth.access.canEdit) return NextResponse.json({ error: '你沒有建立 Campaign 的權限' }, { status: 403 })

    const sellingPoints = lines(body.sellingPoints)
    const targetAudience = text(body.targetAudience, 1500)
    const restrictions = lines(body.notes)
    const sourceUrl = text(body.sourceUrl, 2000) || null
    const priceLabel = text(body.price, 200) || null
    const marketRegion = text(body.marketRegion, 40) || 'HK'
    const now = new Date().toISOString()

    const { data: product, error: productError } = await auth.access.admin
      .from('products')
      .insert({
        workspace_id: workspaceId,
        kind,
        name,
        source_url: sourceUrl,
        price_label: priceLabel,
        selling_points: sellingPoints,
        target_audiences: targetAudience ? [targetAudience] : [],
        restrictions,
        source_snapshot: { inputMethod: sourceUrl ? 'url_and_manual' : 'manual', submittedAt: now },
        status: 'draft',
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select('id,kind,name,status')
      .single()
    if (productError) throw productError
    productId = product.id

    const campaignType = kind === 'service' ? 'service_campaign' : kind === 'offer' ? 'offer_campaign' : 'product_launch'
    const primaryMetric = objective === 'sales' ? 'conversion_rate' : objective === 'leads' ? 'qualified_leads' : objective === 'launch' ? 'engaged_reach' : 'reach'
    const { data: campaign, error: campaignError } = await auth.access.admin
      .from('marketing_campaigns')
      .insert({
        user_id: auth.user.id,
        workspace_id: workspaceId,
        source_key: `product-${product.id}-campaign-1`,
        name: `${name} Campaign`,
        campaign_type: campaignType,
        product_id: product.id,
        objective,
        primary_metric: primaryMetric,
        target_audience: targetAudience || null,
        raw_campaign_details: {
          kind,
          name,
          notes: text(body.notes),
          price: priceLabel,
          sellingPoints,
          sourceUrl,
          targetAudience,
          marketRegion,
        },
        status: 'draft',
        generation_status: 'not_started',
        updated_at: now,
      })
      .select('id,name,status,campaign_type,objective,primary_metric,generation_status')
      .single()
    if (campaignError) {
      await auth.access.admin.from('products').delete().eq('id', product.id).eq('workspace_id', workspaceId)
      throw campaignError
    }

    const imageAssets = Array.isArray(body.imageAssets)
      ? body.imageAssets.filter((asset: unknown) => asset && typeof asset === 'object').slice(0, 6)
      : body.imageAsset && typeof body.imageAsset === 'object' ? [body.imageAsset] : []
    if (imageAssets.length) {
      const assetRows = imageAssets.filter((asset: Record<string, unknown>) => text(asset.url, 2500)).map((asset: Record<string, unknown>, index: number) => ({
        workspace_id: workspaceId,
        product_id: product.id,
        asset_type: kind === 'service' ? 'service' : 'original',
        url: text(asset.url, 2500),
        storage_path: text(asset.storagePath, 1000) || null,
        filename: text(asset.filename, 240) || null,
        mime_type: text(asset.mimeType, 100) || null,
        width: Number.isInteger(asset.width) ? asset.width : null,
        height: Number.isInteger(asset.height) ? asset.height : null,
        is_primary: index === 0,
        created_by: auth.user.id,
      }))
      const { error: assetError } = assetRows.length ? await auth.access.admin.from('product_assets').insert(assetRows) : { error: null }
      if (assetError) console.error('[product-campaigns] product asset record failed', { assetError, productId: product.id })
    }

    return NextResponse.json({ campaign, product, success: true }, { status: 201 })
  } catch (error) {
    console.error('[product-campaigns] create failed', { error, productId })
    return NextResponse.json({ error: '未能建立 Product Campaign', detail: String(error) }, { status: 500 })
  }
}
