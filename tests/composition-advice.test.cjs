const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(file,deps={}){const box={exports:{},require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const {compositionAdvice}=compile('lib/composition-advice.ts',{'./subject-crop':compile('lib/subject-crop.ts')});
const input={width:1600,height:900,frame:{x:0,y:0,width:1080,height:1350},textZones:[{x:0,y:920,width:1080,height:350}],documentary:false,
 analysis:{focus:{x:.5,y:.5,width:.2,height:.4},label:'熊',reason:'動物',cached:false,background:{downwardExtension:'safe',reason:'水面'}}};
assert.equal(compositionAdvice(input).action,'extend');
assert.equal(compositionAdvice({...input,documentary:true}).action,'review');
assert.equal(compositionAdvice({...input,analysis:{...input.analysis,background:{downwardExtension:'risky',reason:'建築'}}}).action,'review');
assert.equal(compositionAdvice({...input,analysis:{...input.analysis,background:undefined}}).action,'review');
assert.equal(compositionAdvice({...input,analysis:{...input.analysis,focus:null}}).action,'review');
assert.equal(compositionAdvice({...input,width:0}).action,'review');
assert.equal(compositionAdvice({...input,width:1080,height:1350,textZones:[]}).action,'crop');
assert.equal(compositionAdvice({...input,textZones:[{x:0,y:100,width:1080,height:1200}]}).action,'review','extension must really clear the text zone');
assert.equal(compositionAdvice({...input,frame:{x:0,y:0,width:1080,height:1920}}).action,'extend','portrait frames are supported');
assert.equal(compositionAdvice({...input,frame:{x:0,y:0,width:100,height:1920}}).action,'review','extreme ratios remain unsupported');
const both={...input.analysis,background:{downwardExtension:'safe',upwardExtension:'safe',reason:'water and sky'}};
const up=compositionAdvice({...input,analysis:both,textZones:[{x:0,y:0,width:1080,height:650}]});
assert.equal(up.action,'extend');assert.ok(up.placement.topFraction>0,'reserve upper text area');
const narrow=compositionAdvice({...input,analysis:both,frame:{x:0,y:0,width:500,height:1350},textZones:[]});
assert.equal(narrow.action,'extend');assert.equal(narrow.placement.aspectRatio,500/1350);
assert.ok(narrow.placement.topFraction>0 && narrow.placement.topFraction<1,'balance subject in narrow frame');
assert.ok(compositionAdvice({...input,width:640,height:360}).reason.includes('唔會令原圖變高清'));
console.log('PASS: safe extension, documentary/complex/unknown fallbacks, crop, missing dimensions, actual text overlap and unsupported frame');
