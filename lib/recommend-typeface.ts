import { typefaceDirections, typefaces, type TypefaceDirection, type Typeface } from './typefaces'

export type TypefaceRecommendationInput = {
  profile?: {
    businessName?: string
    businessType?: string
    budget?: string
    elevatorPitch?: string
    websiteUrl?: string
    target_audience?: string
    content_persona?: string
    market_positioning?: string
    brandProfile?: { tone?: string; type?: string; audience?: string; position?: string; offer?: string }
    audience?: { summary?: string; ageRange?: string; locations?: string[] }
    contentPeople?: { ageRange?: string; gender?: string; ethnicity?: string }
    marketPositioning?: { primary?: string; secondary?: string; tertiary?: string }
  }
  strategy?: { id?: string; title?: string; titleZh?: string; description?: string; directionTitle?: string; reason?: string; funnelStage?: string; examples?: string[] }
  distribution?: { channels?: string[]; channelIds?: string[] }
  visualStyle?: { id?: string; name?: string; chineseName?: string; mood?: string; description?: string }
}

export type RankedDirection = TypefaceDirection & { score: number; recommended: boolean }
export type RankedTypeface = Typeface & { score: number; recommended: boolean }

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()))
}

function recommendationText(input: TypefaceRecommendationInput): string {
  return [
    input.profile?.businessName,
    input.profile?.businessType,
    input.profile?.budget,
    input.profile?.websiteUrl,
    input.profile?.elevatorPitch,
    input.profile?.target_audience,
    input.profile?.content_persona,
    input.profile?.market_positioning,
    input.profile?.brandProfile?.tone,
    input.profile?.brandProfile?.type,
    input.profile?.brandProfile?.audience,
    input.profile?.brandProfile?.position,
    input.profile?.brandProfile?.offer,
    input.profile?.audience?.summary,
    input.profile?.audience?.ageRange,
    ...(input.profile?.audience?.locations ?? []),
    input.profile?.contentPeople?.ageRange,
    input.profile?.contentPeople?.gender,
    input.profile?.contentPeople?.ethnicity,
    input.profile?.marketPositioning?.primary,
    input.profile?.marketPositioning?.secondary,
    input.profile?.marketPositioning?.tertiary,
    input.strategy?.id,
    input.strategy?.title,
    input.strategy?.titleZh,
    input.strategy?.description,
    input.strategy?.directionTitle,
    input.strategy?.reason,
    input.strategy?.funnelStage,
    ...(input.strategy?.examples ?? []),
    ...(input.distribution?.channels ?? []),
    ...(input.distribution?.channelIds ?? []),
    input.visualStyle?.id,
    input.visualStyle?.name,
    input.visualStyle?.chineseName,
    input.visualStyle?.mood,
    input.visualStyle?.description,
  ].filter(Boolean).join(' ')
}

export function recommendTypefaceDirection(input: TypefaceRecommendationInput): RankedDirection[] {
  const profileText = recommendationText(input)

  const scores = new Map<string, number>()
  typefaceDirections.forEach((d) => scores.set(d.id, 0))

  typefaceDirections.forEach((direction) => {
    direction.recommendedFor.forEach((keyword) => {
      if (includesAny(profileText, [keyword])) {
        scores.set(direction.id, (scores.get(direction.id) ?? 0) + 10)
      }
    })
  })

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
  if (includesAny(profileText, ['tech', 'saas', 'b2b', '科技', '專業', '醫療', '健康', '復康', '物理治療', '運動治療', '診所', 'clinical', 'health', 'rehab', 'physio'])) {
    scores.set('gothic', (scores.get('gothic') ?? 0) + 30)
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
  const profileText = recommendationText(input)

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
