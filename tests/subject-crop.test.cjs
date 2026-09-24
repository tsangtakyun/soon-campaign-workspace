const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function compile(file, deps={}) { const box={exports:{},require:n=>deps[n]||require("./ts-loader.cjs").resolveImport(n,file,deps)}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,box); return box.exports; }
const crop=compile('lib/subject-crop.ts');
const frame={x:0,y:0,width:100,height:100};
assert.equal(crop.subjectCrop({},frame).position,'center');
assert.equal(crop.subjectCrop({position:'top'},frame).position,'top');
assert.equal(crop.validSubjectFocus({x:NaN,y:.5,width:.3,height:.3}),false);
assert.equal(crop.validSubjectFocus({x:2,y:.5,width:.3,height:.3}),false);
assert.equal(crop.subjectCrop({width:0,height:100,subjectFocus:{x:.5,y:.5,width:.2,height:.2}},frame).active,false);
const portrait={width:100,height:200,subjectFocus:{x:.5,y:.5,width:.2,height:.2}};
const bottomText=[{x:0,y:70,width:100,height:30}];
const result=crop.subjectCrop(portrait,frame,bottomText);
assert.ok(parseFloat(result.position.split(' ')[1])>50,'shift subject upward away from bottom copy');
assert.equal(result.constrained,false);
const topResult=crop.subjectCrop(portrait,frame,[{x:0,y:0,width:100,height:30}]);
assert.ok(parseFloat(topResult.position.split(' ')[1])<50,'shift subject downward away from top copy');
const edge=crop.subjectCrop({width:200,height:100,subjectFocus:{x:.9,y:.5,width:.15,height:.2}},frame);
assert.ok(parseFloat(edge.position)>90,'keep off-centre subject visible');
assert.equal(edge.constrained,false);
assert.equal(crop.subjectCrop({...portrait,height:100},frame,bottomText).constrained,true,'no overflow cannot move subject clear of text gutter');
const brand=compile('lib/content-branding.ts',{'./typefaces':compile('lib/typefaces.ts')});
const renderer=compile('lib/content-templates/core-master-template.tsx',{'../content-branding':brand,'../subject-crop':crop});
const design={coordinateWidth:1080,coordinateHeight:1350,canvasJson:{objects:[
 {type:'image',width:1080,height:1350,data:{role:'image_main'}},
 {type:'textbox',left:0,top:950,width:1080,height:400,text:'',data:{role:'headline',binding:'content.headline'}}
]}};
const options={design,copy:{headline:'Title'},page:'01',primary:{url:'/test.png',width:1080,height:2000,subjectFocus:{x:.5,y:.5,width:.2,height:.2}}};
const layout=renderer.coreMasterSubjectLayout(options);
assert.equal(layout['master-0'].active,true);
const {renderToStaticMarkup}=require('react-dom/server');
const html=renderToStaticMarkup(renderer.renderCoreMasterPage({...options,branding:{name:'TEST'},fonts:{family:'sans-serif',editorialFamily:'serif'}}));
assert.ok(html.includes(`object-position:${layout['master-0'].position}`),'shared renderer applies calculated crop');
design.canvasJson.objects[0].data.binding='content.asset.contain';
assert.equal(Object.keys(renderer.coreMasterSubjectLayout(options)).length,0,'contain is not cropped');
console.log('PASS: focal preservation, text avoidance, impossible crops, legacy fallback, contain and shared renderer');
const context=compile('lib/project-style-context.ts',{'./production-style':{object:v=>v||{},fingerprint:JSON.stringify},'./confirmed-project-materials':{confirmedProjectMaterials:()=>({})}});
const original={production:{assets:[{id:'a',url:'/a.png',width:500,height:500}]}};
const changed={production:{assets:[{...original.production.assets[0],subjectFocus:{x:.4,y:.3,width:.2,height:.2,sourceWidth:600,sourceHeight:600}}]}};
assert.equal(context.projectStyleContext(original).inputHash,context.projectStyleContext(changed).inputHash,'crop metadata must not invalidate recommendations');
assert.equal(crop.subjectCrop({subjectFocus:{x:.5,y:.5,width:.2,height:.2,sourceWidth:100,sourceHeight:200}},frame).active,true);
console.log('PASS: crop-only edit preserves recommendation fingerprint');
