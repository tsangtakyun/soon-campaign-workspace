const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript');
const box={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/confirmed-project-materials.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {confirmedPhotoCount,confirmedProjectMaterials}=box.exports;
test('confirmed images carry forward, without inventing research or presenter',()=>{
  const production={assetStatus:'confirmed',assets:Array.from({length:7},(_,i)=>({url:`https://test/${i}`}))};
  assert.equal(confirmedPhotoCount(production),7);
  assert.deepEqual(Array.from(confirmedProjectMaterials(production,[])),['photos']);
  assert.deepEqual(Array.from(confirmedProjectMaterials(production,['research','photos','photos'])),['photos','research']);
});
test('unconfirmed, empty and invalid assets do not claim confirmed images',()=>{
  for(const p of [{assets:[{url:'x'}]},{assetStatus:'confirmed',assets:[null,{}, {url:' '}]},{}]) {
    assert.equal(confirmedPhotoCount(p),0); assert.deepEqual(Array.from(confirmedProjectMaterials(p,[])),[]);
  }
});
