const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function main(){
 let authorized=true,quota=true,paid=0,finished=0,record=null,boundarySafe=true,reviewSafe=true,boundaryThrows=false;const files=new Map(),queries=[];
 const workspaceId='11111111-1111-4111-a111-111111111111',projectId='22222222-2222-4222-a222-222222222222';
 const admin={from:table=>{let op='read',value,filters=[];const result=()=>{
   queries.push({table,op,filters});
   if(table==='content_projects')return {data:{production:{assets:[{id:'a',url:'https://example.com/photo.png'}]}},error:null};
   if(op==='insert'){record=value;return {data:{id:value.id},error:null};}
   if(op==='update'){record={...record,...value};return {data:{id:record.id},error:null};}
   return {data:record,error:null};
 };const chain={select:()=>chain,eq:(...args)=>{filters.push(args);return chain},maybeSingle:async()=>result(),insert:v=>{op='insert';value=v;return chain},update:v=>{op='update';value=v;return chain},then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};return chain;},storage:{from:()=>({
   download:async path=>({data:files.has(path)?new Blob([files.get(path)]):null}),
   upload:async(path,bytes)=>{files.set(path,bytes);return {error:null}},
   getPublicUrl:path=>({data:{publicUrl:`https://storage.example/${path}`}})
 })}};
 const deps={
  '@/lib/generation-error':{generationError:(e,stage)=>({stage,name:e.name,statusCode:e.statusCode||null,message:e.message})},
  '@/lib/extension-quality':{boundarySchema:{safeParse:v=>({success:!!v}),parse:v=>v},boundariesSafe:v=>v.safe,qualityApproved:v=>v?.approved===true,inspectExtensionBoundaries:async()=>{if(boundaryThrows)throw Object.assign(Error('provider unavailable'),{name:'AI_APICallError',statusCode:503});return {output:{safe:boundarySafe},usage:{totalTokens:10}}},reviewExtension:async()=>({output:{approved:reviewSafe},usage:{totalTokens:10}}),extensionPrompt:()=> 'background only'},
  '@/lib/platform-access':{requireWorkspaceUser:async(id,permission)=>{assert.equal(id,workspaceId);assert.equal(permission,'canEdit');return authorized?{access:{admin,user:{id:'actor'}}}:{error:new Response('',{status:403})}},consumeApiQuota:async()=>quota},
  '@/lib/oauth-connections':{isUuid:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v)},
  '@/lib/background-extension':{EXTENSION_VERSION:'test',loadExtensionSource:async()=>Buffer.from('original'),prepareExtension:async()=>({canvas:Buffer.from('canvas'),mask:Buffer.from('mask'),width:640,height:800,originalHeight:360}),finishExtension:async()=>{finished++;return Buffer.from('final-original-preserved')}},
 };
 const box={exports:{},Buffer,URL,Request,Response,File,FormData,AbortSignal,console,process:{env:{OPENAI_API_KEY:'test-key',OPENAI_IMAGE_MODEL:'test-model'}},require:n=>deps[n]||require(n),fetch:async(url,options)=>{
  paid++;assert.equal(record.status,'pending');assert.ok(options.body.get('mask'));assert.equal(options.body.get('size'),'1024x1536');
  return Response.json({data:[{b64_json:Buffer.from('raw-model-output').toString('base64')}],usage:{total_tokens:100}});
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/content-projects/extend-background/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);
 const post=(extra={})=>box.exports.POST(new Request('https://app.example/api/content-projects/extend-background',{method:'POST',body:JSON.stringify({workspaceId,projectId,assetId:'a',...extra})}));
 assert.equal((await post({workspaceId:'invalid'})).status,400);
 authorized=false;assert.equal((await post()).status,403);assert.equal(paid,0);authorized=true;
 quota=false;assert.equal((await post()).status,429);quota=true;
 const first=await post();assert.equal(first.status,200);const preview=await first.json();
 assert.equal(paid,1);assert.equal(finished,1);assert.equal(record.status,'ready');assert.equal(files.size,2);assert.equal(preview.originalUrl,'https://example.com/photo.png');
 assert.ok(queries.find(q=>q.table==='content_projects').filters.some(([k,v])=>k==='workspace_id'&&v===workspaceId));
 assert.ok(!queries.some(q=>q.table==='content_projects'&&q.op!=='read'),'generation must not modify project');
 assert.equal((await (await post()).json()).cached,true);assert.equal(paid,1);
 record.status='failed';const recovered=await post();assert.equal(recovered.status,200);assert.equal(paid,1,'recover uploaded output without paying again');
 record=null;files.clear();boundarySafe=false;
 assert.equal((await post()).status,422);assert.equal(paid,1,'unsafe edge must not call image generator');assert.equal(record.output.rejected,true);
 assert.equal((await post()).status,422);assert.equal(paid,1,'rejected cache must not retry');
 record=null;files.clear();boundarySafe=true;reviewSafe=false;
 assert.equal((await post()).status,422);assert.equal(paid,2);assert.equal(record.output.rejected,true);
 assert.equal(files.size,1,'rejected raw retained but no final output published');
 assert.equal((await post()).status,422);assert.equal(paid,2,'duplicate subject rejection never regenerates automatically');
 record=null;files.clear();boundaryThrows=true;
 const failed=await post();assert.equal(failed.status,502);const failure=await failed.json();
 assert.equal(failure.stage,'boundary_analysis');assert.equal(failure.runId,record.id);assert.equal(record.output.failures[0].statusCode,503);assert.equal(paid,2);
 console.log('PASS: authentication, quota, workspace scope, pre-call record, masks, persistence, cache/recovery and no project mutation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
