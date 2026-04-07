export type StrategyItem = {
  id: string
  name: string
  summary: string
  fitFor: string
}

export type StrategyLibraryState = {
  budgetShapes: StrategyItem[]
  angleTypes: StrategyItem[]
  deliverableShapes: StrategyItem[]
}

export const defaultStrategyLibrary: StrategyLibraryState = {
  budgetShapes: [
    {
      id: 'budget_lean_test',
      name: 'Lean Test',
      summary: '以最低可行成本測試單一主題方向，適合先驗證市場反應。',
      fitFor: '小預算、第一次試水溫、想快啲知道有冇人睇',
    },
    {
      id: 'budget_standard_launch',
      name: 'Standard Launch',
      summary: '一條主內容加一條補充內容，兼顧基本聲量同轉化。',
      fitFor: '新店開幕、常規產品推廣、單一 campaign launch',
    },
    {
      id: 'budget_multi_angle_push',
      name: 'Multi-Angle Push',
      summary: '用多個內容角度同不同 cutdown 去測試邊種訊息最有效。',
      fitFor: '要追 sales、要比較唔同訊息表現、想做 A/B 測試',
    },
    {
      id: 'budget_creator_duo',
      name: 'Creator Duo Test',
      summary: '由兩個 creator 分別演繹同一 campaign，測試不同受眾反應。',
      fitFor: '想知道唔同 creator style 邊個更適合品牌',
    },
    {
      id: 'budget_campaign_burst',
      name: 'Campaign Burst',
      summary: '多內容、多 creator、多 deliverables 一齊推，適合進取放大。',
      fitFor: '較高預算、想同時追 reach + branding + sales',
    },
  ],
  angleTypes: [
    {
      id: 'angle_sales_problem_solution',
      name: 'Problem -> Solution',
      summary: '由受眾現有痛點切入，再快速帶到產品或服務解法。',
      fitFor: '想直接帶查詢、落單、試用、預約',
    },
    {
      id: 'angle_reach_surprise',
      name: 'Surprise / Reveal',
      summary: '用反差、驚喜、原來如此做 hook，拉高觀看完成度。',
      fitFor: '想多人睇、多人 share、希望內容更爆',
    },
    {
      id: 'angle_branding_mood',
      name: 'Mood / Identity',
      summary: '由品牌感覺、場景氛圍、生活方式切入，不急住硬 sell。',
      fitFor: '重視品牌形象、品味、長遠印象',
    },
    {
      id: 'angle_social_proof',
      name: 'Social Proof',
      summary: '借第三方反應、真實體驗、口碑式敘事建立可信度。',
      fitFor: '餐飲、旅遊、服務、需要增加信任感嘅 campaign',
    },
    {
      id: 'angle_curiosity',
      name: 'Curiosity Hook',
      summary: '用一個未講完嘅問題或半句真相勾住觀眾睇落去。',
      fitFor: '內容型 campaign、想拉 watch time',
    },
  ],
  deliverableShapes: [
    {
      id: 'deliverable_single_reel',
      name: 'Single Reel',
      summary: '一條主 Reel，集中火力講一個最強角度。',
      fitFor: '小預算測試、重點清晰、節奏要快',
    },
    {
      id: 'deliverable_reel_plus_cutdown',
      name: 'Hero Reel + Cutdown',
      summary: '一條主片加一條補充 cutdown，方便做第二輪分發。',
      fitFor: '標準 launch、想兼顧主故事同補充重點',
    },
    {
      id: 'deliverable_multi_angle',
      name: 'Multi-Angle Set',
      summary: '同一 campaign 產出多個角度內容，方便比較轉化成效。',
      fitFor: '想測試唔同訊息、不同受眾入口',
    },
    {
      id: 'deliverable_creator_duo_pack',
      name: 'Creator Duo Pack',
      summary: '兩位 creator 各自出內容，令 campaign 更似真實社交推薦。',
      fitFor: '品牌想測試 creator fit，或者需要更廣受眾覆蓋',
    },
    {
      id: 'deliverable_hero_plus_assets',
      name: 'Hero Video + Support Assets',
      summary: '一條主片再加 story / static / cutdown 等支援素材。',
      fitFor: '完整 campaign 包裝、要俾 ads 或不同平台再用',
    },
  ],
}
