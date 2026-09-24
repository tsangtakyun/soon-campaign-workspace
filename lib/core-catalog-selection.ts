import {coreRegistry,coreCode,creatorCode,object,type ProductionStyle} from './production-style';
import {hasCoreMasterDesigns} from './content-templates/core-master-template';
export const catalogFormats:Record<string,string>={carousel:'instagram_carousel',single_image:'instagram_single_feed'};
export function catalogStyles(styles:ProductionStyle[]) {
  return styles.flatMap(style=>{
    const templates=style.templates.filter(t=>hasCoreMasterDesigns(t.version.contract));
    return templates.length?[{...style,templates}]:[];
  });
}
/** Trust only the published registry, never a browser-supplied contract or example. */
export async function selectCatalogStyle(format:string,code:string,expectedHash:string) {
  if(!catalogFormats[format])throw new Error('此格式不支援圖片母版選擇。');
  const registry=await coreRegistry(catalogFormats[format]);
  const style=catalogStyles(registry.styles).find(s=>s.code===coreCode(code));
  const template=style?.templates[0];
  if(!style||!template||template.version.contentHash!==expectedHash)throw new Error('母版已更新或未發布，請重新載入風格示範。');
  return {flowVersion:'core-master-v2',selectionMode:'core_catalog',recommendationId:null,inputHash:null,confirmedInputHash:null,
    templateCode:creatorCode(style.code),templateName:style.name,templateSource:'soon_core',templateVersion:style.version.number,
    styleId:style.styleId,styleVersionId:style.version.id,styleVersionRef:style.version.ref,styleContentHash:style.version.contentHash,styleRulesSnapshot:style.version.rules,
    renderTemplateCode:template.version.rendererCode,templateRegistryId:template.templateId,templateRegistryCode:template.code,
    templateRegistryVersion:template.version.number,templateContentHash:template.version.contentHash,templateContractSnapshot:template.version.contract,
    templateCreatorCommit:template.version.creatorCommit||null,templateSelectedAt:new Date().toISOString(),registryVersion:registry.registryVersion};
}
export function sameCatalogSelection(old:unknown,requested:unknown,format:unknown,oldFormat:unknown) {
  const a=object(old),b=object(requested);
  return a.selectionMode==='core_catalog'&&format===oldFormat&&a.templateCode===b.templateCode&&a.templateContentHash===b.templateContentHash;
}
