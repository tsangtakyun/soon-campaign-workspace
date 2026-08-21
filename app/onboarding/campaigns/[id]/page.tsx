'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type CampaignDetail = {
  cover_image_url?: string | null
  id: string
  name: string
  status: string
  target_audience?: string | null
  strategy_emoji: string | null
  strategy_title: string | null
  theme: string | null
  call_to_action: string | null
  target_link: string | null
  starts_on: string | null
  duration_weeks: number | null
  campaign_themes: unknown
}

type CampaignPost = {
  image_url?: string | null
  id: string
  title: string | null
  post_type: string | null
  status: string
  scheduled_at: string | null
}

type SocialConnection = {
  id: string
  platform: string
  account_name: string | null
}

const fallbackCampaign: CampaignDetail = {
  cover_image_url: null,
  id: 'fallback-1',
  name: '差點沒拍下來的片段',
  status: 'posting',
  target_audience: null,
  strategy_emoji: '🎯',
  strategy_title: '生活內容',
  theme:
    'SOON-LOG 透過邀請用戶捕捉並分享與朋友的小時刻，慶祝日常的美好。溫暖的視覺和 AI 驅動的創意，強調情感連結。',
  call_to_action: '捕捉並分享一個特別時刻！',
  target_link: 'https://sooncreator.network/',
  starts_on: '2026-05-01',
  duration_weeks: 1,
  campaign_themes: [
    { id: '1', title: '差點沒拍下來的片段', body: '最細小的片段，往往承載最真實的感覺。' },
    { id: '2', title: '一個簡單房間，幾段短片', body: '和朋友聚在一起，本來可以很平常。' },
  ],
}

const fallbackPosts: CampaignPost[] = [
  { id: 'p1', title: '差點沒拍下來的片段', post_type: 'still_image', status: 'draft', scheduled_at: '2026-05-08T10:00:00Z', image_url: null },
  { id: 'p2', title: '一個簡單房間，幾段短片', post_type: 'blog', status: 'draft', scheduled_at: '2026-05-08T14:00:00Z', image_url: null },
  { id: 'p3', title: '今天值得留下的一秒', post_type: 'video', status: 'draft', scheduled_at: '2026-05-08T18:00:00Z', image_url: null },
]

