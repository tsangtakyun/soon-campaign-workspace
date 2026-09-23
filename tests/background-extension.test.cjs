const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
function compile(file,deps={}){const box={exports:{},Buffer,require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);return box.exports;}
async function main(){
 const lib=compile('lib/background-extension.ts',{'./safe-external-url':{}});
 const source=await sharp({create:{width:640,height:360,channels:3,background:'#237abc'}}).png().toBuffer();
 const plan=await lib.prepareExtension(source);
 assert.equal(plan.width,640);assert.equal(plan.height,800);assert.equal(plan.originalHeight,360);
 const mask=await sharp(plan.mask).raw().toBuffer();
 assert.equal(mask[(100*1024+100)*4+3],255);assert.equal(mask[(400*1024+100)*4+3],0);
 const generated=await sharp({create:{width:1024,height:1536,channels:3,background:'#ff0000'}}).png().toBuffer();
 const result=await lib.finishExtension(generated,plan);
 const preserved=await sharp(result).extract({left:0,top:0,width:640,height:360}).removeAlpha().raw().toBuffer();
 assert.deepEqual(preserved,await sharp(source).raw().toBuffer(),'original pixels must be restored, even if model rewrites them');
 const bottom=await sharp(result).extract({left:0,top:400,width:1,height:1}).removeAlpha().raw().toBuffer();assert.deepEqual([...bottom],[255,0,0]);
 await assert.rejects(()=>lib.finishExtension(source,plan),/dimensions/);
 await assert.rejects(()=>lib.prepareExtension(generated),/NOT_LANDSCAPE/);
 const assets=compile('lib/extension-asset.ts');
 const asset={id:'a',url:'original',width:640,height:360,subjectFocus:{x:.5,y:.4,width:.3,height:.3},license:'original license'};
 const preview={id:'run',url:'extended',originalUrl:'original',width:640,height:800,originalHeight:360};
 const applied=assets.applyExtension(asset,preview);
 assert.equal(applied.subjectFocus,null);assert.equal(applied.license,asset.license);assert.equal(asset.url,'original');
 assert.deepEqual(JSON.parse(JSON.stringify(assets.restoreExtension(applied))),asset);
 assert.throws(()=>assets.applyExtension({...asset,url:'new'},preview),/圖片已更改/);
 const materials=compile('lib/confirmed-project-materials.ts');
 const context=compile('lib/project-style-context.ts',{'./confirmed-project-materials':materials,'./production-style':{object:v=>v&&typeof v==='object'?v:{},fingerprint:JSON.stringify}});
 const project={selected_format:'carousel',production:{assetStatus:'confirmed',assets:[asset]}};
 assert.equal(context.projectStyleContext(project).inputHash,context.projectStyleContext({...project,production:{...project.production,assets:[applied]}}).inputHash);
 console.log('PASS: no enlargement, mask, original pixels preserved, generated region, dimensions guard, restore, stale-source guard, recommendation stable');
}
main().catch(error=>{console.error(error);process.exitCode=1});
