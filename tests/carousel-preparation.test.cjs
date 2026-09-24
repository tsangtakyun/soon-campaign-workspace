const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(file,deps={}){const box={exports:{},require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const extension=compile('lib/extension-asset.ts');
const {optimizeCarouselAssets}=compile('lib/optimize-carousel-assets.ts',{'./extension-asset':extension,'./composition-advice':{compositionAdvice:({analysis})=>({action:analysis.action,placement:{aspectRatio:.8,topFraction:.5}})}});
async function main(){
 const assets=[{id:'a',url:'original',width:640,height:360},{id:'b',url:'keep',width:640,height:360},{id:'c',url:'restored',width:640,height:360,autoExtensionDeclinedUrl:'restored'}];
 const frames=['a','a','b','c'].map((assetId,i)=>({assetId,page:`P.${i+1}`,frame:{},textZones:[]}));
 const events=[];
 const actions={dimensions:async a=>a,progress:()=>{},analyze:async id=>{events.push(`analyze-${id}`);return {action:id==='a'?'extend':'keep'}},generate:async id=>{events.push(`generate-${id}`);return {id:'result',url:'extended',originalUrl:'original',width:640,height:800}}};
 const result=await optimizeCarouselAssets(assets,frames,actions);events.push('render');
 assert.deepEqual(events,['analyze-a','generate-a','analyze-b','render']);
 assert.equal(result[0].url,'extended');assert.equal(result[0].extensionOriginal.url,'original');assert.equal(assets[0].url,'original');assert.equal(result[2].url,'restored');
 await assert.rejects(()=>optimizeCarouselAssets(assets,frames,{...actions,generate:async()=>{throw Error('provider')}}),/provider/);
 assert.equal(assets[0].url,'original','failure leaves original input untouched');
 const source=fs.readFileSync('app/onboarding/content-studio/page.tsx','utf8');
 assert.ok(source.indexOf('preparedAssets = await optimizeCarouselAssets') < source.indexOf('assets: preparedAssets'));
 assert.ok(source.includes('AI 優化構圖並生成圖片 →'));
 console.log('PASS: extension finishes before render, deduplication, opt-out, original retention and failure stop');
}
main().catch(e=>{console.error(e);process.exitCode=1});
