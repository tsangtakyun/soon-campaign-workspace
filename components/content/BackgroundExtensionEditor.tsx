"use client";
import { useEffect, useRef, useState } from 'react';
import { automaticExtension } from '@/lib/automatic-extension';
import type { ExtensionPreview } from '@/lib/extension-asset';
import type { ExtensionPlacement } from '@/lib/composition-advice';

export type ExtensionActions = {
  scope?: string;
  automatic?: boolean;
  setAutomatic?: (enabled: boolean) => Promise<boolean>;
  generate: (id: string, placement?: ExtensionPlacement) => Promise<ExtensionPreview>;
  apply: (id: string, preview: ExtensionPreview | null) => Promise<boolean>;
};
export function BackgroundExtensionEditor({ asset, actions, disabled, suggested, placement }: {
  asset: { id: string; url: string; extensionOriginal?: { url: string }; autoExtensionDeclinedUrl?: string };
  actions: ExtensionActions; disabled?: boolean;
  suggested?: boolean;
  placement?: ExtensionPlacement;
}) {
  const [preview, setPreview] = useState<ExtensionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const latest = useRef({ asset, actions, disabled, suggested, placement });
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  latest.current = { asset, actions, disabled, suggested, placement };
  useEffect(() => {
    const eligible = () => mounted.current && latest.current.asset.url === asset.url && Boolean(latest.current.actions.automatic && latest.current.suggested && !latest.current.disabled && !latest.current.asset.extensionOriginal && latest.current.asset.autoExtensionDeclinedUrl !== latest.current.asset.url);
    if (!actions.scope || !eligible()) return;
    const key = `soon-auto-extension-v1:${actions.scope}:${asset.id}:${asset.url}`;
    void automaticExtension(key, eligible, async () => {
      setBusy(true); setMessage('AI 正在自動延伸背景，完成後直接套用；原圖會保留。');
      try {
        const result = await latest.current.actions.generate(asset.id, latest.current.placement);
        if (!eligible()) return;
        if (!await latest.current.actions.apply(asset.id, result)) throw new Error('延伸已保存，但未能套用；請按下方按鈕重試。');
        if (mounted.current) setMessage('已自動套用 AI 延伸背景，可隨時還原原圖。');
      } finally { if (mounted.current) setBusy(false); }
    }, { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) })
      .catch(() => { if (mounted.current) setMessage('自動延伸未完成，原圖未改動。可手動重試；不會自動重複生成。'); });
  }, [actions.scope, actions.automatic, asset.id, asset.url, asset.extensionOriginal, asset.autoExtensionDeclinedUrl, suggested, disabled]);
  async function generate() {
    setBusy(true); setMessage('正在按圖片框延伸背景，可能需 1–2 分鐘；原圖未有改動。');
    try {
      const result = await actions.generate(asset.id, placement);
      if (latest.current.actions.automatic && latest.current.suggested) {
        if (!await latest.current.actions.apply(asset.id, result)) throw new Error('延伸已保存，但未能套用，請重試。');
        setMessage('已套用 AI 延伸背景，可隨時還原原圖。');
      } else { setPreview(result); setMessage('預覽已保存。請檢查接駁位及背景，再決定套用。'); }
    }
    catch (error) { setMessage(error instanceof Error ? error.message : '延伸失敗，原圖未改動。'); }
    finally { setBusy(false); }
  }
  async function apply(value: ExtensionPreview | null) {
    setBusy(true);
    try { if (!await actions.apply(asset.id, value)) setMessage('未能儲存，請重試。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '未能儲存。'); }
    finally { setBusy(false); }
  }
  return <details open={suggested || undefined} style={{ padding: '8px 12px', fontSize: 12 }}>
    <summary>AI 延伸背景 · 此頁圖片框</summary>
    <p>按此頁建議向上、向下或上下延伸，保留原圖主體，避免放大裁切。原圖不會變高清。</p>
    {actions.setAutomatic ? <label><input type="checkbox" checked={Boolean(actions.automatic)} disabled={disabled || busy} onChange={async event => {
      const enabled = event.target.checked;
      setBusy(true);
      try { if (!await actions.setAutomatic!(enabled)) setMessage('設定未能儲存，請重試。'); }
      catch { setMessage('設定未能儲存，請重試。'); }
      finally { setBusy(false); }
    }}/> 本專案自動延伸並套用（會使用圖片生成額度）</label> : null}
    {asset.autoExtensionDeclinedUrl === asset.url ? <p>你已選擇保留此原圖，不會再自動延伸；仍可手動生成。</p> : null}
    <p>會將圖片交現有 AI 圖片服務處理並產生圖片生成費用。套用後標示「AI 延伸背景」，唔當完整現場原照。</p>
    {asset.extensionOriginal ? <><p>已套用延伸版，原圖仍然保留。</p><button type="button" disabled={disabled || busy} onClick={() => void apply(null)}>還原原圖</button></> :
      <button type="button" disabled={disabled || busy} onClick={() => void generate()}>{busy ? '處理中…' : actions.automatic && suggested ? '生成／讀取並直接套用' : suggested ? '按建議生成延伸預覽（會產生費用）' : '生成／讀取延伸預覽'}</button>}
    {preview && !asset.extensionOriginal ? <>
      <img src={preview.url} alt="AI 延伸預覽，尚未套用" style={{ display: 'block', width: '100%', marginTop: 12 }}/>
      <p>AI 延伸背景 · 尚未套用</p>
      <button type="button" disabled={disabled || busy} onClick={() => void apply(preview)}>確認套用延伸版</button>{' '}
      <button type="button" disabled={disabled || busy} onClick={() => setPreview(null)}>保留原圖</button>
    </> : null}
    <p role="status">{message}</p>
  </details>;
}
