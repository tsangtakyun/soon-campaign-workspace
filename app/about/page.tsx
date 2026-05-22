'use client'

import Link from 'next/link'
import React, { useEffect } from 'react'

export default function AboutPage() {
  useEffect(() => {
    const canvas = document.getElementById('about-starfield') as HTMLCanvasElement
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
    <main className="about-page">
      <canvas
        id="about-starfield"
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

      <section className="story-section">
        <p className="eyebrow">SOON · 我們的故事</p>
        <h1>我們看到了一個問題</h1>
        <p>
          在亞洲，品牌想找到真正適合自己產品的創作者，往往要經過中介公司。中介收取高額佣金，推薦旗下創作者，而非最適合的人選。創作者對產品毫無熱情，內容質素難以保證。品牌的預算大量流失，卻換不到真實的宣傳效果。
        </p>
        <p>
          與此同時，無數優質的獨立創作者，因為缺乏人脈與渠道，根本無法接觸到適合自己的品牌合作機會。
        </p>
      </section>

      <section className="manifesto-section">
        <div className="manifesto-inner">
          <h2>
            品牌不應該為中間人付費。
            <br />
            <span>創作者不應該依賴中間人生存。</span>
          </h2>
          <div className="divider" />
          <p>
            我們相信，當品牌與創作者能夠直接連結，真實的創作才會發生。真實的創作，才能帶來真實的影響力。
          </p>
        </div>
      </section>

      <section className="belief-section">
        <div className="section-heading">
          <h2>我們的信念</h2>
          <p>三個不妥協的原則</p>
        </div>
        <div className="belief-grid">
          <article className="belief-card">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L4 12v16h24V12L16 4z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 28V18h8v10" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <h3>直接連結</h3>
            <p>品牌與創作者之間不應存在不必要的中間環節。直接連結意味著更低的成本、更真實的合作、更好的結果。</p>
          </article>

          <article className="belief-card">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" stroke="#ef4444" strokeWidth="1.5" />
              <path d="M16 10v6l4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <h3>真實興趣</h3>
            <p>只有當創作者真正喜愛一個品牌，才會製作出打動觀眾的內容。我們讓創作者主動選擇，而非被動接單。</p>
          </article>

          <article className="belief-card">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 16h6l4-8 6 16 4-8h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3>可量化的影響力</h3>
            <p>每一次合作都應該有清晰的數據追蹤。品牌值得知道自己的預算帶來了什麼，創作者值得被公平衡量。</p>
          </article>
        </div>
      </section>

      <section className="mission-section">
        <div className="mission-inner">
          <p className="eyebrow">我們的使命</p>
          <h2>讓亞洲每一個優質品牌，都能找到真正熱愛它的創作者。</h2>
          <p>
            SOON 是一個雙邊平台，為品牌提供直接觸達創作者的渠道，為創作者提供主動發現品牌合作的機會。我們的目標，是讓香港、台灣、中國大陸及新加坡的品牌與創作者生態，變得更加公平、透明、高效。
          </p>
        </div>
      </section>

      <section className="cta-section">
        <h2>加入我們正在建立的生態</h2>
        <p>無論你是品牌還是創作者，SOON 為你而建。</p>
        <div className="cta-actions">
          <Link className="primary-cta" href="/signup">
            品牌免費試用
          </Link>
          <Link className="secondary-cta" href="#">
            我是創作者 →
          </Link>
        </div>
        <small>無需信用卡 · 免費試用七天 · 隨時取消</small>
      </section>

      <footer className="about-footer">
        <span>SOON Creator Network</span>
        <span>關於我們</span>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .about-page {
              min-height: 100vh;
              background: transparent;
              color: #ffffff;
              font-family:
                "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
            }

            .story-section,
            .manifesto-section,
            .belief-section,
            .mission-section,
            .cta-section,
            .about-footer {
              position: relative;
              z-index: 1;
            }

            .story-section {
              max-width: 768px;
              margin: 0 auto;
              padding: 160px 32px 80px;
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

            .story-section h1 {
              margin: 0 0 32px;
              color: #ffffff;
              font-size: clamp(40px, 5vw, 72px);
              line-height: 1.12;
              font-weight: 950;
              letter-spacing: 0;
            }

            .story-section p {
              margin: 0 0 24px;
              color: #a1a1aa;
              font-size: 18px;
              line-height: 1.9;
              font-weight: 620;
            }

            .story-section p:last-child {
              margin-bottom: 0;
            }

            .manifesto-section {
              padding: 128px 32px;
              background: transparent;
            }

            .manifesto-inner {
              max-width: 896px;
              margin: 0 auto;
              text-align: center;
            }

            .manifesto-inner h2 {
              margin: 0;
              color: #ffffff;
              font-size: clamp(36px, 5vw, 64px);
              line-height: 1.12;
              font-weight: 950;
              letter-spacing: 0;
            }

            .manifesto-inner h2 span {
              display: inline-block;
              margin-top: 16px;
            }

            .divider {
              width: min(320px, 72vw);
              height: 1px;
              margin: 48px auto;
              background: rgba(255, 255, 255, 0.12);
            }

            .manifesto-inner p {
              max-width: 672px;
              margin: 0 auto;
              color: #a1a1aa;
              font-size: 20px;
              line-height: 1.8;
              font-weight: 640;
            }

            .belief-section {
              max-width: 1024px;
              margin: 0 auto;
              padding: 96px 32px;
            }

            .section-heading {
              margin: 0 auto 64px;
              text-align: center;
            }

            .section-heading h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: 36px;
              line-height: 1.12;
              font-weight: 950;
            }

            .section-heading p {
              margin: 0;
              color: #a1a1aa;
              font-size: 16px;
              line-height: 1.7;
              font-weight: 650;
            }

            .belief-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 32px;
            }

            .belief-card {
              padding: 32px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.04);
            }

            .belief-card h3 {
              margin: 16px 0 12px;
              color: #ffffff;
              font-size: 18px;
              line-height: 1.25;
              font-weight: 900;
            }

            .belief-card p {
              margin: 0;
              color: #a1a1aa;
              font-size: 14px;
              line-height: 1.8;
              font-weight: 620;
            }

            .mission-section {
              padding: 96px 32px;
              background: rgba(255, 255, 255, 0.02);
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            .mission-inner {
              max-width: 768px;
              margin: 0 auto;
              text-align: center;
            }

            .mission-inner h2 {
              margin: 0 0 32px;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 52px);
              line-height: 1.16;
              font-weight: 950;
              letter-spacing: 0;
            }

            .mission-inner p:not(.eyebrow) {
              margin: 0;
              color: #a1a1aa;
              font-size: 17px;
              line-height: 1.9;
              font-weight: 640;
            }

            .cta-section {
              padding: 96px 32px;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .cta-section h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 52px);
              line-height: 1.12;
              font-weight: 950;
            }

            .cta-section p {
              margin: 0 0 40px;
              color: #a1a1aa;
              font-size: 17px;
              line-height: 1.7;
              font-weight: 650;
            }

            .cta-actions {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              flex-wrap: wrap;
            }

            .primary-cta,
            .secondary-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              padding: 0 26px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 0.95rem;
              font-weight: 850;
              transition: transform 180ms ease;
            }

            .primary-cta {
              background: #ef4444;
              color: #ffffff;
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.32);
            }

            .secondary-cta {
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.66);
              background: rgba(255, 255, 255, 0.03);
            }

            .primary-cta:hover,
            .secondary-cta:hover {
              transform: translateY(-2px);
            }

            .cta-section small {
              display: block;
              margin-top: 24px;
              color: #71717a;
              font-size: 13px;
              font-weight: 700;
            }

            .about-footer {
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

            @media (max-width: 820px) {
              .belief-grid {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 640px) {
              .story-section {
                padding-top: 130px;
              }

              .cta-actions {
                align-items: stretch;
                flex-direction: column;
              }

              .primary-cta,
              .secondary-cta {
                width: 100%;
              }

              .about-footer {
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
