import visualStylePresets, { type VisualStylePreset } from './visual-styles'

export type VisualStyleRecommendationInput = {
  profile?: {
    businessName?: string
    businessType?: string
    budget?: string
    elevatorPitch?: string
    target_audience?: string
    content_persona?: string
    primary_language?: string
    market_positioning?: string
    audience?: { summary?: string; ageRange?: string; gender?: string }
    contentPeople?: { ageRange?: string; gender?: string; ethnicity?: string }
    brandProfile?: { tone?: string; offer?: string; type?: string; audience?: string; position?: string }
  }
  strategy?: {
    id?: string
    title?: string
    titleZh?: string
    funnelStage?: string
    reason?: string
  }
  distribution?: {
    channels?: string[]
    channelIds?: string[]
  }
  contentMix?: {
    items?: Array<{ id: string; quantity?: number }>
  }
}

export type RankedVisualStyle = VisualStylePreset & {
  score: number
  recommended: boolean
  reasons: string[]
}

// Visual attributes derived from actual image analysis (not ID name matching)
const STYLE_VISUAL_ATTRIBUTES: Record<string, {
  dominantTone: 'warm' | 'cool' | 'neutral' | 'neutral-warm' | 'neutral-dark'
  contrast: 'low' | 'low-mid' | 'mid' | 'mid-high' | 'high' | 'very-high'
  saturation: 'none' | 'muted' | 'muted-warm' | 'muted-natural' | 'vivid' | 'desaturated'
  brightness: 'very-low' | 'low' | 'mid' | 'mid-high' | 'high' | 'very-high'
  mood: string[]
  recommendedFor: string[]
  notSuitableFor: string[]
}> = {
  'natural-boost': {
    dominantTone: 'neutral-warm',
    contrast: 'low',
    saturation: 'muted',
    brightness: 'high',
    mood: ['clean', 'airy', 'minimal', 'calm'],
    recommendedFor: ['beauty', 'skincare', 'lifestyle', 'minimalist', 'personal brand', 'wellness'],
    notSuitableFor: ['tech', 'street culture', 'dark luxury', 'high energy']
  },
  'magic-hour': {
    dominantTone: 'warm',
    contrast: 'mid',
    saturation: 'vivid',
    brightness: 'mid-high',
    mood: ['romantic', 'nostalgic', 'warm', 'inviting'],
    recommendedFor: ['cafe', 'food', 'lifestyle', 'personal brand', 'travel', 'community', 'korean aesthetic'],
    notSuitableFor: ['tech', 'B2B', 'minimal cool', 'clinical']
  },
  'orange-and-blue': {
    dominantTone: 'warm',
    contrast: 'mid-high',
    saturation: 'vivid',
    brightness: 'mid',
    mood: ['cinematic', 'dramatic', 'warm'],
    recommendedFor: ['lifestyle', 'cafe', 'food', 'storytelling', 'personal brand'],
    notSuitableFor: ['tech', 'clinical', 'minimal']
  },
  'long-beach-morning': {
    dominantTone: 'warm',
    contrast: 'low',
    saturation: 'muted',
    brightness: 'very-high',
    mood: ['airy', 'optimistic', 'fresh', 'clean'],
    recommendedFor: ['wellness', 'beauty', 'lifestyle', 'morning routine', 'positive brand', 'team content'],
    notSuitableFor: ['dark premium', 'nightlife', 'tech', 'editorial noir']
  },
  'cold-chrome': {
    dominantTone: 'cool',
    contrast: 'mid-high',
    saturation: 'desaturated',
    brightness: 'mid',
    mood: ['futuristic', 'precise', 'modern', 'detached'],
    recommendedFor: ['tech', 'saas', 'B2B', 'finance', 'professional', 'product'],
    notSuitableFor: ['warm lifestyle', 'community', 'food', 'beauty warmth']
  },
  'blue-hour': {
    dominantTone: 'cool',
    contrast: 'mid-high',
    saturation: 'muted',
    brightness: 'very-low',
    mood: ['brooding', 'atmospheric', 'intimate', 'evening'],
    recommendedFor: ['luxury', 'premium F&B', 'nightlife', 'high-end lifestyle', 'creative agency'],
    notSuitableFor: ['cheerful lifestyle', 'wellness', 'bright community', 'morning brand']
  },
  'blue-architecture': {
    dominantTone: 'cool',
    contrast: 'mid-high',
    saturation: 'desaturated',
    brightness: 'mid',
    mood: ['futuristic', 'precise', 'urban', 'modern'],
    recommendedFor: ['tech', 'saas', 'B2B', 'finance', 'professional service', 'corporate'],
    notSuitableFor: ['warm lifestyle', 'food', 'community', 'beauty']
  },
  'lush-green': {
    dominantTone: 'neutral',
    contrast: 'low-mid',
    saturation: 'muted-natural',
    brightness: 'mid-high',
    mood: ['fresh', 'organic', 'calm', 'natural'],
    recommendedFor: ['organic', 'wellness', 'sustainability', 'botanical', 'food', 'cafe', 'health brand'],
    notSuitableFor: ['tech', 'dark luxury', 'street culture', 'high saturation promo']
  },
  'crisp-autumn': {
    dominantTone: 'warm',
    contrast: 'mid',
    saturation: 'vivid',
    brightness: 'mid-high',
    mood: ['nostalgic', 'cozy', 'seasonal', 'cheerful'],
    recommendedFor: ['lifestyle', 'cafe', 'food', 'seasonal campaign', 'community', 'travel'],
    notSuitableFor: ['tech', 'cool premium', 'minimal monochrome']
  },
  'hard-boost': {
    dominantTone: 'warm',
    contrast: 'high',
    saturation: 'vivid',
    brightness: 'high',
    mood: ['energetic', 'bold', 'vibrant', 'urban'],
    recommendedFor: ['street food', 'youth brand', 'gen z', 'retail', 'entertainment', 'promotion'],
    notSuitableFor: ['minimal', 'luxury editorial', 'calm wellness', 'corporate']
  },
  'dark-and-somber': {
    dominantTone: 'neutral-dark',
    contrast: 'high',
    saturation: 'desaturated',
    brightness: 'very-low',
    mood: ['brooding', 'editorial', 'moody', 'dramatic'],
    recommendedFor: ['luxury', 'high-end editorial', 'premium F&B', 'creative agency', 'dark lifestyle'],
    notSuitableFor: ['cheerful lifestyle', 'wellness', 'family', 'bright community']
  },
  'soft-black-and-white': {
    dominantTone: 'neutral',
    contrast: 'mid',
    saturation: 'none',
    brightness: 'mid-high',
    mood: ['timeless', 'elegant', 'clean', 'editorial'],
    recommendedFor: ['premium brand', 'editorial', 'personal brand', 'B2B', 'professional service', 'mature audience'],
    notSuitableFor: ['food colour', 'youth street', 'warm lifestyle', 'seasonal']
  },
  'waves': {
    dominantTone: 'warm',
    contrast: 'mid',
    saturation: 'muted-warm',
    brightness: 'mid-high',
    mood: ['nostalgic', 'retro', 'intimate', 'warm'],
    recommendedFor: ['lifestyle', 'cafe', 'personal brand', 'vintage brand', 'community', 'storytelling'],
    notSuitableFor: ['tech', 'clinical', 'cool premium', 'corporate B2B']
  },
  'japanese-film': {
    dominantTone: 'warm',
    contrast: 'low',
    saturation: 'muted',
    brightness: 'mid',
    mood: ['nostalgic', 'intimate', 'analog', 'quiet'],
    recommendedFor: ['personal brand', 'lifestyle', 'cafe', 'founder story', 'community', 'instagram', 'xiaohongshu'],
    notSuitableFor: ['tech', 'corporate', 'high-contrast promotion', 'clinical']
  },
  'korean-drama': {
    dominantTone: 'neutral',
    contrast: 'low',
    saturation: 'muted',
    brightness: 'mid-high',
    mood: ['clean', 'calm', 'understated', 'soft'],
    recommendedFor: ['beauty', 'skincare', 'lifestyle', 'instagram', 'xiaohongshu', 'wellness', 'personal brand'],
    notSuitableFor: ['high energy', 'street culture', 'dark editorial', 'tech']
  }
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k.toLowerCase()))
}