function formatDateRange(startsOn: string | null, durationWeeks: number | null) {
  if (!startsOn) return '—'
  const start = new Date(startsOn)
  if (Number.isNaN(start.getTime())) return '—'
  const end = new Date(start)
  end.setDate(end.getDate() + (durationWeeks ?? 1) * 7 - 1)
  const fmt = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`
  return `${fmt(start)} - ${fmt(end)}`
}

function getPostTypeLabel(type: string | null) {
  const map: Record<string, string> = {
    still_image: '靜態圖片',
    still_images: '靜態圖片',
    'still-images': '靜態圖片',
    video: '短影片',
    feed_video: '短影片',
    feed_videos: '短影片',
    'feed-videos': '短影片',
    blog: '文章',
    carousel: '輪播',
    carousels: '輪播',
    email: '電郵',
    emails: '電郵',
  }
  return type ? map[type] ?? type : '貼文'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    posting: '發布中',
    generating: '生成中',
    completed: '已完成',
    draft: '草稿',
    failed: '失敗',
    approved: '已審批',
    pending_approval: '待審批',
    posted: '已發布',
  }
  return map[status] ?? status
}

function getStatusClass(status: string) {
  if (status === 'posting' || status === 'generating' || status === 'pending_approval') return 'generating'
  if (status === 'completed' || status === 'approved' || status === 'posted') return 'done'
  if (status === 'failed') return 'failed'
  return 'draft'
}

function categoryGradient(campaign: CampaignDetail) {
  const seed = `${campaign.strategy_title || ''}${campaign.name}`.toLowerCase()
  if (seed.includes('教育') || seed.includes('educ')) return 'educational'
  if (seed.includes('生活') || seed.includes('life')) return 'lifestyle'
  if (seed.includes('品牌') || seed.includes('brand')) return 'brand'
  return 'default'
}

function platformLabel(platform: string) {
  const map: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    threads: 'Threads',
  }
  return map[platform] ?? platform
}

function platformIcon(platform: string) {
  const map: Record<string, string> = {
    instagram: 'IG',
    facebook: 'f',
    threads: '@',
  }
  return map[platform] ?? platform.slice(0, 1).toUpperCase()
}

function postIcon(type: string | null) {
  if (type === 'carousel' || type === 'carousels') return '▱'
  if (type === 'video' || type === 'feed_video' || type === 'feed_videos' || type === 'feed-videos') return '▶'
  if (type === 'email' || type === 'emails') return '✉'
  return '▧'
}

function contentPerWeekSummary(posts: CampaignPost[]) {
  const counts = posts.reduce(
    (acc, post) => {
      const type = post.post_type || ''
      if (type === 'carousel' || type === 'carousels') acc.carousel += 1
      else if (type === 'video' || type === 'feed_video' || type === 'feed_videos' || type === 'feed-videos') acc.video += 1
      else if (type === 'email' || type === 'emails') acc.email += 1
      else acc.static += 1
      return acc
    },
    { static: 0, carousel: 0, video: 0, email: 0 }
  )

  return `${counts.static} 張靜態圖、${counts.carousel} 個輪播、${counts.video} 支影片、${counts.email} 封電郵`
}

function audienceText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '點擊新增目標受眾'
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [campaign, setCampaign] = useState<CampaignDetail>(fallbackCampaign)
  const [posts, setPosts] = useState<CampaignPost[]>(fallbackPosts)
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const pendingReviewCount = posts.filter((post) => ['pending', 'ready', 'pending_approval'].includes(post.status)).length
  const startDateLabel = campaign.starts_on ? new Date(campaign.starts_on).toLocaleDateString('zh-HK') : '開始日期'
  const heroStyle = campaign.cover_image_url
    ? { backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.82)), url("${campaign.cover_image_url}")` }
    : undefined

  useEffect(() => {
    let cancelled = false

    async function loadCampaign() {
      if (!id || id.startsWith('fallback')) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()
        let workspaceId: string | null = null

        if (!user?.id && !sessionId) return

        let campaignQuery = supabase.from('marketing_campaigns').select('*').eq('id', id)
        let postsQuery = supabase.from('campaign_posts').select('*').eq('campaign_id', id).order('scheduled_at', { ascending: true })
        let connectionsQuery = supabase
          .from('social_connections')
          .select('id,platform,account_name')
          .in('platform', ['instagram', 'facebook', 'threads'])

        if (user?.id) {
          ;({ workspaceId } = await resolveActiveWorkspace())
          campaignQuery = workspaceId ? campaignQuery.eq('workspace_id', workspaceId) : campaignQuery.eq('user_id', user.id)
          postsQuery = workspaceId ? postsQuery.eq('workspace_id', workspaceId) : postsQuery.eq('user_id', user.id)
          connectionsQuery = workspaceId
            ? connectionsQuery.eq('workspace_id', workspaceId)
            : connectionsQuery.eq('user_id', user.id)
        } else if (sessionId) {
          campaignQuery = campaignQuery.eq('onboarding_session_id', sessionId)
          postsQuery = postsQuery.eq('onboarding_session_id', sessionId)
          connectionsQuery = connectionsQuery.eq('onboarding_session_id', sessionId)
        }

        const [
          { data: campaignData, error: campaignError },
          { data: postsData, error: postsError },
          { data: connectionData, error: connectionError },
        ] = await Promise.all([
          campaignQuery.maybeSingle(),
          postsQuery,
          connectionsQuery,
        ])

        if (cancelled) return
        if (!campaignError && campaignData) setCampaign(campaignData as CampaignDetail)
        if (!postsError) setPosts((postsData || []) as CampaignPost[])
        if (!connectionError) setConnections((connectionData || []) as SocialConnection[])
      } catch {
        // Keep fallback when Supabase has no rows or auth is not available.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCampaign()

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="宣傳活動" />
      <section className="home-shell">
        <div
          className={`campaign-detail-hero ${campaign.cover_image_url ? 'has-image' : categoryGradient(campaign)}`}
          style={heroStyle}
        >
          <button type="button" className="campaign-detail-back" onClick={() => router.push('/onboarding/topic-library')}>
            ← 返回
          </button>
          <div className="campaign-hero-actions">
            <button
              aria-label="分享活動"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              title="分享活動"
              type="button"
            >
              ⛓
            </button>
            <button aria-label="刪除活動" title="刪除活動" type="button">
              🗑
            </button>
            <button aria-label="複製活動" title="複製活動" type="button">
              ⧉
            </button>
          </div>
          <div className="campaign-detail-hero-content">
            <span className="campaign-detail-category">
              {campaign.strategy_emoji ?? '🎯'} {campaign.strategy_title ?? '生活內容'}
            </span>
            <h1>{campaign.name}</h1>
          </div>
        </div>

        <div className="campaign-detail-body">
          <section className="campaign-action-bar">
            <div className="campaign-action-info">
              <div className="campaign-action-badges">
                {pendingReviewCount > 0 ? (
                  <span className="action-badge review">{pendingReviewCount} 個帖子待審批</span>
                ) : null}
                {connections.length === 0 ? <span className="action-badge disconnected">尚未連接帳號</span> : null}
                <span className={`campaign-status ${getStatusClass(campaign.status)}`}>{getStatusLabel(campaign.status)}</span>
              </div>
              <p>請於 {startDateLabel} 前審批以準時發布</p>
            </div>
            <button type="button" className="campaign-review-btn" onClick={() => router.push('/onboarding/scheduled-posts')}>
              審批帖子
            </button>
          </section>

          <section className="campaign-detail-section">
            <div className="campaign-detail-section-head">
              <h2>活動詳情</h2>
              <span className="campaign-detail-hint">點擊任何欄位編輯</span>
            </div>
            <div className="campaign-detail-fields">
              <div className="campaign-detail-field">
                <label>主題</label>
                <p>{campaign.theme ?? '—'}</p>
              </div>
              <div className="campaign-detail-field">
                <label>目標受眾</label>
                <p className={campaign.target_audience ? '' : 'field-placeholder'}>
                  {audienceText(campaign.target_audience)}
                </p>
              </div>
              <div className="campaign-detail-field">
                <label>每週內容</label>
                <p>{contentPerWeekSummary(posts)}</p>
              </div>
              <div className="campaign-detail-field">
                <label>行動呼籲</label>
                <p>{campaign.call_to_action ?? '—'}</p>
                {campaign.target_link ? (
                  <a href={campaign.target_link} target="_blank" rel="noopener noreferrer">
                    {campaign.target_link}
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <section className="campaign-detail-section">
            <h2>排程</h2>
            <div className="campaign-detail-schedule">
              <div className="schedule-row">
                <span>開始日期</span>
                <span>{campaign.starts_on ? new Date(campaign.starts_on).toLocaleDateString('zh-HK') : '—'}</span>
              </div>
              <div className="schedule-row">
                <span>持續時間</span>
                <span>{campaign.duration_weeks ?? 1} 週</span>
              </div>
              <div className="schedule-row">
                <span>日期範圍</span>
                <span>{formatDateRange(campaign.starts_on, campaign.duration_weeks)}</span>
              </div>
              <div className="schedule-row schedule-accounts-row">
                <span>帳號</span>
                {connections.length ? (
                  <span className="connected-accounts">
                    {connections.map((connection) => (
                      <span className="connected-account" key={connection.id}>
                        <span>{platformIcon(connection.platform)}</span>
                        {platformLabel(connection.platform)}
                        {connection.account_name ? ` · ${connection.account_name}` : ''}
                      </span>
                    ))}
                  </span>
                ) : (
                  <button type="button" className="connect-account-btn" onClick={() => router.push('/onboarding/integrations')}>
                    連接帳號
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="campaign-detail-section">
            <div className="campaign-detail-section-head">
              <h2>貼文列表</h2>
              <button type="button" className="home-create-btn" onClick={() => router.push('/onboarding/scheduled-posts')}>
                ＋ 新增貼文
              </button>
            </div>
            {loading ? (
              <div className="campaigns-loading">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="campaign-row-skeleton" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="campaign-posts-empty">
                <p>尚未有貼文，點擊「新增貼文」開始建立。</p>
              </div>
            ) : (
              <div className="campaign-posts-list">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="campaign-post-row"
                    onClick={() => router.push('/onboarding/scheduled-posts')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') router.push('/onboarding/scheduled-posts')
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {post.image_url ? (
                      <img alt="" className="campaign-post-thumb" src={post.image_url} />
                    ) : (
                      <span className={`campaign-post-thumb placeholder ${post.post_type || 'default'}`}>
                        {postIcon(post.post_type)}
                      </span>
                    )}
                    <span className="campaign-post-type">{getPostTypeLabel(post.post_type)}</span>
                    <span className="campaign-post-title">{post.title ?? '未命名貼文'}</span>
                    <span className="campaign-post-date">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('zh-HK') : '未排程'}
                    </span>
                    <span className={`post-status-badge ${getStatusClass(post.status)}`}>{getStatusLabel(post.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${campaignDetailStyles}` }} />
    </main>
  )
}

const campaignDetailStyles = `
  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .campaign-detail-hero {
    position: relative;
    background: linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%);
    background-position: center;
    background-size: cover;
    padding: 32px 24px 26px;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 220px;
    justify-content: flex-end;
    overflow: hidden;
  }

  .campaign-detail-hero.educational {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.78)), linear-gradient(135deg, #2563eb, #f59e0b);
  }

  .campaign-detail-hero.lifestyle {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.78)), linear-gradient(135deg, #059669, #db2777);
  }

  .campaign-detail-hero.brand {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.78)), linear-gradient(135deg, #d97706, #4f46e5);
  }

  .campaign-detail-hero.default {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.78)), linear-gradient(135deg, #334155, #ca8a04);
  }

  .campaign-detail-back {
    position: absolute;
    top: 16px;
    left: 20px;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 8px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .campaign-detail-back:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .campaign-hero-actions {
    display: flex;
    gap: 8px;
    position: absolute;
    right: 20px;
    top: 16px;
  }

  .campaign-hero-actions button {
    align-items: center;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 9px;
    color: #ffffff;
    cursor: pointer;
    display: grid;
    font: inherit;
    font-size: 14px;
    height: 34px;
    justify-items: center;
    width: 34px;
  }

  .campaign-hero-actions button:hover {
    background: rgba(255, 255, 255, 0.26);
  }

  .campaign-detail-category {
    align-items: center;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    display: inline-flex;
    font-size: 13px;
    font-weight: 600;
    padding: 5px 10px;
    width: fit-content;
  }

  .campaign-detail-hero-content h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 750;
    line-height: 1.2;
    max-width: 820px;
  }

  .campaign-status {
    width: fit-content;
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .campaign-status.generating,
  .campaign-status.posting {
    background: #fef3c7;
    color: #92400e;
  }

  .campaign-status.done {
    background: #d1fae5;
    color: #065f46;
  }

  .campaign-status.failed {
    background: #fee2e2;
    color: #991b1b;
  }

  .campaign-status.draft {
    background: #f1f2f4;
    color: #6f737d;
  }

  .campaign-detail-body {
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .campaign-action-bar {
    align-items: center;
    border: 1px solid #e6e7eb;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 1px 0 rgba(17, 24, 39, 0.03);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 15px 16px;
  }

  .campaign-action-info {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .campaign-action-info p {
    color: #6f737d;
    font-size: 13px;
    margin: 0;
  }

  .campaign-action-badges {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-badge {
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
    padding: 4px 9px;
    white-space: nowrap;
  }

  .action-badge.review {
    background: #fef3c7;
    color: #92400e;
  }

  .action-badge.disconnected {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #a16207;
  }

  .campaign-review-btn {
    border: 1px solid #111111;
    border-radius: 9px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    flex-shrink: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    padding: 9px 14px;
  }

  .campaign-detail-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .campaign-detail-section h2,
  .campaign-detail-section-head h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
  }

  .campaign-detail-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .campaign-detail-hint {
    font-size: 12px;
    color: #9a9da4;
  }

  .campaign-detail-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    padding: 16px;
  }

  .campaign-detail-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #9a9da4;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .campaign-detail-field p {
    margin: 0;
    font-size: 14px;
    color: #202126;
    line-height: 1.5;
  }

  .campaign-detail-field p.field-placeholder {
    color: #9a9da4;
  }

  .campaign-detail-field a {
    font-size: 13px;
    color: #7c3aed;
    text-decoration: none;
  }

  .campaign-detail-schedule {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .schedule-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    font-size: 14px;
    border-bottom: 1px solid #f0f1f3;
  }

  .schedule-row:last-child {
    border-bottom: none;
  }

  .schedule-row span:first-child {
    color: #6f737d;
  }

  .schedule-accounts-row {
    align-items: center;
  }

  .connected-accounts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .connected-account {
    align-items: center;
    background: #f6f7f9;
    border: 1px solid #e8e9ec;
    border-radius: 999px;
    color: #202126;
    display: inline-flex;
    font-size: 12px;
    gap: 6px;
    padding: 5px 9px;
  }

  .connected-account span {
    align-items: center;
    background: #111111;
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    font-size: 10px;
    font-weight: 750;
    height: 18px;
    justify-content: center;
    width: 18px;
  }

  .connect-account-btn {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 10px;
  }

  .home-create-btn {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 7px 12px;
    cursor: pointer;
  }

  .campaigns-loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .campaign-row-skeleton {
    height: 48px;
    border-radius: 10px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .campaign-posts-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .campaign-post-row {
    display: grid;
    grid-template-columns: 48px 100px minmax(0, 1fr) 100px 90px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    cursor: pointer;
    transition: background 150ms;
  }

  .campaign-post-row:hover {
    background: #f8f8f9;
  }

  .campaign-post-thumb {
    border-radius: 8px;
    height: 48px;
    object-fit: cover;
    width: 48px;
  }

  .campaign-post-thumb.placeholder {
    align-items: center;
    background: #eef2ff;
    color: #3730a3;
    display: grid;
    font-size: 18px;
    justify-items: center;
  }

  .campaign-post-thumb.placeholder.carousel,
  .campaign-post-thumb.placeholder.carousels {
    background: #ecfeff;
    color: #0e7490;
  }

  .campaign-post-thumb.placeholder.video,
  .campaign-post-thumb.placeholder.feed_video,
  .campaign-post-thumb.placeholder.feed_videos,
  .campaign-post-thumb.placeholder.feed-videos {
    background: #fef2f2;
    color: #b91c1c;
  }

  .campaign-post-thumb.placeholder.email,
  .campaign-post-thumb.placeholder.emails {
    background: #f0fdf4;
    color: #15803d;
  }

  .campaign-post-type,
  .campaign-post-date {
    font-size: 12px;
    color: #6f737d;
  }

  .campaign-post-title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .post-status-badge {
    width: fit-content;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 600;
  }

  .campaign-posts-empty {
    border: 1px dashed #e0e0e0;
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    color: #9a9da4;
    font-size: 14px;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .campaign-post-row {
      grid-template-columns: 1fr;
    }

    .campaign-detail-hero {
      height: 240px;
    }

    .campaign-hero-actions {
      right: 14px;
    }

    .campaign-detail-hero-content h1 {
      font-size: 24px;
    }

    .campaign-action-bar,
    .schedule-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .connected-accounts {
      justify-content: flex-start;
    }
  }
`
