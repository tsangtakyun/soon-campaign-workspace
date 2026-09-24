const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
function compile(file, deps = {}) { const box = { exports: {}, require: n => deps[n] || require(n) }; vm.runInNewContext(transpile(file), box); return box.exports; }
const branding = compile('lib/content-branding.ts', { './typefaces': compile('lib/typefaces.ts') });
const master = compile('lib/content-templates/core-master-template.tsx', { '../content-branding': branding, '../subject-crop': compile('lib/subject-crop.ts') });
const contract = JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json', 'utf8'));
const documents = ['cover','longform','split','comparison','feature','end'].map(role => master.createCoreMasterCanvas({ design: master.getCoreMasterPageDesign(contract, role), copy: { headline: '可編輯標題', subheadline: '副題文字', body: ['第一段內文','第二段內文'], cta: '留言分享' }, page: '01', primary: { url: '/photo.png' }, secondary: { url: '/photo.png' }, branding: { name: 'TEST', logoUrl: '/logo.png' }, fonts: { family: 'SOON Magazine Sans', editorialFamily: 'SOON Magazine Serif' } }));
for (const document of documents) {
  assert.equal(document.coordinateWidth, 1080);
  assert.ok(document.objects.filter(o => o.type === 'Textbox').length > 2);
  assert.ok(document.objects.some(o => o.type === 'Image' && o.src === '/photo.png'));
  assert.ok(document.objects.some(o => o.type === 'Image' && o.src === '/logo.png'));
  assert.ok(!JSON.stringify(document).includes('carousel-generated-design'));
  assert.equal(new Set(document.objects.map(o => o.data.id)).size, document.objects.length);
}
console.log('PASS: six published master roles bind independent editable text, photos and logo');
if (process.argv.includes('--serve')) require('node:http').createServer((req,res) => {
  if (req.url === '/fabric.js') { res.setHeader('Content-Type','application/javascript'); return res.end(fs.readFileSync('node_modules/fabric/dist/index.min.js')); }
  if (req.url === '/photo.png') { res.setHeader('Content-Type','image/png'); return res.end(fs.readFileSync('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png')); }
  if (req.url === '/logo.png') { res.setHeader('Content-Type','image/png'); return res.end(fs.readFileSync('public/brand-assets/eggsoon/soon-egg.png')); }
  if (req.url.startsWith('/fonts/magazine/') && !req.url.includes('..')) return res.end(fs.readFileSync('public' + req.url));
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<html><body><p id="status">Loading</p><canvas id="test"></canvas><script src="/fabric.js"></script><script>
  const effects=[];const exports={};const require=n=>n==='react'?{useCallback:f=>f,useMemo:f=>f(),useRef:v=>({current:v}),useEffect:f=>effects.push(f)}:n==='fabric'?fabric:{};
  ${transpile('hooks/useFabricCanvas.ts')}
  const controls=exports.useFabricCanvas({canvasId:'test',width:430,height:538,onElementsChange:elements=>window.layers=elements});effects.forEach(f=>f());
  window.controls=controls;window.docs=${JSON.stringify(documents)};
  (async()=>{await controls.loadCanvasJSON(docs[0]);window.ready=true;document.querySelector('#status').textContent='Ready: '+layers.length+' editable layers'})().catch(e=>{document.querySelector('#status').textContent=e.stack});
  </script></body></html>`);
}).listen(4193,'127.0.0.1');
