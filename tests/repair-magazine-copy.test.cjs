const assert=require('node:assert/strict');
const {load}=require('./ts-loader.cjs');
const {productionCopyIssues}=load('lib/magazine-copy-policy.ts');
const good={page:'P.1',role:'cover',headline:'雪糕與研究',subheadline:'研究摘要',body:['據原帖，相關研究尚待核實'],assetId:'keep',fields:{headline:'舊文'},designDirection:'fixed'};
function harness(make){
 let calls=0;
 const module=load('lib/repair-magazine-copy.ts',{'./draft-generation-step':{
   DraftStepError:class extends Error{},
   draftAnthropic:async(_key,request,timeout)=>{
     calls++;
     assert.equal(timeout,75000);
     assert.equal(request.max_tokens,1800);
     const invalid=JSON.parse(request.messages[0].content.split('\n').at(-1));
     assert.equal(invalid.length,1);
     return {content:[{type:'text',text:JSON.stringify({captionDraft:'',pages:invalid.map(({page})=>make(page,calls))})}]};
   },
   runDraftStep:async(_scope,_key,_model,execute,validate)=>{const output=await execute();validate(output);return {output};},
 }});
 return {run:pages=>module.repairMagazineCopy({},'key','existing-model',pages,{}),calls:()=>calls};
}
(async()=>{
 let h=harness(p=>({...p,headline:'研究仍待核實',body:['不應覆蓋合格正文'],assetId:'wrong'}));
 const original={...good,headline:'這是一個超過十八個字而且需要系統自動精簡的標題'};
 let result=await h.run([original,{...good,page:'P.2'}]);
 assert.equal(result.issues.length,0);assert.equal(h.calls(),1);
 assert.equal(result.pages[0].assetId,'keep');assert.equal(result.pages[0].body[0],good.body[0]);
 assert.equal(result.pages[0].fields.headline,undefined);assert.equal(original.fields.headline,'舊文');
 assert.equal(result.pages[1].headline,good.headline);
 h=harness((p,n)=>({...p,headline:n===3?'研究仍待核實':p.headline}));
 result=await h.run([original]);assert.equal(h.calls(),1);assert.equal(result.issues.length,1);
 result=await h.run(result.pages);result=await h.run(result.pages);assert.equal(h.calls(),3);assert.equal(result.issues.length,0);
 h=harness(p=>p);result=await h.run([original]);assert.equal(h.calls(),1);assert.equal(result.issues.length,1);
 h=harness(p=>({...p,headline:'研究仍待核實'}));
 result=await h.run([original,{...original,page:'P.2'}]);
 assert.equal(result.processedPage,'P.1');assert.equal(result.issues.length,1);assert.equal(result.pages[1].headline,original.headline);
 result=await h.run(result.pages);assert.equal(result.processedPage,'P.2');assert.equal(result.issues.length,0);assert.equal(h.calls(),2);
 h=harness(p=>p);result=await h.run([good]);assert.equal(h.calls(),0);
 assert.ok(productionCopyIssues({...good,headline:'六個中文字標題'},{copy_limits:{headline_chars_zh_max:4}}).length);
 console.log('PASS single-page copy fit: one request/one page, 75s budget, resume skips completed pages, valid copy/assets preserved');
})().catch(e=>{console.error(e);process.exit(1)});
