const assert=require('node:assert/strict'),{load}=require('./ts-loader.cjs');
let calls=0;
const page={page:'P.4',role:'comparison',headline:'原有標題',assetIds:['one','two'],body:['甲','乙','乳脂肪≥10%\n舊文字\n原帖稱或有助改善敏感度（待核實）','植物油\n乳化劑\n不符合FDA定義','','原帖引述FDA'],fields:{left_row_2:'含MFGM',source:'原帖引述FDA',headline:'原有標題'}};
const repaired={rows:[{label:'原料',left:'乳脂肪≥10%',right:'植物油',leftRefs:['L1'],rightRefs:['R1']},{label:'成分',left:'含MFGM',right:'乳化劑',leftRefs:['L2'],rightRefs:['R2']},{label:'法規標示',left:'',right:'不符合FDA定義',leftRefs:[],rightRefs:['R3']}],source:'原帖引述FDA；MFGM或有助改善敏感度（待核實）',noteRefs:['L3']};
const response=x=>({content:[{type:'text',text:JSON.stringify(x)}]});
const lib=load('lib/repair-comparison-page.ts',{'./draft-generation-step':{DraftStepError:Error,draftAnthropic:async()=>{calls++;return response(repaired)},runDraftStep:async(s,k,m,execute,validate)=>{const output=await execute();validate(output);return {id:'saved-result',output}}}});
async function main(){
 assert.ok(lib.readComparisonRepair(response(repaired),page));
 assert.throws(()=>lib.readComparisonRepair(response({...repaired,noteRefs:[]}),page),'cannot omit an original fact');
 assert.throws(()=>lib.readComparisonRepair(response({...repaired,noteRefs:['L3','L3']}),page),'cannot duplicate refs');
 assert.throws(()=>lib.readComparisonRepair(response({...repaired,source:'原帖引述FDA'}),page),'cannot remove uncertainty');
 assert.throws(()=>lib.readComparisonRepair(response({...repaired,rows:repaired.rows.map((r,i)=>i? r:{...r,left:'乳脂肪'})}),page),'cannot delete numeric evidence');
 const output=await lib.repairComparisonPage({},'key','configured-model',page);
 assert.equal(calls,1);assert.equal(output.assetIds,page.assetIds);assert.equal(output.headline,page.headline);
 assert.equal(output.body[2],'乳脂肪≥10%\n含MFGM\n');assert.equal(output.fields.left_row_2,undefined);assert.equal(output.fields.source,undefined);assert.equal(output.fields.headline,page.headline);
 assert.equal(page.fields.left_row_2,'含MFGM','input unchanged; displayed overrides were included in the repair');
 console.log('PASS comparison alignment: complete fact references, no side swapping, numeric/uncertainty guards, stale overrides cleared, assets preserved');
}
main().catch(e=>{console.error(e);process.exitCode=1});
