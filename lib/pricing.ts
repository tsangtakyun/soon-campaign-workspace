export type PricingPlan = {
  id: string
  label: string
  name: string
  price: string
  cadence: string
  cta: string
  highlight: boolean
  trialDays: number
  trialCredits: number
  monthlyCredits: number
  weeklyPlanningCredits: number
  features: string[]
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'ai-strategy',
    label: '適合首次測試',
    name: 'AI 宣傳分析',
    price: 'HK$199',
    cadence: '/ 次',
    cta: '開始 7 日試用',
    highlight: false,
    trialDays: 7,
    trialCredits: 120,
    monthlyCredits: 120,
    weeklyPlanningCredits: 120,
    features: [
      '120 credits，可製作一輪輕量測試內容',
      '知道你的廣告費應該先打哪個方向',
      '找出最容易帶來查詢的內容角度',
      '得到一份可直接執行的首輪宣傳建議',
    ],
  },
  {
    id: 'growth-workspace',
    label: '最適合持續宣傳',
    name: '內容策略工作台',
    price: 'HK$799',
    cadence: '/ 月',
    cta: '開始 7 日試用',
    highlight: true,
    trialDays: 7,
    trialCredits: 200,
    monthlyCredits: 800,
    weeklyPlanningCredits: 200,
    features: [
      '每月 800 credits，足夠每週持續測試內容組合',
      '將 winning angle 變成腳本、分鏡與交付清單',
      '不用每次 campaign 都由零開始規劃',
      '用數據回饋下一輪內容，慢慢降低試錯成本',
    ],
  },
  {
    id: 'creator-campaign',
    label: '需要團隊代執行',
    name: 'SOON 代營運',
    price: 'HK$4,999',
    cadence: '/ 月起',
    cta: '聯絡我們',
    highlight: false,
    trialDays: 0,
    trialCredits: 0,
    monthlyCredits: 2000,
    weeklyPlanningCredits: 500,
    features: [
      '每月 2,000 credits 起，按實際代營運範圍調整',
      '由 SOON 協助你把策略變成實際 campaign',
      '代你處理創作者方向、brief 與製作協調',
      '每月檢討結果，決定下一筆廣告費怎樣放大',
    ],
  },
]

export function getPricingPlan(planId?: string | null) {
  return pricingPlans.find((plan) => plan.id === planId) || pricingPlans[1]
}
