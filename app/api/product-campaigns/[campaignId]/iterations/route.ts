import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, any>
const TESTS = [
  { dimension: 'hook', instruction: '保留核心承諾，只改opening hook，令頭3秒更直接' },
  { dimension: 'proof', instruction: '保留hook及offer，改用更可信而且已核實的proof presentation' },
  { dimension: 'visual', instruction: '保留message，改變visual setting及composition' },
  { dimension: 'objection', instruction: '保留核心Angle，集中處理受眾最大購買疑慮' },
  { dimension: 'cta', instruction: '保留創意主體，只改CTA framing及下一步' },
]

function clean(value: unknown, max = 3000) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function parseJson(value: string) { const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(text) as JsonRecord } catch { const start = text.indexOf('{'); const end = text.lastIndexOf('}'); if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)); throw new Error('AI response is not valid JSON') } }

async function load(campaignId: string) {
  const server = createServerSupabase(await cookies()); const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id }); if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { access, campaign, user }
}

export async function GET(_request: Request, { params }: RouteProps) {
  try { const data = await load((await params).campaignId); if ('error' in data) return data.error; const { data: runs, error } = await data.access.admin.from('campaign_iteration_runs').select('*').eq('campaign_id', data.campaign.id).order('iteration_number', { ascending: false }); if (error) throw error; return NextResponse.json({ runs: runs || [] }) }
  catch (error) { return NextResponse.json({ error: '未能載入Iterations', detail: String(error) }, { status: 500 }) }
}

