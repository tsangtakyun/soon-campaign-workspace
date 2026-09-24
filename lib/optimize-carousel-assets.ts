import { compositionAdvice, type CompositionAnalysis, type ExtensionPlacement } from './composition-advice';
import { applyExtension, type ExtensionPreview, type ExtendableAsset } from './extension-asset';
import type { CropRect } from './subject-crop';

export type OptimizationFrame = { assetId: string; frame: CropRect; textZones: CropRect[]; page: string };
export type OptimizationIssue = {page:string;assetId:string;message:string;code?:string;runId?:string;stage?:string};
/** Complete asset preparation before committing drafts_confirmed or starting raster output. */
export async function optimizeCarouselAssets<T extends ExtendableAsset & {id:string}>(assets: T[], frames: OptimizationFrame[], actions: {
  analyze: (id:string) => Promise<CompositionAnalysis>;
  generate: (id:string, placement?:ExtensionPlacement) => Promise<ExtensionPreview>;
  dimensions: (asset:T) => Promise<{width:number;height:number}>;
  progress: (message:string) => void;
  failure?: (issue:OptimizationIssue) => void;
  checkpoint?: (assets:T[]) => Promise<void>;
}) {
  const prepared = new Map(assets.map(asset => [asset.id, {...asset}]));
  const analyses = new Map<string, CompositionAnalysis>();
  const rejected = new Set<string>();
  for (const item of frames) {
    const asset = prepared.get(item.assetId);
    if (!asset || asset.extensionOriginal || asset.autoExtensionDeclinedUrl === asset.url || rejected.has(asset.id)) continue;
    try {
    await (async()=>{
    actions.progress(`正在分析 ${item.page} 圖片構圖…`);
    const size = await actions.dimensions(asset);
    let analysis = analyses.get(asset.id);
    if (!analysis) { analysis = await actions.analyze(asset.id); analyses.set(asset.id, analysis); }
    const advice = compositionAdvice({...size, frame:item.frame, textZones:item.textZones, analysis, documentary:false});
    if (advice.action !== 'extend' || !advice.placement) {
      if(advice.action==='split' || advice.action==='review')prepared.set(asset.id,{...asset,compositionFit:'contain'});
      return;
    }
    actions.progress(`正在為 ${item.page} ${advice.title}，完成後才會製作圖片…`);
    let preview: ExtensionPreview;
    try { preview = await actions.generate(asset.id, advice.placement); }
    catch(error) {
      if((error as {code?:string})?.code!=='EXTENSION_REJECTED')throw error;
      actions.progress(`${item.page} 延伸未通過檢查，保留原圖。`);
      // A model rejection is not a user opt-out. Keep it auditable without
      // preventing a later composition analysis (the API deduplicates paid runs).
      rejected.add(asset.id);
      prepared.set(asset.id,{...asset,extensionRejectedUrl:asset.url,compositionFit:'contain'});
      return;
    }
    prepared.set(asset.id, applyExtension({...asset,...size}, preview));
    })();
    } catch(error) {
      if(!actions.failure)throw error;
      const e=error as Error & {code?:string;runId?:string;stage?:string};
      rejected.add(asset.id);
      actions.failure({page:item.page,assetId:asset.id,message:e.message||'本頁處理未完成',code:e.code,runId:e.runId,stage:e.stage});
      actions.progress(`${item.page} 未完成，原圖保留；繼續檢查其他頁。`);
    }
    if(actions.checkpoint)await actions.checkpoint(assets.map(a=>prepared.get(a.id)!));
  }
  return assets.map(asset => prepared.get(asset.id)!);
}
