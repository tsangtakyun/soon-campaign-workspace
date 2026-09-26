export const DIRECTION_CONTRACT_VERSION = 'direction-framework-v3'

export type ContentCategoryId =
  | 'culture_context'
  | 'practical_value'
  | 'evidence_interpretation'
  | 'case_story'
  | 'brand_decision'
  | 'emotional_resonance'
  | 'debate'
  | 'behind_the_scenes'

export type HookMechanismId =
  | 'counter_intuition'
  | 'curiosity_gap'
  | 'number_tension'
  | 'identity_callout'
  | 'before_after'
  | 'direct_question'
  | 'benefit_promise'
  | 'risk_warning'
  | 'position_conflict'
  | 'unfinished_story'

export type RequiredInput =
  | 'evidence'
  | 'case'
  | 'brand_or_product'
  | 'process'
  | 'timeline'
  | 'comparison'
  | 'controversy'
  | 'audience_emotion'

export type DirectionFramework = {
  id: string
  category: ContentCategoryId
  categoryLabel: string
  mechanism: HookMechanismId
  mechanismLabel: string
  formats: Array<'carousel' | 'single_image' | 'short_video'>
  requiredInputs: RequiredInput[]
  constraints: string[]
  template: string
  example: string
  mechanismDescription: string
}

export type SourceReference = { id: string; label: string; excerpt: string }

const categoryLabels: Record<ContentCategoryId, string> = {
  culture_context: '文化／認知', practical_value: '實用／收藏', evidence_interpretation: '證據解讀',
  case_story: '個案故事', brand_decision: '品牌／產品決策', emotional_resonance: '情緒共鳴',
  debate: '爭議辯論', behind_the_scenes: '幕後過程',
}

export const hookMechanismLabels: Record<HookMechanismId, string> = {
  counter_intuition: '反常識', curiosity_gap: '好奇缺口', number_tension: '數字張力',
  identity_callout: '身份點名', before_after: '前後對比', direct_question: '直接提問',
  benefit_promise: '利益承諾', risk_warning: '風險警示', position_conflict: '立場衝突',
  unfinished_story: '未完成故事',
}

const descriptions: Record<HookMechanismId, string> = {
  counter_intuition: '以違反直覺的發現製造停留，但不可誇大證據。',
  curiosity_gap: '先展示關鍵缺口，令讀者想知道原因或結果。',
  number_tension: '用有來源的數字或差距建立張力，必須交代數字性質。',
  identity_callout: '直接點名一群人的共同經驗，讓受眾覺得內容與自己有關。',
  before_after: '比較兩個時間、狀態或做法的差異。',
  direct_question: '提出具體而有兩面性的問題，不使用萬用問句。',
  benefit_promise: '清楚承諾讀者完成閱讀後可得到的實際價值。',
  risk_warning: '指出容易忽略的風險或錯誤，不製造恐慌。',
  position_conflict: '呈現兩種真正存在的觀點或取捨，鼓勵判斷。',
  unfinished_story: '先交代轉捩點或懸念，再逐步揭示結果。',
}

const allFormats: DirectionFramework['formats'] = ['carousel', 'single_image', 'short_video']

type Row = [string, HookMechanismId, string, string, RequiredInput[]?]

function group(category: ContentCategoryId, constraints: string[], rows: Row[]): DirectionFramework[] {
  return rows.map(([id, mechanism, template, example, requiredInputs = []]) => ({
    id, category, categoryLabel: categoryLabels[category], mechanism, mechanismLabel: hookMechanismLabels[mechanism],
    formats: allFormats,
    requiredInputs, constraints, template, example, mechanismDescription: descriptions[mechanism],
  }))
}

