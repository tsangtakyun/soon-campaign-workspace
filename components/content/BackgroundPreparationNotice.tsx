import type { OptimizationIssue } from '@/lib/optimize-carousel-assets';

export type BackgroundPreparation = {status:string;startedAt?:string;issues?:OptimizationIssue[]};
export function BackgroundPreparationNotice({state,busy,retry,keep,continueWithOriginals}: {
  state?:BackgroundPreparation;busy:boolean;retry:(page:string)=>void;keep:(issue:OptimizationIssue)=>void;continueWithOriginals:()=>void;
}) {
  if(!state || state.status==='complete')return null;
  return <section role="status" aria-live="polite" style={{padding:20,border:'1px solid #dbc7a6',borderRadius:12,background:'#fff8eb',margin:'16px 0'}}>
    <strong>{busy?'正在準備新版本':'新版本尚未完成'} · 現有圖片／下載為上次成功版本</strong>
    <p>已成功的背景會保留。失敗頁可獨立重試，或保留原圖繼續；不會自動重複生圖。</p>
    {(state.issues||[]).map(issue=><div key={issue.page+issue.assetId} style={{padding:'12px 0',borderTop:'1px solid #dbc7a6'}}>
      <b>{issue.page} 未完成</b><p>{issue.message}</p>
      {issue.runId?<small>追蹤編號：{issue.runId}</small>:null}
      <div style={{display:'flex',gap:12,marginTop:8}}>
        <button type="button" disabled={busy} onClick={()=>retry(issue.page)}>只重試 {issue.page}</button>
        <button type="button" disabled={busy} onClick={()=>keep(issue)}>本頁保留原圖</button>
      </div>
    </div>)}
    <button type="button" disabled={busy} onClick={continueWithOriginals}>保留未完成頁原圖，繼續製作圖片 →</button>
  </section>;
}
