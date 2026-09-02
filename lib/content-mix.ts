import type { CampaignTheme } from '@/lib/campaign-theme'
import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'
import { anthropicModel } from '@/lib/anthropic-models'
import { getPricingPlan } from '@/lib/pricing'

export type ContentMixItem = {
  id: string
  title: string
  titleZh: string
  description: string
  creditsEach: number
  quantity: number
  enabled: boolean
}

export type ContentMixInput = {
  profile?: ContentStrategyProfile
  strategy?: ContentStrategyOption
  campaign?: CampaignTheme
  distribution?: {
    channels?: string[]
    channelIds?: string[]
    schedule?: string
  }
  language?: string
  plan?: string
}

export type ContentMixRecommendation = {
  items: ContentMixItem[]
  totalCredits: number
  weeklyCreditLimit: number
  reason: string
  provider: 'anthropic' | 'fallback'
}

export const contentMixCatalog: Omit<ContentMixItem, 'quantity' | 'enabled'>[] = [
  {
    id: 'still-images',
    title: 'Still Images',
    titleZh: '靜態圖片',
    description: 'Single image post for feeds',
    creditsEach: 6,
  },
  {
    id: 'carousels',
    title: 'Carousels',
    titleZh: '輪播圖',
    description: 'Multi-slide storytelling',
    creditsEach: 24,
  },
  {
    id: 'feed-videos',
    title: 'Feed Videos',
    titleZh: 'Feed 影片',
    description: 'Polished video for feed',
    creditsEach: 40,
  },
  {
    id: 'short-form-video',
    title: 'Short-form Video',
    titleZh: '短片內容',
    description: 'Reels, TikToks, Shorts',
    creditsEach: 40,
  },
  {
    id: 'stories',
    title: 'Stories',
    titleZh: '限時動態',
    description: 'Ephemeral vertical content',
    creditsEach: 6,
  },
  {
    id: 'emails',
    title: 'Emails',
    titleZh: 'Email',
    description: 'Newsletters and campaigns',
    creditsEach: 8,
  },
]

export async function recommendContentMix(input: ContentMixInput): Promise<ContentMixRecommendation> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const language = input.language || input.profile?.language || '繁體中文'
  const selectedPlan = getPricingPlan(input.plan)
  const weeklyCreditLimit = selectedPlan.weeklyPlanningCredits
  const fallback = fallbackContentMix(input)

  if (!apiKey) return fallback

  const systemPrompt = [
    'You are a senior content operations planner for SOON.',
    'Recommend a practical first-week content mix based on the selected content strategy, campaign theme, and distribution channels.',
    'Return only valid JSON. No markdown.',
    'Use only the fixed content types provided. Do not add, remove, or rename items.',
    "Only recommend content types that match the user's selected distribution channels. If a channel was not selected, set its quantity to 0 and do not include it in the primary recommendation.",
    `The mix should be realistic for one first week. Keep total credits at or below ${weeklyCreditLimit}.`,
    'For most first-week campaigns, recommend 3-6 total deliverables, unless the channel mix clearly requires more.',
    'All human-facing strings must use the requested language.',
  ].join(' ')

  const catalogText = contentMixCatalog
    .map((item) => `${item.id}: ${item.title} / ${item.titleZh} | ${item.description} | ${item.creditsEach} credits each`)
    .join('\n')

  const userPrompt = [
    `Requested language: ${language}`,
    `Brand name: ${input.profile?.businessName || '未提供'}`,
    `Business type: ${input.profile?.businessType || '未提供'}`,
    `Selected strategy: ${input.strategy?.title || '未提供'} / ${input.strategy?.titleZh || ''}`,
    `Campaign name: ${input.campaign?.campaignName || '未提供'}`,
    `Campaign theme: ${input.campaign?.theme || '未提供'}`,
    `Distribution channels: ${input.distribution?.channels?.join(', ') || input.distribution?.channelIds?.join(', ') || '未提供'}`,
    `Schedule: ${input.distribution?.schedule || '未提供'}`,
    `Selected pricing plan: ${selectedPlan.name}`,
    `Weekly planning credit limit: ${weeklyCreditLimit}`,
    '',
    `Fixed content types:\n${catalogText}`,
    '',
    'Return JSON with this exact shape:',
    JSON.stringify({
      quantities: {
        'still-images': 3,
        carousels: 1,
        'feed-videos': 1,
        'short-form-video': 0,
        stories: 0,
        emails: 1,
      },
      reason: 'one sentence explaining why this first-week mix fits the campaign',
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
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MIX_MODEL),
        max_tokens: 900,
        temperature: 0.25,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'Anthropic API request failed')

    const text = Array.isArray(data.content)
      ? data.content
        .filter((item: { type?: string }) => item.type === 'text')
        .map((item: { text?: string }) => item.text || '')
        .join('\n')
        .trim()
      : ''
    const parsed = parseJsonObject(text)
    const quantities = typeof parsed.quantities === 'object' && parsed.quantities ? parsed.quantities : {}
    const items = buildItems(quantities)
    const totalCredits = calculateTotal(items)

    if (totalCredits > weeklyCreditLimit) return fallback

    return {
      items,
      totalCredits,
      weeklyCreditLimit,
      reason: stringValue(parsed.reason, fallback.reason),
      provider: 'anthropic',
    }
  } catch {
    return fallback
  }
}

