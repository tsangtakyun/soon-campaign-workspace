export default function MarketLoading() {
  return <main className="market-loading-page">
    <aside className="market-loading-sidebar" aria-hidden="true">
      <div className="market-loading-brand" />
      {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
    </aside>
    <section className="market-loading-shell" aria-live="polite" aria-busy="true">
      <span className="market-loading-back">← 返回確認產品資料</span>
      <header><small>市場情報</small><h1>準備市場研究</h1><p>SOON 正在整理產品資料，準備搜尋相關市場資訊。</p></header>
      <section className="market-loading-state">
        <i />
        <h2>正在進入市場情報</h2>
        <p>下一步將研究競爭品牌、銷售方式及公開顧客意見。</p>
      </section>
    </section>
    <style dangerouslySetInnerHTML={{ __html: styles }} />
  </main>
}

const styles = `
  .market-loading-page{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f5f5f6;color:#202126}
  .market-loading-sidebar{box-sizing:border-box;display:grid;align-content:start;gap:15px;border-right:1px solid #e5e6e8;background:#f5f5f6;padding:26px 20px}
  .market-loading-brand{width:104px;height:34px;border-radius:9px;background:#e7e8ea;margin-bottom:14px}
  .market-loading-sidebar i{display:block;width:78%;height:18px;border-radius:7px;background:#e7e8ea}
  .market-loading-shell{width:min(100%,1080px);box-sizing:border-box;margin:0 auto;padding:34px clamp(18px,4vw,54px) 90px}
  .market-loading-back{color:#8a8e95;font-size:.86rem}
  .market-loading-shell>header{margin:34px 0 24px}
  .market-loading-shell>header small{color:#8c7421;font-weight:850;letter-spacing:.12em}
  .market-loading-shell>header h1{margin:7px 0;font-size:clamp(2rem,5vw,3.4rem);letter-spacing:-.045em}
  .market-loading-shell>header p{margin:0;color:#757981}
  .market-loading-state{min-height:390px;display:grid;place-items:center;align-content:center;border:1px solid #e0e1e4;border-radius:22px;background:#fff;padding:28px;text-align:center}
  .market-loading-state>i{width:36px;height:36px;border:3px solid #e8e8e8;border-top-color:#202126;border-radius:50%;animation:market-loading-spin .8s linear infinite}
  .market-loading-state h2{margin:18px 0 6px}
  .market-loading-state p{margin:0;color:#737780}
  @keyframes market-loading-spin{to{transform:rotate(360deg)}}
  @media(max-width:900px){.market-loading-page{grid-template-columns:1fr}.market-loading-sidebar{display:none}}
  @media(max-width:680px){.market-loading-shell{padding:24px 16px 90px}.market-loading-state{min-height:330px}}
  @media(prefers-reduced-motion:reduce){.market-loading-state>i{animation:none}}
`
