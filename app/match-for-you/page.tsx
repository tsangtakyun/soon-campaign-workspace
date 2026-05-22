'use client'

import Link from 'next/link'
import React from 'react'

const applicationCards = [
  {
    name: '陳曉彤',
    platform: 'IG 23.5K',
    niche: '美妝',
    status: '✓ 已申請',
    statusTone: 'green',
    gradient: 'linear-gradient(135deg, #c084fc, #f472b6)',
    className: 'kol-card card-a',
  },
  {
    name: '林思穎',
    platform: '小紅書 41K',
    niche: '生活風格',
    status: '待審核',
    statusTone: 'amber',
    gradient: 'linear-gradient(135deg, #fb7185, #f97316)',
    className: 'kol-card card-b',
  },
  {
    name: '梁嘉欣',
    platform: 'TikTok 89K',
    niche: '時尚',
    status: '✓ 已申請',
    statusTone: 'green',
    gradient: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    className: 'kol-card card-c',
  },
  {
    name: '黃芷晴',
    platform: 'YouTube 16K',
    niche: '旅遊',
    status: '待審核',
    statusTone: 'amber',
    gradient: 'linear-gradient(135deg, #34d399, #22d3ee)',
    className: 'kol-card card-d',
  },
  {
    name: '何雅琪',
    platform: 'IG 52K',
    niche: '護膚',
    status: '✓ 已申請',
    statusTone: 'green',
    gradient: 'linear-gradient(135deg, #f9a8d4, #ef4444)',
    className: 'kol-card card-e',
  },
  {
    name: '吳凱琳',
    platform: '小紅書 67K',
    niche: '平價好物',
    status: '✓ 已申請',
    statusTone: 'green',
    gradient: 'linear-gradient(135deg, #fde047, #fb7185)',
    className: 'kol-card card-f',
  },
]

const steps = [
  {
    number: '01',
    icon: '🎁',
    title: '上架 PR Campaign',
    description: '設定產品、預算、目標平台，5 分鐘完成 Campaign 上架',
  },
  {
    number: '02',
    icon: '📩',
    title: 'KOL 主動申請',
    description: '全亞洲創作者瀏覽你的 Campaign，主動提交申請',
  },
  {
    number: '03',
    icon: '✅',
    title: '一鍵批准寄貨',
    description: '審核申請、批准合作、安排寄貨，全部在 SOON 管理',
  },
]

const brandPoints = [
  '唔需要主動聯絡 KOL，坐等申請',
  '自訂 Campaign 條件：粉絲數、平台、地區',
  '一個 dashboard 管理所有申請',
  '支援香港 · 台灣 · 大陸市場',
]

