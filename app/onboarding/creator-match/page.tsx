'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace, type WorkspaceSummary } from '@/lib/workspace-client'

type KOL = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  instagram_handle: string | null
  instagram_followers: number | null
  youtube_handle: string | null
  youtube_subscribers: number | null
  tiktok_handle: string | null
  tiktok_followers: number | null
  xiaohongshu_handle: string | null
  xiaohongshu_followers: number | null
  facebook_handle?: string | null
  facebook_followers?: number | null
  threads_handle?: string | null
  threads_followers?: number | null
  content_categories: string[] | null
  ai_profile_summary: string | null
}

type Campaign = {
  id: string
  name: string
  theme: string | null
  status: string | null
  starts_on: string | null
  duration_weeks: number | null
  target_audience: string | null
  call_to_action: string | null
  cover_image_url: string | null
  workspace_id: string
  created_at: string
  workspaces?: {
    name?: string | null
  } | null
}

const platformFilters = ['全部', 'Instagram', 'YouTube', 'TikTok', '小紅書'] as const
const followerFilters = ['全部', '1K 以下', '1K-10K', '10K-100K', '100K+'] as const

function apiHeaders() {
  const key = process.env.NEXT_PUBLIC_SOON_INTERNAL_API_KEY
  return key ? { 'x-soon-api-key': key } : {}
}

function totalFollowers(kol: KOL) {
  return (
    (kol.instagram_followers ?? 0) +
    (kol.youtube_subscribers ?? 0) +
    (kol.tiktok_followers ?? 0) +
    (kol.xiaohongshu_followers ?? 0) +
    (kol.facebook_followers ?? 0) +
    (kol.threads_followers ?? 0)
  )
}

function followerRange(count: number) {
  if (count >= 100000) return '100K+'
  if (count >= 10000) return '10K-100K'
  if (count >= 1000) return '1K-10K'
  return '1K 以下'
}

function platformsFor(kol: KOL) {
  return [
    kol.instagram_handle ? 'Instagram' : null,
    kol.youtube_handle ? 'YouTube' : null,
    kol.tiktok_handle ? 'TikTok' : null,
    kol.xiaohongshu_handle ? '小紅書' : null,
  ].filter(Boolean) as string[]
}

function matchScore(kol: KOL, campaigns: Campaign[]) {
  const categories = (kol.content_categories ?? []).map((category) => category.toLowerCase())
  const audienceText = campaigns
    .map((campaign) => `${campaign.target_audience ?? ''} ${campaign.theme ?? ''} ${campaign.name ?? ''}`)
    .join(' ')
    .toLowerCase()

  if (!categories.length || !audienceText.trim()) return 72

  const matches = categories.filter((category) => audienceText.includes(category)).length
  return Math.min(96, 72 + matches * 8)
}

function PlatformBadge({ platform }: { platform: string }) {
  const label = platform === 'Instagram' ? 'IG' : platform === 'YouTube' ? 'YT' : platform === 'TikTok' ? 'TT' : 'XHS'
  return <span className={`platform-badge ${platform.toLowerCase().replace('小紅書', 'xhs')}`}>{label}</span>
}

