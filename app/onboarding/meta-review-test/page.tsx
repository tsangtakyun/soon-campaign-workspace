'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { PlatformIcon } from '@/components/dashboard/PlatformIcon'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT, type WorkspaceSummary } from '@/lib/workspace-client'

type MetaReviewAction = 'all' | 'insights' | 'profile' | 'publish'

type ReviewConnection = {
  account_id?: string | null
  account_name?: string | null
  has_access_token?: boolean
  has_page_access_token?: boolean
  platform?: string
} | null

type ReviewPost = {
  body?: string | null
  image_url?: string | null
  title?: string | null
} | null

type ReviewPayload = {
  connection?: ReviewConnection
  latestImagePost?: ReviewPost
}

function defaultCaption(workspace?: WorkspaceSummary | null, post?: ReviewPost) {
  return [
    'SOON Meta Review Test',
    '',
    `${workspace?.brandName || workspace?.name || 'SOON workspace'} internal publishing permission test`,
    post?.title ? `Source post: ${post.title}` : '',
    new Date().toISOString(),
  ]
    .filter(Boolean)
    .join('\n')
}

function displayHandle(connection?: ReviewConnection) {
  const name = connection?.account_name?.trim()
  if (!name) return 'Instagram 未連接'
  return name.startsWith('@') ? name : `@${name}`
}