const creatorPoints = [
  '主動發現適合你的品牌合作',
  '免費申請，無需中介',
  '支援 IG · 小紅書 · TikTok · YouTube',
  '亞洲市場優先，中文界面',
]

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
      <section className="relative w-full overflow-hidden hero-background-section" style={{ minHeight: '580px' }}>
        <div className="absolute inset-0 z-0">
          <img
            src="/KOL/kol-hero.png"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{
              animation: 'float 6s ease-in-out infinite',
              transform: 'scale(1.4)',
              transformOrigin: 'center center',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.15) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 40%)',
            }}
          />
        </div>

        <div className="relative z-10 px-12 pt-24 pb-16 max-w-5xl hero-background-content">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-6"
            style={{ color: '#D4AF37', letterSpacing: '0.12em' }}
          >
            SOON ???? ? Exclusive Feature
          </p>

          <h1 className="font-bold text-white leading-none mb-6" style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}>
            ??????KOL
            <br />
            ?KOL??
          </h1>

          <p
            className="text-white mb-8"
            style={{ fontSize: '18px', opacity: 0.75, maxWidth: '520px', lineHeight: 1.6 }}
          >
            ????????????????????
            <br />
            SOON ????????
          </p>

          <div className="flex gap-3 items-center mb-8">
            <a className="px-6 py-3 font-semibold text-white rounded-lg text-sm" href="/signup" style={{ background: '#ef4444' }}>
              ??????
            </a>
            <a
              className="px-6 py-3 font-semibold rounded-lg text-sm"
              href="#"
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff' }}
            >
              ????? ?
            </a>
          </div>

          <div className="flex gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span>Instagram</span>
            <span>?</span>
            <span>???</span>
            <span>?</span>
            <span>TikTok</span>
            <span>?</span>
            <span>YouTube</span>
          </div>
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
              <span className="step-icon">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="audience-section">
        <div className="section-heading">
          <h2 className="audience-title">
            為品牌而設<span>·</span>為創作者而設
          </h2>
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
        <p>立即免費上架你的第一個 PR Gift Campaign</p>
        <Link className="primary-cta" href="/signup">
          免費開始
        </Link>
        <small>無需信用卡 · 免費試用 · 隨時取消</small>
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

            .hero-section {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              align-items: start;
              gap: 6vw;
              overflow: hidden;
              padding: 150px 7vw 64px;
              position: relative;
              z-index: 1;
            }

            .hero-section,
            .how-section,
            .audience-section,
            .cta-section,
            .match-footer {
              position: relative;
              z-index: 1;
            }

            .hero-copy {
              max-width: 720px;
              position: relative;
              z-index: 2;
            }

            .eyebrow {
              color: #D4AF37;
              font-size: 0.82rem;
              font-weight: 900;
              letter-spacing: 0.16em;
              margin: 0 0 18px;
              text-transform: uppercase;
            }

            .hero-copy h1 {
              display: flex;
              flex-direction: column;
              gap: 4px;
              margin: 0;
              font-size: clamp(4rem, 8vw, 8.8rem);
              line-height: 0.9;
              letter-spacing: 0;
              font-weight: 950;
            }

            .hero-subtitle {
              max-width: 640px;
              margin: 28px 0 0;
              color: #d4d4d8;
              font-size: clamp(1.1rem, 1.6vw, 1.45rem);
              line-height: 1.75;
              font-weight: 550;
            }

            .hero-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 14px;
              margin-top: 36px;
            }

            .primary-cta,
            .secondary-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 54px;
              padding: 0 24px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 1rem;
              font-weight: 900;
              transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
            }

            .primary-cta {
              background: #ef4444;
              color: #ffffff;
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.32);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .secondary-cta {
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.72);
              background: rgba(255, 255, 255, 0.03);
            }

            .primary-cta:hover,
            .secondary-cta:hover {
              transform: translateY(-2px);
            }

            .platform-row {
              display: flex;
              flex-wrap: wrap;
              gap: 10px 18px;
              margin-top: 26px;
              color: #a1a1aa;
              font-size: 0.95rem;
              font-weight: 800;
            }

            .platform-row span:not(:last-child)::after {
              content: "·";
              margin-left: 18px;
              color: #ef4444;
            }

            .hero-visual {
              min-height: 640px;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .relative { position: relative; }
            .absolute { position: absolute; }
            .inset-0 { inset: 0; }
            .z-0 { z-index: 0; }
            .z-10 { z-index: 10; }
            .pointer-events-none { pointer-events: none; }
            .w-full { width: 100%; }
            .h-full { height: 100%; }
            .max-w-5xl { max-width: 1024px; }
            .px-12 { padding-left: 48px; padding-right: 48px; }
            .px-6 { padding-left: 24px; padding-right: 24px; }
            .py-3 { padding-top: 12px; padding-bottom: 12px; }
            .pt-24 { padding-top: 96px; }
            .pb-16 { padding-bottom: 64px; }
            .mb-6 { margin-bottom: 24px; }
            .mb-8 { margin-bottom: 32px; }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .min-h-\\[500px\\] { min-height: 500px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .overflow-hidden { overflow: hidden; }
            .object-cover { object-fit: cover; }
            .object-center { object-position: center; }
            .font-bold { font-weight: 950; }
            .font-medium { font-weight: 700; }
            .font-semibold { font-weight: 850; }
            .leading-none { line-height: 1; }
            .text-white { color: #ffffff; }
            .text-sm { font-size: 0.875rem; }
            .tracking-widest { letter-spacing: 0.12em; }
            .uppercase { text-transform: uppercase; }
            .rounded-lg { border-radius: 8px; }
            .rounded-2xl { border-radius: 16px; }

            .red-glow {
              position: absolute;
              width: min(42vw, 620px);
              aspect-ratio: 1;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(239, 68, 68, 0.32), rgba(239, 68, 68, 0.08) 42%, transparent 70%);
              filter: blur(8px);
              animation: pulseGlow 4s ease-in-out infinite;
            }

            .card-mosaic {
              position: relative;
              width: min(560px, 100%);
              height: 560px;
              z-index: 2;
            }

            .kol-card {
              position: absolute;
              width: 210px;
              border: 1px solid #27272a;
              border-radius: 18px;
              background: rgba(26, 26, 26, 0.92);
              box-shadow: 0 26px 80px rgba(0, 0, 0, 0.42);
              padding: 16px;
              backdrop-filter: blur(18px);
              animation: floatCard 5.4s ease-in-out infinite;
            }

            .card-a { top: 18px; left: 42px; transform: rotate(-6deg); animation-delay: 0s; }
            .card-b { top: 82px; right: 28px; transform: rotate(5deg); animation-delay: -1s; }
            .card-c { top: 232px; left: 0; transform: rotate(4deg); animation-delay: -2s; }
            .card-d { top: 272px; right: 6px; transform: rotate(-4deg); animation-delay: -1.8s; }
            .card-e { bottom: 18px; left: 94px; transform: rotate(-2deg); animation-delay: -3s; }
            .card-f { bottom: 86px; right: 120px; transform: rotate(7deg); animation-delay: -2.6s; }

            .card-topline {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .avatar {
              width: 46px;
              height: 46px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 950;
              border: 2px solid rgba(255, 255, 255, 0.28);
            }

            .status-badge {
              border-radius: 999px;
              padding: 5px 8px;
              font-size: 0.72rem;
              font-weight: 900;
              white-space: nowrap;
            }

            .status-badge.green {
              color: #bbf7d0;
              background: rgba(34, 197, 94, 0.16);
            }

            .status-badge.amber {
              color: #fde68a;
              background: rgba(245, 158, 11, 0.14);
            }

            .kol-card h2 {
              margin: 14px 0 10px;
              font-size: 1.15rem;
              line-height: 1.2;
            }

            .card-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .card-meta span {
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.05);
              color: #d4d4d8;
              padding: 6px 9px;
              font-size: 0.76rem;
              font-weight: 850;
            }

            .audience-section,
            .cta-section {
              padding: 110px 7vw;
            }

            .how-section {
              margin-top: 0;
              padding: 64px 7vw 110px;
              position: relative;
              z-index: 3;
            }

            .section-heading {
              text-align: center;
              max-width: 760px;
              margin: 0 auto 52px;
            }

            .section-heading h2,
            .cta-section h2 {
              margin: 0;
              font-size: clamp(2.4rem, 5vw, 5rem);
              line-height: 1;
              letter-spacing: 0;
              font-weight: 950;
            }

            .audience-title {
              white-space: nowrap;
            }

            .audience-title span {
              margin: 0 0.18em;
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
              font-size: 2rem;
            }

            .step-card h3 {
              margin: 18px 0 10px;
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
              background: #111111;
            }

            .audience-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 22px;
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

            @keyframes floatCard {
              0%, 100% {
                translate: 0 0;
              }
              50% {
                translate: 0 -16px;
              }
            }

            @keyframes float {
              0%, 100% {
                transform: translateY(0) scale(1.4);
              }
              50% {
                transform: translateY(-12px) scale(1.4);
              }
            }

            @keyframes pulseGlow {
              0%, 100% {
                opacity: 0.72;
                transform: scale(0.98);
              }
              50% {
                opacity: 1;
                transform: scale(1.05);
              }
            }

            @media (max-width: 1080px) {
              .hero-section {
                grid-template-columns: 1fr;
                padding-top: 210px;
                padding-bottom: 56px;
              }

              .audience-title {
                white-space: normal;
                font-size: clamp(2rem, 7vw, 4rem);
              }

              .hero-visual {
                min-height: 560px;
              }

              .steps-grid,
              .audience-grid {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 720px) {
              .hero-section,
              .how-section,
              .audience-section,
              .cta-section {
                padding-left: 22px;
                padding-right: 22px;
              }

              .hero-section {
                padding-top: 230px;
                padding-bottom: 48px;
              }

              .hero-actions {
                flex-direction: column;
              }

              .primary-cta,
              .secondary-cta {
                width: 100%;
              }

              .hero-visual {
                min-height: 680px;
              }

              .card-mosaic {
                height: 660px;
              }

              .kol-card {
                width: min(260px, 82vw);
              }

              .card-a { top: 0; left: 0; }
              .card-b { top: 104px; right: 0; }
              .card-c { top: 226px; left: 18px; }
              .card-d { top: 346px; right: 12px; }
              .card-e { bottom: 42px; left: 0; }
              .card-f { bottom: 0; right: 0; }

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
