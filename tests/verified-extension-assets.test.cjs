const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,require){const box={exports:{},require};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const quality=load('lib/extension-quality.ts',n=>n==='ai'||n==='@ai-sdk/anthropic'?{}:n==='./ai-subject-focus'?{SUBJECT_MODEL:'test'}:require(n));
const {verifiedExtensionAssets:verify}=load('lib/verified-extension-assets.ts',n=>n==='./extension-quality'?quality:{EXTENSION_VERSION:'current'});
const asset={id:'asset',url:'extended',extensionId:'run',extensionOriginal:{url:'original',width:640,height:400}};
const run={id:'run',status:'ready',input:{kind:'current',assetId:'asset'},output:{url:'extended',review:{confidence:'high',addedSubject:false,duplicatedSubject:false,unnaturalReflection:false,environmentMatches:true,seamNatural:true,reason:'checked'}}};
assert.equal(verify([asset],[run]).assets[0].url,'extended');
for(const bad of [null,{...run,input:{...run.input,kind:'old'}},{...run,status:'failed'},{...run,output:{...run.output,url:'different'}},{...run,output:{...run.output,review:{...run.output.review,duplicatedSubject:true}}}]){
 const result=verify([asset],bad?[bad]:[]);assert.equal(result.assets[0].url,'original');assert.equal(result.assets[0].extensionId,undefined);assert.equal(result.restored.length,1);
}
assert.equal(asset.url,'extended','does not mutate input');
assert.equal(verify([{id:'plain',url:'plain'}],[]).restored.length,0);
console.log('PASS: stale, missing, rejected, failed and mismatched extension records restore original; verified images retained');
