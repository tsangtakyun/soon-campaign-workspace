const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:n=>deps[n]||require("./ts-loader.cjs").resolveImport(n,file,deps)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const {generationError}=load('lib/generation-error.ts');
const diagnostic=generationError({name:'AI_APICallError',statusCode:429,responseBody:JSON.stringify({error:{code:'rate_limit',message:'retry sk-secret123 Bearer secret https://private.test/a user@test.com'}})},'boundary_analysis');
assert.equal(diagnostic.statusCode,429);assert.equal(diagnostic.stage,'boundary_analysis');
assert.ok(!JSON.stringify(diagnostic).includes('secret'));assert.ok(!diagnostic.message.includes('private.test'));assert.ok(!diagnostic.message.includes('user@test.com'));
const {optimizeCarouselAssets}=load('lib/optimize-carousel-assets.ts',{'./extension-asset':load('lib/extension-asset.ts'),'./composition-advice':{compositionAdvice:()=>({action:'extend',placement:{aspectRatio:.8,topFraction:0}})}});
(async()=>{
 const assets=['a','b'].map(id=>({id,url:id,width:640,height:360}));
 const frames=assets.map((a,i)=>({assetId:a.id,page:'P.'+(i+3),frame:{},textZones:[]}));
 const issues=[],saved=[],calls=[];
 const actions={dimensions:async a=>a,analyze:async()=>({}),generate:async id=>{calls.push(id);if(id==='a')throw Object.assign(Error('provider failure'),{runId:'trace',stage:'boundary_analysis'});return {id:'extended',url:'result',originalUrl:'b',width:640,height:800}},progress:()=>{},failure:i=>issues.push(i),checkpoint:async a=>saved.push(a)};
 const result=await optimizeCarouselAssets(assets,frames,actions);
 assert.deepEqual(calls,['a','b']);assert.equal(issues[0].page,'P.3');assert.equal(issues[0].runId,'trace');assert.equal(result[1].extensionId,'extended');assert.equal(saved.length,2);
 calls.length=0;
 await optimizeCarouselAssets(result,frames.filter(f=>f.page==='P.3'),actions);
 assert.deepEqual(calls,['a'],'retry only failed page; successful image not regenerated');
 await assert.rejects(()=>optimizeCarouselAssets(assets,frames,{...actions,checkpoint:async()=>{throw Error('storage failed')}}),/storage failed/);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {BackgroundPreparationNotice}=load('components/content/BackgroundPreparationNotice.tsx');
 const props={state:{status:'needs_attention',issues:[issues[0]]},busy:false,retry:()=>{},keep:()=>{},continueWithOriginals:()=>{}};
 const html=renderToStaticMarkup(React.createElement(BackgroundPreparationNotice,props));
 assert.ok(html.includes('上次成功版本'));assert.ok(html.includes('只重試 P.3'));assert.ok(html.includes('本頁保留原圖'));
 assert.equal(renderToStaticMarkup(React.createElement(BackgroundPreparationNotice,{...props,state:{status:'complete'}})),'');
 console.log('PASS: sanitized provider diagnostics, page isolation, per-page persistence, scoped retry, storage stop, old-version notice');
 if(process.argv.includes('--serve'))require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html><title>Generation recovery test</title><body style="font-family:sans-serif;max-width:850px;margin:40px auto">'+html+'</body></html>')}).listen(4202,'127.0.0.1');
})().catch(e=>{console.error(e);process.exitCode=1});
