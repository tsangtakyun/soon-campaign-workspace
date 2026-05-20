import { defaultStrategyLibrary, type StrategyItem, type StrategyLibraryState } from '@/lib/strategy-library'

export type CampaignFormInput = {
  campaignIntakeId?: string
  contactName?: string
  objective: string
  businessName: string
  whatsapp?: string
  email?: string
  campaignTitle: string
  vertical: string
  budgetRange: string
  brief: string
  mustInclude: string
}

export type AnalysisPreview = {
  summary: string
  angleA: string
  angleB: string
  budgetGuide: string
}

export type FullAnalysis = {
  headline: string
  overview: string
  campaignNorthStar: string
  strategy: string[]
  contentPlanning: string[]
  production: string[]
  distribution: string[]
  conversion: string[]
  optimization: string[]
}

export type CreatorArchetype = {
  title: string
  fitScore: string
  summary: string
  strengths: string[]
  bestUse: string
  deliverableShape: string
  reelRate: string
  soonCommissionRate: string
  soonCommissionAmount: string
}

export type ScriptPlanningPack = {
  headline: string
  rationale: string
  creatorCreativeDirection: string[]
  backingInformation: {
    corePositioning: string
    strongestSellingPoint: string
    suitableAudience: string
    backgroundNotes: string
  }
  testContentItems: string[]
  clientDecisions: string[]
  ctaDirection: string
}

export type StoryboardPlanningPack = {
  headline: string
  rationale: string
  creatorCreativeScope: string[]
  mustHaveShotGroups: Array<{
    title: string
    description: string
    options: Array<{
      id: string
      name: string
      description: string
      recommended: boolean
    }>
  }>
  visualPriority: string[]
  deliveryNotes: string[]
}

export type DeliveryConfirmationPack = {
  headline: string
  rationale: string
  scopeSummary: string[]
  logisticsChecklist: string[]
  paymentRules: string[]
  productionSteps: string[]
  defaultDeliveryExpectation: string
  defaultShootWindow: string
  defaultProductionNotes: string
}

export type CampaignProgressStep = {
  label: string
  status: '完成' | '進行中' | '下一步'
}

export type CampaignProgress = {
  currentStageLabel: string
  currentStageIndex: number
  nextActionLabel: string
  summary: string
  latestUpdate: string
  steps: CampaignProgressStep[]
}

export type WorkflowState = {
  creatorMatchingConfirmed: boolean
  scriptPlanningConfirmed: boolean
  storyboardPlanningConfirmed: boolean
  deliveryConfirmationConfirmed: boolean
  selectedCreatorTitle: string
  scriptPlanningDraft: {
    corePositioning?: string
    strongestSellingPoint?: string
    suitableAudience?: string
    backgroundNotes?: string
    testContentItems?: string[]
  }
  storyboardDraft: {
    mustHaveShots?: string[]
  }
  deliveryConfirmationDraft: {
    expectedDeliveryWindow?: string
    expectedShootWindow?: string
    productionNotes?: string
    whatsappContactIntent?: string
    depositStatus?: string
    finalPaymentRule?: string
  }
}

export function explainAnalysisPoint(
  form: CampaignFormInput,
  sectionTitle: string,
  item: string
) {
  const brand = form.businessName || '你嘅品牌'
  const objectiveMap: Record<string, string> = {
    sales: '盡快帶到查詢、WhatsApp、DM 或落單',
    reach: '盡量推高觀看、分享同停留',
    branding: '先建立品牌感覺同記憶點',
  }

  const objective = objectiveMap[form.objective] || '清楚咁打入市場'

  const sectionMap: Record<string, string> = {
    '1. Strategy': `${brand} 而家最重要唔係做得多，而係做得準。呢個建議背後嘅意思係要先鎖定一個主目標，因為你今次 campaign 如果同時又想多人睇、又想即刻賣、又想建立品牌，最後通常每樣都只做到一半。對 ${brand} 來講，現階段最值得優先處理係 ${objective}。`,
    '2. Content Planning': `呢點唔係單純講出幾多條片，而係講 ${brand} 應該點樣安排內容節奏。先用最容易令人停低嘅內容打開 attention，再用第二類內容承接解釋、信任或者行動，咁先似一個完整 campaign，而唔係一堆分散內容。`,
    '3. Production': `呢點想講清楚 production 唔係追求畫面靚就夠，而係每一秒都要服務結果。對 ${brand} 而言，腳本、開頭 hook、字幕節奏、close-up 同資訊密度，全部都會直接影響 retention，同埋觀眾會唔會繼續睇落去。`,
    '4. Distribution': `呢點係提醒 ${brand}，內容出咗街先至真正開始。發佈時間、分發方式、creator 配合、cutdown 重發，甚至後續有冇放大 winning content，都會決定條片係一閃即逝定可以真正放大成效。`,
    '5. Conversion': `呢點最關鍵，因為流量本身唔會自動變錢。對 ${brand} 來講，內容之後觀眾要去邊、點樣 DM、點樣撳 link、點樣入 WhatsApp，都需要提前設計，否則即使條片多人睇，最後都未必收到生意。`,
    '6. Data & Optimization': `呢點代表 campaign 唔應該只做一次就算。${brand} 真正值錢嘅地方係由第一輪數據搵到 winning formula，再複製同放大。即係唔係估邊條片會好，而係用數據知道邊條真係好。`,
  }

  return `${sectionMap[sectionTitle] || `${brand} 呢個建議重點係幫你將 campaign 做得更聚焦。`} 簡單講，呢一點係想你明白：「${item}」唔係額外負擔，而係幫你提升成個 campaign 命中率同轉化效率。`
}

