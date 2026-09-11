import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { fetchSafeExternal } from '@/lib/safe-external-url'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type RecordValue = Record<string, unknown>

function parseJson(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(clean) as RecordValue } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1)) as RecordValue
    throw new Error('AI response is not valid JSON')
  }
}

function cleanText(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanList(value: unknown, max = 12) {
  return Array.isArray(value) ? value.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, max) : []
}

async function loadContext(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: campaign } = await server
    .from('marketing_campaigns')
    .select('id,workspace_id,product_id,name,objective,primary_metric,hypothesis,generation_status,target_audience,raw_campaign_details')
    .eq('id', campaignId)
    .maybeSingle()
  if (!campaign?.workspace_id || !campaign.product_id) {
    return { error: NextResponse.json({ error: 'Product Campaign not found' }, { status: 404 }) }
  }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const [{ data: product, error: productError }, { data: assets, error: assetsError }] = await Promise.all([
    access.admin.from('products').select('*').eq('id', campaign.product_id).eq('workspace_id', campaign.workspace_id).single(),
    access.admin.from('product_assets').select('id,asset_type,url,filename,mime_type,width,height,is_primary').eq('product_id', campaign.product_id).eq('workspace_id', campaign.workspace_id).order('is_primary', { ascending: false }),
  ])
  if (productError || assetsError) throw productError || assetsError
  return { access, assets: assets || [], campaign, product, user }
}

async function websiteText(sourceUrl: string | null) {
  if (!sourceUrl) return ''
  try {
    const response = await fetchSafeExternal(sourceUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'SOON Product Analyzer/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return ''
    return (await response.text())
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 18000)
  } catch { return '' }
}

