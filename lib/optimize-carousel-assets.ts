import { compositionAdvice, type CompositionAnalysis, type ExtensionPlacement } from './composition-advice';
import { applyExtension, type ExtensionPreview, type ExtendableAsset } from './extension-asset';
import type { CropRect } from './subject-crop';

export type OptimizationFrame = { assetId: string; frame: CropRect; textZones: CropRect[]; page: string };
/** Complete asset preparation before committing drafts_confirmed or starting raster output. */
export async function optimizeCarouselAssets<T extends ExtendableAsset & {id:string}>(assets: T[], frames: OptimizationFrame[], actions: {
  analyze: (id:string) => Promise<CompositionAnalysis>;
  generate: (id:string, placement?:ExtensionPlacement) => Promise<ExtensionPreview>;
  dimensions: (asset:T) => Promise<{width:number;height:number}>;
  progress: (message:string) => void;
}) {
  const prepared = new Map(assets.map(asset => [asset.id, {...asset}]));
  const analyses = new Map<string, CompositionAnalysis>();
  for (const item of frames) {
    const asset = prepared.get(item.assetId);
    if (!asset || asset.extensionOriginal || asset.autoExtensionDeclinedUrl === asset.url) continue;
    actions.progress(`正在分析 ${item.page} 圖片構圖…`);
    const size = await actions.dimensions(asset);
    let analysis = analyses.get(asset.id);
    if (!analysis) { analysis = await actions.analyze(asset.id); analyses.set(asset.id, analysis); }
    const advice = compositionAdvice({...size, frame:item.frame, textZones:item.textZones, analysis, documentary:false});
    if (advice.action !== 'extend' || !advice.placement) continue;
    actions.progress(`正在為 ${item.page} ${advice.title}，完成後才會製作圖片…`);
    let preview: ExtensionPreview;
    try { preview = await actions.generate(asset.id, advice.placement); }
    catch(error) {
      if((error as {code?:string})?.code!=='EXTENSION_REJECTED')throw error;
      actions.progress(`${item.page} 延伸未通過檢查，保留原圖。`);
      prepared.set(asset.id,{...asset,autoExtensionDeclinedUrl:asset.url});
      continue;
    }
    prepared.set(asset.id, applyExtension({...asset,...size}, preview));
  }
  return assets.map(asset => prepared.get(asset.id)!);
}
