const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('app/onboarding/content-studio/page.tsx', 'utf8');
const catalogExample = fs.readFileSync('components/content/CoreCatalogExample.tsx', 'utf8');

assert.doesNotMatch(page, /Brief 已明確指定輪播貼文/u);
assert.doesNotMatch(page, /先睇 Core 母版示範/u);
assert.doesNotMatch(catalogExample, /Core 已發布母版示範 · 非今次內容/u);
assert.match(page, /conciseSlideCountReason\(slideCountReason, recommendedSlideCount\)/u);
assert.match(page, /catalogStyleCache\.get\(cacheKey\)/u);
assert.doesNotMatch(page, /activeStep!=='format'\|\|!workspaceId/u);
assert.match(page, /正在載入內容風格/u);
assert.match(page, /catalog-grid-loading/u);

console.log('PASS format step: concise copy, early style preloading, session reuse and complete loading state');