export const CONTENT_DIRECTION_FRAMEWORKS: DirectionFramework[] = [
  ...group('culture_context', ['不可把推測寫成已證實原因；預測必須標明屬推測。'], [
    ['phenomenon-explainer','curiosity_gap','為什麼＿＿突然爆紅？','為什麼全世界都在排隊買 Labubu？'],
    ['origin-story','unfinished_story','＿＿是怎樣紅起來的？','Y2K 風格是怎樣重新紅起來的？'],
    ['timeline-evolution','before_after','＿＿這＿年的演變','香港街頭服飾這 20 年的演變',['timeline']],
    ['little-known-facts','curiosity_gap','關於＿＿，你可能不知道的＿件事','關於波鞋文化，你可能不知道的 7 件事'],
    ['insider-glossary','identity_callout','看懂＿＿圈的＿個術語','看懂球鞋圈的 10 個術語'],
    ['generation-contrast','position_conflict','＿＿ vs ＿＿：同一件事，兩種態度','Z 世代 vs 千禧世代：同樣是懷舊，兩種玩法',['comparison']],
    ['trend-forecast','benefit_promise','＿＿年即將流行的＿個＿＿','2027 年即將流行的 5 個穿搭關鍵字'],
    ['people-behind-trend','unfinished_story','＿＿背後的那個人','那些爆紅聯名背後的設計師',['case']],
    ['opinionated-roundup','position_conflict','＿＿年最具代表性的＿個＿＿','今年最具代表性的 10 個香港品牌聯名'],
    ['cultural-viewpoint','counter_intuition','＿＿，其實反映了＿＿','盲盒熱潮，其實反映了這一代人的孤獨'],
  ]),
  ...group('practical_value', ['數量必須與實際內容相符；不可為配合模板而虛構步驟、工具或結論。'], [
    ['list-promise','benefit_promise','＿個＿＿，一頁一個','7 個讓 IG 帳號看起來更專業的細節'],
    ['step-tutorial','benefit_promise','＿步完成＿＿','5 步拍出餐廳級美食照',['process']],
    ['complete-guide','benefit_promise','＿＿全攻略，一篇整理完','2026 香港新手開店全攻略'],
    ['right-wrong','before_after','＿＿的錯誤示範 vs 正確示範','產品照的錯誤示範 vs 正確示範',['comparison']],
    ['checklist','risk_warning','＿＿前，先檢查這＿項','發文前，先檢查這 8 項'],
    ['formula-framework','benefit_promise','一條公式，寫出＿＿','一條公式，寫出讓人想按讚的文案'],
    ['resource-collection','benefit_promise','＿個＿＿工具，建議收藏','10 個免費 AI 剪片工具，建議收藏'],
    ['type-atlas','identity_callout','＿種＿＿，你是哪一種？','6 種辦公室同事，你是哪一種？'],
    ['ready-template','benefit_promise','直接套用：＿款＿＿範本','直接套用：5 款合作邀約訊息範本'],
    ['myth-busting','counter_intuition','關於＿＿的＿個迷思','關於 IG 演算法的 5 個迷思'],
  ]),
  ...group('evidence_interpretation', [
    '不可將相關寫成因果。', '必須辨認研究設計、樣本、比較組及適用人群。',
    '數字型 Hook 必須確認是相對風險、絕對風險、百分點或其他指標。', '資料未能確認時必須加入人手核實標記。',
  ], [
    ['evidence-meaning','direct_question','＿＿，說明了什麼？','今年聯名款的轉售價，說明了什麼？',['evidence']],
    ['one-chart','benefit_promise','一張圖看懂＿＿','一張圖看懂球鞋轉售市場',['evidence']],
    ['reviewed-reports','number_tension','我們看了＿份＿＿，發現＿＿','我們看了 50 份品牌年報，發現大家都在減少同一件事',['evidence']],
    ['truth-in-numbers','number_tension','＿＿的真相，藏在這＿個數字裡','盲盒熱潮的真相，藏在這 4 個數字裡',['evidence']],
    ['fact-check','counter_intuition','＿＿是真的嗎？我們查證了','「年輕人不再買車」是真的嗎？我們查證了',['evidence']],
    ['data-lens','curiosity_gap','從＿＿看＿＿','從搜尋數據看今年最紅的穿搭',['evidence']],
    ['rise-fall-meaning','number_tension','＿＿上升／下跌，意味著什麼？','二手奢侈品價格下跌，意味著什麼？',['evidence']],
    ['misread-data','counter_intuition','被誤讀的＿＿：數字其實在說＿＿','被誤讀的調查：年輕人不是不消費，而是換了方式',['evidence']],
    ['screenshot-reconstruction','unfinished_story','＿張截圖，還原＿＿','6 張截圖，還原一次品牌公關危機',['evidence']],
    ['report-key-points','benefit_promise','讀懂＿＿的＿個重點','讀懂今年消費趨勢報告的 5 個重點',['evidence']],
  ]),
  ...group('case_story', ['只可使用真實人物、案例、結果與轉捩點；資料不足時不得補寫故事。'], [
    ['business-how','unfinished_story','一間＿＿，如何＿＿','一間街坊茶餐廳，如何在社交平台翻紅',['case']],
    ['from-to-story','before_after','＿＿的故事：從＿＿到＿＿','一個獨立品牌的故事：從網店到海外門市',['case']],
    ['years-to-result','number_tension','他／她用＿年，把＿＿做成＿＿','她用 3 年，把手作飾物做成年銷百萬的品牌',['case']],
    ['failure-case','risk_warning','＿＿為什麼失敗？一個真實案例','網紅餐廳為什麼一年就結業？一個真實案例',['case']],
    ['learn-from-case','benefit_promise','如果你想＿＿，先看看這個案例','如果你想做聯名，先看看這個案例',['case']],
    ['making-of-success','unfinished_story','＿＿是怎樣煉成的','一個爆紅帳號是怎樣煉成的',['case']],
    ['one-decision-change','unfinished_story','一個＿＿，改變了＿＿','一個決定，改變了這間老字號的命運',['case']],
    ['turning-point','unfinished_story','＿＿的轉捩點','一個本地品牌的轉捩點',['case']],
    ['same-why-win','counter_intuition','同樣是＿＿，為什麼他能＿＿？','同樣是開咖啡店，為什麼他能排隊三年？',['case','comparison']],
    ['case-done-right','benefit_promise','拆解＿＿：它做對了哪＿件事','拆解一間小店：它做對了哪 4 件事',['case']],
  ]),
  ...group('brand_decision', ['若品牌沒有公開解釋，只可寫成分析或可能考慮，不可當作內部事實。'], [
    ['brands-all-doing','curiosity_gap','為什麼＿＿都在＿＿？','為什麼大品牌都在推出更便宜的副線？',['brand_or_product']],
    ['business-logic','curiosity_gap','＿＿背後的商業邏輯','限量發售背後的商業邏輯',['brand_or_product']],
    ['decision-roleplay','direct_question','如果你是＿＿，你會怎樣選？','如果你是品牌主理人，你會加價還是縮水？',['brand_or_product']],
    ['right-or-wrong-decision','position_conflict','＿＿這個決定，是對還是錯？','換 logo 這個決定，是對還是錯？',['brand_or_product']],
    ['tradeoffs','position_conflict','＿＿前的＿個取捨','一款產品上市前的 5 個取捨',['brand_or_product']],
    ['rather-than','counter_intuition','為什麼＿＿寧願＿＿，也不＿＿？','為什麼有些品牌寧願斷貨，也不加產？',['brand_or_product']],
    ['problem-behind-change','curiosity_gap','＿＿，其實想解決什麼問題？','品牌改包裝，其實想解決什麼問題？',['brand_or_product']],
    ['pricing-strategy','benefit_promise','看懂＿＿的定價策略','看懂聯名款的定價策略',['brand_or_product']],
    ['market-two-plays','position_conflict','＿＿ vs ＿＿：同一個市場，兩種打法','高端 vs 平價：同一個市場，兩種打法',['brand_or_product','comparison']],
    ['what-went-wrong','risk_warning','＿＿做錯了什麼？','一次失敗的品牌重塑，做錯了什麼？',['brand_or_product']],
  ]),
  ...group('emotional_resonance', ['避免空泛雞湯、情緒操控及未經證實的心理診斷。'], [
    ['only-group-understands','identity_callout','只有＿＿才懂的＿個瞬間','只有香港打工仔才懂的 8 個瞬間',['audience_emotion']],
    ['letter-to-you','identity_callout','致每一個＿＿的你','致每一個在異地生活的你',['audience_emotion']],
    ['understand-when-grown','before_after','長大後才明白的＿件事','長大後才明白的 7 件事',['audience_emotion']],
    ['have-you-ever','direct_question','你有沒有試過＿＿？','你有沒有試過，在人群中突然很想家？',['audience_emotion']],
    ['remember-when','benefit_promise','＿＿時，請記住這＿句話','想放棄的時候，請記住這 5 句話',['audience_emotion']],
    ['those-years','identity_callout','那些年，我們都＿＿','那些年，我們都在茶餐廳做功課',['audience_emotion']],
    ['this-is-for-you','identity_callout','如果你最近＿＿，這篇給你','如果你最近很累，這篇給你',['audience_emotion']],
    ['actually-self-protection','counter_intuition','＿＿，其實是一種＿＿','不想社交，其實是一種自我保護',['audience_emotion']],
    ['emotional-stages','identity_callout','＿＿的＿個階段，你在哪一個？','離開舒適圈的 5 個階段，你在哪一個？',['audience_emotion']],
    ['thank-yourself','unfinished_story','謝謝那個＿＿的自己','謝謝那個沒有放棄的自己',['audience_emotion']],
  ]),
  ...group('debate', ['必須呈現真正存在的兩面觀點；不可為互動而製造假爭議或煽動對立。'], [
    ['worth-it','direct_question','＿＿，到底值不值得？','排隊三小時買聯名，到底值不值得？',['controversy']],
    ['this-or-that','position_conflict','＿＿是＿＿，還是＿＿？','盲盒是收藏，還是賭博？',['controversy']],
    ['support-oppose','position_conflict','支持還是反對＿＿？兩邊的理由都在這裡','支持還是反對 AI 繪圖？兩邊的理由都在這裡',['controversy']],
    ['overrated','counter_intuition','＿＿，是不是被高估了？','網紅餐廳，是不是被高估了？',['controversy']],
    ['should-stop','direct_question','我們應該停止＿＿嗎？','我們應該停止追逐每一個潮流嗎？',['controversy']],
    ['is-it-wrong','direct_question','＿＿，有錯嗎？','為了打卡而旅行，有錯嗎？',['controversy']],
    ['unpopular-opinion','position_conflict','一個不受歡迎的觀點：＿＿','一個不受歡迎的觀點：品牌不需要每天發文',['controversy']],
    ['camp-vs-camp','position_conflict','＿＿派 vs ＿＿派，你站哪一邊？','實體店派 vs 網購派，你站哪一邊？',['controversy']],
    ['long-running-debate','unfinished_story','關於＿＿，大家吵了＿年的問題','關於轉售炒賣，大家吵了十年的問題',['controversy']],
    ['where-is-line','direct_question','＿＿的界線在哪裡？','致敬和抄襲的界線在哪裡？',['controversy']],
  ]),
  ...group('behind_the_scenes', ['只可使用用家提供的製作資料或素材；不可虛構工序、成本、失敗次數或幕後故事。'], [
    ['how-born','unfinished_story','一個＿＿是怎樣誕生的','一款聯名公仔是怎樣誕生的',['process']],
    ['full-process','before_after','從＿＿到＿＿：完整製作過程','從草圖到成品：一件 T-shirt 的完整製作過程',['process']],
    ['unseen-side','curiosity_gap','你看不到的＿＿','你看不到的拍攝現場',['process']],
    ['day-in-life','identity_callout','＿＿的一天','品牌主理人的一天',['process']],
    ['steps-to-make','number_tension','做一個＿＿，要經過＿個步驟','做一條 30 秒廣告，要經過 12 個步驟',['process']],
    ['where-cost-goes','counter_intuition','＿＿的成本，原來花在這裡','一杯手沖咖啡的成本，原來花在這裡',['process']],
    ['failed-before-success','number_tension','＿＿失敗了＿次才成功','這個包裝設計，失敗了 9 次才成功',['process']],
    ['walk-into','curiosity_gap','帶你走進＿＿','帶你走進一間百年醬園',['process']],
    ['before-after-process','before_after','＿＿前 vs ＿＿後','修圖前 vs 修圖後：一張雜誌封面的誕生',['process']],
    ['what-we-did','unfinished_story','為了＿＿，我們做了什麼','為了一個 3 秒鏡頭，我們做了什麼',['process']],
  ]),
]

