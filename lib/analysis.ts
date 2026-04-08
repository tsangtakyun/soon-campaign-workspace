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

export function buildAnalysisPreview(form: CampaignFormInput): AnalysisPreview | null {
  if (!form.brief.trim()) return null

  return {
    summary: `${form.businessName || '你嘅品牌'}而家最想要嘅方向係${objectiveText(form.objective)}。系統會根據你填寫嘅內容，極速生成最適合你嘅題材方向，再分析適合點樣做 social media 宣傳。`,
    angleA: form.vertical === 'food'
      ? '值唔值得專程去食'
      : form.vertical === 'travel'
        ? '離開城市半日就去到另一個世界'
        : form.vertical === 'product'
          ? '生活中一用就有感分別'
          : '原來香港仲有呢種體驗',
    angleB: form.vertical === 'product'
      ? '一條偏實測，一條偏情境種草'
      : '一條主 Reel + 一條補充 cutdown',
    budgetGuide: form.budgetRange === '3000-8000'
      ? '適合做單條快狠準測試內容'
      : form.budgetRange === '8000-15000'
        ? '適合做一條主片 + 一條補充內容'
        : form.budgetRange === '30000-50000'
          ? '適合做多 creator 測試、完整 campaign 包裝同更進取放大'
          : '適合做完整 campaign 試驗同多角度內容',
  }
}

export function buildFullAnalysis(form: CampaignFormInput): FullAnalysis {
  const preview = buildAnalysisPreview(form)
  const brand = form.businessName || '你嘅品牌'
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
      `${brand} 呢次建議只集中一個主目標：${objectiveText(form.objective)}，避免 campaign 一開始平均分散火力。`,
      `核心 audience 應先鎖定為 ${audienceHint}，然後所有內容都圍住「點樣令觀眾停低」去設計，而唔係只係介紹你賣緊乜。`,
      `主角度建議以「${preview?.angleA || '主角度'}」切入，第二條角度先再延伸做對比、驚喜或轉化版本。`,
    ],
    contentPlanning: [
      `${preview?.angleB || '一條主 Reel + 一條補充 cutdown'} 會係最合理嘅第一輪 content shape，再按 budget 拉開 hero content 同補充短片比例。`,
      '內容規劃唔止分平台，仲要分節奏：先用爆點內容搶 attention，再用解釋型或信任型內容承接。',
      '每條片都應該有清晰 hook template，Must include 內嘅元素要自然散落喺片中，而唔係最後一次過硬塞。',
    ],
    production: [
      `${preview?.budgetGuide || '先用一條主內容做測試'}，production 重點唔係拍得幾靚，而係每一秒有冇為 retention 設計。`,
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
      'Landing page、link in bio 同 CTA 文案應跟內容 angle 一致，咁先唔會由吸引人去到臨門一腳斷層。',
    ],
    optimization: [
      'Campaign 唔係做一次就完，第一輪上線後應集中睇 retention、儲存、分享、CTR 同查詢質量。',
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
    },
  ]
}

export function buildCampaignProgress(options: {
  paymentStatus?: string | null
  hasFullAnalysis?: boolean
  hasCreatorShortlist?: boolean
}) : CampaignProgress {
  const currentStageIndex: number =
    options.hasCreatorShortlist
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
    { label: '6. 跟進內容交付', status: currentStageIndex === 6 ? '進行中' : '下一步' },
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
