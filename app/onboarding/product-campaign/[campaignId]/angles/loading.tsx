export default function AnglesLoading() {
  return <main className="angles-loading-page">
    <aside aria-hidden="true"><div />{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</aside>
    <section className="angles-loading-shell" aria-live="polite" aria-busy="true">
      <span className="angles-loading-back">← 返回市場情報</span>
      <header><small>宣傳方向</small><h1>準備宣傳方向</h1><p>SOON 正在整理產品強項及對手的宣傳重點。</p></header>
      <section className="angles-loading-state"><i /><h2>正在進入宣傳方向</h2><p>即將建立第一輪可測試的宣傳方向。</p></section>
    </section>
    <style dangerouslySetInnerHTML={{ __html: styles }} />
  </main>
}

const styles = `
  .angles-loading-page{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f5f5f6;color:#202126}
  .angles-loading-page>aside{box-sizing:border-box;display:grid;align-content:start;gap:15px;border-right:1px solid #e5e6e8;padding:26px 20px}
  .angles-loading-page>aside div{width:104px;height:34px;border-radius:9px;background:#e7e8ea;margin-bottom:14px}
  .angles-loading-page>aside i{display:block;width:78%;height:18px;border-radius:7px;background:#e7e8ea}
  .angles-loading-shell{width:min(100%,1040px);box-sizing:border-box;margin:0 auto;padding:34px clamp(18px,4vw,54px) 90px}
  .angles-loading-back{color:#8a8e95;font-size:.86rem}.angles-loading-shell>header{margin:30px 0 22px;border-bottom:1px solid #e5e6e8;padding-bottom:22px}
  .angles-loading-shell>header small{color:#737780;font-size:.72rem;font-weight:800;letter-spacing:.05em}.angles-loading-shell>header h1{margin:7px 0;font-size:clamp(2rem,5vw,2.8rem);letter-spacing:-.04em}.angles-loading-shell>header p{margin:0;color:#757981}
  .angles-loading-state{min-height:360px;display:grid;place-items:center;align-content:center;border:1px solid #e0e1e4;border-radius:14px;background:#fff;padding:28px;text-align:center}.angles-loading-state>i{width:36px;height:36px;border:3px solid #e8e8e8;border-top-color:#202126;border-radius:50%;animation:angles-loading-spin .8s linear infinite}.angles-loading-state h2{margin:18px 0 6px}.angles-loading-state p{margin:0;color:#737780}
  @keyframes angles-loading-spin{to{transform:rotate(360deg)}}@media(max-width:900px){.angles-loading-page{grid-template-columns:1fr}.angles-loading-page>aside{display:none}}@media(max-width:680px){.angles-loading-shell{padding:24px 16px 90px}}@media(prefers-reduced-motion:reduce){.angles-loading-state>i{animation:none}}
`