function styleMatchesCategory(styleId: string, category: string): boolean {
  const attrs = STYLE_VISUAL_ATTRIBUTES[styleId]
  if (!attrs) return false
  return attrs.recommendedFor.some((r) => r.includes(category.toLowerCase()))
}

function styleNotSuitableFor(styleId: string, category: string): boolean {
  const attrs = STYLE_VISUAL_ATTRIBUTES[styleId]
  if (!attrs) return false
  return attrs.notSuitableFor.some((r) => r.includes(category.toLowerCase()))
}

export function recommendVisualStyles(input: VisualStyleRecommendationInput): RankedVisualStyle[] {
  const scores = new Map<string, { score: number; reasons: string[] }>()
  const styleIds = Object.keys(STYLE_VISUAL_ATTRIBUTES)
  styleIds.forEach((id) => scores.set(id, { score: 0, reasons: [] }))

  const add = (id: string, points: number, reason: string) => {
    const current = scores.get(id)
    if (!current) return
    current.score += points
    current.reasons.push(reason)
  }

  const penalize = (id: string, points: number) => {
    const current = scores.get(id)
    if (!current) return
    current.score -= points
  }

  // Flatten all profile text for keyword matching
  const profileText = [
    input.profile?.businessName,
    input.profile?.businessType,
    input.profile?.elevatorPitch,
    input.profile?.target_audience,
    input.profile?.content_persona,
    input.profile?.market_positioning,
    input.profile?.audience?.summary,
    input.profile?.audience?.ageRange,
    input.profile?.brandProfile?.tone,
    input.profile?.brandProfile?.offer,
    input.profile?.brandProfile?.type,
    input.profile?.brandProfile?.audience,
    input.profile?.brandProfile?.position,
  ].filter(Boolean).join(' ').toLowerCase()

  const strategyText = [
    input.strategy?.id,
    input.strategy?.title,
    input.strategy?.funnelStage,
    input.strategy?.reason,
  ].filter(Boolean).join(' ').toLowerCase()

  const channels = [
    ...(input.distribution?.channels ?? []),
    ...(input.distribution?.channelIds ?? []),
  ].map((c) => c.toLowerCase())

  const contentTypes = (input.contentMix?.items ?? [])
    .filter((item) => (item.quantity ?? 0) > 0)
    .map((item) => item.id.toLowerCase())

  // --- LAYER 1: Industry / Brand Type ---
  // Warm lifestyle brands -> warm tone, muted-vivid saturation styles
  if (includesAny(profileText, ['beauty', 'skincare', 'wellness', 'lifestyle', '美容', '護膚', '生活'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['warm', 'neutral-warm', 'neutral'].includes(a.dominantTone) && ['muted', 'muted-warm', 'muted-natural'].includes(a.saturation)) {
        add(id, 16, '品牌調性與柔和暖調視覺匹配')
      }
    })
    penalize('cold-chrome', 12)
    penalize('blue-architecture', 12)
    penalize('dark-and-somber', 10)
  }

  if (includesAny(profileText, ['cafe', 'coffee', 'restaurant', 'food', '餐飲', '咖啡', '餐廳'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.dominantTone === 'warm' && ['mid', 'mid-high', 'high'].includes(a.brightness)) {
        add(id, 16, '暖調高亮度最適合餐飲食物視覺')
      }
    })
    penalize('soft-black-and-white', 8)
    penalize('cold-chrome', 12)
    penalize('blue-architecture', 12)
  }

  if (includesAny(profileText, ['tech', 'saas', 'finance', 'b2b', 'professional', '科技', '專業', '金融'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.dominantTone === 'cool' || a.saturation === 'desaturated') {
        add(id, 18, '冷調去飽和視覺符合科技專業品牌')
      }
    })
    penalize('magic-hour', 10)
    penalize('crisp-autumn', 10)
    penalize('waves', 8)
    penalize('japanese-film', 8)
  }

  if (includesAny(profileText, ['organic', 'sustainable', 'natural', 'botanical', 'health', '有機', '自然', '健康'])) {
    add('lush-green', 20, '自然綠調直接匹配有機健康品牌視覺')
    add('natural-boost', 14, '清透自然光符合有機品牌調性')
    add('korean-drama', 10, '柔和清冷感與自然健康調性相符')
    penalize('hard-boost', 10)
    penalize('dark-and-somber', 12)
  }

  if (includesAny(profileText, ['premium', 'luxury', 'high-end', '高端', '奢華', '精品'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['brooding', 'editorial', 'timeless', 'elegant'].some(m => a.mood.includes(m))) {
        add(id, 16, '沉穩 editorial 視覺符合高端定位')
      }
    })
    penalize('hard-boost', 14)
    penalize('crisp-autumn', 8)
  }

  if (includesAny(profileText, ['gen z', 'youth', 'young', '年輕', '潮流', '學生'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['energetic', 'bold', 'vibrant', 'urban'].some(m => a.mood.includes(m))) {
        add(id, 18, '高能量視覺適合年輕受眾')
      }
      if (a.mood.includes('nostalgic') && a.saturation === 'muted-warm') {
        add(id, 10, 'Lo-Fi 復古感在年輕社群受歡迎')
      }
    })
    penalize('soft-black-and-white', 8)
    penalize('cold-chrome', 6)
  }

  // --- LAYER 2: Brand Tone ---
  if (includesAny(profileText, ['warm', 'friendly', 'community', '溫暖', '親切', '社群'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.dominantTone === 'warm' && a.mood.includes('intimate') || a.mood.includes('inviting')) {
        add(id, 12, '暖調親和視覺符合社群品牌語氣')
      }
    })
  }

  if (includesAny(profileText, ['minimal', 'clean', 'calm', '簡潔', '乾淨', '低調'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.contrast === 'low' || a.contrast === 'low-mid') {
        add(id, 12, '低對比視覺符合簡潔品牌調性')
      }
    })
    penalize('hard-boost', 12)
    penalize('orange-and-blue', 8)
  }

  if (includesAny(profileText, ['founder', 'personal', '老闆本人', 'individual'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.mood.includes('intimate') || a.mood.includes('analog') || a.mood.includes('nostalgic')) {
        add(id, 14, '個人品牌適合親密感、真實感強的視覺')
      }
    })
  }

  // --- LAYER 3: Strategy ---
  if (includesAny(strategyText, ['lifestyle', 'community', 'storytelling', 'behind-the-scenes', 'social-proof'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.mood.some(m => ['warm', 'intimate', 'nostalgic', 'inviting', 'analog'].includes(m))) {
        add(id, 10, '配合生活、社群、故事型內容策略')
      }
    })
  }

  if (includesAny(strategyText, ['authority', 'education', 'product', 'professional'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.dominantTone === 'cool' || a.mood.includes('precise') || a.mood.includes('clean')) {
        add(id, 10, '清晰精準視覺符合教育、產品、專業內容')
      }
    })
  }

  if (includesAny(strategyText, ['promotion', 'offer', 'entertainment', 'trend'])) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['energetic', 'bold', 'vibrant', 'dramatic'].some(m => a.mood.includes(m))) {
        add(id, 10, '高能量視覺適合促銷、趨勢、娛樂內容')
      }
    })
  }

  // --- LAYER 4: Channels ---
  if (channels.some(c => ['instagram-feed', 'instagram', 'rednote-feed', 'xiaohongshu'].includes(c))) {
    styleIds.forEach((id) => {
      if (styleMatchesCategory(id, 'instagram') || styleMatchesCategory(id, 'xiaohongshu')) {
        add(id, 10, '視覺屬性適合 Instagram / 小紅書平台')
      }
    })
  }

  if (channels.some(c => c.includes('reels') || c.includes('tiktok') || c.includes('shorts'))) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['energetic', 'bold', 'vibrant'].some(m => a.mood.includes(m)) || a.contrast === 'high') {
        add(id, 10, '高對比高能量視覺適合短片平台')
      }
    })
  }

  if (channels.some(c => c.includes('facebook') || c.includes('newsletter'))) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (['clean', 'airy', 'timeless', 'elegant'].some(m => a.mood.includes(m))) {
        add(id, 8, '清晰穩定視覺適合 Facebook 和 Newsletter')
      }
    })
  }

  // --- LAYER 5: Content Mix ---
  if (contentTypes.includes('still-images') || contentTypes.includes('carousels')) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.contrast === 'low' || a.contrast === 'low-mid') {
        add(id, 8, '低對比視覺在靜態圖和輪播中更耐看')
      }
    })
  }

  if (contentTypes.includes('feed-videos') || contentTypes.includes('short-form-video')) {
    styleIds.forEach((id) => {
      const a = STYLE_VISUAL_ATTRIBUTES[id]
      if (a.contrast === 'high' || a.contrast === 'mid-high') {
        add(id, 8, '高對比視覺在影片中有更強第一眼吸引力')
      }
    })
  }

  // --- Final sort and mark top 3 ---
  return visualStylePresets
    .map((style) => {
      const scored = scores.get(style.id) ?? { score: 0, reasons: [] }
      return {
        ...style,
        score: scored.score,
        recommended: false,
        reasons: scored.reasons.slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)
    .map((style, index) => ({
      ...style,
      recommended: index < 3,
    }))
}
