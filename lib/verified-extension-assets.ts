import { qualityApproved } from './extension-quality';
import { EXTENSION_VERSION } from './background-extension';

/** Audit existing choices without changing them. Missing review is not rejection. */
export function verifiedExtensionAssets<T extends {id:string;url:string;extensionId?:string;extensionUserApprovedId?:string;extensionOriginal?:{url:string;[key:string]:unknown}}>(assets:T[], runs:any[]) {
  const restored:string[]=[], unverified:string[]=[];
  const safe=assets.map(asset=>{
    if(!asset.extensionOriginal)return asset;
    const run=runs.find(r=>r.id===asset.extensionId);
    if(run?.status==='ready' && run.output?.url===asset.url && asset.extensionUserApprovedId===run.id)return asset;
    if(run?.status==='ready' && run.input?.kind===EXTENSION_VERSION && run.input?.assetId===asset.id && run.output?.url===asset.url && !run.output?.rejected && qualityApproved(run.output?.review))return asset;
    unverified.push(asset.id);
    return asset;
  });
  return {assets:safe,restored,unverified};
}
