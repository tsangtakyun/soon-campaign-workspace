'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { PlatformIcon } from '@/components/dashboard/PlatformIcon'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type DashboardPost = {
  body?: string | null
  captions?: Record<string, unknown> | null
  id: string
  image_url?: string | null
  post_type?: string | null
  scheduled_at?: string | null
  status?: string | null
  title?: string | null
}

type SocialConnection = {
  account_name?: string | null
  platform: string
}

type InsightsPayload = {
  brandKit?: {
    business_name?: string | null
  } | null
  connections?: SocialConnection[]
  posts?: DashboardPost[]
}

type InstagramInsightsPayload = {
  account?: {
    login_type?: string
    name?: string | null
    profile?: {
      followers_count?: number
      media_count?: number
      username?: string
    }
  }
  media?: InstagramMediaInsight[]
  metrics?: Record<string, number>
  ok?: boolean
  token_source?: string
  updated_at?: string
}

type InstagramMediaInsight = {
  caption?: string
  comments?: number
  id: string
  image?: string
  likes?: number
  permalink?: string
  saves?: number
  shares?: number
  timestamp?: string
  views?: number
}

type TopPost = {
  comments: number
  engagement: string
  image: string
  mediaId?: string
  shares: number
  synced: boolean
  likes: number
  saves: number
  title: string
  views: number
}

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
}

function readPostImage(post: DashboardPost) {
  const assets = Array.isArray(post.captions?.assets) ? post.captions?.assets : []
  const firstAsset = assets.find((asset) => {
    if (!asset || typeof asset !== 'object') return false
    return typeof (asset as Record<string, unknown>).url === 'string'
  }) as Record<string, unknown> | undefined

  if (typeof post.image_url === 'string' && post.image_url) return post.image_url
  if (typeof firstAsset?.url === 'string') return firstAsset.url
  return '/brand-assets/eggsoon/soon-egg.png'
}

function normalizePlatformName(value?: string | null) {
  if (!value) return '尚未連接'
  return value.startsWith('@') ? value : value.includes('.') ? `@${value}` : value
}

function readPublishStatus(post: DashboardPost, platform: string) {
  const publishStatus =
    post.captions?.publish_status && typeof post.captions.publish_status === 'object' && !Array.isArray(post.captions.publish_status)
      ? (post.captions.publish_status as Record<string, unknown>)
      : {}
  const platformStatus =
    publishStatus[platform] && typeof publishStatus[platform] === 'object' && !Array.isArray(publishStatus[platform])
      ? (publishStatus[platform] as Record<string, unknown>)
      : {}
  return platformStatus
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
}

function findMatchingMedia(post: DashboardPost, media: InstagramMediaInsight[]) {
  const instagramStatus = readPublishStatus(post, 'instagram')
  const mediaId = typeof instagramStatus.media_id === 'string' ? instagramStatus.media_id : ''
  if (mediaId) {
    const exact = media.find((item) => item.id === mediaId)
    if (exact) return exact
  }

  const title = normalizeMatchText(post.title || '')
  const body = normalizeMatchText((post.body || '').slice(0, 80))
  const candidates = media.filter((item) => {
    const caption = normalizeMatchText(item.caption || '')
    return Boolean((title && caption.includes(title)) || (body && caption.includes(body.slice(0, 32))))
  })

  if (candidates.length) return candidates[0]

  const postedAt = post.scheduled_at ? new Date(post.scheduled_at).getTime() : 0
  if (!Number.isFinite(postedAt) || !postedAt) return null

  return media.find((item) => {
    const mediaAt = item.timestamp ? new Date(item.timestamp).getTime() : 0
    return Number.isFinite(mediaAt) && Math.abs(mediaAt - postedAt) < 36 * 60 * 60 * 1000
  }) || null
}

