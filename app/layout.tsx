import { CursorReset } from '@/components/CursorReset'
import SiteNav from '@/components/SiteNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://sooncreator.network'),
  title: 'SOON | AI 宣傳策略與內容製作平台',
  description: 'SOON 將品牌需求、創作者配對、腳本、分鏡與製作流程串成同一套內容宣傳系統。',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SOON | AI 宣傳策略與內容製作平台',
    description: '由內容方向、製作、審批到排程發布，一個工作台完成。',
    locale: 'zh_HK',
    siteName: 'SOON',
    type: 'website',
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'SOON' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOON | AI 宣傳策略與內容製作平台',
    description: '由內容方向、製作、審批到排程發布，一個工作台完成。',
    images: ['/icon.png'],
  },
  verification: {
    other: {
      'facebook-domain-verification': 'nn8t2aqvh8tokvz4xfoj4160k0d9ln',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <CursorReset />
        <SiteNav />
        {children}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: "SweiGothicCJKtc-Regular";
                src: url("/fonts/max32002/SweiGothicCJKtc-Regular.woff2") format("woff2");
                font-style: normal;
                font-weight: 400;
                font-display: swap;
              }

              @font-face {
                font-family: "SweiGothicCJKtc-Regular";
                src: url("/fonts/max32002/SweiGothicCJKtc-Bold.woff2") format("woff2");
                font-style: normal;
                font-weight: 700;
                font-display: swap;
              }

              /* Workspace「GenSenRounded2 / 系統圓體」使用的編輯器字型別名。 */
              @font-face {
                font-family: "GenSenRounded2";
                src: url("/fonts/max32002/SweiGothicCJKtc-Regular.woff2") format("woff2");
                font-style: normal;
                font-weight: 400;
                font-display: swap;
              }

              @font-face {
                font-family: "GenSenRounded2";
                src: url("/fonts/max32002/SweiGothicCJKtc-Bold.woff2") format("woff2");
                font-style: normal;
                font-weight: 700;
                font-display: swap;
              }

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
                max-width: 100%;
                overflow-x: clip;
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

              @media (max-width: 980px) {
                .dashboard-page,
                .studio-page {
                  width: 100%;
                  max-width: 100vw;
                  grid-template-columns: minmax(0, 1fr) !important;
                }

                .dashboard-page > *,
                .studio-page > * {
                  min-width: 0;
                  max-width: 100vw;
                }
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
