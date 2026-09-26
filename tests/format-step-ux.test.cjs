const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('app/onboarding/content-studio/page.tsx', 'utf8');
const catalogExample = fs.readFileSync('components/content/CoreCatalogExample.tsx', 'utf8');
const structureRoute = fs.readFileSync('app/api/content-projects/generate-structure/route.ts', 'utf8');

assert.doesNotMatch(page, /Brief 已明確指定輪播貼文/u);
assert.doesNotMatch(page, /先睇 Core 母版示範/u);
assert.doesNotMatch(catalogExample, /Core 已發布母版示範 · 非今次內容/u);
assert.match(page, /catalogStyleCache\.get\(cacheKey\)/u);
assert.doesNotMatch(page, /activeStep!=='format'\|\|!workspaceId/u);
assert.match(page, /正在載入內容風格/u);
assert.match(page, /catalog-grid-loading/u);
assert.doesNotMatch(page, /className="slide-count-recommendation"/u);
assert.doesNotMatch(page, /Array\.from\(\{ length: 8 \}/u);
assert.match(page, /title="SOON 正在繼續製作"/u);
assert.doesNotMatch(page, /正在重新整理 \$\{carouselSlideCount\} 頁內容/u);
assert.doesNotMatch(structureRoute, /Number\(formatDecision\.slideCount\) \|\| 5/u);
assert.match(structureRoute, /按真正可拆分的獨立重點決定 3 至 10 頁/u);
assert.match(structureRoute, /slideCount: generatedPageCount/u);

console.log('PASS format step: SOON decides page count, early style preloading and shared continuation loading');
