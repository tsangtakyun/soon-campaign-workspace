"use client";
import { useState } from 'react';
import { CompositionAdvisor } from './CompositionAdvisor';
import { coreMasterLayoutGeometry, getCoreMasterPageDesign } from '@/lib/content-templates/core-master-template';
import { resolveClearMagazineRole } from '@/lib/content-templates/clear-magazine-carousel-v1';
import type { CompositionAnalysis } from '@/lib/composition-advice';
import type { ExtensionActions } from './BackgroundExtensionEditor';
import type { SubjectFocus, FocusAsset } from '@/lib/subject-crop';

type Draft = { headline?: string; subheadline?: string; body?: string[]; assetId?: string; assetIds?: string[]; templateArtboardId?: string; role?: string; layout?: string };
export function PageCompositionAdvisor({ contract, drafts, assets, page, actions, analyze, saveFocus, disabled }: {
  contract: unknown; drafts: Draft[]; assets: Array<FocusAsset & {id:string;url:string}>; page: string;
  actions: ExtensionActions; analyze: (id:string)=>Promise<CompositionAnalysis>;
  saveFocus: (id:string,updates:{subjectFocus:SubjectFocus|null;width:number;height:number})=>Promise<boolean>; disabled?:boolean;
}) {
  const [open,setOpen]=useState(false);
  const index=Number(page.replace('P.',''))-1, draft=drafts[index];
  if(!draft)return null;
  const design=getCoreMasterPageDesign(contract,resolveClearMagazineRole(draft,index,drafts.length));
  if(!design)return null;
  const ids=[...new Set([...(draft.assetIds||[]),draft.assetId].filter(Boolean))];
  const primary=assets.find(a=>a.id===ids[0]),secondary=assets.find(a=>a.id===ids[1]);
  const geometry=coreMasterLayoutGeometry({design,copy:draft,page,primary,secondary});
  return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>AI 構圖建議 · {page}</summary>
    <p>按本頁圖片框分析；套用只更新素材，現有輸出及已儲存編輯不會被覆寫。共用此素材的頁面下次製作亦會使用延伸版。</p>
    {open?geometry.images.map(image=>{
      const asset=assets.find(a=>a.url===image.asset.url);
      return asset?<CompositionAdvisor key={`${page}-${image.key}-${asset.url}`} asset={asset} frame={image.rect} textZones={geometry.textZones} actions={actions} analyze={analyze} saveFocus={saveFocus} disabled={disabled}/>:null;
    }):null}
  </details>;
}
