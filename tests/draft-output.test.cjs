const assert=require('node:assert/strict');
const {load}=require('./ts-loader.cjs');
const {readDraftOutput,withDraftFormatRetry,DraftOutputError,draftOutputSchema}=load('lib/draft-output.ts');
const valid={captionDraft:'原有事實',pages:[{headline:'標題',body:['完整段落'],designDirection:'保留圖片'}]};
const response=(value)=>({stop_reason:'end_turn',content:[{type:'text',text:typeof value==='string'?value:JSON.stringify(value)}]});
(async()=>{
 assert.equal(readDraftOutput(response(valid),1).pages[0].headline,'標題');
 for(const bad of ['{"pages":[{"body":["a" "b"]}]}','',JSON.stringify({...valid,pages:[null]})])
   assert.throws(()=>readDraftOutput(response(bad)),DraftOutputError);
 assert.throws(()=>readDraftOutput(response(valid),2),DraftOutputError);
 assert.throws(()=>readDraftOutput({...response(valid),stop_reason:'max_tokens'}),DraftOutputError);
 assert.throws(()=>readDraftOutput(response({...valid,pages:[{...valid.pages[0],body:[12]}]})),DraftOutputError);
 let calls=0;
 assert.equal(await withDraftFormatRetry(async()=>{if(++calls===1)throw new DraftOutputError();return 'ok'}),'ok');
 assert.equal(calls,2);
 calls=0; await assert.rejects(withDraftFormatRetry(async()=>{calls++;throw new DraftOutputError()}),DraftOutputError);assert.equal(calls,2);
 calls=0; await assert.rejects(withDraftFormatRetry(async()=>{calls++;throw new Error('storage failed')}),/storage failed/);assert.equal(calls,1);
 assert.equal(draftOutputSchema.additionalProperties,false);
 assert.equal(draftOutputSchema.properties.pages.items.additionalProperties,false);
 console.log('PASS draft output: structured schema, malformed/truncated/null/wrong-page rejection, bounded format-only retry');
})().catch(error=>{console.error(error);process.exit(1)});
