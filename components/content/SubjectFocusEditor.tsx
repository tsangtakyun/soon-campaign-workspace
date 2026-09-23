"use client";

import { useState } from 'react';
import { validSubjectFocus, type SubjectFocus, type FocusAsset } from '@/lib/subject-crop';

export function SubjectFocusEditor({ asset, disabled, onSave, onAnalyze }: {
  asset: FocusAsset & { id: string; url: string };
  disabled?: boolean;
  onSave: (id: string, updates: { subjectFocus: SubjectFocus | null; width: number; height: number }) => Promise<boolean>;
  onAnalyze?: (id: string) => Promise<{ focus: SubjectFocus | null; label: string; reason: string; cached: boolean }>;
}) {
  const [focus, setFocus] = useState<SubjectFocus>(validSubjectFocus(asset.subjectFocus) ? asset.subjectFocus : { x: .5, y: .5, width: .3, height: .3 });
  const [size, setSize] = useState({ width: asset.width || 0, height: asset.height || 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function analyze() {
    if (!onAnalyze) return;
    setBusy(true); setMessage('AI 正在找主體，通常需十幾秒…');
    try {
      const result = await onAnalyze(asset.id);
      if (validSubjectFocus(result.focus)) {
        setFocus(result.focus);
        setMessage(`${result.cached ? '已讀取上次辨識' : 'AI 已框選'}：${result.label}。請檢查綠框，可微調，再按「儲存焦點」套用。`);
      } else setMessage(`AI 未能可靠地找出單一主體：${result.reason || '請手動點選。'} 原本焦點未改。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '辨識失敗，原本焦點未改。'); }
    finally { setBusy(false); }
  }
  async function save(value: SubjectFocus | null) {
    setBusy(true); setMessage('');
    try { setMessage(await onSave(asset.id, { subjectFocus: value, ...size }) ? value ? '焦點已儲存，預覽會按文字安全區重新裁切。' : '已恢復原本定位。' : '未能儲存，請重試。'); }
    catch { setMessage('未能儲存，請重試。'); }
    finally { setBusy(false); }
  }
  return <details style={{ padding: '8px 12px', fontSize: 12 }}>
    <summary style={{ cursor: 'pointer' }}>主體焦點 {validSubjectFocus(asset.subjectFocus) ? '✓' : '設定'}</summary>
    <p>點選原圖主體，再調整保護範圍。系統只移動裁切，唔會改圖或生成新像素。</p>
    {onAnalyze ? <><button type="button" disabled={disabled || busy} onClick={() => void analyze()}>AI 自動找主體</button><p>會將此圖交 AI 分析（消耗少量 token）；重用已保存結果不會再次分析。只提出建議，儲存後先套用。</p></> : null}
    <div style={{ position: 'relative', lineHeight: 0 }}>
      <img src={asset.url} alt="原圖；可用下方滑桿設定主體位置" style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
        onLoad={event => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onClick={event => { if (disabled || busy) return; const r = event.currentTarget.getBoundingClientRect(); setFocus({ ...focus, x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) }); }}/>
      <div aria-hidden style={{ position: 'absolute', pointerEvents: 'none', border: '2px solid #dbff55', boxSizing: 'border-box', background: '#dbff5525',
        left: `${Math.max(0, focus.x - focus.width / 2) * 100}%`, top: `${Math.max(0, focus.y - focus.height / 2) * 100}%`,
        width: `${(Math.min(1, focus.x + focus.width / 2) - Math.max(0, focus.x - focus.width / 2)) * 100}%`,
        height: `${(Math.min(1, focus.y + focus.height / 2) - Math.max(0, focus.y - focus.height / 2)) * 100}%` }}/>
    </div>
    {(['x', 'y', 'width', 'height'] as const).map((field, index) => <label key={field} style={{ display: 'block', marginTop: 8 }}>
      {['水平位置', '垂直位置', '保護範圍寬度', '保護範圍高度'][index]} {Math.round(focus[field] * 100)}%
      <input type="range" min={index < 2 ? 0 : 5} max="100" value={Math.round(focus[field] * 100)} disabled={disabled || busy}
        style={{ width: '100%' }} onChange={event => setFocus({ ...focus, [field]: Number(event.target.value) / 100 })}/>
    </label>)}
    <button type="button" disabled={disabled || busy || !size.width || !size.height} onClick={() => void save(focus)}>{busy ? '儲存中…' : '儲存焦點'}</button>{' '}
    <button type="button" disabled={disabled || busy} onClick={() => void save(null)}>恢復原本定位</button>
    <p role="status">{message}</p>
  </details>;
}
