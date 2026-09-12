export type ContentStyleTemplate = {
  code: string
  version: number
  name: string
  note: string
  formats: string[]
  tone: string
  palette: [string, string, string]
  rules: {
    structure: string[]
    copy: string[]
    visual: string[]
    byFormat: Record<string, string[]>
  }
}

export const contentStyleTemplates: ContentStyleTemplate[] = [
  { code: 'editorial-clear', version: 1, name: '清晰雜誌風', note: '大標題、留白及清楚的資訊層次', formats: ['carousel', 'single_image'], tone: '專業・易讀', palette: ['#f6f2eb', '#6b2c30', '#c7e63a'], rules: { structure: ['先交代核心問題，再用證據逐步解釋', '每個畫面只處理一個訊息'], copy: ['標題具體而克制', '避免空泛形容及過度煽情'], visual: ['使用清楚網格、大量留白及明確層級', '重點數字或短句可放大'], byFormat: { carousel: ['首張提出問題，末張提供結論或行動'], single_image: ['只保留一個主標題及一個支持訊息'] } } },
  { code: 'product-focus', version: 1, name: '產品主角', note: '突出產品、功能及一個主要賣點', formats: ['carousel', 'single_image', 'short_video'], tone: '直接・商業', palette: ['#ffffff', '#202126', '#d9bbb5'], rules: { structure: ['產品與核心賣點必須在開首出現', '由功能連接到具體使用情境'], copy: ['只突出一個主要承諾', '所有產品聲稱必須有資料支持'], visual: ['產品保持清晰、比例可信及包裝一致', '背景只支援產品，不搶去焦點'], byFormat: { carousel: ['由賣點、證據、情境到 CTA'], single_image: ['產品、主要賣點及 CTA 構成單一視覺層級'], short_video: ['首三秒展示產品或結果，再解釋原因'] } } },
  { code: 'problem-solution', version: 1, name: '問題與解決方案', note: '先呈現痛點，再逐步交代解決方法', formats: ['carousel', 'short_video'], tone: '實用・有說服力', palette: ['#fff4cf', '#202126', '#b46a61'], rules: { structure: ['先讓受眾認出問題，再提出解法', '解法必須具體、可執行及有因果關係'], copy: ['使用受眾會說的問題句', '避免製造不必要恐慌'], visual: ['問題與解法使用清楚視覺對比', '以步驟、前後或標記輔助理解'], byFormat: { carousel: ['問題、原因、解法、證據、行動逐頁推進'], short_video: ['前三秒呈現痛點，主體示範解法'] } } },
  { code: 'creator-natural', version: 1, name: 'Creator 日常感', note: '自然生活場景、第一身分享及真實語氣', formats: ['single_image', 'short_video'], tone: '親切・自然', palette: ['#efe8df', '#4d2023', '#8ca67a'], rules: { structure: ['以第一身經驗或日常瞬間切入', '保留自然反應，不寫成硬銷廣告'], copy: ['句子簡短自然，容許適量口語', '清楚標示真實體驗與品牌聲稱的分別'], visual: ['使用可信生活環境及自然光感', '人物動作應實際可拍攝'], byFormat: { single_image: ['以一個生活瞬間帶出產品用途'], short_video: ['提供自然對白、動作及可執行拍攝清單'] } } },
  { code: 'bold-social', version: 1, name: '社交媒體重點式', note: '強烈開場、短句及高辨識度畫面', formats: ['carousel', 'single_image', 'short_video'], tone: '鮮明・有節奏', palette: ['#202126', '#f6d260', '#ffffff'], rules: { structure: ['第一畫面立即交代反差或最強重點', '後續內容快速回答開場問題'], copy: ['短句優先，每句有明確資訊', '強烈但不誇大或誤導'], visual: ['使用高對比層級及單一視覺焦點', '手機尺寸下標題必須快速可讀'], byFormat: { carousel: ['每頁形成節奏轉折'], single_image: ['主標題在三秒內可讀完'], short_video: ['首三秒 Hook，鏡頭轉換配合資訊節奏'] } } },
]

export function getContentStyle(code: unknown) {
  return contentStyleTemplates.find((template) => template.code === code) || contentStyleTemplates[0]
}

export function contentStyleRulePrompt(code: unknown, format: unknown) {
  const style = getContentStyle(code)
  const formatKey = typeof format === 'string' ? format : ''
  return [`Style：${style.name} v${style.version}`, `語氣：${style.tone}`, ...style.rules.structure, ...style.rules.copy, ...style.rules.visual, ...(style.rules.byFormat[formatKey] || [])].map((rule) => `- ${rule}`).join('\n')
}
