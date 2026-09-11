import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { fetchSafeExternal } from '@/lib/safe-external-url'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, unknown>

const MARKET_NAMES: Record<string, string> = { HK: '香港', MO: '澳門', TW: '台灣', GB: '英國', SG: '新加坡', OTHER: '用家指定市場' }

function clean(value: unknown, max = 1200) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function list(value: unknown, limit = 8) { return Array.isArray(value) ? value.map((item) => clean(item, 400)).filter(Boolean).slice(0, limit) : [] }
function json(value: string) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{'); const end = text.lastIndexOf('}')
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text) as JsonRecord
}

function webSources(value: unknown) {
  const found = new Map<string, string>()
  function visit(item: unknown) {
    if (Array.isArray(item)) { item.forEach(visit); return }
    if (!item || typeof item !== 'object') return
    const record = item as JsonRecord
    const url = clean(record.url, 2000)
    if (/^https?:\/\//i.test(url) && !found.has(url)) found.set(url, clean(record.title, 240) || new URL(url).hostname)
    Object.values(record).forEach(visit)
  }
  visit(value)
  return Array.from(found, ([url, title]) => ({ title, url })).slice(0, 20)
}

async function context(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('id,workspace_id,product_id,raw_campaign_details').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id || !campaign.product_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const { data: product, error } = await access.admin.from('products').select('id,name,kind,selling_points,target_audiences,source_snapshot').eq('id', campaign.product_id).single()
  if (error) throw error
  return { access, campaign, product, user }
}

async function pageImage(url: string) {
  if (!url) return ''
  try {
    const response = await fetchSafeExternal(url, { headers: { Accept: 'text/html', 'User-Agent': 'SOON Market Intelligence/1.0' }, signal: AbortSignal.timeout(6000) })
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return ''
    const html = (await response.text()).slice(0, 250000)
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
      if (!/(?:og:image|twitter:image)/i.test(tag)) continue
      const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]
      if (content) return new URL(content, url).toString()
    }
    const jsonImage = html.match(/["']image["']\s*:\s*(?:["']([^"']+)["']|\{[^}]*["']url["']\s*:\s*["']([^"']+)["'])/i)
    if (jsonImage?.[1] || jsonImage?.[2]) return new URL(jsonImage[1] || jsonImage[2], url).toString()
    const productImage = html.match(/<img\b(?=[^>]*(?:itemprop=["']image["']|class=["'][^"']*product[^"']*))[^>]*src=["']([^"']+)["']/i)
    return productImage?.[1] ? new URL(productImage[1], url).toString() : ''
  } catch { return '' }
}

export async function GET(_req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    const snapshot = data.product.source_snapshot && typeof data.product.source_snapshot === 'object' ? data.product.source_snapshot as JsonRecord : {}
    return NextResponse.json({ campaign: data.campaign, product: data.product, intelligence: snapshot.marketIntelligence || null })
  } catch (error) {
    return NextResponse.json({ error: '未能載入市場情報', detail: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const snapshot = data.product.source_snapshot && typeof data.product.source_snapshot === 'object' ? data.product.source_snapshot as JsonRecord : {}
    const current = snapshot.marketIntelligence && typeof snapshot.marketIntelligence === 'object' ? snapshot.marketIntelligence as JsonRecord : null
    if (!current) return NextResponse.json({ error: '尚未有可修改的市場資料' }, { status: 404 })
    const body = await req.json().catch(() => ({})) as JsonRecord
    const opportunities = list(body.opportunities, 3)
    const edits = Array.isArray(body.competitors) ? body.competitors : []
    const competitors = (Array.isArray(current.competitors) ? current.competitors : []).map((item) => {
      const competitor = item && typeof item === 'object' ? item as JsonRecord : {}
      const match = edits.find((candidate) => {
        const value = candidate && typeof candidate === 'object' ? candidate as JsonRecord : {}
        return clean(value.sourceUrl, 2000) === clean(competitor.sourceUrl, 2000) && clean(value.name, 160) === clean(competitor.name, 160)
      })
      const value = match && typeof match === 'object' ? match as JsonRecord : null
      return value ? { ...competitor, sellingAngles: list(value.sellingAngles, 3) } : competitor
    })
    const intelligence = { ...current, opportunities: opportunities.length ? opportunities : current.opportunities, competitors, editedAt: new Date().toISOString() }
    const { error } = await data.access.admin.from('products').update({ source_snapshot: { ...snapshot, marketIntelligence: intelligence }, updated_by: data.user.id, updated_at: new Date().toISOString() }).eq('id', data.product.id).eq('workspace_id', data.campaign.workspace_id)
    if (error) throw error
    return NextResponse.json({ success: true, intelligence })
  } catch (error) {
    console.error('[market-intelligence] update failed', error)
    return NextResponse.json({ error: '暫時未能儲存更改', detail: String(error) }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })
    const details = data.campaign.raw_campaign_details && typeof data.campaign.raw_campaign_details === 'object' ? data.campaign.raw_campaign_details as JsonRecord : {}
    const marketCode = clean(details.marketRegion, 10) || 'HK'
    const market = MARKET_NAMES[marketCode] || marketCode
    const searchCountry = ['HK', 'MO', 'TW', 'GB', 'SG'].includes(marketCode) ? marketCode : 'HK'
    const prompt = [
      `研究 ${market} 市場上與「${data.product.name}」真正相似的產品或服務。`,
      `產品類型：${data.product.kind}；賣點：${JSON.stringify(data.product.selling_points || [])}；受眾：${JSON.stringify(data.product.target_audiences || [])}。`,
      '必須使用網頁搜尋。競品只可列出有可靠公開產品頁支持的項目，每項必須提供可直接開啟的 sourceUrl。不要憑記憶杜撰品牌、售價、評論或市場份額。',
      'sellingAngles 只描述該來源頁實際如何銷售。公開評論不足時，commentStatus 必須是 limited 或 none，並清楚說明，絕不可生成模擬評論。',
      '對藥物、健康、金融及其他受規管產品，只可描述公開頁面的定位，不可提供醫療或投資建議。',
      '保持極度精簡：最多 3 個競品、每個最多 3 個銷售角度、最多 4 個評論主題、3 個市場機會及 8 個來源；每項只寫一句，避免重複資料。',
      '市場機會要改寫為產品強項，並以「16 字內重點：一句證據」格式輸出。優先找出消費者應該記住的差異化訊息，例如功效數字、使用場景或品牌優勢。競品 sellingAngles 亦先寫對方實際主打訊息。',
      '先輸出一份有來源支持的繁體中文研究筆記。必須保留每項資料的來源名稱；不要輸出 JSON。',
    ].join('\n\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_PRODUCT_MODEL), max_tokens: 3500, temperature: 0.1,
        system: 'You are SOON Market Intelligence. Research conservatively and cite every factual market finding.',
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4, user_location: { type: 'approximate', country: searchCountry } }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'Market research failed')
    const researchText = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const discoveredSources = webSources(payload.content)
    const structureResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_PRODUCT_MODEL), max_tokens: 3000, temperature: 0,
        system: 'Convert supplied research into concise valid JSON only. Never add facts, URLs, reviews, brands or images that are absent from the supplied evidence.',
        messages: [{ role: 'user', content: [
          `市場：${market}`,
          `研究筆記：\n${researchText.slice(0, 14000)}`,
          `搜尋所得來源：${JSON.stringify(discoveredSources)}`,
          '只輸出以下 JSON 結構。最多 3 個競品、每個 3 個銷售角度、4 個評論主題、3 個市場機會及 8 個來源。sourceUrl/evidenceUrl 必須來自搜尋所得來源；沒有就留空。',
          JSON.stringify({ market, summary: '', competitors: [{ name: '', product: '', sellingAngles: [''], sourceUrl: '', sourceTitle: '' }], commentStatus: 'sufficient|limited|none', commentSummary: '', commentThemes: [{ theme: '', sentiment: 'positive|negative|mixed', evidenceUrl: '' }], opportunities: [''], sources: [{ title: '', url: '', sourceType: 'official|retailer|review|social|regulator' }] }),
        ].join('\n\n') }],
      }),
    })
    const structurePayload = await structureResponse.json()
    if (!structureResponse.ok) throw new Error(structurePayload?.error?.message || 'Market result formatting failed')
    const structuredText = Array.isArray(structurePayload.content) ? structurePayload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const raw = json(structuredText)
    const rawCompetitors = Array.isArray(raw.competitors) ? raw.competitors.slice(0, 3) : []
    const competitors = await Promise.all(rawCompetitors.map(async (item) => {
      const value = item && typeof item === 'object' ? item as JsonRecord : {}
      const sourceUrl = clean(value.sourceUrl, 2000)
      return { name: clean(value.name, 160), product: clean(value.product, 200), sellingAngles: list(value.sellingAngles, 3), sourceUrl, sourceTitle: clean(value.sourceTitle, 240), imageUrl: await pageImage(sourceUrl) }
    }))
    const intelligence = {
      market, summary: clean(raw.summary), competitors: competitors.filter((item) => item.name && item.sourceUrl),
      commentStatus: ['sufficient', 'limited', 'none'].includes(clean(raw.commentStatus, 20)) ? clean(raw.commentStatus, 20) : 'none',
      commentSummary: clean(raw.commentSummary),
      commentThemes: Array.isArray(raw.commentThemes) ? raw.commentThemes.slice(0, 4).map((item) => { const value = item && typeof item === 'object' ? item as JsonRecord : {}; return { theme: clean(value.theme, 300), sentiment: clean(value.sentiment, 20), evidenceUrl: clean(value.evidenceUrl, 2000) } }).filter((item) => item.theme && item.evidenceUrl) : [],
      opportunities: list(raw.opportunities, 3),
      sources: Array.isArray(raw.sources) ? raw.sources.slice(0, 8).map((item) => { const value = item && typeof item === 'object' ? item as JsonRecord : {}; return { title: clean(value.title, 240), url: clean(value.url, 2000), sourceType: clean(value.sourceType, 40) } }).filter((item) => item.title && item.url) : [],
      generatedAt: new Date().toISOString(), status: 'ready',
    }
    const snapshot = data.product.source_snapshot && typeof data.product.source_snapshot === 'object' ? data.product.source_snapshot as JsonRecord : {}
    const { error } = await data.access.admin.from('products').update({ source_snapshot: { ...snapshot, marketIntelligence: intelligence }, updated_by: data.user.id, updated_at: new Date().toISOString() }).eq('id', data.product.id).eq('workspace_id', data.campaign.workspace_id)
    if (error) throw error
    return NextResponse.json({ success: true, intelligence })
  } catch (error) {
    console.error('[market-intelligence] failed', error)
    return NextResponse.json({ error: '暫時未能完成市場研究', detail: String(error) }, { status: 500 })
  }
}
