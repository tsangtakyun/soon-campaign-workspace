'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const CONTENT_MODIFICATION_STORAGE_KEY = 'soon-content-modification-v1'

function ContentModificationRedirect() {
  const searchParams = useSearchParams()

  useEffect(() => {
    window.sessionStorage.setItem(CONTENT_MODIFICATION_STORAGE_KEY, 'balanced')

    const url = new URL('/onboarding/photo-control', window.location.origin)
    searchParams.forEach((value, key) => url.searchParams.set(key, value))
    url.searchParams.set('contentModification', 'balanced')
    window.location.replace(`${url.pathname}${url.search}`)
  }, [searchParams])

  return (
    <main className="redirect-shell" aria-live="polite" aria-busy="true">
      <span className="soon-loader" aria-hidden="true">S</span>
      <p>正在準備圖片偏好…</p>
      <style jsx>{`
        .redirect-shell {
          min-height: 100vh;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 14px;
          background: #fff;
          color: #202124;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }
        .soon-loader {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #f5b900;
          color: #111;
          font-size: 22px;
          font-weight: 900;
          animation: pulse 0.9s ease-in-out infinite alternate;
        }
        p { margin: 0; color: #737373; font-size: 14px; }
        @keyframes pulse {
          from { transform: scale(0.94); opacity: 0.72; }
          to { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default function ContentModificationPage() {
  return (
    <Suspense fallback={null}>
      <ContentModificationRedirect />
    </Suspense>
  )
}
