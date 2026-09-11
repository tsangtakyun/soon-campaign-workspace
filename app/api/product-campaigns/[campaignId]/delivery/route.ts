import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, any>

async function load(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { access, campaign, user }
}

async function deliveryPayload(data: Exclude<Awaited<ReturnType<typeof load>>, { error: NextResponse }>) {
  const [{ data: projects, error: projectError }, { data: jobs, error: jobError }, { data: posts, error: postError }] = await Promise.all([
    data.access.admin.from('content_projects').select('id,title,stage,selected_format,campaign_angle_id,creative_role,variant_key,brief,production').eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).order('created_at'),
    data.access.admin.from('creative_generation_jobs').select('id,content_project_id,job_type,status,output,error_message,prompt_snapshot').eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id),
    data.access.admin.from('campaign_posts').select('id,content_project_id,status,scheduled_at,posted_at').eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id),
  ])
  if (projectError || jobError || postError) throw projectError || jobError || postError
  return { campaign: data.campaign, projects: projects || [], jobs: jobs || [], posts: posts || [], permissions: { canApprove: data.access.canApprove, canPublish: data.access.canPublish } }
}

export async function GET(_request: Request, { params }: RouteProps) {
  try { const data = await load((await params).campaignId); if ('error' in data) return data.error; return NextResponse.json(await deliveryPayload(data)) }
  catch (error) { return NextResponse.json({ error: '未能載入Campaign Delivery', detail: String(error) }, { status: 500 }) }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const data = await load((await params).campaignId); if ('error' in data) return data.error
    if (!data.access.canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => ({})); const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const decision = body.decision === 'changes_requested' ? 'changes_requested' : 'approved'
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : ''
    const scheduledAt = typeof body.scheduledAt === 'string' && body.scheduledAt ? new Date(body.scheduledAt) : null
    if (!projectId || (scheduledAt && Number.isNaN(scheduledAt.getTime()))) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const { data: project } = await data.access.admin.from('content_projects').select('*').eq('id', projectId).eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).maybeSingle()
    if (!project) return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    const { data: job } = await data.access.admin.from('creative_generation_jobs').select('*').eq('content_project_id', projectId).eq('campaign_id', data.campaign.id).maybeSingle()
    if (decision === 'approved' && job?.status !== 'completed') return NextResponse.json({ error: 'Asset尚未完成，不能批准' }, { status: 409 })
    const now = new Date().toISOString(); const production = project.production || {}
    const approval = { status: decision, note, reviewedAt: now, reviewedBy: data.user.id }
    const nextProduction = { ...production, approval }
    if (decision === 'approved') {
      const asset = job?.output?.asset || {}; const assets = Array.isArray(job?.output?.assets) && job.output.assets.length ? job.output.assets : asset.url ? [asset] : []; const sourceKey = `campaign-creative-${project.id}`
      const values = {
        user_id: project.created_by || data.user.id, workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id,
        content_project_id: project.id, campaign_angle_id: project.campaign_angle_id, source_key: sourceKey,
        title: String(project.title || 'Campaign creative').slice(0, 200), body: String(production.captionDraft || ''),
        post_type: project.selected_format === 'short_video' ? 'video' : project.selected_format === 'carousel' ? 'carousel' : 'single_image', image_url: asset.url || null,
        scheduled_at: scheduledAt?.toISOString() || null, status: scheduledAt ? 'scheduled' : 'approved', approved_at: now,
        captions: { contentProjectId: project.id, campaignAngleId: project.campaign_angle_id, creativeRole: project.creative_role, asset, assets, finalVideoRendered: job?.output?.finalVideoRendered === true }, updated_at: now,
      }
      const { error } = await data.access.admin.from('campaign_posts').upsert(values, { onConflict: 'campaign_id,source_key' }); if (error) throw error
    } else {
      await data.access.admin.from('campaign_posts').update({ status: 'withdrawn', scheduled_at: null, approved_at: null, updated_at: now }).eq('campaign_id', data.campaign.id).eq('content_project_id', project.id).is('posted_at', null)
    }
    const { error: updateError } = await data.access.admin.from('content_projects').update({ production: nextProduction, stage: decision === 'approved' ? (scheduledAt ? 'scheduled' : 'approval') : 'production', updated_at: now, updated_by: data.user.id }).eq('id', project.id)
    if (updateError) throw updateError
    if (decision === 'changes_requested' && job?.id) {
      const promptSnapshot = job.prompt_snapshot && typeof job.prompt_snapshot === 'object' ? job.prompt_snapshot : {}
      const { error: revisionError } = await data.access.admin.from('creative_generation_jobs').update({
        status: 'queued', progress: 0, attempt: 0, error_message: null,
        prompt_snapshot: { ...promptSnapshot, production: nextProduction }, updated_at: now,
      }).eq('id', job.id)
      if (revisionError) throw revisionError
    }
    const payload = await deliveryPayload(data)
    const approved = payload.projects.filter((item: JsonRecord) => item.production?.approval?.status === 'approved').length
    const ready = payload.jobs.filter((item: JsonRecord) => item.status === 'completed').length
    const weeklyProgress = payload.projects.reduce((weeks: Record<string, { total: number; approved: number }>, item: JsonRecord) => {
      if (!Number(item.brief?.campaignWeek)) return weeks
      const week = String(Math.max(1, Math.min(4, Number(item.brief.campaignWeek))))
      const current = weeks[week] || { total: 0, approved: 0 }
      weeks[week] = { total: current.total + 1, approved: current.approved + (item.production?.approval?.status === 'approved' ? 1 : 0) }
      return weeks
    }, {})
    const manifest = { total: payload.projects.length, ready, approved, changesRequested: payload.projects.filter((item: JsonRecord) => item.production?.approval?.status === 'changes_requested').length, weeks: weeklyProgress, updatedAt: now }
    await data.access.admin.from('marketing_campaigns').update({ delivery_manifest: manifest, generation_status: approved === payload.projects.length ? 'delivery_approved' : 'delivery_review', status: approved === payload.projects.length ? 'ready' : 'in_production', updated_at: now }).eq('id', data.campaign.id)
    return NextResponse.json({ ...payload, manifest, success: true })
  } catch (error) { return NextResponse.json({ error: '未能更新Campaign Delivery', detail: String(error) }, { status: 500 }) }
}
