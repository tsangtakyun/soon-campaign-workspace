'use client'

import Link from 'next/link'
import React from 'react'

const steps = [
  {
    number: '01',
    title: '上架 PR Campaign',
    description: '設定產品、預算、目標平台，5 分鐘完成 Campaign 上架',
  },
  {
    number: '02',
    title: 'KOL 主動申請',
    description: '全亞洲創作者瀏覽你的 Campaign，主動提交申請',
  },
  {
    number: '03',
    title: '一鍵批准寄貨',
    description: '審核申請、批准合作、安排寄貨，全部於 SOON 統一管理',
  },
]

const brandPoints = [
  '無需主動聯絡 KOL，靜待申請',
  '自訂 Campaign 條件：粉絲數、平台、地區',
  '統一管理所有申請',
  '支援香港 · 台灣 · 大陸市場',
]

const creatorPoints = [
  '主動發現適合你的品牌合作',
  '免費申請，無需中介',
  '支援 IG · 小紅書 · TikTok · YouTube',
  '亞洲市場優先，中文界面',
]

function StepIcon({ step }: { step: string }) {
  if (step === '01') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="24" height="20" rx="2" stroke="#ef4444" strokeWidth="2" />
        <path d="M4 12h24" stroke="#ef4444" strokeWidth="2" />
        <path d="M16 18v4M14 20h4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (step === '02') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="11" r="5" stroke="#ef4444" strokeWidth="2" />
        <path d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 20l3 3 5-5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="18" rx="2" stroke="#ef4444" strokeWidth="2" />
      <path d="M10 17l4 4 8-8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MatchForYouPage() {
  React.useEffect(() => {
    const canvas = document.getElementById('starfield') as HTMLCanvasElement
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
    <main className="match-page">
      <canvas
        id="starfield"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          background: '#0a0a0a',
        }}
      />

      <section className="hero-split">
        <div className="hero-grid">
          <div className="hero-copy pl-28">
            <p className="hero-eyebrow">SOON 獨家功能 · Exclusive Feature</p>
            <h1>
              不需要主動找KOL
              <br />
              讓KOL找你
            </h1>
            <p className="hero-subtitle">
              讓創作者主動申請合作，品牌專注產品本身，
              <br />
              SOON 協助完成其餘一切
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="/signup" style={{ textDecoration: 'none' }}>
                品牌免費試用
              </a>
              <a className="hero-secondary" href="#" style={{ textDecoration: 'none' }}>
                我是創作者 →
              </a>
            </div>
            <div className="platform-row">
              <span>Instagram</span>
              <span>&middot;</span>
              <span>小紅書</span>
              <span>&middot;</span>
              <span>TikTok</span>
              <span>&middot;</span>
              <span>YouTube</span>
            </div>
          </div>

          <div className="hero-image-wrap">
            <div className="hero-fade hero-fade-left" />
            <div className="hero-fade hero-fade-top" />
            <div className="hero-fade hero-fade-bottom" />
            <img src="/KOL/kol-hero.png" alt="KOL Creator" className="hero-image" />
          </div>
        </div>
      </section>

      <section className="pain-section">
        <div className="pain-inner">
          <h2>傳統 KOL 合作模式的三大問題</h2>

          <div className="pain-grid">
            <article className="pain-card">
              <div className="pain-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M20 12v9M20 28v1" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3>中間人收取高額佣金</h3>
              <p>品牌預算大量流向 MCN 及中介機構，實際用於創作者合作的費用嚴重壓縮，投資回報率極低。</p>
            </article>

            <article className="pain-card">
              <div className="pain-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="14" r="5" stroke="#ef4444" strokeWidth="1.5" />
                  <path d="M8 32c0-6 16-6 16 0" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M26 18l8-8M34 18l-8-8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>KOL 對產品缺乏真實興趣</h3>
              <p>中介優先推薦旗下創作者，而非最適合的人選。KOL 被動接單，對產品缺乏熱情，內容質素難以保證。</p>
            </article>

            <article className="pain-card">
              <div className="pain-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="10" width="28" height="22" rx="2" stroke="#ef4444" strokeWidth="1.5" />
                  <path d="M6 18h28" stroke="#ef4444" strokeWidth="1.5" />
                  <path d="M14 14h2M20 14h2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                  <path d="M13 26h14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
                </svg>
              </div>
              <h3>創作者難以自主尋找合作</h3>
              <p>獨立創作者缺乏人脈與渠道，只能被動等待。優質 KOL 因無法直接接觸品牌而錯失合作機會。</p>
            </article>
          </div>

          <p className="pain-bridge">SOON Match for You 正是為解決以上問題而生 ↓</p>
        </div>
      </section>

      <section className="how-section">
        <div className="section-heading">
          <h2>三步完成 KOL 配對</h2>
          <p>從上架到寄貨，全程自動化管理</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <span className="step-icon">
                <StepIcon step={step.number} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="audience-section">
        <div className="section-heading">
          <h2 className="audience-title">為品牌而設<span>·</span>為創作者而設</h2>
        </div>
        <div className="audience-grid">
          <article className="audience-card brand-card">
            <h3>品牌的新玩法</h3>
            <ul>
              {brandPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
          <article className="audience-card creator-card">
            <h3>創作者的新機遇</h3>
            <ul>
              {creatorPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="cta-section">
        <h2>準備好開始了嗎？</h2>
        <p>立即免費試用一星期</p>
        <Link className="primary-cta" href="/signup">
          免費開始
        </Link>
        <small>無需信用卡 · 免費試用七天 · 隨時取消</small>
      </section>

      <footer className="match-footer">
        <span>SOON Creator Network</span>
        <span>Match for You 創作者配對</span>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .match-page {
              min-height: 100vh;
              background: transparent;
              color: #ffffff;
              overflow: hidden;
              font-family:
                "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
            }

            .hero-split,
            .pain-section,
            .how-section,
            .audience-section,
            .cta-section,
            .match-footer {
              position: relative;
              z-index: 1;
            }

            .hero-split {
              background: #0a0a0a;
              min-height: 620px;
              overflow: hidden;
            }

            .hero-grid {
              min-height: 620px;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items: center;
            }

            .hero-copy {
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 160px 32px 96px 160px;
            }

            .pl-28 {
              padding-left: 112px;
            }

            .hero-eyebrow {
              margin: 0 0 24px;
              color: #D4AF37;
              font-size: 0.875rem;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .hero-copy h1 {
              margin: 0 0 24px;
              color: #ffffff;
              font-size: clamp(48px, 5.5vw, 88px);
              line-height: 1;
              font-weight: 950;
              letter-spacing: 0;
            }

            .hero-subtitle {
              margin: 0 0 32px;
              color: rgba(255, 255, 255, 0.7);
              font-size: 17px;
              line-height: 1.7;
              font-weight: 650;
            }

            .hero-actions {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 32px;
            }

            .hero-primary,
            .hero-secondary,
            .primary-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              padding: 0 24px;
              border-radius: 8px;
              font-size: 0.875rem;
              font-weight: 850;
              text-decoration: none;
              transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
            }

            .hero-primary,
            .primary-cta {
              background: #ef4444;
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.08);
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.32);
            }

            .hero-secondary {
              color: #ffffff;
              border: 1.5px solid rgba(255, 255, 255, 0.4);
              background: transparent;
            }

            .hero-primary:hover,
            .hero-secondary:hover,
            .primary-cta:hover {
              transform: translateY(-2px);
            }

            .platform-row {
              display: flex;
              align-items: center;
              gap: 12px;
              color: rgba(255, 255, 255, 0.4);
              font-size: 0.875rem;
              font-weight: 750;
            }

            .hero-image-wrap {
              position: relative;
              height: 100%;
              min-height: 620px;
              overflow: hidden;
            }

            .hero-fade {
              position: absolute;
              inset: 0;
              z-index: 10;
              pointer-events: none;
            }

            .hero-fade-left {
              background: linear-gradient(to right, #0a0a0a 0%, transparent 35%);
            }

            .hero-fade-top {
              background: linear-gradient(to bottom, #0a0a0a 0%, transparent 20%);
            }

            .hero-fade-bottom {
              background: linear-gradient(to top, #0a0a0a 0%, transparent 20%);
            }

            .hero-image {
              width: 100%;
              height: 100%;
              min-height: 620px;
              object-fit: cover;
              object-position: center;
              transform: scale(1.4);
              transform-origin: center center;
              animation: float 6s ease-in-out infinite;
            }

            .pain-section {
              padding: 96px 32px;
              background: transparent;
            }

            .pain-inner {
              max-width: 1024px;
              margin: 0 auto;
            }

            .section-kicker {
              margin: 0 0 16px;
              text-align: center;
              color: #D4AF37;
              font-size: 0.875rem;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .pain-inner h2 {
              margin: 0 0 64px;
              text-align: center;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 52px);
              line-height: 1.08;
              font-weight: 950;
            }

            .pain-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 32px;
            }

            .pain-card {
              padding: 32px;
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .pain-icon {
              margin-bottom: 24px;
            }

            .pain-card h3 {
              margin: 0 0 12px;
              color: #ffffff;
              font-size: 18px;
              font-weight: 900;
            }

            .pain-card p {
              margin: 0;
              color: rgba(255, 255, 255, 0.55);
              font-size: 14px;
              line-height: 1.8;
              font-weight: 600;
            }

            .pain-bridge {
              margin: 64px 0 0;
              text-align: center;
              color: rgba(255, 255, 255, 0.5);
              font-size: 16px;
              font-weight: 750;
            }

            .how-section {
              margin-top: 0;
              padding: 64px 7vw 110px;
            }

            .section-heading {
              text-align: center;
              max-width: 760px;
              margin: 0 auto 52px;
            }

            .section-heading h2,
            .cta-section h2 {
              margin: 0;
              color: #ffffff;
              font-size: clamp(2.4rem, 5vw, 5rem);
              line-height: 1;
              letter-spacing: 0;
              font-weight: 950;
            }

            .section-heading p,
            .cta-section p {
              margin: 18px 0 0;
              color: #a1a1aa;
              font-size: 1.18rem;
              line-height: 1.7;
              font-weight: 650;
            }

            .steps-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
            }

            .step-card {
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 22px;
              background: #101010;
              padding: 32px;
              min-height: 330px;
            }

            .step-number {
              display: block;
              color: rgba(239, 68, 68, 0.46);
              font-size: 80px;
              line-height: 0.9;
              font-weight: 300;
            }

            .step-icon {
              display: block;
              margin-top: 28px;
              width: 32px;
              height: 32px;
            }

            .step-card h3 {
              margin: 18px 0 10px;
              color: #ffffff;
              font-size: 1.45rem;
            }

            .step-card p {
              margin: 0;
              color: #a1a1aa;
              font-size: 1rem;
              line-height: 1.7;
              font-weight: 600;
            }

            .audience-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 110px 7vw;
              background: #111111;
            }

            .audience-section .section-heading {
              width: 100%;
            }

            .audience-title {
              width: 100%;
              text-align: center;
              white-space: nowrap;
            }

            .audience-title span {
              margin: 0 0.18em;
            }

            .audience-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 22px;
              width: 100%;
              max-width: 1180px;
              margin: 0 auto;
            }

            .audience-card {
              border: 1px solid rgba(255, 255, 255, 0.09);
              border-radius: 22px;
              background: #0a0a0a;
              padding: 34px;
            }

            .brand-card {
              border-top: 4px solid #ef4444;
            }

            .creator-card {
              border-top: 4px solid #ffffff;
            }

            .audience-card h3 {
              margin: 0 0 22px;
              color: #ffffff;
              font-size: 2rem;
              line-height: 1.1;
            }

            .audience-card ul {
              list-style: none;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .audience-card li {
              position: relative;
              padding-left: 20px;
              color: #e4e4e7;
              font-size: 1.06rem;
              line-height: 1.6;
              font-weight: 700;
            }

            .audience-card li::before {
              content: "";
              position: absolute;
              top: 0.75em;
              left: 0;
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: #ef4444;
            }

            .creator-card li::before {
              background: #ffffff;
            }

            .cta-section {
              padding: 110px 7vw;
              text-align: center;
              background:
                radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.3), transparent 42%),
                linear-gradient(135deg, #1a0000 0%, #0a0a0a 72%);
            }

            .cta-section .primary-cta {
              margin-top: 28px;
            }

            .cta-section small {
              display: block;
              margin-top: 14px;
              color: #a1a1aa;
              font-size: 0.95rem;
              font-weight: 700;
            }

            .match-footer {
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

            @keyframes float {
              0%, 100% {
                transform: translateY(0) scale(1.4);
              }
              50% {
                transform: translateY(-12px) scale(1.4);
              }
            }

            @media (max-width: 1080px) {
              .hero-grid,
              .steps-grid,
              .pain-grid,
              .audience-grid {
                grid-template-columns: 1fr;
              }

              .hero-copy {
                padding: 130px 32px 56px;
              }

              .hero-image-wrap {
                min-height: 520px;
              }

              .audience-title {
                white-space: normal;
                font-size: clamp(2rem, 7vw, 4rem);
              }
            }

            @media (max-width: 720px) {
              .hero-copy,
              .pain-section,
              .how-section,
              .audience-section,
              .cta-section {
                padding-left: 22px;
                padding-right: 22px;
              }

              .hero-copy {
                padding-top: 118px;
                padding-bottom: 44px;
              }

              .hero-actions {
                flex-direction: column;
                align-items: stretch;
              }

              .hero-primary,
              .hero-secondary,
              .primary-cta {
                width: 100%;
              }

              .platform-row {
                flex-wrap: wrap;
              }

              .pain-card,
              .step-card,
              .audience-card {
                padding: 24px;
              }

              .match-footer {
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
