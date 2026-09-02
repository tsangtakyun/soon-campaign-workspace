import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

type ContentMixItem = {
  id?: string
  title?: string
  titleZh?: string
  quantity?: number
}

type TopicRequestBody = {
  profile?: any
  strategy?: any
  campaign?: any
  distribution?: any
  contentMix?: {
    items?: ContentMixItem[]
  }
  visualStyle?: any
  photoControl?: any
  contentMood?: {
    selectedMoods?: Array<{
      id?: string
      label?: string
      generationMood?: string
    }>
  }
  websiteAnalysis?: any
  language?: string
  requestedPieces?: string[]
}

type GeneratedTopic = { topic: string; purpose: string }

const CONTENT_TYPE_NAMES: Record<string, { en: string; zh: string }> = {
  'still-images': { en: 'Still Image', zh: '靜態圖片' },
  carousels: { en: 'Carousel', zh: '輪播貼文' },
  'feed-videos': { en: 'Feed Video', zh: '動態影片' },
  'short-form-video': { en: 'Short-form Video', zh: '短影片' },
  stories: { en: 'Story', zh: '限時動態' },
  emails: { en: 'Email', zh: '電郵內容' },
}

function stringValue(value: unknown, fallback = '未提供') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeLanguage(language?: string) {
  if (!language) return 'zh-TW'
  const lower = language.toLowerCase()
  if (lower.startsWith('en')) return 'en'
  if (lower.includes('zh')) return 'zh-TW'
  return language
}

function buildContentPieces(contentMix?: TopicRequestBody['contentMix'], requestedPieces?: string[]) {
  if (requestedPieces?.length) return requestedPieces.map((piece, index) => `${index + 1}. ${piece}`)
  const pieces: string[] = []
  const items = contentMix?.items?.filter((item) => (item.quantity ?? 0) > 0) ?? []

  items.forEach((item) => {
    const typeName = CONTENT_TYPE_NAMES[item.id || '']
    const english = typeName?.en || item.title || item.id || 'Content Piece'
    const chinese = typeName?.zh || item.titleZh || item.title || '內容'

    for (let index = 0; index < (item.quantity ?? 0); index += 1) {
      pieces.push(`${pieces.length + 1}. ${english} (${chinese})`)
    }
  })

  return pieces
}

function normalizeGeneratedTopics(value: unknown): GeneratedTopic[] | null {
  if (!Array.isArray(value)) return null
  const topics = value.map((item) => {
    if (typeof item === 'string') {
      return { topic: item.trim(), purpose: '讓目標受眾快速理解內容重點並建立互動。' }
    }
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    const topic = stringValue(record.topic || record.title, '')
    const purpose = stringValue(record.purpose || record.objective || record.goal, '')
    return topic ? { topic, purpose: purpose || '讓目標受眾快速理解內容重點並建立互動。' } : null
  })
  return topics.every(Boolean) ? (topics as GeneratedTopic[]) : null
}

function parseJsonArray(text: string) {
  const trimmed = text.trim()
  try {
    const parsed = normalizeGeneratedTopics(JSON.parse(trimmed))
    if (parsed) return parsed
  } catch {}

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) {
    const parsed = normalizeGeneratedTopics(JSON.parse(trimmed.slice(start, end + 1)))
    if (parsed) return parsed
  }

  throw new Error('Failed to parse topic JSON array')
}

function collectStringSummary(value: unknown, fallback = '未提供') {
  const values: string[] = []
  const visit = (input: unknown, depth = 0) => {
    if (depth > 3 || values.length >= 10 || input == null) return
    if (typeof input === 'string' && input.trim()) values.push(input.trim())
    else if (Array.isArray(input)) input.forEach((item) => visit(item, depth + 1))
    else if (typeof input === 'object') Object.values(input as Record<string, unknown>).forEach((item) => visit(item, depth + 1))
  }
  visit(value)
  return [...new Set(values)].slice(0, 10).join('、') || fallback
}

