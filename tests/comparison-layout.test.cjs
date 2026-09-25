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
   if(!role||role==='highlight_box'||role==='brand_logo'||['left_label_box','right_label_box','label_left','label_right'].includes(role))continue;
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
const design=master.getCoreMasterPageDesign(contract,'comparison');
const canvas=master.createCoreMasterCanvas({design,copy:{role:'comparison',body:['Ice Cream','Frozen Dessert','天然含有成分\n','人工添加成分\n法規說明'],comparisonLabels:['添加成分','法規定義']},page:'04',branding:{name:'TEST'},fonts:{family:'Test',editorialFamily:'Test'}});
const get=role=>canvas.objects.find(o=>o.data?.role===role);
for(const key of ['width','height','top'])assert.equal(get('left_label_box')[key],get('right_label_box')[key]);
for(const key of ['width','height','top','fontSize','fontWeight'])assert.equal(get('label_left')[key],get('label_right')[key]);
assert.equal(get('left_row_2').text,'原文未提供');
assert.equal(get('comparison_label_0_0').text,'成分特點');
console.log('PASS: only matched comparison headers change; other master geometry and source objects preserved; missing values explicit');
