const assert=require('node:assert/strict'),{load}=require('./ts-loader.cjs');
const {validPreviewCopy}=load('lib/preview-copy-policy.ts');
assert.ok(validPreviewCopy({headline:'封面',body:['短副題'],cta:''},0,3));
assert.ok(!validPreviewCopy({headline:'封面',body:['副題','不應有段落'],cta:''},0,3));
assert.ok(!validPreviewCopy({headline:'封面',body:['字'.repeat(25)],cta:''},0,3));
assert.ok(validPreviewCopy({headline:'內文',body:['第一段','第二段'],cta:''},1,3));
assert.ok(!validPreviewCopy({headline:'收尾',body:['摘要'],cta:''},2,3));
const {optimizeCarouselAssets}=load('lib/optimize-carousel-assets.ts',{'./composition-advice':{compositionAdvice:()=>({action:'review',reason:'unsupported frame'})}});
(async()=>{
 const asset={id:'a',url:'photo',width:700,height:1000,compositionMode:'ai'};
 const frames=[{assetId:'a',page:'P.1',frame:{x:0,y:0,width:1080,height:1350},textZones:[]}];
 let issues=[],calls=0;
 const actions={dimensions:async()=>asset,analyze:async()=>({focus:null}),generate:async()=>{calls++;throw Error('must not generate')},progress:()=>{},failure:i=>issues.push(i)};
 const result=await optimizeCarouselAssets([asset],frames,actions);
 assert.equal(issues.length,1);assert.equal(issues[0].code,'COMPOSITION_NEEDS_REVIEW');assert.equal(calls,0);
 issues=[];await optimizeCarouselAssets(result,frames,actions);assert.equal(issues.length,1,'cached contain is not success');
 issues=[];await optimizeCarouselAssets(result.map(a=>({...a,autoExtensionDeclinedUrl:a.url})),frames,actions);assert.equal(issues.length,0,'explicit original acceptance is respected');
 console.log('PASS: role copy budgets, incomplete/unsupported and cached outcomes remain needs-review, explicit acceptance');
})().catch(e=>{console.error(e);process.exitCode=1});
