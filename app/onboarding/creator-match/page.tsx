'use client'

import { useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

const platforms = ['全部', 'Instagram', '小紅書', 'TikTok', 'YouTube'] as const
const fanRanges = ['全部', '1K-10K', '10K-100K', '100K+'] as const
const industries = ['全部', '美容', '時尚', '生活', '健康'] as const

const creators = [
  {
    name: '@beautyby.mia',
    platforms: ['Instagram', '小紅書'],
    fans: '28.4K',
    fanRange: '10K-100K',
    industry: '美容',
    tags: ['#美容', '#護膚', '#平價好物'],
    score: 87,
    gradient: 'linear-gradient(135deg, #f472b6, #7c3aed)',
  },
  {
    name: '@glow.with.yan',
    platforms: ['TikTok', 'Instagram'],
    fans: '64.1K',
    fanRange: '10K-100K',
    industry: '美容',
    tags: ['#底妝', '#敏感肌', '#成分黨'],
    score: 91,
    gradient: 'linear-gradient(135deg, #38bdf8, #7c3aed)',
  },
  {
    name: '@dailychic.hk',
    platforms: ['Instagram', 'YouTube'],
    fans: '132K',
    fanRange: '100K+',
    industry: '時尚',
    tags: ['#穿搭', '#輕奢', '#OL日常'],
    score: 82,
    gradient: 'linear-gradient(135deg, #fb7185, #f59e0b)',
  },
  {
    name: '@skincare.iris',
    platforms: ['小紅書', 'TikTok'],
    fans: '9.8K',
    fanRange: '1K-10K',
    industry: '美容',
    tags: ['#護膚', '#開架推介', '#真實測評'],
    score: 78,
    gradient: 'linear-gradient(135deg, #34d399, #0f766e)',
  },
  {
    name: '@wellness.amy',
    platforms: ['YouTube', 'Instagram'],
    fans: '45.7K',
    fanRange: '10K-100K',
    industry: '健康',
    tags: ['#健康生活', '#保健', '#自律日常'],
    score: 84,
    gradient: 'linear-gradient(135deg, #a3e635, #22c55e)',
  },
  {
    name: '@citylife.karen',
    platforms: ['TikTok', '小紅書'],
    fans: '73.2K',
    fanRange: '10K-100K',
    industry: '生活',
    tags: ['#生活美學', '#咖啡店', '#女生好物'],
    score: 88,
    gradient: 'linear-gradient(135deg, #c084fc, #ec4899)',
  },
]

function PlatformBadge({ platform }: { platform: string }) {
  const label = platform === 'Instagram' ? 'IG' : platform === 'TikTok' ? 'TT' : platform === 'YouTube' ? 'YT' : '小紅書'
  return <span className={`platform-badge ${platform.toLowerCase()}`}>{label}</span>
}

export default function CreatorMatchPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<(typeof platforms)[number]>('全部')
  const [selectedFanRange, setSelectedFanRange] = useState<(typeof fanRanges)[number]>('全部')
  const [selectedIndustry, setSelectedIndustry] = useState<(typeof industries)[number]>('全部')

  const filteredCreators = useMemo(
    () =>
      creators.filter((creator) => {
        const platformMatch = selectedPlatform === '全部' || creator.platforms.includes(selectedPlatform)
        const fanMatch = selectedFanRange === '全部' || creator.fanRange === selectedFanRange
        const industryMatch = selectedIndustry === '全部' || creator.industry === selectedIndustry
        return platformMatch && fanMatch && industryMatch
      }),
    [selectedFanRange, selectedIndustry, selectedPlatform]
  )

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="創作者配對" />

      <section className="creator-shell">
        <header className="hero-header">
          <p>Creator Match</p>
          <h1>創作者配對</h1>
          <span>搵啱 KOL，放大你的品牌影響力</span>
        </header>

        <section className="filter-card" aria-label="創作者篩選">
          <div className="filter-group">
            <strong>平台</strong>
            <div>
              {platforms.map((platform) => (
                <button
                  className={selectedPlatform === platform ? 'active' : ''}
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  type="button"
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <strong>粉絲數</strong>
            <div>
              {fanRanges.map((range) => (
                <button
                  className={selectedFanRange === range ? 'active' : ''}
                  key={range}
                  onClick={() => setSelectedFanRange(range)}
                  type="button"
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <strong>行業</strong>
            <div>
              {industries.map((industry) => (
                <button
                  className={selectedIndustry === industry ? 'active' : ''}
                  key={industry}
                  onClick={() => setSelectedIndustry(industry)}
                  type="button"
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
        </section>

        {filteredCreators.length > 0 ? (
          <div className="creator-grid">
            {filteredCreators.map((creator) => (
              <article className="creator-card" key={creator.name}>
                <div className="creator-top">
                  <div className="avatar" style={{ background: creator.gradient }}>
                    {creator.name.replace('@', '').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2>{creator.name}</h2>
                    <div className="platform-list">
                      {creator.platforms.map((platform) => (
                        <PlatformBadge key={platform} platform={platform} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="creator-meta">
                  <span>粉絲數</span>
                  <strong>{creator.fans}</strong>
                </div>

                <div className="tag-row">
                  {creator.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="match-row">
                  <div>
                    <span>配對度</span>
                    <strong>{creator.score}%</strong>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <span style={{ width: `${creator.score}%` }} />
                  </div>
                </div>

                <button className="invite-button" type="button">
                  發送邀請
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>暫時未有符合條件的創作者</strong>
            <p>試下放寬平台、粉絲數或行業篩選，SOON 會幫你搵更多合適人選。</p>
          </div>
        )}
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

.creator-shell {
  min-height: 100vh;
  background: #f7f7fb;
  color: #0a0a0a;
  padding: 32px;
  min-width: 0;
}

.hero-header {
  max-width: 1180px;
  margin: 0 auto 22px;
}

.hero-header p {
  margin: 0 0 8px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.hero-header h1 {
  margin: 0 0 8px;
  color: #0a0a0a;
  font-size: 32px;
  line-height: 1.12;
}

.hero-header span {
  color: #6b7280;
  font-size: 16px;
}

.filter-card,
.creator-grid,
.empty-state {
  max-width: 1180px;
  margin-left: auto;
  margin-right: auto;
}

.filter-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-group strong {
  width: 58px;
  color: #111827;
  font-size: 13px;
}

.filter-group div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-group button {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
}

.filter-group button.active {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, .1);
  color: #6d28d9;
}

.creator-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.creator-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
}

.creator-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 900;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .42);
}

.creator-top h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 17px;
}

.platform-list {
  display: flex;
  gap: 6px;
}

.platform-badge {
  min-width: 28px;
  height: 24px;
  border-radius: 7px;
  background: #0a0a0a;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  padding: 0 7px;
}

.platform-badge.instagram {
  background: linear-gradient(135deg, #f97316, #db2777, #7c3aed);
}

.platform-badge.tiktok {
  background: #111111;
}

.platform-badge.youtube {
  background: #ef4444;
}

.creator-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid #f0f1f5;
  border-bottom: 1px solid #f0f1f5;
}

.creator-meta span,
.match-row span {
  color: #6b7280;
  font-size: 12px;
}

.creator-meta strong {
  color: #111827;
  font-size: 18px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.tag-row span {
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 9px;
}

.match-row {
  margin-bottom: 16px;
}

.match-row > div:first-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.match-row strong {
  color: #7c3aed;
  font-size: 14px;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: #ece9f8;
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
}

.invite-button {
  width: 100%;
  border: 1px solid #7c3aed;
  border-radius: 10px;
  background: #ffffff;
  color: #7c3aed;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  padding: 11px 14px;
}

.empty-state {
  background: #ffffff;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  padding: 48px 24px;
  text-align: center;
}

.empty-state strong {
  display: block;
  color: #111827;
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
}

@media (max-width: 1040px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .creator-shell {
    padding: 24px;
  }

  .creator-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .creator-shell {
    padding: 18px;
  }

  .filter-group {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .creator-grid {
    grid-template-columns: 1fr;
  }
}
`
