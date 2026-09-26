import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import {
  CONTENT_DIRECTION_FRAMEWORKS,
  DIRECTION_CONTRACT_VERSION,
  extractSourceReferences,
  retrieveDirectionFrameworks,
  type ContentCategoryId,
  type DirectionFramework,
  type HookMechanismId,
  type SourceReference,
} from '@/lib/content-direction-frameworks'
import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Recommendation = {
  id: string
  title: string
  concept: string
  reason: string
  hook: string
  category: string
  categoryId: ContentCategoryId
  primaryHookMechanism: HookMechanismId
  hookMechanism: string
  secondaryHookMechanism?: HookMechanismId
  frameworkId: string
  sourceRefs: SourceReference[]
  verificationFlags: string[]
  version?: string
}

type FormatRecommendation = {
  recommendedFormat: 'carousel' | 'single_image' | 'short_video'
  recommendedVideoMethod: 'human_filming' | 'ai_video_generation' | null
  formatReason: string
}

const clean = (value: unknown, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const cleanList = (value: unknown, maxItems = 4, maxLength = 160) => Array.isArray(value)
  ? value.map((item) => clean(item, maxLength)).filter(Boolean).slice(0, maxItems)
  : []
const normalizeSlideCount = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const count = Math.round(Number(value))
  return Number.isFinite(count) ? Math.min(10, Math.max(3, count)) : null
}

function normalize(value: unknown, sourceReferences: SourceReference[], frameworks: DirectionFramework[]): Recommendation[] {
  if (!Array.isArray(value)) return []
  const sourceMap = new Map(sourceReferences.map((reference) => [reference.id, reference]))
  return value.slice(0, 3).map((item, index) => {
    const framework = frameworks.find((candidate) => candidate.id === clean(item?.frameworkId, 100)) || frameworks[index]
    const categoryId = CONTENT_DIRECTION_FRAMEWORKS.some((candidate) => candidate.category === item?.categoryId)
      ? item.categoryId as ContentCategoryId
      : framework?.category || 'practical_value'
    const primaryHookMechanism = CONTENT_DIRECTION_FRAMEWORKS.some((candidate) => candidate.mechanism === item?.primaryHookMechanism)
      ? item.primaryHookMechanism as HookMechanismId
      : framework?.mechanism || 'curiosity_gap'
    const secondaryHookMechanism = CONTENT_DIRECTION_FRAMEWORKS.some((candidate) => candidate.mechanism === item?.secondaryHookMechanism)
      ? item.secondaryHookMechanism as HookMechanismId
      : undefined
    const sourceRefs = cleanList(item?.sourceRefs, 4, 20).map((id) => sourceMap.get(id)).filter(Boolean) as SourceReference[]
    const verificationFlags = cleanList(item?.verificationFlags, 4, 160)
    if (categoryId === 'evidence_interpretation') {
      if (!verificationFlags.some((flag) => /相對風險|絕對風險|百分點/u.test(flag))) verificationFlags.push('確認數字屬相對風險、絕對風險或百分點')
      if (!verificationFlags.some((flag) => /研究設計|樣本|適用人群/u.test(flag))) verificationFlags.push('確認研究設計、樣本及適用人群')
    }
    return {
      id: clean(item?.id, 100) || `direction-${index + 1}`,
      title: clean(item?.title, 40),
      concept: clean(item?.concept, 180),
      reason: clean(item?.reason, 180),
      hook: clean(item?.hook, 100),
      category: framework?.categoryLabel || clean(item?.category, 80) || '內容解說',
      categoryId,
      primaryHookMechanism,
      hookMechanism: framework?.mechanismLabel || primaryHookMechanism,
      secondaryHookMechanism,
      frameworkId: framework?.id || clean(item?.frameworkId, 100) || `framework-${index + 1}`,
      sourceRefs: sourceRefs.length ? sourceRefs : sourceReferences.slice(0, 1),
      verificationFlags,
      version: clean(item?.version, 80) || DIRECTION_CONTRACT_VERSION,
    }
  }).filter((item) => item.title && item.concept && item.hook)
}

function hasDirectionDiversity(recommendations: Recommendation[]) {
  if (recommendations.length !== 3) return false
  const mechanisms = new Set(recommendations.map((item) => item.primaryHookMechanism))
  const categories = new Set(recommendations.map((item) => item.categoryId))
  const questionHooks = recommendations.filter((item) => /[？?]$/u.test(item.hook)).length
  const genericHook = recommendations.some((item) => /你是否也遇過|大家一直以為|先記下這幾個重點/u.test(item.hook))
  return mechanisms.size === 3 && categories.size >= 2 && questionHooks <= 1 && !genericHook && hasStrongAudienceHooks(recommendations)
}

