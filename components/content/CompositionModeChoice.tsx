import type { CompositionMode } from '@/lib/composition-mode';

export function CompositionModeChoice({mode,busy,onChoose}:{mode?:CompositionMode;busy:boolean;onChoose:(mode:CompositionMode)=>void}) {
  return <section aria-label="圖片製作方式" style={{width:'100%'}}>
    <b>選擇圖片製作方式</b>
    <p>原圖及已確認版本會保留。你可以之後切換，不會刪除已有成果。</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
      <button type="button" aria-pressed={mode==='original'} disabled={busy} onClick={()=>onChoose('original')}>
        原圖創作 →<small style={{display:'block',marginTop:8}}>完整保留圖片，以留白及圖文分區排版；不生成背景。</small>
      </button>
      <button type="button" aria-pressed={mode==='ai'} disabled={busy} onClick={()=>onChoose('ai')}>
        AI 智能構圖 · 推薦 →<small style={{display:'block',marginTop:8}}>按主體、文字及圖片框，只在需要時延伸環境；不新增主體。</small>
      </button>
    </div>
    <small style={{display:'block',marginTop:12}}>AI 模式會使用分析及圖片生成額度。風格預覽最多處理每款的封面、內文、收尾，正式製作會重用合適結果；未通過檢查會保留原圖。</small>
  </section>;
}
