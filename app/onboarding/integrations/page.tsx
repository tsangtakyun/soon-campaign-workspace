'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { PlatformIcon } from '@/components/dashboard/PlatformIcon'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getOrCreateOnboardingSessionId, getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace, setActiveWorkspaceId, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

const TRACKING_PLATFORMS = [
  { id: 'google-analytics', label: 'Google Analytics', order: 1, unavailable: true },
]

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', order: 1 },
  { id: 'facebook', label: 'Facebook', order: 2 },
  { id: 'threads', label: 'Threads', order: 3 },
  { id: 'youtube', label: 'YouTube', order: 4, unavailable: true },
]

const ALL_PLATFORMS = [...TRACKING_PLATFORMS, ...SOCIAL_PLATFORMS]
const AVAILABLE_SOCIAL_PLATFORMS = SOCIAL_PLATFORMS.filter((platform) => !platform.unavailable)

type SocialConnection = {
  account_id?: string
  account_name?: string
  connected_at?: string
  platform: string
  workspace_id?: string
}

function ProgressCircle({ connected, total }: { connected: number; total: number }) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  const ratio = total > 0 ? connected / total : 0
  const offset = circumference * (1 - ratio)

  return (
    <div className="integrations-progress-circle" aria-label={`${connected}/${total} connected`}>
      <svg className="progress-ring" viewBox="0 0 64 64" width="64" height="64">
        <circle className="progress-ring-track" cx="32" cy="32" r={radius} />
        <circle
          className="progress-ring-fill"
          cx="32"
          cy="32"
          r={radius}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span>{connected}/{total}</span>
    </div>
  )
}

function IntegrationLoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="integration-loading-list" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="integration-loading-row" key={index}>
          <i />
          <span />
          <strong />
        </div>
      ))}
    </div>
  )
}

