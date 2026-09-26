const assert = require('node:assert/strict')
const path = require('node:path')
const { load } = require('./ts-loader.cjs')

const frameworks = load(path.resolve('lib/content-direction-frameworks.ts'))

assert.equal(frameworks.DIRECTION_CONTRACT_VERSION, 'direction-framework-v1')
assert.equal(frameworks.CONTENT_DIRECTION_FRAMEWORKS.length, 80)
assert.equal(new Set(frameworks.CONTENT_DIRECTION_FRAMEWORKS.map((item) => item.category)).size, 8)
assert.equal(new Set(frameworks.CONTENT_DIRECTION_FRAMEWORKS.map((item) => item.mechanism)).size, 10)

const plain = frameworks.retrieveDirectionFrameworks('想介紹一個簡單生活題材', '', 10)
assert.ok(!plain.some((item) => item.category === 'evidence_interpretation'))
assert.ok(!plain.some((item) => item.category === 'behind_the_scenes'))

const evidence = frameworks.retrieveDirectionFrameworks('觀察研究追蹤 48 萬人，報告每週食辣與死亡風險的統計關聯', '', 10)
assert.ok(evidence.some((item) => item.category === 'evidence_interpretation'))
assert.ok(evidence.every((item) => item.requiredInputs.every((input) => frameworks.detectContentInputs('觀察研究追蹤 48 萬人，報告每週食辣與死亡風險的統計關聯')[input])))

const process = frameworks.retrieveDirectionFrameworks('展示廣告由草圖、拍攝、剪接到成品的幕後製作過程', '', 10)
assert.ok(process.some((item) => item.category === 'behind_the_scenes'))

const references = frameworks.extractSourceReferences('第一項研究追蹤 48 萬人。\n第二項研究有 16,179 人。結果只代表相關。')
assert.equal(references.map((item) => item.id).join(','), 'S1,S2,S3')
assert.ok(references[0].excerpt.includes('48 萬人'))

console.log('PASS content direction frameworks: 80 mechanisms are eligibility-filtered with traceable source references')
