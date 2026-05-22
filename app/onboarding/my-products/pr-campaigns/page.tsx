'use client'

import Link from 'next/link'
import { ImageIcon } from 'lucide-react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

const applications = [
  {
    campaign: '玻尿酸精華液 PR Gift',
    product: '玻尿酸精華液',
    applicant: '@beautyby.mia',
    platforms: ['IG', '小紅書'],
    fans: '28.4K',
    date: '2026-06-01',
    idea: '早晚保濕實測，展示上面前後膚況',
  },
  {
    campaign: '玻尿酸精華液 PR Gift',
    product: '玻尿酸精華液',
    applicant: '@glow.with.yan',
    platforms: ['TikTok', 'IG'],
    fans: '64.1K',
    date: '2026-06-02',
    idea: '拍攝水光肌妝前護膚短片',
  },
  {
    campaign: '白松露煥白面膜 PR Gift',
    product: '白松露煥白面膜',
    applicant: '@maskdiary.hk',
    platforms: ['IG', 'TikTok'],
    fans: '42.8K',
    date: '2026-05-29',
    idea: '連續 3 日面膜挑戰，拍攝亮白效果',
  },
  {
    campaign: '白松露煥白面膜 PR Gift',
    product: '白松露煥白面膜',
    applicant: '@littlebeautybook',
    platforms: ['小紅書'],
    fans: '22.1K',
    date: '2026-05-31',
    idea: '成分分析加真人試用圖',
  },
]

export default function PrCampaignApplicationsPage() {
  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="我的產品" />

      <section className="applications-shell">
        <div className="applications-panel">
          <header className="page-header">
            <div>
              <p>PR Gift Applications</p>
              <h1>收到的 KOL 申請列表</h1>
              <span>集中查看所有由 SOON Creator Network 收到的 PR Gift 申請。</span>
            </div>
            <Link href="/onboarding/my-products">返回我的產品</Link>
          </header>

          <div className="stat-grid">
            <article>
              <span>收到申請</span>
              <strong>12</strong>
            </article>
            <article>
              <span>待確認</span>
              <strong>5</strong>
            </article>
            <article>
              <span>已批准</span>
              <strong>7</strong>
            </article>
          </div>

          <div className="application-list">
            {applications.map((application) => (
              <article className="application-card" key={`${application.campaign}-${application.applicant}`}>
                <div className="product-mark">
                  <ImageIcon aria-hidden="true" size={24} />
                </div>
                <div className="application-main">
                  <div>
                    <p>{application.campaign}</p>
                    <h2>{application.applicant}</h2>
                  </div>
                  <div className="badge-row">
                    {application.platforms.map((platform) => (
                      <span key={platform}>{platform}</span>
                    ))}
                  </div>
                  <dl>
                    <div>
                      <dt>產品</dt>
                      <dd>{application.product}</dd>
                    </div>
                    <div>
                      <dt>粉絲數</dt>
                      <dd>{application.fans}</dd>
                    </div>
                    <div>
                      <dt>承諾發布日期</dt>
                      <dd>{application.date}</dd>
                    </div>
                  </dl>
                  <p className="idea">{application.idea}</p>
                </div>
                <div className="actions">
                  <button className="approve-button" type="button">
                    批准 ✓
                  </button>
                  <button className="reject-button" type="button">
                    拒絕 ✗
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
.dashboard-page {
  min-height: 100vh;
  background: #f7f7f8;
  color: #202126;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}

.applications-shell {
  min-height: 100vh;
  min-width: 0;
  background: #f7f7fb;
  padding: 32px;
}

.applications-panel {
  max-width: 1120px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.page-header p {
  margin: 0 0 7px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0 0 8px;
  color: #0a0a0a;
  font-size: 30px;
}

.page-header span {
  color: #6b7280;
}

.page-header a {
  border: 1px solid #d8c9ff;
  border-radius: 10px;
  color: #7c3aed;
  font-size: 14px;
  font-weight: 900;
  padding: 10px 14px;
  text-decoration: none;
  white-space: nowrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.stat-grid article,
.application-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
}

.stat-grid article {
  padding: 20px;
}

.stat-grid span {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.stat-grid strong {
  color: #0a0a0a;
  font-size: 28px;
}

.application-list {
  display: grid;
  gap: 14px;
}

.application-card {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  gap: 16px;
  padding: 18px;
}

.product-mark {
  width: 58px;
  height: 58px;
  border-radius: 12px;
  background: #f0edf8;
  color: #7c3aed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.application-main p,
.application-main h2,
dl,
dd {
  margin: 0;
}

.application-main > div:first-child p {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 5px;
}

.application-main h2 {
  color: #111827;
  font-size: 18px;
}

.badge-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin: 12px 0;
}

.badge-row span {
  border-radius: 999px;
  background: rgba(124, 58, 237, .1);
  color: #6d28d9;
  font-size: 12px;
  font-weight: 900;
  padding: 5px 9px;
}

dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

dt {
  color: #9ca3af;
  font-size: 12px;
  margin-bottom: 3px;
}

dd {
  color: #374151;
  font-size: 13px;
  font-weight: 800;
}

.idea {
  color: #52525b;
  font-size: 14px;
  margin-top: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approve-button,
.reject-button {
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 8px 10px;
  white-space: nowrap;
}

.approve-button {
  border: 1px solid #16a34a;
  background: #16a34a;
  color: #ffffff;
}

.reject-button {
  border: 1px solid #fecaca;
  background: #ffffff;
  color: #dc2626;
}

@media (max-width: 1040px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }
}

@media (max-width: 760px) {
  .applications-shell {
    padding: 18px;
  }

  .page-header,
  .application-card {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .stat-grid,
  dl {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
  }
}
`
