import type { CompositionMode } from '@/lib/composition-mode';

export function CompositionModeChoice({mode,busy,onChoose}:{mode?:CompositionMode;busy:boolean;onChoose:(mode:CompositionMode)=>void}) {
  return <section aria-label="確認內容及配圖" style={{width:'100%'}}>
    <b>確認內容及配圖</b>
    <p>先保留原圖套用可編輯母版，確保完成全套圖片。系統會按版面安全裁切或留白，不會勉強生成背景。</p>
    <button type="button" aria-pressed={mode==='original'} disabled={busy} onClick={()=>onChoose('original')}>
      確認並製作可編輯圖片 →
    </button>
    <small style={{display:'block',marginTop:12}}>完成後仍可逐頁選擇 AI 延伸背景；原圖及已完成版本會保留。</small>
  </section>;
}
