import { CursorReset } from '@/components/CursorReset'
import SiteNav from '@/components/SiteNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SOON | AI 宣傳策略與內容製作平台',
  description: 'SOON 將品牌需求、創作者配對、腳本、分鏡與製作流程串成同一套內容宣傳系統。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CursorReset />
        <SiteNav />
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
                cursor: auto;
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

              iframe[src*="vercel.live/_next-live"],
              iframe[src*="vercel.live"][title*="Vercel"],
              iframe[src*="vercel.live"][aria-label*="Vercel"] {
                display: none !important;
                pointer-events: none !important;
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
