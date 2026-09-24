const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const box={exports:{},setTimeout};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/automatic-extension.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
const {automaticExtension:run}=box.exports;
async function main(){
 const records=new Map(),storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
 let calls=0;
 await Promise.all([run('a',()=>true,async()=>{calls++},storage),run('a',()=>true,async()=>{calls++},storage)]);
 assert.equal(calls,1);
 await run('a',()=>true,async()=>{calls++},storage);assert.equal(calls,1,'remount does not regenerate');
 await run('restored',()=>false,async()=>{calls++},storage);assert.equal(calls,1);assert.equal(records.has('restored'),false);
 await assert.rejects(run('failed',()=>true,async()=>{calls++;throw Error('provider')},storage));
 await run('failed',()=>true,async()=>{calls++},storage);assert.equal(calls,2,'failed jobs require explicit retry');
 const order=[];
 await Promise.all([run('b',()=>true,async()=>{order.push('b-start');await new Promise(r=>setTimeout(r,5));order.push('b-end')},storage),run('c',()=>true,async()=>order.push('c'),storage)]);
 assert.deepEqual(order,['b-start','b-end','c']);
 await assert.rejects(run('blocked',()=>true,async()=>{calls++},{getItem:()=>{throw Error('storage')},setItem:()=>{}}));assert.equal(calls,2);
 console.log('PASS: automatic jobs deduplicated, serialized, refresh-safe, opt-out and failure guarded');
}
main().catch(e=>{console.error(e);process.exitCode=1});
