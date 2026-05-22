'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.182 0c.087.86-.24 1.72-.778 2.34-.538.617-1.354 1.1-2.17 1.04-.104-.825.267-1.69.778-2.277C9.523.516 10.373.066 11.182 0zM14 11.364c-.46.977-.682 1.414-1.276 2.277-.828 1.186-2 2.664-3.447 2.678-1.287.013-1.617-.838-3.364-.829-1.747.01-2.108.846-3.398.833C1.07 16.31-.26 14.63.05 12.27c.194-1.46.9-2.914 1.88-3.947C2.994 7.2 4.3 6.73 5.434 6.73c1.274 0 2.075.857 3.125.857.998 0 1.607-.86 3.044-.86 1.006 0 2.073.548 2.834 1.496-.17.093-2.53 1.476-2.506 4.14.025 2.974 2.61 3.96 2.669 3.985-.023.07-.418 1.432-1.42 2.016"
        fill="currentColor"
      />
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 4v20M4 14h20" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="10" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="#ef4444" strokeWidth="1.5" />
      <rect x="15" y="4" width="9" height="9" rx="1.5" stroke="#ef4444" strokeWidth="1.5" />
      <rect x="4" y="15" width="9" height="9" rx="1.5" stroke="#ef4444" strokeWidth="1.5" />
      <rect x="15" y="15" width="9" height="9" rx="1.5" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 14h20M14 4l10 10-10 10" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NotifyForm({ id }: { id: string }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return <p className="notify-success">✓ 已登記！我們會第一時間通知你。</p>
  }

  return (
    <>
      <form
        className="notify-form"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
        }}
      >
        <input
          aria-label={`${id} email`}
          type="email"
          placeholder="輸入電郵，搶先試用"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit">通知我</button>
      </form>
      <p className="notify-note">我們不會發送垃圾郵件，隨時可以取消訂閱。</p>
    </>
  )
}

const featureCards = [
  {
    icon: <PlusCircleIcon />,
    title: '一鍵儲存靈感',
    body: '從 Instagram、小紅書、TikTok 直接分享至 SOON LOG，靈感即時捕捉，不再依賴截圖。',
  },
  {
    icon: <GridIcon />,
    title: '整理你的創作庫',
    body: '自訂分類、標籤、備注，把零散靈感整理成有系統的創作資料庫。',
  },
  {
    icon: <ArrowIcon />,
    title: '與團隊共享',
    body: '與創作團隊共享靈感庫，讓每個人都在同一頁面，創作更有方向。',
  },
]