function compactSummary(values: unknown[], fallback = '未提供') {
  return collectStringSummary(values, fallback)
}

export async function POST(req: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'topic-review', 30))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  try {
    const input = (await req.json()) as TopicRequestBody
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('[topic-review] ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: '暫時未能整理內容題材，請稍後再試。' }, { status: 500 })
    }

    const contentPieces = buildContentPieces(input.contentMix, input.requestedPieces)
    const total = contentPieces.length

    if (total === 0) {
      return NextResponse.json({ topics: [] })
    }

    const websiteAnalysis = input.websiteAnalysis?.analysis || input.websiteAnalysis || {}
    const campaignProfile = input.campaign?.profile || {}
    const suppliedProfile = input.profile || {}
    const profile = {
      ...websiteAnalysis,
      ...campaignProfile,
      ...suppliedProfile,
      audience: {
        ...(websiteAnalysis?.audience || {}),
        ...(campaignProfile?.audience || {}),
        ...(suppliedProfile?.audience || {}),
      },
      brandProfile: {
        ...(websiteAnalysis?.brandProfile || {}),
        ...(campaignProfile?.brandProfile || {}),
        ...(suppliedProfile?.brandProfile || {}),
      },
    }

    const language = normalizeLanguage(
      input.language ||
        profile?.primaryLanguage ||
        profile?.primary_language ||
        profile?.language
    )

    const systemPrompt =
      'You are a senior social content strategist for Asian local and service businesses. Turn verified brand facts into concrete, executable topics. Every topic must make sense for this specific business and campaign, even if the brand name is removed. Use natural, concise social language rather than generic lifestyle copy or slogans. Never invent services, facilities, prices, results, qualifications, offers, or locations.'

    const contentMoodPreference =
      input.contentMood?.selectedMoods
        ?.map((mood) => mood.generationMood)
        .filter((mood): mood is string => typeof mood === 'string' && mood.trim().length > 0)
        .join(', ') || '未提供'

    const location = compactSummary([
      profile?.audience?.locations,
      profile?.primary_region,
      profile?.primary_city,
      profile?.location,
      profile?.market,
      profile?.primaryMarket,
      profile?.primary_market,
      profile?.city,
      profile?.region,
      websiteAnalysis?.audience?.locations,
    ])
    const services = compactSummary([
      profile?.services,
      profile?.offers,
      profile?.products,
      profile?.brandProfile?.services,
      profile?.brandProfile?.offer,
      profile?.elevatorPitch,
      profile?.elevator_pitch,
      websiteAnalysis?.services,
      websiteAnalysis?.products,
      websiteAnalysis?.brandProfile?.offer,
    ])
    const audience = compactSummary([
      profile?.target_audience,
      profile?.audience?.summary,
      profile?.brandProfile?.audience,
      profile?.contentPeople,
      websiteAnalysis?.audience,
      websiteAnalysis?.brandProfile?.audience,
    ])
    const painPoints = compactSummary([
      profile?.painPoints,
      profile?.pain_points,
      profile?.audience?.painPoints,
      profile?.brandProfile?.painPoints,
      input.strategy?.examples,
      input.strategy?.description,
      websiteAnalysis?.painPoints,
    ])
    const desiredOutcomes = compactSummary([
      profile?.outcomes,
      profile?.desiredOutcomes,
      profile?.desired_outcomes,
      profile?.goals,
      profile?.brandProfile?.outcomes,
      input.campaign?.primaryGoal,
      input.campaign?.audienceAction,
    ])
    const campaignDirection = compactSummary([
      input.campaign?.campaignName,
      input.campaign?.theme,
      input.campaign?.contentFocus,
      input.campaign?.contentFormats,
      input.campaign?.audienceAction,
      input.campaign?.callToAction,
    ])
    const brandName = stringValue(profile?.businessName || profile?.business_name, '')

    if (!brandName || services === '未提供' || audience === '未提供') {
      console.warn('[topic-review] missing required brand context', {
        hasBrandName: Boolean(brandName),
        hasServices: services !== '未提供',
        hasAudience: audience !== '未提供',
      })
      return NextResponse.json(
        { error: '品牌、服務或受眾資料不完整，請返回上一步確認後再試。' },
        { status: 422 }
      )
    }

    const userPrompt = [
      'Generate content topics for the following brand:',
      '',
      `Brand: ${brandName}`,
      `Industry: ${stringValue(profile?.businessType || profile?.business_type)}`,
      `Brand description: ${stringValue(profile?.elevatorPitch || profile?.elevator_pitch)}`,
      `Target audience: ${audience}`,
      `Market and location: ${location}`,
      `Services or offers: ${services}`,
      `Audience pain points: ${painPoints}`,
      `Desired outcomes: ${desiredOutcomes}`,
      `Brand tone: ${stringValue(profile?.brandProfile?.tone)}`,
      `Content strategy: ${stringValue(input.strategy?.titleZh || input.strategy?.title)} — ${stringValue(input.strategy?.reason)}`,
      `Campaign direction: ${campaignDirection}`,
      `Call to action: ${stringValue(input.campaign?.callToAction || input.campaign?.call_to_action)}`,
      `Content mood and style preference: ${contentMoodPreference}. The topics should reflect this mood in their tone, angle and language.`,
      '',
      `Generate exactly ${total} content topics — one for each content piece below:`,
      contentPieces.join('\n'),
      '',
      'Rules:',
      '- Each topic must be anchored in at least TWO supplied facts: (1) a real service/offer and (2) the audience, location, pain point, desired outcome, or campaign direction',
      '- Across the full set, cover the actual service/offer, target audience, operating location, and campaign direction; do not leave any of these four dimensions implicit',
      '- A topic that could be posted unchanged by a cafe, fashion label, or unrelated business is too generic and must be rewritten',
      '- Prefer a concrete customer question, service scenario, decision, misconception, exercise, facility, process, or local use case supported by the supplied facts',
      '- If a required fact is marked 未提供, do not guess it; anchor the topic in other supplied facts',
      `- Topics must advance this campaign direction: ${campaignDirection}`,
      `- Write in ${language} (Traditional Chinese if zh-TW, English if en)`,
      '- Never repeat the city name in the same topic',
      '- Use the brand name sparingly; specificity must come from genuine business facts, not repeated naming',
      '- Topics should be casual and conversational, like real social media posts',
      '- Avoid starting topics with the brand name or city name',
      '- Use first-person or second-person perspective where possible (我們、你、你們)',
      '- Emojis are allowed and encouraged for funny/lifestyle topics',
      '- Keep each topic concise, normally under 30 Chinese characters or 20 English words, but never remove the concrete service anchor just to shorten it',
      '- Each topic is ONE sentence',
      '- Topics should vary in angle — some educational, some emotional, some curiosity-driven, some community-focused',
      '- Do NOT number the topics in your response',
      '- For every item, also write one concise Traditional Chinese sentence explaining its business/content purpose',
      '- Return ONLY this JSON format, no markdown or other text:',
      '[{"topic":"具體題材","purpose":"這個題材的目的"}]',
    ].join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_TOPIC_MODEL),
        max_tokens: 1800,
        temperature: 0.55,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Anthropic API request failed')
    }

    const text = Array.isArray(data.content)
      ? data.content
          .filter((item: { type?: string }) => item.type === 'text')
          .map((item: { text?: string }) => item.text || '')
          .join('\n')
          .trim()
      : ''

    const topics = parseJsonArray(text)

    if (topics.length !== total) {
      throw new Error(`Expected ${total} topics, received ${topics.length}`)
    }

    return NextResponse.json({ topics })
  } catch (error) {
    console.error('[topic-review]', error)
    return NextResponse.json(
      { error: '暫時未能整理內容題材，請稍後再試。' },
      { status: 500 }
    )
  }
}
