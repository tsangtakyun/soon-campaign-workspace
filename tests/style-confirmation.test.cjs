const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:n=>n==='server-only'?{}:deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const context=load('lib/project-style-context.ts',{'./production-style':load('lib/production-style.ts'),'./confirmed-project-materials':load('lib/confirmed-project-materials.ts')});
const template=load('lib/core-template-contract.ts');
const contract={structure:{mode:'fixed',page_count:2,page_roles:[{role:'cover',position:'01'},{role:'end',position:'02'}]}};
const original={title:'Bear',selected_format:'carousel',brief:{summary:'Story'},production:{assetStatus:'confirmed',pages:[{title:'Cover'},{title:'End'}],assets:[{id:'a',url:'original',width:640,height:360}]}};
const saved={...original,production:{...original.production,pages:template.applyCoreTemplateStructure(original.production.pages,contract)}};
assert.notEqual(context.projectStyleContext(original).inputHash,context.projectStyleContext(saved).inputHash,'reproduces old false invalidation');
const hash=context.confirmedStyleHash(saved);
function reorder(v){if(Array.isArray(v))return v.map(reorder);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reorder(x)]));return v;}
assert.equal(hash,context.confirmedStyleHash(reorder(saved)),'database key order must not invalidate confirmation');
assert.notEqual(hash,context.confirmedStyleHash({...saved,title:'Changed topic'}));
assert.notEqual(hash,context.confirmedStyleHash({...saved,production:{...saved.production,pages:[{title:'Changed story'}]}}));
assert.notEqual(hash,context.confirmedStyleHash({...saved,production:{...saved.production,assets:[{id:'a',url:'changed'}]}}));
const extension=load('lib/extension-asset.ts');
const extended=extension.applyExtension(saved.production.assets[0],{id:'run',url:'extended',originalUrl:'original',width:640,height:800});
assert.equal(hash,context.confirmedStyleHash(reorder({...saved,production:{...saved.production,assets:[extended]}})),'background extension does not change source content');
console.log('PASS: template transition, JSONB ordering, genuine topic/story/asset changes, background extension');