export async function POST(_request: Request, { params }: RouteProps) {
  let runId = ''
  try {
    const data = await load((await params).campaignId); if ('error' in data) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: winner } = await data.access.admin.from('campaign_angles').select('*').eq('campaign_id', data.campaign.id).eq('status', 'winner').maybeSingle()
    if (!winner) return NextResponse.json({ error: '未有符合門檻的Winning Angle' }, { status: 409 })
    const { data: snapshots } = await data.access.admin.from('creative_performance_snapshots').select('*').eq('campaign_id', data.campaign.id).eq('campaign_angle_id', winner.id)
    const totals = (snapshots || []).reduce((acc: JsonRecord, row: JsonRecord) => ({ impressions: acc.impressions + Number(row.impressions || 0), clicks: acc.clicks + Number(row.clicks || 0), engagements: acc.engagements + Number(row.engagements || 0), conversions: acc.conversions + Number(row.conversions || 0) }), { impressions: 0, clicks: 0, engagements: 0, conversions: 0 })
    if (totals.impressions < 500) return NextResponse.json({ error: 'Winning Angle樣本量不足' }, { status: 409 })
    const nextIteration = Number(data.campaign.iteration_number || 1) + 1
    const { data: existing } = await data.access.admin.from('campaign_iteration_runs').select('*').eq('campaign_id', data.campaign.id).eq('source_angle_id', winner.id).eq('iteration_number', nextIteration).maybeSingle()
    if (existing?.status === 'ready') return NextResponse.json({ run: existing, reused: true, success: true })
    const evidence = { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions * 100 : 0, sourceAngle: { id: winner.id, name: winner.name, hook: winner.hook, promise: winner.promise, proof: winner.proof_mechanism } }
    if (existing) {
      runId = existing.id
      const { data: staleProjects } = await data.access.admin.from('content_projects').select('id').eq('campaign_id', data.campaign.id).eq('generation_recipe->>iterationRunId', runId)
      if (staleProjects?.length) await data.access.admin.from('content_projects').delete().in('id', staleProjects.map((item: JsonRecord) => item.id))
      await data.access.admin.from('campaign_angles').delete().eq('campaign_id', data.campaign.id).eq('parent_angle_id', winner.id).eq('iteration_number', nextIteration)
      await data.access.admin.from('campaign_iteration_runs').update({ status: 'generating' }).eq('id', runId)
    }
    else { const { data: created, error } = await data.access.admin.from('campaign_iteration_runs').insert({ workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, source_angle_id: winner.id, iteration_number: nextIteration, evidence_snapshot: evidence, created_by: data.user.id }).select('id').single(); if (error) throw error; runId = created.id }
    const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) throw new Error('AI service is not configured')
    const prompt = ['Winning Angle已由實際數據確認。建立5個controlled variations，每個只改指定primaryDimension，其他核心承諾保持一致。不得新增未核實claim。', `Evidence: ${JSON.stringify(evidence)}`, `Tests: ${JSON.stringify(TESTS)}`, 'Return JSON only:', JSON.stringify({ variations: [{ dimension: 'exact test dimension', name: '', hypothesis: '', hook: '', concept: '', caption: '', cta: '', format: 'single_image|short_video', visualBrief: { composition: '', setting: '', overlayCopy: '', generationPrompt: '' }, script: { durationSeconds: 20, opening: '', scenes: [{ seconds: '0-3', visual: '', voiceover: '', onScreenText: '' }], closing: '' } }] })].join('\n\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL), max_tokens: 6500, temperature: .35, system: 'You are SOON Experiment Designer. Return concise Traditional Chinese JSON only.', messages: [{ role: 'user', content: prompt }] }) })
    const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed'); const text = payload.content?.filter((item: JsonRecord) => item.type === 'text').map((item: JsonRecord) => item.text).join('\n') || ''; const parsed = parseJson(text)
    const byDimension = new Map<string, JsonRecord>((Array.isArray(parsed.variations) ? parsed.variations : []).map((item: JsonRecord) => [clean(item.dimension, 40), item])); const now = new Date().toISOString()
    const angleRows = TESTS.map((test, index) => { const item = byDimension.get(test.dimension) || {}; return { workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, name: clean(item.name, 180) || `${winner.name} · ${test.dimension}`, hook: clean(item.hook, 500) || winner.hook, audience_tension: winner.audience_tension, promise: winner.promise, proof_mechanism: winner.proof_mechanism, rationale: clean(item.hypothesis, 800) || test.instruction, funnel_stage: winner.funnel_stage, recommended_formats: [clean(item.format, 40) || 'single_image'], strategy_refs: winner.strategy_refs || [], claim_risks: winner.claim_risks || [], primary_metric: 'ctr', status: 'testing', sort_order: 100 + index, iteration_number: nextIteration, parent_angle_id: winner.id, generation_metadata: { iterationRunId: runId, changedDimension: test.dimension, controlInstruction: test.instruction }, created_by: data.user.id, updated_by: data.user.id, created_at: now, updated_at: now } })
    const { data: childAngles, error: angleError } = await data.access.admin.from('campaign_angles').insert(angleRows).select('*'); if (angleError) throw angleError
    const sourceTotals = new Map<string, { impressions: number; clicks: number }>(); for (const row of snapshots || []) { const current = sourceTotals.get(row.content_project_id) || { impressions: 0, clicks: 0 }; current.impressions += Number(row.impressions || 0); current.clicks += Number(row.clicks || 0); sourceTotals.set(row.content_project_id, current) }
    const sourceProjectId = [...sourceTotals.entries()].sort((a, b) => (b[1].clicks / Math.max(b[1].impressions, 1)) - (a[1].clicks / Math.max(a[1].impressions, 1)))[0]?.[0] || null
    const projectRows = (childAngles || []).map((angle: JsonRecord) => { const dimension = angle.generation_metadata.changedDimension; const item = byDimension.get(dimension) || {}; const format = clean(item.format, 40) === 'short_video' ? 'short_video' : 'single_image'; return { workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, campaign_angle_id: angle.id, parent_project_id: sourceProjectId, title: angle.name, selected_format: format, creative_role: format === 'short_video' ? 'reel_script' : 'paid_social_creative', variant_key: `iteration-${nextIteration}-${winner.id.slice(0, 8)}-${dimension}`, stage: 'production', brief: { angleName: winner.name, hypothesis: clean(item.hypothesis), changedDimension: dimension, controlAngleId: winner.id }, generation_recipe: { source: 'winning_angle_iteration_v1', iterationRunId: runId, changedDimension: dimension }, production: { status: 'creative_brief_ready', concept: clean(item.concept), hooks: [clean(item.hook)].filter(Boolean), captionDraft: clean(item.caption), cta: clean(item.cta), visualBrief: item.visualBrief || {}, script: item.script || {}, generatedAt: now }, created_by: data.user.id, updated_by: data.user.id, updated_at: now } })
    const { data: projects, error: projectError } = await data.access.admin.from('content_projects').upsert(projectRows, { onConflict: 'campaign_id,variant_key' }).select('*'); if (projectError) throw projectError
    const plan = (childAngles || []).map((angle: JsonRecord) => ({ angleId: angle.id, projectId: projects?.find((project: JsonRecord) => project.campaign_angle_id === angle.id)?.id, name: angle.name, changedDimension: angle.generation_metadata.changedDimension, hypothesis: angle.rationale }))
    const { data: run, error: runError } = await data.access.admin.from('campaign_iteration_runs').update({ status: 'ready', variation_plan: plan, completed_at: now }).eq('id', runId).select('*').single(); if (runError) throw runError
    await data.access.admin.from('marketing_campaigns').update({ iteration_number: nextIteration, generation_status: 'iteration_ready', status: 'in_production', updated_at: now }).eq('id', data.campaign.id)
    return NextResponse.json({ run, projects, success: true })
  } catch (error) { if (runId) { const server = createServerSupabase(await cookies()); await server.from('campaign_iteration_runs').update({ status: 'failed' }).eq('id', runId) }; return NextResponse.json({ error: '未能建立Winning Variations', detail: error instanceof Error ? error.message : String(error) }, { status: 500 }) }
}