export function answerFollowUpQuestion(
  form: CampaignFormInput,
  sectionTitle: string,
  item: string,
  question: string
) {
  const brand = form.businessName || '你嘅品牌'
  const normalizedQuestion = question.trim()

  if (!normalizedQuestion) {
    return ''
  }

  const base = explainAnalysisPoint(form, sectionTitle, item)

  const patterns: Array<{ match: RegExp; answer: string }> = [
    {
      match: /點解|為什麼|why/i,
      answer: `如果用最直接方法答你，係因為 ${brand} 而家最需要先將資源集中喺最有機會出結果嘅位。呢個建議唔係理論上最好睇，而係最有機會令你第一輪 campaign 快啲見到反應、知道應唔應該加碼。`,
    },
    {
      match: /預算|budget|平啲|貴/i,
      answer: `如果你擔心預算，做法唔係完全刪走呢一步，而係縮細規模先測。對 ${brand} 來講，可以先保留核心做法，用更細 budget 驗證 opening、angle 同 CTA，有反應先再放大。`,
    },
    {
      match: /唔明|即係|意思/i,
      answer: `用最白話講，呢一點其實係想幫 ${brand} 避免「內容有出，但結果唔知點解冇」呢種情況。你可以當佢係 campaign 入面一個必做檢查位，確保每一步都係為結果服務。`,
    },
    {
      match: /點做|如何|how/i,
      answer: `實際做法可以由一個最小版本開始：先揀一條主角度，再配一個最清晰 CTA，出第一輪內容後睇數據。等你見到邊種 opening、內容節奏或者 creator 最 fit，再展開下一輪。`,
    },
    {
      match: /creator|kol|influencer/i,
      answer: `如果你係問 creator 點配，重點唔係 follower 數量，而係佢講故事方式、鏡頭感同 audience 氣質同 ${brand} 今次 campaign 夠唔夠貼。第一輪通常應先搵 fit，而唔係先搵最大。`,
    },
    {
      match: /sales|轉化|whatsapp|dm|落單/i,
      answer: `如果你最關心 sales，咁每條內容都要諗埋「觀眾睇完之後去邊」。對 ${brand} 來講，Reel 後面接 DM、WhatsApp、預約頁或者簡單 landing page，先有機會將 attention 真正變成收入。`,
    },
  ]

  const matched = patterns.find((pattern) => pattern.match.test(normalizedQuestion))

  return matched
    ? `${matched.answer} 另外，回到你啱啱睇緊呢一點：「${item}」其實就係幫你將呢件事落地。`
    : `${base} 如果直接回應你呢條問題「${normalizedQuestion}」，我會建議你將佢理解成 campaign 入面一個決策工具：幫 ${brand} 判斷而家邊個方向最值得先做、邊啲可以留待第二輪先加。`
}

export type StoredPaidAnalysisDraft = {
  campaignIntakeId?: string
  form: CampaignFormInput
}

function objectiveText(objective: string) {
  const objectiveMap: Record<string, string> = {
    sales: '直接推動查詢、落單同轉化',
    reach: '盡量吸引多人睇、多人分享同多人記得',
    branding: '建立品牌形象同感覺，唔急住 hard sell',
  }
  return objectiveMap[objective] || '清楚 angle'
}

function pickFirst(items: StrategyItem[], fallback: StrategyItem) {
  return items.find((item) => item.name.trim() || item.summary.trim()) || fallback
}

function selectObjectiveRule(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.objectives.length ? library.objectives : defaultStrategyLibrary.objectives
  const targetId =
    form.objective === 'sales'
      ? 'objective_conversion'
      : form.objective === 'reach'
        ? 'objective_awareness'
        : 'objective_consideration'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.objectives[0])
}

function selectBrandSituation(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.brandSituations.length ? library.brandSituations : defaultStrategyLibrary.brandSituations
  const signal = `${form.campaignTitle} ${form.brief} ${form.mustInclude}`.toLowerCase()
  const targetId =
    /新店|開幕|new|launch|上市|推出|新產品/.test(signal)
      ? 'situation_new_launch'
      : /轉化|落單|查詢|dm|whatsapp|booking|預約|sales/.test(signal)
        ? 'situation_known_but_low_conversion'
        : /翻新|rebrand|升級|形象|定位|高端|年輕化/.test(signal)
          ? 'situation_repositioning'
          : /冇反應|下跌|重複|疲勞|新角度|爆款/.test(signal)
            ? 'situation_content_fatigue'
            : 'situation_new_launch'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.brandSituations[0])
}

function selectBudgetShape(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.budgetShapes.length ? library.budgetShapes : defaultStrategyLibrary.budgetShapes
  const targetId =
    form.budgetRange === '3000-8000'
      ? 'budget_lean_test'
      : form.budgetRange === '8000-15000'
        ? 'budget_standard_launch'
        : form.budgetRange === '30000-50000'
          ? 'budget_campaign_burst'
          : form.objective === 'reach'
            ? 'budget_multi_angle_push'
            : 'budget_creator_duo'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.budgetShapes[0])
}

function selectAngleType(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.angleTypes.length ? library.angleTypes : defaultStrategyLibrary.angleTypes
  const targetId =
    form.objective === 'sales'
      ? 'angle_sales_problem_solution'
      : form.objective === 'reach'
        ? 'angle_reach_surprise'
        : form.vertical === 'food'
          ? 'angle_social_proof'
          : 'angle_branding_mood'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.angleTypes[0])
}

function selectFunnelStage(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.funnelStages.length ? library.funnelStages : defaultStrategyLibrary.funnelStages
  const targetId =
    form.objective === 'sales'
      ? 'funnel_bottom_action'
      : form.objective === 'reach'
        ? 'funnel_top_attention'
        : 'funnel_middle_trust'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.funnelStages[0])
}

function selectDeliverableShape(form: CampaignFormInput, library: StrategyLibraryState) {
  const items = library.deliverableShapes.length ? library.deliverableShapes : defaultStrategyLibrary.deliverableShapes
  const targetId =
    form.budgetRange === '3000-8000'
      ? 'deliverable_single_reel'
      : form.budgetRange === '8000-15000'
        ? 'deliverable_reel_plus_cutdown'
        : form.budgetRange === '30000-50000'
          ? 'deliverable_hero_plus_assets'
          : form.objective === 'reach'
            ? 'deliverable_multi_angle'
            : 'deliverable_creator_duo_pack'

  return items.find((item) => item.id === targetId) || pickFirst(items, defaultStrategyLibrary.deliverableShapes[0])
}

