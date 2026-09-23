const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function compile(file,deps={}){const box={exports:{},require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports}
const renderer=compile('lib/content-templates/core-master-template.tsx');
const contract=JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json','utf8'));
const roles=['cover','longform','split','comparison','feature','end'];
const pages=roles.map((role,i)=>({page:`P.${i+1}`,role,headline:'胖熊週是甚麼？',copyDirection:'每年秋天，棕熊會大量進食。脂肪是過冬的重要儲備。這場賽事讓大家認識棕熊。'}));
const assets=roles.map((_,i)=>({assignedPage:`P.${i+1}`,url:`/test-asset/${i+1}`,sourceType:'upload'})).reverse();
function render(index,withAssets=true){let call=0;const hooks={...React,useState:()=>[call++===0?index:520,()=>{}],useEffect:()=>{},useRef:()=>({current:null})};const component=compile('components/content/CoreMasterPreview.tsx',{'react':hooks,'@/lib/content-templates/core-master-template':renderer});return renderToStaticMarkup(component.CoreMasterPreview({contract,pages,assets:withAssets?assets:[],brandName:'TEST'}));}
for(let i=0;i<6;i++){
  const html=render(i);assert.ok(html.includes(`/test-asset/${i+1}`),`page ${i+1} uses its assigned asset`);
  assert.ok(!html.includes('AI 示意圖'));assert.ok(!html.includes('美國國家公園管理局'));assert.ok(html.includes('SOON Preview Serif'));
  assert.ok(html.includes(`第 ${i+1} / 6 頁`));assert.ok(!render(i,false).includes('/test-asset/'));
}
console.log('PASS: six master roles, assigned assets, missing images, no example copy/AI labels, actual page numbers');
if(process.argv.includes('--serve')) require('node:http').createServer((req,res)=>{
  if(req.url.startsWith('/fonts/')){const path='public'+req.url;res.end(fs.readFileSync(path));return}
  if(req.url.startsWith('/test-asset/')){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png'));return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><body style="margin:20px;background:#ddd"><div style="width:520px">'+render(Number(new URL(req.url,'http://localhost').searchParams.get('page')||1))+'</div></body></html>');
}).listen(4189,'127.0.0.1');
