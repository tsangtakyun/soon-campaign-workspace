export type PreferenceEventRow = {
  id?: string
  event_type: string
  dimension: string
  value: string
  previous_value?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export type RankedPreference = {
  value: string
  label: string
  score: number
  evidenceCount: number
  approvedCount: number
  publishedCount: number
  performanceCount: number
}

export type ContentPreferenceSummary = {
  status: 'learning' | 'emerging' | 'established'
  statusLabel: string
  evidenceCount: number
  projectCount: number
  lastLearnedAt: string | null
  preferredFormats: RankedPreference[]
  preferredTemplates: RankedPreference[]
  preferredProductionMethods: RankedPreference[]
  activity: { copyEdits: number; designEdits: number; approvals: number; rejections: number; publications: number; performanceSamples: number }
  recommendations: string[]
}

const LABELS: Record<string, string> = {
  carousel: 'Carousel 多圖貼文',
  single_post: '單張 Feed 貼文',
  feed_post: '單張 Feed 貼文',
  short_video: '短片',
  creator_shoot: '真人拍攝',
  ai_video: 'AI 生成短片',
  no_template: '自訂設計',
  editorial_signal: 'Editorial Signal',
  product_focus: 'Product Focus',
  human_story: 'Human Story',
  bold_social: 'Bold Social',
}

const labelFor = (value: string) => LABELS[value] || value.replaceAll('_', ' ')
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

function outcomeWeight(event: PreferenceEventRow) {
  if (event.event_type === 'selected') return 1
  if (event.event_type === 'changed') return 1.25
  if (event.event_type === 'edited') return 0.5
  if (event.event_type === 'approved') return 3
  if (event.event_type === 'rejected') return -3
  if (event.event_type === 'published') return 4
  if (event.event_type !== 'performed') return 0

  const metadata = event.metadata || {}
  const impressions = number(metadata.impressions)
  const engagements = number(metadata.engagements)
  const clicks = number(metadata.clicks)
  const conversions = number(metadata.conversions)
  if (!impressions) return 1
  const engagementRate = engagements / impressions
  const clickRate = clicks / impressions
  return Math.min(8, 1 + engagementRate * 40 + clickRate * 80 + Math.min(conversions, 3))
}

function rank(events: PreferenceEventRow[], dimension: string, includeMetadataFormat = false) {
  const scores = new Map<string, RankedPreference>()
  const add = (value: string, event: PreferenceEventRow, multiplier = 1) => {
    if (!value) return
    const current = scores.get(value) || { value, label: labelFor(value), score: 0, evidenceCount: 0, approvedCount: 0, publishedCount: 0, performanceCount: 0 }
    current.score += outcomeWeight(event) * multiplier
    current.evidenceCount += 1
    if (event.event_type === 'approved') current.approvedCount += 1
    if (event.event_type === 'published') current.publishedCount += 1
    if (event.event_type === 'performed') current.performanceCount += 1
    scores.set(value, current)
  }

  events.forEach((event) => {
    if (event.dimension === dimension) add(event.value, event)
    if (includeMetadataFormat && ['approved', 'rejected', 'published', 'performed'].includes(event.event_type)) {
      const format = typeof event.metadata?.format === 'string' ? event.metadata.format : ''
      add(format, event)
    }
    if (event.event_type === 'changed' && event.dimension === dimension && event.previous_value) {
      const previous = scores.get(event.previous_value) || { value: event.previous_value, label: labelFor(event.previous_value), score: 0, evidenceCount: 0, approvedCount: 0, publishedCount: 0, performanceCount: 0 }
      previous.score -= 0.5
      scores.set(event.previous_value, previous)
    }
  })

  return [...scores.values()]
    .map((item) => ({ ...item, score: Math.round(item.score * 10) / 10 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.evidenceCount - a.evidenceCount)
    .slice(0, 3)
}

export function buildContentPreferenceSummary(events: PreferenceEventRow[]): ContentPreferenceSummary {
  const preferredFormats = rank(events, 'format', true)
  const preferredTemplates = rank(events, 'template')
  const preferredProductionMethods = rank(events, 'production_method')
  const activity = {
    copyEdits: events.filter((event) => event.dimension === 'copy' && event.event_type === 'edited').length,
    designEdits: events.filter((event) => event.dimension === 'design' && event.event_type === 'edited').length,
    approvals: events.filter((event) => event.event_type === 'approved').length,
    rejections: events.filter((event) => event.event_type === 'rejected').length,
    publications: events.filter((event) => event.event_type === 'published').length,
    performanceSamples: events.filter((event) => event.event_type === 'performed').length,
  }
  const outcomeEvidence = activity.approvals + activity.rejections + activity.publications + activity.performanceSamples
  const status = outcomeEvidence >= 10 && activity.performanceSamples >= 3 ? 'established' : outcomeEvidence >= 3 ? 'emerging' : 'learning'
  const recommendations: string[] = []
  if (preferredFormats[0] && preferredFormats[0].evidenceCount >= 2) recommendations.push(`優先建議 ${preferredFormats[0].label}`)
  if (preferredTemplates[0] && preferredTemplates[0].value !== 'no_template' && preferredTemplates[0].evidenceCount >= 2) recommendations.push(`優先排列「${preferredTemplates[0].label}」風格`)
  if (preferredProductionMethods[0] && preferredProductionMethods[0].evidenceCount >= 2) recommendations.push(`短片優先採用${preferredProductionMethods[0].label}`)
  if (activity.copyEdits >= 3) recommendations.push('文案曾多次修改，生成後預留快速校稿步驟')
  if (activity.designEdits >= 3) recommendations.push('設計曾多次調整，下一輪應先確認視覺方向')

  return {
    status,
    statusLabel: status === 'established' ? '偏好已建立' : status === 'emerging' ? '偏好逐漸清晰' : '正在學習',
    evidenceCount: events.length,
    projectCount: new Set(events.map((event) => event.id).filter(Boolean)).size,
    lastLearnedAt: events.map((event) => event.created_at).filter(Boolean).sort().at(-1) || null,
    preferredFormats,
    preferredTemplates,
    preferredProductionMethods,
    activity,
    recommendations,
  }
}
