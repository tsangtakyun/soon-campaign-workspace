import { typefaceDirections, typefaces, type TypefaceDirection, type Typeface } from './typefaces'

export type TypefaceRecommendationInput = {
  profile?: {
    businessType?: string
    elevatorPitch?: string
    target_audience?: string
    content_persona?: string
    market_positioning?: string
    brandProfile?: { tone?: string; type?: string; audience?: string; position?: string }
    audience?: { summary?: string; ageRange?: string }
  }
  strategy?: { id?: string; funnelStage?: string }
  distribution?: { channels?: string[] }
}

export type RankedDirection = TypefaceDirection & { score: number; recommended: boolean }
export type RankedTypeface = Typeface & { score: number; recommended: boolean }

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()))
}

export function recommendTypefaceDirection(input: TypefaceRecommendationInput): RankedDirection[] {
  const profileText = [
    input.profile?.businessType,
    input.profile?.elevatorPitch,
    input.profile?.target_audience,
    input.profile?.content_persona,
    input.profile?.market_positioning,
    input.profile?.brandProfile?.tone,
    input.profile?.brandProfile?.type,
    input.profile?.brandProfile?.audience,
    input.profile?.brandProfile?.position,
    input.profile?.audience?.summary,
    input.profile?.audience?.ageRange,
    input.strategy?.id,
    input.strategy?.funnelStage,
    ...(input.distribution?.channels ?? []),
  ].filter(Boolean).join(' ')

  const scores = new Map<string, number>()
  typefaceDirections.forEach((d) => scores.set(d.id, 0))

  typefaceDirections.forEach((direction) => {
    direction.recommendedFor.forEach((keyword) => {
      if (includesAny(profileText, [keyword])) {
        scores.set(direction.id, (scores.get(direction.id) ?? 0) + 10)
      }
    })
  })

  // Additional rules based on visual style already chosen
  // (read from sessionStorage inside the component, pass as optional field if needed)

  // Hard boosts for specific brand signals
  if (includesAny(profileText, ['youtube', 'thumbnail', '短片封面', 'viral', '爆款'])) {
    scores.set('impact', (scores.get('impact') ?? 0) + 20)
  }
  if (includesAny(profileText, ['founder', 'personal', '老闆本人', '個人品牌'])) {
    scores.set('handwriting', (scores.get('handwriting') ?? 0) + 20)
  }
  if (includesAny(profileText, ['luxury', 'premium', '高端', '精品', '奢華'])) {
    scores.set('editorial', (scores.get('editorial') ?? 0) + 20)
  }
  if (includesAny(profileText, ['tech', 'saas', 'b2b', '科技', '專業'])) {
    scores.set('gothic', (scores.get('gothic') ?? 0) + 20)
  }
  if (includesAny(profileText, ['餐飲', 'cafe', 'food', '親子', '可愛'])) {
    scores.set('rounded', (scores.get('rounded') ?? 0) + 20)
  }
  if (includesAny(profileText, ['促銷', 'promotion', 'campaign', '活動', '海報'])) {
    scores.set('poster', (scores.get('poster') ?? 0) + 20)
  }

  // Fallback
  const allZero = [...scores.values()].every((s) => s === 0)
  if (allZero) scores.set('rounded', 10)

  return typefaceDirections
    .map((d) => ({ ...d, score: scores.get(d.id) ?? 0, recommended: false }))
    .sort((a, b) => b.score - a.score)
    .map((d, i) => ({ ...d, recommended: i === 0 }))
}

export function recommendTypefacesInDirection(
  directionId: string,
  input: TypefaceRecommendationInput
): RankedTypeface[] {
  const profileText = [
    input.profile?.businessType,
    input.profile?.elevatorPitch,
    input.profile?.target_audience,
    input.profile?.content_persona,
    input.profile?.market_positioning,
    input.profile?.brandProfile?.tone,
    input.profile?.brandProfile?.type,
    input.profile?.brandProfile?.audience,
    input.profile?.brandProfile?.position,
    input.profile?.audience?.summary,
    input.strategy?.id,
    ...(input.distribution?.channels ?? []),
  ].filter(Boolean).join(' ')

  const directionTypefaces = typefaces.filter((t) => t.directionId === directionId)
  const scores = new Map<string, number>()
  directionTypefaces.forEach((t) => scores.set(t.id, 0))

  directionTypefaces.forEach((typeface) => {
    typeface.recommendedFor.forEach((keyword) => {
      if (includesAny(profileText, [keyword])) {
        scores.set(typeface.id, (scores.get(typeface.id) ?? 0) + 10)
      }
    })
  })

  // Fallback
  const allZero = [...scores.values()].every((s) => s === 0)
  if (allZero && directionTypefaces[0]) {
    scores.set(directionTypefaces[0].id, 10)
  }

  return directionTypefaces
    .map((t) => ({ ...t, score: scores.get(t.id) ?? 0, recommended: false }))
    .sort((a, b) => b.score - a.score)
    .map((t, i) => ({ ...t, recommended: i === 0 }))
}