export default function SoonLogPage() {
  useEffect(() => {
    const canvas = document.getElementById('soon-log-starfield') as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    let animId: number

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      a: Math.random() * 0.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.06,
      dy: (Math.random() - 0.5) * 0.06,
    }))

    interface Shooter {
      x: number
      y: number
      vx: number
      vy: number
      a: number
    }

    const shooters: Shooter[] = []
    let lastShoot = 0

    function mkShooter(): Shooter {
      return {
        x: Math.random() * W * 0.7,
        y: Math.random() * H * 0.5,
        vx: 4 + Math.random() * 3,
        vy: 2 + Math.random() * 2,
        a: 0.9,
      }
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H)

      for (const s of stars) {
        s.x += s.dx
        s.y += s.dy
        if (s.x < 0) s.x = W
        if (s.x > W) s.x = 0
        if (s.y < 0) s.y = H
        if (s.y > H) s.y = 0
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.a})`
        ctx.fill()
      }

      if (t - lastShoot > 2000 + Math.random() * 1500) {
        shooters.push(mkShooter())
        lastShoot = t
      }

      for (let i = shooters.length - 1; i >= 0; i -= 1) {
        const sh = shooters[i]
        const tailLen = 90
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(sh.x - sh.vx * (tailLen / sh.vx), sh.y - sh.vy * (tailLen / sh.vx))
        const grad = ctx.createLinearGradient(sh.x - sh.vx * 8, sh.y - sh.vy * 8, sh.x, sh.y)
        grad.addColorStop(0, 'rgba(255,255,255,0)')
        grad.addColorStop(1, `rgba(255,255,255,${sh.a})`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.2
        ctx.stroke()
        sh.x += sh.vx
        sh.y += sh.vy
        sh.a -= 0.01
        if (sh.a <= 0 || sh.x > W || sh.y > H) shooters.splice(i, 1)
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <main className="soon-log-page">
      <canvas id="soon-log-starfield" className="starfield-canvas" />

      <section className="hero-section">
        <p className="eyebrow">SOON LOG · 即將推出</p>
        <h1>靈感，不再流失</h1>
        <p className="hero-subtitle">
          SOON LOG 是一款 iOS App，讓你隨時捕捉創作靈感、儲存內容參考、建立你的個人創作庫。
        </p>

        <div className="phone-stage" aria-label="SOON LOG app preview">
          <div className="phone-glow" />
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">
              <p className="phone-logo">SOON LOG</p>
              <div className="phone-divider" />
              <div className="mini-card">💡 Hero section 靈感 — 左圖右文...</div>
              <div className="mini-card">🎬 Reel 參考 @username · 美妝教學</div>
              <div className="mini-card">📌 配色參考 · #F5E6D3 暖米色系</div>
              <button type="button" className="mini-button">
                + 新增靈感
              </button>
            </div>
          </div>
        </div>

        <p className="app-store-note">
          <AppleIcon />
          即將登陸 App Store
        </p>
        <NotifyForm id="hero" />
      </section>

      <section className="features-section">
        <h2>為創作者而設計</h2>
        <p>每一個功能，都源於真實的創作需求</p>
        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="feature-card" key={feature.title}>
              {feature.icon}
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bottom-cta">
        <h2>最快獲得通知的方式</h2>
        <p>登記電郵，SOON LOG 上架第一天即獲通知。</p>
        <NotifyForm id="bottom" />
      </section>

      <footer className="soon-log-footer">
        <span>© 2026 SOON</span>
        <Link href="/contact">聯絡我們</Link>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .soon-log-page {
              position: relative;
              min-height: 100vh;
              overflow-x: hidden;
              background: #0a0a0a;
              color: #ffffff;
            }

            .starfield-canvas {
              position: fixed;
              top: 0;
              left: 0;
              z-index: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              background: #0a0a0a;
            }

            .hero-section,
            .features-section,
            .bottom-cta,
            .soon-log-footer {
              position: relative;
              z-index: 1;
            }

            .hero-section {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 128px 32px 80px;
              text-align: center;
            }

            .eyebrow {
              margin: 0 0 24px;
              color: #d4af37;
              font-size: 12px;
              font-weight: 850;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            .hero-section h1 {
              margin: 0 0 24px;
              color: #ffffff;
              font-size: clamp(48px, 7vw, 96px);
              font-weight: 950;
              line-height: 1.05;
              letter-spacing: 0;
            }

            .hero-subtitle {
              max-width: 576px;
              margin: 0 auto 48px;
              color: #a1a1aa;
              font-size: 18px;
              font-weight: 600;
              line-height: 1.8;
            }

            .phone-stage {
              position: relative;
              margin: 0 auto 48px;
            }

            .phone-glow {
              position: absolute;
              top: 50%;
              left: 50%;
              z-index: -1;
              width: 300px;
              height: 300px;
              border-radius: 999px;
              background: radial-gradient(circle, rgba(239, 68, 68, 0.12), transparent 70%);
              pointer-events: none;
              transform: translate(-50%, -50%);
            }

            .phone-frame {
              position: relative;
              width: 220px;
              height: 420px;
              margin: 0 auto;
              border: 2px solid rgba(255, 255, 255, 0.15);
              border-radius: 36px;
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(10px);
              box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
            }

            .phone-notch {
              position: absolute;
              top: 16px;
              left: 50%;
              width: 60px;
              height: 6px;
              border-radius: 3px;
              background: rgba(255, 255, 255, 0.15);
              transform: translateX(-50%);
            }

            .phone-screen {
              position: absolute;
              inset: 32px 12px 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              overflow: hidden;
              border-radius: 24px;
              background: #0a0a0a;
              padding: 18px;
            }

            .phone-logo {
              margin: 0;
              color: #ffffff;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 14px;
              font-weight: 950;
              letter-spacing: 0.08em;
            }

            .phone-divider {
              width: 64px;
              height: 1px;
              background: rgba(255, 255, 255, 0.16);
            }

            .mini-card {
              width: 100%;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.06);
              color: #d4d4d8;
              padding: 8px 10px;
              text-align: left;
              font-size: 9px;
              font-weight: 700;
              line-height: 1.45;
            }

            .mini-button {
              border: 0;
              border-radius: 999px;
              background: #ef4444;
              color: #ffffff;
              cursor: default;
              padding: 6px 12px;
              font-size: 9px;
              font-weight: 900;
            }

            .app-store-note {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin: 0 0 24px;
              color: rgba(255, 255, 255, 0.5);
              font-size: 14px;
              font-weight: 700;
            }

            .notify-form {
              display: flex;
              gap: 8px;
              width: 100%;
              max-width: 384px;
              margin: 0 auto;
            }

            .notify-form input {
              flex: 1;
              min-width: 0;
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.08);
              color: #ffffff;
              padding: 12px 16px;
              font-size: 14px;
              outline: none;
              font-family: inherit;
            }

            .notify-form input:focus {
              border-color: #ef4444;
            }

            .notify-form input::placeholder {
              color: #71717a;
            }

            .notify-form button {
              border: 0;
              border-radius: 12px;
              background: #ef4444;
              color: #ffffff;
              cursor: pointer;
              padding: 12px 20px;
              white-space: nowrap;
              font-size: 14px;
              font-weight: 900;
            }

            .notify-success {
              margin: 0;
              color: #d4d4d8;
              font-size: 14px;
              font-weight: 750;
            }

            .notify-note {
              margin: 12px 0 0;
              color: #71717a;
              font-size: 12px;
              font-weight: 650;
            }

            .features-section {
              max-width: 896px;
              margin: 0 auto;
              padding: 96px 32px;
              text-align: center;
            }

            .features-section h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: 32px;
              font-weight: 950;
            }

            .features-section > p {
              margin: 0 0 64px;
              color: #a1a1aa;
              font-size: 15px;
              font-weight: 650;
            }

            .feature-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 24px;
            }

            .feature-card {
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.04);
              padding: 32px;
              text-align: left;
            }

            .feature-card h3 {
              margin: 16px 0 8px;
              color: #ffffff;
              font-size: 16px;
              font-weight: 900;
            }

            .feature-card p {
              margin: 0;
              color: #a1a1aa;
              font-size: 13px;
              font-weight: 650;
              line-height: 1.8;
            }

            .bottom-cta {
              padding: 80px 32px;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .bottom-cta h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: clamp(28px, 4vw, 44px);
              font-weight: 950;
              line-height: 1.12;
            }

            .bottom-cta > p {
              margin: 0 0 32px;
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 650;
            }

            .soon-log-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              padding: 32px 7vw 42px;
              background: #0a0a0a;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              color: #71717a;
              font-size: 0.95rem;
              font-weight: 800;
            }

            .soon-log-footer a {
              color: #d4d4d8;
              text-decoration: none;
            }

            @media (max-width: 760px) {
              .hero-section {
                padding-left: 20px;
                padding-right: 20px;
              }

              .feature-grid {
                grid-template-columns: 1fr;
              }

              .notify-form {
                flex-direction: column;
              }

              .notify-form button {
                width: 100%;
              }

              .soon-log-footer {
                flex-direction: column;
                align-items: flex-start;
                padding-left: 22px;
                padding-right: 22px;
              }
            }
          `,
        }}
      />
    </main>
  )
}
