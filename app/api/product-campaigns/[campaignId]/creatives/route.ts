import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const maxDuration = 300

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, unknown>
type Blueprint = { key: string; role: string; defaultFormat: string; recommendedFormats: string[]; angleId: string; angleName: string; label: string; purpose: string }

const ROLE_DEFAULT_FORMAT: Record<string, string> = {
  hero_visual: 'single_image', lifestyle_visual: 'single_image', thumbnail: 'single_image', paid_social_creative: 'single_image',
  reel_script: 'short_video', ugc_concept: 'short_video', hook: 'short_video', caption: 'single_image',
}
const ALLOWED_FORMATS = new Set(['single_image', 'carousel', 'short_video'])

function clean(value: unknown, max = 3000) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function list(value: unknown, max = 12) { return Array.isArray(value) ? value.map((item) => clean(item, 600)).filter(Boolean).slice(0, max) : [] }
function errorText(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown }
    return [value.message, value.details, value.hint].filter((item): item is string => typeof item === 'string' && Boolean(item)).join(' · ') || JSON.stringify(error)
  }
  return String(error)
}
function parseJson(value: string) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(text) as JsonRecord } catch {
    const start = text.indexOf('{'); const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as JsonRecord
    throw new Error('AI response is not valid JSON')
  }
}

async function load(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id || !campaign.product_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const [{ data: product, error: productError }, { data: angles, error: angleError }] = await Promise.all([
    access.admin.from('products').select('*').eq('id', campaign.product_id).eq('workspace_id', campaign.workspace_id).single(),
    access.admin.from('campaign_angles').select('*').eq('campaign_id', campaign.id).eq('workspace_id', campaign.workspace_id).eq('status', 'approved').order('sort_order'),
  ])
  if (productError || angleError) throw productError || angleError
  return { access, angles: angles || [], campaign, product, user }
}

function makeBlueprints(manifest: JsonRecord, angles: JsonRecord[]): Blueprint[] {
  const items = Array.isArray(manifest.items) ? manifest.items as JsonRecord[] : []
  const result: Blueprint[] = []
  for (const [itemIndex, item] of items.entries()) {
    const role = clean(item.assetType, 80)
    if (!ROLE_DEFAULT_FORMAT[role]) continue
    const quantity = Math.min(12, Math.max(1, Number(item.quantity) || 1))
    for (let index = 0; index < quantity && result.length < 24; index += 1) {
      const angle = angles[index % angles.length]
      result.push({
        key: `${role}-${itemIndex + 1}-${String(angle.id).slice(0, 8)}-${index + 1}`,
        role, defaultFormat: ROLE_DEFAULT_FORMAT[role], recommendedFormats: list(angle.recommended_formats, 4).filter((format) => ALLOWED_FORMATS.has(format)), angleId: String(angle.id), angleName: clean(angle.name, 160),
        label: clean(item.label, 160) || role, purpose: clean(item.purpose, 500),
      })
    }
  }
  return result
}

export async function GET(_req: Request, { params }: RouteProps) {
  try {
    const data = await load((await params).campaignId)
    if (data.error) return data.error
    const { data: projects, error } = await data.access.admin.from('content_projects')
      .select('id,title,stage,selected_format,campaign_id,campaign_angle_id,variant_key,creative_role,brief,production,updated_at')
      .eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).order('created_at')
    if (error) throw error
    return NextResponse.json({ projects: projects || [], campaign: data.campaign, product: data.product, angles: data.angles })
  } catch (error) { return NextResponse.json({ error: '未能載入Campaign Creatives', detail: errorText(error) }, { status: 500 }) }
}

