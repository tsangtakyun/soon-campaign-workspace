const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('app/api/content-projects/generate-carousel/route.tsx','utf8');
const code=source.slice(source.indexOf('const fontBufferCache'),source.indexOf('let magazineFonts'))+'\nexports.loadCarouselFonts=loadCarouselFonts;';
const box={exports:{},Buffer,process,console,readFile:require('node:fs/promises').readFile,path:require('node:path'),decompress:require('wawoff2').decompress,DEFAULT_CAROUSEL_FONT:'default',BRAND_CAROUSEL_FONT:'brand',localTypefaceFiles:{'swei-gothic':'SweiGothicCJKtc-Regular.ttf'},findBrandTypeface:value=>value?{id:'swei-gothic',cdnUrl:''}:null};
vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,box);
async function main(){for(const value of [null,'GenSenRounded2']){const fonts=await box.exports.loadCarouselFonts(value);assert.notDeepEqual(Buffer.from(fonts.regular),Buffer.from(fonts.bold),'bold must not reuse regular font bytes');assert.ok(fonts.bold.byteLength>1000);}
 const layout=fs.readFileSync('app/layout.tsx','utf8');assert.ok(layout.includes('SweiGothicCJKtc-Bold.woff2'));
 const fonts=await box.exports.loadCarouselFonts('GenSenRounded2');
 const {ImageResponse}=require('next/og'),React=require('react');
 const render=async weight=>Buffer.from(await new ImageResponse(React.createElement('div',{style:{display:'flex',fontFamily:'brand',fontSize:50,fontWeight:weight}},'胖熊大賽'),{width:400,height:100,fonts:[{name:'brand',data:fonts.regular,weight:400},{name:'brand',data:fonts.bold,weight:700}]}).arrayBuffer());
 assert.notDeepEqual(await render(400),await render(700),'raster output must render a different bold face');
 console.log('PASS: server loads real Bold for workspace alias and default; actual ImageResponse renders distinct weights');}
main().catch(e=>{console.error(e);process.exitCode=1});
