import Link from 'next/link'

import { pricingPlans } from '@/lib/pricing'

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '56px',
  padding: '0 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  background: '#ef3f2f',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 700,
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 16px 34px rgba(239, 63, 47, 0.32)',
} as const

const proofItems = [
  {
    value: '2.3x',
    title: '更快啟動宣傳',
    body: '由品牌需求到內容方向，減少反覆溝通與人手整理。',
  },
  {
    value: '87%',
    title: '更清楚配對創作者',
    body: '根據目標、內容風格與製作需要，整理更合適的創作者方向。',
  },
  {
    value: '99%',
    title: '減少人手規劃',
    body: '將策略、內容規劃、分鏡與交付流程集中在同一個工作台。',
  },
]

const contentTypes = ['社交內容', '創作者腳本', '影片題材', '宣傳策略', '分鏡規劃', '交付追蹤']

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero__image" />
        <div className="hero__overlay" />

        <div className="hero__content">
          <div className="rating">AI 策略 + 創作者配對 + 內容流程</div>
          <div className="hero__grid">
            <h1>
              將廣告費
              <br />
              變成回報
            </h1>
            <div className="hero__copy">
              <p>
                一個兼具品味、速度與策略的 AI 宣傳平台，將品牌方向變成內容，將市場洞察轉化為增長。
              </p>
              <Link href="/signup" style={primaryButtonStyle}>
                開始試用
              </Link>
            </div>
          </div>

          <div className="brand-row">
            <span>SOON 策略</span>
            <span>創作者網絡</span>
            <span>AI 腳本</span>
            <span>分鏡規劃</span>
            <span>製作流程</span>
          </div>
        </div>
      </section>

      <section className="growth">
        <h2>透過更有效的社交內容、影片與創作者合作，推動品牌更快增長。</h2>

        <div className="proof-grid">
          {proofItems.map((item) => (
            <section key={item.title} className="proof-card">
              <div className="proof-card__value">{item.value}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </section>
          ))}
        </div>

        <Link href="/signup" style={primaryButtonStyle}>
          開始 7 日試用
        </Link>
      </section>

      <section className="content-strip">
        <div className="content-strip__title">一個工作台，處理品牌下一步需要的內容。</div>
        <div className="content-types">
          {contentTypes.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <h2>選擇適合你的增長方式。</h2>
        <p className="pricing-subtitle">
          不是買一個工具，而是買一套讓宣傳費更有機會回本的決策流程。
        </p>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <section key={plan.id} className={plan.highlight ? 'pricing-card pricing-card--highlight' : 'pricing-card'}>
              <div className="pricing-card__label">{plan.label}</div>
              <h3>{plan.name}</h3>
              <div className="pricing-card__price">
                <span>{plan.price}</span>
                <small>{plan.cadence}</small>
              </div>
              <p className="pricing-card__credits">
                {plan.trialDays ? `${plan.trialDays} 日試用包含 ${plan.trialCredits} credits` : `每月 ${plan.monthlyCredits} credits 起`}
              </p>
              <Link href={plan.id === 'creator-campaign' ? '/contact' : `/signup?plan=${plan.id}`} className={plan.highlight ? 'pricing-card__button pricing-card__button--highlight' : 'pricing-card__button'}>
                {plan.cta}
              </Link>
              <div className="pricing-card__features">
                {plan.features.map((feature) => (
                  <div key={feature}>✓ {feature}</div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .home {
              min-height: 100vh;
              background: #08090b;
              color: #ffffff;
            }

            .hero {
              position: relative;
              min-height: 100svh;
              overflow: hidden;
              display: flex;
              align-items: flex-end;
            }

            .hero__image {
              position: absolute;
              inset: 0;
              background-image: url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=86');
              background-size: cover;
              background-position: center;
              transform: scale(1.02);
            }

            .hero__overlay {
              position: absolute;
              inset: 0;
              background:
                linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.42) 48%, rgba(0,0,0,0.18) 100%),
                linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.74) 88%);
            }

            .hero__content {
              position: relative;
              z-index: 1;
              width: min(1180px, calc(100% - 48px));
              margin: 0 auto;
              padding: 170px 0 42px;
            }

            .rating {
              width: fit-content;
              margin-bottom: 34px;
              color: rgba(255,255,255,0.86);
              font-size: 15px;
              font-weight: 700;
            }

            .hero__grid {
              display: grid;
              grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
              gap: 44px;
              align-items: end;
            }

            h1 {
              margin: 0;
              max-width: 760px;
              font-size: clamp(4rem, 8.4vw, 8.4rem);
              line-height: 0.94;
              letter-spacing: -0.055em;
              font-weight: 500;
            }

            .hero__copy {
              display: grid;
              gap: 28px;
              justify-items: start;
              padding-bottom: 8px;
            }

            .hero__copy p {
              margin: 0;
              max-width: 460px;
              color: rgba(255,255,255,0.92);
              font-size: clamp(1.25rem, 2vw, 1.72rem);
              line-height: 1.28;
              letter-spacing: -0.03em;
            }

            .brand-row {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 18px;
              margin-top: 72px;
              color: rgba(255,255,255,0.72);
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }

            .brand-row span {
              min-width: 0;
              text-align: center;
            }

            .growth {
              min-height: 92vh;
              padding: 118px 24px;
              background: #08090b;
              display: grid;
              justify-items: center;
              align-content: center;
              gap: 72px;
            }

            .growth h2,
            .pricing-section h2 {
              margin: 0;
              max-width: 980px;
              text-align: center;
              font-size: clamp(3rem, 5.4vw, 6rem);
              line-height: 1.04;
              letter-spacing: -0.055em;
              font-weight: 500;
            }

            .proof-grid {
              width: min(1100px, 100%);
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 80px;
            }

            .proof-card {
              color: #ffffff;
            }

            .proof-card__value {
              font-size: clamp(4.5rem, 7vw, 7rem);
              line-height: 0.9;
              letter-spacing: -0.07em;
              margin-bottom: 24px;
            }

            .proof-card h3 {
              margin: 0 0 14px;
              font-size: 1.55rem;
              letter-spacing: -0.04em;
              font-weight: 500;
            }

            .proof-card p {
              margin: 0;
              color: rgba(255,255,255,0.62);
              font-size: 1.08rem;
              line-height: 1.45;
              max-width: 300px;
            }

            .pricing-section {
              padding: 118px 24px;
              background: #08090b;
              display: grid;
              justify-items: center;
              gap: 34px;
            }

            .pricing-subtitle {
              margin: 0 0 36px;
              max-width: 760px;
              text-align: center;
              color: rgba(255,255,255,0.72);
              font-size: clamp(1.15rem, 1.7vw, 1.5rem);
              line-height: 1.55;
              letter-spacing: -0.02em;
            }

            .pricing-grid {
              width: min(1100px, 100%);
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 18px;
            }

            .pricing-card {
              min-height: 520px;
              padding: 30px;
              border-radius: 10px;
              border: 1px solid rgba(255,255,255,0.12);
              background: #1b1b1d;
              display: flex;
              flex-direction: column;
              color: #ffffff;
            }

            .pricing-card--highlight {
              background: #2b2b2e;
              border-color: rgba(239,63,47,0.6);
            }

            .pricing-card__label {
              width: fit-content;
              margin-left: auto;
              margin-bottom: 22px;
              padding: 8px 12px;
              border-radius: 6px;
              background: rgba(255,255,255,0.08);
              color: rgba(255,255,255,0.82);
              font-size: 14px;
              font-weight: 700;
            }

            .pricing-card h3 {
              margin: 0 0 18px;
              font-size: 1.8rem;
              letter-spacing: -0.04em;
              font-weight: 500;
            }

            .pricing-card__price {
              display: flex;
              align-items: baseline;
              gap: 8px;
              margin-bottom: 30px;
            }

            .pricing-card__price span {
              font-size: clamp(3.2rem, 5vw, 4.6rem);
              line-height: 0.9;
              letter-spacing: -0.07em;
            }

            .pricing-card__price small {
              color: rgba(255,255,255,0.7);
              font-size: 1.25rem;
            }

            .pricing-card__credits {
              margin: -16px 0 24px;
              color: rgba(255,255,255,0.7);
              font-size: 0.98rem;
              line-height: 1.45;
            }

            .pricing-card__button {
              min-height: 56px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              background: rgba(255,255,255,0.08);
              color: #ffffff;
              text-decoration: none;
              font-weight: 800;
              margin-bottom: 34px;
            }

            .pricing-card__button--highlight {
              background: #ef3f2f;
              box-shadow: 0 16px 34px rgba(239,63,47,0.32);
            }

            .pricing-card__features {
              display: grid;
              gap: 16px;
              color: rgba(255,255,255,0.82);
              font-size: 1.04rem;
              line-height: 1.55;
            }

            .content-strip {
              padding: 92px 24px 120px;
              background: #f5efe5;
              color: #111111;
              display: grid;
              justify-items: center;
              gap: 28px;
            }

            .content-strip__title {
              max-width: 780px;
              text-align: center;
              font-size: clamp(2.3rem, 4vw, 4.5rem);
              line-height: 1.05;
              letter-spacing: -0.055em;
              font-weight: 500;
            }

            .content-types {
              width: min(960px, 100%);
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 12px;
            }

            .content-types span {
              border: 1px solid rgba(17,17,17,0.12);
              border-radius: 999px;
              padding: 12px 16px;
              background: #ffffff;
              color: #26221f;
              font-size: 15px;
            }

            @media (max-width: 900px) {
              .hero__content {
                width: min(100% - 32px, 1180px);
                padding-top: 150px;
              }

              .hero__grid {
                grid-template-columns: 1fr;
                gap: 28px;
              }

              .brand-row {
                grid-template-columns: repeat(2, 1fr);
                margin-top: 46px;
                gap: 14px;
              }

              .brand-row span {
                text-align: left;
              }

              .proof-grid,
              .pricing-grid {
                grid-template-columns: 1fr;
              }

              .proof-grid {
                gap: 44px;
              }

              .pricing-grid {
                gap: 18px;
              }

              .growth {
                padding: 86px 20px;
                gap: 52px;
              }
            }

            @media (max-width: 560px) {
              .hero {
                min-height: 94svh;
              }

              .rating {
                font-size: 13px;
              }

              .brand-row {
                display: none;
              }

              h1 {
                font-size: clamp(3.35rem, 18vw, 5rem);
              }
            }
          `,
        }}
      />
    </main>
  )
}
