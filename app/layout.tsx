import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SOON | AI 宣傳策略與內容製作平台',
  description: 'SOON 將品牌需求、創作者配對、腳本、分鏡與製作流程串成同一套內容宣傳系統。',
}

function NavBar() {
  return (
    <>
      <nav className="site-nav">
        <Link href="/" className="brand-mark">
          <span className="brand-dot" />
          <span>SOON</span>
        </Link>

        <div className="nav-links">
          <a href="/#pricing">方案</a>
          <Link href="/login">登入</Link>
        </div>

        <div className="nav-actions">
          <a href="/#pricing" className="nav-pricing">
            查看方案
          </a>
          <Link href="/contact" className="nav-secondary">
            聯絡我們
          </Link>
          <Link href="/signup" className="nav-primary">
            開始試用
          </Link>
        </div>
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .site-nav {
              position: sticky;
              top: 0;
              z-index: 1000;
              width: 100%;
              margin: 0;
              padding: 22px 7vw;
              border: 0;
              background: rgba(8, 9, 11, 0.72);
              backdrop-filter: blur(14px);
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            }

            .brand-mark {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              color: #f6f7fb;
              text-decoration: none;
              font-size: 1.08rem;
              font-weight: 800;
              letter-spacing: 0.04em;
              white-space: nowrap;
            }

            .brand-dot {
              width: 12px;
              height: 12px;
              border-radius: 999px;
              background: linear-gradient(135deg, #ff6a3d, #ff3d2e);
              box-shadow: 0 0 20px rgba(255, 91, 58, 0.5);
            }

            .nav-links {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 26px;
              flex: 1;
              flex-wrap: wrap;
            }

            .nav-links a {
              color: rgba(233, 236, 245, 0.8);
              text-decoration: none;
              font-size: 1rem;
              font-weight: 650;
              letter-spacing: -0.02em;
              transition: color 160ms ease;
            }

            .nav-links a:hover {
              color: #ffffff;
            }

            .nav-actions {
              display: flex;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
              justify-content: flex-end;
            }

            .nav-secondary,
            .nav-pricing,
            .nav-primary {
              text-decoration: none;
              border-radius: 6px;
              padding: 14px 20px;
              font-size: 1rem;
              font-weight: 750;
              letter-spacing: -0.02em;
              white-space: nowrap;
            }

            .nav-pricing {
              color: #111111;
              background: #ffd84d;
              border: 1px solid rgba(255, 216, 77, 0.85);
              box-shadow: 0 14px 30px rgba(255, 216, 77, 0.22);
            }

            .nav-secondary {
              color: #101114;
              border: 1px solid rgba(255, 255, 255, 0.16);
              background: #ffffff;
            }

            .nav-primary {
              color: #ffffff;
              background: #ef3f2f;
              box-shadow: 0 14px 30px rgba(239, 63, 47, 0.28);
            }

            @media (max-width: 980px) {
              .site-nav {
                padding: 16px 20px;
                flex-direction: column;
                align-items: stretch;
                background: rgba(8, 9, 11, 0.92);
              }

              .nav-links {
                justify-content: flex-start;
              }

              .nav-actions {
                justify-content: stretch;
              }

              .nav-secondary,
              .nav-pricing,
              .nav-primary {
                flex: 1;
                text-align: center;
              }
            }

            @media (max-width: 640px) {
              .nav-links {
                gap: 10px 14px;
              }

              .nav-links a {
                font-size: 0.88rem;
              }
            }
          `,
        }}
      />
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                color-scheme: dark;
              }

              * {
                box-sizing: border-box;
              }

              html {
                scroll-behavior: smooth;
              }

              body {
                margin: 0;
                min-height: 100vh;
                font-family:
                  "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                  "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                  "Segoe UI", sans-serif;
                background:
                  radial-gradient(circle at top, rgba(255, 96, 56, 0.16), transparent 28%),
                  linear-gradient(180deg, #07080b 0%, #090b10 36%, #08090d 100%);
                color: #f7f8fb;
              }

              body::before {
                content: "";
                position: fixed;
                inset: 0;
                pointer-events: none;
                background-image:
                  linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
                background-size: 48px 48px;
                mask-image: radial-gradient(circle at center, black, transparent 84%);
                opacity: 0.18;
              }

              a {
                color: inherit;
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
