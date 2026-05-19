'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type CampaignRow = {
  id: string
  name: string | null
  starts_on?: string | null
  duration_weeks?: number | null
}

type ApprovalPost = {
  approved_at: string | null
  body: string | null
  campaign_id: string | null
  id: string
  image_url: string | null
  post_type: string | null
  scheduled_at: string | null
  status: string | null
  title: string | null
}

type CampaignGroup = {
  campaign: CampaignRow
  posts: ApprovalPost[]
}

const VISIBLE_STATUSES = new Set(['draft', 'ready', 'approved', 'scheduled', 'published'])

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function formatWeekRange(weekStart: Date) {
  return `${formatMonthDay(weekStart)} - ${formatMonthDay(addDays(weekStart, 6))}`
}

function formatPostDate(value: string | null) {
  if (!value) return '未排程'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未排程'
  return date.toLocaleString('zh-HK', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

function formatGroupDateRange(posts: ApprovalPost[]) {
  const dates = posts
    .map((post) => (post.scheduled_at ? new Date(post.scheduled_at) : null))
    .filter((date): date is Date => Boolean(date) && !Number.isNaN(date.getTime()))

  if (!dates.length) return '未排程'

  dates.sort((a, b) => a.getTime() - b.getTime())
  return `${formatMonthDay(dates[0])} - ${formatMonthDay(dates[dates.length - 1])}`
}

function postTypeLabel(value: string | null) {
  const type = (value || '').toLowerCase()
  if (type === 'image' || type === 'still_image' || type === 'still-images') return '靜態圖'
  if (type === 'video' || type === 'short_form_video' || type === 'feed_video' || type === 'feed-videos') return '短片'
  if (type === 'carousel' || type === 'carousels') return '輪播'
  if (type === 'newsletter' || type === 'email' || type === 'emails') return '電郵'
  if (type === 'story' || type === 'stories') return '限時動態'
  return '帖子'
}

function postPlaceholderIcon(value: string | null) {
  const label = postTypeLabel(value)
  if (label === '短片') return '▶'
  if (label === '輪播') return '▣'
  if (label === '電郵') return '✉'
  if (label === '限時動態') return '◐'
  return '▧'
}

function statusView(value: string | null) {
  if (value === 'ready') return { className: 'ready', label: '待審批' }
  if (value === 'approved' || value === 'scheduled') return { className: 'approved', label: '已批准' }
  if (value === 'published') return { className: 'published', label: '已發布' }
  if (value === 'draft') return { className: 'draft', label: '生成中' }
  return { className: 'draft', label: '生成中' }
}

function postIsInWeek(post: ApprovalPost, weekStart: Date) {
  if (!post.scheduled_at) return true
  const scheduled = new Date(post.scheduled_at)
  if (Number.isNaN(scheduled.getTime())) return true
  const weekEnd = addDays(weekStart, 7)
  return scheduled >= weekStart && scheduled < weekEnd
}

function groupPosts(campaigns: CampaignRow[], posts: ApprovalPost[], weekStart: Date): CampaignGroup[] {
  const campaignsById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))
  const postsByCampaign = new Map<string, ApprovalPost[]>()

  posts
    .filter((post) => VISIBLE_STATUSES.has(post.status || ''))
    .filter((post) => postIsInWeek(post, weekStart))
    .forEach((post) => {
      if (!post.campaign_id) return
      postsByCampaign.set(post.campaign_id, [...(postsByCampaign.get(post.campaign_id) || []), post])
    })

  return Array.from(postsByCampaign.entries())
    .map(([campaignId, groupedPosts]) => ({
      campaign: campaignsById.get(campaignId) || { id: campaignId, name: '未命名活動' },
      posts: groupedPosts,
    }))
    .filter((group) => group.posts.length > 0)
}

