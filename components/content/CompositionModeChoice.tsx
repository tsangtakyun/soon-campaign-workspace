import type { CompositionMode } from '@/lib/composition-mode';

export function CompositionModeChoice({mode,busy,onChoose}:{mode?:CompositionMode;busy:boolean;onChoose:(mode:CompositionMode)=>void}) {
  return <section aria-label="圖片製作方式" style={{width:'100%'}}>
    <b>選擇圖片製作方式</b>
    <p>原圖及已確認版本會保留。你可以之後切換，不會刪除已有成果。</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
      <button type="button" aria-pressed={mode==='original'} disabled={busy} onClick={()=>onChoose('original')}>
        用原圖製作 →<small style={{display:'block',marginTop:8}}>保留原圖，套用已選母版；不生成背景、不改版面。</small>
      </button>
      <button type="button" aria-pressed={mode==='ai'} disabled={busy} onClick={()=>onChoose('ai')}>
        AI 智能構圖並製作 →<small style={{display:'block',marginTop:8}}>按母版圖片框及文字位置，需要時延伸環境；不新增主體。</small>
      </button>
    </div>
    <small style={{display:'block',marginTop:12}}>AI 模式會使用分析及圖片生成額度；已選母版不變，未通過檢查的頁面會提示處理，原圖保留。</small>
  </section>;
}
