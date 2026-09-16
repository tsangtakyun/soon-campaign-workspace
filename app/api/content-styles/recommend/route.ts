import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const formatMap: Record<string, string> = {
  carousel: 'instagram_carousel',
  single_image: 'instagram_single_feed',
  human_video: 'human_short_video',
  ai_video: 'ai_short_video',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const creatorCodeAliases: Record<string, string> = {
  product_focus: 'product-focus',
  ranking_review: 'ranking-review',
}

type JsonRecord = Record<string, unknown>

function normalizeCoreStyle(style: JsonRecord) {
  const coreCode = text(style.code, 80)
  return {
    ...style,
    coreCode,
    code: creatorCodeAliases[coreCode] || coreCode,
    creatorSource: 'soon_core',
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const workspaceId = text(body.workspaceId, 80)
  const creatorFormat = text(body.format, 80)
  if (!isUuid(workspaceId) || !formatMap[creatorFormat]) {
    return NextResponse.json({ error: 'Invalid workspace or format' }, { status: 400 })
  }

  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const key = process.env.SOON_CORE_KNOWLEDGE_KEY
  if (!key) return NextResponse.json({ styles: [], source: 'fallback', reason: 'Core credential is not configured' })

  const [{ data: workspace }, { data: brandKit }] = await Promise.all([
    access.admin.from('workspaces').select('name,description,content_directions,market_locations').eq('id', workspaceId).maybeSingle(),
    access.admin.from('brand_kits').select('business_name,business_type,elevator_pitch,audience,market_positioning,brand_profile').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const baseUrl = (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, '')
  const headers = { 'content-type': 'application/json', 'x-soon-knowledge-key': key }
  try {
    const registryResponse = await fetch(`${baseUrl}/api/intelligence/styles?format=${formatMap[creatorFormat]}`, {
      headers: { 'x-soon-knowledge-key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!registryResponse.ok) throw new Error(`Core registry returned ${registryResponse.status}`)
    const registryPayload = await registryResponse.json()
    const registeredStyles = (Array.isArray(registryPayload?.styles) ? registryPayload.styles : [])
      .map((style: JsonRecord) => normalizeCoreStyle(style))
    const candidates = registeredStyles.map((style: JsonRecord) => ({
        code: style.code,
        name: style.name,
        description: style.description,
        evidenceCount: (style.evidence as JsonRecord | undefined)?.confirmedReferenceCount,
        rules: (style.version as JsonRecord | undefined)?.rules,
      }))
    const response = await fetch(`${baseUrl}/api/intelligence/styles/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        format: formatMap[creatorFormat],
        brief: text(body.brief),
        story: body.story,
        assets: body.assets,
        brand: { workspace, brandKit },
        candidates,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`Core returned ${response.status}`)
    const rankedPayload = await response.json()
    const rankings = Array.isArray(rankedPayload?.rankings) ? rankedPayload.rankings as JsonRecord[] : []
    const fullByCode = new Map<string, JsonRecord>()
    for (const style of registeredStyles) fullByCode.set(text(style.code, 80), style)
    const styles = rankings.flatMap((ranking) => {
      const style = fullByCode.get(text(ranking.code, 80))
      return style ? [{ ...style, recommendation: { score: ranking.score, reason: ranking.reason } }] : []
    }).slice(0, 3)
    return NextResponse.json({
      ...rankedPayload,
      candidateCount: candidates.length,
      styles,
    })
  } catch (error) {
    console.error('[content-styles/recommend] Core ranking unavailable', error)
    try {
      const response = await fetch(`${baseUrl}/api/intelligence/styles?format=${formatMap[creatorFormat]}`, {
        headers: { 'x-soon-knowledge-key': key },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      })
      if (!response.ok) throw new Error(`Core fallback returned ${response.status}`)
      const payload = await response.json()
      const registeredStyles = (Array.isArray(payload?.styles) ? payload.styles : [])
        .map((style: JsonRecord) => normalizeCoreStyle(style))
      const styles = registeredStyles.slice(0, 3)
      return NextResponse.json({ ...payload, styles, candidateCount: registeredStyles.length, source: 'rules_fallback' })
    } catch (fallbackError) {
      console.error('[content-styles/recommend] Core fallback unavailable', fallbackError)
      return NextResponse.json({ styles: [], source: 'fallback', reason: 'Core is temporarily unavailable' })
    }
  }
}