export function buildAnalysisPreview(form: CampaignFormInput, library: StrategyLibraryState = defaultStrategyLibrary): AnalysisPreview | null {
  if (!form.brief.trim()) return null
  const objectiveRule = selectObjectiveRule(form, library)
  const brandSituation = selectBrandSituation(form, library)
  const angle = selectAngleType(form, library)
  const budgetShape = selectBudgetShape(form, library)
  const deliverableShape = selectDeliverableShape(form, library)

  return {
    summary: `${form.businessName || '你嘅品牌'}而家最接近「${objectiveRule.name}」目標，同時情況似係「${brandSituation.name}」。系統會根據呢個 marketing context，生成更貼近 objective、funnel 同 KPI 嘅宣傳方向。`,
    angleA: angle.name
      ? `${angle.name}：${angle.summary}`
      : form.vertical === 'food'
      ? '值唔值得專程去食'
      : form.vertical === 'travel'
        ? '離開城市半日就去到另一個世界'
        : form.vertical === 'product'
          ? '生活中一用就有感分別'
          : '原來香港仲有呢種體驗',
    angleB: deliverableShape.name
      ? `${deliverableShape.name}：${deliverableShape.summary}`
      : form.vertical === 'product'
      ? '一條偏實測，一條偏情境種草'
      : '一條主 Reel + 一條補充 cutdown',
    budgetGuide: budgetShape.name
      ? `${budgetShape.name}：${budgetShape.summary}`
      : form.budgetRange === '3000-8000'
      ? '適合做單條快狠準測試內容'
      : form.budgetRange === '8000-15000'
        ? '適合做一條主片 + 一條補充內容'
        : form.budgetRange === '30000-50000'
          ? '適合做多 creator 測試、完整 campaign 包裝同更進取放大'
          : '適合做完整 campaign 試驗同多角度內容',
  }
}

export function buildFullAnalysis(form: CampaignFormInput, library: StrategyLibraryState = defaultStrategyLibrary): FullAnalysis {
  const brand = form.businessName || '你嘅品牌'
  const objectiveRule = selectObjectiveRule(form, library)
  const brandSituation = selectBrandSituation(form, library)
  const budgetShape = selectBudgetShape(form, library)
  const angleType = selectAngleType(form, library)
  const funnelStage = selectFunnelStage(form, library)
  const deliverableShape = selectDeliverableShape(form, library)
  const audienceHint =
    form.vertical === 'food'
      ? '18-35 歲、會睇飲食內容、願意為新店同打卡感買單嘅 audience'
      : form.vertical === 'travel'
        ? '想搵週末短逃離、重視體驗感同地點驚喜嘅 audience'
        : form.vertical === 'product'
          ? '會主動比較產品、想即睇即知值唔值得試嘅 audience'
          : '重視新鮮感、生活品味同分享慾望嘅 audience'

  return {
    headline: `${brand} 完整 AI 宣傳方向分析`,
    overview: `${brand} 呢次唔應該只係「出一條片」咁簡單，而係要將 attention、內容節奏、分發同轉化串成一個完整 campaign。先用最 fit 嘅 angle 打入市場，再根據數據搵 winning formula，會比盲目搵中介同亂出內容更有效率。`,
    campaignNorthStar: '用內容去測試 attention -> 用數據搵 winning -> 再用錢放大 -> 最後變現。',
    strategy: [
      `${brand} 呢次建議只集中一個主目標：${objectiveRule.name}。${objectiveRule.summary} 成功指標應該優先睇 ${objectiveRule.successMetric || '最貼近 business objective 嘅核心 KPI'}。`,
      `現時 campaign context 比較似「${brandSituation.name}」：${brandSituation.summary} 所以策略唔應該只問「拍咩片」，而係先決定要改變市場邊一個認知或行動。`,
      `核心 audience 應先鎖定為 ${audienceHint}，然後所有內容都圍住「點樣令觀眾停低」去設計，而唔係只係介紹你賣緊乜。`,
      `主角度建議以「${angleType.name}」切入：${angleType.summary} 適合原因係 ${angleType.fitFor}。`,
    ],
    contentPlanning: [
      `Funnel 上建議先以「${funnelStage.name}」做主軸：${funnelStage.summary} 對應 KPI 係 ${funnelStage.successMetric || 'retention、engagement 同 conversion signal'}。`,
      `${deliverableShape.name} 會係最合理嘅第一輪 content shape：${deliverableShape.summary}`,
      '內容規劃唔止分平台，仲要分節奏：先用爆點內容搶 attention，再用解釋型或信任型內容承接。',
      '每條片都應該有清晰 hook template，Must include 內嘅元素要自然散落喺片中，而唔係最後一次過硬塞。',
    ],
    production: [
      `${budgetShape.name} 係今次建議 budget strategy：${budgetShape.summary} 適合原因係 ${budgetShape.fitFor}。`,
      angleType.notFitFor ? `要避免嘅情況：${angleType.name} 唔適合用喺 ${angleType.notFitFor}，所以拍攝同剪接時要確保賣點、場景或 creator 表達足夠支撐呢個 angle。` : '拍攝前要先確保 chosen angle 有足夠畫面同賣點支撐。',
      '拍攝前應先有 script、shot list、opening hook、關鍵 close-up，同埋明確知道邊幾秒要帶出產品或場景價值。',
      '剪接階段要優先處理節奏、字幕、畫面資訊密度同開頭 3 秒停留力，而唔係只係執顏色同靚畫面。',
    ],
    distribution: [
      '內容出街唔係完結，真正 campaign 要設 posting schedule、creator 分發節奏同後續放大策略。',
      form.budgetRange === '30000-50000'
        ? '以你而家呢個 budget，可以預留部份資源去放大 winning content，甚至做第二位 creator 測試。'
        : '如果唔想一開始燒太多 budget，可以先靠 creator 分發、多帳號矩陣同 cutdown 重發去放大表現最好嘅內容。',
      'Hashtag、SEO、caption 同發佈時間都應該跟內容角度配合，而唔係每次固定同一套。',
    ],
    conversion: [
      '真正分水嶺唔係出 content，而係有冇將觀眾導去 CTA，同埋收返查詢、DM、WhatsApp 或落單。',
      form.objective === 'sales'
        ? '你而家最需要設計明確嘅轉化路線，例如 Reel -> WhatsApp -> closing，而唔係只係期望觀眾自己會搵你。'
        : '即使主目標唔係即刻 sales，都應該有輕量 CTA，例如 follow、收藏、DM、預約，等流量有承接位。',
      objectiveRule.notFitFor ? `如果現場承接未準備好，要小心：${objectiveRule.name} 唔適合 ${objectiveRule.notFitFor}。` : 'CTA、landing page 同客戶服務承接要同內容承諾一致。',
      'Landing page、link in bio 同 CTA 文案應跟內容 angle 一致，咁先唔會由吸引人去到臨門一腳斷層。',
    ],
    optimization: [
      `Campaign 唔係做一次就完，第一輪上線後應集中睇：${objectiveRule.successMetric || 'retention、儲存、分享、CTR 同查詢質量'}。`,
      '下一輪最值得做嘅係 A/B testing：開頭 hook、thumbnail、第一句字幕、CTA 位置，都可以逐樣測。',
      '將表現最好嘅 opening、角度同 creator formula 留低，再用第二輪 budget 放大，先係專業 campaign 最值錢嘅地方。',
    ],
  }
}

