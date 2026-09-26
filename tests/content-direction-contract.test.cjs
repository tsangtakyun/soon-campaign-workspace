const assert = require('node:assert/strict')
const fs = require('node:fs')

const route = fs.readFileSync('app/api/content-directions/recommend/route.ts', 'utf8')
const page = fs.readFileSync('app/onboarding/content-studio/page.tsx', 'utf8')

for (const text of [
  'DIRECTION_CONTRACT_VERSION',
  'frameworkCandidates',
  'sourceReferences',
  'payload?.directionContractVersion === DIRECTION_CONTRACT_VERSION',
  'hasDirectionDiversity',
  '3 個方向必須使用 3 種不同 primaryHookMechanism',
  '至少來自 2 種 categoryId',
  '最多只可有 1 個 hook 以問號結尾',
  '相對風險／絕對風險／百分點',
  '自然、直接的香港廣東話書面語',
  'title 是觀眾會在封面看見的主 Hook',
  '12 至 22 個中文字',
  'weakHeadlinePattern',
  'hasStrongAudienceHooks',
  '反而',
  'title 只准一個主句',
  '具體行為＋反而＋意外結果＋問號',
  'overColloquialTitlePattern',
  '的人／降低／增加／差幾遠／弄清楚',
  'polishCoverTitle',
  ".replace(/嘅人/gu, '的人')",
  ".replace(/差咗幾遠/gu, '差幾遠')",
  ".replace(/風險真係低(?=\\d)/gu, '風險真係降低')",
  ".replace(/？.+$/u, '？')",
  '問號後不可再加解說',
  'titleFor',
]) assert.ok(route.includes(text), text)

for (const removed of ['You are SOON, a senior Hong Kong content strategist', '你是否也遇過這個問題？', '大家一直以為如此']) {
  assert.ok(!route.includes(removed), removed)
}

for (const text of [
  'hookMechanism',
  '內容依據',
  '製作前核實',
  '封面題目',
  'frameworkId: selectedRecommendation?.frameworkId',
  'primaryHookMechanism: selectedRecommendation?.primaryHookMechanism',
  'verificationFlags: selectedRecommendation?.verificationFlags',
]) assert.ok(page.includes(text), text)

assert.ok(!page.includes('<strong>製作進度</strong>'))
assert.ok(!page.includes('{current ? <em>目前</em> : null}'))
assert.ok(page.includes('grid-template-columns:repeat(2,minmax(0,1fr))'))

console.log('PASS content direction contract: Core is version-gated and selection provenance is visible and recorded')