async function imageBlock(asset: { url?: string; mime_type?: string | null } | undefined) {
  if (!asset?.url) return null
  try {
    const response = await fetchSafeExternal(asset.url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || asset.mime_type || ''
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return null
    return { type: 'image', source: { type: 'base64', media_type: contentType, data: bytes.toString('base64') } }
  } catch { return null }
}

export async function GET(_req: Request, { params }: RouteProps) {
  try {
    const context = await loadContext((await params).campaignId)
    if (context.error) return context.error
    return NextResponse.json({ assets: context.assets, campaign: context.campaign, product: context.product })
  } catch (error) {
    return NextResponse.json({ error: '未能載入 Product Understanding', detail: String(error) }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: RouteProps) {
  try {
    const context = await loadContext((await params).campaignId)
    if (context.error) return context.error
    if (!context.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })

    const [pageText, visual] = await Promise.all([
      websiteText(context.product.source_url),
      imageBlock(context.assets.find((asset) => asset.is_primary) || context.assets[0]),
    ])
    const manual = context.campaign.raw_campaign_details || {}
    const prompt = [
      '分析今次要推廣的產品、服務或優惠。手動輸入是主要事實來源；URL及圖片只可用作補充。',
      '不要把圖片推測、一般常識或網站上其他產品寫成已確認事實。功效、成分、價格及比較聲稱如未由手動資料明確提供，必須放入 unverifiedClaims。',
      'summary 與 coreValue 只可使用 confirmedClaims 或 proofPoints 支持的內容，任何放入 unverifiedClaims 的資訊都不可在 summary、coreValue 或其他建議中當成事實重複。',
      '如屬藥物、保健、醫療、美容療效、金融或其他受規管產品：即使由用家手動輸入，功效、安全、劑量、比較及適用人士等聲稱仍須有包裝可見文字或可靠來源支持；否則列入 unverifiedClaims。摘要只描述產品種類及用途，不得擴寫療效。',
      `Campaign objective: ${context.campaign.objective || '未提供'}`,
      `Manual brief: ${JSON.stringify(manual)}`,
      `Stored product: ${JSON.stringify({ kind: context.product.kind, name: context.product.name, price: context.product.price_label, sellingPoints: context.product.selling_points, targetAudiences: context.product.target_audiences, restrictions: context.product.restrictions })}`,
      `Product URL text: ${pageText || '未能讀取或未提供'}`,
      '只輸出 JSON object：',
      JSON.stringify({
        summary: '一句清楚描述今次賣甚麼',
        coreValue: '核心價值',
        useCases: ['使用或購買場景'],
        audienceTensions: ['目標受眾目前的痛點、慾望或阻力'],
        proofPoints: ['只列已有資料支持的證據'],
        objections: ['購買前可能疑問'],
        confirmedClaims: ['由手動資料明確支持的聲稱'],
        unverifiedClaims: ['需要品牌確認的聲稱'],
        restrictions: ['內容不可做或不可聲稱的事項'],
        recommendedObjective: 'sales|launch|awareness|leads',
        recommendedPrimaryMetric: '建議主要 KPI',
      }),
    ].join('\n\n')
    const content: RecordValue[] = [{ type: 'text', text: prompt }]
    if (visual) content.push(visual as unknown as RecordValue)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_PRODUCT_MODEL),
        max_tokens: 2400,
        temperature: 0.2,
        system: 'You are SOON Product Intelligence. Return valid JSON only in concise Traditional Chinese.',
        messages: [{ role: 'user', content }],
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed')
    const responseText = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const raw = parseJson(responseText)
    const understanding = {
      summary: cleanText(raw.summary, 1000), coreValue: cleanText(raw.coreValue, 1000),
      useCases: cleanList(raw.useCases), audienceTensions: cleanList(raw.audienceTensions),
      proofPoints: cleanList(raw.proofPoints), objections: cleanList(raw.objections),
      confirmedClaims: cleanList(raw.confirmedClaims), unverifiedClaims: cleanList(raw.unverifiedClaims),
      restrictions: cleanList(raw.restrictions), recommendedObjective: cleanText(raw.recommendedObjective, 50),
      recommendedPrimaryMetric: cleanText(raw.recommendedPrimaryMetric, 100), analysisVersion: 2, generatedAt: new Date().toISOString(), status: 'review_required',
    }
    const sourceSnapshot = context.product.source_snapshot && typeof context.product.source_snapshot === 'object' ? context.product.source_snapshot : {}
    const { error: saveError } = await context.access.admin.from('products').update({ source_snapshot: { ...sourceSnapshot, understanding }, updated_by: context.user.id, updated_at: new Date().toISOString() }).eq('id', context.product.id).eq('workspace_id', context.campaign.workspace_id)
    if (saveError) throw saveError
    await context.access.admin.from('marketing_campaigns').update({ generation_status: 'understanding_review', hypothesis: understanding.coreValue, updated_at: new Date().toISOString() }).eq('id', context.campaign.id).eq('workspace_id', context.campaign.workspace_id)
    return NextResponse.json({ success: true, understanding })
  } catch (error) {
    console.error('[product-understanding] failed', error)
    return NextResponse.json({ error: '未能分析產品或服務', detail: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    const context = await loadContext((await params).campaignId)
    if (context.error) return context.error
    if (!context.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json().catch(() => ({}))
    const understanding = body.understanding && typeof body.understanding === 'object' ? body.understanding as RecordValue : {}
    const confirmed = {
      summary: cleanText(understanding.summary, 1000), coreValue: cleanText(understanding.coreValue, 1000),
      useCases: cleanList(understanding.useCases), audienceTensions: cleanList(understanding.audienceTensions),
      proofPoints: cleanList(understanding.proofPoints), objections: cleanList(understanding.objections),
      confirmedClaims: cleanList(understanding.confirmedClaims), unverifiedClaims: cleanList(understanding.unverifiedClaims),
      restrictions: cleanList(understanding.restrictions), recommendedObjective: cleanText(understanding.recommendedObjective, 50),
      recommendedPrimaryMetric: cleanText(understanding.recommendedPrimaryMetric, 100), analysisVersion: 2, confirmedAt: new Date().toISOString(), status: 'confirmed',
    }
    const sourceSnapshot = context.product.source_snapshot && typeof context.product.source_snapshot === 'object' ? context.product.source_snapshot : {}
    const { error } = await context.access.admin.from('products').update({
      source_snapshot: { ...sourceSnapshot, understanding: confirmed }, claims: confirmed.confirmedClaims,
      restrictions: confirmed.restrictions, status: 'active', updated_by: context.user.id, updated_at: new Date().toISOString(),
    }).eq('id', context.product.id).eq('workspace_id', context.campaign.workspace_id)
    if (error) throw error
    const allowedObjectives = new Set(['sales', 'launch', 'awareness', 'leads'])
    await context.access.admin.from('marketing_campaigns').update({
      generation_status: 'understanding_confirmed',
      hypothesis: confirmed.coreValue,
      objective: allowedObjectives.has(confirmed.recommendedObjective) ? confirmed.recommendedObjective : context.campaign.objective,
      primary_metric: confirmed.recommendedPrimaryMetric || context.campaign.primary_metric,
      updated_at: new Date().toISOString(),
    }).eq('id', context.campaign.id).eq('workspace_id', context.campaign.workspace_id)
    return NextResponse.json({ success: true, understanding: confirmed })
  } catch (error) {
    return NextResponse.json({ error: '未能確認 Product Understanding', detail: String(error) }, { status: 500 })
  }
}
