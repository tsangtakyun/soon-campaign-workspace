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
 assert.equal(JSON.stringify(draftOutputSchema).includes('maxItems'),false);
 for(const labels of [['a','b','c','d'],[12],'invalid'])
   assert.throws(()=>readDraftOutput(response({...valid,pages:[{...valid.pages[0],comparisonLabels:labels}]})),DraftOutputError);
 assert.equal(readDraftOutput(response({...valid,pages:[{...valid.pages[0],comparisonLabels:['原料','製法']}]})).pages[0].comparisonLabels.length,2);
 const comparison=readDraftOutput(response({...valid,pages:[{...valid.pages[0],role:'comparison',body:['左','右','',''],comparisonLabels:['口感'],comparisonRows:[{label:'口感',left:'幼滑；奶味較濃',right:'清爽\n果味較突出'}]}]}));
 assert.equal(comparison.pages[0].body[2],'幼滑，奶味較濃');
 assert.equal(comparison.pages[0].body[3],'清爽，果味較突出');
 assert.equal(draftOutputSchema.properties.pages.items.additionalProperties,false);
 console.log('PASS draft output: structured schema, malformed/truncated/null/wrong-page rejection, bounded format-only retry');
})().catch(error=>{console.error(error);process.exit(1)});
