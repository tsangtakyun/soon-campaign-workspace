const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const { ImageResponse } = require('next/og');
const { decompress } = require('wawoff2');
const sharp = require('sharp');
function compile(file, deps = {}) {
  const box = { exports: {}, require: name => deps[name] || require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, box);
  return box.exports;
}
async function main() {
  const brand = compile('lib/content-branding.ts', { './typefaces': compile('lib/typefaces.ts') });
  const renderer = compile('lib/content-templates/core-master-template.tsx', { '../content-branding': brand });
  const contract = JSON.parse(fs.readFileSync('tests/fixtures/clear-magazine-v3.contract.json', 'utf8'));
  const logo = 'data:image/png;base64,' + (await sharp({ create: { width: 100, height: 60, channels: 4, background: '#ec6234' } }).png().toBuffer()).toString('base64');
  const photo = 'data:image/png;base64,' + fs.readFileSync('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png').toString('base64');
  const node = renderer.renderCoreMasterPage({
    design: renderer.getCoreMasterPageDesign(contract, 'cover'),
    copy: { headline: '胖熊週是甚麼', subheadline: '', body: ['副題點明，介紹賽事'], fields: { 'asset.credit': '' } },
    page: '01', primary: { url: photo }, branding: { name: 'TEST', logoUrl: logo },
    fonts: { family: 'Brand Test', editorialFamily: 'Brand Test' },
  });
  const html = renderToStaticMarkup(node);
  assert.ok(html.includes(logo));
  assert.ok(html.includes('Brand Test'));
  assert.ok(!html.includes('副題點明'));
  const font = await decompress(fs.readFileSync('public/fonts/max32002/NaniFont-Regular.woff2'));
  const data = font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength);
  const response = new ImageResponse(node, { width: 1080, height: 1350, fonts: [400, 700, 900].map(weight => ({ name: 'Brand Test', data, weight })) });
  const output = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 1080); assert.equal(metadata.height, 1350);
  if (process.env.BRAND_TEST_OUTPUT) fs.writeFileSync(process.env.BRAND_TEST_OUTPUT, output);
  console.log('PASS: real ImageResponse PNG with brand logo, Nani font including 900 weight, optional subtitle, no editorial direction');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
