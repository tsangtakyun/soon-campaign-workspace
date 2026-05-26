'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type BillingCycle = 'monthly' | 'annual'

const brandPlans = [
  {
    name: '免費試用',
    monthly: 'HK$0',
    annual: 'HK$0',
    suffix: '/7天',
    features: ['上架 1 個 PR Gift Campaign', '接收最多 10 個 KOL 申請', '基本申請管理', '無需信用卡'],
    cta: '立即免費開始',
    href: '/signup',
    variant: 'outline',
  },
  {
    name: 'Starter',
    monthly: 'HK$388',
    annual: 'HK$310',
    suffix: '/月',
    features: ['最多 3 個同時進行 Campaign', '無限 KOL 申請接收', '申請審核與管理', '基本數據分析', '電郵支援'],
    cta: '開始試用七天',
    href: '/signup',
    variant: 'outline',
  },
  {
    name: 'Growth',
    monthly: 'HK$788',
    annual: 'HK$630',
    suffix: '/月',
    badge: '最受歡迎',
    features: [
      '無限 Campaign 上架',
      '無限 KOL 申請接收',
      '優先申請排序',
      '進階數據分析報告',
      '多平台支援（IG / 小紅書 / TikTok / YouTube）',
      '專屬客戶支援',
    ],
    cta: '開始試用七天',
    href: '/signup',
    variant: 'solid',
  },
  {
    name: 'Enterprise',
    enterprise: true,
    features: ['無限 Campaign 與申請', '專屬客戶經理', '白標方案可選', 'API 接入', '優先技術支援', '自訂合約條款'],
    cta: '聯絡我們',
    href: '/contact',
    variant: 'outline',
  },
]

const kolFeatures = [
  '瀏覽所有開放 Campaign',
  '主動申請感興趣的品牌',
  '支援 IG / 小紅書 / TikTok / YouTube',
  '亞洲市場優先',
]

