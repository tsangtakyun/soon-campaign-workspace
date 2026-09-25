const assert=require('node:assert/strict');
const {load}=require('./ts-loader.cjs');
const {mergeAssignedAssetsIntoDrafts}=load('lib/page-asset-assignments.ts');
const assets=[{id:'left',assignedPage:'P.4'},{id:'right',assignedPage:'P.4'},{id:'other',assignedPage:'P.5'}];
const [page]=mergeAssignedAssetsIntoDrafts([{page:'P.4',role:'comparison',contentRole:'comparison',assetId:'left',assetIds:['left'],assetStatus:'missing',assetRequest:{reason:'missing'}}],assets);
assert.equal(JSON.stringify(page.assetIds),JSON.stringify(['left','right']));assert.equal(page.assetId,'left');assert.equal(page.assetStatus,'matched');assert.equal(page.assetRequest,undefined);
const [narrative]=mergeAssignedAssetsIntoDrafts([{page:'P.4',role:'comparison',contentRole:'narrative',assetIds:['other']}],assets);
assert.equal(JSON.stringify(narrative.assetIds),JSON.stringify(['left']));
console.log('PASS explicit Step 3 page assignments outrank incomplete AI asset ids');