function InviteModal({
  kol,
  campaigns,
  workspaceName,
  onClose,
  onSuccess,
}: {
  kol: KOL
  campaigns: Campaign[]
  workspaceName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const campaignRef = useRef<HTMLSelectElement>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    const campaignId = campaignRef.current?.value
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (!campaign) return

    setLoading(true)
    setError('')

    const res = await fetch('/api/public/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders(),
      },
      body: JSON.stringify({
        egg_creator_id: kol.id,
        creator_username: kol.username,
        cw_campaign_id: campaign.id,
        cw_workspace_id: campaign.workspace_id,
        campaign_name: campaign.name,
        brand_name: campaign.workspaces?.name ?? workspaceName,
        cover_image_url: campaign.cover_image_url,
        theme: campaign.theme,
        call_to_action: campaign.call_to_action,
        starts_on: campaign.starts_on,
        message,
      }),
    })
    const data = await res.json().catch(() => null)

    setLoading(false)
    if (res.ok && data?.success) {
      onSuccess()
    } else {
      setError(data?.error || '發送失敗，請重試')
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="invite-modal">
        <h3>邀請 {kol.display_name || kol.username}</h3>
        <p>@{kol.username}</p>

        <label>選擇 Campaign</label>
        <select
          ref={campaignRef}
          defaultValue=""
        >
          <option value="">請選擇...</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        <label>邀請訊息（可選）</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="向 KOL 說明合作詳情..."
          rows={3}
        />

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleSend}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              loading
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'cursor-pointer bg-black text-white hover:bg-gray-800'
            }`}
            type="button"
          >
            {loading ? '發送中...' : '發送邀請'}
          </button>
          <button onClick={onClose} className="secondary" type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreatorMatchPage() {
  const [kols, setKols] = useState<KOL[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<(typeof platformFilters)[number]>('全部')
  const [selectedFollowerRange, setSelectedFollowerRange] = useState<(typeof followerFilters)[number]>('全部')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitingKol, setInvitingKol] = useState<KOL | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [workspaceResult, kolRes, campaignRes] = await Promise.all([
          resolveActiveWorkspace().catch(() => ({ activeWorkspace: null })),
          fetch('/api/public/kols', { headers: apiHeaders() }),
          fetch('/api/public/campaigns', { headers: apiHeaders() }),
        ])

        const [kolData, campaignData] = await Promise.all([
          kolRes.json().catch(() => null),
          campaignRes.json().catch(() => null),
        ])

        if (!kolRes.ok) throw new Error(kolData?.error || '未能載入創作者')
        if (!campaignRes.ok) throw new Error(campaignData?.error || '未能載入 Campaign')

        if (!cancelled) {
          setActiveWorkspace(workspaceResult.activeWorkspace ?? null)
          setKols(kolData?.kols ?? [])
          setCampaigns(campaignData?.campaigns ?? [])
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : '未能載入 Creator Match')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const workspaceCampaigns = useMemo(() => {
    if (!activeWorkspace?.id) return campaigns
    const filtered = campaigns.filter((campaign) => campaign.workspace_id === activeWorkspace.id)
    return filtered.length ? filtered : campaigns
  }, [activeWorkspace?.id, campaigns])

  const categoryFilters = useMemo(() => {
    const categories = new Set<string>()
    kols.forEach((kol) => (kol.content_categories ?? []).forEach((category) => categories.add(category)))
    return ['全部', ...Array.from(categories).slice(0, 12)]
  }, [kols])

  const filteredKols = useMemo(
    () =>
      kols.filter((kol) => {
        const kolPlatforms = platformsFor(kol)
        const followerCount = totalFollowers(kol)
        const platformMatch = selectedPlatform === '全部' || kolPlatforms.includes(selectedPlatform)
        const followerMatch = selectedFollowerRange === '全部' || followerRange(followerCount) === selectedFollowerRange
        const categoryMatch = selectedCategory === '全部' || (kol.content_categories ?? []).includes(selectedCategory)
        return platformMatch && followerMatch && categoryMatch
      }),
    [kols, selectedCategory, selectedFollowerRange, selectedPlatform]
  )

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="創作者配對" />

      <section className="creator-shell">
        <header className="hero-header">
          <p>Creator Match</p>
          <h1>搵啱創作者，放大品牌影響力</h1>
          <span>即時瀏覽 SOON-EGG 創作者資料，查看 Media Kit 並向合適人選發送合作邀請。</span>
        </header>

        <section className="filter-card" aria-label="Creator filters">
          <div className="filter-group">
            <strong>平台</strong>
            <div>
              {platformFilters.map((platform) => (
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
            <strong>粉絲</strong>
            <div>
              {followerFilters.map((range) => (
                <button
                  className={selectedFollowerRange === range ? 'active' : ''}
                  key={range}
                  onClick={() => setSelectedFollowerRange(range)}
                  type="button"
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <strong>類別</strong>
            <div>
              {categoryFilters.map((category) => (
                <button
                  className={selectedCategory === category ? 'active' : ''}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {successMessage && <div className="success-banner">{successMessage}</div>}

        {loading ? (
          <div className="empty-state">
            <strong>載入創作者中...</strong>
          </div>
        ) : error ? (
          <div className="empty-state error">
            <strong>{error}</strong>
            <p>請確認 CW / SOON-EGG internal API 設定完成。</p>
          </div>
        ) : filteredKols.length > 0 ? (
          <div className="creator-grid">
            {filteredKols.map((kol) => {
              const count = totalFollowers(kol)
              const score = matchScore(kol, workspaceCampaigns)
              const displayName = kol.display_name || kol.username
              const kolPlatforms = platformsFor(kol)

              return (
                <article className="creator-card" key={kol.id}>
                  <div className="creator-top">
                    <div className="avatar">
                      {kol.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={kol.avatar_url} alt={displayName} />
                      ) : (
                        <span>{displayName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h2>{displayName}</h2>
                      <p>@{kol.username}</p>
                      <div className="platform-list">
                        {kolPlatforms.map((platform) => (
                          <PlatformBadge key={platform} platform={platform} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="creator-bio">{kol.bio || kol.ai_profile_summary || 'SOON-EGG 創作者'}</p>

                  <div className="creator-meta">
                    <span>總觸及 / 粉絲</span>
                    <strong>{count.toLocaleString()}</strong>
                  </div>

                  <div className="tag-row">
                    {(kol.content_categories ?? []).slice(0, 5).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>

                  <div className="match-row">
                    <div>
                      <span>配對分數</span>
                      <strong>{score}%</strong>
                    </div>
                    <div className="progress-track" aria-hidden="true">
                      <span style={{ width: `${score}%` }} />
                    </div>
                  </div>

                  <div className="card-actions">
                    <a href={`https://egg.sooncreator.network/${kol.username}/mediakit`} target="_blank" rel="noopener noreferrer">
                      查看 Media Kit
                    </a>
                    <button onClick={() => setInvitingKol(kol)} disabled={workspaceCampaigns.length === 0} type="button">
                      發送邀請
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <strong>未找到符合條件的創作者</strong>
            <p>調整平台、粉絲或類別篩選，尋找更多合適 KOL。</p>
          </div>
        )}
      </section>

      {invitingKol && (
        <InviteModal
          kol={invitingKol}
          campaigns={workspaceCampaigns}
          workspaceName={activeWorkspace?.name || 'SOON Campaign Workspace'}
          onClose={() => setInvitingKol(null)}
          onSuccess={() => {
            setSuccessMessage(`已向 ${invitingKol.display_name || invitingKol.username} 發送邀請。`)
            setInvitingKol(null)
          }}
        />
      )}

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
  color: #2563eb;
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
.empty-state,
.success-banner {
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
  border-color: #2563eb;
  background: rgba(37, 99, 235, .1);
  color: #1d4ed8;
}

