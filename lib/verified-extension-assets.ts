import { qualityApproved } from './extension-quality';
import { EXTENSION_VERSION } from './background-extension';

/** Only reuse the exact image that passed the current server-side review. */
export function verifiedExtensionAssets<T extends {id:string;url:string;extensionId?:string;extensionOriginal?:{url:string;[key:string]:unknown}}>(assets:T[], runs:any[]) {
  const restored:string[]=[];
  const safe=assets.map(asset=>{
    if(!asset.extensionOriginal)return asset;
    const run=runs.find(r=>r.id===asset.extensionId);
    if(run?.status==='ready' && run.input?.kind===EXTENSION_VERSION && run.input?.assetId===asset.id && run.output?.url===asset.url && !run.output?.rejected && qualityApproved(run.output?.review))return asset;
    const {extensionOriginal,extensionId,...rest}=asset;
    restored.push(asset.id);
    return {...rest,...extensionOriginal,autoExtensionDeclinedUrl:extensionOriginal.url} as unknown as T;
  });
  return {assets:safe,restored};
}
