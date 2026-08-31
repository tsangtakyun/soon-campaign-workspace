export const CONTENT_DIRECTION_RULES = [
  { label: '美食', keywords: ['美食', '餐廳', '飲食', '咖啡', '甜品', '食物', '料理', 'food'] },
  { label: '寵物', keywords: ['寵物', '狗', '貓', '毛孩', 'pet'] },
  { label: '旅遊', keywords: ['旅遊', '旅行', '酒店', '景點', '行程', 'travel'] },
  { label: '美妝護膚', keywords: ['美妝', '護膚', '美容', '化妝', 'beauty'] },
  { label: '時尚穿搭', keywords: ['時尚', '時裝', '穿搭', '服飾', 'fashion'] },
  { label: '健康健身', keywords: ['健康', '健身', '運動', '瑜伽', 'wellness', 'fitness'] },
  { label: '親子家庭', keywords: ['親子', '育兒', '家庭', '媽媽', '小朋友'] },
  { label: '科技與 AI', keywords: ['科技', '人工智能', 'ai', '軟件', 'saas', 'tech'] },
  { label: '品牌與商業', keywords: ['品牌', '創業', '商業', '營銷', '行銷', 'marketing'] },
  { label: '影視娛樂', keywords: ['電影', '電視', '音樂', '藝人', '娛樂', '影視'] },
  { label: '城市熱話與文化', keywords: ['城市', '文化', '新聞', '熱話', '社會', '設計', '藝術'] },
  { label: '生活日常', keywords: ['生活', '日常', '陪伴', '幽默', '可愛', 'lifestyle'] },
] as const

export function normalizeContentDirections(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean))).slice(0, 12)
}

export function inferContentDirections(...values: unknown[]): string[] {
  const text = flattenText(values).toLowerCase()
  const matched = CONTENT_DIRECTION_RULES
    .filter((rule) => rule.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .map((rule) => rule.label)
  return matched.length ? matched.slice(0, 8) : ['生活日常']
}

export function topicRelevanceScore(
  topic: { title?: string; category?: string; tags?: string[]; note?: string; localities?: string[]; regions?: string[] },
  directions: string[]
) {
  if (!directions.length) return 0
  const topicText = [topic.title, topic.category, ...(topic.tags || []), topic.note, ...(topic.localities || []), ...(topic.regions || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return directions.reduce((score, direction) => {
    const rule = CONTENT_DIRECTION_RULES.find((item) => item.label === direction)
    const terms = [direction, ...(rule?.keywords || [])]
    return score + (terms.some((term) => topicText.includes(term.toLowerCase())) ? 1 : 0)
  }, 0)
}

function flattenText(values: unknown[]): string {
  return values.flatMap((value): string[] => {
    if (typeof value === 'string' || typeof value === 'number') return [String(value)]
    if (Array.isArray(value)) return [flattenText(value)]
    if (value && typeof value === 'object') return [flattenText(Object.values(value as Record<string, unknown>))]
    return []
  }).join(' ')
}
