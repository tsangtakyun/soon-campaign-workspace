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

const heroVideoPriorityProps = {
  fetchPriority: 'high',
} as const

const platformIcons = [
  {
    label: 'Instagram',
    svg: `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><defs><radialGradient id="instagram-gradient-home" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instagram-gradient-home)"/><circle cx="12" cy="12" r="4.5" stroke="#fff" stroke-width="1.8" fill="none"/><circle cx="17.4" cy="6.6" r="1.25" fill="#fff"/></svg>`,
  },
  {
    label: 'Facebook',
    svg: `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M13.2 18v-5.25h1.77l.27-2.04H13.2V9.4c0-.59.16-.99 1.01-.99h1.08V6.59c-.19-.03-.83-.08-1.58-.08-1.56 0-2.63.95-2.63 2.7v1.5H9.31v2.04h1.77V18h2.12Z" fill="#fff"/></svg>`,
  },
  {
    label: 'Threads',
    svg: `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M15.9 11.5c-.2-2.4-1.5-3.9-3.7-3.9-1.6 0-2.8.7-3.6 1.9l1.6 1.1c.5-.7 1.1-1.1 2-1.1 1 0 1.6.6 1.8 1.7-.5-.1-1.1-.1-1.6-.1-2.4 0-3.9 1.2-3.9 2.9 0 1.7 1.4 2.9 3.4 2.9 1.8 0 3.1-.9 3.7-2.4.8.5 1.2 1.1 1.2 1.8 0 1.9-1.9 3.2-4.7 3.2-3.2 0-5.2-2.1-5.2-5.4 0-3.5 2.1-5.6 5.2-5.6 2.1 0 3.6.8 4.6 2.5l1.7-1.2c-1.3-2.1-3.4-3.3-6.3-3.3C7.8 6.5 5 9.4 5 14.1c0 4.5 2.8 7.4 7.1 7.4 3.9 0 6.6-2.1 6.6-5.1 0-2.1-1.3-3.7-2.8-4.9Zm-4 3.5c-.8 0-1.4-.4-1.4-1 0-.7.7-1.1 1.8-1.1.6 0 1.1.1 1.7.2-.3 1.1-1 1.9-2.1 1.9Z" fill="#000"/></svg>`,
  },
  {
    label: 'YouTube',
    svg: `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="#FF0000"/><path d="M10.2 9.1v5.8l5-2.9-5-2.9Z" fill="#fff"/></svg>`,
  },
]

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          {...heroVideoPriorityProps}
        >
          <source
            src="https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/soon_website.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero__overlay" />

        <div className="hero__content">
          <div className="hero__text">
            <div className="rating">廣告策略 + 創作內容流程</div>
            <h1>
              是時候
              <br />
              自己做廣告
            </h1>
            <p className="hero__subtitle">
              SOON 制定你的策略 創造你的內容
              <br />
              由策略、內容到發布，一個工作台完成——每月 HK$799 起
            </p>
            <div className="hero__actions">
              <Link href="/signup" className="hero__cta hero__cta--primary">
                立即免費試用
              </Link>
              <Link href="/login" className="hero__cta hero__cta--login">
                客戶登入
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-bar" aria-label="支援發布平台">
        <div className="platform-bar__inner">
          <span className="platform-bar__label">支援發布至</span>
          <div className="platform-bar__icons">
            {platformIcons.map((icon) => (
              <span
                key={icon.label}
                className="platform-icon"
                aria-label={icon.label}
                dangerouslySetInnerHTML={{ __html: icon.svg }}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="product-preview">
        <div className="product-preview__header">
          <span>產品預覽</span>
          <h2>一個工作台，從策略到發布</h2>
          <p>管理所有社交平台，AI 生成內容，一鍵排程發布。</p>
        </div>

        <div className="workspace-mockup" aria-label="Campaign Workspace dashboard preview">
          <aside className="mockup-sidebar">
            <div className="mockup-logo">S</div>
            {['首頁', '日曆', '宣傳活動', '整合', '品牌素材庫'].map((item, index) => (
              <div key={item} className={index === 1 ? 'mockup-nav-item active' : 'mockup-nav-item'}>
                <span />
                {item}
              </div>
            ))}
          </aside>
          <div className="mockup-main">
            <div className="mockup-topbar">
              <div>
                <p>Campaign Workspace</p>
                <h3>差點沒拍下來的片段</h3>
              </div>
              <button type="button">排程發布</button>
            </div>
            <div className="mockup-content">
              <article className="mockup-campaign-card">
                <div className="mockup-card-meta">
                  <div className="mockup-platforms">
                    <span className="mockup-ig">IG</span>
                    <span className="mockup-fb">f</span>
                  </div>
                  <span>今天 10:00</span>
                </div>
                <h4>AI 已為你準備好下一篇內容</h4>
                <p>最細小的片段，往往承載最真實的感覺。把普通一刻整理成可發布的社交內容。</p>
                <div className="mockup-image" />
              </article>
              <div className="mockup-panel">
                <h4>快速操作</h4>
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>
        </div>

        <Link href="/signup" className="product-preview__cta">
          立即免費試用
        </Link>
      </section>

      <section id="features" className="growth">
        <h2>
          更有效的內容
          <br />
          更快的品牌增長
        </h2>

        <div className="proof-grid">
          {proofItems.map((item) => (
            <section key={item.title} className="proof-card">
              <div className="proof-card__value">{item.value}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </section>
          ))}
        </div>

        <Link href="/signup" className="growth__cta" style={primaryButtonStyle}>
          開始 7 日試用
        </Link>
      </section>

      <section id="about" className="content-strip">
        <div className="content-strip__title">一個工作台，處理品牌所需的一切內容。</div>
        <div className="content-types">
          {contentTypes.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <h2>選擇適合你的增長方式</h2>
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
              align-items: center;
            }

            .hero__video {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .hero__overlay {
              position: absolute;
              inset: 0;
              background: rgba(0,0,0,0.5);
            }

            .hero__content {
              position: relative;
              z-index: 10;
              width: min(1180px, calc(100% - 48px));
              margin: 0 auto;
              padding: 150px 0 72px;
              display: flex;
              justify-content: flex-end;
            }

            .rating {
              margin: 0 0 18px auto;
              color: rgba(255,255,255,0.86);
              font-size: 0.82rem;
              font-weight: 400;
              letter-spacing: 0.16em;
              text-transform: uppercase;
            }

            h1 {
              margin: 0;
              font-size: clamp(4.2rem, 8vw, 7.4rem);
              line-height: 0.96;
              letter-spacing: -0.04em;
              font-weight: 800;
              color: #ffffff;
            }

            .hero__text {
              width: min(50%, 650px);
              margin-left: auto;
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }

            .hero__subtitle {
              margin: 28px 0 30px;
              max-width: 560px;
              color: rgba(255,255,255,0.92);
              font-size: clamp(1rem, 1.45vw, 1.2rem);
              line-height: 1.58;
              letter-spacing: 0;
            }

            .hero__actions {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 14px;
              flex-wrap: wrap;
            }

            .hero__cta {
              min-height: 54px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 0 24px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 16px;
              font-weight: 800;
              transition: transform 160ms ease, box-shadow 160ms ease;
            }

            .hero__cta:hover {
              transform: translateY(-1px);
            }

            .hero__cta--primary {
              background: #ef4444;
              color: #ffffff;
              box-shadow: 0 16px 34px rgba(239, 68, 68, 0.34);
            }

            .hero__cta--login {
              background: #ffd337;
              color: #1f1600;
              box-shadow: 0 16px 34px rgba(255, 211, 55, 0.28);
            }

            .platform-bar {
              min-height: 80px;
              background: #08090b;
              border-top: 1px solid rgba(255,255,255,0.1);
              border-bottom: 1px solid rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 24px;
            }

            .platform-bar__inner {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 28px;
              color: #ffffff;
            }

            .platform-bar__label {
              color: rgba(255,255,255,0.62);
              font-size: 0.9rem;
              font-weight: 650;
              letter-spacing: 0.08em;
              white-space: nowrap;
            }

            .platform-bar__icons {
              display: flex;
              align-items: center;
              gap: 24px;
            }

            .platform-icon,
            .platform-icon svg {
              display: block;
              width: 28px;
              height: 28px;
            }

            .product-preview {
              background: #08090b;
              padding: 112px 24px 118px;
              display: grid;
              justify-items: center;
              gap: 34px;
              border-bottom: 1px solid rgba(255,255,255,0.08);
            }

            .product-preview__header {
              display: grid;
              justify-items: center;
              gap: 12px;
              text-align: center;
            }

            .product-preview__header span {
              color: rgba(255,255,255,0.58);
              font-size: 0.82rem;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }

            .product-preview__header h2 {
              margin: 0;
              color: #ffffff;
              font-size: clamp(2.5rem, 4.4vw, 4.8rem);
              line-height: 1.06;
              letter-spacing: -0.045em;
              font-weight: 700;
            }

            .product-preview__header p {
              margin: 0;
              color: rgba(255,255,255,0.7);
              font-size: clamp(1rem, 1.5vw, 1.2rem);
              line-height: 1.55;
            }

            .workspace-mockup {
              width: min(1080px, 100%);
              min-height: 560px;
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 24px;
              background: #101114;
              box-shadow: 0 34px 90px rgba(0,0,0,0.42);
              padding: 14px;
              display: grid;
              grid-template-columns: 220px 1fr;
              gap: 14px;
              overflow: hidden;
            }

            .mockup-sidebar,
            .mockup-main {
              border: 1px solid rgba(255,255,255,0.08);
              background: #f5f6f8;
              color: #1b1d22;
            }

            .mockup-sidebar {
              border-radius: 16px;
              padding: 18px 14px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .mockup-logo {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              background: #ffd633;
              color: #111111;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              margin-bottom: 18px;
            }

            .mockup-nav-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 12px;
              border-radius: 10px;
              color: #747983;
              font-size: 0.9rem;
              font-weight: 700;
            }

            .mockup-nav-item.active {
              background: #e8e9ed;
              color: #1d1f24;
            }

            .mockup-nav-item span {
              width: 13px;
              height: 13px;
              border-radius: 4px;
              border: 2px solid currentColor;
              opacity: 0.62;
            }

            .mockup-main {
              border-radius: 16px;
              overflow: hidden;
              display: grid;
              grid-template-rows: auto 1fr;
            }

            .mockup-topbar {
              min-height: 82px;
              padding: 18px 22px;
              border-bottom: 1px solid #e3e5e9;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              background: #ffffff;
            }

            .mockup-topbar p,
            .mockup-topbar h3 {
              margin: 0;
            }

            .mockup-topbar p {
              color: #8a8f99;
              font-size: 0.78rem;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .mockup-topbar h3 {
              color: #17191d;
              font-size: 1.45rem;
              letter-spacing: -0.03em;
            }

            .mockup-topbar button {
              border: 0;
              border-radius: 10px;
              background: #111111;
              color: #ffffff;
              padding: 10px 14px;
              font: inherit;
              font-size: 0.9rem;
              font-weight: 700;
            }

            .mockup-content {
              padding: 30px;
              display: grid;
              grid-template-columns: minmax(0, 1fr) 240px;
              gap: 22px;
              align-items: start;
            }

            .mockup-campaign-card,
            .mockup-panel {
              background: #ffffff;
              border: 1px solid #e4e6eb;
              border-radius: 18px;
              box-shadow: 0 14px 34px rgba(23,25,29,0.08);
            }

            .mockup-campaign-card {
              padding: 22px;
              display: grid;
              gap: 16px;
            }

            .mockup-card-meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              color: #757b86;
              font-size: 0.85rem;
              font-weight: 700;
            }

            .mockup-platforms {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .mockup-platforms span {
              width: 30px;
              height: 30px;
              border-radius: 999px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 0.72rem;
              font-weight: 800;
            }

            .mockup-ig {
              background: linear-gradient(135deg, #fdf497, #fd5949 38%, #d6249f 68%, #285AEB);
            }

            .mockup-fb {
              background: #1877f2;
            }

            .mockup-campaign-card h4 {
              margin: 0;
              color: #17191d;
              font-size: clamp(1.4rem, 2.2vw, 2.2rem);
              line-height: 1.12;
              letter-spacing: -0.04em;
            }

            .mockup-campaign-card p {
              margin: 0;
              max-width: 560px;
              color: #646a75;
              font-size: 1rem;
              line-height: 1.55;
            }

            .mockup-image {
              min-height: 190px;
              border-radius: 14px;
              background-color: #e3d0bd;
              background-image:
                radial-gradient(circle at 32% 28%, #d6a05d 0 10%, transparent 12%),
                radial-gradient(circle at 58% 44%, #6f412b 0 12%, transparent 14%),
                linear-gradient(135deg, #f0d9bd, #8b5c40 48%, #2a1f1b);
            }

            .mockup-panel {
              padding: 20px;
              display: grid;
              gap: 14px;
            }

            .mockup-panel h4 {
              margin: 0;
              color: #17191d;
              font-size: 1rem;
            }

            .mockup-panel div {
              height: 42px;
              border-radius: 12px;
              background: #eef0f4;
            }

            .product-preview__cta {
              min-height: 54px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 0 24px;
              border-radius: 8px;
              background: #ef4444;
              color: #ffffff;
              text-decoration: none;
              font-size: 16px;
              font-weight: 800;
              box-shadow: 0 16px 34px rgba(239, 68, 68, 0.34);
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

            .growth h2 {
              margin: 0;
              max-width: 760px;
              text-align: center;
              font-size: clamp(2.75rem, 4.4vw, 4.8rem);
              line-height: 1.08;
              letter-spacing: -0.045em;
              font-weight: 650;
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
              margin-bottom: 34px;
            }

            .proof-card h3 {
              margin: 0 0 18px;
              font-size: 1.55rem;
              letter-spacing: -0.04em;
              font-weight: 500;
            }

            .proof-card p {
              margin: 0;
              color: rgba(255,255,255,0.62);
              font-size: clamp(1rem, 1.15vw, 1.16rem);
              line-height: 1.45;
              max-width: 300px;
            }

            .growth__cta {
              margin-top: 18px;
              justify-self: center;
            }

            .pricing-section {
              padding: 118px 24px;
              background: #08090b;
              display: grid;
              justify-items: center;
              gap: 34px;
            }

            .pricing-section h2 {
              margin: 0;
              max-width: 760px;
              text-align: center;
              font-size: clamp(2.7rem, 4.4vw, 4.8rem);
              line-height: 1.08;
              letter-spacing: -0.045em;
              font-weight: 650;
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
              max-width: 1280px;
              text-align: center;
              font-size: clamp(2.15rem, 3vw, 3.45rem);
              line-height: 1.12;
              letter-spacing: -0.035em;
              font-weight: 600;
              white-space: nowrap;
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

              .hero__text {
                width: min(100%, 620px);
              }

              .hero__actions {
                justify-content: flex-start;
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

              .content-strip__title {
                white-space: normal;
              }

              .workspace-mockup {
                grid-template-columns: 1fr;
              }

              .mockup-sidebar {
                display: none;
              }

              .mockup-content {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 560px) {
              .hero {
                min-height: 94svh;
              }

              .rating {
                font-size: 13px;
              }

              h1 {
                font-size: clamp(3.25rem, 16vw, 5rem);
              }

              .hero__actions {
                width: 100%;
              }

              .hero__cta {
                flex: 1 1 180px;
              }

              .platform-bar__inner {
                flex-direction: column;
                gap: 14px;
              }

              .platform-bar {
                min-height: 112px;
              }

              .product-preview {
                padding: 82px 18px 88px;
              }

              .workspace-mockup {
                padding: 8px;
                min-height: auto;
              }

              .mockup-topbar,
              .mockup-content {
                padding: 18px;
              }
            }
          `,
        }}
      />
    </main>
  )
}