export async function POST(req: Request, { params }: RouteProps) {
  try {
    const data = await load((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const requestBody = await req.json().catch(() => ({})) as JsonRecord
    if (requestBody.action === 'recommend_formats') {
      const { data: projects, error: projectError } = await data.access.admin.from('content_projects')
        .select('id,title,selected_format,creative_role,brief,production').eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).order('created_at')
      if (projectError) throw projectError
      if (!projects?.length) return NextResponse.json({ error: '未有可重新分析的製作稿' }, { status: 400 })
      const { count: completedAssets, error: jobError } = await data.access.admin.from('creative_generation_jobs')
        .select('id', { count: 'exact', head: true }).eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).eq('status', 'completed')
      if (jobError) throw jobError
      if (completedAssets) return NextResponse.json({ error: '部分素材已經生成，為免覆蓋成品，暫時不能重新建議格式。' }, { status: 409 })
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })
      const prompt = [
        '只重新判斷以下現有製作稿的媒體格式，不要改寫標題、核心概念、開場句、文案或CTA。每個id必須原樣回傳一次。',
        'selectedFormat只可選single_image、carousel、short_video。單一核心訊息、主視覺或優惠通常用single_image；示範、人物情境、情緒或新受眾觸及用short_video；3個或以上重點、步驟、比較、迷思或FAQ用carousel。caption及hook是內容角色，不是媒體格式。',
        `Campaign: ${JSON.stringify({ objective: data.campaign.objective, primaryMetric: data.campaign.primary_metric })}`,
        `Product: ${JSON.stringify({ name: data.product.name, kind: data.product.kind, understanding: data.product.source_snapshot?.understanding || {} })}`,
        `Projects: ${JSON.stringify(projects.map((project) => ({ id: project.id, title: project.title, currentFormat: project.selected_format, role: project.creative_role, purpose: project.brief?.purpose, concept: project.production?.concept, hooks: project.production?.hooks, caption: project.production?.captionDraft })))}`,
        'Return JSON only:',
        JSON.stringify({ decisions: [{ id: 'exact project id', selectedFormat: 'single_image|carousel|short_video', formatReason: '一句清晰原因', carouselPlan: { slideCount: 5, slides: [{ purpose: '封面|重點|CTA', headline: '', body: '', visual: '' }] }, script: { durationSeconds: 20, opening: '', scenes: [{ seconds: '0-3', visual: '', voiceover: '', onScreenText: '' }], closing: '' } }] }),
        '只有carousel需要carouselPlan（4至7頁）；只有short_video需要script。保持精簡及使用繁體中文。',
      ].join('\n\n')
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL), max_tokens: 10000, temperature: 0.2, system: 'You are SOON Format Strategist. Return complete valid Traditional Chinese JSON only.', messages: [{ role: 'user', content: prompt }] }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed')
      const responseText = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
      const generated = parseJson(responseText)
      const decisions = new Map((Array.isArray(generated.decisions) ? generated.decisions as JsonRecord[] : []).map((item) => [clean(item.id, 80), item]))
      const now = new Date().toISOString()
      const updated = await Promise.all(projects.map(async (project) => {
        const decision = decisions.get(project.id) || {}
        const requestedFormat = clean(decision.selectedFormat, 40)
        const selectedFormat = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : project.selected_format
        const formatReason = clean(decision.formatReason, 500) || clean(project.brief?.formatReason, 500) || 'SOON 根據內容目的及訊息結構建議此格式。'
        const production = { ...(project.production || {}) }
        if (selectedFormat === 'carousel') production.carouselPlan = decision.carouselPlan && typeof decision.carouselPlan === 'object' ? decision.carouselPlan : production.carouselPlan || {}
        if (selectedFormat === 'short_video') production.script = decision.script && typeof decision.script === 'object' ? decision.script : production.script || {}
        const { data: saved, error } = await data.access.admin.from('content_projects').update({ selected_format: selectedFormat, brief: { ...(project.brief || {}), formatReason }, production, updated_at: now, updated_by: data.user.id })
          .eq('id', project.id).eq('campaign_id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)
          .select('id,title,stage,selected_format,campaign_id,campaign_angle_id,variant_key,creative_role,brief,production,updated_at').single()
        if (error) throw error
        return saved
      }))
      return NextResponse.json({ projects: updated, reformatted: true, success: true })
    }

    if (data.campaign.generation_status !== 'angles_confirmed' || !data.angles.length) return NextResponse.json({ error: '請先確認Campaign Angles' }, { status: 400 })

    const { data: existing, error: existingError } = await data.access.admin.from('content_projects')
      .select('id,title,stage,selected_format,campaign_id,campaign_angle_id,variant_key,creative_role,brief,production,updated_at')
      .eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).not('variant_key', 'is', null).order('created_at')
    if (existingError) throw existingError
    if (existing?.length) return NextResponse.json({ projects: existing, reused: true, success: true })

    const blueprints = makeBlueprints(data.campaign.content_pack_manifest || {}, data.angles)
    if (!blueprints.length) return NextResponse.json({ error: 'Content Pack沒有可建立的項目' }, { status: 400 })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })
    const understanding = data.product.source_snapshot?.understanding || {}
    const prompt = [
      '根據已確認Product Understanding及Campaign Angles，完成以下creative blueprints的文字製作稿。每個key必須原樣回傳一次。',
      '不得把unverifiedClaims寫成事實。每項內容必須明顯承接指定Angle，不可產生generic marketing copy。',
      '你亦要為每一項獨立決定最合適的selectedFormat，只可選single_image、carousel或short_video。不要按role機械式配對格式。',
      '判斷原則：只有一個核心訊息、產品主視覺或直接優惠通常用single_image；有示範、人物情境、情緒或需要快速觸及新受眾時用short_video；有3個或以上重點、步驟、比較、迷思、FAQ或以收藏分享為目標時用carousel。',
      'caption及hook是內容角色，不是媒體格式；應按承載的訊息選格式。thumbnail只能用single_image；reel_script及ugc_concept通常用short_video，除非內容明顯更適合carousel。',
      `Product: ${JSON.stringify({ name: data.product.name, kind: data.product.kind, price: data.product.price_label, understanding })}`,
      `Campaign: ${JSON.stringify({ objective: data.campaign.objective, primaryMetric: data.campaign.primary_metric })}`,
      `Angles: ${JSON.stringify(data.angles.map((angle) => ({ id: angle.id, name: angle.name, hook: angle.hook, tension: angle.audience_tension, promise: angle.promise, proof: angle.proof_mechanism, risks: angle.claim_risks })))}`,
      `Blueprints: ${JSON.stringify(blueprints)}`,
      'Return JSON only:',
      JSON.stringify({ creatives: [{ key: 'exact blueprint key', selectedFormat: 'single_image|carousel|short_video', formatReason: '一句解釋為何這個格式最適合', title: '', concept: '', hooks: ['3 opening hooks'], caption: '', cta: '', script: { durationSeconds: 20, opening: '', scenes: [{ seconds: '0-3', visual: '', voiceover: '', onScreenText: '' }], closing: '' }, carouselPlan: { slideCount: 5, slides: [{ purpose: '封面|重點|CTA', headline: '', body: '', visual: '' }] }, visualBrief: { composition: '', setting: '', productPlacement: '', lighting: '', creatorStyle: '', overlayCopy: '', generationPrompt: '' }, complianceNotes: [] }] }),
      'selectedFormat為short_video要完整填script；carousel要填4至7頁carouselPlan；single_image要完整填visualBrief。hook類重點填hooks；caption類重點填caption及CTA。其他欄位保持極精簡。',
      '整份JSON必須完整閉合。每個文字欄位最多120個中文字；每個script最多3個scenes；不得加入Markdown。',
    ].join('\n\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL), max_tokens: 16000, temperature: 0.35, system: 'You are SOON Creative Orchestrator. Return complete, valid, concise Traditional Chinese JSON only.', messages: [{ role: 'user', content: prompt }] }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed')
    const text = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const generated = parseJson(text)
    const generatedByKey = new Map((Array.isArray(generated.creatives) ? generated.creatives as JsonRecord[] : []).map((item) => [clean(item.key, 160), item]))
    const angleById = new Map(data.angles.map((angle) => [angle.id, angle]))
    const now = new Date().toISOString()
    const rows = blueprints.map((blueprint) => {
      const output = generatedByKey.get(blueprint.key) || {}
      const angle = angleById.get(blueprint.angleId)
      const title = clean(output.title, 240) || `${blueprint.angleName} · ${blueprint.label}`
      const requestedFormat = clean(output.selectedFormat, 40)
      const selectedFormat = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : blueprint.defaultFormat
      const formatReason = clean(output.formatReason, 500) || 'SOON 根據內容目的及訊息結構建議此格式。'
      return {
        workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, campaign_angle_id: blueprint.angleId,
        title, selected_format: selectedFormat, creative_role: blueprint.role, variant_key: blueprint.key,
        stage: 'production', created_by: data.user.id, updated_by: data.user.id,
        brief: { campaignName: data.campaign.name, productId: data.product.id, productName: data.product.name, angleId: blueprint.angleId, angleName: blueprint.angleName, angleHook: angle?.hook, role: blueprint.role, purpose: blueprint.purpose, formatReason },
        generation_recipe: { role: blueprint.role, format: selectedFormat, formatDecision: 'ai', source: 'campaign_pack_v2', generatedAt: now },
        production: {
          status: 'creative_brief_ready', concept: clean(output.concept), hooks: list(output.hooks), captionDraft: clean(output.caption), cta: clean(output.cta, 500),
          script: output.script && typeof output.script === 'object' ? output.script : {},
          carouselPlan: output.carouselPlan && typeof output.carouselPlan === 'object' ? output.carouselPlan : {},
          visualBrief: output.visualBrief && typeof output.visualBrief === 'object' ? output.visualBrief : {},
          complianceNotes: list(output.complianceNotes), generatedAt: now,
        },
        updated_at: now,
      }
    })
    const { data: projects, error } = await data.access.admin.from('content_projects').upsert(rows, { onConflict: 'campaign_id,variant_key' })
      .select('id,title,stage,selected_format,campaign_id,campaign_angle_id,variant_key,creative_role,brief,production,updated_at').order('updated_at')
    if (error) throw error
    await data.access.admin.from('marketing_campaigns').update({ generation_status: 'creative_briefs_ready', status: 'in_production', updated_at: now }).eq('id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)
    return NextResponse.json({ projects: projects || [], success: true })
  } catch (error) {
    console.error('[campaign-creatives] generation failed', error)
    return NextResponse.json({ error: '未能建立Campaign Creatives', detail: errorText(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    const data = await load((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json().catch(() => ({})) as JsonRecord
    const projectId = clean(body.projectId, 80)
    const title = clean(body.title, 240)
    const production = body.production && typeof body.production === 'object' ? body.production as JsonRecord : null
    if (!projectId || !title || !production) return NextResponse.json({ error: '請填寫完整製作稿資料' }, { status: 400 })
    const { data: project, error } = await data.access.admin.from('content_projects')
      .update({ title, production, updated_at: new Date().toISOString(), updated_by: data.user.id })
      .eq('id', projectId).eq('campaign_id', data.campaign.id).eq('workspace_id', data.campaign.workspace_id)
      .select('id,title,production,updated_at').single()
    if (error) throw error
    return NextResponse.json({ project, success: true })
  } catch (error) {
    return NextResponse.json({ error: '未能更新製作稿', detail: errorText(error) }, { status: 500 })
  }
}