const signalPatterns: Record<RequiredInput, RegExp> = {
  evidence: /(?:研究|數據|報告|調查|樣本|受訪|百分比|%|統計|截圖|圖表|年報|數字|風險|實驗|觀察研究|論文|BMJ|PLOS|study|report|survey)/iu,
  case: /(?:案例|個案|故事|人物|創辦人|主理人|設計師|品牌|公司|店舖|餐廳|由.{0,20}到|成功|失敗|轉捩點)/iu,
  brand_or_product: /(?:品牌|產品|定價|上市|包裝|logo|商業|市場|聯名|副線|加價|產量|銷售|顧客)/iu,
  process: /(?:過程|步驟|幕後|製作|拍攝|設計|草圖|成品|工序|流程|成本|失敗了|工作日常|素材)/iu,
  timeline: /(?:歷史|演變|年代|年來|年前|時間線|起源|由.{0,20}至|階段)/iu,
  comparison: /(?:比較|對比|差異|兩份|兩個|vs|VS|相較|分別|同樣|前後)/iu,
  controversy: /(?:爭議|支持|反對|兩派|應否|值不值得|高估|界線|批評|辯論|取捨)/iu,
  audience_emotion: /(?:感受|情緒|孤獨|疲倦|壓力|想家|放棄|成長|回憶|共鳴|打工仔|生活|焦慮)/iu,
}

