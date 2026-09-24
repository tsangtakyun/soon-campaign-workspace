const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const project={id:'project',updated_at:'v1',production:{pageDrafts:[{headline:'Headline',assetId:'a'}],assets:[{id:'a',url:'/photo'}]},format_decision:{templateContractSnapshot:{}}};
let authenticated=true,allowed=true,master=true,workspaceScope=false;
const admin={from(table){return {select(){return this},eq(key,value){if(table==='content_projects'&&key==='workspace_id')workspaceScope=value==='workspace';return this},order(){return this},limit(){return this},async maybeSingle(){return {data:table==='content_projects'?project:{name:'Brand'}}}}}};
const deps={
 'next/headers':{cookies:async()=>({})},'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
 '@/lib/oauth-connections':{isUuid:()=>true},'@/lib/server-supabase':{createServerSupabase:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'user',email:'test'}:null}})}})},
 '@/lib/workspace-access':{getWorkspaceAccess:async()=>allowed?{role:'owner',admin}:null},
 '@/lib/content-templates/core-master-template':{getCoreMasterPageDesign:()=>master?{}:null,createCoreMasterCanvas:()=>({objects:[{type:'Textbox',text:'Headline'},{type:'Image',src:'/photo'}]})},
 '@/lib/content-templates/clear-magazine-carousel-v1':{resolveClearMagazineRole:()=> 'cover'},
 '@/lib/content-branding':{resolveContentBranding:()=>({}),findBrandTypeface:()=>null},
};
const box={exports:{},URL,console,require:n=>deps[n]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/content-projects/editor-document/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
const get=()=>box.exports.GET({url:'https://test/api?workspaceId=workspace&projectId=project&page=P.1'});
(async()=>{let r=await get();assert.equal(r.status,200);assert.equal(r.body.canvasJson.objects.length,2);assert.ok(workspaceScope);
 project.production.editorDesigns={'P.1':{canvasJson:{objects:[{type:'Textbox',text:'Saved edit'}]}}};r=await get();assert.equal(r.body.canvasJson.objects[0].text,'Saved edit');
 project.production.editorDesigns['P.1'].canvasJson.objects=[{type:'Image',data:{id:'carousel-generated-design'}}];r=await get();assert.equal(r.body.migrated,true);assert.equal(r.body.canvasJson.objects.length,2);
 master=false;assert.equal((await get()).status,409);allowed=false;assert.equal((await get()).status,403);authenticated=false;assert.equal((await get()).status,401);
 console.log('PASS: scoped loading, saved layers preferred, legacy PNG migration, missing master fails closed, authorization');
})().catch(e=>{console.error(e);process.exitCode=1});
