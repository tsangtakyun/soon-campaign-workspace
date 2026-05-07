export type StrategyItem = {
  id: string
  name: string
  summary: string
  fitFor: string
  notFitFor?: string
  successMetric?: string
}

export type StrategyLibraryState = {
  objectives: StrategyItem[]
  brandSituations: StrategyItem[]
  budgetShapes: StrategyItem[]
  angleTypes: StrategyItem[]
  funnelStages: StrategyItem[]
  deliverableShapes: StrategyItem[]
}

export function normalizeStrategyLibrary(value: unknown): StrategyLibraryState {
  const source = (value || {}) as Partial<StrategyLibraryState>

  return {
    objectives: Array.isArray(source.objectives) ? source.objectives : defaultStrategyLibrary.objectives,
    brandSituations: Array.isArray(source.brandSituations) ? source.brandSituations : defaultStrategyLibrary.brandSituations,
    budgetShapes: Array.isArray(source.budgetShapes) ? source.budgetShapes : defaultStrategyLibrary.budgetShapes,
    angleTypes: Array.isArray(source.angleTypes) ? source.angleTypes : defaultStrategyLibrary.angleTypes,
    funnelStages: Array.isArray(source.funnelStages) ? source.funnelStages : defaultStrategyLibrary.funnelStages,
    deliverableShapes: Array.isArray(source.deliverableShapes) ? source.deliverableShapes : defaultStrategyLibrary.deliverableShapes,
  }
}

