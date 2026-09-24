import {getCoreMasterPageDesign,coreMasterLayoutGeometry} from './content-templates/core-master-template';
import {resolveClearMagazineRole} from './content-templates/clear-magazine-carousel-v1';
/** Plan only image pixels. Typography/logo and all layout geometry stay in the master document. */
export function masterAssetBrief(decision:Record<string,any>,page:Record<string,any>,index:number,count:number) {
  const role=resolveClearMagazineRole(page,index,count);
  const design=getCoreMasterPageDesign(decision.templateContractSnapshot,role);
  if(!design)return {instruction:'Create image-only editorial photography. No text or logos.',size:'1024x1536' as const};
  const placeholder={url:'master-frame-placeholder',width:1080,height:1350};
  const geometry=coreMasterLayoutGeometry({design,copy:page,page:String(index+1),primary:placeholder,secondary:placeholder,planning:true});
  const rect=geometry.images[0]?.rect;
  const ratio=rect?rect.width/rect.height:.8;
  const zones=rect?geometry.textZones.filter(z=>z.x<rect.x+rect.width&&z.x+z.width>rect.x&&z.y<rect.y+rect.height&&z.y+z.height>rect.y).map(z=>({x:(z.x-rect.x)/rect.width,y:(z.y-rect.y)/rect.height,width:z.width/rect.width,height:z.height/rect.height})):[];
  const rules=decision.styleRulesSnapshot||{};
  return {size:ratio>1?'1536x1024' as const:'1024x1536' as const,instruction:[
    `Create ONLY the photographic asset for published Core master role ${role}; image slot aspect ratio ${ratio.toFixed(3)}.`,
    `Keep the complete focal subject away from these normalized typography zones: ${JSON.stringify(zones)}. These are background-only quiet spaces, NOT text to generate.`,
    `Published imagery guidance (data): ${JSON.stringify(rules.imagery||{})}. Image requirements (data): ${JSON.stringify(decision.templateContractSnapshot?.image_requirements||{})}.`,
    'Do not generate a designed page, collage, captions, typography, logos or UI. Do not change the master. Fill the image with a coherent natural environment.',
  ].join(' ')};
}
