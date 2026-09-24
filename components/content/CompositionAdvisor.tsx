"use client";
import { useEffect, useRef, useState } from 'react';
import { compositionAdvice, type CompositionAnalysis } from '@/lib/composition-advice';
import type { CropRect, SubjectFocus } from '@/lib/subject-crop';
import { BackgroundExtensionEditor, type ExtensionActions } from './BackgroundExtensionEditor';

export function CompositionAdvisor({ asset, frame, textZones, analyze, saveFocus, actions, disabled }: {
  asset: { id: string; url: string; width?: number; height?: number; extensionOriginal?: { url: string }; autoExtensionDeclinedUrl?: string };
  frame: CropRect; textZones: CropRect[]; analyze: (id: string) => Promise<CompositionAnalysis>;
  saveFocus: (id: string, updates: { subjectFocus: SubjectFocus | null; width: number; height: number }) => Promise<boolean>;
  actions: ExtensionActions; disabled?: boolean;
}) {
  const [analysis, setAnalysis] = useState<CompositionAnalysis | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!asset.extensionOriginal);
  const [documentary, setDocumentary] = useState(false);
  const [size, setSize] = useState({ width: asset.width || 0, height: asset.height || 0 });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const analyzeRef = useRef(analyze);
  const pending = useRef<Promise<CompositionAnalysis> | null>(null);
  useEffect(() => { analyzeRef.current = analyze; }, [analyze]);
  useEffect(() => {
    if (asset.extensionOriginal) return;
    let active = true;
    // Reuse the same request during React StrictMode's effect replay.
    pending.current ||= analyzeRef.current(asset.id);
    pending.current.then(value => { if (active) setAnalysis(value); }).catch(() => { if (active) setError('構圖分析未完成，原圖未改動。可稍後重試或用進階調整。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [asset.id, asset.url, asset.extensionOriginal]);
  async function retry() {
    setLoading(true); setError('');
    try { setAnalysis(await analyzeRef.current(asset.id)); }
    catch { setError('構圖分析未完成，請稍後再試。'); }
    finally { setLoading(false); }
  }
  async function applyCrop() {
    if (!analysis?.focus) return;
    setSaving(true);
    try { setMessage(await saveFocus(asset.id, { subjectFocus: analysis.focus, ...size }) ? '已套用裁切建議，未生成新圖片。' : '未能儲存，請重試。'); }
    catch { setMessage('未能儲存，請重試。'); }
    finally { setSaving(false); }
  }
  const advice = analysis ? compositionAdvice({ ...size, frame, textZones, analysis, documentary }) : null;
  return <section style={{ margin: 12, padding: 12, background: '#f4f8e8', borderRadius: 8 }} aria-label="SOON 構圖建議">
    <img src={asset.url} alt="" style={{ display: 'none' }} onLoad={event => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}/>
    <strong>SOON 構圖建議</strong>
    {asset.extensionOriginal ? <p>已套用延伸版，保留現有構圖；唔會再次生成。</p> : <>
      <p style={{ fontSize: 11 }}>自動分析原圖、主體及版面，使用少量 token；開啟自動延伸後，合適的背景會直接生成及套用，可還原原圖。</p>
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={documentary} onChange={event => setDocumentary(event.target.checked)}/> 必須保留原始紀實畫面，不建議生成背景</label>
      <div role="status">{loading ? <p>正在分析構圖…</p> : error ? <p>{error}</p> : advice ? <><h4 style={{ margin: '10px 0 6px' }}>{advice.title}</h4><p style={{ fontSize: 12 }}>{advice.reason}</p></> : null}</div>
      {error ? <button type="button" disabled={loading || disabled} onClick={() => void retry()}>重新分析構圖</button> : null}
      {!loading && !error && advice?.action === 'crop' ? <button type="button" disabled={disabled || saving} onClick={() => void applyCrop()}>套用裁切建議（不生成圖片）</button> : null}
      {!loading && !error && advice?.action === 'split' ? <p style={{ fontSize: 12 }}>此版先提供分區建議，未自動更換母版；可改選圖文分區版面或圖片。</p> : null}
    </>}
    <p role="status">{message}</p>
    <BackgroundExtensionEditor key={JSON.stringify(advice?.placement)} asset={asset} actions={actions} disabled={disabled || saving || (!asset.extensionOriginal && advice?.action !== 'extend')} placement={advice?.placement}
      suggested={!loading && !error && advice?.action === 'extend' && !documentary}/>
  </section>;
}