export default function ApprovalsPage() {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [posts, setPosts] = useState<ApprovalPost[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [approvingCampaignId, setApprovingCampaignId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const groups = useMemo(() => groupPosts(campaigns, posts, weekStart), [campaigns, posts, weekStart])
  const hasAnyPosts = posts.some((post) => VISIBLE_STATUSES.has(post.status || ''))

  async function loadApprovals() {
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const sessionId = getStoredOnboardingSessionId()
      let nextWorkspaceId: string | null = null

      let campaignsQuery = supabase
        .from('marketing_campaigns')
        .select('id,name,starts_on,duration_weeks,created_at')
        .order('created_at', { ascending: false })

      if (user?.id) {
        ;({ workspaceId: nextWorkspaceId } = await resolveActiveWorkspace())
        if (!nextWorkspaceId) {
          setWorkspaceId(null)
          setCampaigns([])
          setPosts([])
          return
        }

        setWorkspaceId(nextWorkspaceId)
        campaignsQuery = campaignsQuery.eq('workspace_id', nextWorkspaceId)
      } else if (sessionId) {
        campaignsQuery = campaignsQuery.eq('onboarding_session_id', sessionId)
      } else {
        setWorkspaceId(null)
        setCampaigns([])
        setPosts([])
        return
      }

      const { data: campaignRows, error: campaignsError } = await campaignsQuery
      if (campaignsError) throw campaignsError

      const nextCampaigns = (campaignRows || []) as CampaignRow[]
      const campaignIds = nextCampaigns.map((campaign) => campaign.id)
      const postRows =
        campaignIds.length > 0
          ? await supabase
              .from('campaign_posts')
              .select('id,campaign_id,title,body,post_type,scheduled_at,image_url,status,approved_at')
              .in('campaign_id', campaignIds)
              .order('scheduled_at', { ascending: true })
          : { data: [], error: null }

      if (postRows.error) throw postRows.error
      setCampaigns(nextCampaigns)
      setPosts((postRows.data || []) as ApprovalPost[])
    } catch (error) {
      console.error('[Approvals] failed to load approvals:', error)
      setMessage('未能載入審批帖子，請重新整理頁面。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadApprovals()

    function handleWorkspaceChanged() {
      void loadApprovals()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
  }, [])

  async function approveCampaign(group: CampaignGroup) {
    if (!workspaceId) {
      setMessage('找不到目前工作台，請重新整理頁面。')
      return
    }

    const readyPosts = group.posts.filter((post) => post.status === 'ready')
    if (!readyPosts.length) {
      setMessage('此活動暫時沒有待審批帖子。')
      return
    }

    setApprovingCampaignId(group.campaign.id)
    setMessage('')

    try {
      const results = await Promise.all(
        readyPosts.map(async (post) => {
          const response = await fetch('/api/posts/publish', {
            body: JSON.stringify({ postId: post.id, workspaceId }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok && response.status !== 207) {
            throw new Error(payload?.detail || payload?.error || '批准失敗')
          }
          return payload
        })
      )

      const failed = results.filter((result) => result?.success === false).length
      setMessage(failed ? `已處理 ${readyPosts.length - failed} 個帖子，${failed} 個需要重試。` : `已批准 ${readyPosts.length} 個帖子。`)
      await loadApprovals()
      router.refresh()
    } catch (error) {
      console.error('[Approvals] approve all failed:', error)
      setMessage(error instanceof Error ? error.message : '批准失敗，請再試一次。')
    } finally {
      setApprovingCampaignId(null)
    }
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="審批" />
      <section className="approvals-shell">
        <header className="approvals-topbar">
          <h1>審批</h1>
        </header>

        <div className="approvals-body">
          <div className="approvals-intro">
            <p>管理你的待審批帖子，批准後將按排程發布。</p>
            <button type="button" onClick={() => router.push('/onboarding/content-preferences')}>
              前往內容偏好 →
            </button>
          </div>

          <div className="approvals-filterbar">
            <button
              aria-label="上一週"
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
            >
              ←
            </button>
            <strong>{formatWeekRange(weekStart)}</strong>
            <button
              aria-label="下一週"
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
            >
              →
            </button>
          </div>

          {message ? <div className="approvals-message">{message}</div> : null}

          {loading ? (
            <div className="approvals-loading">
              {[1, 2, 3].map((item) => (
                <div className="approval-skeleton" key={item} />
              ))}
            </div>
          ) : !hasAnyPosts ? (
            <section className="approvals-empty">
              <span>✓</span>
              <h2>尚未有待審批帖子</h2>
              <p>帖子生成後會在這裡顯示</p>
            </section>
          ) : groups.length === 0 ? (
            <section className="approvals-empty">
              <span>⌁</span>
              <h2>本週沒有待審批帖子</h2>
              <p>使用上方週期切換查看其他排程。</p>
            </section>
          ) : (
            <div className="approval-groups">
              {groups.map((group) => {
                const readyCount = group.posts.filter((post) => post.status === 'ready').length
                return (
                  <section className="approval-group" key={group.campaign.id}>
                    <div className="approval-group-head">
                      <div>
                        <h2>{group.campaign.name || '未命名活動'}</h2>
                        <span>{formatGroupDateRange(group.posts)}</span>
                      </div>
                      <button
                        disabled={readyCount === 0 || approvingCampaignId === group.campaign.id}
                        onClick={() => void approveCampaign(group)}
                        type="button"
                      >
                        {approvingCampaignId === group.campaign.id ? '批准中...' : `全部批准${readyCount ? ` (${readyCount})` : ''}`}
                      </button>
                    </div>

                    <div className="approval-post-row">
                      {group.posts.map((post) => {
                        const status = statusView(post.status)
                        const excerpt = post.body || post.title || 'SOON 會根據你的品牌資料生成內容。'
                        return (
                          <button
                            className="approval-card"
                            key={post.id}
                            onClick={() => router.push(`/onboarding/approvals/${post.id}`)}
                            type="button"
                          >
                            <div className="approval-card-meta">
                              <span>{postTypeLabel(post.post_type)}</span>
                              <time>{formatPostDate(post.scheduled_at)}</time>
                            </div>

                            <div className="approval-thumb-wrap">
                              {post.image_url ? (
                                <img alt="" src={post.image_url} />
                              ) : (
                                <div className={`approval-thumb-placeholder ${post.status === 'draft' ? 'draft' : ''}`}>
                                  {postPlaceholderIcon(post.post_type)}
                                </div>
                              )}
                              <span className={`approval-status ${status.className}`}>{status.label}</span>
                            </div>

                            <p>{excerpt}</p>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${approvalsStyles}` }} />
    </main>
  )
}

const approvalsStyles = `
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

  .approvals-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .approvals-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    padding: 0 20px;
  }

  .approvals-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .approvals-body {
    min-width: 0;
    padding: 24px 20px 40px;
  }

  .approvals-intro,
  .approvals-filterbar,
  .approval-group-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .approvals-intro {
    border-bottom: 1px solid #ebecef;
    padding-bottom: 18px;
  }

  .approvals-intro p {
    color: #5f636b;
    font-size: 14px;
    margin: 0;
  }

  .approvals-intro button {
    background: transparent;
    border: 0;
    color: #111111;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 0;
    white-space: nowrap;
  }

  .approvals-filterbar {
    justify-content: flex-end;
    padding: 18px 0 4px;
  }

  .approvals-filterbar button {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e7;
    border-radius: 999px;
    color: #202126;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .approvals-filterbar strong {
    color: #333740;
    font-size: 13px;
    min-width: 118px;
    text-align: center;
  }

  .approvals-message {
    background: #f7f7f8;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    color: #4b5563;
    font-size: 13px;
    margin: 12px 0 4px;
    padding: 10px 12px;
  }

  .approval-groups {
    display: flex;
    flex-direction: column;
    gap: 26px;
    margin-top: 14px;
  }

  .approval-group {
    min-width: 0;
  }

  .approval-group-head {
    border-bottom: 1px solid #ebecef;
    margin-bottom: 14px;
    padding-bottom: 12px;
  }

  .approval-group-head h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px;
  }

  .approval-group-head span {
    color: #74777f;
    font-size: 12px;
  }

  .approval-group-head button {
    background: #111111;
    border: 1px solid #111111;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 12px;
    white-space: nowrap;
  }

  .approval-group-head button:disabled {
    background: #f2f3f5;
    border-color: #e1e3e7;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .approval-post-row {
    display: flex;
    gap: 14px;
    min-width: 0;
    overflow-x: auto;
    padding: 1px 0 10px;
  }

  .approval-post-row::-webkit-scrollbar {
    height: 8px;
  }

  .approval-post-row::-webkit-scrollbar-thumb {
    background: #d8dae0;
    border-radius: 999px;
  }

  .approval-card {
    background: #ffffff;
    border: 1px solid #e6e7eb;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(32, 33, 38, 0.05);
    color: inherit;
    cursor: pointer;
    flex: 0 0 180px;
    height: 278px;
    padding: 10px;
    text-align: left;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .approval-card:hover {
    border-color: #cfd2d8;
    box-shadow: 0 14px 30px rgba(32, 33, 38, 0.09);
    transform: translateY(-1px);
  }

  .approval-card-meta {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }

  .approval-card-meta span {
    background: #f2f3f5;
    border-radius: 999px;
    color: #4b5563;
    font-size: 11px;
    font-weight: 650;
    padding: 4px 8px;
  }

  .approval-card-meta time {
    color: #74777f;
    font-size: 11px;
    white-space: nowrap;
  }

  .approval-thumb-wrap {
    aspect-ratio: 1 / 1;
    background: #f1f2f4;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  .approval-thumb-wrap img,
  .approval-thumb-placeholder {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .approval-thumb-placeholder {
    align-items: center;
    background: linear-gradient(135deg, #f7f2e8, #e7edf7);
    color: #6b7280;
    display: flex;
    font-size: 34px;
    justify-content: center;
  }

  .approval-thumb-placeholder.draft {
    animation: approvalPulse 1.4s ease-in-out infinite;
  }

  .approval-status {
    border-radius: 999px;
    bottom: 8px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    left: 8px;
    padding: 4px 8px;
    position: absolute;
  }

  .approval-status.ready {
    background: #f59e0b;
  }

  .approval-status.approved {
    background: #16a34a;
  }

  .approval-status.published {
    background: #6b7280;
  }

  .approval-status.draft {
    background: #2563eb;
    animation: approvalPulse 1.4s ease-in-out infinite;
  }

  .approval-card p {
    color: #30333a;
    display: -webkit-box;
    font-size: 13px;
    line-height: 1.45;
    margin: 10px 0 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .approvals-empty {
    align-items: center;
    border: 1px solid #e8e9ec;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(32, 33, 38, 0.05);
    display: flex;
    flex-direction: column;
    margin: 42px auto 0;
    max-width: 420px;
    padding: 34px 24px;
    text-align: center;
  }

  .approvals-empty span {
    align-items: center;
    background: #f2f3f5;
    border-radius: 999px;
    color: #4b5563;
    display: flex;
    font-size: 24px;
    height: 52px;
    justify-content: center;
    margin-bottom: 14px;
    width: 52px;
  }

  .approvals-empty h2 {
    font-size: 18px;
    margin: 0 0 8px;
  }

  .approvals-empty p {
    color: #74777f;
    font-size: 14px;
    margin: 0;
  }

  .approvals-loading {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 18px;
  }

  .approval-skeleton {
    animation: approvalPulse 1.4s ease-in-out infinite;
    background: linear-gradient(90deg, #f3f4f6, #e9ebef, #f3f4f6);
    border-radius: 14px;
    height: 190px;
  }

  @keyframes approvalPulse {
    0%, 100% {
      opacity: 0.58;
    }
    50% {
      opacity: 1;
    }
  }

  @media (max-width: 860px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .approvals-intro,
    .approval-group-head {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`
