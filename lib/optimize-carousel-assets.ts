import { compositionAdvice, type CompositionAnalysis, type ExtensionPlacement } from './composition-advice';
import { applyExtension, type ExtensionPreview, type ExtendableAsset } from './extension-asset';
import type { CropRect } from './subject-crop';
import { compositionKey, type CompositionVariant } from './composition-mode';

export type OptimizationFrame = { assetId: string; frame: CropRect; textZones: CropRect[]; page: string };
export type OptimizationIssue = {page:string;assetId:string;message:string;code?:string;runId?:string;stage?:string;compositionKey?:string};
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
    if (!asset || asset.extensionOriginal || asset.compositionMode==='original' || rejected.has(asset.id)) continue;
    const key=compositionKey(item.frame,item.textZones);
    const variant=asset.compositionVariants?.[key];
    const unresolved=(message:string)=>actions.failure?.({page:item.page,assetId:asset.id,message,code:'COMPOSITION_NEEDS_REVIEW',stage:'composition',compositionKey:key});
    if(asset.compositionMode==='ai' && variant?.sourceUrl===asset.url && (variant.action!=='contain' || variant.policyVersion==='edge-evidence-v5' || asset.autoExtensionDeclinedUrl===asset.url)){
      if(variant.action==='contain' && asset.autoExtensionDeclinedUrl!==asset.url)unresolved('此圖片尚未配合母版；請換圖或明確確認保留原圖。');
      continue;
    }
    const record=(value:Omit<CompositionVariant,'sourceUrl'>)=>prepared.set(asset.id,{...prepared.get(asset.id)!,compositionVariants:{...prepared.get(asset.id)?.compositionVariants,[key]:{...value,sourceUrl:asset.url,policyVersion:'edge-evidence-v5'}}});
    if(asset.autoExtensionDeclinedUrl===asset.url){
      if(asset.compositionMode==='ai')record({action:'contain',reason:'用家已選擇保留原圖。'});
      continue;
    }
    try {
    await (async()=>{
    actions.progress(`正在分析 ${item.page} 圖片構圖…`);
    const size = await actions.dimensions(asset);
    prepared.set(asset.id,{...prepared.get(asset.id)!,...size});
    let analysis = analyses.get(asset.id);
    if (!analysis) { analysis = await actions.analyze(asset.id); analyses.set(asset.id, analysis); }
    const advice = compositionAdvice({...size, frame:item.frame, textZones:item.textZones, analysis, documentary:false});
    if (advice.action !== 'extend' || !advice.placement) {
      if(asset.compositionMode==='ai')record({action:advice.action==='split'||advice.action==='review'?'contain':'keep',reason:advice.reason,subjectFocus:analysis.focus});
      else if(advice.action==='split' || advice.action==='review')prepared.set(asset.id,{...asset,compositionFit:'contain'});
      if(advice.action==='split'||advice.action==='review')unresolved(advice.reason);
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
      if(asset.compositionMode==='ai')record({action:'contain',reason:'背景延伸未通過品質檢查，完整保留原圖。'});
      else {rejected.add(asset.id);prepared.set(asset.id,{...asset,extensionRejectedUrl:asset.url,compositionFit:'contain'});}
      unresolved((error as {stage?:string}).stage==='boundary_analysis'?'生成前邊界檢查未通過，未生成新背景；請確認原圖或換圖。':'背景延伸未通過品質檢查；母版保持不變，請換圖或確認保留原圖。');
      return;
    }
    if(asset.compositionMode==='ai') {
      if(preview.originalUrl!==asset.url)throw new Error('圖片來源已改變，未套用延伸結果。');
      record({action:'extend',reason:advice.reason,url:preview.url,width:preview.width,height:preview.height,extensionId:preview.id});
    } else prepared.set(asset.id, applyExtension({...asset,...size}, preview));
    })();
    } catch(error) {
      if(!actions.failure)throw error;
      const e=error as Error & {code?:string;runId?:string;stage?:string};
      if(asset.compositionMode!=='ai')rejected.add(asset.id);
      actions.failure({page:item.page,assetId:asset.id,message:e.message||'本頁處理未完成',code:e.code,runId:e.runId,stage:e.stage,compositionKey:key});
      actions.progress(`${item.page} 未完成，原圖保留；繼續檢查其他頁。`);
    }
    if(actions.checkpoint)await actions.checkpoint(assets.map(a=>prepared.get(a.id)!));
  }
  return assets.map(asset => prepared.get(asset.id)!);
}
