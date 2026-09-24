import { readerFacingCopy } from './content-branding';
import { getCoreMasterPageDesign, type CoreMasterRole } from './content-templates/core-master-template';

/** Preview and its AI geometry must be derived from the exact same copy. */
export function previewComposition(contract: unknown, page: Record<string,any>, index: number, total: number) {
  const requested=String(page.role || page.layout || 'longform');
  const role=(index===0?'cover':index===total-1?'end':['cover','longform','split','comparison','feature','end'].includes(requested)?requested:'longform') as CoreMasterRole;
  const original=getCoreMasterPageDesign(contract,role);
  const design=original?JSON.parse(JSON.stringify(original)):null;
  const fields:Record<string,string>={};
  const clean=(objects:any[])=>objects.forEach(o=>{
    const binding=String(o.data?.binding||'');
    if(binding.startsWith('content.'))fields[binding.slice(8)]='';
    if(/image/i.test(String(o.data?.role||'')) || String(o.type).toLowerCase()==='image')delete o.src;
    if(Array.isArray(o.objects))clean(o.objects);
  });
  if(design)clean(design.canvasJson?.objects||[]);
  const text=readerFacingCopy(page.copyDirection);
  const paragraphs=text.split(/\n+/).filter(Boolean),sentences=text.match(/[^。！？]+[。！？]?/gu)||[];
  const short=sentences.find(line=>[...line].length<=24);
  const body=Array.isArray(page.body)?page.body.map(readerFacingCopy):role==='cover'?(short?[short]:[]):paragraphs.length>1?paragraphs:sentences;
  fields.headline=readerFacingCopy(page.headline);
  fields.body=body.join('\n');
  body.forEach((line:string,n:number)=>{fields[`body_${n+1}`]=line;});
  // Do not invent semantic comparison columns from alternating narrative sentences.
  if(role==='end'){fields.subheadline=body[0]||'';fields.question=body[1]||'';fields.cta=body[2]||'';}
  for(let n=0;n<3;n++){
    const sentence=body[n]||'',split=sentence.search(/[，：:]/u);
    fields[`feature_title_${n+1}`]=split>0&&split<24?sentence.slice(0,split):'';
    fields[`feature_body_${n+1}`]=split>0&&split<24?sentence.slice(split+1):sentence;
  }
  if(page.fields&&typeof page.fields==='object')for(const [k,v]of Object.entries(page.fields))if(typeof v==='string')fields[k]=readerFacingCopy(v);
  fields.page_number=String(index+1).padStart(2,'0');
  return {design,role,copy:{headline:fields.headline,body,fields,contentRole:page.contentRole || (role==='comparison'?'narrative':undefined)},page:fields.page_number};
}
