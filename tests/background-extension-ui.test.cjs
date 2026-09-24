const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
async function main(){
 let states=[],cursor=0,applied=0,generated=0;
 const hooks={...React,useEffect:()=>{},useRef:value=>({current:value}),useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v}];}};
 const box={exports:{},require:n=>n==='react'?hooks:n==='@/lib/automatic-extension'?{automaticExtension:()=>Promise.resolve()}:require(n)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/content/BackgroundExtensionEditor.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,box);
 const asset={id:'a',url:'original'};
 const actions={generate:async()=>{generated++;return {id:'g',url:'new',originalUrl:'original',width:640,height:800}},apply:async()=>{applied++;return true}};
 function render(){cursor=0;return box.exports.BackgroundExtensionEditor({asset,actions});}
 function elements(node){if(!node)return [];if(Array.isArray(node))return node.flatMap(elements);return typeof node==='object'?[node,...elements(node.props?.children)]:[];}
 const button=(tree,label)=>elements(tree).find(n=>n.type==='button'&&n.props.children===label);
 button(render(),'生成／讀取延伸預覽').props.onClick();await new Promise(r=>setImmediate(r));
 assert.equal(generated,1);assert.equal(applied,0,'generation must not apply automatically');
 assert.ok(elements(render()).some(n=>n.type==='img'&&n.props.src==='new'));
 button(render(),'保留原圖').props.onClick();assert.equal(applied,0);assert.ok(!elements(render()).some(n=>n.type==='img'));
 button(render(),'生成／讀取延伸預覽').props.onClick();await new Promise(r=>setImmediate(r));
 button(render(),'確認套用延伸版').props.onClick();await new Promise(r=>setImmediate(r));assert.equal(applied,1);
 asset.extensionOriginal={url:'original'};button(render(),'還原原圖').props.onClick();await new Promise(r=>setImmediate(r));assert.equal(applied,2);
 delete asset.extensionOriginal;actions.automatic=true;
 cursor=0;let auto=box.exports.BackgroundExtensionEditor({asset,actions,suggested:true});
 button(auto,'生成／讀取並直接套用').props.onClick();await new Promise(r=>setImmediate(r));assert.equal(applied,3,'automatic mode applies without preview confirmation');
 console.log('PASS: preview first, cancel leaves asset untouched, explicit apply, restore control');
}
main().catch(e=>{console.error(e);process.exitCode=1});
