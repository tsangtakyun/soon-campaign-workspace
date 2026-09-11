import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { createServerSupabase } from '@/lib/server-supabase'
import { getPublishedStrategies } from '@/lib/strategy-registry'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, unknown>

function clean(value: unknown, max = 1500) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function list(value: unknown, max = 8) { return Array.isArray(value) ? value.map((item) => clean(item, 300)).filter(Boolean).slice(0, max) : [] }
function parseJson(value: string) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(text) as JsonRecord } catch {
    const start = text.indexOf('{'); const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as JsonRecord
    throw new Error('AI response is not valid JSON')
  }
}

async function context(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id || !campaign.product_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const { data: product, error } = await access.admin.from('products').select('*').eq('id', campaign.product_id).eq('workspace_id', campaign.workspace_id).single()
  if (error) throw error
  return { access, campaign, product, user }
}

export async function GET(_req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    const { data: angles, error } = await data.access.admin.from('campaign_angles').select('*').eq('campaign_id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id).order('sort_order')
    if (error) throw error
    return NextResponse.json({ angles: angles || [], campaign: data.campaign, product: data.product, manifest: data.campaign.content_pack_manifest || {} })
  } catch (error) {
    return NextResponse.json({ error: '未能載入 Campaign Angles', detail: String(error) }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const understanding = data.product.source_snapshot?.understanding
    if (!understanding || understanding.status !== 'confirmed') return NextResponse.json({ error: '請先確認 Product Understanding' }, { status: 400 })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })

    const [patterns, strategies, experienceResponse] = await Promise.all([
      getPublishedStrategies('angle_pattern'),
      getPublishedStrategies('content_strategy'),
      process.env.SOON_CORE_KNOWLEDGE_KEY ? fetch('https://soon-core.vercel.app/api/campaign-experiences/search', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-soon-knowledge-key': process.env.SOON_CORE_KNOWLEDGE_KEY },
        body: JSON.stringify({ product: data.product.name, kind: data.product.kind, market: data.campaign.market_region, objective: data.campaign.objective, audience: data.campaign.target_audience }),
      }).then((response) => response.ok ? response.json() : { experiences: [] }).catch(() => ({ experiences: [] })) : Promise.resolve({ experiences: [] }),
    ])
    const experiences = Array.isArray(experienceResponse.experiences) ? experienceResponse.experiences.slice(0, 5) : []
    const patternMap = new Map(patterns.map((item) => [item.id, item]))
    const strategyMap = new Map(strategies.map((item) => [item.id, item]))
    const prompt = [
      '為以下產品、服務或優惠提出4個真正不同、可以測試的Campaign Angles。不要只改寫同一句hook。',
      '只可使用已確認claims及proof points。unverified claims不可當成事實。',
      `Campaign: ${JSON.stringify({ objective: data.campaign.objective, primaryMetric: data.campaign.primary_metric, targetAudience: data.campaign.target_audience })}`,
      `Product understanding: ${JSON.stringify(understanding)}`,
      `Available angle patterns: ${JSON.stringify(patterns.map((item) => ({ id: item.id, name: item.name, definition: item.definition })))}`,
      `Available strategy building blocks: ${JSON.stringify(strategies.map((item) => ({ id: item.id, name: item.name, description: item.description, definition: item.definition })))}`,
      `Relevant past campaign experiences: ${JSON.stringify(experiences)}`,
      '過往案例只可用作決策參考，不可直接複製。creative_reference只代表創意參考；只有measured或verified案例的metrics才可視為成效證據。當案例與今次市場、受眾或產品不相似時，降低其權重。',
      'Return JSON only:',
      JSON.stringify({
        angles: [{ name: '短而具體', hook: 'opening hook', audienceTension: '', promise: '', proofMechanism: '', rationale: '', funnelStage: 'top|middle|bottom', recommendedFormats: ['short_video'], anglePatternId: 'one available angle pattern id', strategyIds: ['1-3 available content strategy ids'], claimRisks: [], primaryMetric: '' }],
        contentPack: { summary: '為何這個pack適合今次campaign', estimatedMinutes: 5, experienceEvidence: [{ id: 'past campaign id', use: '參考了甚麼及原因' }], items: [{ assetType: 'hero_visual', label: 'Hero Key Visual', quantity: 3, angleAllocation: '每個angle一個或all', purpose: '' }] },
      }),
      'Content pack要按產品類型及objective決定，不可機械式固定數量。只可用assetType: hero_visual,lifestyle_visual,ugc_concept,reel_script,hook,caption,thumbnail,paid_social_creative。總量保持合理，第一輪優先可測試性。',
    ].join('\n\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: anthropicModel(process.env.ANTHROPIC_CAMPAIGN_MODEL), max_tokens: 4200, temperature: 0.55, system: 'You are SOON Campaign Strategist. Return concise Traditional Chinese JSON only.', messages: [{ role: 'user', content: prompt }] }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed')
    const text = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const generated = parseJson(text)
    const rawAngles = Array.isArray(generated.angles) ? generated.angles.slice(0, 5) as JsonRecord[] : []
    if (rawAngles.length < 3) throw new Error('AI did not return enough campaign angles')

    const { data: approved } = await data.access.admin.from('campaign_angles').select('id').eq('campaign_id', data.campaign.id).eq('status', 'approved').limit(1)
    if (approved?.length) return NextResponse.json({ error: '已有批准的Angles；請先保留現有測試或另建iteration。' }, { status: 409 })
    await data.access.admin.from('campaign_angles').delete().eq('campaign_id', data.campaign.id).in('status', ['proposed', 'rejected'])

    const rows = rawAngles.map((angle, index) => {
      const pattern = patternMap.get(clean(angle.anglePatternId, 120)) || patterns[index % Math.max(patterns.length, 1)]
      const selectedStrategies = list(angle.strategyIds, 3).map((id) => strategyMap.get(id)).filter(Boolean)
      return {
        workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id,
        name: clean(angle.name, 160) || `Angle ${index + 1}`, hook: clean(angle.hook), audience_tension: clean(angle.audienceTension),
        promise: clean(angle.promise), proof_mechanism: clean(angle.proofMechanism), rationale: clean(angle.rationale),
        funnel_stage: ['top', 'middle', 'bottom'].includes(clean(angle.funnelStage, 20)) ? clean(angle.funnelStage, 20) : 'middle',
        recommended_formats: list(angle.recommendedFormats),
        strategy_refs: [{ id: pattern?.id, versionId: pattern?.versionId, version: pattern?.version, role: 'angle_pattern' }, ...selectedStrategies.map((item) => ({ id: item!.id, versionId: item!.versionId, version: item!.version, role: 'building_block' }))],
        claim_risks: list(angle.claimRisks), primary_metric: clean(angle.primaryMetric, 120) || data.campaign.primary_metric,
        status: 'proposed', sort_order: index, created_by: data.user.id, updated_by: data.user.id,
      }
    })
    const { data: savedAngles, error: angleError } = await data.access.admin.from('campaign_angles').insert(rows).select('*').order('sort_order')
    if (angleError) throw angleError

    const allowedAssetTypes = new Set(['hero_visual','lifestyle_visual','ugc_concept','reel_script','hook','caption','thumbnail','paid_social_creative'])
    const rawPack = generated.contentPack && typeof generated.contentPack === 'object' ? generated.contentPack as JsonRecord : {}
    const manifest = {
      summary: clean(rawPack.summary, 1000), estimatedMinutes: Math.max(1, Math.min(30, Number(rawPack.estimatedMinutes) || 5)),
      experienceEvidence: (Array.isArray(rawPack.experienceEvidence) ? rawPack.experienceEvidence as JsonRecord[] : []).slice(0, 5).map((item) => ({ id: clean(item.id, 80), use: clean(item.use, 500) })).filter((item) => item.id),
      items: (Array.isArray(rawPack.items) ? rawPack.items as JsonRecord[] : []).flatMap((item) => {
        const assetType = clean(item.assetType, 80)
        if (!allowedAssetTypes.has(assetType)) return []
        return [{ assetType, label: clean(item.label, 160) || assetType, quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)), angleAllocation: clean(item.angleAllocation, 300), purpose: clean(item.purpose, 500) }]
      }),
      status: 'proposed', generatedAt: new Date().toISOString(), angleCount: savedAngles?.length || 0,
    }
    await data.access.admin.from('marketing_campaigns').update({ content_pack_manifest: manifest, generation_status: 'angles_review', updated_at: new Date().toISOString() }).eq('id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)
    return NextResponse.json({ angles: savedAngles || [], manifest, success: true })
  } catch (error) {
    console.error('[campaign-angles] generation failed', error)
    return NextResponse.json({ error: '未能生成Campaign Angles', detail: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json().catch(() => ({}))
    const decisions = Array.isArray(body.decisions) ? body.decisions.slice(0, 8) as JsonRecord[] : []
    for (const decision of decisions) {
      const id = clean(decision.id, 80); const status = clean(decision.status, 30)
      if (!id || !['approved', 'rejected', 'proposed'].includes(status)) continue
      await data.access.admin.from('campaign_angles').update({ status, updated_by: data.user.id, updated_at: new Date().toISOString() }).eq('id', id).eq('campaign_id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)
    }
    const { data: angles, error } = await data.access.admin.from('campaign_angles').select('*').eq('campaign_id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id).order('sort_order')
    if (error) throw error
    const approvedAngles = (angles || []).filter((angle) => angle.status === 'approved')
    if (!approvedAngles.length) return NextResponse.json({ error: '請至少批准一個Campaign Angle' }, { status: 400 })

    const manifest = { ...(data.campaign.content_pack_manifest || {}), status: 'approved', approvedAt: new Date().toISOString(), approvedAngleIds: approvedAngles.map((angle) => angle.id) }
    await data.access.admin.from('marketing_campaigns').update({ content_pack_manifest: manifest, generation_status: 'angles_confirmed', updated_at: new Date().toISOString() }).eq('id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)

    const usageRows = approvedAngles.flatMap((angle) => (Array.isArray(angle.strategy_refs) ? angle.strategy_refs : []).flatMap((ref: JsonRecord) => clean(ref.versionId, 80) ? [{ workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, campaign_angle_id: angle.id, strategy_id: clean(ref.id, 120), strategy_version_id: clean(ref.versionId, 80), usage_role: clean(ref.role, 80) || 'building_block' }] : []))
    if (usageRows.length) await data.access.admin.from('campaign_strategy_usage').upsert(usageRows, { onConflict: 'campaign_id,campaign_angle_id,strategy_version_id,usage_role' })
    return NextResponse.json({ angles: angles || [], manifest, success: true })
  } catch (error) {
    return NextResponse.json({ error: '未能儲存Angle選擇', detail: String(error) }, { status: 500 })
  }
}
