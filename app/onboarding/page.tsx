'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  type WorkspaceSummary,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'

type HomePost = {
  id: string
  sourceKey?: string
  type: string
  typeKind: 'image' | 'article' | 'video'
  title: string
  body: string
  time: string
  image: string | null
  status: string
}

type HomeCampaign = {
  id: string
  name: string
  type: string
  timing: string
  status: string
  statusKind: 'generating' | 'done'
  image: string | null
}

const fallbackUpcomingPosts: HomePost[] = [
  {
    id: '1',
    type: '靜態圖片',
    typeKind: 'image',
    title: '差點沒拍下來的片段',
    body: '最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。',
    time: '今天 10:00',
    image: '/photo-control/coffee-full-freedom.jpg',
    status: '新內容',
  },
  {
    id: '2',
    type: '文章',
    typeKind: 'article',
    title: '一個簡單房間，幾段短片，突然就值得重播',
    body: '和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。',
    time: '今天 14:00',
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    status: '新內容',
  },
  {
    id: '3',
    type: '短影片',
    typeKind: 'video',
    title: '今天值得留下的一秒',
    body: '晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。',
    time: '今天 18:00',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    status: '草稿',
  },
]

const fallbackCampaigns: HomeCampaign[] = [
  {
    id: '1',
    name: 'Moms, Memories, and Moments That Matter',
    type: '生活內容',
    timing: '5月10日 - 5月16日',
    status: '今日生成中',
    statusKind: 'generating',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
  },
  {
    id: '2',
    name: '差點沒拍下來的片段',
    type: '分享日常',
    timing: '5月1日 - 5月8日',
    status: '已完成',
    statusKind: 'done',
    image: '/photo-control/coffee-full-freedom.jpg',
  },
]

const TRIAL_CREDITS = 200

function formatDashboardTime(value: unknown) {
  if (typeof value !== 'string') return '今天 10:00'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '今天 10:00'

  const today = new Date()
  const time = date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `今天 ${time}`
  }
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

function formatDashboardDate(value: unknown) {
  if (typeof value !== 'string') return '準備中'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '準備中'
  return `${date.getMonth() + 1}月${date.getDate()}日開始`
}

function mapPostType(type: unknown): Pick<HomePost, 'type' | 'typeKind'> {
  if (type === 'emails' || type === 'email' || type === 'blog') return { type: '電郵內容', typeKind: 'article' }
  if (type === 'carousels' || type === 'carousel') return { type: '輪播貼文', typeKind: 'image' }
  if (type === 'feed-videos' || type === 'video') return { type: '動態影片', typeKind: 'video' }
  if (type === 'short-form-video') return { type: '短影片', typeKind: 'video' }
  if (type === 'stories') return { type: '限時動態', typeKind: 'image' }
  return { type: '靜態圖片', typeKind: 'image' }
}

function mapPostStatus(status: unknown) {
  return status === 'draft' ? '草稿' : '新內容'
}

function mapCampaignStatus(status: unknown): Pick<HomeCampaign, 'status' | 'statusKind'> {
  if (status === 'completed') return { status: '已完成', statusKind: 'done' }
  if (status === 'posting') return { status: '發布中', statusKind: 'generating' }
  return { status: '今日生成中', statusKind: 'generating' }
}

function isPlaceholderImage(value: string | null) {
  return !value || value.startsWith('data:image/svg+xml') || value.includes('placeholder')
}

const upNext = [
  {
    icon: '↯',
    title: '連接你的帳戶',
    desc: '連接後 SOON 可以自動按排程發布你的內容',
    cta: '立即連接',
    href: '/onboarding/integrations',
  },
  {
    icon: '◎',
    title: '設定 SEO 計劃',
    desc: '選擇關鍵詞，自動生成 SEO 內容集群',
    cta: '開始設定',
    href: '/onboarding/seo',
  },
  {
    icon: '▻',
    title: '試試短影片',
    desc: '上傳素材，SOON 自動剪輯成短片',
    cta: '了解更多',
    href: '/onboarding/content-preferences?type=short-form-video',
  },
]