export function fallbackContentMix(input: ContentMixInput): ContentMixRecommendation {
  const selectedPlan = getPricingPlan(input.plan)
  const weeklyCreditLimit = selectedPlan.weeklyPlanningCredits
  const hasShortVideo = input.distribution?.channelIds?.some((id) => ['instagram-reels', 'tiktok', 'youtube-shorts'].includes(id))
  const hasStories = input.distribution?.channelIds?.some((id) => ['instagram-stories', 'facebook-stories'].includes(id))
  const hasEmail = input.distribution?.channelIds?.includes('newsletter')
  const frequency = input.distribution?.schedule || '2-3-weekly'
  const isDaily = frequency === 'daily' || frequency === 'everyday'
  const isFrequent = isDaily || frequency === '3-5-weekly' || frequency === 'weekdays'

  const quantities: Record<string, number> = {
    'still-images': isDaily ? 3 : isFrequent ? 2 : 1,
    carousels: 1,
    'feed-videos': hasShortVideo ? 0 : 1,
    'short-form-video': hasShortVideo ? 1 : 0,
    stories: hasStories ? (isDaily ? 2 : 1) : 0,
    emails: hasEmail ? 1 : 0,
  }
  const items = fitItemsWithinLimit(buildItems(quantities), weeklyCreditLimit)

  return {
    items,
    totalCredits: calculateTotal(items),
    weeklyCreditLimit,
    reason: '這個組合先用貼文和輪播圖建立第一週基礎，再按你選擇的平台加入短片、限時動態或電子報。',
    provider: 'fallback',
  }
}

function buildItems(quantities: Record<string, unknown>) {
  return contentMixCatalog.map((item) => {
    const quantity = numberValue(quantities[item.id], 0)
    return {
      ...item,
      quantity,
      enabled: quantity > 0,
    }
  })
}

function calculateTotal(items: ContentMixItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.creditsEach, 0)
}

function fitItemsWithinLimit(items: ContentMixItem[], limit: number) {
  const reduceOrder = ['stories', 'emails', 'still-images', 'carousels', 'feed-videos', 'short-form-video']
  const nextItems = items.map((item) => ({ ...item }))

  while (calculateTotal(nextItems) > limit) {
    const targetId = reduceOrder.find((id) => {
      const item = nextItems.find((candidate) => candidate.id === id)
      return item && item.quantity > 0
    })
    if (!targetId) break
    const target = nextItems.find((item) => item.id === targetId)
    if (!target) break
    target.quantity -= 1
    target.enabled = target.quantity > 0
  }

  return nextItems
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

function numberValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(12, Math.round(value)))
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(12, Math.round(parsed)))
  }
  return fallback
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
