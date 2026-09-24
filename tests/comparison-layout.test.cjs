const assert=require('node:assert/strict'),fs=require('node:fs'),{load}=require('./ts-loader.cjs');
const master=load('lib/content-templates/core-master-template.tsx');
const {resolveClearMagazineRole}=load('lib/content-templates/clear-magazine-carousel-v1.ts');
const contract=JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json'));
for(const role of ['cover','longform','split','comparison','feature','end']){
 const design=master.getCoreMasterPageDesign(contract,role),before=JSON.stringify(design);
 for(const mode of ['original','ai']){
  const canvas=master.createCoreMasterCanvas({design,copy:{headline:'母版測試',body:['內容一','內容二'],fields:{left_row_1:'左欄資料',right_row_1:'右欄資料'}},page:'04',primary:{url:'portrait',width:719,height:1024,compositionMode:mode},secondary:{url:'second'},branding:{name:'TEST'},fonts:{family:'Test',editorialFamily:'Test'}});
  for(const expected of design.canvasJson.objects){
   const role=expected.data?.role;
   if(!role||role==='highlight_box'||role==='brand_logo')continue;
   const actual=canvas.objects.find(o=>o.data?.role===role);
   if(!actual)continue;
   for(const key of ['left','top','width','height'])assert.ok(Math.abs(actual[key]-(expected[key]||0)*(key==='width'?(expected.scaleX||1):key==='height'?(expected.scaleY||1):1))<.001,role+' '+key+' preserves master');
  }
  assert.equal(JSON.stringify(design),before);
  if(role==='comparison')assert.equal(canvas.objects.find(o=>o.data.role==='left_row_1').text,'左欄資料');
 }
}
assert.equal(resolveClearMagazineRole({role:'split',headline:'不同產品如何比較',assetIds:['a','b']},2,7),'split');
assert.equal(resolveClearMagazineRole({templateArtboardId:'02_FULL_BLEED_TEXT',headline:'比較'},2,7),'longform');
console.log('PASS: all six published master geometries immutable in original/AI modes; explicit roles override heuristics');
