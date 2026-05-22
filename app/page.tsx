import Link from 'next/link'

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

const featureCards = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="11" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M9 14l3 3 7-7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '零中介費用',
    body: '品牌預算直接用於創作者合作，不再有中間人抽成。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4z" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M14 9v5l3 3" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: 'KOL 主動申請',
    body: '真實興趣帶來真實內容，創作者主動選擇品牌，效果自然更好。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="22" height="15" rx="2" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M3 11h22" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M8 16h4M16 16h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: 'AI 全自動經營',
    body: 'AI 制定策略、生成內容、排程發布，一個工作台管理所有社交平台。',
  },
]

const kolApplications = [
  {
    name: '陳曉彤',
    meta: 'IG 23.5K · 美妝',
    initial: '陳',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    status: '已申請',
    statusClass: 'green',
  },
  {
    name: '林思穎',
    meta: '小紅書 41K · 生活',
    initial: '林',
    gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
    status: '已申請',
    statusClass: 'green',
  },
  {
    name: '梁嘉欣',
    meta: 'TikTok 89K · 時尚',
    initial: '梁',
    gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
    status: '待審核',
    statusClass: 'amber',
  },
]

const stats = [
  { value: '1,247', label: '已促成 KOL 合作' },
  { value: 'HK$2.3M', label: '品牌節省中介費用' },
  { value: '89M', label: '覆蓋平台總觀看次數' },
  { value: '3,800+', label: '活躍創作者數目' },
]