export function detectContentInputs(summary: string): Record<RequiredInput, boolean> {
  return Object.fromEntries(Object.entries(signalPatterns).map(([key, pattern]) => [key, pattern.test(summary)])) as Record<RequiredInput, boolean>
}

export function extractSourceReferences(summary: string): SourceReference[] {
  const chunks = summary
    .split(/\n+|(?<=[。！？!?])\s*/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16)
  return chunks.map((excerpt, index) => ({ id: `S${index + 1}`, label: `用家資料 ${index + 1}`, excerpt: excerpt.slice(0, 220) }))
}

function frameworkScore(framework: DirectionFramework, signals: Record<RequiredInput, boolean>, format?: string) {
  let score = framework.requiredInputs.length ? framework.requiredInputs.filter((key) => signals[key]).length * 4 : 1
  if (!format || framework.formats.includes(format as DirectionFramework['formats'][number])) score += 2
  if (framework.category === 'evidence_interpretation' && signals.evidence) score += 7
  if (framework.category === 'case_story' && signals.case) score += 5
  if (framework.category === 'brand_decision' && signals.brand_or_product) score += 5
  if (framework.category === 'behind_the_scenes' && signals.process) score += 5
  if (framework.category === 'debate' && signals.controversy) score += 4
  if (framework.category === 'emotional_resonance' && signals.audience_emotion) score += 4
  return score
}

