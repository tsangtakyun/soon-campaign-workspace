export type FunnelStage = 'top' | 'middle' | 'bottom'

export type ContentStrategyLibraryItem = {
  id: string
  name: string
  nameZh: string
  emoji: string
  description: string
  purpose: string
  imageUrl: string
  examples: string[]
  funnelStage: FunnelStage
  fitFor: string
  priority: number
  isActive: boolean
}

export function normalizeContentStrategyLibrary(value: unknown): ContentStrategyLibraryItem[] {
  const source = Array.isArray(value) ? value : defaultContentStrategyLibrary
  const normalized = source
    .map((item: any, index) => ({
      id: stringValue(item?.id, `content_strategy_${index + 1}`),
      name: stringValue(item?.name, 'Content Strategy'),
      nameZh: stringValue(item?.nameZh, chineseNameForStrategy(stringValue(item?.id, `content_strategy_${index + 1}`))),
      emoji: stringValue(item?.emoji, '✨').slice(0, 4),
      description: stringValue(item?.description, ''),
      purpose: stringValue(item?.purpose, ''),
      imageUrl: stringValue(item?.imageUrl, imageForStrategy(stringValue(item?.id, `content_strategy_${index + 1}`))),
      examples: Array.isArray(item?.examples) ? item.examples.map(String).filter(Boolean) : [],
      funnelStage: normalizeFunnelStage(item?.funnelStage),
      fitFor: stringValue(item?.fitFor, ''),
      priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : index + 1,
      isActive: typeof item?.isActive === 'boolean' ? item.isActive : true,
    }))
    .filter((item) => item.id && item.name && item.isActive)
    .sort((a, b) => a.priority - b.priority)

  return normalized.length ? normalized : defaultContentStrategyLibrary
}

