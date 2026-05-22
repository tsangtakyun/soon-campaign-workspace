'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

type CounterKind = 'integer' | 'money' | 'views'

const counters: Array<{
  value: number
  kind: CounterKind
  unit: string
  description: string
}> = [
  { value: 1247, kind: 'integer', unit: '次', description: '已促成 KOL 合作' },
  { value: 2.3, kind: 'money', unit: '', description: '品牌節省中介費用' },
  { value: 89, kind: 'views', unit: 'views', description: '覆蓋平台總觀看次數' },
  { value: 3800, kind: 'integer', unit: '+', description: '活躍創作者數目' },
]

const campaigns = [
  {
    brand: 'Botanica Studio',
    initial: 'B',
    gradient: 'linear-gradient(135deg, #059669, #115e59)',
    product: '護膚品',
    desc: '尋找真實護膚體驗分享的創作者',
    applications: 23,
    time: '2 小時前',
  },
  {
    brand: 'MOODLAB',
    initial: 'M',
    gradient: 'linear-gradient(135deg, #9333ea, #3730a3)',
    product: '香薰',
    desc: '生活風格 KOL，分享居家氛圍',
    applications: 41,
    time: '5 小時前',
  },
  {
    brand: 'Grain & Co.',
    initial: 'G',
    gradient: 'linear-gradient(135deg, #d97706, #9a3412)',
    product: '健康食品',
    desc: '健身或健康生活方式創作者優先',
    applications: 18,
    time: '8 小時前',
  },
  {
    brand: 'LUMI',
    initial: 'L',
    gradient: 'linear-gradient(135deg, #db2777, #9f1239)',
    product: '美妝',
    desc: '彩妝教學或開箱類創作者',
    applications: 67,
    time: '1 天前',
  },
  {
    brand: 'Arktis',
    initial: 'A',
    gradient: 'linear-gradient(135deg, #2563eb, #155e75)',
    product: '運動服飾',
    desc: '健身、戶外活動類創作者',
    applications: 34,
    time: '1 天前',
  },
  {
    brand: 'SONO Home',
    initial: 'S',
    gradient: 'linear-gradient(135deg, #78716c, #3f3f46)',
    product: '家居',
    desc: '家居佈置或 slow living 風格創作者',
    applications: 12,
    time: '2 天前',
  },
]

const markets = [
  '香港 · IG / 小紅書 / TikTok',
  '台灣 · IG / TikTok / YouTube',
  '中國大陸 · 小紅書 / 微博 / 抖音',
  '新加坡 · IG / TikTok / YouTube',
]

function formatCounter(value: number, kind: CounterKind) {
  if (kind === 'money') return `HK$${value.toFixed(1)}M`
  if (kind === 'views') return `${Math.round(value)}M`
  return Math.round(value).toLocaleString('en-US')
}

function LiveCounter({
  target,
  kind,
  unit,
  active,
}: {
  target: number
  kind: CounterKind
  unit: string
  active: boolean
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return

    let frame = 0
    const duration = 2000
    const startedAt = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, target])

  return (
    <div className="counter-line">
      <span className={`counter-number ${kind === 'money' ? 'counter-number--money' : ''}`}>
        {formatCounter(value, kind)}
      </span>
      {unit && kind === 'integer' ? <span className="counter-unit">{unit}</span> : null}
      {unit && kind !== 'integer' ? <span className="counter-unit">{unit}</span> : null}
    </div>
  )
}