const weakHeadlinePattern = /藏在.{0,8}數字|真係假|是真是假|兩種讀法|背後真相|有一件事.{0,8}(?:未講|沒講|冇講)|值得關注|研究數字\s*(?:vs|VS|對比)|一文看懂|唔係你諗|不是你想|數字係咁|有幾大關係/u
const overColloquialTitlePattern = /嘅人|低咗|高咗|差咗|少咗|多咗|睇清楚/u
const weakOpeningPattern = /你是否也遇過|大家一直以為|先記下這幾個重點|兩份研究、兩個國家|同一份研究.{0,12}兩種讀法|件事複雜得多/u
const concreteTensionPattern = /\d|%|％|反而|竟然|原來|唔係|不是|死亡|死|長命|風險|增加|降低|上升|下跌|差幾遠|錯|失敗|成功|點解|為什麼/u

function hasStrongAudienceHooks(recommendations: Recommendation[]) {
  return recommendations.every((item) => {
    const title = item.title.replace(/\s+/g, '')
    const hook = item.hook.replace(/\s+/g, '')
    if (Array.from(title).length < 8 || Array.from(title).length > 28 || weakHeadlinePattern.test(title) || overColloquialTitlePattern.test(title) || weakOpeningPattern.test(hook)) return false
    return concreteTensionPattern.test(title) && concreteTensionPattern.test(`${title}${hook}`)
  })
}

function fallback(summary: string, frameworks: DirectionFramework[], sourceReferences: SourceReference[]): Recommendation[] {
  const subject = summary.replace(/https?:\/\/\S+/giu, ' ').replace(/\s+/g, ' ').slice(0, 24) || '今次題材'
  const chosen: DirectionFramework[] = []
  for (const framework of frameworks) {
    if (chosen.some((item) => item.mechanism === framework.mechanism)) continue
    if (chosen.length === 2 && new Set(chosen.map((item) => item.category)).size === 1 && chosen[0]?.category === framework.category) continue
    chosen.push(framework)
    if (chosen.length === 3) break
  }
  const candidates = chosen.length === 3 ? chosen : retrieveDirectionFrameworks(summary, '', 20).filter((framework, index, all) => all.findIndex((item) => item.mechanism === framework.mechanism) === index).slice(0, 3)
  const hookFor: Record<HookMechanismId, string> = {
    counter_intuition: `${subject}，可能同你一直以為嘅唔一樣。`, curiosity_gap: `${subject}背後，最關鍵嗰點通常冇人講。`,
    number_tension: `${subject}入面，邊個數字最容易被睇錯？`, identity_callout: `如果你都關心${subject}，呢個角度值得睇。`,
    before_after: `${subject}前後相比，真正改變咗啲乜？`, direct_question: `${subject}，我哋係咪一直理解錯咗？`,
    benefit_promise: `用幾頁拆清楚${subject}最值得留意嘅重點。`, risk_warning: `講${subject}之前，先避開呢個最常見誤解。`,
    position_conflict: `同一個${subject}，兩種講法可以得出完全不同結論。`, unfinished_story: `${subject}去到呢個轉捩點，事情先真正開始。`,
  }
  return candidates.map((framework, index) => ({
    id: `fallback-${framework.id}`, title: framework.template.replace(/＿+/gu, '').replace(/[？?]$/u, '').slice(0, 28) || framework.categoryLabel,
    concept: `以「${framework.categoryLabel}」角度整理${subject}，並以${framework.mechanismLabel}帶入核心內容。`,
    reason: `現有資料符合「${framework.categoryLabel}」所需輸入，亦可與另外兩個方向形成不同敘事。`,
    hook: hookFor[framework.mechanism], category: framework.categoryLabel, categoryId: framework.category,
    primaryHookMechanism: framework.mechanism, frameworkId: framework.id, sourceRefs: sourceReferences.slice(0, 1),
    hookMechanism: framework.mechanismLabel,
    verificationFlags: framework.category === 'evidence_interpretation' ? ['確認數字屬相對風險、絕對風險或百分點', '確認研究設計、樣本及適用人群'] : [],
    version: `${DIRECTION_CONTRACT_VERSION}-fallback-${index + 1}`,
  }))
}

