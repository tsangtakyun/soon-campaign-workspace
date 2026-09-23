const fs=require('node:fs/promises');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {ImageResponse}=require('next/og');
const assert=require('node:assert/strict');

async function run(){
  const core=process.argv[2];
  const out=path.join(core,'docs/magazine-v3-verification/server');await fs.mkdir(out,{recursive:true});
  const filename=path.join(process.cwd(),'lib/content-templates/core-master-template.tsx');
  const compiled=ts.transpileModule(await fs.readFile(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod._compile(compiled,filename);
  const {renderCoreMasterPage,fabricFillToCss}=mod.exports;
  assert.equal(fabricFillToCss({type:'linear',coords:{x1:0,y1:0,x2:0,y2:1},colorStops:[{offset:0,color:'rgba(0,0,0,0)'},{offset:1,color:'#000'}]}),'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)');
  const c=JSON.parse(await fs.readFile(path.join(core,'docs/clear-magazine-master-v3.contract.json'),'utf8'));
  const fonts=await Promise.all([['SOON Magazine Sans','Sans-Regular.otf',400],['SOON Magazine Sans','Sans-Bold.otf',700],['SOON Magazine Serif','Serif-Regular.otf',400],['SOON Magazine Serif','Serif-Black.otf',900]].map(async([name,file,weight])=>({name,data:await fs.readFile(path.join(process.cwd(),'public/fonts/magazine',file)),weight})));
  for(const [role,design] of Object.entries(c.master_designs)){
    const objects=design.canvasJson.objects;
    const fields=Object.fromEntries(objects.filter(o=>o.text&&o.data?.binding?.startsWith('content.')).map(o=>[o.data.binding.slice(8),o.text]));
    const images=objects.filter(o=>o.type.toLowerCase()==='image');
    const toAsset=async o=>o?{url:'data:image/png;base64,'+(await fs.readFile(path.join(process.cwd(),'public',o.src))).toString('base64')}:undefined;
    const node=renderCoreMasterPage({design,copy:{fields},page:fields.page_number,primary:await toAsset(images[0]),secondary:await toAsset(images[1]),branding:{name:'SOON'},fonts:{family:'SOON Magazine Sans',editorialFamily:'SOON Magazine Serif'}});
    const response=new ImageResponse(node,{width:1080,height:1350,fonts});
    const png=Buffer.from(await response.arrayBuffer());
    assert(png.length>10000);await fs.writeFile(path.join(out,role+'.png'),png);
    console.log('Rendered download: '+role);
  }
}
run().catch(e=>{console.error(e);process.exit(1)});
