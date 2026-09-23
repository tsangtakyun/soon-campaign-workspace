const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const box={exports:{},require};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-subject-focus.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
const {focusFromDetection}=box.exports;
const value={found:true,confidence:'high',label:'棕熊',reason:'主要動物',box:{left:.2,top:.3,right:.8,bottom:.9}};
const focus=focusFromDetection(value);
assert.equal(focus.x,.5);assert.ok(Math.abs(focus.width-.64)<.00001);
for(const invalid of [{...value,confidence:'low'},{...value,found:false},{...value,box:null},{...value,box:{left:.8,top:.3,right:.2,bottom:.9}},{...value,box:{left:-1,top:.3,right:.8,bottom:.9}}]) assert.equal(focusFromDetection(invalid),null);
console.log('PASS: valid subject box, padding, low-confidence/no-subject rejection and invalid coordinates');