function fallbackFormat(summary: string): FormatRecommendation {
  const normalized = summary.toLowerCase()
  if (/(示範|過程|幕後|訪問|對話|動作|教學影片|短片|reel|video)/i.test(normalized)) {
    return { recommendedFormat: 'short_video', recommendedVideoMethod: 'human_filming', formatReason: '內容包含動作、過程或人物表達，以真人短片最容易說清楚。' }
  }
  if (/(優惠|開業|公告|一句|主視覺|海報|活動日期|限時)/i.test(normalized) && summary.length < 220) {
    return { recommendedFormat: 'single_image', recommendedVideoMethod: null, formatReason: '訊息集中而明確，以單張主視覺最快讓受眾掌握。' }
  }
  return { recommendedFormat: 'carousel', recommendedVideoMethod: null, formatReason: '題材包含多個重點或需要逐步解釋，以輪播最容易建立清晰脈絡。' }
}

function explicitFormatIntent(summary: string): FormatRecommendation | null {
  if (/(?:真人(?:示範|拍攝|短片|影片|出鏡)|主持人.{0,12}(?:示範|介紹|講解)|human[ -]?(?:video|filming))/i.test(summary)) {
    return { recommendedFormat: 'short_video', recommendedVideoMethod: 'human_filming', formatReason: 'Brief 已明確要求真人示範或真人拍攝，因此優先採用真人短片。' }
  }
  if (/(?:AI\s*(?:短片|影片|生成影片)|人工智能生成影片|ai[ -]?(?:video|generated video))/i.test(summary)) {
    return { recommendedFormat: 'short_video', recommendedVideoMethod: 'ai_video_generation', formatReason: 'Brief 已明確要求 AI 生成影片，因此優先採用 AI 短片。' }
  }
  if (/(?:輪播貼文|IG\s*carousel|carousel)/i.test(summary)) {
    return { recommendedFormat: 'carousel', recommendedVideoMethod: null, formatReason: 'Brief 已明確指定輪播貼文。' }
  }
  if (/(?:單張貼文|單圖貼文|單張主視覺)/i.test(summary)) {
    return { recommendedFormat: 'single_image', recommendedVideoMethod: null, formatReason: 'Brief 已明確指定單張貼文。' }
  }
  return null
}

function resolveFormatRecommendation(value: unknown, summary: string, selectedFormat = ''): FormatRecommendation {
  if (selectedFormat === 'carousel' || selectedFormat === 'single_image' || selectedFormat === 'short_video') {
    const normalized = normalizeFormatRecommendation(value, summary)
    return { recommendedFormat: selectedFormat, recommendedVideoMethod: selectedFormat === 'short_video' ? normalized.recommendedVideoMethod : null, formatReason: '沿用已選擇的內容格式。' }
  }
  return explicitFormatIntent(summary) || normalizeFormatRecommendation(value, summary)
}

