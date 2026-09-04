import Link from 'next/link'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/SiteFooter'

export function LegalPage({ children, eyebrow, title, updatedAt }: { children: ReactNode; eyebrow: string; title: string; updatedAt: string }) {
  return (
    <>
      <main className="legal-page">
        <article>
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-updated">最後更新：{updatedAt}</p>
          <div className="legal-content">{children}</div>
          <Link className="legal-contact" href="/contact">對政策有疑問？聯絡 SOON</Link>
        </article>
      </main>
      <SiteFooter />
      <style>{`
        .legal-page{min-height:100vh;padding:150px 24px 80px;background:#f6f6f3;color:#17181b}.legal-page article{width:min(780px,100%);margin:auto}.legal-eyebrow{margin:0 0 12px;color:#d93b30;font-weight:800;letter-spacing:.12em}.legal-page h1{margin:0;font-size:clamp(2.5rem,6vw,4.75rem);line-height:1.05;letter-spacing:-.04em}.legal-updated{margin:18px 0 46px;color:#777b83}.legal-content{display:grid;gap:30px}.legal-content section{border-top:1px solid #d9dad6;padding-top:24px}.legal-content h2{margin:0 0 10px;font-size:1.3rem}.legal-content p,.legal-content li{color:#50545b;line-height:1.75}.legal-content ul{padding-left:22px}.legal-contact{display:inline-flex;margin-top:42px;border-radius:8px;background:#17181b;color:#fff;padding:14px 18px;text-decoration:none;font-weight:750}
      `}</style>
    </>
  )
}