export function retrieveDirectionFrameworks(summary: string, format = '', limit = 10): DirectionFramework[] {
  const signals = detectContentInputs(summary)
  const eligible = CONTENT_DIRECTION_FRAMEWORKS
    .filter((framework) => framework.requiredInputs.every((key) => signals[key]))
    .filter((framework) => !format || framework.formats.includes(format as DirectionFramework['formats'][number]))
    .sort((a, b) => frameworkScore(b, signals, format) - frameworkScore(a, signals, format))

  const selected: DirectionFramework[] = []
  const mechanisms = new Set<HookMechanismId>()
  const categoryCounts = new Map<ContentCategoryId, number>()
  for (const framework of eligible) {
    if (selected.length >= limit) break
    const categoryCount = categoryCounts.get(framework.category) || 0
    if (mechanisms.has(framework.mechanism) && categoryCount >= 1) continue
    if (categoryCount >= 2) continue
    selected.push(framework)
    mechanisms.add(framework.mechanism)
    categoryCounts.set(framework.category, categoryCount + 1)
  }
  for (const framework of eligible) {
    if (selected.length >= limit) break
    if (!selected.some((item) => item.id === framework.id)) selected.push(framework)
  }
  return selected
}

export function categoryLabel(category: ContentCategoryId) {
  return categoryLabels[category]
}
