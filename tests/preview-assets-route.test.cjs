const assert=require('node:assert/strict'),{load}=require('./ts-loader.cjs');
let authenticated=true,done=false,modelCalls=0,invalid=false,incomplete=false,writes=0;
const assets=[{id:'one',url:'https://test/one',assignedPage:'auto',isCover:true},{id:'two',url:'https://test/two',assignedPage:'auto'}];
const pages=[1,2,3].map(n=>({page:`P.${n}`,headline:'題目',copyDirection:'內容'}));
const admin={from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{production:{status:'structure_confirmed',assetStatus:'confirmed',pages,assets},updated_at:'rev'}}),update:()=>{writes++;throw Error('no project writes')}};return q}};
process.env.ANTHROPIC_API_KEY='test-only';
class DraftStepError extends Error{constructor(m,status=502){super(m);this.status=status}}
const deps={
 'next/headers':{cookies:async()=>({})},'next/server':{NextResponse:Response},
 '@/lib/server-supabase':{createServerSupabase:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'u'}:null}})}})},
 '@/lib/workspace-access':{getWorkspaceAccess:async()=>({role:'owner',admin})},
 '@/lib/oauth-connections':{isUuid:()=>true},'@/lib/anthropic-models':{anthropicModel:()=> 'configured-model'},
 '@/lib/draft-asset-analysis':{prepareDraftAssets:async()=>({done,assets,completed:1,total:2})},
 '@/lib/draft-generation-step':{DraftStepError,runDraftStep:async(s,k,m,execute,validate)=>{const output=await execute();validate(output);return {output}},draftAnthropic:async()=>{modelCalls++;return {content:[{type:'text',text:JSON.stringify({matches:pages.map(p=>({page:p.page,assetIds:[invalid?'invented':'two'],reason:'畫面相關',headline:'預覽標題',body:incomplete?[]:['完整讀者文案。'],cta:'留言分享'}))})}]}}},
};
(async()=>{
 const {POST}=load('app/api/content-projects/preview-assets/route.ts',deps);
 const post=()=>POST(new Request('https://test',{method:'POST',body:JSON.stringify({workspaceId:'w',projectId:'p'})}));
 authenticated=false;assert.equal((await post()).status,401);authenticated=true;
 assert.equal((await post()).status,202);assert.equal(modelCalls,0);
 done=true;const r=await post();assert.equal(r.status,200);const data=await r.json();assert.equal(data.revision,'rev');assert.equal(data.missing.length,0);assert.equal(data.assets[1].previewPageIds.length,3);assert.equal(writes,0);
 invalid=true;assert.equal((await post()).status,502);assert.equal(writes,0);
 invalid=false;incomplete=true;assert.equal((await post()).status,502);assert.equal(writes,0);
 console.log('PASS: preview matching auth, resumable analysis, validated IDs, revision handoff, no project overwrite');
})().catch(e=>{console.error(e);process.exit(1)});
