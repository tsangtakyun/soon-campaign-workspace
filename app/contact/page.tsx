'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type Identity = 'brand' | 'creator' | 'business'

const platformOptions = ['IG', '小紅書', 'TikTok', 'YouTube']

const identities: Array<{
  id: Identity
  title: string
  subtitle: string
  icon: React.ReactNode
}> = [
  {
    id: 'brand',
    title: '我是品牌',
    subtitle: '想了解 Campaign 合作',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="8" width="24" height="18" rx="2" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M4 14h24" stroke="#ef4444" strokeWidth="1.5" />
        <circle cx="16" cy="21" r="2" stroke="#ef4444" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'creator',
    title: '我是創作者',
    subtitle: '想申請加入平台',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="12" r="5" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 8l2 2-6 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'business',
    title: '商業合作',
    subtitle: '媒體、投資、夥伴洽談',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function SuccessState() {
  return (
    <div className="success-state">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M13 20l5 5 9-9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3>已成功提交！</h3>
      <p>我們將於一個工作天內回覆您。</p>
    </div>
  )
}

export default function ContactPage() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>([])

  useEffect(() => {
    const canvas = document.getElementById('contact-starfield') as HTMLCanvasElement
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

  const selectIdentity = (nextIdentity: Identity) => {
    setIdentity(nextIdentity)
    setSubmitted(false)
    if (nextIdentity !== 'brand') setPlatforms([])
  }

  const togglePlatform = (platform: string) => {
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="contact-page">
      <canvas
        id="contact-starfield"
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

      <section className="hero-section">
        <p className="eyebrow">SOON · 聯絡我們</p>
        <h1>你好，我們在這裡</h1>
        <p>告訴我們你是誰，我們為你提供最合適的支援。</p>
      </section>

      <section className="form-section">
        <div className="identity-grid">
          {identities.map((item) => (
            <button
              className={`identity-card ${identity === item.id ? 'selected' : ''}`}
              key={item.id}
              onClick={() => selectIdentity(item.id)}
              type="button"
            >
              <span className="identity-icon">{item.icon}</span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </button>
          ))}
        </div>

        <div className={`dynamic-form-wrap ${identity ? 'visible' : ''}`}>
          {identity && submitted ? <SuccessState /> : null}

          {identity === 'brand' && !submitted ? (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h2>品牌合作查詢</h2>
              <label>
                公司 / 品牌名稱 *
                <input placeholder="例：Botanica Studio" required type="text" />
              </label>
              <label>
                行業類別
                <select defaultValue="美妝護膚">
                  <option>美妝護膚</option>
                  <option>時尚服飾</option>
                  <option>健康食品</option>
                  <option>家居生活</option>
                  <option>科技產品</option>
                  <option>其他</option>
                </select>
              </label>
              <label>
                Campaign 預算範圍
                <select defaultValue="未確定">
                  <option>HK$5,000 以下</option>
                  <option>HK$5,000-20,000</option>
                  <option>HK$20,000-50,000</option>
                  <option>HK$50,000 以上</option>
                  <option>未確定</option>
                </select>
              </label>
              <div className="field-group">
                <span>目標推廣平台</span>
                <div className="platform-pills">
                  {platformOptions.map((platform) => (
                    <label className={`platform-pill ${platforms.includes(platform) ? 'checked' : ''}`} key={platform}>
                      <input
                        checked={platforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        type="checkbox"
                      />
                      {platform}
                    </label>
                  ))}
                </div>
              </div>
              <label>
                其他說明（選填）
                <textarea placeholder="請簡述你的產品及合作需求" rows={3} />
              </label>
              <button type="submit">提交查詢</button>
            </form>
          ) : null}

          {identity === 'creator' && !submitted ? (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h2>創作者申請</h2>
              <label>
                姓名 *
                <input placeholder="你的名字" required type="text" />
              </label>
              <label>
                主要平台帳號 *
                <input placeholder="例：@yourhandle" required type="text" />
              </label>
              <label>
                主要平台
                <select defaultValue="Instagram">
                  <option>Instagram</option>
                  <option>小紅書</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                </select>
              </label>
              <label>
                粉絲數量
                <select defaultValue="10,000-50,000">
                  <option>1,000-10,000</option>
                  <option>10,000-50,000</option>
                  <option>50,000-200,000</option>
                  <option>200,000 以上</option>
                </select>
              </label>
              <label>
                內容類型
                <select defaultValue="生活風格">
                  <option>美妝</option>
                  <option>時尚</option>
                  <option>生活風格</option>
                  <option>健身健康</option>
                  <option>旅遊</option>
                  <option>科技</option>
                  <option>美食</option>
                  <option>其他</option>
                </select>
              </label>
              <label>
                聯絡電郵 *
                <input placeholder="your@email.com" required type="email" />
              </label>
              <button type="submit">提交申請</button>
            </form>
          ) : null}

          {identity === 'business' && !submitted ? (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h2>商業合作洽談</h2>
              <label>
                姓名 *
                <input required type="text" />
              </label>
              <label>
                公司 / 機構
                <input type="text" />
              </label>
              <label>
                聯絡電郵 *
                <input placeholder="your@email.com" required type="email" />
              </label>
              <label>
                合作類型
                <select defaultValue="媒體報道">
                  <option>媒體報道</option>
                  <option>投資洽談</option>
                  <option>品牌夥伴</option>
                  <option>其他</option>
                </select>
              </label>
              <label>
                簡短說明 *
                <textarea placeholder="請簡述合作目的" required rows={4} />
              </label>
              <button type="submit">發送訊息</button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="info-section">
        <div className="info-card">
          <div>
            <h2>直接聯絡我們</h2>
            <p>如有緊急查詢，歡迎直接電郵聯絡</p>
          </div>
          <a href="mailto:hello@sooncreator.network">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 6l7 5 7-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            hello@sooncreator.network
          </a>
        </div>
        <p className="reply-note">通常於一個工作天內回覆 · 週一至週五</p>
      </section>

      <section className="final-cta">
        <h2>準備好開始了嗎？</h2>
        <p>無需等待，立即免費試用七天。</p>
        <Link className="primary-cta" href="/signup">
          品牌免費試用
        </Link>
      </section>

      <footer className="contact-footer">
        <span>SOON Creator Network</span>
        <span>聯絡我們</span>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .contact-page {
              min-height: 100vh;
              background: transparent;
              color: #ffffff;
              font-family:
                "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
            }

            .hero-section,
            .form-section,
            .info-section,
            .final-cta,
            .contact-footer {
              position: relative;
              z-index: 1;
            }

            .hero-section {
              max-width: 672px;
              margin: 0 auto;
              padding: 160px 32px 48px;
              text-align: center;
            }

            .eyebrow {
              margin: 0 0 24px;
              color: #D4AF37;
              font-size: 12px;
              font-weight: 850;
              letter-spacing: 0.16em;
              text-transform: uppercase;
            }

            .hero-section h1 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: clamp(36px, 5vw, 60px);
              line-height: 1.12;
              font-weight: 950;
              letter-spacing: 0;
            }

            .hero-section p:not(.eyebrow) {
              margin: 0;
              color: #a1a1aa;
              font-size: 17px;
              line-height: 1.8;
              font-weight: 650;
            }

            .form-section {
              max-width: 768px;
              margin: 0 auto;
              padding: 64px 32px;
            }

            .identity-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 16px;
            }

            .identity-card {
              padding: 24px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.04);
              color: #ffffff;
              cursor: pointer;
              text-align: center;
              transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
            }

            .identity-card:hover {
              border-color: rgba(255, 255, 255, 0.2);
              transform: translateY(-2px);
            }

            .identity-card.selected {
              border: 1.5px solid #ef4444;
              background: rgba(239, 68, 68, 0.06);
            }

            .identity-icon {
              display: flex;
              justify-content: center;
              margin-bottom: 16px;
            }

            .identity-card strong {
              display: block;
              color: #ffffff;
              font-size: 16px;
              font-weight: 900;
            }

            .identity-card small {
              display: block;
              margin-top: 6px;
              color: #a1a1aa;
              font-size: 13px;
              line-height: 1.5;
              font-weight: 650;
            }

            .dynamic-form-wrap {
              opacity: 0;
              transform: translateY(16px);
              transition: all 0.4s ease;
              pointer-events: none;
              margin-top: 34px;
            }

            .dynamic-form-wrap.visible {
              opacity: 1;
              transform: translateY(0);
              pointer-events: auto;
            }

            .contact-form {
              display: flex;
              flex-direction: column;
              gap: 20px;
              padding: 32px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.035);
            }

            .contact-form h2 {
              margin: 0 0 4px;
              color: #ffffff;
              font-size: 20px;
              font-weight: 950;
            }

            .contact-form label,
            .field-group span {
              display: block;
              color: #d4d4d8;
              font-size: 13px;
              line-height: 1.6;
              font-weight: 750;
            }

            .contact-form input,
            .contact-form select,
            .contact-form textarea {
              width: 100%;
              margin-top: 8px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.06);
              color: #ffffff;
              padding: 12px 16px;
              font-size: 15px;
              outline: none;
              font-family: inherit;
            }

            .contact-form select {
              appearance: none;
            }

            .contact-form textarea {
              resize: vertical;
            }

            .contact-form input:focus,
            .contact-form select:focus,
            .contact-form textarea:focus {
              border-color: #ef4444;
            }

            .contact-form input::placeholder,
            .contact-form textarea::placeholder {
              color: #71717a;
            }

            .platform-pills {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-top: 10px;
            }

            .platform-pill {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              border: 1px solid rgba(255, 255, 255, 0.14);
              color: #d4d4d8;
              cursor: pointer;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: 800;
            }

            .platform-pill input {
              display: none;
            }

            .platform-pill.checked {
              border-color: #ef4444;
              background: #ef4444;
              color: #ffffff;
            }

            .contact-form > button {
              width: 100%;
              margin-top: 8px;
              border: 0;
              border-radius: 12px;
              background: #ef4444;
              color: #ffffff;
              cursor: pointer;
              padding: 16px;
              font-size: 16px;
              font-weight: 900;
            }

            .success-state {
              padding: 48px 24px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.035);
              text-align: center;
            }

            .success-state h3 {
              margin: 16px 0 0;
              color: #ffffff;
              font-size: 22px;
              font-weight: 950;
            }

            .success-state p {
              margin: 8px 0 0;
              color: #a1a1aa;
              font-size: 15px;
              font-weight: 650;
            }

            .info-section {
              max-width: 768px;
              margin: 0 auto;
              padding: 64px 32px;
            }

            .info-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 32px;
              padding: 32px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.03);
            }

            .info-card h2 {
              margin: 0 0 8px;
              color: #ffffff;
              font-size: 18px;
              font-weight: 900;
            }

            .info-card p {
              margin: 0;
              color: #a1a1aa;
              font-size: 14px;
              font-weight: 650;
            }

            .info-card a {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              border-radius: 999px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #ffffff;
              padding: 12px 24px;
              text-decoration: none;
              font-size: 15px;
              font-weight: 800;
              white-space: nowrap;
            }

            .reply-note {
              margin: 16px 0 0;
              color: #71717a;
              text-align: center;
              font-size: 13px;
              font-weight: 700;
            }

            .final-cta {
              padding: 80px 32px;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .final-cta h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: clamp(28px, 4vw, 44px);
              line-height: 1.12;
              font-weight: 950;
            }

            .final-cta p {
              margin: 0 0 32px;
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 650;
            }

            .primary-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              padding: 0 26px;
              border-radius: 8px;
              text-decoration: none;
              background: #ef4444;
              color: #ffffff;
              font-size: 0.95rem;
              font-weight: 850;
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.32);
            }

            .contact-footer {
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

            @media (max-width: 760px) {
              .identity-grid {
                grid-template-columns: 1fr;
              }

              .info-card {
                align-items: flex-start;
                flex-direction: column;
              }

              .info-card a {
                white-space: normal;
              }

              .contact-footer {
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
