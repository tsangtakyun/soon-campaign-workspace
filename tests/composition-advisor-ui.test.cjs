const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
function compile(file,deps){const box={exports:{},require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);return box.exports;}
async function main(){
 let state=[],refs=[],effects=[],cursor=0,rc=0,analysisCalls=0,generations=0,saves=0,register=true;
 const hooks={...React,useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=v]},useRef:initial=>refs[rc++]|| (refs[rc-1]={current:initial}),useEffect:fn=>{if(register)effects.push(fn)}};
 const Extension=()=>null;
 const crop=compile('lib/subject-crop.ts',{}),advice=compile('lib/composition-advice.ts',{'./subject-crop':crop});
 const {CompositionAdvisor}=compile('components/content/CompositionAdvisor.tsx',{'react':hooks,'@/lib/composition-advice':advice,'./BackgroundExtensionEditor':{BackgroundExtensionEditor:Extension}});
 const props={asset:{id:'a',url:'photo',width:1600,height:900},frame:{x:0,y:0,width:1080,height:1350},textZones:[{x:0,y:920,width:1080,height:350}],
 analyze:async()=>{analysisCalls++;return {focus:{x:.5,y:.5,width:.2,height:.4},label:'熊',background:{downwardExtension:'safe'}}},
 saveFocus:async()=>{saves++;return true},actions:{generate:async()=>{generations++},apply:async()=>{saves++;return true}}};
 const render=()=>{cursor=0;rc=0;return CompositionAdvisor(props)};
 const nodes=n=>!n?[]:Array.isArray(n)?n.flatMap(nodes):typeof n==='object'?[n,...nodes(n.props?.children)]:[];
 render();register=false;
 // Simulate mount, StrictMode cleanup and replay: only one paid analysis request.
 const cleanups=effects.map(fn=>fn());cleanups.forEach(fn=>fn?.());effects.forEach(fn=>fn());
 await new Promise(r=>setImmediate(r));assert.equal(analysisCalls,1);assert.equal(generations,0);assert.equal(saves,0);
 assert.equal(nodes(render()).find(n=>n.type===Extension).props.suggested,true);
 nodes(render()).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});
 assert.equal(nodes(render()).find(n=>n.type===Extension).props.suggested,false);assert.equal(generations,0);
 // A fresh already-extended asset never starts analysis or generation.
 state=[];refs=[];effects=[];register=true;props.asset.extensionOriginal={url:'original'};
 render();effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));assert.equal(analysisCalls,1);assert.equal(generations,0);
 console.log('PASS: automatic analysis dedup, suggestion only, documentary override, no generation/save without confirmation, already-extended skip');
}
main().catch(e=>{console.error(e);process.exitCode=1});