export function buildCreatorMatches(form: CampaignFormInput): CreatorArchetype[] {
  const brand = form.businessName || '你嘅品牌'

  if (form.vertical === 'food') {
    return [
      {
        title: 'Foodie Discoverer',
        fitScore: '96',
        summary: `最適合幫 ${brand} 用「值唔值得專程去」角度打開第一輪 attention，特別適合新店、話題感 menu 同打卡位內容。`,
        strengths: [
          '擅長食物反應、空間氣氛同 close-up 質感鏡頭',
          '開場 hook 容易令觀眾停低，適合打第一輪曝光',
          '可自然將甜品 / 主打 menu 包裝成「值得去試」',
        ],
        bestUse: '第一條 hero reel + 餐牌重點 cutdown',
        deliverableShape: '1 條主 Reel + 1 條 menu / 招牌品補充短片',
        reelRate: 'HK$15,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$4,500',
      },
      {
        title: 'Lifestyle Date Mood Creator',
        fitScore: '89',
        summary: `如果 ${brand} 想強化品牌感同情侶 / 朋友約會氣氛，呢類 creator 會更易做出「我都想去」嘅情緒代入。`,
        strengths: [
          '擅長包裝 mood、約會感、週末行程感',
          '觀眾唔會覺得太 hard sell，適合品牌形象 build-up',
          '適合帶出空間、打卡位同體驗節奏',
        ],
        bestUse: '第二輪品牌感 angle / story-based reel',
        deliverableShape: '1 條情境感主片 + story / vertical cutdown',
        reelRate: 'HK$20,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$6,000',
      },
      {
        title: 'Micro Conversion Closer',
        fitScore: '84',
        summary: `如果 ${brand} 之後要追查詢、優惠兌換或落單，呢類 creator 會比純打卡型 creator 更擅長帶 CTA 同行動。`,
        strengths: [
          '講解清楚、CTA 直接、容易帶到 DM / WhatsApp / 優惠行動',
          '適合 coupon、限時優惠、開幕 offer',
          '比純 aesthetic 內容更接近 conversion',
        ],
        bestUse: '表現最好角度後嘅轉化加碼版本',
        deliverableShape: '1 條直入賣點轉化短片 + 1 條 CTA cutdown',
        reelRate: 'HK$12,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$3,600',
      },
    ]
  }

  if (form.vertical === 'travel') {
    return [
      {
        title: 'Local Escape Storyteller',
        fitScore: '95',
        summary: `最適合幫 ${brand} 包裝成「短時間離開城市就去到另一個世界」呢種旅遊感內容。`,
        strengths: [
          '擅長 reveal、路線感同地方故事包裝',
          '容易做週末 short getaway 類內容',
          '適合第一輪 attention 測試',
        ],
        bestUse: 'hero destination reel',
        deliverableShape: '1 條主片 + 1 條行程補充 cutdown',
        reelRate: 'HK$18,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$5,400',
      },
      {
        title: 'Practical Guide Creator',
        fitScore: '87',
        summary: `如果 ${brand} 想令觀眾覺得「我即刻都做到呢個行程」，呢類 creator 會更有行動推動力。`,
        strengths: [
          '資訊清楚、路線易明、容易提升儲存率',
          '適合加入交通、時間、價錢等實用資訊',
          '有助帶到 click / itinerary action',
        ],
        bestUse: '攻略型補充內容',
        deliverableShape: '1 條 guide reel + 1 條懶人包 cutdown',
        reelRate: 'HK$16,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$4,800',
      },
      {
        title: 'Luxury Mood Curator',
        fitScore: '82',
        summary: `當 ${brand} 想賣高質感體驗、住宿或 premium 行程，呢類 creator 更易帶出 aspirational feeling。`,
        strengths: [
          '擅長畫面感、節奏感同高級氛圍',
          '容易提升品牌 perception',
          '適合 higher-end positioning',
        ],
        bestUse: '品牌形象 / premium package angle',
        deliverableShape: '1 條品牌感主片 + story asset',
        reelRate: 'HK$24,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$7,200',
      },
    ]
  }

  if (form.vertical === 'product') {
    return [
      {
        title: 'Problem-Solution Demonstrator',
        fitScore: '94',
        summary: `最適合幫 ${brand} 用「一用就見到分別」去快速證明產品價值。`,
        strengths: [
          '擅長實測、before/after、清楚解釋',
          '容易令觀眾理解點解要買',
          '對 sales / conversion 目標特別有效',
        ],
        bestUse: '第一輪賣點證明片',
        deliverableShape: '1 條實測主片 + 1 條重點 cutdown',
        reelRate: 'HK$14,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$4,200',
      },
      {
        title: 'Lifestyle Use-Case Creator',
        fitScore: '88',
        summary: `如果 ${brand} 想令產品更自然咁入生活，呢類 creator 更適合做情境種草。`,
        strengths: [
          '擅長生活情景包裝',
          '觀眾接受度高，唔似硬 sell',
          '可將產品融入日常 routine',
        ],
        bestUse: '情境種草 / second angle',
        deliverableShape: '1 條情境片 + 1 條生活感補充內容',
        reelRate: 'HK$17,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$5,100',
      },
      {
        title: 'Trust Builder Reviewer',
        fitScore: '83',
        summary: `當 ${brand} 需要更強信任感，例如較高單價或較新產品，呢類 creator 會幫到建立可信度。`,
        strengths: [
          '評論方式較穩陣、有說服力',
          '適合較理性 audience',
          '可承接常見疑問同 objection',
        ],
        bestUse: '轉化前信任補強內容',
        deliverableShape: '1 條 review 型影片 + Q&A 型 cutdown',
        reelRate: 'HK$19,000 / Reel',
        soonCommissionRate: '30%',
        soonCommissionAmount: 'HK$5,700',
      },
    ]
  }

  return [
    {
      title: 'Attention Hook Creator',
      fitScore: '91',
      summary: `最適合幫 ${brand} 打開第一輪 attention，先測邊個角度最有機會爆。`,
      strengths: [
        '擅長 opening hook',
        '容易提高第一輪停留率',
        '適合做 angle 測試',
      ],
      bestUse: '第一條主角度內容',
      deliverableShape: '1 條主片 + 1 條 cutdown',
      reelRate: 'HK$13,000 / Reel',
      soonCommissionRate: '30%',
      soonCommissionAmount: 'HK$3,900',
    },
    {
      title: 'Story-led Lifestyle Creator',
      fitScore: '86',
      summary: `適合幫 ${brand} 做品牌感同情境代入，令內容更自然。`,
      strengths: [
        '情境感強',
        '適合建立品牌印象',
        '有助提升分享同收藏',
      ],
      bestUse: '第二輪品牌形象內容',
      deliverableShape: '1 條情境片 + story asset',
      reelRate: 'HK$16,000 / Reel',
      soonCommissionRate: '30%',
      soonCommissionAmount: 'HK$4,800',
    },
    {
      title: 'Conversion-focused Closer',
      fitScore: '82',
      summary: `適合幫 ${brand} 喺有 attention 之後補一條更接近轉化嘅內容。`,
      strengths: [
        'CTA 清晰',
        '容易導向 DM / click / 查詢',
        '適合 performance 取向 campaign',
      ],
      bestUse: '轉化補強片',
      deliverableShape: '1 條 CTA 短片 + 1 條 reminder cutdown',
      reelRate: 'HK$12,000 / Reel',
      soonCommissionRate: '30%',
      soonCommissionAmount: 'HK$3,600',
    },
  ]
}