.success-banner {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
  border-radius: 12px;
  margin-bottom: 18px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
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
  margin-bottom: 12px;
}

.avatar {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 900;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creator-top h2 {
  margin: 0 0 3px;
  color: #111827;
  font-size: 17px;
}

.creator-top p {
  margin: 0 0 8px;
  color: #9ca3af;
  font-size: 12px;
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

.platform-badge.xhs {
  background: #ef4444;
}

.creator-bio {
  min-height: 40px;
  margin: 0 0 14px;
  color: #52525b;
  font-size: 13px;
  line-height: 1.55;
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
  color: #2563eb;
  font-size: 14px;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: #dbeafe;
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #14b8a6);
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.card-actions a,
.card-actions button {
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  padding: 11px 10px;
  text-align: center;
  text-decoration: none;
}

.card-actions a {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
}

.card-actions button {
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
}

.card-actions button:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.empty-state {
  background: #ffffff;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  padding: 48px 24px;
  text-align: center;
}

.empty-state.error {
  border-color: #fecaca;
  color: #dc2626;
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, .52);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.invite-modal {
  width: 100%;
  max-width: 460px;
  border-radius: 18px;
  background: #ffffff;
  padding: 24px;
  box-shadow: 0 22px 60px rgba(15, 23, 42, .22);
}

.invite-modal h3 {
  margin: 0 0 4px;
  color: #111827;
  font-size: 20px;
}

.invite-modal > p {
  margin: 0 0 18px;
  color: #9ca3af;
  font-size: 14px;
}

.invite-modal label {
  display: block;
  margin: 0 0 8px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
}

.invite-modal select,
.invite-modal textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
  margin-bottom: 16px;
  outline: none;
  padding: 10px 12px;
}

.invite-modal select::placeholder,
.invite-modal textarea::placeholder {
  color: #9ca3af;
}

.invite-modal textarea {
  resize: none;
}

.modal-error {
  border-radius: 10px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  margin-bottom: 14px;
  padding: 10px 12px;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modal-actions button {
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 11px 14px;
  transition: background .18s ease, color .18s ease, border-color .18s ease;
}

.modal-actions button.send-button.enabled {
  border-color: #111827;
  background: #ffffff;
  color: #111827;
}

.modal-actions button.send-button.enabled:hover {
  background: #f9fafb;
}

.modal-actions button.send-button.disabled {
  border-color: #e5e7eb;
  background: #e5e7eb;
  color: #9ca3af;
}

.modal-actions button.secondary {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
}

.modal-actions button:disabled {
  cursor: not-allowed;
  opacity: 1;
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
