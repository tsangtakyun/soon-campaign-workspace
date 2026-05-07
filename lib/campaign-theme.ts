import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'

export type CampaignThemeInput = {
  profile?: ContentStrategyProfile
  strategy?: ContentStrategyOption
  language?: string
}

export type CampaignTheme = {
  campaignName: string
  theme: string
  callToAction: string
  targetLink: string
}

export async function generateCampaignTheme(input: CampaignThemeInput): Promise<CampaignTheme> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const language = input.language || input.profile?.language || '繁體中文'
  const fallback = fallbackCampaignTheme(input)

  if (!apiKey) return fallback

  const systemPrompt = [
    'You are a senior campaign strategist for SOON, an AI marketing platform.',
    'Create the first campaign details after the user has confirmed a brand profile and selected a content strategy.',
    'Return only valid JSON. No markdown.',
    'All human-facing strings must use the requested language.',
    'For Traditional Chinese, use polished written Traditional Chinese suitable for a client-facing SaaS product.',
    'The campaign should be practical enough to direct social, video, newsletter, and ad content.',
    'The campaign name must feel like a real working campaign or content series title, not a vague slogan.',
    'Keep the campaign name concise, specific, and executable. It should include the concrete customer situation, product use case, content angle, or repeated format when possible.',
    'Avoid generic AI-sounding words such as: transformation, innovation, empowerment, elevation, exploration, aesthetics, journey, revolution, breakthrough, next generation, unlock, redefine, reimagine.',
    'For Traditional Chinese, also avoid vague terms like 美學、探索、革新、賦能、重塑、蛻變、突破、昇華、旅程、解鎖 unless the brand itself uses those words.',
    'Good campaign names look like: 5 秒日常記憶企劃, 朋友日常回憶 Campaign, 把生活變成影片日記, 每日一段回憶計劃.',
    'Bad campaign names look like: 生活美學探索, 記憶重現生活, 品牌革新之旅, 解鎖未來體驗.',
    'Theme can be 2-4 sentences.',
  ].join(' ')

  const userPrompt = [
    `Requested language: ${language}`,
    `Brand name: ${input.profile?.businessName || input.profile?.brandProfile?.type || '未提供'}`,
    `Website: ${input.profile?.websiteUrl || '未提供'}`,
    `Business type: ${input.profile?.businessType || '未提供'}`,
    `Elevator pitch: ${input.profile?.elevatorPitch || '未提供'}`,
    `Audience: ${input.profile?.audience?.summary || input.profile?.brandProfile?.audience || '未提供'}`,
    `Market positioning primary: ${input.profile?.marketPositioning?.primary || '未提供'}`,
    `Market positioning secondary: ${input.profile?.marketPositioning?.secondary || '未提供'}`,
    `Market positioning tertiary: ${input.profile?.marketPositioning?.tertiary || '未提供'}`,
    `Selected content strategy: ${input.strategy?.title || '未提供'} / ${input.strategy?.titleZh || ''}`,
    `Strategy description: ${input.strategy?.description || '未提供'}`,
    `Strategy reason: ${input.strategy?.reason || '未提供'}`,
    '',
    'Campaign name rules:',
    '- Do not write a brand slogan.',
    '- Do not write an abstract concept name.',
    '- Write a practical campaign/content-series name that the marketing team could use as a working title.',
    '- Prefer concrete nouns, audience behavior, usage scene, product benefit, or repeatable content format.',
    '- Maximum 14 Chinese characters or 6 English words unless a mixed Chinese-English title is clearly better.',
    '',
    'Return JSON with this exact shape:',
    JSON.stringify({
      campaignName: 'specific working campaign or content series name',
      theme: '2-4 sentence campaign theme and direction',
      callToAction: 'optional CTA sentence, empty string if not useful',
      targetLink: 'target URL if obvious from website, otherwise empty string',
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
        model: process.env.ANTHROPIC_CAMPAIGN_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1100,
        temperature: 0.35,
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

    return {
      campaignName: stringValue(parsed.campaignName, fallback.campaignName),
      theme: stringValue(parsed.theme, fallback.theme),
      callToAction: stringValue(parsed.callToAction, fallback.callToAction),
      targetLink: stringValue(parsed.targetLink, fallback.targetLink),
    }
  } catch {
    return fallback
  }
}

function fallbackCampaignTheme(input: CampaignThemeInput): CampaignTheme {
  const brandName = input.profile?.businessName || '你的品牌'
  const strategyName = input.strategy?.titleZh || input.strategy?.title || '內容策略'
  const website = input.profile?.websiteUrl || ''

  return {
    campaignName: `${brandName}｜${strategyName}內容企劃`,
    theme: `${brandName} 可以用「${strategyName}」作為第一個內容方向，將品牌定位、受眾痛點與實際使用情境連接起來。這個 campaign 會先建立清晰理解，再用具體場景推動受眾採取下一步行動。`,
    callToAction: '了解更多，開始與我們建立更清晰的品牌內容方向。',
    targetLink: website,
  }
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