export function buildCampaignProgress(options: {
  paymentStatus?: string | null
  hasFullAnalysis?: boolean
  hasCreatorMatchingConfirmed?: boolean
  hasScriptPlanningConfirmed?: boolean
  hasStoryboardPlanningConfirmed?: boolean
  hasDeliveryConfirmationConfirmed?: boolean
}) : CampaignProgress {
  const currentStageIndex: number =
    options.hasDeliveryConfirmationConfirmed
      ? 7
      : options.hasStoryboardPlanningConfirmed
      ? 6
      : options.hasScriptPlanningConfirmed
      ? 5
      : options.hasCreatorMatchingConfirmed
        ? 4
        : options.hasFullAnalysis || options.paymentStatus === 'paid'
        ? 3
        : 2

  const steps: CampaignProgressStep[] = [
    { label: '1. 填寫品牌 brief', status: currentStageIndex > 1 ? '完成' : '進行中' },
    { label: '2. AI 分析宣傳方向', status: currentStageIndex > 2 ? '完成' : currentStageIndex === 2 ? '進行中' : '下一步' },
    { label: '3. 系統配對合適 creator', status: currentStageIndex > 3 ? '完成' : currentStageIndex === 3 ? '進行中' : '下一步' },
    { label: '4. 生成題材與腳本建議', status: currentStageIndex > 4 ? '完成' : currentStageIndex === 4 ? '進行中' : '下一步' },
    { label: '5. 整理拍攝方向與分鏡', status: currentStageIndex > 5 ? '完成' : currentStageIndex === 5 ? '進行中' : '下一步' },
    { label: '6. 確認製作與交付安排', status: currentStageIndex > 6 ? '完成' : currentStageIndex === 6 ? '進行中' : '下一步' },
    { label: '7. 跟進內容交付', status: currentStageIndex === 7 ? '進行中' : '下一步' },
  ]

  if (currentStageIndex === 4) {
    return {
      currentStageLabel: '腳本規劃準備中',
      currentStageIndex,
      nextActionLabel: '開始生成第一輪腳本方向',
      summary: '你已經完成 AI 分析同 creator matching，下一步係將最 fit 嘅 creator 組合同 campaign angle 變成可拍嘅腳本方向。',
      latestUpdate: '系統已完成 creator matching，等待進入 script planning。',
      steps,
    }
  }

  if (currentStageIndex === 5) {
    return {
      currentStageLabel: 'Storyboard Planning 準備中',
      currentStageIndex,
      nextActionLabel: '將已確認腳本方向整理成 storyboard',
      summary: '你已經完成 creator matching 同 script planning，下一步係將內容方向變成更具體嘅拍攝分鏡與 shot plan。',
      latestUpdate: 'Script planning 已確認，等待進入 storyboard planning。',
      steps,
    }
  }

  if (currentStageIndex === 6) {
    return {
      currentStageLabel: 'Delivery Confirmation 準備中',
      currentStageIndex,
      nextActionLabel: '確認拍攝 / 出片時間，支付 50% 訂金鎖 project',
      summary: '你已經完成 storyboard planning，下一步係確認製作安排、預期出片時間、50% 訂金同 production handoff。',
      latestUpdate: 'Storyboard planning 已確認，等待 client 確認製作與交付安排。',
      steps,
    }
  }

  if (currentStageIndex === 7) {
    return {
      currentStageLabel: 'Content Delivery 進行中',
      currentStageIndex,
      nextActionLabel: '製作主任跟進拍攝細節、watermarked cut 同尾數交付',
      summary: '製作與交付安排已確認，project 已鎖定。下一步會由製作主任跟進拍攝細節、出帶水印 cut，直到 full payment 後正式交片。',
      latestUpdate: '客戶已確認製作安排，等待製作主任 WhatsApp 跟進同 production handoff。',
      steps,
    }
  }

  if (currentStageIndex === 3) {
    return {
      currentStageLabel: 'Creator Matching 進行中',
      currentStageIndex,
      nextActionLabel: '確認 creator 組合，進入腳本規劃',
      summary: '已完成付費分析，系統而家應該先揀最合適嘅 creator 類型，避免一開始用錯人燒 budget。',
      latestUpdate: '完整 AI 分析已解鎖，等待確認 creator matching 方向。',
      steps,
    }
  }

  return {
    currentStageLabel: 'AI Analysis Ready',
    currentStageIndex,
    nextActionLabel: '完成付款後解鎖完整分析',
    summary: '品牌 brief 已經提交，下一步應該先解鎖完整 AI 分析，搵出最值得先做嘅 campaign 方向。',
    latestUpdate: '品牌 brief 已成功記錄，等待進入完整分析階段。',
    steps,
  }
}

