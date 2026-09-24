const assert=require('node:assert/strict'),sharp=require('sharp'),{load}=require('./ts-loader.cjs');
const {readDraftOutput}=load('lib/draft-output.ts');
const {copyFieldTargets,applyCopyCandidates}=load('lib/copy-field-candidates.ts');
const {magazineCopyIssues}=load('lib/magazine-copy-policy.ts');
let calls=0,captured;
const quality=load('lib/extension-quality.ts',{'./ai-subject-focus':{SUBJECT_MODEL:'unused'},ai:{Output:{object:x=>x},generateText:async x=>{calls++;captured=x;return {output:{}}}}});
async function main(){
  const page={page:'P.4',role:'comparison',headline:'產品比較',designDirection:'',body:['甲','乙','舊左','舊右'],comparisonLabels:['舊標籤'],comparisonRows:[{label:'原料',left:'牛奶',right:'植物油'},{label:'標示',left:'甲',right:''}]};
  const result=readDraftOutput({content:[{type:'text',text:JSON.stringify({captionDraft:'',pages:[page]})}]}).pages[0];
  assert.deepEqual(Array.from(result.comparisonLabels),['原料','標示']);
  assert.equal(result.body[2],'牛奶\n甲');assert.equal(result.body[3],'植物油\n');assert.equal(result.comparisonRows,undefined);
  const copy={...result,body:['甲','乙','這個比較格的文字太長會超過固定母版文字框而被截去\n短格','保留右欄']};
  assert.ok(magazineCopyIssues(copy).some(x=>x.includes('正文3第1格')));
  const targets=copyFieldTargets(copy,{});assert.equal(targets.length,1);assert.equal(targets[0].field,'body.2.row.0');
  const repaired=applyCopyCandidates(copy,targets,{fields:[{field:targets[0].field,candidates:['完整短版']}]});
  assert.equal(repaired.body[2],'完整短版\n短格');assert.equal(repaired.body[3],'保留右欄');
  const g={width:240,height:120,originalLeft:80,originalTop:0,originalWidth:80,originalHeight:120};
  const flat=await sharp({create:{width:240,height:120,channels:3,background:'#444'}}).png().toBuffer();
  assert.ok((await quality.inspectExtensionSeams(flat,g)).every(s=>!s.discontinuous));
  const table=await sharp({create:{width:80,height:40,channels:3,background:'#d9e8ed'}}).png().toBuffer();
  const bad=await sharp(flat).composite([{input:table,left:80,top:80}]).png().toBuffer();
  assert.ok((await quality.inspectExtensionSeams(bad,g)).every(s=>s.discontinuous),'pale table ending on both original edges is rejected');
  const rejected=await quality.reviewExtension(flat,bad,g,{});assert.equal(rejected.output.seamNatural,false);assert.equal(calls,0,'obvious seam rejected without an AI call');
  await quality.reviewExtension(flat,flat,g,{});assert.equal(calls,1);
  assert.equal(captured.messages[0].content.filter(p=>p.type==='image').length,4,'original, final and two used-seam close-ups');
  console.log('PASS: aligned row bindings, per-cell repair preserving neighbours, seam rejection and close-up evidence');
}
main().catch(e=>{console.error(e);process.exitCode=1});