export default function PlatformStatsPage() {
  const counterRef = useRef<HTMLDivElement | null>(null)
  const [counterActive, setCounterActive] = useState(false)

  useEffect(() => {
    const canvas = document.getElementById('platform-starfield') as HTMLCanvasElement
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

  useEffect(() => {
    const target = counterRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCounterActive(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="platform-page">
      <canvas
        id="platform-starfield"
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

      <section className="stats-hero">
        <p className="eyebrow">SOON · 平台實況</p>
        <h1>平台實況</h1>
        <p>每一個數字，都是品牌與創作者之間真實發生的連結</p>
      </section>

      <section ref={counterRef} className="counter-section">
        <div className="counter-grid">
          {counters.map((counter) => (
            <article className="counter-card" key={counter.description}>
              <LiveCounter
                target={counter.value}
                kind={counter.kind}
                unit={counter.unit}
                active={counterActive}
              />
              <p>{counter.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feed-section">
        <div className="section-heading">
          <h2>最近上架 Campaign</h2>
          <p>品牌正在等待創作者申請</p>
        </div>
        <div className="campaign-feed">
          {campaigns.map((campaign) => (
            <article className="campaign-card" key={campaign.brand}>
              <div className="brand-avatar" style={{ background: campaign.gradient }}>
                {campaign.initial}
              </div>
              <div className="campaign-main">
                <div className="campaign-title-row">
                  <h3>{campaign.brand}</h3>
                  <span>{campaign.product}</span>
                </div>
                <p>{campaign.desc}</p>
              </div>
              <div className="campaign-meta">
                <strong>已收 {campaign.applications} 個申請</strong>
                <small>{campaign.time}</small>
                <em><i />招募中</em>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="market-section">
        <div className="section-heading">
          <h2>覆蓋亞洲核心市場</h2>
          <p>支援香港、台灣、中國大陸、新加坡四大市場</p>
        </div>
        <div className="market-pills">
          {markets.map((market) => (
            <span key={market}>{market}</span>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>立即加入平台</h2>
        <p>無需中介，品牌與創作者直接連結</p>
        <Link className="primary-cta" href="/signup">
          免費開始
        </Link>
        <small>無需信用卡 · 免費試用七天 · 隨時取消</small>
      </section>

      <footer className="platform-footer">
        <span>SOON Creator Network</span>
        <span>平台實況</span>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .platform-page {
              min-height: 100vh;
              background: transparent;
              color: #ffffff;
              font-family:
                "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
            }

            .stats-hero,
            .counter-section,
            .feed-section,
            .market-section,
            .cta-section,
            .platform-footer {
              position: relative;
              z-index: 1;
            }

            .stats-hero {
              padding: 160px 24px 64px;
              text-align: center;
            }

            .eyebrow {
              margin: 0 0 18px;
              color: #D4AF37;
              font-size: 0.875rem;
              font-weight: 850;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }

            .stats-hero h1 {
              margin: 0;
              color: #ffffff;
              font-size: clamp(56px, 9vw, 112px);
              line-height: 0.95;
              font-weight: 950;
              letter-spacing: 0;
            }

            .stats-hero p:not(.eyebrow) {
              max-width: 600px;
              margin: 24px auto 0;
              color: #a1a1aa;
              font-size: 1.12rem;
              line-height: 1.75;
              font-weight: 650;
            }

            .counter-section {
              padding: 28px 7vw 110px;
            }

            .counter-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 18px;
              max-width: 1180px;
              margin: 0 auto;
            }

            .counter-card,
            .campaign-card {
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.04);
            }

            .counter-card {
              padding: 32px;
              min-height: 180px;
              overflow: visible;
            }

            .counter-line {
              display: flex;
              align-items: baseline;
              gap: 8px;
              min-height: 68px;
            }

            .counter-number {
              color: #ffffff;
              font-size: 56px;
              line-height: 1;
              font-weight: 950;
              letter-spacing: 0;
              white-space: nowrap;
              overflow: visible;
            }

            .counter-number--money {
              font-size: clamp(28px, 3vw, 44px);
            }

            .counter-unit {
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 750;
            }

            .counter-card p {
              margin: 18px 0 0;
              color: #71717a;
              font-size: 13px;
              line-height: 1.6;
              font-weight: 700;
            }

            .feed-section,
            .market-section {
              padding: 0 7vw 110px;
            }

            .section-heading {
              text-align: center;
              margin: 0 auto 42px;
            }

            .section-heading h2 {
              margin: 0;
              color: #ffffff;
              font-size: 36px;
              line-height: 1.1;
              font-weight: 950;
            }

            .section-heading p {
              margin: 14px 0 0;
              color: #a1a1aa;
              font-size: 1rem;
              line-height: 1.7;
              font-weight: 650;
            }

            .campaign-feed {
              display: flex;
              flex-direction: column;
              gap: 14px;
              max-width: 768px;
              margin: 0 auto;
            }

            .campaign-card {
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 20px;
            }

            .brand-avatar {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 15px;
              font-weight: 900;
              flex-shrink: 0;
            }

            .campaign-main {
              min-width: 0;
            }

            .campaign-title-row {
              display: flex;
              align-items: center;
              gap: 10px;
              flex-wrap: wrap;
            }

            .campaign-title-row h3 {
              margin: 0;
              color: #ffffff;
              font-size: 15px;
              line-height: 1.2;
              font-weight: 700;
            }

            .campaign-title-row span {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 2px 8px;
              background: #3a0a0a;
              color: #ef4444;
              font-size: 11px;
              line-height: 1.5;
              font-weight: 800;
            }

            .campaign-main p {
              margin: 6px 0 0;
              color: #a1a1aa;
              font-size: 13px;
              line-height: 1.6;
              font-weight: 650;
            }

            .campaign-meta {
              margin-left: auto;
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 5px;
              flex-shrink: 0;
            }

            .campaign-meta strong {
              color: #ffffff;
              font-size: 14px;
              font-weight: 750;
            }

            .campaign-meta small {
              color: #71717a;
              font-size: 12px;
              font-weight: 700;
            }

            .campaign-meta em {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: #4ade80;
              font-size: 12px;
              font-style: normal;
              font-weight: 800;
            }

            .campaign-meta i {
              display: inline-block;
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: #4ade80;
              box-shadow: 0 0 14px rgba(74, 222, 128, 0.72);
            }

            .market-pills {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-wrap: wrap;
              gap: 14px;
            }

            .market-pills span {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 12px 24px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              background: rgba(255, 255, 255, 0.06);
              color: #e4e4e7;
              font-size: 0.95rem;
              font-weight: 760;
            }

            .cta-section {
              padding: 110px 7vw;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .cta-section h2 {
              margin: 0;
              color: #ffffff;
              font-size: clamp(2.4rem, 5vw, 5rem);
              line-height: 1;
              font-weight: 950;
            }

            .cta-section p {
              margin: 18px 0 0;
              color: #a1a1aa;
              font-size: 1.18rem;
              line-height: 1.7;
              font-weight: 650;
            }

            .primary-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              margin-top: 28px;
              padding: 0 26px;
              border-radius: 8px;
              text-decoration: none;
              background: #ef4444;
              color: #ffffff;
              font-size: 0.95rem;
              font-weight: 850;
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.32);
              transition: transform 180ms ease;
            }

            .primary-cta:hover {
              transform: translateY(-2px);
            }

            .cta-section small {
              display: block;
              margin-top: 14px;
              color: #a1a1aa;
              font-size: 0.95rem;
              font-weight: 700;
            }

            .platform-footer {
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

            @media (max-width: 980px) {
              .counter-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }

            @media (max-width: 720px) {
              .counter-section,
              .feed-section,
              .market-section,
              .cta-section {
                padding-left: 22px;
                padding-right: 22px;
              }

              .counter-grid {
                grid-template-columns: 1fr;
              }

              .campaign-card {
                align-items: flex-start;
              }

              .campaign-meta {
                display: none;
              }

              .platform-footer {
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
