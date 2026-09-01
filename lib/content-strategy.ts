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
    return fallbackStrategy(catalog)
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
    const tailoredOptions = normalizeTailoredOptions(parsed.options, catalog)

    return buildRecommendation(recommendedId, catalog, reason, 'anthropic', model, tailoredOptions)
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
