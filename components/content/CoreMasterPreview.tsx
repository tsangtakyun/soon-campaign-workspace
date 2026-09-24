"use client";

import { useEffect, useRef, useState } from 'react';
import { renderCoreMasterPage, coreMasterSubjectLayout, coreMasterLayoutGeometry, resolveMasterComposition } from '@/lib/content-templates/core-master-template';
import { SubjectFocusEditor } from './SubjectFocusEditor';
import type { ExtensionActions } from './BackgroundExtensionEditor';
import { CompositionAdvisor } from './CompositionAdvisor';
import type { CompositionAnalysis } from '@/lib/composition-advice';
import type { FocusAsset, SubjectFocus } from '@/lib/subject-crop';
import { findBrandTypeface, readerFacingCopy, localTypefaceFiles } from '@/lib/content-branding';
import { stylePreviewPages } from '@/lib/style-preview-pages';
import { previewComposition } from '@/lib/style-preview-composition';
import { previewAssets } from '@/lib/preview-asset-selection';

type Page = Record<string, unknown>;
type Asset = FocusAsset & { id?: string; url: string; assignedPage?: string; isCover?: boolean; sourceType?: string; previewPageIds?:string[] };

export function CoreMasterPreview({ contract, pages, assets, brandName, branding, onExpand, onSaveFocus, onAnalyzeFocus, extensionActions, saving }: {
  contract: unknown; pages: Page[]; assets: Asset[]; brandName: string;
  branding?: { logoUrl: string | null; fontStyle: string | null }; onExpand?: () => void;
  saving?: boolean;
  extensionActions?: ExtensionActions;
  onSaveFocus?: (id: string, updates: { subjectFocus: SubjectFocus | null; width: number; height: number }) => Promise<boolean>;
  onAnalyzeFocus?: (id: string) => Promise<CompositionAnalysis>;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(320);
  const frame = useRef<HTMLDivElement>(null);
  const typeface = findBrandTypeface(branding?.fontStyle);
  const [loadedFont, setLoadedFont] = useState('');
  const [fontError, setFontError] = useState(false);
  const activeFont = loadedFont === typeface?.fontFamily ? loadedFont : '';
  useEffect(() => {
    let cancelled = false;
    setLoadedFont('');
    setFontError(false);
    if (!typeface) return;
    const link = typeface.isGoogleFont ? document.createElement('link') : null;
    const load = async () => {
      if (link) {
        link.rel = 'stylesheet'; link.href = typeface.cdnUrl;
        await new Promise<void>((resolve, reject) => { link.onload = () => resolve(); link.onerror = reject; document.head.appendChild(link); });
        await document.fonts.load(`16px "${typeface.fontFamily}"`);
      } else {
        const url = localTypefaceFiles[typeface.id] ? `/fonts/max32002/${localTypefaceFiles[typeface.id]}` : typeface.cdnUrl;
        const font = new FontFace(typeface.fontFamily, `url(${JSON.stringify(url)})`);
        await font.load();
        if (cancelled) return;
        document.fonts.add(font);
      }
      if (!cancelled) setLoadedFont(typeface.fontFamily);
    };
    void load().catch(() => { if (!cancelled) setFontError(true); });
    return () => { cancelled = true; link?.remove(); };
  }, [typeface]);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [pages.length]);
  const samples = stylePreviewPages(pages);
  const currentIndex = Math.min(index, Math.max(0, samples.length - 1));
  const sample = samples[currentIndex];
  const page = sample?.page;
  if (!page) return <p>確認故事結構後即可預覽。</p>;
  const sourceIndex = sample.sourceIndex;
  const pageId = String(page.page || `P.${sourceIndex + 1}`);
  const {design,role,copy} = previewComposition(contract,page,sourceIndex,pages.length);
  const assigned = previewAssets(assets,pageId,role==='cover');
  const primary = assigned[0];
  const {fields,body}=copy;
  fields['asset.credit'] = primary?.sourceType === 'ai_generated' ? 'AI 生成素材' : '';
  fields['asset.secondary.credit'] = assigned[1]?.sourceType === 'ai_generated' ? 'AI 生成素材' : '';
  fields.page_number = String(sourceIndex + 1).padStart(2, '0');
  const resolved = design ? resolveMasterComposition({ design, copy, page: fields.page_number, primary, secondary: assigned[1] }) : null;
  const pendingComposition=primary?.compositionMode==='ai' && resolved?.primary?.compositionFit==='contain' && primary.autoExtensionDeclinedUrl!==primary.url;
  const crops = resolved ? Object.values(coreMasterSubjectLayout(resolved)) : [];
  const geometry = resolved ? coreMasterLayoutGeometry(resolved) : null;
  const primaryFrame = geometry?.images.find(image => image.asset === primary)?.rect;
  return <section className="master-preview" data-preview-version="three-samples-v3">
    <div ref={frame} style={{ width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative', background: '#f4f0e8' }}>
      {!primary ? <div role="status" style={{padding:24,color:'#665b53',height:'100%',display:'grid',alignContent:'center',textAlign:'center'}}><strong>預覽圖片尚未配對完成</strong><p>正在準備或等待合適圖片；這不是生成完成的圖片。</p></div> : design ? <div style={{ width: 1080, height: 1350, transform: `scale(${width / 1080})`, transformOrigin: 'top left' }}>
        {renderCoreMasterPage({ design, copy, page: fields.page_number,
          primary, secondary: assigned[1], branding: { name: brandName, logoUrl: branding?.logoUrl },
          fonts: { family: activeFont || 'SOON Preview Sans', editorialFamily: activeFont || 'SOON Preview Serif' } })}
      </div> : <p>此頁型尚未有可用母版，請返回檢查風格規格。</p>}
    </div>
    <nav aria-label="母版預覽頁面" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'10px 12px',background:'#f4f0e8'}}>
      {samples.map((item, n) => <button key={item.sourceIndex} type="button" aria-pressed={currentIndex === n} onClick={() => setIndex(n)}>{item.label}</button>)}
      {onExpand ? <button type="button" onClick={onExpand}>放大</button> : null}
    </nav>
    <p style={{fontSize:11,margin:'8px 12px',color:'#666'}}>風格示範 · {sample.label}{!primary ? ' · 此頁未配圖' : ''} · 選定後再製作完整內容</p>
    {pendingComposition ? <p role="status" style={{fontSize:12,margin:'8px 12px',color:'#6b2c30'}}>構圖待處理：母版保持不變，目前原圖僅作參考，並非延伸完成。請返回素材步驟換圖或選擇原圖創作。</p> : null}
    {crops.some(crop => crop.active) ? <p style={{fontSize:11,margin:'8px 12px',color:'#6b2c30'}}>{crops.some(crop => crop.constrained) ? '圖片比例限制：主體仍可能被裁切或與文字重疊，請換圖或確認原圖呈現；不會自動更改母版。' : '已按主體焦點及文字安全區調整裁切。'}</p> : null}
    {!primary?.compositionMode && extensionActions && onAnalyzeFocus && onSaveFocus && primary?.id && primaryFrame && geometry ? <CompositionAdvisor key={`${role}-${primary.id}-${primary.url}`} asset={{ ...primary, id: primary.id }} frame={primaryFrame} textZones={geometry.textZones} actions={extensionActions} analyze={onAnalyzeFocus} saveFocus={onSaveFocus} disabled={saving}/> : null}
    <details style={{ padding: '8px 12px', fontSize: 12 }}><summary>進階調整 · 手動主體焦點</summary>
    {onSaveFocus && primary?.id ? <SubjectFocusEditor key={`${primary.id}-${primary.url}-${JSON.stringify(primary.subjectFocus)}`} asset={{ ...primary, id: primary.id }} disabled={saving} onSave={onSaveFocus} onAnalyze={onAnalyzeFocus}/> : null}
    {onSaveFocus && assigned[1]?.id ? <SubjectFocusEditor key={`${assigned[1].id}-${assigned[1].url}-${JSON.stringify(assigned[1].subjectFocus)}`} asset={{ ...assigned[1], id: assigned[1].id! }} disabled={saving} onSave={onSaveFocus} onAnalyze={onAnalyzeFocus}/> : null}
    </details>
    <p style={{fontSize:11,margin:'8px 12px',color:'#666'}}>{activeFont ? '已套用品牌字型' : branding?.fontStyle ? fontError || !typeface ? '品牌字型未能載入，暫用風格字型' : '品牌字型載入中…' : '未設定品牌字型，使用風格字型'}</p>
    <style>{`
      @font-face{font-family:'SOON Preview Serif';src:url('/fonts/magazine/Serif-Regular.otf');font-weight:400;font-display:swap}
      @font-face{font-family:'SOON Preview Serif';src:url('/fonts/magazine/Serif-Black.otf');font-weight:900;font-display:swap}
      @font-face{font-family:'SOON Preview Sans';src:url('/fonts/magazine/Sans-Regular.otf');font-weight:400;font-display:swap}
      @font-face{font-family:'SOON Preview Sans';src:url('/fonts/magazine/Sans-Bold.otf');font-weight:700;font-display:swap}
      .master-preview button{border:1px solid #d8d0c5;border-radius:6px;background:white;color:#53282a;padding:5px 10px;cursor:pointer}
      .master-preview button:disabled{opacity:.35;cursor:default}
      .master-preview button[aria-pressed=true]{background:#6b2c30;color:white;border-color:#6b2c30}
    `}</style>
  </section>;
}
