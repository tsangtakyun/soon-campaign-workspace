"use client";

import { useEffect, useRef, useState } from 'react';
import { getCoreMasterPageDesign, renderCoreMasterPage, type CoreMasterRole } from '@/lib/content-templates/core-master-template';
import { findBrandTypeface, readerFacingCopy, localTypefaceFiles } from '@/lib/content-branding';

type Page = Record<string, unknown>;
type Asset = { url: string; assignedPage?: string; isCover?: boolean; sourceType?: string };
const roles = new Set(['cover', 'longform', 'split', 'comparison', 'feature', 'end']);

export function CoreMasterPreview({ contract, pages, assets, brandName, branding, onExpand }: {
  contract: unknown; pages: Page[]; assets: Asset[]; brandName: string;
  branding?: { logoUrl: string | null; fontStyle: string | null }; onExpand?: () => void;
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
  const currentIndex = Math.min(index, Math.max(0, pages.length - 1));
  const page = pages[currentIndex];
  if (!page) return <p>確認故事結構後即可預覽。</p>;
  const pageId = String(page.page || `P.${currentIndex + 1}`);
  const requestedRole = String(page.role || page.layout || 'longform').toLowerCase();
  const role = (currentIndex === 0 ? 'cover' : currentIndex === pages.length - 1 ? 'end' : roles.has(requestedRole) ? requestedRole : 'longform') as CoreMasterRole;
  const original = getCoreMasterPageDesign(contract, role);
  const assigned = assets.filter(asset => asset.assignedPage === pageId);
  const primary = assigned[0] || (role === 'cover' ? assets.find(asset => asset.isCover && !asset.assignedPage) : undefined);
  // Blank all example content: only this project's copy and assigned assets belong here.
  const design = original ? JSON.parse(JSON.stringify(original)) : null;
  const fields: Record<string, string> = {};
  const cleanObjects = (objects: Array<Record<string, any>>) => objects.forEach(object => {
    const binding = String(object.data?.binding || '');
    const objectRole = String(object.data?.role || '');
    if (binding.startsWith('content.')) fields[binding.slice(8)] = '';
    if (/image/i.test(objectRole) || String(object.type).toLowerCase() === 'image') delete object.src;
    if (['source', 'highlight', 'cta', 'question', 'eyebrow'].includes(objectRole)) fields[objectRole] = '';
    if (Array.isArray(object.objects)) cleanObjects(object.objects);
  });
  if (design) cleanObjects(design.canvasJson?.objects || []);
  const text = readerFacingCopy(page.copyDirection);
  const paragraphs = text.split(/\n+/).filter(Boolean);
  const body = paragraphs.length > 1 ? paragraphs : (text.match(/[^。！？]+[。！？]?/gu) || []);
  fields.headline = readerFacingCopy(page.headline);
  fields.body = body.join('\n');
  body.forEach((line, n) => { fields[`body_${n + 1}`] = line; });
  // Structural previews use existing copy only; final edited fields are prepared next step.
  fields.left_body = body.filter((_, n) => n % 2 === 0).join('\n');
  fields.right_body = body.filter((_, n) => n % 2 === 1).join('\n');
  for (let n = 0; n < 3; n++) {
    const sentence = body[n] || '';
    const split = sentence.search(/[，：:]/u);
    fields[`feature_title_${n + 1}`] = split > 0 && split < 24 ? sentence.slice(0, split) : '';
    fields[`feature_body_${n + 1}`] = split > 0 && split < 24 ? sentence.slice(split + 1) : sentence;
  }
  fields.highlight = body[2] || '';
  fields['asset.credit'] = primary?.sourceType === 'ai_generated' ? 'AI 生成素材' : '';
  fields['asset.secondary.credit'] = assigned[1]?.sourceType === 'ai_generated' ? 'AI 生成素材' : '';
  // Use already prepared editorial fields when present, without changing the project.
  if (page.fields && typeof page.fields === 'object') {
    for (const [key, value] of Object.entries(page.fields)) if (typeof value === 'string') fields[key] = readerFacingCopy(value);
  }
  fields.page_number = String(currentIndex + 1).padStart(2, '0');
  return <section className="master-preview">
    <div ref={frame} style={{ width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative', background: '#f4f0e8' }}>
      {design ? <div style={{ width: 1080, height: 1350, transform: `scale(${width / 1080})`, transformOrigin: 'top left' }}>
        {renderCoreMasterPage({ design, copy: { headline: fields.headline, body, fields }, page: fields.page_number,
          primary, secondary: assigned[1], branding: { name: brandName, logoUrl: branding?.logoUrl },
          fonts: { family: activeFont || 'SOON Preview Sans', editorialFamily: activeFont || 'SOON Preview Serif' } })}
      </div> : <p>此頁型尚未有可用母版，請返回檢查風格規格。</p>}
    </div>
    <nav aria-label="母版預覽頁面" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'10px 12px',background:'#f4f0e8'}}>
      <button type="button" aria-label="上一頁預覽" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)}>←</button>
      <span style={{fontSize:12}}>第 {currentIndex + 1} / {pages.length} 頁</span>
      <button type="button" aria-label="下一頁預覽" disabled={currentIndex === pages.length - 1} onClick={() => setIndex(currentIndex + 1)}>→</button>
      {onExpand ? <button type="button" onClick={onExpand}>放大</button> : null}
    </nav>
    <p style={{fontSize:11,margin:'8px 12px',color:'#666'}}>{primary ? primary.sourceType === 'ai_generated' ? 'AI 生成素材' : '已配對本頁素材' : '此頁未配圖，未使用其他頁圖片替代'} · 母版排版預覽，文案仍待逐頁整理</p>
    <p style={{fontSize:11,margin:'8px 12px',color:'#666'}}>{activeFont ? '已套用品牌字型' : branding?.fontStyle ? fontError || !typeface ? '品牌字型未能載入，暫用風格字型' : '品牌字型載入中…' : '未設定品牌字型，使用風格字型'}</p>
    <style>{`
      @font-face{font-family:'SOON Preview Serif';src:url('/fonts/magazine/Serif-Regular.otf');font-weight:400;font-display:swap}
      @font-face{font-family:'SOON Preview Serif';src:url('/fonts/magazine/Serif-Black.otf');font-weight:900;font-display:swap}
      @font-face{font-family:'SOON Preview Sans';src:url('/fonts/magazine/Sans-Regular.otf');font-weight:400;font-display:swap}
      @font-face{font-family:'SOON Preview Sans';src:url('/fonts/magazine/Sans-Bold.otf');font-weight:700;font-display:swap}
      .master-preview button{border:1px solid #d8d0c5;border-radius:6px;background:white;color:#53282a;padding:5px 10px;cursor:pointer}
      .master-preview button:disabled{opacity:.35;cursor:default}
    `}</style>
  </section>;
}