export function extractWorkflowState(fullAnalysis: Record<string, unknown> | null | undefined): WorkflowState {
  const workflow = (fullAnalysis?._workflow || {}) as Record<string, unknown>
  const draft = (workflow.scriptPlanningDraft || {}) as Record<string, unknown>
  const deliveryDraft = (workflow.deliveryConfirmationDraft || {}) as Record<string, unknown>

  return {
    creatorMatchingConfirmed: Boolean(workflow.creatorMatchingConfirmedAt),
    scriptPlanningConfirmed: Boolean(workflow.scriptPlanningConfirmedAt),
    storyboardPlanningConfirmed: Boolean(workflow.storyboardPlanningConfirmedAt),
    deliveryConfirmationConfirmed: Boolean(workflow.deliveryConfirmationConfirmedAt),
    selectedCreatorTitle: typeof workflow.selectedCreatorTitle === 'string' ? workflow.selectedCreatorTitle : '',
    scriptPlanningDraft: {
      corePositioning: typeof draft.corePositioning === 'string' ? draft.corePositioning : '',
      strongestSellingPoint: typeof draft.strongestSellingPoint === 'string' ? draft.strongestSellingPoint : '',
      suitableAudience: typeof draft.suitableAudience === 'string' ? draft.suitableAudience : '',
      backgroundNotes: typeof draft.backgroundNotes === 'string' ? draft.backgroundNotes : '',
      testContentItems: Array.isArray(draft.testContentItems) ? draft.testContentItems.filter((item): item is string => typeof item === 'string') : [],
    },
    storyboardDraft: {
      mustHaveShots: Array.isArray(workflow.mustHaveShots) ? workflow.mustHaveShots.filter((item): item is string => typeof item === 'string') : [],
    },
    deliveryConfirmationDraft: {
      expectedDeliveryWindow: typeof deliveryDraft.expectedDeliveryWindow === 'string' ? deliveryDraft.expectedDeliveryWindow : '',
      expectedShootWindow: typeof deliveryDraft.expectedShootWindow === 'string' ? deliveryDraft.expectedShootWindow : '',
      productionNotes: typeof deliveryDraft.productionNotes === 'string' ? deliveryDraft.productionNotes : '',
      whatsappContactIntent: typeof deliveryDraft.whatsappContactIntent === 'string' ? deliveryDraft.whatsappContactIntent : '',
      depositStatus: typeof deliveryDraft.depositStatus === 'string' ? deliveryDraft.depositStatus : '',
      finalPaymentRule: typeof deliveryDraft.finalPaymentRule === 'string' ? deliveryDraft.finalPaymentRule : '',
    },
  }
}

export function buildDeliveryConfirmationPack(form: CampaignFormInput): DeliveryConfirmationPack {
  const brand = form.businessName || '你嘅品牌'
  const creatorTone =
    form.vertical === 'food'
      ? '開場 hook、轉折、ending 仍然交俾 creator 按自己 audience 節奏發揮；客戶只需要確認必備資訊同實測內容。'
      : '開場 hook、轉折、ending 仍然交俾 creator 保留個人創意；客戶主要確認內容範圍、時間同交付要求。'

  return {
    headline: `${brand} 製作與交付確認`,
    rationale: `呢一步唔再係改 strategy，而係正式鎖定 production handoff。你之前訂閱嘅 marketing 費用，主要係俾你持續跟進 campaign 進度；而家呢個 50% 訂金，先係正式鎖 project、安排拍攝同出 cut 嘅 production deposit。`,
    scopeSummary: [
      `已確認 creator direction、script planning 同 storyboard planning，${brand} 可以正式進入 production 階段。`,
      creatorTone,
      '客戶而家應該先確認拍攝 / 出片時間、製作重點、同埋交片規則，避免之後拍攝前再大改方向。',
    ],
    logisticsChecklist: [
      '預期幾時要出第一輪 watermarked cut',
      '預期幾時拍攝 / 幾時要同製作主任對 shooting details',
      '有冇指定日子、campaign launch deadline 或 marketing 檔期',
      '有冇額外拍攝限制、場地限制、menu / 產品供應時間、或者必須配合嘅營運安排',
    ],
    paymentRules: [
      '確認呢一頁之後，客戶需要支付 50% production deposit，project 先會正式鎖定。',
      '製作主任之後會直接經 WhatsApp 跟進拍攝細節、時間同 production handoff。',
      '之後收到嘅 cut 會一直帶水印，方便你用 marketing 訂閱進度頁一路跟。',
      '直到出片前完成 full payment，我哋先會正式交付無水印版本。',
    ],
    productionSteps: [
      'Step 1：客戶確認製作與交付安排',
      'Step 2：支付 50% production deposit，SOON 正式 lock project',
      'Step 3：製作主任 WhatsApp 跟進拍攝時間、細節、場地 / 產品準備',
      'Step 4：交第一輪 watermarked cut，客戶可持續喺 dashboard 跟進',
      'Step 5：full payment 完成後，正式交付 final version',
    ],
    defaultDeliveryExpectation: form.vertical === 'food' ? '希望 7-10 日內收到第一輪 watermarked cut' : '希望 7 日內收到第一輪 watermarked cut',
    defaultShootWindow: form.vertical === 'food' ? '可於平日夜晚 / 週末下午安排拍攝，並希望拍攝前 2-3 日同製作主任 confirm 細節。' : '希望盡快安排 production handoff，同製作主任對拍攝 / 交付時間。',
    defaultProductionNotes: form.vertical === 'food'
      ? '請先確認 menu / 產品供應時間、店內最適合拍攝時段、可否保留座位 / 場景，以及有冇限定餐點必須入鏡。'
      : '請補充拍攝限制、產品供應安排、場地規則、同任何 launch 前必須配合嘅時間線。',
  }
}

