import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

type CampaignThemesRequestBody = {
  profile?: any
  strategy?: any
  campaign?: any
  contentMood?: {
    selectedMoods?: Array<{ generationMood?: string; label?: string }>
  }
  language?: string
  regenerateIndex?: number
  existingThemes?: Array<{ title?: string; body?: string }>
}

function stringValue(value: unknown, fallback = '未提供') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeLanguage(language?: string) {
  if (!language) return 'zh-TW'
  const lower = language.toLowerCase()
  if (lower.startsWith('en')) return 'en'
  if (lower.includes('zh') || language.includes('中文')) return 'zh-TW'
  return language
}

function parseThemeArray(text: string): Array<{ title: string; body: string }> {
  const trimmed = text.trim()

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return normalizeThemes(parsed)
  } catch {}

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(trimmed.slice(start, end + 1))
    if (Array.isArray(parsed)) return normalizeThemes(parsed)
  }

  throw new Error('Failed to parse campaign themes JSON array')
}

function normalizeThemes(items: any[]) {
  const themes = items
    .map((item) => ({
      title: stringValue(item?.title, ''),
      body: stringValue(item?.body, ''),
    }))
    .filter((item) => item.title && item.body)

  if (themes.length !== 4) {
    throw new Error(`Expected exactly 4 campaign themes, received ${themes.length}`)
  }

  return themes
}

function moodPreference(contentMood: CampaignThemesRequestBody['contentMood']) {
  const selectedMoods = Array.isArray(contentMood?.selectedMoods) ? contentMood.selectedMoods : []
  return selectedMoods
    .map((mood) => stringValue(mood?.generationMood || mood?.label, ''))
    .filter(Boolean)
    .join(', ')
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'campaign-themes', 30))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  try {
    const input = (await request.json()) as CampaignThemesRequestBody
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const language = normalizeLanguage(
      input.language ||
        input.profile?.primaryLanguage ||
        input.profile?.primary_language ||
        input.profile?.language
    )

    const systemPrompt =
      "You are a senior brand strategist specializing in Asian social media marketing. You create campaign themes that are specific, compelling, and directly relevant to the brand's context, audience, and goals. Never use generic themes. Always ground each theme in the brand's actual industry, tone, and campaign objectives."

    const contentMoodPreference = moodPreference(input.contentMood)

    const regenerateInstruction =
      typeof input.regenerateIndex === 'number'
        ? [
            '',
            `Regeneration note: Generate an alternative for campaign ${input.regenerateIndex}.`,
            'Still return exactly 4 objects. Keep the other campaign themes coherent with the new alternative.',
            input.existingThemes?.length
              ? `Existing themes to avoid repeating:\n${input.existingThemes
                  .map((theme, index) => `${index + 1}. ${theme.title} — ${theme.body}`)
                  .join('\n')}`
              : '',
          ].join('\n')
        : ''

    const userPrompt = [
      'Generate exactly 4 weekly campaign themes for the following brand:',
      '',
      `Brand name: ${stringValue(input.profile?.businessName || input.profile?.business_name)}`,
      `Industry: ${stringValue(input.profile?.businessType || input.profile?.business_type || input.profile?.brandProfile?.type)}`,
      `Brand description: ${stringValue(input.profile?.elevatorPitch || input.profile?.elevator_pitch || input.profile?.brandProfile?.offer)}`,
      `Target audience: ${stringValue(input.profile?.target_audience || input.profile?.audience?.summary || input.profile?.brandProfile?.audience)}`,
      `Brand tone: ${stringValue(input.profile?.brandProfile?.tone)}`,
      `Content strategy: ${stringValue(input.strategy?.titleZh || input.strategy?.title)} — ${stringValue(input.strategy?.reason)}`,
      `Campaign theme: ${stringValue(input.campaign?.theme)}`,
      `Campaign CTA: ${stringValue(input.campaign?.callToAction || input.campaign?.call_to_action)}`,
      '',
      `Content mood preference: ${contentMoodPreference || '未提供'}`,
      '',
      'The campaign themes should reflect this mood. For example:',
      "- If mood includes 'humorous' or 'playful': make the campaign titles and descriptions more witty, fun, and unexpected",
      "- If mood includes 'cinematic' or 'high production value': make themes more dramatic and visually ambitious",
      '- Blend the moods if multiple are selected',
      regenerateInstruction,
      '',
      'Each campaign theme should:',
      "- Be for one week, starting from today's date",
      '- Have a distinct angle or focus that is different from the other 3',
      '- Feel specific to THIS brand, not generic',
      `- Be written in ${language} (Traditional Chinese if zh-TW)`,
      `- Reflect the overall campaign direction: ${stringValue(input.campaign?.theme)}`,
      '',
      'Return ONLY a valid JSON array with exactly 4 objects, no other text:',
      JSON.stringify(
        [
          {
            title: 'Campaign title (max 15 words)',
            body: 'Campaign description (2-3 sentences explaining the theme, angle and content direction)',
          },
        ],
        null,
        2
      ),
    ].join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CAMPAIGN_MODEL),
        max_tokens: 1500,
        temperature: typeof input.regenerateIndex === 'number' ? 0.65 : 0.45,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[campaign-themes] anthropic request failed', {
        durationMs: Date.now() - startedAt,
        status: response.status,
      })
      throw new Error(data?.error?.message || 'Anthropic API request failed')
    }

    const text = Array.isArray(data.content)
      ? data.content
          .filter((item: { type?: string }) => item.type === 'text')
          .map((item: { text?: string }) => item.text || '')
          .join('\n')
          .trim()
      : ''

    const themes = parseThemeArray(text)
    console.info('[campaign-themes] generated', {
      durationMs: Date.now() - startedAt,
      themeCount: themes.length,
    })
    return NextResponse.json({ themes })
  } catch (error) {
    console.error('[campaign-themes] failed', {
      durationMs: Date.now() - startedAt,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Failed to generate campaign themes', detail: String(error) },
      { status: 500 }
    )
  }
}
