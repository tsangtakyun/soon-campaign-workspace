const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
let request;
function load(file,deps={}){const box={exports:{},Buffer,Error,Date,AbortSignal,fetch:(...args)=>request(...args),require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);return box.exports;}
function database(){const rows=new Map();return {rows,from(){let action='read',values,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},insert(v){action='insert';values=v;return q},update(v){action='update';values=v;return q},maybeSingle(){return Promise.resolve(run())},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject)}};function run(){if(action==='insert'){if(rows.has(values.id))return {error:{code:'23505'}};rows.set(values.id,{...values});return {data:rows.get(values.id)}}const found=[...rows.values()].find(row=>filters.every(([k,v])=>row[k]===v));if(action==='update'&&found)Object.assign(found,values);return {data:found||null,error:null}}return q}}}
async function main(){
const helper=load('lib/draft-generation-step.ts'),admin=database(),scope={admin,workspaceId:'w',projectId:'p',actorId:'a'};
assert.equal(helper.draftRequestBudget(1000,1000),150000);
assert.equal(helper.draftRequestBudget(1000,71000),80000,'format retry shares total budget');
assert.throws(()=>helper.draftRequestBudget(1000,147000),error=>error.status===504);
let calls=0;const execute=async()=>{calls++;return {response:{text:'ok'},usage:{input_tokens:1,output_tokens:2}}};
const first=await helper.runDraftStep(scope,{kind:'test'},'model',execute);
assert.equal(calls,1);assert.equal(first.output.completed,true);assert.equal(admin.rows.get(first.id).status,'ready');
assert.equal((await helper.runDraftStep(scope,{kind:'test'},'model',execute)).cached,true);assert.equal(calls,1);
assert.notEqual(helper.draftStepId(scope,{}),helper.draftStepId({...scope,workspaceId:'other'},{}),'tenant isolation');
let release;const paused=new Promise(resolve=>release=resolve);
const running=helper.runDraftStep(scope,{kind:'concurrent'},'model',async()=>{await paused;return {ok:true}});
await new Promise(resolve=>setImmediate(resolve));
await assert.rejects(()=>helper.runDraftStep(scope,{kind:'concurrent'},'model',execute),error=>error.status===409);
release();await running;
await assert.rejects(()=>helper.runDraftStep(scope,{kind:'fail'},'model',async()=>{throw new Error('timeout')}),/timeout/);
await helper.runDraftStep(scope,{kind:'fail'},'model',execute);
await assert.rejects(()=>helper.runDraftStep(scope,{kind:'bad-json'},'model',execute,()=>{throw new Error('invalid')}),/invalid/);
const bad=admin.rows.get(helper.draftStepId(scope,{kind:'bad-json'}));assert.equal(bad.output.completed,false);assert.ok(bad.output.usage,'retain usage even when validation fails');
await helper.runDraftStep(scope,{kind:'bad-json'},'model',execute);
request=async()=>{const error=new Error('timeout');error.name='TimeoutError';throw error};
await assert.rejects(()=>helper.draftAnthropic('key',{},10),error=>error.status===504&&!error.message.includes('TimeoutError'));

const image=await sharp({create:{width:1400,height:800,channels:3,background:'#567abc'}}).jpeg().toBuffer();
let imageCalls=0,aiCalls=0,failNext=false;
const analysis=load('lib/draft-asset-analysis.ts',{'./draft-generation-step':helper,'./safe-external-url':{fetchSafeExternal:async()=>{imageCalls++;return new Response(image,{headers:{'content-type':'image/jpeg'}})}}});
request=async(url,init)=>{aiCalls++;if(failNext){failNext=false;const e=new Error('timeout');e.name='TimeoutError';throw e}const body=JSON.parse(init.body);const sent=Buffer.from(body.messages[0].content[0].source.data,'base64');assert.ok((await sharp(sent).metadata()).width<=1024);return Response.json({content:[{type:'text',text:JSON.stringify({subject:'bear',scene:'water'})}],usage:{input_tokens:12,output_tokens:4}})};
const assets=[{id:'one',url:'https://example.test/one.jpg'},{id:'two',url:'https://example.test/two.jpg'}];
let state=await analysis.prepareDraftAssets(scope,'key',assets);assert.equal(state.completed,1);assert.equal(state.done,false);
failNext=true;await assert.rejects(()=>analysis.prepareDraftAssets(scope,'key',assets),error=>error.status===504);
state=await analysis.prepareDraftAssets(scope,'key',assets);assert.equal(state.completed,2);assert.equal(state.done,true);assert.equal(state.assets[1].visualAnalysis.subject,'bear');
state=await analysis.prepareDraftAssets(scope,'key',assets);assert.equal(state.done,true);assert.equal(state.assets[0].visualAnalysis.subject,'bear');assert.equal(aiCalls,3);assert.equal(imageCalls,3,'retry only downloads unfinished image');
await analysis.prepareDraftAssets(scope,'key',assets);assert.equal(aiCalls,3,'refresh reuses all completed analysis');
console.log('PASS: durable steps, cache, scope isolation, concurrent claim, failure recovery, invalid-output persistence, friendly timeout, bounded images, phase resume');
}
main().catch(error=>{console.error(error);process.exitCode=1});