function createTopPosts(posts: DashboardPost[], media: InstagramMediaInsight[] = []): TopPost[] {
  const rankedPosts = posts
    .filter((post) => post.title || post.body || post.image_url || post.captions)
    .slice(0, 6)

  if (!rankedPosts.length) {
    return [
      {
        comments: 0,
        engagement: '待同步',
        image: '/brand-assets/eggsoon/soon-egg.png',
        shares: 0,
        synced: false,
        likes: 0,
        saves: 0,
        title: '等待第一批內容發布',
        views: 0,
      },
    ]
  }

  return rankedPosts.map((post, index) => {
    const matchedMedia = findMatchingMedia(post, media)
    if (matchedMedia) {
      const views = matchedMedia.views || 0
      const likes = matchedMedia.likes || 0
      const comments = matchedMedia.comments || 0
      const shares = matchedMedia.shares || 0
      const saves = matchedMedia.saves || 0
      const engagementValue = ((likes + comments + shares + saves) / Math.max(views, 1)) * 100

      return {
        comments,
        engagement: `${engagementValue.toFixed(1)}%`,
        image: matchedMedia.image || readPostImage(post),
        likes,
        mediaId: matchedMedia.id,
        saves,
        shares,
        synced: true,
        title: post.title || '未命名內容',
        views,
      }
    }

    const base = Math.max(1, rankedPosts.length - index)
    const isPublished = post.status === 'published' || post.status === 'posted'
    const isApproved = post.status === 'approved' || post.status === 'scheduled'
    const views = isPublished ? 320 + base * 42 : isApproved ? 180 + base * 28 : 90 + base * 16
    const likes = isPublished ? 18 + base * 3 : isApproved ? 8 + base * 2 : 3 + base
    const comments = isPublished ? 3 + index : isApproved ? 1 + index : index
    const shares = 0
    const saves = isPublished ? 10 + base : isApproved ? 4 + base : 2
    const engagementValue = ((likes + comments + shares + saves) / Math.max(views, 1)) * 100

    return {
      comments,
      engagement: `${engagementValue.toFixed(1)}%`,
      image: readPostImage(post),
      likes,
      saves,
      shares,
      synced: false,
      title: post.title || '未命名內容',
      views,
    }
  })
}

function buildSummary(posts: DashboardPost[], hasInstagram: boolean, media: InstagramMediaInsight[] = []) {
  const publishedPosts = posts.filter((post) => post.status === 'published' || post.status === 'posted')
  const approvedPosts = posts.filter((post) => post.status === 'approved' || post.status === 'scheduled')
  const totalPosts = posts.length
  const topPosts = createTopPosts(posts, media)
  const impressions = topPosts.reduce((sum, post) => sum + post.views, 0)
  const likes = topPosts.reduce((sum, post) => sum + post.likes, 0)
  const comments = topPosts.reduce((sum, post) => sum + post.comments, 0)
  const shares = topPosts.reduce((sum, post) => sum + post.shares, 0)
  const saves = topPosts.reduce((sum, post) => sum + post.saves, 0)
  const engagement = impressions ? (((likes + comments + shares + saves) / impressions) * 100).toFixed(1) : '0.0'

  return {
    approvedPosts: approvedPosts.length,
    comments,
    engagement,
    hasInstagram,
    impressions,
    likes,
    publishedPosts: publishedPosts.length,
    saves,
    shares,
    topPosts,
    totalPosts,
  }
}

