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

    const language = normalizeLanguage(
      input.language ||
        input.profile?.primaryLanguage ||
        input.profile?.primary_language ||
        input.profile?.language
    )

    const systemPrompt =
      'You are a witty, natural-sounding social media content writer for Asian markets. You write topics that sound like they were written by a real human — casual, punchy, and relatable. Never use the city name or brand name more than once per topic. Avoid formal or repetitive phrasing. Topics should feel like something a friend would post, not a press release. Keep topics short — ideally under 20 words.'

    const contentMoodPreference =
      input.contentMood?.selectedMoods
        ?.map((mood) => mood.generationMood)
        .filter((mood): mood is string => typeof mood === 'string' && mood.trim().length > 0)
        .join(', ') || '未提供'

    const location = collectStringSummary(
      input.profile?.location || input.profile?.market || input.profile?.primaryMarket || input.profile?.primary_market || input.profile?.city || input.profile?.region
    )
    const services = collectStringSummary(
      input.profile?.services || input.profile?.offers || input.profile?.products || input.profile?.brandProfile?.services
    )
    const painPoints = collectStringSummary(
      input.profile?.painPoints || input.profile?.pain_points || input.profile?.audience?.painPoints || input.profile?.brandProfile?.painPoints
    )
    const desiredOutcomes = collectStringSummary(
      input.profile?.outcomes || input.profile?.desiredOutcomes || input.profile?.desired_outcomes || input.profile?.goals || input.profile?.brandProfile?.outcomes
    )

    const userPrompt = [
      'Generate content topics for the following brand:',
      '',
      `Brand: ${stringValue(input.profile?.businessName || input.profile?.business_name)}`,
      `Industry: ${stringValue(input.profile?.businessType || input.profile?.business_type)}`,
      `Brand description: ${stringValue(input.profile?.elevatorPitch || input.profile?.elevator_pitch)}`,
      `Target audience: ${stringValue(input.profile?.target_audience || input.profile?.audience?.summary || input.profile?.brandProfile?.audience)}`,
      `Market and location: ${location}`,
      `Services or offers: ${services}`,
      `Audience pain points: ${painPoints}`,
      `Desired outcomes: ${desiredOutcomes}`,
      `Brand tone: ${stringValue(input.profile?.brandProfile?.tone)}`,
      `Content strategy: ${stringValue(input.strategy?.titleZh || input.strategy?.title)} — ${stringValue(input.strategy?.reason)}`,
      `Campaign theme: ${stringValue(input.campaign?.theme)}`,
      `Call to action: ${stringValue(input.campaign?.callToAction || input.campaign?.call_to_action)}`,
      `Content mood and style preference: ${contentMoodPreference}. The topics should reflect this mood in their tone, angle and language.`,
      '',
      `Generate exactly ${total} content topics — one for each content piece below:`,
      contentPieces.join('\n'),
      '',
      'Rules:',
      '- Each topic must feel specific to THIS brand, not generic',
      "- Reference the brand's industry, location, or audience when relevant",
      `- Topics should reflect the campaign theme: ${stringValue(input.campaign?.theme)}`,
      `- Write in ${language} (Traditional Chinese if zh-TW, English if en)`,
      '- Never repeat the city name in the same topic',
      '- Never repeat the brand name more than once across all topics',
      '- Topics should be casual and conversational, like real social media posts',
      '- Avoid starting topics with the brand name or city name',
      '- Use first-person or second-person perspective where possible (我們、你、你們)',
      '- Emojis are allowed and encouraged for funny/lifestyle topics',
      '- Keep each topic under 20 words',
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