export function buildScriptPlanningPack(form: CampaignFormInput): ScriptPlanningPack {
  const brand = form.businessName || '你嘅品牌'
  const objectiveText =
    form.objective === 'sales'
      ? '帶查詢、DM、WhatsApp 或落單'
      : form.objective === 'reach'
        ? '提高觀看、分享同停留'
        : '建立品牌印象同情緒連結'

  const creatorCreativeDirection =
    form.vertical === 'food'
      ? [
          'Opening Hook 應交俾 creator 根據佢自己 audience 同鏡頭感去發揮，唔需要客戶而家寫死。',
          '轉場應該由 creator 自己決定用「懷疑 / 驚喜 / 親自試」邊種節奏，令條片似佢自己平時會出嘅內容。',
          'Ending 亦應該留返俾 creator 用自己最有說服力嘅收尾方法，外部客戶只需要先定 CTA 方向。',
        ]
      : [
          'Hook / 轉場 / Ending 係 creator creative 範圍，重點係保持佢自己本身最自然、最有 retention 嘅表達方式。',
          'SOON 呢步唔會幫客戶寫死每一句，而係先將重要素材整理清楚，再俾 creator 發揮。',
          '真正要由客戶確認嘅唔係表演方法，而係 backing information 同實測內容到底想帶出乜。',
        ]

  const backingInformation =
    form.vertical === 'food'
      ? {
          corePositioning: `${brand} 最值得被記住嘅唔係全部都好，而係「氣氛 + 招牌甜品 / 主打菜式 + 值得專程去」呢個組合。`,
          strongestSellingPoint: '招牌甜品 / 主打菜式最值得做第一個賣點，因為最易一眼睇得明，亦最容易令觀眾想即刻去試。',
          suitableAudience: '適合朋友聚會、情侶約會、週末打卡，同埋想搵一個有氣氛又有記憶點地方嘅 audience。',
          backgroundNotes: '可補充新開幕、限定 menu、人氣招牌、尖沙咀位置、夜晚氣氛，等 creator 有足夠背景做【背景 VO】。',
        }
      : form.vertical === 'travel'
        ? {
            corePositioning: `${brand} / 呢個行程最值得被記住嘅，係可以用最短時間換到最大體驗感。`,
            strongestSellingPoint: '最強賣點應該先定喺景點驚喜、行程方便，定整體質感體驗，避免每樣平均講。',
            suitableAudience: '適合週末想短逃離、情侶 / 朋友小旅行、重視體驗同打卡感嘅 audience。',
            backgroundNotes: '可補充交通、時間、景點順序、預算、季節性亮點，等【背景 VO】唔會空泛。',
          }
        : form.vertical === 'product'
          ? {
              corePositioning: `${brand} 最重要唔係列晒功能，而係一句講清楚幫觀眾解決咩問題。`,
              strongestSellingPoint: '最強賣點應該先聚焦喺最有感嘅功能 / 差異，而唔係一開始列太多 feature。',
              suitableAudience: '適合本身已經有相關痛點、會主動比較產品、願意睇實測先決定買唔買嘅 audience。',
              backgroundNotes: '可補充品牌定位、常見疑問、使用場景、對比點、價值證明，呢啲都係【背景 VO】最需要嘅素材。',
            }
          : {
              corePositioning: `${brand} 呢次 campaign 想令人記住嘅核心價值，應該先濃縮成一句人話。`,
              strongestSellingPoint: '先揀一個最值得先講嘅賣點，唔好一開始平均分散。',
              suitableAudience: '先清楚講出最適合邊類人，等 creator 唔使自己估 audience。',
              backgroundNotes: '品牌背景、比較點、關鍵資訊、CTA 前置資料，都應該先交代清楚。',
            }

  const testContentItems =
    form.vertical === 'food'
      ? [
          '招牌甜品 / 主打菜式：要影咩、試食時最想帶出咩口感或驚喜。',
          '空間 / 氣氛位：邊個角落、燈光、打卡位值得一定拍。',
          '限定優惠 / 開幕重點：邊一個行動位最值得放入實測內容。',
          '真實反應位：例如第一啖、朋友 / 情侶到場感受、值唔值得專程去。',
        ]
      : form.vertical === 'travel'
        ? [
            '最值得拍嘅景點 / 體驗 1',
            '最值得拍嘅景點 / 體驗 2',
            '觀眾最想知嘅實用位，例如交通、時間、費用',
            '最有驚喜或最值得收藏嘅一幕',
          ]
        : form.vertical === 'product'
          ? [
              '實測項目 1：最能證明產品價值嘅使用場景',
              '實測項目 2：before / after 或對比位',
              '實測項目 3：觀眾最常問嘅問題，用真實使用回應',
              '實測項目 4：最值得帶 CTA 嘅結果或感受',
            ]
          : [
              '實測位 1：最有代表性嘅主角度',
              '實測位 2：一個對比 / 轉折位',
              '實測位 3：觀眾最關心嘅資訊',
              '實測位 4：最直接連到 CTA 嘅一幕',
            ]

  const clientDecisions = [
    `第 2 part【背景 VO】要由客戶先確認 backing information：品牌定位、賣點、比較點、適合邊類 audience。`,
    `第 4 part【實測內容】要由客戶先確認最值得拍 / 試 / 講嘅 4 個位，唔係留俾 creator 自己估。`,
    `Hook / 轉場 / Ending 應留俾 creator 發揮，因為呢啲係內容風格、鏡頭感、表演方式，同 creator 本身最有關。`,
    `所以 external 呢一步最重要唔係寫完整 script，而係先幫客戶交清楚「背景資料」同「實測內容素材」。`,
  ]

  const ctaDirection =
    form.objective === 'sales'
      ? `CTA 應直接導去 DM / WhatsApp / 查詢，唔好太含糊。對 ${brand} 呢次 campaign，最理想係觀眾睇完即刻有下一步。`
      : form.objective === 'reach'
        ? `CTA 可先以收藏、分享、follow 為主，等內容先放大，再由第二輪收轉化。`
        : `CTA 先以 follow、bookmark、記住 ${brand} 為主，建立之後再補轉化內容。`

  return {
    headline: `${brand} 題材與腳本建議`,
    rationale: `而家唔係求一次寫好完整 script，而係先將 internal script system 入面最需要由客戶提供嘅兩塊整理清楚：第 2 part【背景 VO】同第 4 part【實測內容】。至於 Hook、轉場、Ending，應該交返俾 creator 按自己風格同 audience 去發揮。`,
    creatorCreativeDirection,
    backingInformation,
    testContentItems,
    clientDecisions,
    ctaDirection,
  }
}

