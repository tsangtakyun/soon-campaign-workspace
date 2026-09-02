import {
  defaultContentStrategyLibrary,
  normalizeContentStrategyLibrary,
  type ContentStrategyLibraryItem,
} from '@/lib/content-strategy-library'
import { anthropicModel } from '@/lib/anthropic-models'
import type { StrategyLibraryState } from '@/lib/strategy-library'

export type ContentStrategyProfile = {
  websiteUrl?: string
  language?: string
  businessName?: string
  businessType?: 'services' | 'local' | 'products'
  budget?: string
  elevatorPitch?: string
  audience?: {
    summary?: string
    locations?: string[]
  }
  contentPeople?: {
    ageRange?: string
    gender?: string
    ethnicity?: string
  }
  marketPositioning?: {
    primary?: string
    secondary?: string
    tertiary?: string
  }
  brandProfile?: {
    type?: string
    audience?: string
    position?: string
    tone?: string
    offer?: string
  }
}

export type ContentStrategyOption = {
  id: string
  emoji: string
  title: string
  titleZh?: string
  description: string
  reason?: string
  funnelStage?: string
  imageUrl?: string
  directionTitle?: string
  examples?: string[]
}

export type ContentStrategyRecommendation = {
  recommended: ContentStrategyOption
  alternatives: ContentStrategyOption[]
  provider: 'anthropic' | 'fallback'
  model: string
}

export async function recommendContentStrategy(
  profile: ContentStrategyProfile,
  language = '繁體中文',
  library?: StrategyLibraryState,
  contentStrategies: ContentStrategyLibraryItem[] = defaultContentStrategyLibrary
): Promise<ContentStrategyRecommendation> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = anthropicModel(process.env.ANTHROPIC_STRATEGY_MODEL)
  const fullCatalog = strategyCatalog(contentStrategies)
  const candidateIds = getCandidateStrategies(profile.businessType || '', profile.budget || '')
  const catalog = fullCatalog.filter((item) => candidateIds.includes(item.id))

  if (!apiKey) {
    console.error('[content-strategy] ANTHROPIC_API_KEY is not configured; using tailored fallback directions.')
    return fallbackStrategy(profile, catalog)
  }

  const systemPrompt = "You are a senior content strategist for SOON, an AI marketing platform. The user's brand profile has been analyzed. A shortlist of the most suitable content strategies has already been pre-selected based on business type and budget. Pick the single BEST strategy, then tailor every shortlisted option into a concrete, client-friendly content direction for this specific brand. Return only valid JSON. No markdown. All human-facing strings must use the requested language. For Traditional Chinese, use concise, polished written Traditional Chinese. Keep canonical strategy IDs unchanged and only use IDs from the shortlist. Do not make medical, financial, legal, performance, or business claims that are not supported by the supplied profile."

  const libraryContext = library ? summarizeLibrary(library) : 'No internal strategy library provided.'
  const allowedIds = candidateIds.join(', ')

  const userPrompt = [
    `Requested language: ${language}`,
    `Brand name: ${profile.businessName || '未提供'}`,
    `Website: ${profile.websiteUrl || '未提供'}`,
    `Business type: ${profile.businessType || '未提供'}`,
    `Budget: ${profile.budget || '未提供'}`,
    `Elevator pitch: ${profile.elevatorPitch || '未提供'}`,
    `Audience: ${profile.audience?.summary || profile.brandProfile?.audience || '未提供'}`,
    `Content people: ${profile.contentPeople?.ageRange || ''} ${profile.contentPeople?.gender || ''} ${profile.contentPeople?.ethnicity || ''}`,
    `Market positioning primary: ${profile.marketPositioning?.primary || '未提供'}`,
    `Market positioning secondary: ${profile.marketPositioning?.secondary || '未提供'}`,
    `Market positioning tertiary: ${profile.marketPositioning?.tertiary || '未提供'}`,
    `Brand tone: ${profile.brandProfile?.tone || '未提供'}`,
    `Main offer: ${profile.brandProfile?.offer || '未提供'}`,
    '',
    `Public content strategy library:\n${catalog.map((item) => [
      `${item.id}: ${item.title}`,
      `Stage: ${item.funnelStage}`,
      `Description: ${item.description}`,
      `Purpose: ${item.reason}`,
      `Fit for: ${item.fitFor}`,
    ].join(' | ')).join('\n')}`,
    '',
    `Internal SOON strategy-library rules for decision context:\n${libraryContext}`,
    '',
    'Return JSON with this exact shape:',
    JSON.stringify({
      recommendedId: `one of: ${allowedIds}`,
      reason: 'one concise sentence explaining why the recommended direction fits this brand',
      options: catalog.map((item) => ({
        id: item.id,
        directionTitle: 'a concrete Traditional Chinese direction title tailored to this brand (maximum 14 Chinese characters)',
        summary: 'one concise sentence describing how this brand would use this direction',
        examples: ['specific content example 1', 'specific content example 2', 'specific content example 3'],
      })),
    }),
  ].join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1800,
        temperature: 0.25,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || 'Anthropic API request failed')
    }

    const text = Array.isArray(data.content)
      ? data.content
        .filter((item: { type?: string }) => item.type === 'text')
        .map((item: { text?: string }) => item.text || '')
        .join('\n')
        .trim()
      : ''

    const parsed = parseJsonObject(text)
    const recommendedId = normalizeStrategyId(parsed.recommendedId, catalog)
    const reason = removeInternalStrategyTerms(
      stringValue(parsed.reason, catalog.find((item) => item.id === recommendedId)?.reason || ''),
      catalog
    )
    const tailoredOptions = normalizeTailoredOptions(parsed.options, catalog)

    return buildRecommendation(recommendedId, catalog, reason, 'anthropic', model, tailoredOptions)
  } catch (error) {
    console.error('[content-strategy] AI recommendation failed; using tailored fallback directions.', {
      message: error instanceof Error ? error.message : String(error),
      model,
    })
    return fallbackStrategy(profile, catalog)
  }
}

