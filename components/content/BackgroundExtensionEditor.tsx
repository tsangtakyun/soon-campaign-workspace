"use client";
import { useState } from 'react';
import type { ExtensionPreview } from '@/lib/extension-asset';

export type ExtensionActions = {
  generate: (id: string) => Promise<ExtensionPreview>;
  apply: (id: string, preview: ExtensionPreview | null) => Promise<boolean>;
};
export function BackgroundExtensionEditor({ asset, actions, disabled }: {
  asset: { id: string; url: string; extensionOriginal?: { url: string } };
  actions: ExtensionActions; disabled?: boolean;
}) {
  const [preview, setPreview] = useState<ExtensionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function generate() {
    setBusy(true); setMessage('正在向下延伸背景，可能需 1–2 分鐘；原圖未有改動。');
    try { setPreview(await actions.generate(asset.id)); setMessage('預覽已保存。請檢查接駁位及背景，再決定套用。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '延伸失敗，原圖未改動。'); }
    finally { setBusy(false); }
  }
  async function apply(value: ExtensionPreview | null) {
    setBusy(true);
    try { if (!await actions.apply(asset.id, value)) setMessage('未能儲存，請重試。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '未能儲存。'); }
    finally { setBusy(false); }
  }
  return <details style={{ padding: '8px 12px', fontSize: 12 }}>
    <summary>AI 延伸背景 · 封面 4:5</summary>
    <p>保留整張原圖置頂，向下延伸背景，避免為填滿直幅而放大裁切。原圖不會變高清；接駁效果需你確認。</p>
    <p>會將圖片交現有 AI 圖片服務處理並產生圖片生成費用。套用後標示「AI 延伸背景」，唔當完整現場原照。</p>
    {asset.extensionOriginal ? <><p>已套用延伸版，原圖仍然保留。</p><button type="button" disabled={disabled || busy} onClick={() => void apply(null)}>還原原圖</button></> :
      <button type="button" disabled={disabled || busy} onClick={() => void generate()}>{busy ? '處理中…' : '生成／讀取延伸預覽'}</button>}
    {preview && !asset.extensionOriginal ? <>
      <img src={preview.url} alt="AI 向下延伸預覽，尚未套用" style={{ display: 'block', width: '100%', marginTop: 12 }}/>
      <p>AI 延伸背景 · 尚未套用</p>
      <button type="button" disabled={disabled || busy} onClick={() => void apply(preview)}>確認套用延伸版</button>{' '}
      <button type="button" disabled={disabled || busy} onClick={() => setPreview(null)}>保留原圖</button>
    </> : null}
    <p role="status">{message}</p>
  </details>;
}