export const defaultContentStrategyLibrary: ContentStrategyLibraryItem[] = [
  {
    id: 'lifestyle-content',
    name: 'Lifestyle Content',
    nameZh: '生活方式內容',
    emoji: '🎿',
    description: '把產品或服務放入客戶的理想生活與日常場景中。',
    purpose: '令受眾想像自己正在使用你的品牌。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/lifestyle-content.jpg',
    examples: ['生活場景', 'aspiration', '日常使用'],
    funnelStage: 'middle',
    fitFor: '需要建立品牌感覺、生活方式聯想或產品使用情境的品牌。',
    priority: 10,
    isActive: true,
  },
  {
    id: 'offer-promotion',
    name: 'Offer & Promotion',
    nameZh: '優惠與推廣',
    emoji: '🛍️',
    description: '突出優惠、折扣、套裝或限時活動。',
    purpose: '推動受眾即時行動。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/offer-promotion.jpg',
    examples: ['限時優惠', '套裝', '折扣', '新客 offer'],
    funnelStage: 'bottom',
    fitFor: '有清晰 CTA、優惠、booking、DM 或落單路徑的 campaign。',
    priority: 20,
    isActive: true,
  },
  {
    id: 'product-education',
    name: 'Product Education',
    nameZh: '產品教育',
    emoji: '😎',
    description: '拆解產品或服務的功能、材料、設計選擇與專業價值。',
    purpose: '令客戶理解你的價值，降低比較成本。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/product-education.jpg',
    examples: ['功能拆解', '材料', '流程', '教學'],
    funnelStage: 'bottom',
    fitFor: '產品或服務需要解釋、客戶需要理解後才會購買的品牌。',
    priority: 30,
    isActive: true,
  },
  {
    id: 'problem-solution',
    name: 'Problem / Solution',
    nameZh: '問題 / 解決方案',
    emoji: '🧰',
    description: '先指出受眾常見痛點，再展示你的品牌如何解決問題。',
    purpose: '把品牌價值直接連接到客戶需求。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/problem-solution.jpg',
    examples: ['痛點', 'before/after', '解決方案'],
    funnelStage: 'bottom',
    fitFor: '有明確痛點、服務解法或轉化目標的 campaign。',
    priority: 40,
    isActive: true,
  },
  {
    id: 'entertainment-content',
    name: 'Entertainment Content',
    nameZh: '娛樂內容',
    emoji: '🎭',
    description: '用搞笑、誇張反應、meme 或 trend format 吸引注意。',
    purpose: '爆 views，拉新 audience。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/entertainment-content.jpg',
    examples: ['搞笑', '誇張 reaction', 'meme', 'trend'],
    funnelStage: 'top',
    fitFor: '需要先打開 reach、令陌生受眾停低觀看的內容。',
    priority: 50,
    isActive: true,
  },
  {
    id: 'authority-content',
    name: 'Authority Content',
    nameZh: '建立權威',
    emoji: '🧠',
    description: '用深度分析、行內 insight 或事件拆解建立可信度。',
    purpose: '建立信任與影響力。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/authority-content.jpg',
    examples: ['深度分析', '行內 insight', '事件拆解'],
    funnelStage: 'middle',
    fitFor: '需要成為可信 source、建立專業感或思想領導的品牌。',
    priority: 60,
    isActive: true,
  },
  {
    id: 'opinion-hot-take',
    name: 'Opinion / Hot Take',
    nameZh: '立場內容',
    emoji: '🔥',
    description: '清楚表達支持、反對或具爭議的 sharp angle。',
    purpose: '引發留言、討論與立場互動。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/opinion-hot-take.jpg',
    examples: ['controversial', '支持 / 反對', 'sharp angle'],
    funnelStage: 'top',
    fitFor: '適合有明確觀點、需要討論度或想快速累積聲量的人設型內容。',
    priority: 70,
    isActive: true,
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    nameZh: '故事內容',
    emoji: '📖',
    description: '用個人經歷、幕後故事或案例，令資訊更容易被記住。',
    purpose: '建立情感連結。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/storytelling.jpg',
    examples: ['個人經歷', 'behind the scene', 'case study'],
    funnelStage: 'middle',
    fitFor: '需要令品牌更有人味、把抽象價值變成故事的內容。',
    priority: 80,
    isActive: true,
  },
  {
    id: 'behind-the-scenes',
    name: 'Behind the Scenes',
    nameZh: '幕後內容',
    emoji: '🎬',
    description: '展示製作過程、構思方法、失誤、NG 或真實工作面。',
    purpose: '增加真實感與親切感。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/behind-the-scenes.jpg',
    examples: ['點拍', '點諗 idea', '出事', 'NG'],
    funnelStage: 'middle',
    fitFor: '適合需要透明度、親近感或 creator-led 信任的品牌。',
    priority: 90,
    isActive: true,
  },
  {
    id: 'social-proof',
    name: 'Social Proof',
    nameZh: '信任證據',
    emoji: '✅',
    description: '用成績、客戶 feedback、成功案例證明有人相信你。',
    purpose: '降低信任成本。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/social-proof.jpg',
    examples: ['views', 'revenue', '客戶 feedback', '成功案例'],
    funnelStage: 'bottom',
    fitFor: '適合已有結果、評價、案例或第三方可信訊號的品牌。',
    priority: 100,
    isActive: true,
  },
  {
    id: 'community-content',
    name: 'Community Content',
    nameZh: '互動內容',
    emoji: '💬',
    description: '透過問題、投票、回留言，讓 audience 參與內容。',
    purpose: '提高 engagement，增加 algorithm 互動訊號。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/community-content.jpg',
    examples: ['問問題', '投票', '回留言'],
    funnelStage: 'top',
    fitFor: '適合已有初步 audience，想提升互動與回訪的帳號。',
    priority: 110,
    isActive: true,
  },
  {
    id: 'trend-hijacking',
    name: 'Trend Hijacking',
    nameZh: '借勢內容',
    emoji: '⚡',
    description: '借熱門話題或 trend format，快速連接當下注意力。',
    purpose: '快速曝光。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/trend-hijacking.jpg',
    examples: ['熱門話題', 'trend format', '改編 trend'],
    funnelStage: 'top',
    fitFor: '適合反應快、內容團隊能追熱點、品牌語氣容許靈活表達的情況。',
    priority: 120,
    isActive: true,
  },
  {
    id: 'personal-brand-content',
    name: 'Personal Brand Content',
    nameZh: '個人品牌內容',
    emoji: '👤',
    description: '展示價值觀、生活態度、習慣與做人方式。',
    purpose: '令人 follow 你，而不只是 follow 內容。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/personal-brand-content.jpg',
    examples: ['價值觀', '生活態度', '日常習慣'],
    funnelStage: 'middle',
    fitFor: '適合 founder-led、creator-led、顧問、教學或需要人設信任的品牌。',
    priority: 130,
    isActive: true,
  },
  {
    id: 'call-to-action-content',
    name: 'Call to Action Content',
    nameZh: '行動引導內容',
    emoji: '👉',
    description: '明確叫受眾 follow、comment、click link、DM 或預約。',
    purpose: '推動轉化與下一步行動。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/call-to-action-content.jpg',
    examples: ['follow', 'comment', 'click link', 'DM'],
    funnelStage: 'bottom',
    fitFor: '適合已有信任基礎、需要把內容流量導向實際行動的 campaign。',
    priority: 140,
    isActive: true,
  },
  {
    id: 'contrarian-content',
    name: 'Contrarian Content',
    nameZh: '反主流內容',
    emoji: '🔄',
    description: '打破「大家都以為係咁」的迷思，提出反主流觀點。',
    purpose: '製造高吸引力與認知反差。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/contrarian-content.jpg',
    examples: ['打破迷思', '顛覆認知', '其實唔係'],
    funnelStage: 'top',
    fitFor: '適合有獨特觀點、需要拉高 hook retention 或做思想差異化的內容。',
    priority: 150,
    isActive: true,
  },
  {
    id: 'series-content',
    name: 'Series Content',
    nameZh: '連載內容',
    emoji: '🔁',
    description: '用 part 1 / part 2 或 recurring format 令觀眾持續追看。',
    purpose: '提高 retention 與回訪。',
    imageUrl: 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/series-content.jpg',
    examples: ['part 1 / part 2', '固定欄目', 'recurring format'],
    funnelStage: 'middle',
    fitFor: '適合能持續產出同一主題、想建立內容資產與觀眾期待的品牌。',
    priority: 160,
    isActive: true,
  },
]

function normalizeFunnelStage(value: unknown): FunnelStage {
  return value === 'top' || value === 'middle' || value === 'bottom' ? value : 'middle'
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function imageForStrategy(id: string) {
  const item = defaultContentStrategyLibrary.find((strategy) => strategy.id === id)
  return item?.imageUrl || 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/lifestyle-content.jpg'
}

function chineseNameForStrategy(id: string) {
  const item = defaultContentStrategyLibrary.find((strategy) => strategy.id === id)
  return item?.nameZh || '內容策略'
}