export const defaultStrategyLibrary: StrategyLibraryState = {
  objectives: [
    {
      id: 'objective_awareness',
      name: 'Awareness',
      summary: '先令更多目標受眾知道品牌、產品或新店存在。',
      fitFor: '新品牌、新店開幕、未有足夠自然聲量、想先打開市場認知',
      notFitFor: '已有大量流量但查詢或落單偏低嘅 campaign',
      successMetric: 'Reach、3-second views、share rate、profile visits',
    },
    {
      id: 'objective_consideration',
      name: 'Consideration',
      summary: '令觀眾由知道變成想了解、收藏、比較或者主動查詢。',
      fitFor: '產品或服務需要解釋、有明顯賣點、觀眾需要時間考慮',
      notFitFor: '純粹要短期清貨或即時轉化嘅 campaign',
      successMetric: 'Save rate、completion rate、DM quality、website clicks',
    },
    {
      id: 'objective_conversion',
      name: 'Conversion',
      summary: '將內容流量導去 WhatsApp、DM、booking、落單或兌換。',
      fitFor: '有 offer、有明確 CTA、有能力接查詢或即時成交',
      notFitFor: '品牌信任未建立、產品賣點未講清、landing / WhatsApp 承接未準備好',
      successMetric: 'WhatsApp clicks、DM、booking、coupon redemption、sales',
    },
    {
      id: 'objective_retention',
      name: 'Retention',
      summary: '令舊客再次購買、再次到店，或者提醒沉睡 audience 回流。',
      fitFor: '已有顧客基礎、季節性推廣、會員活動、回購型產品',
      notFitFor: '完全未建立客源或受眾認知嘅新品牌',
      successMetric: 'Repeat purchase、return visit、CRM signup、member redemption',
    },
  ],
  brandSituations: [
    {
      id: 'situation_new_launch',
      name: 'New Launch',
      summary: '品牌、產品或店舖剛推出，市場需要先知道你係咩。',
      fitFor: '新店開幕、新產品上市、新服務推出',
      notFitFor: '已經有高認知但想解決轉化問題嘅品牌',
      successMetric: 'Reach、profile visits、brand search、first-time enquiries',
    },
    {
      id: 'situation_known_but_low_conversion',
      name: 'Known But Low Conversion',
      summary: '有人睇、有一定認知，但未有效轉成查詢或生意。',
      fitFor: 'IG 有流量但少 DM、影片有人睇但冇 booking、網站 CTR 低',
      notFitFor: '完全冇聲量、觀眾未理解品牌係咩嘅階段',
      successMetric: 'CTA click rate、DM rate、lead quality、conversion rate',
    },
    {
      id: 'situation_content_fatigue',
      name: 'Content Fatigue',
      summary: '品牌一直有出內容，但角度重複、受眾開始冇反應。',
      fitFor: '內容多但表現下跌、舊 formula 失效、需要新 angle',
      notFitFor: '從未有穩定內容輸出嘅品牌',
      successMetric: 'Hook retention、share rate、comment quality、new audience reach',
    },
    {
      id: 'situation_repositioning',
      name: 'Repositioning',
      summary: '需要改變市場對品牌嘅既有印象，重新定義價值。',
      fitFor: '老店翻新、轉高端、轉年輕化、想由平價印象升級',
      notFitFor: '短期只想推限時 offer 或清貨',
      successMetric: 'Sentiment、save rate、brand association、qualified enquiries',
    },
  ],
  budgetShapes: [
    {
      id: 'budget_lean_test',
      name: 'Lean Test',
      summary: '以最低可行成本測試單一主題方向，適合先驗證市場反應。',
      fitFor: '小預算、第一次試水溫、想快啲知道有冇人睇',
      notFitFor: '同一時間要追多個 objective 或需要大量素材嘅 campaign',
      successMetric: 'Hook retention、cost per engaged view、save/share signal',
    },
    {
      id: 'budget_standard_launch',
      name: 'Standard Launch',
      summary: '一條主內容加一條補充內容，兼顧基本聲量同轉化。',
      fitFor: '新店開幕、常規產品推廣、單一 campaign launch',
      notFitFor: '需要多 creator 大規模測試或長期 always-on 嘅 campaign',
      successMetric: 'Reach、completion rate、profile visits、DM',
    },
    {
      id: 'budget_multi_angle_push',
      name: 'Multi-Angle Push',
      summary: '用多個內容角度同不同 cutdown 去測試邊種訊息最有效。',
      fitFor: '要追 sales、要比較唔同訊息表現、想做 A/B 測試',
      notFitFor: '賣點未清楚或素材不足以支撐多角度內容',
      successMetric: 'Winning angle gap、CTR、DM rate、conversion signal',
    },
    {
      id: 'budget_creator_duo',
      name: 'Creator Duo Test',
      summary: '由兩個 creator 分別演繹同一 campaign，測試不同受眾反應。',
      fitFor: '想知道唔同 creator style 邊個更適合品牌',
      notFitFor: 'brief 太窄、brand guideline 太硬、唔容許 creator 自然演繹',
      successMetric: 'Creator-level retention、engagement quality、audience overlap',
    },
    {
      id: 'budget_campaign_burst',
      name: 'Campaign Burst',
      summary: '多內容、多 creator、多 deliverables 一齊推，適合進取放大。',
      fitFor: '較高預算、想同時追 reach + branding + sales',
      notFitFor: '未驗證訊息、landing 或銷售承接未準備好',
      successMetric: 'Total reach、lead volume、cost per lead、winning asset count',
    },
  ],
  angleTypes: [
    {
      id: 'angle_sales_problem_solution',
      name: 'Problem -> Solution',
      summary: '由受眾現有痛點切入，再快速帶到產品或服務解法。',
      fitFor: '想直接帶查詢、落單、試用、預約',
      notFitFor: '高端 lifestyle 或形象感優先、唔想太 hard sell 嘅品牌',
      successMetric: 'CTA clicks、DM rate、conversion rate',
    },
    {
      id: 'angle_reach_surprise',
      name: 'Surprise / Reveal',
      summary: '用反差、驚喜、原來如此做 hook，拉高觀看完成度。',
      fitFor: '想多人睇、多人 share、希望內容更爆',
      notFitFor: '產品或場景缺乏反差，或者品牌唔適合誇張表達',
      successMetric: '3-second retention、share rate、completion rate',
    },
    {
      id: 'angle_branding_mood',
      name: 'Mood / Identity',
      summary: '由品牌感覺、場景氛圍、生活方式切入，不急住硬 sell。',
      fitFor: '重視品牌形象、品味、長遠印象',
      notFitFor: '短期需要大量查詢或即時落單嘅 campaign',
      successMetric: 'Save rate、profile visits、brand sentiment',
    },
    {
      id: 'angle_social_proof',
      name: 'Social Proof',
      summary: '借第三方反應、真實體驗、口碑式敘事建立可信度。',
      fitFor: '餐飲、旅遊、服務、需要增加信任感嘅 campaign',
      notFitFor: '未有真實體驗素材、評價或 creator credibility 支撐',
      successMetric: 'Comment quality、DM trust signals、save rate',
    },
    {
      id: 'angle_curiosity',
      name: 'Curiosity Hook',
      summary: '用一個未講完嘅問題或半句真相勾住觀眾睇落去。',
      fitFor: '內容型 campaign、想拉 watch time',
      notFitFor: '資訊必須即時講清或受眾時間成本極低嘅 conversion ad',
      successMetric: 'Average watch time、completion rate、rewatch rate',
    },
  ],
  funnelStages: [
    {
      id: 'funnel_top_attention',
      name: 'Top Funnel: Attention',
      summary: '先用強 hook、反差或高分享度內容令觀眾停低。',
      fitFor: 'Awareness、新品牌、新題材、需要擴大受眾',
      notFitFor: '已經有足夠流量但轉化弱嘅情況',
      successMetric: 'Reach、3-second views、share rate、new audience percentage',
    },
    {
      id: 'funnel_middle_trust',
      name: 'Middle Funnel: Trust',
      summary: '補充理由、實測、口碑、細節，令觀眾相信值得試。',
      fitFor: '需要教育市場、建立信任、提升收藏同查詢質量',
      notFitFor: '完全未打開 attention 前，過早講太多細節',
      successMetric: 'Save rate、completion rate、profile visits、quality comments',
    },
    {
      id: 'funnel_bottom_action',
      name: 'Bottom Funnel: Action',
      summary: '用清晰 CTA、offer、限時理由或流程指引推動下一步。',
      fitFor: '有明確 offer、booking、WhatsApp、DM 或 landing page',
      notFitFor: '受眾未理解品牌價值或信任未建立',
      successMetric: 'CTA clicks、DM、booking、coupon redemption、sales',
    },
  ],
  deliverableShapes: [
    {
      id: 'deliverable_single_reel',
      name: 'Single Reel',
      summary: '一條主 Reel，集中火力講一個最強角度。',
      fitFor: '小預算測試、重點清晰、節奏要快',
      notFitFor: '需要教育市場或同時測試多個賣點',
      successMetric: 'Retention、share/save、cost per result',
    },
    {
      id: 'deliverable_reel_plus_cutdown',
      name: 'Hero Reel + Cutdown',
      summary: '一條主片加一條補充 cutdown，方便做第二輪分發。',
      fitFor: '標準 launch、想兼顧主故事同補充重點',
      notFitFor: '訊息太多但冇清晰主線，或者素材不足',
      successMetric: 'Hero retention、cutdown CTR、profile visits',
    },
    {
      id: 'deliverable_multi_angle',
      name: 'Multi-Angle Set',
      summary: '同一 campaign 產出多個角度內容，方便比較轉化成效。',
      fitFor: '想測試唔同訊息、不同受眾入口',
      notFitFor: 'budget 太低或未有足夠素材支撐 A/B testing',
      successMetric: 'Best angle uplift、CTR gap、lead quality',
    },
    {
      id: 'deliverable_creator_duo_pack',
      name: 'Creator Duo Pack',
      summary: '兩位 creator 各自出內容，令 campaign 更似真實社交推薦。',
      fitFor: '品牌想測試 creator fit，或者需要更廣受眾覆蓋',
      notFitFor: '需要高度一致品牌話術、不能容許 creator 風格差異',
      successMetric: 'Creator fit score、engagement quality、audience response',
    },
    {
      id: 'deliverable_hero_plus_assets',
      name: 'Hero Video + Support Assets',
      summary: '一條主片再加 story / static / cutdown 等支援素材。',
      fitFor: '完整 campaign 包裝、要俾 ads 或不同平台再用',
      notFitFor: '只需要快速 validation、未準備好投放或再分發',
      successMetric: 'Asset reuse rate、paid CTR、lead volume、frequency control',
    },
  ],
}