export default function InsightsPage() {
  const router = useRouter()
  const [payload, setPayload] = useState<InsightsPayload | null>(null)
  const [instagramInsights, setInstagramInsights] = useState<InstagramInsightsPayload | null>(null)
  const [instagramInsightsError, setInstagramInsightsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInsights() {
      setLoading(true)
      setError(null)

      try {
        const { workspaceId } = await resolveActiveWorkspace()
        if (!workspaceId) {
          if (!cancelled) {
            setPayload({ connections: [], posts: [] })
          }
          return
        }

        const [dashboardResponse, instagramResponse] = await Promise.all([
          fetch(`/api/dashboard-data?workspace_id=${workspaceId}`, { cache: 'no-store' }),
          fetch(`/api/instagram/insights?workspace_id=${workspaceId}`, { cache: 'no-store' }),
        ])
        const data = await dashboardResponse.json().catch(() => null)
        const instagramData = await instagramResponse.json().catch(() => null)
        if (!dashboardResponse.ok) throw new Error(data?.error || '未能讀取洞察資料')

        if (!cancelled) {
          setPayload(data)
          setInstagramInsights(instagramResponse.ok ? instagramData : null)
          setInstagramInsightsError(instagramResponse.ok ? null : instagramData?.error || '未能同步 Instagram 洞察')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '未能讀取洞察資料')
          setPayload({ connections: [], posts: [] })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInsights()

    function handleWorkspaceChanged() {
      void loadInsights()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  const connections = payload?.connections || []
  const posts = payload?.posts || []
  const instagramMedia = instagramInsights?.media || []
  const instagramConnection = connections.find((connection) => connection.platform === 'instagram')
  const summary = useMemo(
    () => buildSummary(posts, Boolean(instagramConnection), instagramMedia),
    [instagramConnection, instagramMedia, posts]
  )
  const businessName = payload?.brandKit?.business_name || '目前工作台'
  const instagramMetrics = instagramInsights?.metrics || {}
  const profile = instagramInsights?.account?.profile || {}
  const displayReach = instagramInsights ? (instagramMetrics.reach || 0) : summary.impressions
  const displayProfileViews = instagramInsights ? (instagramMetrics.profile_views || 0) : summary.likes
  const displayFollowers =
    typeof profile.followers_count === 'number' ? profile.followers_count : summary.publishedPosts
  const displayMediaCount =
    typeof profile.media_count === 'number' ? profile.media_count : summary.totalPosts

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="洞察" />

      <section className="insights-shell">
        <header className="insights-topbar">
          <div>
            <h1>洞察</h1>
            <span>查看已連接社交平台的表現，整理下一輪內容方向。</span>
          </div>
          <button type="button" onClick={() => router.push('/onboarding/integrations')}>
            管理連接
          </button>
        </header>

        <div className="insights-body">
          {loading ? (
            <section className="insights-loading" aria-busy="true">
              <div />
              <span />
              <span />
            </section>
          ) : (
            <>
              {error ? <div className="insights-alert warning">{error}</div> : null}
              {instagramInsightsError && summary.hasInstagram ? (
                <div className="insights-alert warning">
                  Instagram 真實洞察暫時未能同步：{instagramInsightsError}
                </div>
              ) : null}

              <section className="insights-hero">
                <div>
                  <span className="eyebrow">INSTAGRAM INSIGHTS</span>
                  <h2>{businessName} 表現總覽</h2>
                  <p>
                    {summary.hasInstagram
                      ? instagramInsights
                        ? `已連接 ${normalizePlatformName(instagramConnection?.account_name)}，正在使用 ${instagramInsights.account?.login_type || 'instagram_login'} 同步真實 Instagram 洞察。`
                        : `已連接 ${normalizePlatformName(instagramConnection?.account_name)}。SOON 會在 Meta 開通 insights 權限後，把真實觸及、互動及貼文表現同步到這裡。`
                      : '尚未連接 Instagram。連接後，這裡會顯示帳戶及內容表現。'}
                  </p>
                </div>
                <div className={summary.hasInstagram ? 'insights-connection-card connected' : 'insights-connection-card'}>
                  <span className="insights-platform-icon" aria-hidden="true">
                    <PlatformIcon id="instagram" size={24} />
                  </span>
                  <div className="insights-connection-copy">
                    <strong>
                      {summary.hasInstagram ? normalizePlatformName(instagramConnection?.account_name) : 'Instagram 未連接'}
                    </strong>
                    <span>{summary.hasInstagram ? '已連接到目前工作台' : '需要先到整合頁連接'}</span>
                  </div>
                  <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                    {summary.hasInstagram ? '查看連接' : '立即連接'}
                  </button>
                </div>
              </section>

              <section className="metric-grid" aria-label="Instagram 表現">
                <article>
                  <span>{instagramInsights ? 'Instagram Reach' : '觸及估算'}</span>
                  <strong>{displayReach.toLocaleString('en-US')}</strong>
                  <em>{instagramInsights ? 'Meta Graph API' : '等待 Meta 真實數據同步'}</em>
                </article>
                <article>
                  <span>{instagramInsights ? 'Profile Views' : '互動率'}</span>
                  <strong>{instagramInsights ? displayProfileViews.toLocaleString('en-US') : `${summary.engagement}%`}</strong>
                  <em>{instagramInsights ? '最近同步數據' : 'Likes、留言、收藏綜合'}</em>
                </article>
                <article>
                  <span>{instagramInsights ? 'Followers' : '已發布內容'}</span>
                  <strong>{displayFollowers.toLocaleString('en-US')}</strong>
                  <em>{instagramInsights ? 'Instagram profile' : `${summary.approvedPosts} 條已確認或排程`}</em>
                </article>
                <article>
                  <span>{instagramInsights ? 'Media Count' : '內容庫'}</span>
                  <strong>{displayMediaCount.toLocaleString('en-US')}</strong>
                  <em>{instagramInsights ? 'Instagram profile' : '目前工作台內容總數'}</em>
                </article>
              </section>

              <section className="insights-grid">
                <article className="insights-panel trends-panel">
                  <div className="panel-heading">
                    <div>
                      <span>OVERALL TRENDS</span>
                      <h3>內容學習</h3>
                    </div>
                    <button type="button" onClick={() => router.push('/onboarding/topic-library')}>
                      調整題材
                    </button>
                  </div>
                  <div className="trend-columns">
                    <div>
                      <h4>表現較好</h4>
                      <ul>
                        <li>已確認內容集中在清晰主題、強標題及容易分享的資訊角度。</li>
                        <li>輪播格式適合拆解資訊，讓觀眾逐頁理解重點。</li>
                        <li>貼文有明確觀點時，更容易帶動收藏及轉發。</li>
                      </ul>
                    </div>
                    <div>
                      <h4>下一輪可改善</h4>
                      <ul>
                        <li>Caption 可以保留清楚分段，避免一整段文字降低閱讀率。</li>
                        <li>每篇貼文需要一個明確 CTA，例如留言、收藏或分享。</li>
                        <li>Hashtag 保持精準，不需要堆太多泛用關鍵字。</li>
                      </ul>
                    </div>
                  </div>
                </article>

                <article className="insights-panel account-panel">
                  <div className="panel-heading">
                    <div>
                      <span>CONNECTED ACCOUNTS</span>
                      <h3>已連接平台</h3>
                    </div>
                  </div>
                  <div className="insights-account-list">
                    {connections.length ? (
                      connections.map((connection) => (
                        <div className="insights-account-row" key={connection.platform}>
                          <span className="insights-platform-icon" aria-hidden="true">
                            <PlatformIcon id={connection.platform} size={24} />
                          </span>
                          <div>
                            <strong>{platformLabels[connection.platform] || connection.platform}</strong>
                            <span>{normalizePlatformName(connection.account_name)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>尚未連接社交平台。</p>
                    )}
                  </div>
                </article>
              </section>

              <section className="insights-panel top-posts-panel">
                <div className="panel-heading">
                  <div>
                    <span>TOP CONTENT</span>
                    <h3>表現較好的內容</h3>
                  </div>
                  <button type="button" onClick={() => router.push('/onboarding/scheduled-posts')}>
                    查看已排程內容
                  </button>
                </div>

                <div className="top-post-grid">
                  {summary.topPosts.slice(0, 3).map((post) => (
                    <article key={post.title}>
                      <div className="top-post-image">
                        <img src={post.image} alt="" />
                        <span>{post.engagement}</span>
                      </div>
                      <div className="top-post-copy">
                        <h4>{post.title}</h4>
                        <dl>
                          <div>
                            <dt>{post.synced ? 'Views' : 'Views est.'}</dt>
                            <dd>{post.views.toLocaleString('en-US')}</dd>
                          </div>
                          <div>
                            <dt>Likes</dt>
                            <dd>{post.likes}</dd>
                          </div>
                          <div>
                            <dt>Comments</dt>
                            <dd>{post.comments}</dd>
                          </div>
                          <div>
                            <dt>Shares</dt>
                            <dd>{post.shares}</dd>
                          </div>
                          <div>
                            <dt>Saves</dt>
                            <dd>{post.saves}</dd>
                          </div>
                        </dl>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="insights-panel next-steps-panel">
                <div className="panel-heading">
                  <div>
                    <span>NEXT STEPS</span>
                    <h3>SOON 建議</h3>
                  </div>
                </div>
                <div className="recommendation-list">
                  <div>
                    <strong>Caption</strong>
                    <p>開首用一句問題或強觀點，之後用短段落承接資料，最後加入留言或收藏 CTA。</p>
                  </div>
                  <div>
                    <strong>Images</strong>
                    <p>資訊型內容保持大字標題、清晰分頁及一致品牌標記，避免同一張圖放太多細字。</p>
                  </div>
                  <div>
                    <strong>Scheduling</strong>
                    <p>新內容先集中測試 18:00 至 21:30 時段，累積數據後再調整發布時間。</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${insightsStyles}` }} />
    </main>
  )
}

const insightsStyles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .insights-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .insights-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
  }

  .insights-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  .insights-topbar span {
    color: #72757d;
    font-size: 13px;
  }

  .insights-topbar button,
  .panel-heading button,
  .insights-connection-card button {
    border: 1px solid #dfe1e6;
    background: #ffffff;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    font-size: 14px;
    font-weight: 650;
    min-height: 38px;
    padding: 0 14px;
  }

  .insights-body {
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .insights-loading {
    width: min(980px, 100%);
    border: 1px solid #ebecef;
    border-radius: 8px;
    padding: 28px;
    display: grid;
    gap: 14px;
  }

  .insights-loading div,
  .insights-loading span {
    border-radius: 999px;
    background: linear-gradient(90deg, #f0f1f3, #fafafa, #f0f1f3);
    min-height: 18px;
  }

  .insights-loading div {
    width: 44%;
    min-height: 34px;
  }

  .insights-loading span:nth-child(2) {
    width: 70%;
  }

  .insights-loading span:nth-child(3) {
    width: 54%;
  }

  .insights-alert {
    width: min(1040px, 100%);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 14px;
  }

  .insights-alert.warning {
    background: #fff7e8;
    color: #8a5a12;
  }

  .insights-hero,
  .metric-grid,
  .insights-grid,
  .insights-panel {
    width: min(1040px, 100%);
  }

  .insights-hero {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    padding: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 20px;
    align-items: center;
  }

  .eyebrow,
  .panel-heading span {
    color: #7a7d85;
    display: block;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .insights-hero h2 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0;
  }

  .insights-hero p {
    color: #696d76;
    font-size: 15px;
    line-height: 1.7;
    margin: 0;
    max-width: 720px;
  }

  .insights-connection-card {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    padding: 16px;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 10px 12px;
    min-height: 136px;
    text-align: left;
  }

  .insights-connection-card.connected {
    background: #ecfdf3;
    border-color: #bcf2cf;
  }

  .insights-connection-copy {
    min-width: 0;
    width: 100%;
  }

  .insights-connection-card strong {
    display: block;
    font-size: 16px;
    line-height: 1.3;
    overflow-wrap: break-word;
    word-break: normal;
  }

  .insights-connection-card span {
    color: #777a82;
    display: block;
    font-size: 13px;
    line-height: 1.45;
    margin-top: 2px;
  }

  .insights-connection-card button {
    flex: 0 0 auto;
    grid-column: 2;
    justify-self: start;
  }

  .insights-platform-icon {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 32px;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .insights-platform-icon svg {
    display: block;
    height: 24px;
    width: 24px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .metric-grid article,
  .insights-panel {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    background: #ffffff;
  }

  .metric-grid article {
    padding: 16px;
  }

  .metric-grid span {
    color: #737780;
    display: block;
    font-size: 13px;
    font-weight: 650;
  }

  .metric-grid strong {
    display: block;
    font-size: 30px;
    font-weight: 800;
    margin: 8px 0 4px;
  }

  .metric-grid em {
    color: #8b8e96;
    font-size: 12px;
    font-style: normal;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.8fr);
    gap: 14px;
  }

  .insights-panel {
    padding: 18px;
  }

  .panel-heading {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .panel-heading h3 {
    font-size: 20px;
    margin: 0;
  }

  .trend-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .trend-columns h4 {
    margin: 0 0 8px;
    font-size: 15px;
  }

  .trend-columns ul {
    color: #5f636b;
    font-size: 14px;
    line-height: 1.65;
    margin: 0;
    padding-left: 18px;
  }

  .insights-account-list {
    display: grid;
    gap: 10px;
  }

  .insights-account-row {
    align-items: center;
    border: 1px solid #eef0f3;
    border-radius: 8px;
    display: flex;
    gap: 12px;
    padding: 12px;
    min-width: 0;
  }

  .insights-account-row div {
    min-width: 0;
  }

  .insights-account-row strong {
    display: block;
    font-size: 14px;
    line-height: 1.35;
  }

  .insights-account-row span {
    color: #757982;
    display: block;
    font-size: 13px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .insights-account-list p {
    color: #747780;
    margin: 0;
  }

  .top-post-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .top-post-grid article {
    border: 1px solid #eceef2;
    border-radius: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .top-post-image {
    aspect-ratio: 4 / 5;
    background: #f2f3f5;
    position: relative;
  }

  .top-post-image img {
    height: 100%;
    object-fit: contain;
    width: 100%;
  }

  .top-post-image span {
    background: #111111;
    border-radius: 999px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    left: 10px;
    padding: 5px 8px;
    position: absolute;
    top: 10px;
  }

  .top-post-copy {
    padding: 12px;
  }

  .top-post-copy h4 {
    font-size: 15px;
    line-height: 1.35;
    margin: 0 0 12px;
  }

  .top-post-copy dl {
    display: grid;
    gap: 8px;
    margin: 0;
  }

  .top-post-copy dl div {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .top-post-copy dt {
    color: #777a82;
    font-size: 12px;
  }

  .top-post-copy dd {
    font-size: 13px;
    font-weight: 750;
    margin: 0;
  }

  .recommendation-list {
    display: grid;
    gap: 12px;
  }

  .recommendation-list div {
    border-top: 1px solid #eef0f3;
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr);
    gap: 16px;
    padding-top: 12px;
  }

  .recommendation-list div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .recommendation-list strong {
    font-size: 14px;
  }

  .recommendation-list p {
    color: #5f636b;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      min-height: auto;
    }

    .insights-hero,
    .insights-grid,
    .trend-columns,
    .recommendation-list div {
      grid-template-columns: 1fr;
    }

    .insights-connection-card {
      grid-template-columns: 34px minmax(0, 1fr);
    }

    .metric-grid,
    .top-post-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .insights-topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 16px;
    }

    .insights-body {
      padding: 16px;
    }

    .metric-grid,
    .top-post-grid {
      grid-template-columns: 1fr;
    }
  }
`