export default function OnboardingHomePage() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [dashboardPosts, setDashboardPosts] = useState<HomePost[]>([])
  const [dashboardCampaigns, setDashboardCampaigns] = useState<HomeCampaign[]>([])
  const [connectedSocialAccount, setConnectedSocialAccount] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const hasGeneratingImagesRef = useRef(false)
  const generatingPostIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setDashboardLoading(true)
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()
        let workspaceId: string | null = null
        let activeWorkspaceName: string | null = null

        if (!user?.id && !sessionId) {
          if (!cancelled) {
            setDashboardPosts([])
            setDashboardCampaigns([])
            setCreditBalance(TRIAL_CREDITS)
            setDashboardLoading(false)
          }
          return
        }

        if (user?.id) {
          const storedWorkspaceId = getActiveWorkspaceId()
          const workspaceResponse = await fetch('/api/workspaces', { cache: 'no-store' })
          const workspacePayload = await workspaceResponse.json().catch(() => null)
          const workspaceData = Array.isArray(workspacePayload?.workspaces)
            ? (workspacePayload.workspaces as WorkspaceSummary[])
            : []

          const activeWorkspace =
            workspaceData.find((workspace) => workspace.id === storedWorkspaceId) ||
            workspaceData[0] ||
            null

          workspaceId = activeWorkspace?.id || null
          activeWorkspaceName = activeWorkspace?.brandName || activeWorkspace?.name || null

          console.log('[dashboard] active workspace debug', {
            userId: user.id,
            storedWorkspaceId,
            workspaceId,
            activeWorkspace,
            workspaceCount: workspaceData.length,
          })

          if (workspaceId && storedWorkspaceId !== workspaceId) {
            setActiveWorkspaceId(workspaceId)
          }

        }

        let postsQuery = supabase
          .from('campaign_posts')
          .select('id,campaign_id,title,body,post_type,scheduled_at,image_url,status,source_key,marketing_campaigns(name,strategy_emoji)')
          .order('scheduled_at', { ascending: true })
          .limit(30)

        let campaignsQuery = supabase
          .from('marketing_campaigns')
          .select('id,name,strategy_title,strategy_emoji,starts_on,status')
          .order('created_at', { ascending: false })
          .limit(5)

        let brandKitQuery = supabase.from('brand_kits').select('business_name,logo_url')
        let connectionsQuery = supabase
          .from('social_connections')
          .select('platform,account_name')
          .order('connected_at', { ascending: false })
          .limit(1)
        let creditsQuery = supabase.from('user_credits').select('balance')

        if (user?.id) {
          if (workspaceId) {
            postsQuery = postsQuery.eq('workspace_id', workspaceId)
            campaignsQuery = campaignsQuery.eq('workspace_id', workspaceId)
            brandKitQuery = brandKitQuery.eq('workspace_id', workspaceId)
            connectionsQuery = connectionsQuery.eq('workspace_id', workspaceId)
          } else {
            postsQuery = postsQuery.eq('user_id', user.id)
            campaignsQuery = campaignsQuery.eq('user_id', user.id)
            brandKitQuery = brandKitQuery.eq('user_id', user.id)
            connectionsQuery = connectionsQuery.eq('user_id', user.id)
          }
          creditsQuery = creditsQuery.eq('user_id', user.id)
        } else if (sessionId) {
          postsQuery = postsQuery.eq('onboarding_session_id', sessionId)
          campaignsQuery = campaignsQuery.eq('onboarding_session_id', sessionId)
          brandKitQuery = brandKitQuery.eq('onboarding_session_id', sessionId)
          connectionsQuery = connectionsQuery.eq('onboarding_session_id', sessionId)
        }

        const [
          { data: postsData, error: postsError },
          { data: campaignsData, error: campaignsError },
          { data: brandKitData },
          { data: connectionsData },
          { data: creditsData },
        ] =
          await Promise.all([
            postsQuery,
            campaignsQuery,
            brandKitQuery.maybeSingle(),
            connectionsQuery,
            user?.id ? creditsQuery.maybeSingle() : Promise.resolve({ data: null }),
          ])

        if (cancelled) return

        setBrandName(brandKitData?.business_name || activeWorkspaceName || '')

        if (connectionsData?.length) {
          const connection = connectionsData[0]
          setConnectedSocialAccount(
            connection.account_name
              ? `${connection.platform === 'instagram' ? 'Instagram' : connection.platform}：@${connection.account_name}`
              : connection.platform
          )
        } else {
          setConnectedSocialAccount(null)
        }

        if (typeof creditsData?.balance === 'number') {
          setCreditBalance(creditsData.balance)
        } else {
          setCreditBalance(TRIAL_CREDITS)
        }

        if (!postsError && postsData?.length) {
          const postsMissingImages = postsData.filter((post: any) => isPlaceholderImage(post.image_url || null))
          const firstWeekMissingImages = postsMissingImages.filter((post: any) =>
            String(post.source_key || '').startsWith('campaign-1-')
          )
          const displayPosts = postsData
            .filter((post: any) => {
              const sourceKey = String(post.source_key || '')
              return sourceKey.startsWith('campaign-1-') || !isPlaceholderImage(post.image_url || null)
            })
            .slice(0, 10)

          hasGeneratingImagesRef.current = firstWeekMissingImages.length > 0
          setDashboardPosts(
            displayPosts.map((post: any, index: number) => {
              const type = mapPostType(post.post_type)
              return {
                id: post.id,
                sourceKey: post.source_key,
                ...type,
                title: post.title || fallbackUpcomingPosts[index % fallbackUpcomingPosts.length].title,
                body: post.body || fallbackUpcomingPosts[index % fallbackUpcomingPosts.length].body,
                time: formatDashboardTime(post.scheduled_at),
                image: isPlaceholderImage(post.image_url || null) ? null : post.image_url,
                status: mapPostStatus(post.status),
              }
            })
          )

          if (firstWeekMissingImages.length) {
            void (async () => {
              for (const post of firstWeekMissingImages) {
                if (cancelled || typeof post.id !== 'string') return
                if (generatingPostIdsRef.current.has(post.id)) continue

                generatingPostIdsRef.current.add(post.id)
                try {
                  console.log('[dashboard] generating missing post image:', {
                    postId: post.id,
                    sourceKey: post.source_key,
                  })
                  const response = await fetch('/api/generate-post-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: post.id }),
                  })
                  const result = await response.json().catch(() => ({}))
                  if (!response.ok) {
                    console.warn('[dashboard] post image generation failed:', {
                      postId: post.id,
                      result,
                    })
                  }
                } catch (error) {
                  console.warn('[dashboard] post image generation error:', {
                    postId: post.id,
                    error,
                  })
                } finally {
                  generatingPostIdsRef.current.delete(post.id)
                }
              }

              if (!cancelled) void loadDashboard()
            })()
          }
        } else {
          hasGeneratingImagesRef.current = false
          setDashboardPosts([])
        }

        if (!campaignsError && campaignsData?.length) {
          const campaignImages = new Map<string, string>()
          postsData?.forEach((post: any) => {
            if (
              typeof post.campaign_id === 'string' &&
              typeof post.image_url === 'string' &&
              !isPlaceholderImage(post.image_url) &&
              !campaignImages.has(post.campaign_id)
            ) {
              campaignImages.set(post.campaign_id, post.image_url)
            }
          })

          setDashboardCampaigns(
            campaignsData.map((campaign: any, index: number) => {
              const status = mapCampaignStatus(campaign.status)
              return {
                id: campaign.id,
                name: campaign.name || fallbackCampaigns[index % fallbackCampaigns.length].name,
                type: campaign.strategy_title || '生活內容',
                timing: formatDashboardDate(campaign.starts_on),
                image: campaignImages.get(campaign.id) || null,
                ...status,
              }
            })
          )
        } else {
          setDashboardCampaigns([])
        }
      } catch (error) {
        console.error('[dashboard] failed to load dashboard data:', error)
        if (!cancelled) {
          hasGeneratingImagesRef.current = false
          setDashboardPosts([])
          setDashboardCampaigns([])
        }
      } finally {
        if (!cancelled) setDashboardLoading(false)
      }
    }

    void loadDashboard()

    function handleWorkspaceChanged() {
      hasGeneratingImagesRef.current = false
      generatingPostIdsRef.current.clear()
      void loadDashboard()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    const pollId = window.setInterval(() => {
      if (hasGeneratingImagesRef.current) void loadDashboard()
    }, 10000)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
      window.clearInterval(pollId)
    }
  }, [])

  const displayedCredits = creditBalance ?? TRIAL_CREDITS

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="首頁" />

      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar-left">
            <h1>歡迎回來，{brandName || '你的工作台'}</h1>
          </div>
          <div className="home-topbar-right">
            <button
              className={`credits-badge ${displayedCredits < 50 ? 'warning' : ''}`}
              onClick={() => router.push('/pricing')}
              type="button"
            >
              {dashboardLoading ? '載入 credits...' : `✦ ${displayedCredits} credits 剩餘`}
            </button>
            <button type="button" className="upgrade-button">
              升級
            </button>
          </div>
        </header>

        <div className={`connect-banner ${connectedSocialAccount ? 'connected' : ''}`}>
          {dashboardLoading ? (
            <span>正在載入你的工作台...</span>
          ) : connectedSocialAccount ? (
            <>
              <span>✓ 已連接 {connectedSocialAccount}。SOON 可以在發布權限開通後按排程自動發布。</span>
              <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                管理
              </button>
            </>
          ) : (
            <>
              <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
              <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                連接
              </button>
            </>
          )}
        </div>

        <div className="home-body">
          <section className="home-main">
            <section className="home-section">
              <div className="home-section-head">
                <h2>即將發布</h2>
                <div className="home-section-actions">
                  <button type="button" onClick={() => router.push('/onboarding/scheduled-posts')}>
                    查看全部內容
                  </button>
                  <button type="button" className="home-create-btn">
                    ＋ 建立
                  </button>
                </div>
              </div>

              <div className="upcoming-posts-list">
                {dashboardLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <article key={`post-skeleton-${index}`} className="upcoming-post-card upcoming-post-card-skeleton">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line tiny" />
                      <div className="skeleton-line title" />
                      <div className="skeleton-line body" />
                      <div className="upcoming-post-img generating">
                        <span aria-hidden="true" />
                      </div>
                    </article>
                  ))
                ) : dashboardPosts.length ? (
                  dashboardPosts.map((post) => (
                  <article
                    key={post.id}
                    className="upcoming-post-card"
                    onClick={() => router.push('/onboarding/scheduled-posts')}
                  >
                    <div className="upcoming-post-card-top">
                      <span className={`post-type-badge ${post.typeKind}`}>{post.type}</span>
                      <button
                        className="upcoming-post-edit-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          router.push('/onboarding/scheduled-posts')
                        }}
                      >
                        編輯
                      </button>
                    </div>
                    <span className="upcoming-post-time">{post.time}</span>
                    <div className="upcoming-post-content">
                      <h3>{post.title}</h3>
                      <p>{post.body}</p>
                    </div>
                    <div className={`upcoming-post-img ${post.image ? 'ready' : 'generating'}`}>
                      {post.image ? <img src={post.image} alt="" /> : <span aria-label="圖片生成中" />}
                    </div>
                  </article>
                  ))
                ) : (
                  <div className="dashboard-empty-state">
                    <strong>暫時未有即將發布的內容</strong>
                    <span>完成 onboarding 後，這裡會顯示每一篇準備發布的內容。</span>
                  </div>
                )}
              </div>
            </section>

            <section className="home-section">
              <div className="home-section-head">
                <h2>宣傳活動</h2>
                <button type="button" onClick={() => router.push('/onboarding/scheduled-posts')}>
                  查看全部活動
                </button>
              </div>
              <div className="campaigns-table">
                <div className="campaigns-table-head">
                  <span>活動</span>
                  <span>時間</span>
                  <span>狀態</span>
                  <span />
                </div>
                {dashboardLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={`campaign-skeleton-${index}`} className="campaign-row campaign-row-skeleton">
                      <div className="campaign-info">
                        <span className="campaign-thumb skeleton-block" />
                        <div>
                          <span className="skeleton-line title" />
                          <span className="skeleton-line tiny" />
                        </div>
                      </div>
                      <span className="skeleton-line tiny" />
                      <span className="skeleton-pill" />
                      <span />
                    </div>
                  ))
                ) : dashboardCampaigns.length ? (
                  dashboardCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="campaign-row"
                    onClick={() => router.push('/onboarding/scheduled-posts')}
                  >
                    <div className="campaign-info">
                      {campaign.image ? (
                        <img src={campaign.image} alt="" className="campaign-thumb" />
                      ) : (
                        <span className="campaign-thumb campaign-thumb-placeholder" aria-hidden="true" />
                      )}
                      <div>
                        <strong>{campaign.name}</strong>
                        <span>🎯 {campaign.type}</span>
                      </div>
                    </div>
                    <span className="campaign-timing">{campaign.timing}</span>
                    <span className={`campaign-status ${campaign.statusKind}`}>{campaign.status}</span>
                    <button
                      type="button"
                      className="campaign-arrow"
                      aria-label="查看活動"
                      onClick={(event) => {
                        event.stopPropagation()
                        router.push('/onboarding/scheduled-posts')
                      }}
                    >
                      ›
                    </button>
                  </div>
                  ))
                ) : (
                  <div className="campaign-empty-row">
                    完成 onboarding 後，這裡會顯示你的宣傳活動。
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="home-aside">
            <section className="home-aside-section">
              <h3>過去 7 天</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">0</span>
                  <span className="stat-label">已發布貼文</span>
                </div>
              </div>
              <p className="stats-hint">連接帳戶後即可查看數據分析</p>
            </section>

            <section className="home-aside-section">
              <h3>下一步</h3>
              <div className="up-next-list">
                {upNext.map((item) => (
                  <div key={item.title} className="up-next-item">
                    <div className="up-next-icon">{item.icon}</div>
                    <div className="up-next-content">
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                      <a href={item.href}>{item.cta} →</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${homeStyles}` }} />
    </main>
  )
}

const homeStyles = `
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

  .home-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar-left h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .home-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .credits-badge {
    border: 0;
    background: transparent;
    font-size: 14px;
    color: #202126;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }

  .credits-badge.warning {
    color: #b91c1c;
    font-weight: 650;
  }

  .upgrade-button {
    border: 1px solid #7c3aed;
    border-radius: 9px;
    background: #ffffff;
    color: #7c3aed;
    font: inherit;
    font-size: 14px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .connect-banner {
    min-height: 46px;
    background: #fff7e8;
    border-bottom: 1px solid #f5e5c7;
    color: #4d4030;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
    font-size: 14px;
  }

  .connect-banner.connected {
    background: #f0fdf4;
    border-bottom-color: #d1fae5;
    color: #065f46;
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .connect-banner.connected button {
    background: #065f46;
  }

  .home-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
    padding: 28px 20px 60px;
    gap: 28px;
  }

  .home-main {
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .home-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .home-section-head h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
  }

  .home-section-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .home-section-head button,
  .home-section-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 12px;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .home-section-head button:hover,
  .home-section-actions button:hover {
    background: #f5f5f7;
  }

  .home-create-btn {
    background: #111111 !important;
    color: #ffffff !important;
    border-color: #111111 !important;
  }

  .upcoming-posts-list {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 2px 12px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .upcoming-posts-list::-webkit-scrollbar {
    height: 8px;
  }

  .upcoming-posts-list::-webkit-scrollbar-thumb {
    background: #d7d9df;
    border-radius: 99px;
  }

  .upcoming-posts-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .upcoming-post-card {
    position: relative;
    display: flex;
    flex: 0 0 220px;
    width: 220px;
    height: 320px;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    background: #ffffff;
    transition: box-shadow 150ms ease, border-color 150ms ease;
    cursor: pointer;
    overflow: hidden;
    scroll-snap-align: start;
  }

  .upcoming-post-card:hover {
    border-color: #c8c9ce;
    box-shadow: 0 4px 16px rgba(32, 33, 38, 0.06);
  }

  .upcoming-post-card-skeleton {
    cursor: default;
  }

  .upcoming-post-card-skeleton:hover {
    border-color: #e8e9ec;
    box-shadow: none;
  }

  .skeleton-line,
  .skeleton-block,
  .skeleton-pill {
    display: block;
    background: linear-gradient(90deg, #f1f2f4 0%, #ffffff 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: image-skeleton 1.2s ease-in-out infinite;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 99px;
    width: 100%;
  }

  .skeleton-line.short {
    width: 72px;
  }

  .skeleton-line.tiny {
    width: 92px;
  }

  .skeleton-line.title {
    width: 80%;
    height: 16px;
  }

  .skeleton-line.body {
    width: 100%;
    height: 34px;
    border-radius: 8px;
  }

  .skeleton-block {
    background-color: #f1f2f4;
  }

  .skeleton-pill {
    width: 82px;
    height: 24px;
    border-radius: 999px;
  }

  .dashboard-empty-state {
    min-height: 180px;
    flex: 1 0 320px;
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 24px;
    color: #6f737d;
  }

  .dashboard-empty-state strong {
    color: #202126;
    font-size: 14px;
  }

  .dashboard-empty-state span {
    font-size: 13px;
    line-height: 1.5;
  }

  .upcoming-post-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
  }

  .upcoming-post-edit-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    border: 1px solid #e2e3e7;
    border-radius: 7px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 9px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 6px 16px rgba(32, 33, 38, 0.1);
    transition: opacity 150ms ease, background 150ms ease;
  }

  .upcoming-post-card:hover .upcoming-post-edit-btn,
  .upcoming-post-edit-btn:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .upcoming-post-edit-btn:hover {
    background: #f5f5f7;
  }

  .upcoming-post-img {
    width: 100%;
    height: 150px;
    margin-top: auto;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #f3f4f6;
  }

  .upcoming-post-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    animation: image-fade-in 220ms ease both;
  }

  .upcoming-post-img.generating {
    position: relative;
  }

  .upcoming-post-img.generating span {
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #f1f2f4 0%, #ffffff 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: image-skeleton 1.2s ease-in-out infinite;
  }

  @keyframes image-skeleton {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  @keyframes image-fade-in {
    from { opacity: 0; transform: scale(1.015); }
    to { opacity: 1; transform: scale(1); }
  }

  .upcoming-post-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .post-type-badge {
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .post-type-badge::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type-badge.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-type-badge.video::before {
    content: '▶';
    color: #7c3aed;
  }

  .upcoming-post-time {
    font-size: 12px;
    color: #6f737d;
  }

  .post-status-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 600;
  }

  .post-status-badge.new {
    background: #7c3aed;
    color: #ffffff;
  }

  .post-status-badge.draft {
    background: #f1f2f4;
    color: #6f737d;
  }

  .upcoming-post-content h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.28;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 38px;
  }

  .upcoming-post-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .campaigns-table {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .campaigns-table-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 10px 16px;
    background: #f8f8f9;
    border-bottom: 1px solid #e8e9ec;
    font-size: 12px;
    font-weight: 600;
    color: #6f737d;
  }

  .campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid #f0f1f3;
    transition: background 150ms;
    cursor: pointer;
  }

  .campaign-row:last-child {
    border-bottom: none;
  }

  .campaign-row:hover {
    background: #fafafa;
  }

  .campaign-row-skeleton {
    cursor: default;
  }

  .campaign-row-skeleton:hover {
    background: #ffffff;
  }

  .campaign-row-skeleton .campaign-info > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 180px;
  }

  .campaign-empty-row {
    padding: 22px 16px;
    font-size: 13px;
    color: #6f737d;
    background: #ffffff;
  }

  .campaign-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .campaign-thumb {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .campaign-thumb-placeholder {
    display: inline-flex;
    border: 1px solid #e8e9ec;
    background:
      linear-gradient(135deg, rgba(212, 168, 67, 0.16), rgba(32, 33, 38, 0.04)),
      #f7f7f8;
  }

  .campaign-info strong {
    display: block;
    font-size: 13px;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-info span,
  .campaign-timing {
    font-size: 12px;
    color: #6f737d;
  }

  .campaign-status {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .campaign-status.generating {
    background: #fef3c7;
    color: #92400e;
  }

  .campaign-status.done {
    background: #d1fae5;
    color: #065f46;
  }

  .campaign-arrow {
    border: 0;
    background: transparent;
    color: #9a9da4;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
  }

  .home-aside {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .home-aside-section {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .home-aside-section h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 650;
  }

  .stats-grid {
    display: flex;
    gap: 16px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #202126;
  }

  .stat-label,
  .stats-hint {
    font-size: 12px;
    color: #6f737d;
  }

  .stats-hint {
    margin: 0;
    color: #9a9da4;
    line-height: 1.4;
  }

  .up-next-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .up-next-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .up-next-icon {
    font-size: 18px;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f5f7;
    border-radius: 8px;
  }

  .up-next-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .up-next-content strong {
    font-size: 13px;
    font-weight: 650;
  }

  .up-next-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
  }

  .up-next-content a {
    width: fit-content;
    border: 0;
    background: transparent;
    color: #7c3aed;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
    margin-top: 2px;
    text-decoration: none;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .home-body {
      grid-template-columns: 1fr;
    }

    .campaigns-table-head,
    .campaign-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`
