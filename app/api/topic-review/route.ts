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
}

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

function buildContentPieces(contentMix?: TopicRequestBody['contentMix']) {
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

function parseJsonArray(text: string) {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
  } catch {}

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(trimmed.slice(start, end + 1))
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
  }

  throw new Error('Failed to parse topic JSON array')
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
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const contentPieces = buildContentPieces(input.contentMix)
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

    const userPrompt = [
      'Generate content topics for the following brand:',
      '',
      `Brand: ${stringValue(input.profile?.businessName || input.profile?.business_name)}`,
      `Industry: ${stringValue(input.profile?.businessType || input.profile?.business_type)}`,
      `Brand description: ${stringValue(input.profile?.elevatorPitch || input.profile?.elevator_pitch)}`,
      `Target audience: ${stringValue(input.profile?.target_audience || input.profile?.audience?.summary || input.profile?.brandProfile?.audience)}`,
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
      '- Return ONLY a JSON array of strings, no other text:',
      '["topic 1", "topic 2", ...]',
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
        max_tokens: 1300,
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
      { error: 'Failed to generate topic review topics', detail: String(error) },
      { status: 500 }
    )
  }
}
