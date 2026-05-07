import {
  defaultContentStrategyLibrary,
  normalizeContentStrategyLibrary,
  type ContentStrategyLibraryItem,
} from '@/lib/content-strategy-library'
import type { StrategyLibraryState } from '@/lib/strategy-library'

export type ContentStrategyProfile = {
  websiteUrl?: string
  language?: string
  businessName?: string
  businessType?: 'services' | 'local' | 'products'
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
  const model = process.env.ANTHROPIC_STRATEGY_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  const catalog = strategyCatalog(contentStrategies)

  if (!apiKey) {
    return fallbackStrategy(catalog)
  }

  const systemPrompt = [
    'You are a senior content strategist for SOON, an AI marketing platform.',
    'Recommend one content strategy for a new customer after their website and brand profile have been analyzed.',
    'Return only valid JSON. No markdown.',
    'All human-facing strings must use the requested language.',
    'For Traditional Chinese, use polished written Traditional Chinese suitable for a client-facing SaaS product.',
    'Choose from the provided public content strategy library only. Do not invent, rename, merge, or translate strategy names.',
    'Use the internal SOON strategy-library rules only as decision context.',
    'The recommended option should be the strongest first content pillar for this specific business.',
  ].join(' ')

  const libraryContext = library ? summarizeLibrary(library) : 'No internal strategy library provided.'
  const allowedIds = catalog.map((item) => item.id).join(' | ')

  const userPrompt = [
    `Requested language: ${language}`,
    `Brand name: ${profile.businessName || '未提供'}`,
    `Website: ${profile.websiteUrl || '未提供'}`,
    `Business type: ${profile.businessType || '未提供'}`,
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
      reason: 'one sentence explaining why this fixed strategy is recommended for this brand',
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
        max_tokens: 900,
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
    const reason = stringValue(parsed.reason, catalog.find((item) => item.id === recommendedId)?.reason || '')

    return buildRecommendation(recommendedId, catalog, reason, 'anthropic', model)
  } catch {
    return fallbackStrategy(catalog)
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
  }))
}

function buildRecommendation(
  recommendedId: string,
  catalog: ReturnType<typeof strategyCatalog>,
  reason: string,
  provider: 'anthropic' | 'fallback',
  model: string
): ContentStrategyRecommendation {
  const recommended = catalog.find((item) => item.id === recommendedId) || catalog[0]
  const alternatives = catalog
    .filter((item) => item.id !== recommended.id)
    .slice(0, 3)

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

function fallbackStrategy(catalog: ReturnType<typeof strategyCatalog>): ContentStrategyRecommendation {
  return buildRecommendation('lifestyle-content', catalog, '', 'fallback', 'fallback')
}

function normalizeStrategyId(value: unknown, catalog: ReturnType<typeof strategyCatalog>) {
  const id = stringValue(value, 'lifestyle-content').toLowerCase()
  return catalog.some((item) => item.id === id) ? id : catalog[0]?.id || 'lifestyle-content'
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
