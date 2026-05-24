'use client'

import { type MouseEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type CampaignListItem = {
  cover_image_url?: string | null
  id: string
  source_key?: string | null
  name: string
  strategy_emoji: string | null
  strategy_title: string | null
  starts_on: string | null
  duration_weeks: number | null
  kol_open?: boolean | null
  status: string
  thumbnail_url?: string | null
  posts?: CampaignPostSummary[]
}

type CampaignPostSummary = {
  campaign_id: string | null
  id: string
  image_url: string | null
  scheduled_at: string | null
  status: string | null
}

type CampaignStatusView = {
  kind: 'future' | 'generating' | 'review' | 'scheduled' | 'completed' | 'failed'
  label: string
}

const BANNER_DISMISSED_KEY = 'soon-campaigns-social-banner-dismissed'

function daysUntil(startsOn: string | null) {
  if (!startsOn) return 0
  const start = new Date(`${startsOn}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((start.getTime() - today.getTime()) / 86400000)
}

function campaignStatusView(campaign: CampaignListItem): CampaignStatusView {
  if (campaign.status === 'failed') return { kind: 'failed', label: '失敗' }

  const days = daysUntil(campaign.starts_on)
  if (days > 0) return { kind: 'future', label: `${days} 日後開始生成` }

  const posts = campaign.posts || []
  const reviewCount = posts.filter((post) => ['ready', 'draft'].includes(post.status || '') && post.image_url).length
  if (reviewCount > 0) return { kind: 'review', label: `${reviewCount} 個帖子待審批` }

  const generatingCount = posts.filter((post) => !post.image_url || ['generating', 'draft'].includes(post.status || '')).length
  if (campaign.status === 'generating' || generatingCount > 0) {
    return { kind: 'generating', label: `${Math.max(generatingCount, posts.length || 1)} 個帖子生成中` }
  }

  const scheduledCount = posts.filter((post) => ['approved', 'scheduled'].includes(post.status || '')).length
  if (campaign.status === 'posting' || scheduledCount > 0) return { kind: 'scheduled', label: '排程發布中' }

  const completed = posts.length > 0 && posts.every((post) => ['published', 'posted', 'completed'].includes(post.status || ''))
  if (campaign.status === 'completed' || completed) return { kind: 'completed', label: '已完成' }

  return { kind: 'generating', label: `${posts.length || 1} 個帖子生成中` }
}

function formatDateRange(startsOn: string | null, durationWeeks: number | null) {
  if (!startsOn) return '—'
  const start = new Date(startsOn)
  if (Number.isNaN(start.getTime())) return '—'
  const end = new Date(start)
  end.setDate(end.getDate() + (durationWeeks ?? 1) * 7 - 1)
  const fmt = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`
  return `${fmt(start)} - ${fmt(end)}`
}

function dedupeCampaigns(items: CampaignListItem[]) {
  const seen = new Set<string>()
  const result: CampaignListItem[] = []

  items.forEach((item) => {
    const key = item.source_key || `${item.name}-${item.starts_on || ''}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(item)
  })

  return result
}

function categoryGradient(campaign: CampaignListItem) {
  const seed = `${campaign.strategy_title || ''}${campaign.name}`.toLowerCase()
  if (seed.includes('教育') || seed.includes('educ')) return 'educational'
  if (seed.includes('生活') || seed.includes('life')) return 'lifestyle'
  if (seed.includes('品牌') || seed.includes('brand')) return 'brand'
  return 'default'
}

function KolOpenToggle({
  campaign,
  onUpdate,
}: {
  campaign: CampaignListItem
  onUpdate: (campaignId: string, kolOpen: boolean) => void
}) {
  const [enabled, setEnabled] = useState(campaign.kol_open ?? false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEnabled(campaign.kol_open ?? false)
  }, [campaign.kol_open])

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setLoading(true)

    const nextEnabled = !enabled

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ kol_open: nextEnabled })
        .eq('id', campaign.id)

      if (error) throw error

      setEnabled(nextEnabled)
      onUpdate(campaign.id, nextEnabled)
    } catch (error) {
      console.error('[Campaigns] failed to update kol_open:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="kol-open-toggle" onClick={(event) => event.stopPropagation()}>
      <span>開放 KOL 申請</span>
      <button
        aria-label={enabled ? '關閉 KOL 申請' : '開放 KOL 申請'}
        className={`kol-open-switch ${enabled ? 'enabled' : ''}`}
        disabled={loading}
        onClick={(event) => void toggle(event)}
        type="button"
      >
        <span />
      </button>
      {enabled ? <em>已開放</em> : null}
    </div>
  )
}

export default function CampaignsPage() {
  const router = useRouter()
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  const [showSocialBanner, setShowSocialBanner] = useState(false)
  const [workspaceMissing, setWorkspaceMissing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCampaigns() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()
        let workspaceId: string | null = null

        const campaignSelect =
          'id,source_key,name,strategy_emoji,strategy_title,starts_on,duration_weeks,status,created_at,cover_image_url,kol_open'
        const fallbackCampaignSelect =
          'id,source_key,name,strategy_emoji,strategy_title,starts_on,duration_weeks,status,created_at'
        let query = supabase
          .from('marketing_campaigns')
          .select(campaignSelect)
          .order('starts_on', { ascending: true })
          .order('created_at', { ascending: false })

        if (user?.id) {
          ;({ workspaceId } = await resolveActiveWorkspace())
          const validWorkspaceId = typeof workspaceId === 'string' && workspaceId.trim().length > 0
          if (!cancelled) setActiveWorkspaceIdState(validWorkspaceId ? workspaceId : null)

          if (!validWorkspaceId) {
            console.log('[Campaigns] fetching skipped, workspaceId not resolved:', workspaceId)
            if (!cancelled) setCampaigns([])
            if (!cancelled) setWorkspaceMissing(true)
            return
          }

          console.log('[Campaigns] fetching with workspaceId:', workspaceId)
          if (!cancelled) setWorkspaceMissing(false)
          query = query.eq('workspace_id', workspaceId)
        } else if (sessionId) {
          console.log('[Campaigns] fetching with onboarding session:', sessionId)
          query = query.eq('onboarding_session_id', sessionId)
        } else {
          if (!cancelled) setWorkspaceMissing(true)
          return
        }

        const campaignResult = await query
        let data = (campaignResult.data || []) as CampaignListItem[]
        let error = campaignResult.error

        if (error && (error.message || '').includes('cover_image_url')) {
          console.warn('[campaigns] cover_image_url column unavailable, falling back to post thumbnails:', error)
          let fallbackQuery = supabase
            .from('marketing_campaigns')
            .select(fallbackCampaignSelect)
            .order('starts_on', { ascending: true })
            .order('created_at', { ascending: false })

          if (user?.id && workspaceId) {
            fallbackQuery = fallbackQuery.eq('workspace_id', workspaceId)
          } else if (sessionId) {
            fallbackQuery = fallbackQuery.eq('onboarding_session_id', sessionId)
          }

          const fallbackResult = await fallbackQuery
          data = (fallbackResult.data || []) as CampaignListItem[]
          error = fallbackResult.error
        }

        if (!cancelled && !error) {
          const deduped = dedupeCampaigns(data || [])
          const campaignIds = deduped.map((campaign) => campaign.id)
          const { data: postRows } = campaignIds.length
            ? await supabase
                .from('campaign_posts')
                .select('id,campaign_id,status,scheduled_at,image_url')
                .in('campaign_id', campaignIds)
            : { data: [] }
          const postsByCampaign = new Map<string, CampaignPostSummary[]>()
          ;((postRows || []) as CampaignPostSummary[]).forEach((post) => {
            if (!post.campaign_id) return
            postsByCampaign.set(post.campaign_id, [...(postsByCampaign.get(post.campaign_id) || []), post])
          })

          setCampaigns(
            deduped.map((campaign) => {
              const posts = postsByCampaign.get(campaign.id) || []
              return {
                ...campaign,
                posts,
                thumbnail_url:
                  campaign.cover_image_url ||
                  posts.find((post) => post.image_url)?.image_url ||
                  null,
              }
            })
          )
        }

        if (user?.id) {
          const [{ data: creditData }, { count: connectionCount }] = await Promise.all([
            supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle(),
            workspaceId
              ? supabase
                  .from('social_connections')
                  .select('id', { count: 'exact', head: true })
                  .eq('workspace_id', workspaceId)
              : Promise.resolve({ count: 0 }),
          ])

          if (!cancelled && typeof creditData?.balance === 'number') setCreditBalance(creditData.balance)
          const dismissed =
            typeof window !== 'undefined' && window.localStorage.getItem(BANNER_DISMISSED_KEY) === '1'
          if (!cancelled) setShowSocialBanner(!dismissed && (connectionCount || 0) === 0)
        }
      } catch {
        // Keep fallback content when Supabase has no rows or the user is not signed in.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCampaigns()

    function handleWorkspaceChanged() {
      setLoading(true)
      setLoadingTimedOut(false)
      setWorkspaceMissing(false)
      void loadCampaigns()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  useEffect(() => {
    if (!loading || activeWorkspaceId || campaigns.length > 0) return undefined

    const timeout = window.setTimeout(() => {
      if (!activeWorkspaceId && campaigns.length === 0) {
        setLoading(false)
        setLoadingTimedOut(true)
      }
    }, 5000)

    return () => window.clearTimeout(timeout)
  }, [activeWorkspaceId, campaigns.length, loading])

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="宣傳活動" />
      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar-left">
            <h1>內容計劃</h1>
          </div>
          <div className="home-topbar-right">
            <span className="header-credits">{creditBalance === null ? '...' : creditBalance} credits 剩餘</span>
            <button type="button" className="upgrade-plan-btn" onClick={() => router.push('/pricing')}>
              升級方案
            </button>
            <button type="button" className="home-create-btn" onClick={() => router.push('/onboarding/campaign-details')}>
              ＋ 建立新活動
            </button>
          </div>
        </header>

        <div className="campaigns-page-body">
          {showSocialBanner ? (
            <div className="social-connect-banner">
              <span>你的帖子尚未自動發布。連接你的社交媒體帳號以啟用自動發布功能。</span>
              <div>
                <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                  立即連接
                </button>
                <button
                  aria-label="關閉提示"
                  className="banner-close"
                  onClick={() => {
                    window.localStorage.setItem(BANNER_DISMISSED_KEY, '1')
                    setShowSocialBanner(false)
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          ) : null}
          {(loadingTimedOut || workspaceMissing) && campaigns.length === 0 ? (
            <div className="campaigns-empty-state">
              <strong>未能載入宣傳活動，請重新整理頁面</strong>
              <button type="button" onClick={() => window.location.reload()}>
                重新整理
              </button>
            </div>
          ) : loading ? (
            <div className="campaigns-loading">
              {[1, 2, 3].map((item) => (
                <div key={item} className="campaign-row-skeleton" />
              ))}
            </div>
          ) : (
            <div className="campaigns-table">
              <div className="campaigns-table-head">
                <span>活動</span>
                <span>時間</span>
                <span>狀態</span>
                <span>KOL 申請</span>
                <span />
              </div>
              {campaigns.map((campaign) => {
                const status = campaignStatusView(campaign)
                return (
                  <div
                    key={campaign.id}
                    className="campaign-row"
                    onClick={() => router.push(`/onboarding/campaigns/${campaign.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') router.push(`/onboarding/campaigns/${campaign.id}`)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="campaign-info">
                      {campaign.thumbnail_url ? (
                        <img
                          src={campaign.thumbnail_url}
                          alt=""
                          className="campaign-thumb"
                        />
                      ) : (
                        <div className={`campaign-thumb-placeholder ${categoryGradient(campaign)}`}>
                          <span>{campaign.strategy_emoji ?? '✦'}</span>
                        </div>
                      )}
                    <div>
                      <strong>{campaign.name}</strong>
                      <span>
                        {campaign.strategy_emoji ?? '🎯'} {campaign.strategy_title ?? '生活內容'}
                      </span>
                    </div>
                  </div>
                  <span className="campaign-timing">
                    {formatDateRange(campaign.starts_on, campaign.duration_weeks)}
                  </span>
                  <span className={`campaign-status ${status.kind}`}>
                    {status.label}
                  </span>
                  <KolOpenToggle
                    campaign={campaign}
                    onUpdate={(campaignId, kolOpen) => {
                      setCampaigns((current) =>
                        current.map((item) => (item.id === campaignId ? { ...item, kol_open: kolOpen } : item))
                      )
                    }}
                  />
                  <button type="button" className="campaign-arrow" aria-label="查看活動">
                    ›
                  </button>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${campaignsStyles}` }} />
    </main>
  )
}

const campaignsStyles = `
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

  .header-credits {
    color: #4b4f57;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .upgrade-plan-btn {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 550;
    padding: 7px 12px;
    white-space: nowrap;
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

  .campaigns-page-body {
    padding: 28px 20px;
  }

  .social-connect-banner {
    align-items: center;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
    color: #78350f;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    margin-bottom: 18px;
    padding: 12px 14px;
  }

  .social-connect-banner span {
    font-size: 13px;
    line-height: 1.45;
  }

  .social-connect-banner div {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: 8px;
  }

  .social-connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 10px;
  }

  .social-connect-banner .banner-close {
    background: transparent;
    color: #92400e;
    font-size: 18px;
    height: 30px;
    line-height: 1;
    padding: 0;
    width: 30px;
  }

  .campaigns-loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .campaigns-empty-state {
    align-items: center;
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    color: #4b4f57;
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
    min-height: 220px;
    padding: 32px 20px;
    text-align: center;
  }

  .campaigns-empty-state strong {
    color: #202126;
    font-size: 14px;
    font-weight: 600;
  }

  .campaigns-empty-state button {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 550;
    padding: 8px 14px;
  }

  .campaign-row-skeleton {
    height: 70px;
    border-radius: 10px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .campaigns-table {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .campaigns-table-head,
  .campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 170px 190px 32px;
    gap: 12px;
    align-items: center;
  }

  .campaigns-table-head {
    padding: 10px 16px;
    background: #f8f8f9;
    border-bottom: 1px solid #e8e9ec;
    font-size: 12px;
    font-weight: 600;
    color: #6f737d;
  }

  .campaign-row {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f1f3;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .campaign-row:last-child {
    border-bottom: none;
  }

  .campaign-row:hover {
    background: #fafafa;
  }

  .campaign-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .campaign-thumb {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .campaign-thumb-placeholder {
    align-items: center;
    border-radius: 8px;
    color: #111111;
    display: grid;
    flex-shrink: 0;
    font-size: 19px;
    height: 44px;
    justify-items: center;
    width: 44px;
  }

  .campaign-thumb-placeholder.educational {
    background: linear-gradient(135deg, #dbeafe, #fef3c7);
  }

  .campaign-thumb-placeholder.lifestyle {
    background: linear-gradient(135deg, #dcfce7, #fce7f3);
  }

  .campaign-thumb-placeholder.brand {
    background: linear-gradient(135deg, #fde68a, #e0e7ff);
  }

  .campaign-thumb-placeholder.default {
    background: linear-gradient(135deg, #f1f5f9, #fde68a);
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
    width: fit-content;
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .campaign-status.review {
    background: #fef3c7;
    color: #92400e;
  }

  .campaign-status.generating,
  .campaign-status.scheduled {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .campaign-status.completed {
    background: #d1fae5;
    color: #065f46;
  }

  .campaign-status.future {
    background: #f1f2f4;
    color: #6f737d;
  }

  .campaign-status.failed {
    background: #fee2e2;
    color: #991b1b;
  }

  .kol-open-toggle {
    align-items: center;
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  .kol-open-toggle > span {
    color: #6f737d;
    font-size: 12px;
    white-space: nowrap;
  }

  .kol-open-toggle em {
    color: #7c3aed;
    font-size: 12px;
    font-style: normal;
    white-space: nowrap;
  }

  .kol-open-switch {
    background: #d1d5db;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    height: 20px;
    padding: 0;
    position: relative;
    transition: background 150ms ease;
    width: 40px;
  }

  .kol-open-switch:disabled {
    cursor: wait;
    opacity: 0.5;
  }

  .kol-open-switch.enabled {
    background: #7c3aed;
  }

  .kol-open-switch span {
    background: #ffffff;
    border-radius: 999px;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
    height: 16px;
    left: 2px;
    position: absolute;
    top: 2px;
    transform: translateX(0);
    transition: transform 150ms ease;
    width: 16px;
  }

  .kol-open-switch.enabled span {
    transform: translateX(20px);
  }

  .campaign-arrow {
    border: 0;
    background: transparent;
    color: #9a9da4;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .campaigns-table-head,
    .campaign-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .home-topbar,
    .home-topbar-right,
    .social-connect-banner {
      align-items: stretch;
      flex-direction: column;
    }

    .home-topbar {
      padding: 14px 20px;
    }

    .home-topbar-right {
      width: 100%;
    }

    .social-connect-banner div {
      justify-content: space-between;
    }
  }
`
