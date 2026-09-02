import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'

export type ContentMoodOption = {
  id: string
  label: string
  image: string
  generationMood: string
}

export type ContentMoodSelection = {
  selectedMoods: Array<Pick<ContentMoodOption, 'id' | 'label' | 'generationMood'>>
  recommendationReason?: string
}

export const contentMoodOptions: ContentMoodOption[] = [
  { id: 'funny', label: '搞笑有趣', image: '/mood/mood-funny.jpg', generationMood: 'humorous, meme-style, playful, unexpected, makes people laugh and share' },
  { id: 'lifestyle', label: '真實日常', image: '/mood/mood-lifestyle.jpg', generationMood: 'authentic, candid, real moments, natural light, relatable, everyday life' },
  { id: 'cinematic', label: '廣告大片', image: '/mood/mood-cinematic.jpg', generationMood: 'high production value, cinematic lighting, dramatic, premium, editorial quality' },
  { id: 'educational', label: '教育資訊', image: '/mood/mood-educational.jpg', generationMood: 'informative, clean layout, infographic style, trustworthy, clear messaging' },
  { id: 'warm', label: '溫暖親切', image: '/mood/mood-warm.jpg', generationMood: 'warm tones, soft light, cozy, intimate, emotional connection, human touch' },
  { id: 'street', label: '潮流街頭', image: '/mood/mood-street.jpg', generationMood: 'urban, edgy, youth culture, bold, street photography style, high contrast' },
]

type RecommendationInput = {
  profile?: ContentStrategyProfile
  strategy?: ContentStrategyOption
  distribution?: unknown
  contentMix?: unknown
}

export function recommendContentMoods(input: RecommendationInput): ContentMoodSelection {
  const text = JSON.stringify(input).toLowerCase()
  const scores = new Map(contentMoodOptions.map((item) => [item.id, 0]))
  const add = (id: string, terms: string[], weight: number) => {
    const hits = terms.filter((term) => text.includes(term)).length
    scores.set(id, (scores.get(id) || 0) + hits * weight)
  }

  add('educational', ['health', 'medical', 'clinic', 'rehab', 'physio', '治療', '復康', '健康', '專業', '教育', '知識', 'authority', 'problem'], 4)
  add('lifestyle', ['service', 'local', 'daily', 'real', '日常', '生活', '本地', '服務', '團隊', 'behind', 'storytelling'], 3)
  add('warm', ['family', 'community', 'care', 'wellness', 'children', 'pet', '家庭', '關懷', '溫暖', '社群'], 3)
  add('cinematic', ['premium', 'luxury', 'editorial', 'campaign', '高端', '精品', '奢華', '大片'], 3)
  add('funny', ['meme', 'humor', 'funny', 'entertainment', '搞笑', '幽默', '娛樂'], 3)
  add('street', ['fashion', 'street', 'urban', 'youth', 'music', '潮流', '街頭', '時尚'], 3)

  if (input.profile?.businessType === 'services' || input.profile?.businessType === 'local') {
    scores.set('lifestyle', (scores.get('lifestyle') || 0) + 5)
  }
  if ((scores.get('educational') || 0) > 0) scores.set('educational', (scores.get('educational') || 0) + 4)

  const ranked = [...contentMoodOptions]
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
    .slice(0, 2)
  const selected = ranked[0] && (scores.get(ranked[0].id) || 0) > 0
    ? ranked
    : [contentMoodOptions[1], contentMoodOptions[4]]

  return {
    selectedMoods: selected.map(({ id, label, generationMood }) => ({ id, label, generationMood })),
    recommendationReason: buildReason(selected.map((item) => item.id), input.profile),
  }
}

export function normalizeContentMoodSelection(value: unknown): ContentMoodSelection {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const raw = Array.isArray(record.selectedMoods) ? record.selectedMoods : []
  const ids = raw
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'id' in item) return String((item as { id: unknown }).id)
      return ''
    })
    .filter(Boolean)
  const selectedMoods = contentMoodOptions
    .filter((option) => ids.includes(option.id))
    .slice(0, 2)
    .map(({ id, label, generationMood }) => ({ id, label, generationMood }))
  return {
    selectedMoods,
    recommendationReason: typeof record.recommendationReason === 'string' ? record.recommendationReason.trim() : '',
  }
}

function buildReason(ids: string[], profile?: ContentStrategyProfile) {
  const labels = ids.map((id) => contentMoodOptions.find((item) => item.id === id)?.label).filter(Boolean)
  const brand = profile?.businessName || '這個品牌'
  if (ids.includes('educational') && ids.includes('lifestyle')) {
    return `${brand}需要清楚建立專業可信度，同時以真實人物及日常情境降低距離感，因此建議結合「${labels.join('」與「')}」。`
  }
  return `${brand}的品牌定位及受眾較適合以「${labels.join('」與「')}」呈現，兼顧辨識度與內容親和力。`
}
