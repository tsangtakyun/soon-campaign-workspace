const assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp'),React=require('react');
const {ImageResponse}=require('next/og'),{decompress}=require('wawoff2'),{load}=require('./ts-loader.cjs');
async function main(){
 const m=load('lib/content-templates/core-master-template.tsx');
 const contract=require('./fixtures/clear-magazine-v3.contract.json');
 const original=contract.master_designs.comparison.canvasJson.objects.find(o=>o.data?.role==='left_row_2');
 const design={coordinateWidth:1080,coordinateHeight:1350,canvasJson:{background:'#fff',objects:[{...original,left:50,top:50}]}};
 const copy={role:'comparison',body:['Ice Cream','Frozen Dessert','乳脂肪≥10%，以鮮奶油為基礎\n含天然乳脂肪球膜（MFGM）\n原帖稱或有助改善胰島素敏感度（待核實）','以植物油取代鮮奶油\n加入乳化劑及穩定劑\n嚴格而言不符合FDA「Ice Cream」定義']};
 const font=await decompress(fs.readFileSync('public/fonts/max32002/SweiGothicCJKtc-Bold.woff2'));
 const fonts=[{name:'Actual Brand',weight:700,data:font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength)}];
 const opts={design,copy,page:'04',branding:{name:'TEST'},fonts:{family:'Actual Brand',editorialFamily:'Actual Brand'}};
 const node=m.renderCoreMasterPage(opts),cell=node.props.children[0][0];
 const editable=m.createCoreMasterCanvas(opts).objects[0];
 assert.equal(cell.props.children,'含天然乳脂肪球膜（MFGM）');
 assert.equal(cell.props.style.fontSize,editable.fontSize);
 // Compare the bounded result against an unclipped, much wider reference at
 // exactly the same font size. Pixel equality proves no wrapping/cropping.
 const reference=React.cloneElement(node,{},[React.cloneElement(cell,{style:{...cell.props.style,width:950,height:200,overflow:'visible'}})]);
 const png=async n=>Buffer.from(await new ImageResponse(n,{width:1080,height:1350,fonts}).arrayBuffer());
 const [a,b]=await Promise.all([png(node),png(reference)]);
 const raw=async p=>sharp(p).raw().toBuffer();
 assert.deepEqual(await raw(a),await raw(b),'full MFGM text must render identically without clipping');
 if(process.env.P4_TEST_OUTPUT)await sharp(a).extract({left:30,top:25,width:600,height:120}).png().toFile(process.env.P4_TEST_OUTPUT);
 console.log('PASS actual P.4 copy + Swei bold font: no clipped glyphs; editable/PNG sizes identical; master bounds unchanged');
}
main().catch(e=>{console.error(e);process.exitCode=1});