function normalizeFormatRecommendation(value: unknown, summary: string): FormatRecommendation {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const recommendedFormat = source.recommendedFormat === 'single_image' || source.recommendedFormat === 'short_video' || source.recommendedFormat === 'carousel'
    ? source.recommendedFormat
    : fallbackFormat(summary).recommendedFormat
  const recommendedVideoMethod = recommendedFormat === 'short_video'
    ? source.recommendedVideoMethod === 'ai_video_generation' ? 'ai_video_generation' : 'human_filming'
    : null
  return {
    recommendedFormat,
    recommendedVideoMethod,
    formatReason: clean(source.formatReason, 180) || fallbackFormat(summary).formatReason,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const workspaceId = clean(body.workspaceId, 80)
    const projectId = clean(body.projectId, 80)
    const summary = clean(body.summary, 5000)
    const format = clean(body.format, 80)
    const sourceReferences = extractSourceReferences(summary)
    const frameworkCandidates = retrieveDirectionFrameworks(summary, format, 10)
    const fallbackFormatRecommendation = resolveFormatRecommendation({}, summary, format)
    if (!isUuid(workspaceId) || !isUuid(projectId) || !summary) {
      return NextResponse.json({ error: 'Missing recommendation context' }, { status: 400 })
    }

    const supabase = createServerSupabase(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [{ data: workspace }, { data: brandKit }] = await Promise.all([
      access.admin.from('workspaces').select('name,description,content_directions,market_locations').eq('id', workspaceId).maybeSingle(),
      access.admin.from('brand_kits').select('business_name,business_type,elevator_pitch,audience,market_positioning,brand_profile').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    let coreRecommendations: Recommendation[] = []
    let coreSlideCount: number | null = null
    let coreSlideCountReason = ''
    const coreKey = process.env.SOON_CORE_KNOWLEDGE_KEY
    if (coreKey) {
      try {
        const baseUrl = (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/api/intelligence/directions/recommend`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-soon-knowledge-key': coreKey },
          body: JSON.stringify({
            workspaceId, projectId, summary, format, workspace, brand: brandKit,
            directionContractVersion: DIRECTION_CONTRACT_VERSION,
            frameworkCandidates,
            sourceReferences,
          }),
          cache: 'no-store', signal: AbortSignal.timeout(10000),
        })
        if (response.ok) {
          const payload = await response.json()
          coreRecommendations = normalize(payload?.recommendations, sourceReferences, frameworkCandidates)
          coreSlideCount = normalizeSlideCount(payload?.recommendedSlideCount)
          coreSlideCountReason = clean(payload?.slideCountReason, 180)
          if (payload?.directionContractVersion === DIRECTION_CONTRACT_VERSION && hasDirectionDiversity(coreRecommendations) && (format !== 'carousel' || coreSlideCount)) {
            const coreFormatRecommendation = resolveFormatRecommendation(payload, summary, format)
            return NextResponse.json({
              recommendations: coreRecommendations,
              recommendedSlideCount: coreSlideCount,
              slideCountReason: coreSlideCountReason,
              ...coreFormatRecommendation,
              directionContractVersion: DIRECTION_CONTRACT_VERSION,
              source: 'soon_core',
            })
          }
        }
      } catch (error) {
        console.error('[content-directions] Core recommendation unavailable', error)
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({
      recommendations: hasDirectionDiversity(coreRecommendations) ? coreRecommendations : fallback(summary, frameworkCandidates, sourceReferences),
      recommendedSlideCount: coreSlideCount,
      slideCountReason: coreSlideCountReason,
      ...fallbackFormatRecommendation,
      directionContractVersion: DIRECTION_CONTRACT_VERSION,
      source: hasDirectionDiversity(coreRecommendations) ? 'soon_core' : 'fallback',
    })
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL), max_tokens: 2400, temperature: 0.45,
        system: `你是 SOON，一位熟悉香港社交媒體的資深內容策劃。只輸出有效 JSON。所有面向用家的文字必須跟隨輸入語氣，使用自然、直接的香港廣東話書面語；避免新聞稿、教科書、台式或內地書面語。封面 title 要比內文更俐落，採用香港讀者自然接受的書面字詞：優先用「的人／降低／增加／差幾遠／弄清楚」，不要寫成「嘅人／低咗／高咗／差咗／睇清楚」。廣東話語氣詞只在能增加吸引力時保留，例如「真係」。不可虛構資料、人物、數字、流程、品牌動機或因果。模板只代表敘事機制，不可直接照抄。title 只准一個主句，12 至 22 個中文字；不可用破折號、冒號或「但係／但」再接解說尾巴。反常識研究優先採用「具體行為＋反而＋意外結果＋問號」。禁止「唔係你諗嘅意思」「數字係咁」「有幾大關係」等抽象尾句；先講觀眾關心的人、行為和結果，不要先講研究數目或國家。`,
        messages: [{ role: 'user', content: `根據資料推薦剛好 3 個可直接製作、而且真正不同的內容方向。每個方向只講一個核心概念。\n\n封面題目與開場硬規則：\n- title 是觀眾會在封面看見的主 Hook，不是內部方向名稱、文章欄目名或研究摘要。\n- title 以 12 至 26 個中文字為目標，第一眼就要看見具體人物／行為，以及最意外但有來源支持的結果、數字、風險或衝突。\n- 反常識題材優先使用「反而」等自然轉折；若資料只證明相關而非因果，可用問號保留不確定性。\n- hook 是封面之後的第一句，要補充一個具體數字、對比或懸念，不可只是重講 title。\n- 禁止「藏在數字裡」「真係假／是真是假」「兩種讀法」「背後真相」「有一件事未講清楚」「值得關注」「件事複雜得多」等抽象萬用句。\n- 禁止用「研究數字」「證據解讀」「文化角度」等分類名稱做 title。\n- 研究限制放入 concept、verificationFlags 或後續內容；不要用整段免責聲明淹沒封面張力。\n\n多樣性硬規則：\n- 3 個方向必須使用 3 種不同 primaryHookMechanism。\n- 至少來自 2 種 categoryId。\n- 最多只可有 1 個 hook 以問號結尾。\n- 禁止「你是否也遇過」「大家一直以為」「先記下這幾個重點」等萬用開場。\n- title 與 hook 必須題材專屬；換成另一題材後仍成立即代表太空泛。\n- Hook 直接呈現最具體的反差、風險、好奇缺口或受眾價值。\n\n事實規則：\n- 每個方向的 sourceRefs 只可使用下方來源 ID。\n- 有研究或數字時，分清觀察研究與實驗、相關與因果、樣本／比較組／適用人群、相對風險／絕對風險／百分點。\n- 資料未能確認時加入 verificationFlags，絕不可在 Hook 補作事實。\n- 品牌沒有公開解釋時，只可寫成分析或可能考慮；不可當作內部事實。\n\n${format ? `用家已選格式：${format}` : '用家尚未選擇格式。請判斷 carousel、single_image 或 short_video 哪一種最能說清楚。'}\n題材：${summary}\n品牌資料：${JSON.stringify({ workspace, brandKit })}\n來源段落：${JSON.stringify(sourceReferences)}\n可選框架：${JSON.stringify(frameworkCandidates.map((candidate) => ({ id: candidate.id, categoryId: candidate.category, category: candidate.categoryLabel, primaryHookMechanism: candidate.mechanism, mechanism: candidate.mechanismLabel, mechanismDescription: candidate.mechanismDescription, template: candidate.template, example: candidate.example, constraints: candidate.constraints })))}\n以上例子只用來理解機制，例子中的數字、人物及情境不得沿用。只能從可選框架選擇 frameworkId、categoryId 及 primaryHookMechanism。\n${format === 'carousel' || !format ? '如建議或已選 carousel，按真正可拆分的獨立重點建議 3 至 10 張；不可為湊頁數重複內容。' : 'recommendedSlideCount 必須是 null。'}\n輸出前逐條檢查：title 是否已經係一條足以令目標受眾停低的封面 Hook；是否具體；是否有張力；是否自然香港廣東話；是否忠於來源。不合格就重寫。\n只輸出 {"recommendations":[{"id":"stable-slug","frameworkId":"候選框架 id","title":"面向觀眾的封面題目，12至26個中文字","concept":"一句具體構想及必要研究限制","reason":"一句選用理由","hook":"封面後第一句，以具體證據或懸念推進","categoryId":"候選 categoryId","category":"內容分類","primaryHookMechanism":"候選機制 id","secondaryHookMechanism":"另一機制 id 或空字串","sourceRefs":["S1"],"verificationFlags":["需要人手核實的具體事項"],"version":"${DIRECTION_CONTRACT_VERSION}"}],"recommendedFormat":"carousel|single_image|short_video","recommendedVideoMethod":"human_filming|ai_video_generation|null","formatReason":"一句說明為何此格式最適合","recommendedSlideCount":6,"slideCountReason":"一句解釋內容可如何分頁","directionContractVersion":"${DIRECTION_CONTRACT_VERSION}"}` }],
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'Recommendation failed')
    const output = Array.isArray(data.content) ? data.content.find((item: any) => item.type === 'text')?.text : ''
    const parsed = JSON.parse(String(output || '').replace(/^```json\s*|\s*```$/g, ''))
    const recommendations = normalize(parsed?.recommendations, sourceReferences, frameworkCandidates)
    const formatRecommendation = resolveFormatRecommendation(parsed, summary, format)
    const recommendedSlideCount = formatRecommendation.recommendedFormat === 'carousel' ? normalizeSlideCount(parsed?.recommendedSlideCount) : null
    return NextResponse.json({
      recommendations: hasDirectionDiversity(recommendations)
        ? recommendations
        : (hasDirectionDiversity(coreRecommendations) ? coreRecommendations : fallback(summary, frameworkCandidates, sourceReferences)),
      recommendedSlideCount,
      slideCountReason: recommendedSlideCount ? clean(parsed?.slideCountReason, 180) : '',
      ...formatRecommendation,
      directionContractVersion: DIRECTION_CONTRACT_VERSION,
      source: hasDirectionDiversity(recommendations) ? 'creator_ai' : (hasDirectionDiversity(coreRecommendations) ? 'soon_core' : 'fallback'),
    })
  } catch (error) {
    console.error('[content-directions] recommendation failed', error)
    return NextResponse.json({ error: '未能取得內容方向建議', detail: String(error) }, { status: 500 })
  }
}
