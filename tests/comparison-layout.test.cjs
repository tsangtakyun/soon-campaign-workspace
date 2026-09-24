const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:n=>deps[n]||require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const brand=load('lib/content-branding.ts',{'./typefaces':load('lib/typefaces.ts')});
const master=load('lib/content-templates/core-master-template.tsx',{'../content-branding':brand,'../subject-crop':load('lib/subject-crop.ts')});
const contract=JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json'));
const base={design:master.getCoreMasterPageDesign(contract,'comparison'),page:'04',branding:{name:'TEST'},fonts:{family:'SOON Magazine Sans',editorialFamily:'SOON Magazine Sans'}};
const paragraphs=['747 是 Fat Bear Week 兩屆冠軍（2020年及2022年）','牠鍾意在瀑布下方的水潭捕魚','坐定等魚游近是牠的真實捕魚方式','公園形容747的肚子似乎幾乎拖到地面'];
const copy={headline:'747號 肚近乎拖地的兩屆王者',body:[paragraphs.join('\n')]};
const original=JSON.stringify(base.design);
const canvas=master.createCoreMasterCanvas({...base,copy});
const text=canvas.objects.filter(o=>o.type==='Textbox');
for(const p of paragraphs)assert.ok(text.some(o=>o.text.includes(p)),'every source sentence is retained');
assert.equal(text.filter(o=>o.data.role==='body').length,1);
assert.ok(!text.some(o=>['進食','活動','能量來源'].includes(o.text)),'no sample labels');
assert.ok(text.find(o=>o.data.role==='headline').top+text.find(o=>o.data.role==='headline').height<310,'headline does not overlap images');
assert.equal(JSON.stringify(base.design),original,'master remains immutable');
const narrative=master.createCoreMasterCanvas({...base,copy,primary:{url:'official'},secondary:{url:'illustration'}}).objects;
assert.equal(narrative.filter(o=>o.type==='Image').length,1,'narrative does not imply a second image is comparison evidence');
assert.equal(narrative.find(o=>o.type==='Image').data.editorImageFrame.fit,'contain','preserve embedded photo labels');
const splitCopy={headline:'435號 Holly 2019年冠軍',body:['官方冠軍記錄','核查資料：'+ '完整文字'.repeat(25)]};
const split=master.createCoreMasterCanvas({...base,design:master.getCoreMasterPageDesign(contract,'split'),copy:splitCopy}).objects;
assert.ok(!split.some(o=>['highlight_box','source'].includes(o.data.role)),'no blank highlight or duplicated paragraph as source');
assert.equal(split.find(o=>o.data.role==='headline').text,splitCopy.headline);
assert.equal(split.find(o=>o.data.role==='body_2').text,splitCopy.body[1]);
const columns=master.createCoreMasterCanvas({...base,copy:{headline:'比較',body:['','右標籤','左內容','右內容','結論','來源']}}).objects;
assert.equal(columns.find(o=>o.data.role==='label_left').text,'','empty slots preserved');
assert.equal(columns.find(o=>o.data.role==='left_body').text,'左內容');
assert.equal(columns.find(o=>o.data.role==='right_body').text,'右內容');
const html=require('react-dom/server').renderToStaticMarkup(master.renderCoreMasterPage({...base,copy}));
for(const p of paragraphs)assert.ok(html.includes(p));
console.log('PASS: one-block legacy narrative, explicit columns, empty slots, no lost copy, no master mutation, raster/editor share layout');
if(process.argv.includes('--serve'))require('node:http').createServer((req,res)=>{
 if(req.url==='/fabric.js')return res.end(fs.readFileSync('node_modules/fabric/dist/index.min.js'));
 if(req.url==='/font.woff2')return res.end(fs.readFileSync('public/fonts/max32002/SweiGothicCJKtc-Regular.woff2'));
 if(req.url==='/bold.woff2')return res.end(fs.readFileSync('public/fonts/max32002/SweiGothicCJKtc-Bold.woff2'));
 if(req.url==='/preview.png'){res.setHeader('Content-Type','image/png');return res.end(fs.readFileSync('/private/tmp/soon-comparison-verification.png'));}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html><body style="margin:20px;background:#eee"><h1>Comparison text regression fixture</h1><p id="status">Loading fonts</p><canvas id="canvas"></canvas><script src="/fabric.js"></script><script>
 (async()=>{for(const weight of [400,700]){const f=new FontFace('SOON Magazine Sans','url('+ (weight===400?'/font.woff2':'/bold.woff2') +')',{weight:String(weight)});document.fonts.add(await f.load());}window.canvas=new fabric.Canvas('canvas',{width:1080,height:1350});await canvas.loadFromJSON(${JSON.stringify(canvas)});canvas.renderAll();document.querySelector('#status').textContent='Ready';})()
 </script></body></html>`);
}).listen(4201,'127.0.0.1');
if(process.argv.includes('--render'))(async()=>{
 const exact=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 const regular=exact(await require('wawoff2').decompress(fs.readFileSync('public/fonts/max32002/SweiGothicCJKtc-Regular.woff2')));
 const bold=exact(await require('wawoff2').decompress(fs.readFileSync('public/fonts/max32002/SweiGothicCJKtc-Bold.woff2')));
 const photo='data:image/png;base64,'+fs.readFileSync('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png').toString('base64');
 const options={...base,copy,primary:{url:photo},secondary:{url:photo}};
 const image=new (require('next/og').ImageResponse)(master.renderCoreMasterPage(options),{width:1080,height:1350,fonts:[{name:base.fonts.family,data:regular,weight:400},{name:base.fonts.family,data:bold,weight:700}]});
 fs.writeFileSync('/private/tmp/soon-comparison-verification.png',Buffer.from(await image.arrayBuffer()));
 if(process.argv.includes('--live')) {
   const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY};
   const response=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/content_projects?select=production&id=eq.6a9f176d-5560-4512-8c13-f8bcdd7b1b5d&workspace_id=eq.6743d1ab-5373-4f44-815e-d73e4ba122b6',{headers});
   if(!response.ok)throw Error('Project fixture unavailable');
   const [project]=await response.json();
   for(const page of ['P.3','P.4','P.6']) {
     const draft=project.production.pageDrafts.find(d=>d.page===page);
     const asset=project.production.assets.find(a=>a.id===draft.assetId);
     const photoResponse=await fetch(asset.url);if(!photoResponse.ok)throw Error('Photo unavailable');
     const bytes=await require('sharp')(Buffer.from(await photoResponse.arrayBuffer())).png().toBuffer();
     const primary={...asset,url:'data:image/png;base64,'+bytes.toString('base64')};
     const live={...base,design:master.getCoreMasterPageDesign(contract,draft.role),copy:draft,page,primary};
     const result=new (require('next/og').ImageResponse)(master.renderCoreMasterPage(live),{width:1080,height:1350,fonts:[{name:base.fonts.family,data:regular,weight:400},{name:base.fonts.family,data:bold,weight:700}]});
     fs.writeFileSync('/private/tmp/soon-live-'+page+'.png',Buffer.from(await result.arrayBuffer()));
   }
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