export default function IntegrationsPage() {
  const router = useRouter()
  const settingsPopoverRef = useRef<HTMLDivElement | null>(null)
  const [connections, setConnections] = useState<Record<string, SocialConnection>>({})
  const [connecting, setConnecting] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [showInstagramModal, setShowInstagramModal] = useState(false)
  const [showFacebookModal, setShowFacebookModal] = useState(false)
  const [showThreadsModal, setShowThreadsModal] = useState(false)
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({})
  const [settingsOpenPlatform, setSettingsOpenPlatform] = useState<string | null>(null)
  const [autoRepliesEnabled, setAutoRepliesEnabled] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const connectedCount = AVAILABLE_SOCIAL_PLATFORMS.filter((platform) => connections[platform.id]).length

  useEffect(() => {
    let cancelled = false

    async function loadConnections() {
      setConnectionsLoading(true)
      try {
        const supabase = createClient()
        const { workspaceId } = await resolveActiveWorkspace()
        const sessionId = getStoredOnboardingSessionId()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let query = supabase
          .from('social_connections')
          .select('platform,account_name,account_id,connected_at,workspace_id')

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId)
        } else if (user?.id) {
          query = query.eq('user_id', user.id).is('workspace_id', null)
        } else if (sessionId) {
          query = query.eq('onboarding_session_id', sessionId)
        } else {
          setConnections({})
          return
        }

        const { data } = await query
        const nextConnections: Record<string, SocialConnection> = {}
        ;(data || []).forEach((connection) => {
          nextConnections[connection.platform] = connection
        })
        if (!cancelled) setConnections(nextConnections)
      } catch (err) {
        console.warn('[integrations] failed to load connections:', err)
      } finally {
        if (!cancelled) setConnectionsLoading(false)
      }
    }

    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const warning = params.get('warning')
    const connected = params.get('connected')
    const callbackWorkspaceId = params.get('workspaceId')
    const hasCallbackParams = Boolean(error || warning || connected || callbackWorkspaceId)

    if (callbackWorkspaceId) {
      setActiveWorkspaceId(callbackWorkspaceId)
    }

    if (connected === 'instagram') {
      setNotice({ kind: 'success', text: 'Instagram 已連接；自動發布需待 Meta 開通發布權限後啟用。' })
    } else if (connected === 'facebook') {
      setNotice({ kind: 'success', text: 'Facebook 專頁已連接。' })
    } else if (connected === 'threads') {
      setNotice({ kind: 'success', text: 'Threads 已連接。' })
    } else if (connected === 'youtube') {
      setNotice({ kind: 'success', text: 'YouTube 頻道已連接。' })
    } else if (connected === 'google-analytics') {
      setNotice({ kind: 'success', text: 'Google Analytics 已連接。' })
    } else if (connected === 'facebook_profile' || warning === 'no_pages') {
      setNotice({
        kind: 'warning',
        text: 'Facebook 帳戶已授權，但暫時未取得可管理的 Facebook Page。請在授權畫面勾選 Page，或確認你是該 Page 的管理員。',
      })
    } else if (connected === 'facebook_page' || warning === 'no_instagram_business') {
      setNotice({
        kind: 'warning',
        text: 'Facebook Page 已連接，但暫時未偵測到 Instagram Business Account。請確認 Instagram 已連接到該 Page；發布權限開通後即可發布。',
      })
    } else if (error === 'no_pages') {
      setNotice({ kind: 'error', text: '未找到可用 Facebook Page。請確認你有管理 Page 的權限。' })
    } else if (error === 'callback_failed') {
      setNotice({ kind: 'error', text: '連接流程未完成，請稍後再試。' })
    } else if (error === 'oauth_failed') {
      setNotice({ kind: 'error', text: '你取消了授權，或 Meta 未完成授權。' })
    } else if (error === 'facebook_auth_failed') {
      setNotice({ kind: 'error', text: 'Facebook 專頁連接流程未完成，請稍後再試。' })
    } else if (error === 'threads_auth_failed') {
      setNotice({ kind: 'error', text: 'Threads 連接流程未完成，請稍後再試。' })
    } else if (error === 'no_youtube_channel') {
      setNotice({ kind: 'error', text: '未找到可用 YouTube 頻道。請確認你的 Google 帳號已建立 YouTube 頻道。' })
    } else if (error === 'youtube_auth_failed') {
      setNotice({ kind: 'error', text: 'YouTube 連接流程未完成，請稍後再試。' })
    } else if (error === 'no_google_analytics_account') {
      setNotice({ kind: 'error', text: '未找到可用 Google Analytics 帳戶。請確認你的 Google 帳號有 GA 權限。' })
    } else if (error === 'google_analytics_auth_failed') {
      setNotice({ kind: 'error', text: 'Google Analytics 連接流程未完成，請稍後再試。' })
    }

    if (hasCallbackParams) {
      const cleanParams = new URLSearchParams(window.location.search)
      ;['connected', 'error', 'warning', 'workspaceId'].forEach((key) => cleanParams.delete(key))
      const nextSearch = cleanParams.toString()
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      )
    }

    void loadConnections()

    function handleWorkspaceChanged() {
      setConnections({})
      void loadConnections()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  useEffect(() => {
    function closeSettingsPopover(event: MouseEvent) {
      if (
        settingsPopoverRef.current &&
        event.target instanceof Node &&
        !settingsPopoverRef.current.contains(event.target)
      ) {
        setSettingsOpenPlatform(null)
      }
    }

    document.addEventListener('mousedown', closeSettingsPopover)
    return () => document.removeEventListener('mousedown', closeSettingsPopover)
  }, [])

  async function handleConnect(platform: string) {
    if (!ALL_PLATFORMS.some((item) => item.id === platform)) return
    setConnecting(platform)

    try {
      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId && platform !== 'youtube') {
        setNotice({ kind: 'error', text: '未找到目前工作台，請先重新整理或選擇工作台。' })
        setConnecting(null)
        return
      }

      if (platform === 'youtube') {
        const sessionId = getOrCreateOnboardingSessionId() || ''
        const params = new URLSearchParams({ sessionId })
        if (workspaceId) params.set('workspaceId', workspaceId)
        window.location.href = `/api/auth/${platform}?${params.toString()}`
        return
      }

      window.location.href = `/api/auth/${platform}?workspaceId=${encodeURIComponent(workspaceId || '')}`
    } catch (err) {
      console.warn(`[integrations] failed to start ${platform} OAuth:`, err)
      setNotice({ kind: 'error', text: '未能開始連接流程，請稍後再試。' })
      setConnecting(null)
    }
  }

  async function disconnectConnection(platform: string) {
    setDisconnecting(true)
    try {
      const supabase = createClient()
      const { workspaceId } = await resolveActiveWorkspace()
      const sessionId = getStoredOnboardingSessionId()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let query = supabase.from('social_connections').delete().eq('platform', platform)
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      } else if (user?.id) {
        query = query.eq('user_id', user.id).is('workspace_id', null)
      } else if (sessionId) {
        query = query.eq('onboarding_session_id', sessionId)
      } else {
        throw new Error('Missing user or onboarding session')
      }

      const { error } = await query
      if (error) throw error
      window.location.reload()
    } catch (err) {
      console.warn(`[integrations] failed to disconnect ${platform}:`, err)
      setNotice({ kind: 'error', text: '未能解除連接，請稍後再試。' })
      setDisconnecting(false)
    }
  }

  function accountInitial(name?: string) {
    return (name || 'SOON').trim().charAt(0).toUpperCase()
  }

  function accountDisplayName(platformId: string, connection: SocialConnection) {
    const name = connection.account_name || platformId
    return platformId === 'instagram' || platformId === 'threads' ? `@${name}` : name
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="整合" />

      <section className="home-shell">
        <header className="home-topbar">
          <h1>整合</h1>
        </header>

        <div className="integrations-body max-w-2xl mx-auto w-full">
          {notice ? (
            <div className={`integration-notice ${notice.kind}`}>
              {notice.text}
            </div>
          ) : null}

          <div className="integrations-header-card">
            <div className="integrations-header-left">
              <h2>連接你的帳戶以自動化行銷</h2>
              <p>SOON 發布你的內容、從效果中學習，並根據這些洞察生成內容。</p>
              {!connectionsLoading ? (
                <span className="integrations-header-note">
                  已連接 {connectedCount}/{AVAILABLE_SOCIAL_PLATFORMS.length} 個社交帳戶；Google Analytics 與 YouTube 暫未開放。
                </span>
              ) : null}
            </div>
            {connectionsLoading ? (
              <div className="integrations-progress-loading" aria-label="正在載入連接狀態" />
            ) : (
              <ProgressCircle connected={connectedCount} total={AVAILABLE_SOCIAL_PLATFORMS.length} />
            )}
          </div>

          <div className="integration-security-card" role="note">
            <span className="integration-security-icon" aria-hidden="true">✓</span>
            <div>
              <strong>由帳戶擁有人安全連接</strong>
              <p>
                請由客戶本人透過 Meta 官方頁面登入及授權。SOON 不會取得或保存 Facebook／Instagram
                密碼，只會連接客戶揀選嘅 Page、Instagram 專業帳戶及廣告帳戶。
              </p>
              <small>每個工作台嘅連接互相獨立，客戶亦可以隨時解除授權。</small>
            </div>
          </div>

          <section className="integrations-section">
            <h3>網站流量</h3>
            {connectionsLoading ? <IntegrationLoadingRows count={1} /> : TRACKING_PLATFORMS.map((platform) => {
              const connection = connections[platform.id]
              return (
                <div className={connection ? 'integration-row connected' : 'integration-row'} key={platform.id}>
                  <span className="integration-icon">
                    <PlatformIcon id={platform.id} />
                  </span>
                  <span className="integration-label">{platform.label}</span>
                  {platform.unavailable ? (
                    <>
                      <span className="integration-unavailable-badge">暫未開放</span>
                      <button className="integration-connect-btn primary" disabled type="button">
                        未開放
                      </button>
                    </>
                  ) : connection ? (
                    <>
                      <span className="integration-connected-name">{connection.account_name || platform.label}</span>
                      <span className="integration-connected-badge">✓ 已連接</span>
                      <button
                        className="integration-disconnect-btn"
                        disabled={disconnecting}
                        onClick={() => disconnectConnection(platform.id)}
                        type="button"
                      >
                        {disconnecting ? '斷開中...' : '斷開連接'}
                      </button>
                    </>
                  ) : (
                    <button
                      className="integration-connect-btn primary"
                      disabled={connecting === platform.id}
                      onClick={() => handleConnect(platform.id)}
                      type="button"
                    >
                      {connecting === platform.id ? '連接中...' : 'Connect'}
                    </button>
                  )}
                </div>
              )
            })}
          </section>

          <section className="integrations-section">
            <h3>加入你的宣傳活動</h3>
            <p className="integration-desc">我們會根據宣傳活動預設，為你的帳戶創建並發布內容。</p>

            <div className="integrations-sub-section">
              <p className="integrations-sub-label">社交媒體</p>
              {connectionsLoading ? <IntegrationLoadingRows count={4} /> : SOCIAL_PLATFORMS.map((platform, index) => {
                const connection = connections[platform.id]
                const isConnectedExpandable = Boolean(connection)
                const isExpanded = Boolean(expandedPlatforms[platform.id])
                const previousPlatformsConnected = SOCIAL_PLATFORMS.slice(0, index).every(
                  (item) => connections[item.id]
                )
                const isNextRecommended = !connection && previousPlatformsConnected

                if (isConnectedExpandable) {
                  return (
                    <div className="integration-row connected" key={platform.id}>
                        <span className="integration-order">{platform.order}</span>
                        <span className="integration-icon">
                          <PlatformIcon id={platform.id} />
                        </span>
                        <span className="integration-label">{platform.label}</span>
                        <span className="integration-connected-badge">✓ 已連接</span>
                        <span className="connected-account-summary">
                          <span className="connected-account-avatar mini" aria-hidden="true">
                            {accountInitial(connection.account_name)}
                          </span>
                          <span>{accountDisplayName(platform.id, connection)}</span>
                        </span>
                        <button
                          className="integration-disconnect-btn"
                          disabled={disconnecting}
                          onClick={() => disconnectConnection(platform.id)}
                          type="button"
                        >
                          {disconnecting ? '斷開中...' : '斷開連接'}
                        </button>
                    </div>
                  )
                }

                return (
                  <div
                    className={
                      connection
                        ? 'integration-row connected'
                        : isNextRecommended
                          ? 'integration-row next-up'
                          : 'integration-row'
                    }
                    key={platform.id}
                  >
                    <span className="integration-order">{platform.order}</span>
                    <span className="integration-icon">
                      <PlatformIcon id={platform.id} />
                    </span>
                    <span className="integration-label">{platform.label}</span>
                    {platform.unavailable ? (
                      <>
                        <span className="integration-unavailable-badge">暫未開放</span>
                        <button className="integration-connect-btn primary" disabled type="button">
                          未開放
                        </button>
                      </>
                    ) : connection ? (
                      <>
                        <span className="integration-connected-name">@{connection.account_name || platform.label}</span>
                        <span className="integration-connected-badge">✓ 已連接</span>
                      </>
                    ) : (
                      <>
                        {isNextRecommended ? <span className="integration-next-badge">下一步 →</span> : null}
                        <button
                          className="integration-connect-btn primary"
                          disabled={connecting === platform.id}
                          onClick={() => {
                            if (platform.id === 'instagram') {
                              setShowInstagramModal(true)
                              return
                            }
                            if (platform.id === 'facebook') {
                              setShowFacebookModal(true)
                              return
                            }
                            if (platform.id === 'threads') {
                              setShowThreadsModal(true)
                              return
                            }
                            if (platform.id === 'youtube') {
                              setShowYouTubeModal(true)
                              return
                            }
                            setNotice({ kind: 'warning', text: `${platform.label} 連接功能即將推出。` })
                          }}
                          type="button"
                        >
                          {connecting === platform.id
                            ? '連接中...'
                            : platform.id === 'instagram' || platform.id === 'facebook'
                              ? '由客戶登入授權'
                              : 'Connect'}
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

          </section>
        </div>
      </section>

      {showInstagramModal ? (
        <div className="ig-modal-overlay" onClick={() => setShowInstagramModal(false)}>
          <div className="ig-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="ig-modal-close"
              onClick={() => setShowInstagramModal(false)}
              type="button"
            >
              ✕
            </button>

            <div className="ig-modal-header">
              <div className="ig-modal-icon-wrap">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" aria-hidden="true">
                  <defs>
                    <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="5%" stopColor="#fdf497" />
                      <stop offset="45%" stopColor="#fd5949" />
                      <stop offset="60%" stopColor="#d6249f" />
                      <stop offset="90%" stopColor="#285AEB" />
                    </radialGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
                  <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
                </svg>
              </div>
              <h2>連接 Instagram Business 帳戶</h2>
            </div>

            <div className="ig-modal-instructions">
              <div className="ig-modal-instructions-header">
                <span>🔒</span>
                <strong>請由帳戶擁有人親自完成</strong>
              </div>

              <p className="ig-modal-privacy-note">
                請勿將 Instagram 或 Facebook 密碼交俾 SOON 或其他人。下一步會前往 Meta
                官方頁面，SOON 不會取得或保存密碼。
              </p>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">1</span>
                <div>
                  <p>連接前請確保以下三個條件都已滿足：</p>
                  <ul className="ig-modal-checklist">
                    <li>
                      你的 Instagram 帳戶係 <strong>Business 帳戶</strong>（唔係個人帳戶）
                    </li>
                    <li>
                      你的 Instagram 帳戶已連接一個 <strong>Facebook 專頁</strong>
                    </li>
                    <li>
                      你的 Facebook 帳戶係該專頁的<strong>管理員</strong>，擁有完整控制權
                    </li>
                  </ul>
                  <p className="ig-modal-note">唔確定點設定？點擊下方「查看設定指引」。</p>

                </div>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">2</span>
                <div>
                  <p>
                    由帳戶擁有人點擊下方按鈕，透過 Meta 官方授權頁面登入，並只揀選要連接到目前工作台嘅
                    Facebook Page、Instagram 專業帳戶及廣告帳戶。
                  </p>
                </div>
              </div>
            </div>

            <div className="ig-modal-footer">
              <button
                className="ig-modal-back-btn"
                onClick={() => setShowInstagramModal(false)}
                type="button"
              >
                返回
              </button>
              <button
                className="ig-modal-go-btn"
                onClick={() => {
                  setShowInstagramModal(false)
                  handleConnect('instagram')
                }}
                type="button"
              >
                由客戶登入 Meta 並授權 ↗
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFacebookModal ? (
        <div className="ig-modal-overlay" onClick={() => setShowFacebookModal(false)}>
          <div className="ig-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="ig-modal-close"
              onClick={() => setShowFacebookModal(false)}
              type="button"
            >
              ✕
            </button>

            <div className="ig-modal-header">
              <div className="ig-modal-icon-wrap">
                <PlatformIcon id="facebook" />
              </div>
              <h2>連接 Facebook 商業專頁</h2>
            </div>

            <div className="ig-modal-instructions">
              <div className="ig-modal-instructions-header">
                <span>🔒</span>
                <strong>請由帳戶擁有人親自完成</strong>
              </div>

              <p className="ig-modal-privacy-note">
                請勿將 Facebook 密碼交俾 SOON 或其他人。下一步會前往 Meta 官方頁面，SOON
                不會取得或保存密碼。
              </p>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">1</span>
                <div>
                  <p>確保你的 Facebook 專頁已設定為商業專頁，並且你是該專頁的管理員。</p>
                  <p className="ig-modal-note">注意：個人 Facebook 帳號無法連接，必須是專頁管理員。</p>
                </div>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">2</span>
                <div>
                  <p>
                    由帳戶擁有人點擊下方按鈕，在 Meta 官方頁面登入並揀選要連接到目前工作台嘅
                    Facebook Page；完成後會自動返回 SOON。
                  </p>
                </div>
              </div>
            </div>

            <div className="ig-modal-footer">
              <button
                className="ig-modal-back-btn"
                onClick={() => setShowFacebookModal(false)}
                type="button"
              >
                返回
              </button>
              <button
                className="ig-modal-go-btn"
                onClick={() => {
                  setShowFacebookModal(false)
                  handleConnect('facebook')
                }}
                type="button"
              >
                由客戶登入 Meta 並授權
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showThreadsModal ? (
        <div className="ig-modal-overlay" onClick={() => setShowThreadsModal(false)}>
          <div className="ig-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="ig-modal-close"
              onClick={() => setShowThreadsModal(false)}
              type="button"
            >
              ✕
            </button>

            <div className="ig-modal-header">
              <div className="ig-modal-icon-wrap">
                <PlatformIcon id="threads" />
              </div>
              <h2>連接 Threads 帳號</h2>
            </div>

            <div className="ig-modal-instructions">
              <div className="ig-modal-instructions-header">
                <span>⚠️</span>
                <strong>連接前請確認</strong>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">1</span>
                <div>
                  <p>確保你的 Threads 帳號已連結至 Instagram，並已切換為創作者或商業帳號。</p>
                </div>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">2</span>
                <div>
                  <p>點擊下方按鈕，系統會跳轉至 Threads 進行授權，完成後會自動返回。</p>
                </div>
              </div>
            </div>

            <div className="ig-modal-footer">
              <button
                className="ig-modal-back-btn"
                onClick={() => setShowThreadsModal(false)}
                type="button"
              >
                返回
              </button>
              <button
                className="ig-modal-go-btn"
                onClick={() => {
                  setShowThreadsModal(false)
                  handleConnect('threads')
                }}
                type="button"
              >
                前往 Threads 授權
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showYouTubeModal ? (
        <div className="ig-modal-overlay" onClick={() => setShowYouTubeModal(false)}>
          <div className="ig-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="ig-modal-close"
              onClick={() => setShowYouTubeModal(false)}
              type="button"
            >
              ✕
            </button>

            <div className="ig-modal-header">
              <div className="ig-modal-icon-wrap">
                <PlatformIcon id="youtube" />
              </div>
              <h2>連接 YouTube 頻道</h2>
            </div>

            <div className="ig-modal-instructions">
              <div className="ig-modal-instructions-header">
                <span>⚠️</span>
                <strong>連接前請確認</strong>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">1</span>
                <div>
                  <p>確保你的 Google 帳號已建立 YouTube 頻道，並擁有上傳影片的權限。</p>
                </div>
              </div>

              <div className="ig-modal-step">
                <span className="ig-modal-step-num">2</span>
                <div>
                  <p>點擊下方按鈕，系統會跳轉至 Google 進行授權，完成後會自動返回。</p>
                </div>
              </div>
            </div>

            <div className="ig-modal-footer">
              <button
                className="ig-modal-back-btn"
                onClick={() => setShowYouTubeModal(false)}
                type="button"
              >
                返回
              </button>
              <button
                className="ig-modal-go-btn"
                onClick={() => {
                  setShowYouTubeModal(false)
                  handleConnect('youtube')
                }}
                type="button"
              >
                前往 Google 授權
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

  .home-topbar h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }

  .integrations-body {
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .max-w-2xl {
    max-width: 672px;
  }

  .mx-auto {
    margin-left: auto;
    margin-right: auto;
  }

  .w-full {
    width: 100%;
  }

  .integrations-header-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f8f9;
    border: 1px solid #e8e9ec;
    border-radius: 14px;
    padding: 24px;
    gap: 20px;
  }

  .integration-notice {
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.45;
    padding: 12px 14px;
  }

  .integration-notice.success {
    background: #f0fdf4;
    border: 1px solid #d1fae5;
    color: #065f46;
  }

  .integration-notice.warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
  }

  .integration-notice.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .integrations-header-left h2 {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  .integrations-header-left p,
  .integration-desc {
    margin: 0 0 14px;
    font-size: 13px;
    color: #6f737d;
    line-height: 1.5;
  }

  .integrations-header-note {
    display: block;
    color: #4b5563;
    font-size: 12px;
    line-height: 1.45;
  }

  .integration-security-card {
    align-items: flex-start;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 12px;
    color: #14532d;
    display: flex;
    gap: 12px;
    padding: 16px;
  }

  .integration-security-icon {
    align-items: center;
    background: #15803d;
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    flex: 0 0 24px;
    font-size: 13px;
    font-weight: 800;
    height: 24px;
    justify-content: center;
  }

  .integration-security-card strong {
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .integration-security-card p {
    font-size: 13px;
    line-height: 1.55;
    margin: 0 0 4px;
  }

  .integration-security-card small {
    color: #3f6212;
    display: block;
    font-size: 12px;
    line-height: 1.45;
  }

  .integrations-progress-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    color: #202126;
    position: relative;
  }

  .integrations-progress-circle span {
    position: absolute;
  }

  .integrations-progress-loading {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    flex-shrink: 0;
    background:
      radial-gradient(circle at center, #f8f8f9 0 46%, transparent 47%),
      conic-gradient(from 0deg, #e7e8eb, #f7f7f8, #e7e8eb);
    animation: integrationsPulse 1.2s ease-in-out infinite;
  }

  .integration-loading-list {
    display: grid;
    gap: 8px;
  }

  .integration-loading-row {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e7e8eb;
    border-radius: 10px;
    display: grid;
    gap: 12px;
    grid-template-columns: 36px 1fr 120px;
    min-height: 56px;
    padding: 10px 14px;
  }

  .integration-loading-row i,
  .integration-loading-row span,
  .integration-loading-row strong {
    display: block;
    border-radius: 999px;
    background: linear-gradient(90deg, #f1f2f4 0%, #fbfbfc 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: integrationsSkeleton 1.2s ease-in-out infinite;
  }

  .integration-loading-row i {
    height: 28px;
    width: 28px;
  }

  .integration-loading-row span {
    height: 15px;
    width: min(180px, 70%);
  }

  .integration-loading-row strong {
    height: 34px;
    width: 100%;
  }

  @keyframes integrationsSkeleton {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  @keyframes integrationsPulse {
    0%, 100% { opacity: 0.72; }
    50% { opacity: 1; }
  }

  .progress-ring {
    transform: rotate(-90deg);
  }

  .progress-ring-track,
  .progress-ring-fill {
    fill: none;
    stroke-width: 6;
  }

  .progress-ring-track {
    stroke: #e8e9ec;
  }

  .progress-ring-fill {
    animation: progress-draw 800ms ease-out both;
    stroke: #16a34a;
    stroke-linecap: round;
  }

  @keyframes progress-draw {
    from {
      stroke-dashoffset: 157.07963267948966;
    }
  }

  .integrations-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .integrations-section h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    padding-bottom: 10px;
    border-bottom: 1px solid #e8e9ec;
  }

  .integrations-sub-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .integrations-sub-label {
    font-size: 12px;
    font-weight: 600;
    color: #9a9da4;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .integration-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    background: #ffffff;
  }

  .integration-row.next-up {
    border-color: #202126;
  }

  .integration-row.connected {
    background: #f0fdf4;
    border-color: #d1fae5;
  }

  .integration-expanded-card {
    background: #f0fdf4;
    border: 1px solid #d1fae5;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: visible;
  }

  .integration-expanded-card .integration-row.connected {
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .integration-row.collapsed {
    appearance: none;
    cursor: pointer;
    font: inherit;
    text-align: left;
    width: 100%;
  }

  .integration-platform-row {
    min-height: 58px;
  }

  .connected-account-summary {
    align-items: center;
    color: #065f46;
    display: inline-flex;
    flex: 1;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 650;
    gap: 8px;
    white-space: nowrap;
  }

  .connected-account-row {
    align-items: center;
    background: #ffffff;
    display: flex;
    gap: 12px;
    margin: 12px;
    min-height: 64px;
    padding: 10px 12px;
    position: relative;
    border: 1px solid #e8e9ec;
    border-radius: 10px;
  }

  .connected-account-avatar {
    align-items: center;
    background:
      radial-gradient(circle at 30% 110%, #fdf497 0 12%, #fd5949 38%, #d6249f 62%, #285aeb 100%);
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 700;
    height: 36px;
    justify-content: center;
    width: 36px;
  }

  .connected-account-avatar.mini {
    font-size: 11px;
    height: 26px;
    width: 26px;
  }

  .connected-account-avatar.large {
    height: 42px;
    width: 42px;
  }

  .connected-account-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .connected-account-copy strong,
  .connected-account-popover-head strong {
    color: #202126;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.2;
  }

  .connected-account-copy span,
  .connected-account-popover-head span {
    color: #6f737d;
    display: block;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connected-account-settings {
    position: relative;
    flex-shrink: 0;
  }

  .connected-account-settings-btn {
    background: #ffffff;
    border: 1px solid #d6d8dd;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    opacity: 0;
    padding: 7px 11px;
    transition: opacity 150ms ease, background 150ms ease;
    white-space: nowrap;
  }

  .connected-account-row:hover .connected-account-settings-btn,
  .connected-account-settings-btn:focus,
  .connected-account-settings-btn[aria-expanded="true"] {
    opacity: 1;
  }

  .connected-account-settings-btn:hover {
    background: #f5f5f7;
  }

  .connected-account-popover {
    background: #ffffff;
    border: 1px solid #e2e3e7;
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(32, 33, 38, 0.16);
    min-width: 260px;
    padding: 8px;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 20;
  }

  .connected-account-popover-head {
    align-items: center;
    border-bottom: 1px solid #f0f1f3;
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
    padding: 8px;
  }

  .connected-account-menu-row {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    display: flex;
    font: inherit;
    font-size: 13px;
    justify-content: space-between;
    padding: 10px 9px;
    text-align: left;
    width: 100%;
  }

  .connected-account-menu-row:hover {
    background: #f5f5f7;
  }

  .connected-account-menu-row.danger {
    color: #b42318;
  }

  .connected-account-menu-row:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .connected-toggle {
    background: #d0d5dd;
    border-radius: 99px;
    display: inline-flex;
    height: 20px;
    padding: 2px;
    transition: background 150ms ease;
    width: 36px;
  }

  .connected-toggle span {
    background: #ffffff;
    border-radius: 50%;
    display: block;
    height: 16px;
    transition: transform 150ms ease;
    width: 16px;
  }

  .connected-toggle.on {
    background: #202126;
  }

  .connected-toggle.on span {
    transform: translateX(16px);
  }

  .add-extra-account-btn {
    align-self: flex-start;
    background: transparent;
    border: 0;
    color: #065f46;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    margin: 0 12px 12px 60px;
    padding: 0;
  }

  .add-extra-account-btn:hover {
    text-decoration: underline;
  }

  .integration-order {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .integration-icon {
    width: 20px;
    font-size: 16px;
    flex-shrink: 0;
    text-align: center;
  }

  .integration-label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }

  .integration-next-badge {
    font-size: 12px;
    color: #6f737d;
  }

  .integration-unavailable-badge {
    background: #f4f4f5;
    border: 1px solid #e4e5e9;
    border-radius: 999px;
    color: #6f737d;
    font-size: 12px;
    font-weight: 700;
    padding: 5px 9px;
    white-space: nowrap;
  }

  .integration-connect-btn {
    padding: 6px 14px;
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 150ms;
  }

  .integration-connect-btn.primary {
    background: #202126;
    color: #ffffff;
    border-color: #202126;
  }

  .integration-connect-btn:hover {
    opacity: 0.85;
  }

  .integration-connect-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .integration-connected-name {
    color: #065f46;
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }

  .integration-connected-badge {
    background: #d1fae5;
    border-radius: 99px;
    color: #065f46;
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    white-space: nowrap;
  }

  .integration-disconnect-btn {
    background: transparent;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    color: #047857;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 10px;
    white-space: nowrap;
  }

  .integration-disconnect-btn:hover {
    background: #dcfce7;
  }

  .integration-disconnect-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .ig-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .ig-modal {
    background: #ffffff;
    border-radius: 16px;
    padding: 28px;
    max-width: 560px;
    width: 100%;
    position: relative;
    max-height: 90vh;
    overflow-y: auto;
  }

  .ig-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    border: none;
    background: none;
    font-size: 18px;
    color: #6f737d;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 150ms;
  }

  .ig-modal-close:hover {
    background: #f0f0f0;
  }

  .ig-modal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .ig-modal-icon-wrap {
    flex-shrink: 0;
  }

  .ig-modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #202126;
  }

  .ig-modal-instructions {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .ig-modal-instructions-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: #202126;
  }

  .ig-modal-privacy-note {
    background: #ffffff;
    border: 1px solid #bbf7d0;
    border-radius: 9px;
    color: #166534;
    font-size: 13px;
    line-height: 1.55;
    margin: 0;
    padding: 11px 12px;
  }

  .ig-modal-step {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .ig-modal-step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .ig-modal-step p {
    margin: 0 0 8px;
    font-size: 14px;
    color: #202126;
    line-height: 1.5;
  }

  .ig-modal-note {
    font-size: 12px !important;
    color: #6f737d !important;
    font-style: italic;
  }

  .ig-modal-checklist {
    margin: 8px 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ig-modal-checklist li {
    font-size: 14px;
    color: #202126;
    line-height: 1.5;
  }

  .ig-modal-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }

  .ig-modal-back-btn,
  .ig-modal-help-btn {
    padding: 9px 18px;
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    font-size: 14px;
    cursor: pointer;
    color: #202126;
    transition: background 150ms;
  }

  .ig-modal-back-btn:hover,
  .ig-modal-help-btn:hover {
    background: #f5f5f7;
  }

  .ig-modal-go-btn {
    padding: 9px 20px;
    border: none;
    border-radius: 8px;
    background: #202126;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms;
    white-space: nowrap;
  }

  .ig-modal-go-btn:hover {
    opacity: 0.85;
  }
`