export default function MetaReviewTestPage() {
  const router = useRouter()
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [connection, setConnection] = useState<ReviewConnection>(null)
  const [latestPost, setLatestPost] = useState<ReviewPost>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [runningAction, setRunningAction] = useState<MetaReviewAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const canPublish = Boolean(connection?.account_id && imageUrl.trim() && caption.trim())
  const workspaceLabel = activeWorkspace?.brandName || activeWorkspace?.name || '目前工作台'

  const tokenSummary = useMemo(() => {
    const parts = []
    if (connection?.has_access_token) parts.push('user token')
    if (connection?.has_page_access_token) parts.push('page token')
    return parts.length ? parts.join(' + ') : '未找到 token'
  }, [connection])

  useEffect(() => {
    let cancelled = false

    async function loadReviewContext() {
      setLoading(true)
      setError(null)

      try {
        const resolved = await resolveActiveWorkspace()
        if (cancelled) return

        setActiveWorkspace(resolved.activeWorkspace)
        setWorkspaceId(resolved.workspaceId)

        if (!resolved.workspaceId) {
          setConnection(null)
          setLatestPost(null)
          setImageUrl('')
          setCaption('')
          return
        }

        const response = await fetch(`/api/meta-review-test?workspaceId=${resolved.workspaceId}`, {
          cache: 'no-store',
        })
        const data = (await response.json().catch(() => null)) as ReviewPayload & { error?: string }
        if (!response.ok) {
          throw new Error(data?.error || '未能讀取 Meta Review Test 狀態')
        }

        if (cancelled) return
        setConnection(data.connection || null)
        setLatestPost(data.latestImagePost || null)
        setImageUrl(data.latestImagePost?.image_url || '')
        setCaption(defaultCaption(resolved.activeWorkspace, data.latestImagePost || null))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '未能讀取 Meta Review Test 狀態')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReviewContext()

    function handleWorkspaceChanged() {
      void loadReviewContext()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  async function runTest(action: MetaReviewAction) {
    if (!workspaceId) return
    setRunningAction(action)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/meta-review-test', {
        body: JSON.stringify({
          action,
          caption,
          imageUrl,
          workspaceId,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Meta Review Test failed')
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Meta Review Test failed')
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="整合" />

      <section className="review-shell">
        <header className="review-topbar">
          <div>
            <h1>Meta Review Test</h1>
            <span>內部測試頁，供 Meta App Review 驗證 Instagram 權限流程。</span>
          </div>
          <button type="button" onClick={() => router.push('/onboarding/integrations')}>
            返回整合
          </button>
        </header>

        <div className="review-body">
          <section className="review-hero">
            <div>
              <span className="eyebrow">INTERNAL REVIEW</span>
              <h2>{workspaceLabel}</h2>
              <p>
                這頁會使用目前工作台已連接的 Instagram 帳戶，實際呼叫 Meta Graph API。發布測試會建立真實 IG media container，並嘗試發布一篇測試貼文。
              </p>
            </div>

            <div className={connection ? 'connection-card connected' : 'connection-card'}>
              <PlatformIcon id="instagram" size={30} />
              <strong>{displayHandle(connection)}</strong>
              <span>{connection ? `Token: ${tokenSummary}` : '請先連接 Instagram'}</span>
              <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                {connection ? '管理連接' : '連接 Instagram'}
              </button>
            </div>
          </section>

          {error ? <div className="review-alert">{error}</div> : null}

          {loading ? (
            <section className="review-loading" aria-busy="true">
              <div />
              <span />
              <span />
            </section>
          ) : (
            <>
              <section className="review-panel">
                <div className="panel-heading">
                  <div>
                    <span>STEP 1</span>
                    <h3>Verify Profile And Insights</h3>
                  </div>
                </div>
                <p>
                  Reviewer 可以先測試 profile 及 insights endpoint，證明 SOON 會從已連接的 IG professional account 讀取帳戶資料及表現數據。
                </p>
                <div className="button-row">
                  <button disabled={!connection || Boolean(runningAction)} onClick={() => runTest('profile')} type="button">
                    {runningAction === 'profile' ? '測試中...' : '測試 IG Profile'}
                  </button>
                  <button disabled={!connection || Boolean(runningAction)} onClick={() => runTest('insights')} type="button">
                    {runningAction === 'insights' ? '測試中...' : '測試 Insights'}
                  </button>
                </div>
              </section>

              <section className="review-panel">
                <div className="panel-heading">
                  <div>
                    <span>STEP 2</span>
                    <h3>Publish Test Post</h3>
                  </div>
                </div>
                <p className="warning-copy">
                  注意：這個測試會嘗試真實發布到已連接 Instagram。未獲批 `instagram_content_publish` 前，Meta 可能會回傳權限錯誤。
                </p>

                <label>
                  Public image URL
                  <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
                </label>

                <label>
                  Caption
                  <textarea rows={7} value={caption} onChange={(event) => setCaption(event.target.value)} />
                </label>

                {latestPost?.title ? (
                  <div className="latest-post">
                    <strong>Latest imported post</strong>
                    <span>{latestPost.title}</span>
                  </div>
                ) : null}

                <div className="button-row">
                  <button disabled={!canPublish || Boolean(runningAction)} onClick={() => runTest('publish')} type="button">
                    {runningAction === 'publish' ? '發布測試中...' : '發布測試 Post'}
                  </button>
                  <button disabled={!connection || !canPublish || Boolean(runningAction)} onClick={() => runTest('all')} type="button">
                    {runningAction === 'all' ? '測試中...' : '一次過測試'}
                  </button>
                </div>
              </section>

              <section className="review-panel result-panel">
                <div className="panel-heading">
                  <div>
                    <span>RESULT</span>
                    <h3>API Response</h3>
                  </div>
                </div>
                <pre>{result ? JSON.stringify(result, null, 2) : '尚未執行測試。'}</pre>
              </section>
            </>
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${reviewStyles}` }} />
    </main>
  )
}

const reviewStyles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .review-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .review-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
  }

  .review-topbar h1 {
    margin: 0;
    font-size: 18px;
  }

  .review-topbar span,
  .review-panel p {
    color: #6f7278;
    font-size: 14px;
    line-height: 1.6;
  }

  .review-topbar button,
  .connection-card button,
  .button-row button {
    border: 1px solid #dfe1e6;
    background: #ffffff;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    font-size: 14px;
    font-weight: 650;
    min-height: 40px;
    padding: 0 16px;
  }

  .review-body {
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .review-hero,
  .review-panel,
  .review-alert,
  .review-loading {
    width: min(1040px, 100%);
  }

  .review-hero,
  .review-panel {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    background: #ffffff;
  }

  .review-hero {
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

  .review-hero h2 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
  }

  .review-hero p {
    color: #696d76;
    font-size: 15px;
    line-height: 1.7;
    margin: 0;
  }

  .connection-card {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    padding: 16px;
    display: grid;
    justify-items: center;
    gap: 8px;
    min-width: 0;
    text-align: center;
  }

  .connection-card.connected {
    background: #ecfdf3;
    border-color: #bcf2cf;
  }

  .connection-card strong {
    font-size: 16px;
    line-height: 1.25;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .connection-card span {
    color: #737780;
    font-size: 12px;
  }

  .review-panel {
    padding: 20px;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }

  .panel-heading h3 {
    font-size: 21px;
    margin: 0;
  }

  .warning-copy {
    color: #8a5a12 !important;
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .button-row button:first-child {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .button-row button:disabled {
    background: #e5e7eb;
    border-color: #e5e7eb;
    color: #8b8e96;
    cursor: not-allowed;
  }

  .review-panel label {
    color: #202126;
    display: grid;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    margin-top: 14px;
  }

  .review-panel input,
  .review-panel textarea {
    -webkit-text-fill-color: #202126;
    appearance: none;
    background: #ffffff !important;
    border: 1px solid #dfe1e6;
    border-radius: 8px;
    caret-color: #202126;
    color: #202126 !important;
    font: inherit;
    line-height: 1.5;
    padding: 12px;
    width: 100%;
  }

  .review-panel input::placeholder,
  .review-panel textarea::placeholder {
    color: #9a9da5;
    -webkit-text-fill-color: #9a9da5;
  }

  .review-panel input:focus,
  .review-panel textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
    outline: none;
  }

  .review-panel textarea {
    resize: vertical;
  }

  .latest-post {
    border: 1px solid #eceef2;
    border-radius: 8px;
    display: grid;
    gap: 4px;
    margin-top: 14px;
    padding: 12px;
  }

  .latest-post span {
    color: #6f7278;
  }

  .review-alert {
    background: #fff7e8;
    border-radius: 8px;
    color: #8a5a12;
    padding: 12px 14px;
  }

  .review-loading {
    border: 1px solid #ebecef;
    border-radius: 8px;
    padding: 28px;
    display: grid;
    gap: 14px;
  }

  .review-loading div,
  .review-loading span {
    border-radius: 999px;
    background: linear-gradient(90deg, #f0f1f3, #fafafa, #f0f1f3);
    min-height: 18px;
  }

  .review-loading div {
    min-height: 34px;
    width: 42%;
  }

  .review-loading span:nth-child(2) {
    width: 70%;
  }

  .review-loading span:nth-child(3) {
    width: 52%;
  }

  .result-panel pre {
    background: #111111;
    border-radius: 8px;
    color: #f7f7f8;
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
    max-height: 420px;
    overflow: auto;
    padding: 16px;
    white-space: pre-wrap;
  }

  @media (max-width: 980px) {
    .dashboard-page,
    .review-hero {
      grid-template-columns: 1fr;
    }

    .sidebar {
      min-height: auto;
    }
  }

  @media (max-width: 640px) {
    .review-topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 16px;
    }

    .review-body {
      padding: 16px;
    }
  }
`
