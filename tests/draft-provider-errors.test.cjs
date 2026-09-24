const assert=require('node:assert/strict');
const {load}=require('./ts-loader.cjs');
(async()=>{
 const originalFetch=global.fetch;
 try {
  for(const [status,pattern] of [[400,/格式或大小/],[401,/設定或存取/],[403,/設定或存取/],[404,/設定或存取/],[413,/格式或大小/],[429,/額度或請求頻率/],[500,/暫時未能完成/]]) {
   global.fetch=async()=>({ok:false,status,headers:new Headers(),json:()=>{throw new Error('must not read private error body')}});
   const {draftAnthropic}=load('lib/draft-generation-step.ts');
   await assert.rejects(draftAnthropic('test',{},1000),e=>pattern.test(e.message)&&e.status===(status===429?429:502));
  }
  global.fetch=async()=>({ok:true,json:async()=>({content:[]})});
  assert.equal((await load('lib/draft-generation-step.ts').draftAnthropic('test',{},1000)).content.length,0);
 }finally{global.fetch=originalFetch}
 console.log('PASS provider HTTP classification, non-JSON failure handling, successful response');
})().catch(e=>{console.error(e);process.exit(1)});