function strategyCatalog(contentStrategies: ContentStrategyLibraryItem[]) {
  return normalizeContentStrategyLibrary(contentStrategies).map((item) => ({
    id: item.id,
    emoji: item.emoji,
    title: item.name,
    titleZh: item.nameZh,
    description: item.description,
    reason: item.purpose,
    funnelStage: item.funnelStage,
    imageUrl: item.imageUrl,
    fitFor: item.fitFor,
    examples: item.examples,
  }))
}

function getCandidateStrategies(businessType: string, budget: string): string[] {
  const isHighBudget = budget?.includes('50,000') || budget?.includes('以上')
  const type = businessType?.toLowerCase()

  if (type === 'local') {
    return isHighBudget
      ? ['offer-promotion', 'community-content', 'lifestyle-content', 'social-proof', 'behind-the-scenes']
      : ['lifestyle-content', 'social-proof', 'behind-the-scenes', 'storytelling', 'community-content']
  }
  if (type === 'products') {
    return ['product-education', 'lifestyle-content', 'social-proof', 'offer-promotion', 'behind-the-scenes']
  }
  if (type === 'services') {
    return isHighBudget
      ? ['authority-content', 'social-proof', 'problem-solution', 'call-to-action-content', 'storytelling']
      : ['authority-content', 'storytelling', 'problem-solution', 'personal-brand-content', 'behind-the-scenes']
  }
  return ['lifestyle-content', 'storytelling', 'behind-the-scenes', 'social-proof', 'problem-solution', 'authority-content']
}

function buildRecommendation(
  recommendedId: string,
  catalog: ReturnType<typeof strategyCatalog>,
  reason: string,
  provider: 'anthropic' | 'fallback',
  model: string,
  tailoredOptions: Map<string, { directionTitle: string; summary: string; examples: string[] }> = new Map()
): ContentStrategyRecommendation {
  const applyTailoring = (item: (typeof catalog)[number]) => {
    const tailored = tailoredOptions.get(item.id)
    return {
      ...item,
      directionTitle: tailored?.directionTitle || item.titleZh,
      description: tailored?.summary || item.description,
      examples: tailored?.examples?.length ? tailored.examples : item.examples,
    }
  }
  const recommended = applyTailoring(catalog.find((item) => item.id === recommendedId) || catalog[0])
  const alternatives = catalog
    .filter((item) => item.id !== recommended.id)
    .map(applyTailoring)

  return {
    recommended: {
      ...recommended,
      reason: reason || recommended.reason,
    },
    alternatives,
    provider,
    model,
  }
}

function normalizeTailoredOptions(
  value: unknown,
  catalog: ReturnType<typeof strategyCatalog>
) {
  const result = new Map<string, { directionTitle: string; summary: string; examples: string[] }>()
  if (!Array.isArray(value)) return result

  value.forEach((option: any) => {
    const id = typeof option?.id === 'string' ? option.id : ''
    if (!catalog.some((item) => item.id === id)) return
    const directionTitle = stringValue(option?.directionTitle, '')
    const summary = stringValue(option?.summary, '')
    const examples = Array.isArray(option?.examples)
      ? option.examples.map((item: unknown) => stringValue(item, '')).filter(Boolean).slice(0, 3)
      : []
    if (directionTitle || summary || examples.length) {
      result.set(id, { directionTitle, summary, examples })
    }
  })
  return result
}

