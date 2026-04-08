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
  budgetShapes: string[]
  contentAngles: string[]
  deliverablePlan: string[]
  creatorFit: string[]
  firstWavePlan: string[]
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

  return {
    headline: `${brand} 完整 AI 宣傳方向分析`,
    overview: `${brand} 呢次最應該先集中處理一個主目標，而唔係同時平均分散投放。先用最 fit 嘅 angle 打入市場，再根據反應加碼，會比盲目搵中介同亂出內容更有效率。`,
    budgetShapes: [
      `${preview?.budgetGuide || '以一條主片做第一輪測試'}。`,
      '將預算拆成：主內容、補充 cutdown、必要放大測試，避免一開始所有錢落同一種做法。',
      form.budgetRange === '30000-50000'
        ? '呢個 budget 可考慮加入第二位 creator 或第二輪放大，增加試驗廣度。'
        : '建議先做精第一輪，再按成效決定第二輪加碼。',
    ],
    contentAngles: [
      `${preview?.angleA || '主角度'}會最適合做第一條內容入口。`,
      form.objective === 'sales'
        ? '第二角度建議偏問題 -> 解法，令觀眾更快理解行動理由。'
        : form.objective === 'reach'
          ? '第二角度建議偏驚喜 / reveal，令內容更易被人停低睇完。'
          : '第二角度建議偏 mood / identity，令品牌感覺更完整。',
      'Must include 內提到嘅重點應該自然分散喺片中，而唔係最後一次過塞滿。',
    ],
    deliverablePlan: [
      `${preview?.angleB || '一條主 Reel + 一條補充 cutdown'} 會係最穩陣嘅交付組合。`,
      '主片用嚟講完整故事，cutdown 用嚟補充賣點或者做第二輪分發。',
      form.objective === 'branding'
        ? '如果要建立品牌形象，可加 story / static assets 做視覺延伸。'
        : '如果第一輪表現好，應快速追加一條更直接嘅轉化版本。',
    ],
    creatorFit: [
      form.vertical === 'food'
        ? '優先找擅長食物反應、空間氣氛感、close-up 質感鏡頭嘅 creator。'
        : form.vertical === 'travel'
          ? '優先找擅長地點 reveal、路線感、地方故事包裝嘅 creator。'
          : form.vertical === 'product'
            ? '優先找擅長使用情境同清晰解說嘅 creator。'
            : '優先找擅長體驗式敘事同情緒代入嘅 creator。',
      '第一輪重點唔係數量，而係 creator 同 campaign 氣質夠唔夠 fit。',
      '簡報時應明確寫低：目標、語氣、必帶資訊、可自由發揮範圍。',
    ],
    firstWavePlan: [
      '上線後先睇頭 48 小時反應，特別係儲存、分享、留言同查詢。',
      '將表現最好嘅 angle 再做 cutdown 或小額放大，避免太早分散。',
      '如果要追轉化，CTA 應盡量自然承接，而唔係突然硬 sell。',
    ],
  }
}
