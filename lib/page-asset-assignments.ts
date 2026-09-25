type Draft = Record<string, any>;
type Asset = Record<string, any> & {id?:string;assignedPage?:string};

export function mergeAssignedPageAssets(draft:Draft,index:number,assets:Asset[]):Draft{
  const page=String(draft.page||`P.${index+1}`);
  const valid=new Set(assets.map(asset=>asset.id).filter((id):id is string=>typeof id==='string'&&Boolean(id)));
  const assigned=assets.filter(asset=>asset.assignedPage===page&&asset.id&&valid.has(asset.id)).map(asset=>asset.id as string);
  const existing=[...(Array.isArray(draft.assetIds)?draft.assetIds:[]),draft.assetId]
    .filter((id):id is string=>typeof id==='string'&&valid.has(id));
  const role=String(draft.role||draft.layout||'');
  const comparison=role==='comparison'&&draft.contentRole!=='narrative';
  const limit=comparison||role==='split'?2:1;
  const assetIds=[...new Set([...assigned,...existing])].slice(0,limit);
  const matched=assetIds.length>=(comparison?2:1);
  const result:Draft={...draft,assetId:assetIds[0]||'',assetIds,assetStatus:matched?'matched':'missing'};
  if(matched)delete result.assetRequest;
  return result;
}

export function mergeAssignedAssetsIntoDrafts(drafts:Draft[],assets:Asset[]):Draft[]{
  return drafts.map((draft,index)=>mergeAssignedPageAssets(draft,index,assets));
}