export function buildStoryboardPlanningPack(form: CampaignFormInput): StoryboardPlanningPack {
  const brand = form.businessName || '你嘅品牌'
  const isFood = form.vertical === 'food'

  return {
    headline: `${brand} storyboard planning`,
    rationale: isFood
      ? '呢一步唔係叫客戶定死 opening hook、轉場同 ending，而係要先揀清楚【背景介紹】同【實測內容】入面邊 7 個 shots 係一定要拍。其餘畫面節奏交返俾 creator 按佢風格去發揮。'
      : '呢一步唔係寫死每一鏡，而係先揀清楚背景介紹同實測內容入面「一定要有」邊幾個 shots，再交俾 creator 排 opening、轉折、ending。',
    creatorCreativeScope: [
      'Opening hook 應該交俾 creator 決定點樣最容易令佢 audience 停低。',
      'Transition / 轉折都應該由 creator 按節奏、鏡頭感同表演方式去設計。',
      'Ending 同 CTA 收尾可以有方向，但最後拍法應留返俾 creator 發揮。',
    ],
    mustHaveShotGroups: isFood
      ? [
          {
            title: '背景介紹 Shots',
            description: '呢 3 個位用嚟交代地點感、背景資訊同品牌 context。客戶揀清楚邊啲一定要有，其餘由 creator 決定。',
            options: [
              { id: 'background-environment', name: '環境鏡頭', description: '廣角拍攝場景全貌，建立地點感。', recommended: true },
              { id: 'background-medium', name: 'Medium shot', description: '主持半身講解背景資訊，例如位置、氣氛、適合咩人去。', recommended: true },
              { id: 'background-text-card', name: '文字卡資訊', description: '加入字幕卡顯示重點資訊，例如新開幕、尖沙咀位置、限定 menu。', recommended: true },
            ],
          },
          {
            title: '實測內容 Shots',
            description: '呢 4 個位用嚟證明最強賣點同真實反應。客戶只需要揀出一定要見到嘅 shots，其餘節奏交俾 creator。',
            options: [
              { id: 'main-product-closeup', name: '產品特寫', description: '近鏡拍攝甜品 / 主打菜式質感同造型。', recommended: true },
              { id: 'main-tasting-closeup', name: '試食／試用特寫', description: '近鏡捕捉第一啖、切開、拉絲、倒醬等一刻。', recommended: true },
              { id: 'main-reaction', name: '反應鏡頭', description: '主持真實反應和表情，令觀眾代入。', recommended: true },
              { id: 'main-data-caption', name: '數據字幕', description: '加入價格、優惠、限定 menu、地點等資訊字幕。', recommended: false },
            ],
          },
        ]
      : [
          {
            title: '背景介紹 Shots',
            description: '背景介紹唔需要太多，但要夠觀眾理解 context。',
            options: [
              { id: 'background-environment', name: '環境鏡頭', description: '建立場景感。', recommended: true },
              { id: 'background-medium', name: 'Medium shot', description: '主持講解背景資訊。', recommended: true },
              { id: 'background-text-card', name: '文字卡資訊', description: '將重點資訊清楚打出。', recommended: true },
            ],
          },
          {
            title: '實測內容 Shots',
            description: '實測內容係最值錢嘅 proof，要揀清楚邊幾個 shots 一定要拍。',
            options: [
              { id: 'main-product-closeup', name: '產品特寫', description: '最有價值嘅細節畫面。', recommended: true },
              { id: 'main-process', name: '使用過程', description: '完整示範產品 / 體驗點樣發生。', recommended: true },
              { id: 'main-reaction', name: '反應鏡頭', description: '真實反應同表情。', recommended: true },
              { id: 'main-data-caption', name: '數據字幕', description: '價格、結果、比較點等資訊。', recommended: false },
            ],
          },
        ],
    visualPriority: isFood
      ? [
          '客戶只需要圈出一定要有嘅背景介紹 shots 同實測內容 shots。',
          'Opening / 轉折 / ending 留返俾 creator 根據自己 audience 去編排。',
          '實測內容 shots 一定要對應最強賣點，而唔係平均分散。',
        ]
      : [
          '客戶先揀 must-have shots，creator 再決定節奏。',
          '背景 shots 服務理解，實測 shots 服務信任同轉化。',
          'Opening / transition / ending 應保留 creator 自由度。',
        ],
    deliveryNotes: [
      '呢一頁確認後，就代表 client 已接受「一定要拍」嘅 shots 範圍。',
      '下一步可以交俾 creator / production 再決定 opening、轉場、ending 同正式 shot order。',
      '之後 dashboard 會進入內容交付階段。',
    ],
  }
}