function fallbackStrategy(
  profile: ContentStrategyProfile,
  catalog: ReturnType<typeof strategyCatalog>
): ContentStrategyRecommendation {
  const tailoredOptions = buildFallbackDirections(profile, catalog)
  const preferredIds = fallbackPriority(profile.businessType || '')
  const recommendedId = preferredIds.find((id) => catalog.some((item) => item.id === id))
    || catalog[0]?.id
    || 'lifestyle-content'

  return buildRecommendation(
    recommendedId,
    catalog,
    fallbackReason(profile, recommendedId),
    'fallback',
    'fallback',
    tailoredOptions
  )
}

function buildFallbackDirections(
  profile: ContentStrategyProfile,
  catalog: ReturnType<typeof strategyCatalog>
) {
  const result = new Map<string, { directionTitle: string; summary: string; examples: string[] }>()
  const context = [
    profile.businessName,
    profile.elevatorPitch,
    profile.brandProfile?.type,
    profile.brandProfile?.offer,
  ].filter(Boolean).join(' ')
  const isRehab = /復康|物理治療|痛症|運動治療|sports? rehab|physio/i.test(context)
  const isFitness = /健身|運動|pilates|瑜伽|fitness/i.test(context)
  const isFood = /餐廳|餐飲|美食|咖啡|食品|restaurant|food|cafe/i.test(context)

  const directionById: Record<string, { directionTitle: string; summary: string; examples: string[] }> = isRehab
    ? {
        'authority-content': practical('專業復康知識拆解', '用淺白方式拆解痛症、評估及復康知識，建立專業信任。', ['常見痛症成因', '評估流程解說', '復康常見誤解']),
        storytelling: practical('復康歷程與轉變', '以真實服務歷程講解由評估到復康的過程，不作未經證實的成效保證。', ['個案歷程', '治療師觀察', '復康里程碑']),
        'problem-solution': practical('常見痛症改善方向', '由受眾最常遇到的痛症及活動限制切入，再介紹可考慮的處理方向。', ['腰背痛怎樣開始', '運動後不適怎樣處理', '何時需要專業評估']),
        'personal-brand-content': practical('認識治療團隊', '介紹治療師的專業背景、理念及日常工作，讓客戶知道誰會照顧他們。', ['治療師自我介紹', '團隊專業分工', '我們重視的復康理念']),
        'behind-the-scenes': practical('評估與治療幕後', '展示中心日常、器材及專業流程，減低第一次到訪的不安。', ['首次評估流程', '治療室準備', '器材使用解說']),
      }
    : isFitness
      ? {
          'authority-content': practical('運動知識簡明拆解', '把專業訓練知識變成受眾容易理解及實踐的內容。', ['動作常見錯誤', '訓練前後準備', '新手常見問題']),
          storytelling: practical('會員訓練歷程', '透過真實訓練過程及里程碑，呈現品牌如何陪伴會員。', ['開始訓練的原因', '教練觀察', '階段性里程碑']),
          'problem-solution': practical('常見訓練問題解答', '由受眾的訓練困難切入，再提供清晰可行的方向。', ['沒有時間運動', '動作做不對', '如何建立習慣']),
          'personal-brand-content': practical('認識教練團隊', '介紹教練的背景、專長與教學理念。', ['教練自我介紹', '專長分工', '教學理念']),
          'behind-the-scenes': practical('訓練課堂幕後', '展示課堂準備、教學細節及真實工作日常。', ['課前準備', '課堂片段', '器材介紹']),
        }
      : isFood
        ? {
            'lifestyle-content': practical('到店必試與用餐情境', '把招牌產品放入真實用餐情境，讓受眾容易想像到店體驗。', ['招牌必試', '不同時段食法', '朋友聚餐情境']),
            'social-proof': practical('真實食客口碑', '整理真實食客評價與回訪原因，建立信任。', ['食客短評', '回訪原因', '熱門點單組合']),
            'behind-the-scenes': practical('廚房與製作幕後', '展示食材、製作及團隊日常，增加品牌真實感。', ['食材準備', '製作過程', '店員日常']),
            storytelling: practical('招牌菜背後故事', '用人物、地方與做法講出品牌和招牌產品的故事。', ['開店故事', '招牌菜由來', '團隊人物']),
            'community-content': practical('附近生活與社區話題', '連結附近地區、節日與生活場景，成為社區內容的一部分。', ['附近好去處', '節日限定', '社區小故事']),
          }
        : genericFallbackDirections(profile.businessType || '')

  catalog.forEach((item) => {
    const tailored = directionById[item.id]
    if (tailored) result.set(item.id, tailored)
  })
  return result
}

