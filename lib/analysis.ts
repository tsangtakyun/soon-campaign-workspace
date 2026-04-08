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
