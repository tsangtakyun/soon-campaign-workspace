const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(source,deps,globals={}){const box={exports:{},Request,Response,Error,Date,console,process:{env:{ANTHROPIC_API_KEY:'test'}},...globals,require:n=>{if(!(n in deps))throw new Error(n);return deps[n]}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
async function main(){
let authorized=true,assetDone=false,calls=0,stale=false,fail=false;
const project={id:'p',updated_at:'t1',title:'Bear',selected_format:'single_image',format_decision:{confirmedInputHash:'valid'},production:{status:'structure_confirmed',assetStatus:'confirmed',assets:[],pages:[{page:'P.1'}]}};
const admin={from(table){let write,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},update(v){write=v;return q},single(){return Promise.resolve(run())},maybeSingle(){return Promise.resolve(run())},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject)}};function run(){if(table==='content_projects'){if(write){if(filters.some(([k,v])=>k==='updated_at'&&v!==project.updated_at))return {error:new Error('stale')};Object.assign(project,write)}return {data:{...project}}}if(table==='workspace_prompt_versions')return {data:{production_prompt:'Use verified facts'}};return {data:null}}return q}};
class StepError extends Error{constructor(message,status){super(message);this.status=status}}
const deps={
'@/lib/verified-request-user':{RequestAuthError:StepError,verifiedRequestUser:async()=>{if(!authorized)throw new StepError('unauthorized',401);return{id:'user'};}},
'@/lib/repair-magazine-copy':{repairMagazineCopy:async()=>{throw Error('not used')}},
'@/lib/magazine-copy-policy':{magazineCopyInstruction:'',magazineCopyIssues:()=>[]},
'@/lib/editorial-page-guidance':{EDITORIAL_PAGE_GUIDANCE:''},
'@/lib/approved-video-duration':{approvedVideoDuration:()=>20},
'@/lib/draft-asset-analysis':{prepareDraftAssets:async()=>({done:assetDone,assets:[],completed:1,total:2})},
'@/lib/draft-generation-step':{DraftStepError:StepError,draftAnthropic:async()=>{calls++;if(fail)throw new StepError('saved progress',504);if(stale)project.updated_at='t2';return {content:[{type:'text',text:JSON.stringify({captionDraft:'Facts',pages:[{headline:'Bear',body:['Facts'],designDirection:'Large photo'}]})}]}},runDraftStep:async(s,k,m,execute,validate)=>{const output=await execute();validate(output);return {id:'run',output}}},
'@/lib/project-style-context':{projectStyleContext:()=>({inputHash:'valid'}),confirmedStyleHash:()=> 'valid',projectBrand:async()=>({})},
'next/headers':{cookies:async()=>({})},'next/server':{NextResponse:Response},
'@/lib/anthropic-models':{anthropicModel:()=> 'model'},'@/lib/oauth-connections':{isUuid:()=>true},
'@/lib/server-supabase':{createServerSupabase:()=>({auth:{getUser:async()=>({data:{user:authorized?{id:'user'}:null}})}})},
'@/lib/workspace-access':{getWorkspaceAccess:async()=>({role:'owner',admin})},
'@/lib/content-style-library':{contentStylePromptFromDecision:()=> 'style'},
'@/lib/content-templates/clear-magazine-carousel-v1':{isClearMagazineCarousel:()=>false},
'@/lib/core-template-contract':{isFixedCoreTemplate:()=>false,coreTemplatePageRoles:()=>[],applyCoreTemplateStructure:p=>p}
};
deps['@/lib/page-asset-assignments']={mergeAssignedAssetsIntoDrafts:p=>p};
deps['@/lib/draft-generation-step'].draftRequestBudget=()=>150000;
deps['@/lib/draft-output']=compile(fs.readFileSync('lib/draft-output.ts','utf8'),{'./draft-generation-step':{DraftStepError:StepError}});
const route=compile(fs.readFileSync('app/api/content-projects/generate-drafts/route.ts','utf8'),deps);
const post=phase=>route.POST(new Request('https://test/api',{method:'POST',body:JSON.stringify({workspaceId:'w',projectId:'p',phase})}));
authorized=false;assert.equal((await post('assets')).status,401);authorized=true;
assert.equal((await post('assets')).status,202);assert.equal(calls,0,'asset phase cannot call draft model');
assetDone=true;assert.equal((await (await post('assets')).json()).phase,'drafts');assert.equal(calls,0);
fail=true;assert.equal((await post('drafts')).status,504);assert.equal(project.production.pageDrafts,undefined);fail=false;
const result=await post('drafts');assert.equal(result.status,200);assert.equal(project.production.pageDrafts.length,1);
const preserved=project.production;stale=true;assert.equal((await post('drafts')).status,409);assert.equal(project.production,preserved,'concurrent edits are never overwritten');stale=false;
console.log('PASS: scoped auth, separate asset/draft requests, no draft call in asset phase, timeout preserves project, successful draft save');

const source=fs.readFileSync('app/onboarding/content-studio/page.tsx','utf8');
const fn=source.slice(source.indexOf('  async function generatePageDrafts('),source.indexOf('  async function regeneratePageDrafts()'));
let messages=[],phases=[],went,projectSaved;const replies=[{continue:true,phase:'assets',completed:1,total:2},{continue:true,phase:'drafts',completed:2,total:2},{project:{id:'p',production:{pageDrafts:[{}]}}}];
const exports=compile(fn+'\nexports.generatePageDrafts=generatePageDrafts;',{}, {workspaceId:'w',selected:{id:'p'},draftRequestBusy:{current:false},setSaving:()=>{},setMessage:m=>messages.push(m),setProjects:fn=>{projectSaved=fn([{id:'p'}])},goToStep:s=>went=s,fetch:async(u,init)=>{phases.push(JSON.parse(init.body).phase);return Response.json(replies.shift())}});
await exports.generatePageDrafts();assert.deepEqual(phases,['assets','assets','drafts']);assert.equal(went,'drafts');assert.equal(projectSaved[0].production.pageDrafts.length,1);assert.ok(messages.some(m=>m.includes('1/2')));assert.ok(messages.some(m=>m.includes('2/2')));
console.log('PASS: UI drives resumable phases, displays progress, advances only after persisted draft success');
}
main().catch(error=>{console.error(error);process.exitCode=1});