const pricingPreview = [
  {
    name: '免費試用',
    price: 'HK$0',
    cadence: '/7天',
    body: '上架 1 個 Campaign，接收 10 個申請',
    cta: '立即開始',
    href: '/signup',
  },
  {
    name: 'Starter',
    price: 'HK$388',
    cadence: '/月',
    body: '最多 3 個 Campaign，無限申請',
    cta: '開始試用',
    href: '/signup?plan=starter',
  },
  {
    name: 'Growth',
    price: 'HK$788',
    cadence: '/月',
    body: '無限 Campaign，優先排序，進階數據',
    cta: '開始試用',
    href: '/signup?plan=growth',
    highlight: true,
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
            <p className="hero__eyebrow">SOON Creator Network</p>
            <h1>
              是時候讓品牌
              <br />
              自己說話
            </h1>
            <div className="hero__subtitle">
              <span className="hero__subtitle-main">相信 AI system</span>
              <span className="hero__subtitle-main">不再浪費金錢在中介身上</span>
              <span className="hero__subtitle-note">每月只需 HK$388 起 · 免費試用七天</span>
            </div>
            <div className="hero__actions">
              <Link href="/signup" className="button button--primary">
                立即免費試用
              </Link>
              <Link href="/match-for-you" className="button button--outline">
                了解 KOL 配對 →
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

      <section className="feature-strip" aria-label="SOON 核心功能">
        {featureCards.map((feature) => (
          <article className="feature-card" key={feature.title}>
            {feature.icon}
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="match-block">
        <div className="match-block__inner" style={{ alignItems: 'center' }}>
          <div>
            <p className="section-eyebrow">SOON 獨家功能</p>
            <h2>
              Match for You
              <br />
              創作者配對
            </h2>
            <p>
              品牌發布 Campaign 後，創作者主動申請合作。不需要主動尋找 KOL，讓 KOL 找你。支援 Instagram、小紅書、TikTok、YouTube。
            </p>
            <Link href="/match-for-you" className="text-link">
              了解 Match for You →
            </Link>
          </div>

          <div
            style={{
              position: 'relative',
              height: '400px',
              overflow: 'hidden',
              borderRadius: '16px',
            }}
          >
            <img
              src="/KOL/kol-hero.png"
              alt="KOL Creator"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                opacity: 0.6,
                display: 'block',
              }}
            />
          </div>
        </div>
      </section>

      <section className="product-preview">
        <div className="product-preview__header">
          <span>Campaign Workspace</span>
          <h2>
            一個工作台
            <br />
            從策略到發布
          </h2>
          <p>管理所有社交平台，AI 生成內容，一鍵排程發布。</p>
        </div>

        <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
          <img
            src="/dashboard-preview.png"
            alt="SOON Dashboard - 銀幸の美學 Ginkgo Beauty"
            className="w-full h-auto"
            style={{ display: 'block', maxWidth: '50%', margin: '0 auto' }}
          />
        </div>

        <Link href="/signup" className="button button--primary product-preview__cta">
          立即免費試用
        </Link>
      </section>

      <section className="stats-row" aria-label="SOON 平台數據">
        {stats.map((stat) => (
          <div className="stat-item" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="pricing-preview">
        <h2>簡單透明的定價</h2>
        <p>品牌按需付費，創作者永遠免費。</p>
        <div className="pricing-preview__grid">
          {pricingPreview.map((plan) => (
            <article className={plan.highlight ? 'mini-plan mini-plan--highlight' : 'mini-plan'} key={plan.name}>
              {plan.highlight ? <div className="mini-plan__badge">最受歡迎</div> : null}
              <h3>{plan.name}</h3>
              <div className="mini-plan__price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
              <p>{plan.body}</p>
              <Link href={plan.href} className={plan.highlight ? 'mini-plan__button mini-plan__button--solid' : 'mini-plan__button'}>
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
        <Link href="/pricing" className="pricing-preview__link">
          查看完整定價方案 →
        </Link>
      </section>

      <section className="final-cta">
        <h2>相信 AI system，不再浪費金錢在中介身上</h2>
        <p>每月 HK$388 起，讓 SOON 協助你經營社交內容與創作者合作。</p>
        <div className="final-cta__actions">
          <Link href="/signup" className="button button--primary">
            立即免費試用
          </Link>
          <Link href="/match-for-you" className="button button--outline">
            了解 KOL 配對 →
          </Link>
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
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .hero__overlay {
              position: absolute;
              inset: 0;
              background:
                linear-gradient(90deg, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.45) 48%, rgba(0, 0, 0, 0.18)),
                linear-gradient(0deg, rgba(8, 9, 11, 0.9), rgba(8, 9, 11, 0.1) 38%);
            }

            .hero__content {
              position: relative;
              z-index: 1;
              width: min(100% - 48px, 1180px);
              margin: 0 auto;
              padding-top: 94px;
            }

            .hero__text {
              width: min(100%, 50%);
              max-width: 42%;
              margin-left: auto;
              margin-right: 5%;
            }

            .hero__eyebrow,
            .section-eyebrow {
              margin: 0 0 16px;
              color: #a1a1aa;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            .section-eyebrow {
              color: #d4af37;
              font-size: 11px;
            }

            .hero h1 {
              margin: 0;
              max-width: 820px;
              font-size: clamp(38px, 5.5vw, 76px);
              line-height: 0.88;
              letter-spacing: -0.08em;
              font-weight: 720;
            }

            .hero__subtitle {
              display: grid;
              gap: 4px;
              margin: 22px 0 28px;
              max-width: 740px;
              letter-spacing: -0.02em;
              font-weight: 550;
            }

            .hero__subtitle-main {
              color: #ffffff;
              font-size: 14px;
              line-height: 1.55;
            }

            .hero__subtitle-note {
              color: #a1a1aa;
              font-size: 13px;
              line-height: 1.5;
            }

            .hero__actions,
            .final-cta__actions {
              display: flex;
              align-items: center;
              gap: 14px;
              flex-wrap: wrap;
            }

            .button {
              min-height: 56px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 0 24px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 16px;
              font-weight: 800;
              white-space: nowrap;
            }

            .hero__actions .button {
              min-height: 42px;
              padding: 0 16px;
              font-size: 13px;
            }

            .button--primary {
              border: 1px solid rgba(255,255,255,0.08);
              background: #ef4444;
              color: #ffffff;
              box-shadow: 0 16px 34px rgba(239, 68, 68, 0.32);
            }

            .button--outline {
              border: 1.5px solid rgba(255,255,255,0.5);
              background: transparent;
              color: #ffffff;
            }

            .platform-bar {
              min-height: 96px;
              background: #08090b;
              display: flex;
              align-items: center;
              justify-content: center;
              border-bottom: 1px solid rgba(255,255,255,0.08);
            }

            .platform-bar__inner {
              width: min(100% - 40px, 1120px);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 22px;
            }

            .platform-bar__label {
              color: rgba(255,255,255,0.58);
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .platform-bar__icons {
              display: flex;
              align-items: center;
              gap: 18px;
            }

            .platform-icon {
              display: inline-flex;
              width: 30px;
              height: 30px;
              opacity: 0.9;
            }

            .platform-icon svg {
              width: 100%;
              height: 100%;
            }

            .feature-strip {
              width: min(100% - 64px, 1024px);
              margin: 0 auto;
              padding: 64px 0;
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 24px;
            }

            .feature-card,
            .mini-plan {
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              background: rgba(255,255,255,0.04);
            }

            .feature-card {
              padding: 32px;
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

            .match-block {
              padding: 96px 32px;
              background: rgba(239,68,68,0.04);
              border-top: 1px solid rgba(239,68,68,0.12);
              border-bottom: 1px solid rgba(239,68,68,0.12);
            }

            .match-block__inner {
              width: min(100%, 1024px);
              margin: 0 auto;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items: center;
              gap: 64px;
            }

            .match-block h2 {
              margin: 0 0 24px;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 52px);
              line-height: 1.08;
              letter-spacing: -0.04em;
              font-weight: 950;
            }

            .match-block p {
              margin: 0 0 32px;
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 650;
              line-height: 1.9;
            }

            .text-link,
            .pricing-preview__link {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: #ef4444;
              text-decoration: none;
              font-size: 15px;
              font-weight: 850;
            }

            .application-feed {
              display: grid;
              gap: 12px;
            }

            .application-card {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 16px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(255,255,255,0.06);
            }

            .application-avatar {
              width: 32px;
              height: 32px;
              flex: 0 0 32px;
              border-radius: 999px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 12px;
              font-weight: 950;
            }

            .application-main {
              min-width: 0;
              flex: 1;
            }

            .application-main h3 {
              margin: 0;
              color: #ffffff;
              font-size: 13px;
              font-weight: 900;
            }

            .application-main p {
              margin: 4px 0 0;
              color: #a1a1aa;
              font-size: 11px;
              line-height: 1.2;
            }

            .application-status {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
              font-weight: 850;
              white-space: nowrap;
            }

            .application-status span {
              width: 6px;
              height: 6px;
              border-radius: 999px;
            }

            .application-status--green {
              color: #4ade80;
            }

            .application-status--green span {
              background: #4ade80;
            }

            .application-status--amber {
              color: #fbbf24;
            }

            .application-status--amber span {
              background: #fbbf24;
            }

            .feed-note {
              margin: 8px 0 0;
              color: #71717a;
              text-align: center;
              font-size: 12px;
              font-weight: 700;
            }

            .product-preview {
              padding: 108px 24px 96px;
              background: #08090b;
              display: grid;
              justify-items: center;
              gap: 34px;
            }

            .product-preview__header {
              display: grid;
              justify-items: center;
              gap: 12px;
              text-align: center;
            }

            .product-preview__header span {
              color: #d4af37;
              font-size: 12px;
              font-weight: 850;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            .product-preview__header h2 {
              margin: 0;
              max-width: 860px;
              font-size: clamp(2.8rem, 5vw, 5.5rem);
              line-height: 0.95;
              letter-spacing: -0.07em;
              font-weight: 650;
            }

            .product-preview__header p {
              margin: 0;
              color: rgba(255,255,255,0.68);
              font-size: clamp(1.1rem, 1.5vw, 1.38rem);
            }

            .workspace-mockup {
              width: min(1180px, 100%);
              min-height: 620px;
              padding: 12px;
              border-radius: 18px;
              border: 1px solid rgba(255,255,255,0.12);
              background: #101114;
              box-shadow: 0 34px 100px rgba(0,0,0,0.35);
              display: grid;
              grid-template-columns: 230px 1fr;
              overflow: hidden;
            }

            .mockup-sidebar {
              border-radius: 12px 0 0 12px;
              background: #0b0c0f;
              padding: 24px;
              display: grid;
              align-content: start;
              gap: 14px;
            }

            .mockup-logo {
              width: 38px;
              height: 38px;
              display: grid;
              place-items: center;
              border-radius: 10px;
              background: #ef4444;
              font-weight: 900;
              margin-bottom: 18px;
            }

            .mockup-nav-item {
              display: flex;
              align-items: center;
              gap: 10px;
              border-radius: 9px;
              padding: 12px;
              color: rgba(255,255,255,0.54);
              font-size: 14px;
              font-weight: 750;
            }

            .mockup-nav-item span {
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: rgba(255,255,255,0.18);
            }

            .mockup-nav-item.active {
              background: rgba(239,68,68,0.12);
              color: #ffffff;
            }

            .mockup-nav-item.active span {
              background: #ef4444;
            }

            .mockup-main {
              min-width: 0;
              border-radius: 0 12px 12px 0;
              background: #f5f6f8;
              color: #111111;
              overflow: hidden;
            }

            .mockup-topbar {
              padding: 26px 32px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid #e8e9ed;
            }

            .mockup-topbar p {
              margin: 0 0 5px;
              color: #6b7280;
              font-size: 13px;
              font-weight: 800;
            }

            .mockup-topbar h3 {
              margin: 0;
              font-size: clamp(1.4rem, 2vw, 2.2rem);
              letter-spacing: -0.04em;
            }

            .mockup-topbar button {
              border: 0;
              border-radius: 8px;
              background: #111111;
              color: #ffffff;
              padding: 13px 16px;
              font-weight: 800;
            }

            .mockup-content {
              padding: 32px;
              display: grid;
              grid-template-columns: minmax(0, 1fr) 260px;
              gap: 22px;
            }

            .mockup-campaign-card,
            .mockup-panel {
              border-radius: 14px;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              box-shadow: 0 18px 40px rgba(17, 24, 39, 0.08);
            }

            .mockup-campaign-card {
              padding: 24px;
            }

            .mockup-card-meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              color: #6b7280;
              font-size: 13px;
              font-weight: 800;
              margin-bottom: 28px;
            }

            .mockup-platforms {
              display: flex;
              gap: 8px;
            }

            .mockup-platforms span {
              width: 30px;
              height: 30px;
              display: grid;
              place-items: center;
              border-radius: 8px;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
            }

            .mockup-ig {
              background: linear-gradient(135deg, #fdf497, #fd5949 38%, #d6249f 68%, #285AEB);
            }

            .mockup-fb {
              background: #1877f2;
            }

            .mockup-campaign-card h4 {
              margin: 0 0 12px;
              font-size: clamp(1.6rem, 2.4vw, 2.8rem);
              line-height: 0.98;
              letter-spacing: -0.055em;
            }

            .mockup-campaign-card p {
              max-width: 620px;
              margin: 0 0 26px;
              color: #52525b;
              font-size: 1.05rem;
              line-height: 1.55;
            }

            .mockup-image {
              min-height: 230px;
              border-radius: 14px;
              background-color: #e3d0bd;
              background-image:
                radial-gradient(circle at 62% 35%, rgba(239,68,68,0.24), transparent 18%),
                linear-gradient(135deg, #f5e6d3, #d6b79c);
            }

            .mockup-panel {
              padding: 20px;
              display: grid;
              align-content: start;
              gap: 14px;
            }

            .mockup-panel h4 {
              margin: 0 0 10px;
              font-size: 1.1rem;
            }

            .mockup-panel div {
              height: 72px;
              border-radius: 12px;
              background: #eef0f4;
            }

            .product-preview__cta {
              margin-top: 4px;
            }

            .stats-row {
              display: flex;
              justify-content: center;
              gap: 64px;
              padding: 64px 32px;
              border-top: 1px solid rgba(255,255,255,0.06);
              border-bottom: 1px solid rgba(255,255,255,0.06);
              background: #08090b;
              flex-wrap: wrap;
            }

            .stat-item {
              min-width: 160px;
              text-align: center;
            }

            .stat-item strong {
              display: block;
              color: #ffffff;
              font-size: 40px;
              line-height: 1;
              font-weight: 950;
              letter-spacing: -0.04em;
              white-space: nowrap;
            }

            .stat-item span {
              display: block;
              margin-top: 8px;
              color: #a1a1aa;
              font-size: 13px;
              font-weight: 750;
            }

            .pricing-preview {
              max-width: 896px;
              margin: 0 auto;
              padding: 96px 32px;
              text-align: center;
            }

            .pricing-preview h2 {
              margin: 0 0 16px;
              color: #ffffff;
              font-size: 32px;
              font-weight: 950;
            }

            .pricing-preview > p {
              margin: 0 0 48px;
              color: #a1a1aa;
              font-size: 15px;
              font-weight: 650;
            }

            .pricing-preview__grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 24px;
            }

            .mini-plan {
              position: relative;
              padding: 24px;
              text-align: left;
            }

            .mini-plan--highlight {
              border: 1.5px solid #ef4444;
              background: rgba(239,68,68,0.06);
            }

            .mini-plan__badge {
              width: fit-content;
              margin: -38px auto 12px;
              border-radius: 999px;
              background: #ef4444;
              color: #ffffff;
              padding: 4px 12px;
              font-size: 11px;
              font-weight: 900;
            }

            .mini-plan h3 {
              margin: 0 0 14px;
              color: #ffffff;
              font-size: 16px;
              font-weight: 900;
            }

            .mini-plan__price {
              display: flex;
              align-items: baseline;
              gap: 6px;
            }

            .mini-plan__price strong {
              color: #ffffff;
              font-size: 36px;
              line-height: 1;
              font-weight: 950;
              letter-spacing: -0.05em;
            }

            .mini-plan__price span {
              color: #a1a1aa;
              font-size: 13px;
              font-weight: 800;
            }

            .mini-plan p {
              min-height: 42px;
              margin: 16px 0 20px;
              color: #a1a1aa;
              font-size: 13px;
              font-weight: 650;
              line-height: 1.6;
            }

            .mini-plan__button {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              min-height: 42px;
              border-radius: 8px;
              border: 1px solid rgba(255,255,255,0.28);
              color: #ffffff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 850;
            }

            .mini-plan__button--solid {
              border-color: #ef4444;
              background: #ef4444;
            }

            .pricing-preview__link {
              margin-top: 32px;
              font-size: 14px;
            }

            .final-cta {
              display: grid;
              justify-items: center;
              padding: 96px 32px;
              text-align: center;
              background: linear-gradient(135deg, #1a0000, #0a0a0a);
            }

            .final-cta h2 {
              max-width: 820px;
              margin: 0 0 18px;
              color: #ffffff;
              font-size: clamp(32px, 4vw, 52px);
              line-height: 1.12;
              font-weight: 950;
              letter-spacing: -0.04em;
            }

            .final-cta p {
              margin: 0 0 32px;
              color: #a1a1aa;
              font-size: 16px;
              font-weight: 650;
            }

            @media (max-width: 900px) {
              .hero__content {
                width: min(100% - 32px, 1180px);
                padding-top: 150px;
              }

              .hero h1 {
                font-size: clamp(3.45rem, 15vw, 6rem);
              }

              .feature-strip,
              .match-block__inner,
              .pricing-preview__grid {
                grid-template-columns: 1fr;
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

              .platform-bar__inner {
                flex-direction: column;
                gap: 14px;
              }

              .platform-bar {
                min-height: 112px;
              }

              .hero__actions,
              .final-cta__actions {
                align-items: stretch;
                flex-direction: column;
                width: 100%;
              }

              .button {
                width: 100%;
              }

              .feature-strip {
                width: min(100% - 36px, 1024px);
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

              .mockup-topbar {
                align-items: flex-start;
                flex-direction: column;
              }

              .application-card {
                align-items: flex-start;
                flex-wrap: wrap;
              }

              .application-status {
                margin-left: 44px;
              }
            }
          `,
        }}
      />
    </main>
  )
}
