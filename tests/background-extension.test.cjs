const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
function compile(file,deps={}){const box={exports:{},Buffer,require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);return box.exports;}
async function main(){
 const lib=compile('lib/background-extension.ts',{'./safe-external-url':{},'./extension-geometry':compile('lib/extension-geometry.ts')});
 const source=await sharp({create:{width:640,height:360,channels:3,background:'#237abc'}}).png().toBuffer();
 const plan=await lib.prepareExtension(source);
 assert.equal(plan.width,640);assert.equal(plan.height,800);assert.equal(plan.originalHeight,360);
 const mask=await sharp(plan.mask).raw().toBuffer();
 assert.equal(mask[(100*1024+100)*4+3],255);assert.equal(mask[(400*1024+100)*4+3],0);
 assert.equal(mask[(1000*1024+900)*4+3],255,'unused provider canvas must be protected, not generated');
 const generated=await sharp({create:{width:1024,height:1536,channels:3,background:'#ff0000'}}).png().toBuffer();
 const result=await lib.finishExtension(generated,plan);
 const preserved=await sharp(result).extract({left:0,top:0,width:640,height:360}).removeAlpha().raw().toBuffer();
 assert.deepEqual(preserved,await sharp(source).raw().toBuffer(),'original pixels must be restored, even if model rewrites them');
 const bottom=await sharp(result).extract({left:0,top:400,width:1,height:1}).removeAlpha().raw().toBuffer();assert.deepEqual([...bottom],[255,0,0]);
 await assert.rejects(()=>lib.finishExtension(source,plan),/dimensions/);
 const exact=await sharp({create:{width:640,height:800,channels:3,background:'blue'}}).png().toBuffer();
 await assert.rejects(()=>lib.prepareExtension(exact),/NO_EXTENSION_NEEDED/);
 for(const leftFraction of [0,.5,1]) {
  const horizontal=await lib.prepareExtension(exact,{aspectRatio:1.7,topFraction:.5,leftFraction,expansion:1.1});
  const output=await lib.finishExtension(generated,horizontal);
  const pixels=await sharp(output).extract({left:horizontal.originalLeft,top:horizontal.originalTop,width:horizontal.originalWidth,height:horizontal.originalHeight}).raw().toBuffer();
  assert.deepEqual(pixels,await sharp(horizontal.original).ensureAlpha().raw().toBuffer(),'four-way output preserves original rectangle');
 }
 const wide=await lib.prepareExtension(exact,{aspectRatio:2.187,topFraction:0,leftFraction:.5});
 assert.ok(Math.abs(wide.width/wide.height-2.187)<.01);
 const assets=compile('lib/extension-asset.ts');
 for(const topFraction of [0,.5,1]) {
  const shifted=await lib.prepareExtension(source,{aspectRatio:.5,topFraction});
  const output=await lib.finishExtension(generated,shifted);
  const pixels=await sharp(output).extract({left:0,top:shifted.originalTop,width:shifted.width,height:shifted.originalHeight}).removeAlpha().raw().toBuffer();
  assert.deepEqual(pixels,await sharp(shifted.original).removeAlpha().raw().toBuffer());
  assert.equal(shifted.height,shifted.width*2);
  assert.equal(shifted.originalTop,Math.round((shifted.height-shifted.originalHeight)*topFraction));
 }
 await assert.rejects(()=>lib.prepareExtension(source,{aspectRatio:NaN,topFraction:0}),/INVALID_PLACEMENT/);
 const asset={id:'a',url:'original',width:640,height:360,subjectFocus:{x:.5,y:.4,width:.3,height:.3},license:'original license'};
 const preview={id:'run',url:'extended',originalUrl:'original',width:640,height:800,originalHeight:360};
 const applied=assets.applyExtension(asset,preview);
 assert.equal(applied.subjectFocus,null);assert.equal(applied.license,asset.license);assert.equal(asset.url,'original');
 assert.deepEqual(JSON.parse(JSON.stringify(assets.restoreExtension(applied))),{...asset,autoExtensionDeclinedUrl:asset.url});
 assert.throws(()=>assets.applyExtension({...asset,url:'new'},preview),/圖片已更改/);
 const materials=compile('lib/confirmed-project-materials.ts');
 const context=compile('lib/project-style-context.ts',{'./confirmed-project-materials':materials,'./production-style':{object:v=>v&&typeof v==='object'?v:{},fingerprint:JSON.stringify}});
 const project={selected_format:'carousel',production:{assetStatus:'confirmed',assets:[asset]}};
 assert.equal(context.projectStyleContext(project).inputHash,context.projectStyleContext({...project,production:{...project.production,assets:[applied]}}).inputHash);
 console.log('PASS: no enlargement, mask, original pixels preserved, generated region, dimensions guard, restore, stale-source guard, recommendation stable');
}
main().catch(error=>{console.error(error);process.exitCode=1});
