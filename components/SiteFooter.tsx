import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="soon-footer">
      <div>
        <Link className="soon-footer-brand" href="/">SOON</Link>
        <p>AI 宣傳策略與內容製作平台</p>
      </div>
      <nav aria-label="頁尾導覽">
        <Link href="/contact">聯絡我們</Link>
        <Link href="/privacy">私隱政策</Link>
        <Link href="/terms">服務條款</Link>
      </nav>
      <small>© {new Date().getFullYear()} SOON. All rights reserved.</small>
      <style>{`
        .soon-footer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;padding:44px max(24px,5vw);border-top:1px solid rgba(255,255,255,.12);background:#08090d;color:#fff}.soon-footer-brand{font-size:1.25rem;font-weight:900;letter-spacing:.08em;text-decoration:none}.soon-footer p{margin:8px 0 0;color:rgba(255,255,255,.58)}.soon-footer nav{display:flex;gap:20px}.soon-footer nav a{color:rgba(255,255,255,.75);text-decoration:none}.soon-footer nav a:hover{text-decoration:underline;text-underline-offset:4px}.soon-footer small{grid-column:1/-1;color:rgba(255,255,255,.42)}@media(max-width:640px){.soon-footer{grid-template-columns:1fr;align-items:start}.soon-footer nav{align-items:flex-start;flex-direction:column;gap:12px}.soon-footer small{grid-column:auto}}
      `}</style>
    </footer>
  )
}
