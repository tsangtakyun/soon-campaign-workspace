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
    cta: '了解分析服務',
    highlight: false,
    trialDays: 7,
    trialCredits: 120,
    monthlyCredits: 120,
    weeklyPlanningCredits: 120,
    features: [
      '整理品牌目前最值得測試的宣傳方向',
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
    cta: '申請試用',
    highlight: true,
    trialDays: 7,
    trialCredits: 200,
    monthlyCredits: 800,
    weeklyPlanningCredits: 200,
    features: [
      '由內容方向、製作、審批到排程集中管理',
      '將 winning angle 變成腳本、分鏡與交付清單',
      '不用每次 campaign 都由零開始規劃',
      '用數據回饋下一輪內容，慢慢降低試錯成本',
    ],
  },
  {
    id: 'creator-campaign',
    label: '需要專人一同推進',
    name: '專人增長方案',
    price: '度身訂造',
    cadence: '',
    cta: '與專人傾方案',
    highlight: false,
    trialDays: 0,
    trialCredits: 0,
    monthlyCredits: 2000,
    weeklyPlanningCredits: 500,
    features: [
      '先由專人了解品牌目標、現況與需要',
      '共同將策略變成可執行的 campaign',
      '按需要協調創作者、brief、製作及發布',
      '定期檢討表現，再商量下一步應該點做',
    ],
  },
]

export function getPricingPlan(planId?: string | null) {
  return pricingPlans.find((plan) => plan.id === planId) || pricingPlans[1]
}
