import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SOON Campaign Workspace',
  description: 'SOON external platform for campaigns, creators, and AI production workflows',
}

function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: '#F5F2EC',
      borderBottom: '1px solid #e0ddd6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: '54px',
      fontFamily: 'Georgia, Times New Roman, serif',
    }}>
      <Link href="/" style={{ fontSize: '13px', letterSpacing: '0.16em', color: '#888', textDecoration: 'none' }}>
        SOON
      </Link>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link href="/submit-brief" style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none', padding: '6px 14px', borderBottom: '1px solid #1a1a1a', letterSpacing: '0.03em' }}>
          Campaign Submit
        </Link>
        <Link href="/ops/campaigns" style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none', padding: '6px 14px', borderBottom: '1px solid #1a1a1a', letterSpacing: '0.03em' }}>
          Ops Workspace
        </Link>
      </div>
    </nav>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body style={{ margin: 0, padding: 0, paddingTop: '54px', background: '#f5f0e6' }}>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
