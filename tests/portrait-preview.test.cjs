const assert=require('node:assert/strict'),fs=require('node:fs'),{load}=require('./ts-loader.cjs');
const {renderToStaticMarkup}=require('react-dom/server');
const master=load('lib/content-templates/core-master-template.tsx');
const {previewComposition}=load('lib/style-preview-composition.ts');
const contract=JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json'));
const pages=[
 {headline:'雪糕與健康：研究說了甚麼？',body:['觀察到關聯，不等於證實因果。']},
 {headline:'看研究結果，也要看限制',body:['故事提及的研究仍須核對原文；不能只看社交帖文的結論。','照片用來說明題材，並不是研究證據。']},
 {headline:'看懂資訊，再作選擇',body:['遇到驚人的健康說法，先留意來源和研究限制。'],fields:{cta:'你會先核對哪些資料？'}},
];
let photos=pages.map(()=>({url:'/photo',width:1200,height:1800}));
function options(i){return {...previewComposition(contract,pages[i],i,3),primary:{...photos[i],compositionMode:'original'},branding:{name:'TEST'},fonts:{family:'sans-serif',editorialFamily:'serif'}}}
function check(){for(let i=0;i<3;i++){
 const canvas=master.createCoreMasterCanvas(options(i));
 const photo=canvas.objects.find(o=>o.type==='Image');
 const expected=options(i).design.canvasJson.objects.find(o=>o.data?.role==='image_main');
 assert.equal(photo.width,expected.width*(expected.scaleX||1),'master frame width preserved');
 assert.equal(photo.height,expected.height*(expected.scaleY||1),'master frame height preserved');
 const texts=canvas.objects.filter(o=>o.type==='Textbox');
 assert.ok(texts.some(o=>o.text.includes(pages[i].body[0])),'body preserved');
 assert.ok(texts.every(o=>o.left+o.width<=1080&&o.top+o.height<=1350),'bounded boxes');
 assert.ok(!canvas.objects.some(o=>o.data?.role==='highlight_box'));
 if(i===2)assert.ok(texts.some(o=>o.text===pages[i].fields.cta));
 const html=renderToStaticMarkup(master.renderCoreMasterPage(options(i)));
 assert.ok(html.includes(pages[i].body[0]));
 }console.log('PASS: unchanged master frames, complete body/CTA, bounded text, no empty highlights, editor/render parity');}
check();
if(process.argv.includes('--serve'))(async()=>{
 process.loadEnvFile('/Users/tommytsang/Desktop/SOON/soon-campaign-workspace/.env.local');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const response=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/content_projects?id=eq.9851a2f0-102e-4820-898c-fbc507e36da2&select=production',{headers:{apikey:key,Authorization:'Bearer '+key}});
 const [project]=await response.json();
 photos=['P.1','P.2','P.7'].map(p=>project.production.assets.find(a=>a.previewPageIds?.includes(p)));
 check();
 require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><body style="background:#eee;font-family:sans-serif"><h2>Portrait layout verification · fixture copy / actual uploaded images</h2><div style="display:flex;gap:24px">'+pages.map((_,i)=>'<div style="width:324px;height:405px;position:relative;overflow:hidden"><div style="width:1080px;height:1350px;transform:scale(.3);transform-origin:top left">'+renderToStaticMarkup(master.renderCoreMasterPage(options(i)))+'</div></div>').join('')+'</div></body></html>')}).listen(4217,'127.0.0.1');
})().catch(e=>{console.error(e);process.exitCode=1});
