export type PreviewAsset = {id?:string;url:string;assignedPage?:string;isCover?:boolean;previewPageIds?:string[]};
export function previewAssets<T extends PreviewAsset>(assets:T[],pageId:string,cover:boolean):T[] {
  const manual=assets.filter(a=>a.assignedPage===pageId);
  if(manual.length)return manual;
  const available=assets.filter(a=>!a.assignedPage||a.assignedPage==='auto');
  const selected=available.filter(a=>a.previewPageIds?.includes(pageId));
  const explicitCover=cover?available.find(a=>a.isCover):undefined;
  return explicitCover?[explicitCover,...selected.filter(a=>a.id!==explicitCover.id)]:selected;
}