function genericFallbackDirections(businessType: string) {
  const common: Record<string, { directionTitle: string; summary: string; examples: string[] }> = {
    'authority-content': practical('專業知識簡明拆解', '把品牌最熟悉的專業知識，變成受眾容易理解的實用內容。', ['常見問題', '專業知識拆解', '行內常見誤解']),
    storytelling: practical('品牌與客戶故事', '用人物、過程與真實情境講出品牌價值。', ['品牌起點', '客戶歷程', '團隊故事']),
    'problem-solution': practical('客戶問題解決方向', '由客戶最常見的困難切入，再展示品牌可提供的處理方向。', ['常見困難', '解決步驟', '選擇服務前須知']),
    'personal-brand-content': practical('認識品牌主理人', '介紹主理人的理念、經驗及工作方式。', ['主理人介紹', '工作理念', '日常判斷']),
    'behind-the-scenes': practical('服務與製作幕後', '展示真實工作流程、準備及團隊日常。', ['工作流程', '幕後準備', '團隊日常']),
    'product-education': practical('產品選擇與使用指南', '清楚說明產品用途、分別及適合情境。', ['產品比較', '使用方法', '選購指南']),
    'lifestyle-content': practical('產品融入生活場景', '用真實生活情境展示品牌或產品如何被使用。', ['日常使用', '不同情境', '生活提案']),
    'social-proof': practical('真實客戶口碑與案例', '用真實評價、案例與常見選擇建立信任。', ['客戶評價', '使用案例', '熱門選擇']),
    'offer-promotion': practical('優惠與行動資訊', '把優惠、限時資訊及下一步行動講得清楚。', ['限時優惠', '套餐介紹', '預約方法']),
    'community-content': practical('社區與客戶共同話題', '連結地區、社群與客戶日常，建立參與感。', ['社區話題', '客戶互動', '節日內容']),
    'call-to-action-content': practical('預約與查詢引導', '用清晰內容解答行動前疑問，帶領受眾查詢或預約。', ['如何預約', '服務流程', '首次查詢須知']),
  }

  if (businessType === 'products') common['behind-the-scenes'] = practical('產品製作與品牌幕後', '展示產品由構思到完成的真實過程。', ['選材過程', '製作幕後', '品質細節'])
  return common
}

function practical(directionTitle: string, summary: string, examples: string[]) {
  return { directionTitle, summary, examples }
}

function fallbackPriority(businessType: string) {
  if (businessType === 'services') return ['problem-solution', 'authority-content', 'storytelling']
  if (businessType === 'products') return ['product-education', 'lifestyle-content', 'social-proof']
  if (businessType === 'local') return ['lifestyle-content', 'social-proof', 'behind-the-scenes']
  return ['problem-solution', 'lifestyle-content', 'storytelling']
}

function fallbackReason(profile: ContentStrategyProfile, recommendedId: string) {
  if (recommendedId === 'problem-solution') {
    return `先由${profile.audience?.summary ? '目標受眾' : '客戶'}最常見的問題開始，最容易把品牌價值講得具體。`
  }
  return '這個方向最容易把品牌現有的專業、產品或服務轉化成可以立即製作的內容。'
}

function normalizeStrategyId(value: unknown, catalog: ReturnType<typeof strategyCatalog>) {
  const id = stringValue(value, 'lifestyle-content').toLowerCase()
  return catalog.some((item) => item.id === id) ? id : catalog[0]?.id || 'lifestyle-content'
}

function removeInternalStrategyTerms(
  value: string,
  catalog: ReturnType<typeof strategyCatalog>
) {
  const terms = catalog
    .flatMap((item) => [item.title, item.titleZh])
    .filter((item): item is string => Boolean(item))
    .sort((a, b) => b.length - a.length)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (!terms.length) return value
  return value
    .replace(new RegExp(`(?:${terms.join('|')})(?:\\s*策略)?`, 'gi'), '這個內容方向')
    .replace(/這個內容方向\s*這個內容方向/g, '這個內容方向')
}

function summarizeLibrary(library: StrategyLibraryState) {
  const lines = [
    summarizeSection('Objectives', library.objectives),
    summarizeSection('Brand situations', library.brandSituations),
    summarizeSection('Angle types', library.angleTypes),
    summarizeSection('Funnel stages', library.funnelStages),
    summarizeSection('Deliverable shapes', library.deliverableShapes),
  ]

  return lines.join('\n').slice(0, 6000)
}

function summarizeSection(title: string, items: StrategyLibraryState[keyof StrategyLibraryState]) {
  return `${title}:\n${items.map((item) => `- ${item.name}: ${item.summary} Fit for: ${item.fitFor}`).join('\n')}`
}

function parseJsonObject(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      return JSON.parse(match[0])
    } catch {
      return {}
    }
  }
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