const faqs = [
  {
    question: '免費試用需要信用卡嗎？',
    answer: '不需要。免費試用七天，無需提供任何付款資料。試用期結束後，您可以選擇升級至付費計劃或停止使用。',
  },
  {
    question: '試用期結束後會自動收費嗎？',
    answer: '不會。SOON 不會在未經確認的情況下自動扣款。試用期結束後，您需要主動選擇並確認訂閱計劃。',
  },
  {
    question: 'KOL 申請合作需要付費嗎？',
    answer: '創作者可免費加入 SOON 平台；創作工具按需付費。品牌發布 Campaign 並接收 KOL 申請，按品牌計劃收費。',
  },
  {
    question: '年付方案如何計算？',
    answer: '年付方案較月付節省 20%。Starter 年付為每月 HK$310（即每年 HK$3,720），Growth 年付為每月 HK$630（即每年 HK$7,560）。',
  },
  {
    question: '支援哪些社交平台？',
    answer: '目前支援 Instagram、小紅書、TikTok 及 YouTube。我們持續擴展平台支援，包括 Threads、微博及抖音。',
  },
  {
    question: '如需企業方案，如何聯絡？',
    answer: '請點擊「聯絡我們」，我們的團隊將在一個工作天內回覆，為您提供度身訂製的方案。',
  },
]

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ display: 'inline', marginRight: '8px', flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.2" />
      <path d="M5 8l2 2 4-4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [openFaq, setOpenFaq] = useState(0)

  useEffect(() => {
    const canvas = document.getElementById('pricing-starfield') as HTMLCanvasElement
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
    <main className="pricing-page">
      <canvas
        id="pricing-starfield"
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
        <p className="eyebrow">SOON · 定價方案</p>
        <h1>簡單透明的定價</h1>
        <p>品牌按需付費，創作者免費入台</p>

        <div className="billing-toggle" aria-label="付款週期">
          <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')} type="button">
            月付
          </button>
          <button className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')} type="button">
            年付 <span>省 20%</span>
          </button>
        </div>
      </section>

      <section className="plans-section">
        <p className="section-label">品牌方案 · Brand Plans</p>
        <div className="plans-grid">
          {brandPlans.map((plan) => {
            const price = billing === 'annual' ? plan.annual : plan.monthly
            const isGrowth = plan.name === 'Growth'
            return (
              <article className={`plan-card ${isGrowth ? 'featured' : ''}`} key={plan.name}>
                {plan.badge ? <div className="plan-badge">{plan.badge}</div> : null}
                <h2>{plan.name}</h2>
                {plan.enterprise ? (
                  <div className="enterprise-price">
                    <strong>度身訂製</strong>
                    <span>按業務規模定價</span>
                  </div>
                ) : (
                  <div className="price-block">
                    <strong>{price}</strong>
                    <span>{plan.suffix}</span>
                    {billing === 'annual' && plan.name !== '免費試用' ? <small>每年繳付</small> : null}
                  </div>
                )}
                <div className="plan-divider" />
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link className={`plan-cta ${plan.variant === 'solid' ? 'solid' : ''}`} href={plan.href}>
                  {plan.cta}
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="kol-section">
        <div className="kol-card">
          <p className="gold-label">創作者方案</p>
          <h2>創作者免費加入</h2>
          <p>免費入台，主動發現品牌合作機會。新用戶獲贈 300 Credits 立即使用創作工具。</p>
          <div className="kol-features">
            {kolFeatures.map((feature) => (
              <span key={feature}>
                <CheckIcon />
                {feature}
              </span>
            ))}
          </div>
          <Link className="creator-cta" href="https://egg.sooncreator.network" target="_blank">
            以創作者身份加入
          </Link>
        </div>
      </section>

      <section className="faq-section">
        <h2>常見問題</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <article className="faq-item" key={faq.question}>
                <button onClick={() => setOpenFaq(isOpen ? -1 : index)} type="button">
                  <span>{faq.question}</span>
                  <em>{isOpen ? '-' : '+'}</em>
                </button>
                {isOpen ? <p>{faq.answer}</p> : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="final-cta">
        <h2>準備好開始了嗎？</h2>
        <p>七天免費試用，無需信用卡，隨時取消。</p>
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

      <footer className="pricing-footer">
        <span>SOON Creator Network</span>
        <span>定價方案</span>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pricing-page {
              min-height: 100vh;
              background: transparent;
              color: #ffffff;
              font-family:
                "SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded,
                "Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
            }

            .hero-section,
            .plans-section,
            .kol-section,
            .faq-section,
            .final-cta,
            .pricing-footer {
              position: relative;
              z-index: 1;
            }

            .hero-section {
              max-width: 768px;
              margin: 0 auto;
              padding: 160px 32px 64px;
              text-align: center;
            }

            .eyebrow,
            .gold-label {
              margin: 0 0 24px;
              color: #D4AF37;
              font-size: 12px;
              font-weight: 850;
              letter-spacing: 0.16em;
              text-transform: uppercase;
            }

            .hero-section h1 {
              margin: 0 0 24px;
              color: #ffffff;
              font-size: clamp(40px, 5vw, 68px);
              line-height: 1.1;
              font-weight: 950;
              letter-spacing: 0;
            }

            .hero-section > p:not(.eyebrow) {
              margin: 0 0 48px;
              color: #a1a1aa;
              font-size: 18px;
              line-height: 1.8;
              font-weight: 650;
            }

            .billing-toggle {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px;
              border-radius: 999px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.05);
            }

            .billing-toggle button {
              border: 0;
              border-radius: 999px;
              padding: 10px 18px;
              background: transparent;
              color: #a1a1aa;
              cursor: pointer;
              font-size: 14px;
              font-weight: 800;
            }

            .billing-toggle button.active {
              background: #ffffff;
              color: #0a0a0a;
            }

            .billing-toggle span {
              margin-left: 6px;
              color: #ef4444;
              font-size: 12px;
              font-weight: 950;
            }

            .plans-section {
              max-width: 1180px;
              margin: 0 auto;
              padding: 64px 32px;
            }

            .section-label {
              margin: 0 0 40px;
              color: #a1a1aa;
              font-size: 14px;
              text-align: center;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-weight: 800;
            }

            .plans-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 24px;
            }

            .plan-card {
              position: relative;
              display: flex;
              flex-direction: column;
              min-height: 590px;
              padding: 32px;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.04);
            }

            .plan-card.featured {
              border: 1.5px solid #ef4444;
              box-shadow: 0 26px 80px rgba(239, 68, 68, 0.14);
            }

            .plan-badge {
              align-self: center;
              margin: -48px 0 20px;
              border-radius: 999px;
              padding: 4px 12px;
              background: #ef4444;
              color: #ffffff;
              font-size: 11px;
              font-weight: 950;
            }

            .plan-card h2 {
              margin: 0 0 20px;
              color: #ffffff;
              font-size: 20px;
              line-height: 1.2;
              font-weight: 900;
            }

            .price-block strong {
              color: #ffffff;
              font-size: 48px;
              line-height: 1;
              font-weight: 950;
              letter-spacing: -0.04em;
            }

            .price-block span {
              margin-left: 6px;
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 700;
            }

            .price-block small,
            .enterprise-price span {
              display: block;
              margin-top: 8px;
              color: #71717a;
              font-size: 12px;
              font-weight: 700;
            }

            .enterprise-price strong {
              display: block;
              margin: 8px 0;
              color: #ffffff;
              font-size: 32px;
              line-height: 1.1;
              font-weight: 950;
            }

            .plan-divider {
              height: 1px;
              margin: 28px 0;
              background: rgba(255, 255, 255, 0.08);
            }

            .plan-card ul {
              list-style: none;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              gap: 13px;
            }

            .plan-card li,
            .kol-features span {
              display: flex;
              align-items: flex-start;
              color: #d4d4d8;
              font-size: 14px;
              line-height: 1.65;
              font-weight: 650;
            }

            .plan-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              min-height: 48px;
              margin-top: auto;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.72);
              color: #ffffff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 850;
            }

            .plan-cta.solid {
              border-color: #ef4444;
              background: #ef4444;
              box-shadow: 0 18px 42px rgba(239, 68, 68, 0.28);
            }

            .kol-section {
              max-width: 896px;
              margin: 0 auto;
              padding: 64px 32px;
            }

            .kol-card {
              padding: 40px;
              border-radius: 16px;
              border: 1px solid rgba(212, 175, 55, 0.3);
              background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.03));
              text-align: center;
            }

            .kol-card h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: 32px;
              line-height: 1.15;
              font-weight: 950;
            }

            .kol-card > p:not(.gold-label) {
              max-width: 560px;
              margin: 0 auto 32px;
              color: #a1a1aa;
              font-size: 16px;
              line-height: 1.8;
              font-weight: 650;
            }

            .kol-features {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px 22px;
              max-width: 680px;
              margin: 0 auto 34px;
              text-align: left;
            }

            .creator-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              padding: 0 32px;
              border-radius: 8px;
              border: 1.5px solid #D4AF37;
              color: #D4AF37;
              text-decoration: none;
              font-size: 14px;
              font-weight: 850;
              background: transparent;
            }

            .creator-cta:hover {
              background: rgba(212, 175, 55, 0.1);
            }

            .faq-section {
              max-width: 768px;
              margin: 0 auto;
              padding: 96px 32px;
            }

            .faq-section h2 {
              margin: 0 0 48px;
              color: #ffffff;
              text-align: center;
              font-size: 32px;
              font-weight: 950;
            }

            .faq-item {
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              padding: 20px 0;
            }

            .faq-item button {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              width: 100%;
              padding: 0;
              border: 0;
              background: transparent;
              color: #ffffff;
              cursor: pointer;
              text-align: left;
              font-size: 16px;
              font-weight: 850;
            }

            .faq-item em {
              color: #ef4444;
              font-size: 24px;
              font-style: normal;
              line-height: 1;
            }

            .faq-item p {
              margin: 16px 0 0;
              color: #a1a1aa;
              font-size: 15px;
              line-height: 1.8;
              font-weight: 620;
            }

            .final-cta {
              padding: 96px 32px;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .final-cta h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 48px);
              line-height: 1.12;
              font-weight: 950;
            }

            .final-cta p {
              margin: 0 0 40px;
              color: #a1a1aa;
              font-size: 17px;
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

            .final-cta small {
              display: block;
              margin-top: 24px;
              color: #71717a;
              font-size: 13px;
              font-weight: 700;
            }

            .pricing-footer {
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

            @media (max-width: 1120px) {
              .plans-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }

            @media (max-width: 720px) {
              .plans-grid,
              .kol-features {
                grid-template-columns: 1fr;
              }

              .plan-card {
                min-height: auto;
              }

              .cta-actions {
                align-items: stretch;
                flex-direction: column;
              }

              .primary-cta,
              .secondary-cta {
                width: 100%;
              }

              .pricing-footer {
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
