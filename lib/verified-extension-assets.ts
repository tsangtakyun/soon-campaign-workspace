import { qualityApproved } from './extension-quality';
import { EXTENSION_VERSION } from './background-extension';
import type { CompositionVariant } from './composition-mode';

/** Audit existing choices without changing them. Missing review is not rejection. */
export function verifiedExtensionAssets<T extends {id:string;url:string;compositionVariants?:Record<string,CompositionVariant>;extensionId?:string;extensionUserApprovedId?:string;extensionOriginal?:{url:string;[key:string]:unknown}}>(assets:T[], runs:any[]) {
  const restored:string[]=[], unverified:string[]=[];
  const safe=assets.map(asset=>{
    if(asset.compositionVariants) {
      const variants=Object.fromEntries(Object.entries(asset.compositionVariants).map(([key,v])=>{
        if(v.action!=='extend')return [key,v];
        const run=runs.find(r=>r.id===v.extensionId);
        if(run?.status==='ready' && run.input?.assetId===asset.id && run.output?.originalUrl===asset.url && v.sourceUrl===asset.url && run.output?.url===v.url && !run.output?.rejected && qualityApproved(run.output?.review))return [key,v];
        unverified.push(asset.id);
        return [key,{sourceUrl:asset.url,action:'contain' as const,reason:'未能核對此構圖的品質驗收，保留原圖。'}];
      }));
      asset={...asset,compositionVariants:variants};
    }
    if(!asset.extensionOriginal)return asset;
    const run=runs.find(r=>r.id===asset.extensionId);
    if(run?.status==='ready' && run.output?.url===asset.url && asset.extensionUserApprovedId===run.id)return asset;
    if(run?.status==='ready' && run.input?.kind===EXTENSION_VERSION && run.input?.assetId===asset.id && run.output?.url===asset.url && !run.output?.rejected && qualityApproved(run.output?.review))return asset;
    unverified.push(asset.id);
    return asset;
  });
  return {assets:safe,restored,unverified};
}
