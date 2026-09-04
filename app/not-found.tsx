import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div><p>404</p><h1>找不到這個頁面</h1><span>網址可能已更新，或者頁面已經移除。</span><Link href="/">返回 SOON 首頁</Link></div>
      <style>{`.not-found-page{min-height:100vh;display:grid;place-items:center;padding:120px 24px 64px;background:#08090d;color:#fff;text-align:center}.not-found-page div{max-width:560px}.not-found-page p{margin:0;color:#ffd337;font-weight:900;letter-spacing:.18em}.not-found-page h1{margin:14px 0;font-size:clamp(2.5rem,7vw,4.5rem);line-height:1.05}.not-found-page span{display:block;color:rgba(255,255,255,.62);line-height:1.7}.not-found-page a{display:inline-flex;margin-top:28px;border-radius:8px;background:#ef3f2f;color:#fff;padding:14px 20px;text-decoration:none;font-weight:800}`}</style>
    </main>
  )
}
