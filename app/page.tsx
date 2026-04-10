import Link from 'next/link'

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '56px',
  padding: '0 22px',
  borderRadius: '999px',
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
  color: '#ffffff',
  fontSize: '15px',
  border: '1px solid rgba(255,121,93,0.24)',
  boxShadow: '0 0 0 1px rgba(255,121,93,0.18), 0 0 30px rgba(255,84,48,0.32)',
} as const

const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '56px',
  padding: '0 22px',
  borderRadius: '999px',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f4f7ff',
  fontSize: '15px',
} as const

function StatCard({
  value,
  label,
  body,
}: {
  value: string
  label: string
  body: string
}) {
  return (
    <section className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-body">{body}</div>
    </section>
  )
}

function FeatureCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <section className="feature-card">
      <div className="feature-eyebrow">{eyebrow}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-body">{body}</p>
    </section>
  )
}

export default function HomePage() {
  return (
    <main className="campaign-home">
      <div className="campaign-shell">
        <section id="overview" className="hero-grid">
          <section className="hero-stage">
            <div className="hero-stage__glow" />
            <div className="hero-meta">為精簡團隊而設的 AI 廣告工作台</div>
            <div className="hero-rating">由需求提交到創作者交付，四步完成整體流程</div>
            <h1 className="hero-title">
              將廣告預算
              <br />
              轉化為真正帶來
              <br />
              成效的內容
            </h1>
            <div className="hero-sidecopy">
              SOON 將需求提交、策略判斷、創作者配對、腳本規劃與交付流程串成同一個工作台，協助品牌以更低摩擦完成整體廣告專案執行。
            </div>
            <div className="hero-actions">
              <Link href="/submit-brief" style={primaryButtonStyle}>
                開始填寫需求
              </Link>
              <Link href="/my-workspace" style={secondaryButtonStyle}>
                前往工作台
              </Link>
            </div>

            <div className="hero-brands">
              <span>營運協作</span>
              <span>創作者配對</span>
              <span>策略分析</span>
              <span>交付流程</span>
              <span>付費分析</span>
            </div>
          </section>

          <aside className="hero-panel">
            <div className="hero-panel__card hero-panel__card--accent">
              <div className="mini-eyebrow">即時流程訊號</div>
              <div className="mini-title">減少來回追趕供應商的時間</div>
              <p className="mini-body">
                由需求提交到創作者候選名單，SOON 將策略、製作與後續跟進集中在同一處理流程之中。
              </p>
            </div>

            <div className="hero-panel__stack">
              <div className="mini-metric">
                <span className="mini-metric__label">由需求到方案</span>
                <span className="mini-metric__value">24h</span>
              </div>
              <div className="mini-metric">
                <span className="mini-metric__label">建議角度</span>
                <span className="mini-metric__value">5</span>
              </div>
              <div className="mini-metric">
                <span className="mini-metric__label">創作者路線</span>
                <span className="mini-metric__value">3</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="metrics" className="stats-grid">
          <StatCard
            value="3x"
            label="更快完成廣告專案設定"
            body="由需求、題材方向到創作者組合，先用 AI 建立可執行的初稿。"
          />
          <StatCard
            value="5"
            label="每份需求的內容角度"
            body="每份需求先拆出 5 個值得優先測試的訊息方向與內容角度。"
          />
          <StatCard
            value="0"
            label="中介溝通成本"
            body="品牌直接掌握策略與 creator 配對流程，減少資訊斷層與額外中介成本。"
          />
        </section>

        <section className="section-heading">
          <div className="section-heading__eyebrow">為何選擇 SOON</div>
          <h2 className="section-heading__title">這是一套為執行而設的廣告工作系統，而不是只用來提案的簡報。</h2>
        </section>

        <section className="features-grid">
          <FeatureCard
            eyebrow="01"
            title="一次填寫需求，串連整條流程"
            body="同一份需求會直接承接策略分析、創作者配對、腳本規劃與交付追蹤，無須在每一站重新說明。"
          />
          <FeatureCard
            eyebrow="02"
            title="以 AI 為先的規劃層"
            body="先由 AI 判斷預算形態、內容角度與 deliverable 組合，再交由人手調整與確認，決策速度會明顯更快。"
          />
          <FeatureCard
            eyebrow="03"
            title="內建創作者協作流程"
            body="由候選名單、腳本規劃到後續交付確認都在同一個工作台中處理，適合持續運行廣告專案。"
          />
        </section>

        <section id="workflow" className="workflow-panel">
          <div className="section-heading__eyebrow">運作流程</div>
          <div className="workflow-grid">
            {[
              '1. 提交需求',
              '2. 取得 AI 策略與內容角度',
              '3. 檢視創作者名單與營運流程',
              '4. 進入腳本、分鏡與交付階段',
            ].map((step) => (
              <div key={step} className="workflow-step">
                {step}
              </div>
            ))}
          </div>
        </section>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .campaign-home {
              min-height: 100vh;
              padding: 44px 24px 100px;
            }

            .campaign-shell {
              width: min(1240px, 100%);
              margin: 0 auto;
              display: grid;
              gap: 22px;
            }

            .hero-grid {
              display: grid;
              grid-template-columns: minmax(0, 1.18fr) minmax(280px, 0.82fr);
              gap: 20px;
              align-items: stretch;
            }

            .hero-stage,
            .hero-panel,
            .stat-card,
            .feature-card,
            .workflow-panel {
              position: relative;
              overflow: hidden;
              border-radius: 32px;
              border: 1px solid rgba(255,255,255,0.08);
              background: linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94));
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 80px rgba(0,0,0,0.36);
            }

            .hero-stage {
              min-height: 620px;
              padding: 38px;
              display: grid;
              align-content: end;
              gap: 18px;
            }

            .hero-stage__glow {
              position: absolute;
              inset: 0;
              background:
                radial-gradient(circle at 20% 18%, rgba(255, 84, 48, 0.28), transparent 28%),
                radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.08), transparent 30%);
              pointer-events: none;
            }

            .hero-meta,
            .section-heading__eyebrow,
            .feature-eyebrow,
            .mini-eyebrow {
              position: relative;
              z-index: 1;
              font-size: 12px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: rgba(172, 182, 206, 0.78);
            }

            .hero-rating {
              position: relative;
              z-index: 1;
              width: fit-content;
              padding: 10px 14px;
              border-radius: 999px;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(237, 241, 255, 0.92);
              font-size: 14px;
            }

            .hero-title {
              position: relative;
              z-index: 1;
              margin: 0;
              max-width: 820px;
              font-size: clamp(3.4rem, 7vw, 6rem);
              line-height: 0.96;
              letter-spacing: -0.08em;
              font-weight: 360;
              color: #ffffff;
            }

            .hero-sidecopy {
              position: relative;
              z-index: 1;
              max-width: 560px;
              font-size: 18px;
              line-height: 1.8;
              color: rgba(214, 220, 236, 0.8);
            }

            .hero-actions,
            .hero-brands {
              position: relative;
              z-index: 1;
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
            }

            .hero-brands {
              gap: 18px;
              margin-top: 8px;
              color: rgba(255,255,255,0.64);
              font-size: 14px;
            }

            .hero-panel {
              padding: 24px;
              display: grid;
              gap: 16px;
              align-content: start;
            }

            .hero-panel__card,
            .workflow-step,
            .mini-metric {
              border-radius: 22px;
              border: 1px solid rgba(255,255,255,0.08);
              background: rgba(255,255,255,0.04);
            }

            .hero-panel__card {
              padding: 18px;
            }

            .hero-panel__card--accent {
              background: linear-gradient(180deg, rgba(255, 94, 54, 0.16), rgba(255,255,255,0.04));
            }

            .mini-title {
              margin-top: 8px;
              font-size: 28px;
              line-height: 1.08;
              color: #ffffff;
            }

            .mini-body {
              margin: 10px 0 0;
              line-height: 1.8;
              color: rgba(219,224,238,0.78);
            }

            .hero-panel__stack {
              display: grid;
              gap: 12px;
            }

            .mini-metric {
              padding: 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .mini-metric__label {
              color: rgba(214,220,236,0.76);
              font-size: 14px;
            }

            .mini-metric__value {
              font-size: 34px;
              line-height: 1;
              letter-spacing: -0.06em;
              color: #ffffff;
            }

            .stats-grid,
            .features-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 16px;
            }

            .stat-card,
            .feature-card,
            .workflow-panel {
              padding: 24px;
            }

            .stat-value {
              font-size: clamp(3rem, 5vw, 4.4rem);
              line-height: 0.94;
              letter-spacing: -0.08em;
              color: #ffffff;
            }

            .stat-label {
              margin-top: 10px;
              font-size: 30px;
              line-height: 1.04;
              color: #f4f7ff;
              letter-spacing: -0.05em;
            }

            .stat-body,
            .feature-body {
              margin-top: 10px;
              font-size: 16px;
              line-height: 1.8;
              color: rgba(214,220,236,0.76);
            }

            .section-heading {
              display: grid;
              gap: 10px;
              padding: 8px 4px 0;
            }

            .section-heading__title {
              margin: 0;
              max-width: 900px;
              font-size: clamp(2.4rem, 5vw, 4.2rem);
              line-height: 0.98;
              letter-spacing: -0.07em;
              font-weight: 360;
              color: #ffffff;
            }

            .feature-title {
              margin: 12px 0 0;
              font-size: 30px;
              line-height: 1.04;
              letter-spacing: -0.05em;
              color: #ffffff;
            }

            .workflow-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-top: 14px;
            }

            .workflow-step {
              padding: 16px;
              line-height: 1.75;
              color: rgba(226,230,242,0.8);
            }

            @media (max-width: 1080px) {
              .hero-grid,
              .stats-grid,
              .features-grid,
              .workflow-grid {
                grid-template-columns: 1fr;
              }

              .hero-stage {
                min-height: auto;
              }
            }

            @media (max-width: 640px) {
              .campaign-home {
                padding: 32px 16px 80px;
              }

              .hero-stage,
              .hero-panel,
              .stat-card,
              .feature-card,
              .workflow-panel {
                border-radius: 24px;
              }

              .hero-stage,
              .hero-panel,
              .stat-card,
              .feature-card,
              .workflow-panel {
                padding: 20px;
              }

              .hero-actions a {
                width: 100%;
              }
            }
          `,
        }}
      />
    </main>
  )
}
