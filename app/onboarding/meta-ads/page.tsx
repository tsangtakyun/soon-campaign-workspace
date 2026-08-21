'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { MetaAdsWizard } from '@/components/meta-ads/MetaAdsWizard'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type DashboardPost = {
  id: string
  post_type?: string | null
  scheduled_at?: string | null
  status?: string | null
  title?: string | null
}

type SocialConnection = {
  account_name?: string | null
  platform: string
}

type MetaAdsPayload = {
  brandKit?: {
    business_name?: string | null
  } | null
  connections?: SocialConnection[]
  posts?: DashboardPost[]
}

function normalizeAccountName(value?: string | null) {
  if (!value) return '尚未連接'
  return value.startsWith('@') ? value : value.includes('.') ? `@${value}` : value
}

function MetaIcon() {
  return (
    <span className="meta-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M6.3 20.6c0-5.8 2.8-10.2 6.2-10.2 2 0 3.6 1.2 5.4 3.7 1.6-2.3 3.2-3.7 5.1-3.7 3.4 0 5.7 4.1 5.7 9.1 0 3.2-1.3 5.2-3.5 5.2-1.7 0-3-1-5-3.8l-1.9-2.7-.9 1.5c-2.2 3.6-3.6 5-5.7 5-3.2 0-5.4-1.7-5.4-4.1Zm7.6-7.3c-2 0-3.9 3.5-3.9 7.1 0 1.3.7 2 1.8 2 1.2 0 2.1-.9 4.1-4.1l1-1.7c-1.1-1.8-2-3.3-3-3.3Zm10.8 9.1c1 0 1.5-.9 1.5-2.8 0-3.5-1.4-6.3-3.2-6.3-1.1 0-2 .9-3.6 3.3l2.2 3.1c1.4 1.9 2.2 2.7 3.1 2.7Z"
          fill="#1877F2"
        />
      </svg>
    </span>
  )
}

export default function MetaAdsPage() {
  const router = useRouter()
  const [payload, setPayload] = useState<MetaAdsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState('')
  const [showWizard, setShowWizard] = useState(false)

  async function openWizard() {
    setError(null)
    if (workspaceId) {
      setShowWizard(true)
      return
    }

    // The onboarding claim and this page can finish loading in either order.
    // Resolve once more at click time instead of leaving a permanently disabled
    // button when the workspace becomes available a moment later.
    const resolved = await resolveActiveWorkspace().catch(() => null)
    if (resolved?.workspaceId) {
      setWorkspaceId(resolved.workspaceId)
      setShowWizard(true)
      return
    }

    setError('未能找到可用工作台。請先返回首頁完成工作台設定，然後再建立廣告活動。')
  }

  useEffect(() => {
    let cancelled = false

    async function loadMetaAds() {
      setLoading(true)
      setError(null)

      try {
        const { workspaceId } = await resolveActiveWorkspace()
        if (!cancelled) setWorkspaceId(workspaceId || '')
        if (!workspaceId) {
          if (!cancelled) setPayload({ connections: [], posts: [] })
          return
        }

        const response = await fetch(`/api/dashboard-data?workspace_id=${workspaceId}`, { cache: 'no-store' })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || '未能讀取 Meta Ads 資料')

        if (!cancelled) setPayload(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '未能讀取 Meta Ads 資料')
          setPayload({ connections: [], posts: [] })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadMetaAds()

    function handleWorkspaceChanged() {
      void loadMetaAds()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  const connections = payload?.connections || []
  const businessName = payload?.brandKit?.business_name || '目前工作台'
  const facebookConnection = connections.find((connection) => connection.platform === 'facebook')
  const instagramConnection = connections.find((connection) => connection.platform === 'instagram')
  const hasMetaConnection = Boolean(facebookConnection || instagramConnection)

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="Meta Ads" />

      <section className="meta-ads-shell">
        <header className="meta-ads-topbar">
          <div>
            <h1>Meta Ads</h1>
            <span>連接真實 Meta Ad Account、建立 Campaign、素材及受眾設定。</span>
          </div>
          <button type="button" onClick={() => router.push('/onboarding/integrations')}>
            管理連接
          </button>
        </header>

        <div className="meta-ads-body">
          {loading ? (
            <section className="meta-loading" aria-busy="true">
              <div />
              <span />
              <span />
            </section>
          ) : (
            <>
              {error ? <div className="meta-alert">{error}</div> : null}

              <section className="meta-hero">
                <div>
                  <span className="eyebrow">PAID ADS WORKSPACE</span>
                  <h2>{businessName} Meta Ads</h2>
                  <p>
                    {hasMetaConnection
                      ? `已連接 ${facebookConnection ? 'Facebook' : 'Instagram'}：${normalizeAccountName(
                          facebookConnection?.account_name || instagramConnection?.account_name,
                        )}。建立流程會即時檢查 Ad Account、Page、Instagram 及 ads_management 權限。`
                      : '尚未連接 Meta 帳戶。開始建立流程後會引導你完成 Meta Ads 授權。'}
                  </p>
                </div>
                <div className={hasMetaConnection ? 'meta-status-card connected' : 'meta-status-card'}>
                  <MetaIcon />
                  <div>
                    <strong>{hasMetaConnection ? 'Meta 已連接' : 'Meta 未連接'}</strong>
                    <span>{hasMetaConnection ? '建立時會驗證 Ads 權限' : '需要先連接帳戶'}</span>
                  </div>
                  <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                    {hasMetaConnection ? '查看連接' : '立即連接'}
                  </button>
                </div>
              </section>

              <section className="meta-steps" aria-label="Meta Ads 流程">
                <div className={hasMetaConnection ? 'done' : ''}>
                  <span>1</span>
                  <strong>連接 Meta</strong>
                  <em>{hasMetaConnection ? '已連接帳戶' : 'Facebook / Instagram'}</em>
                </div>
                <div>
                  <span>2</span>
                  <strong>目的與主題</strong>
                  <em>目標、網址、Campaign Topic</em>
                </div>
                <div>
                  <span>3</span>
                  <strong>選擇素材</strong>
                  <em>最多 5 個已審批內容</em>
                </div>
                <div>
                  <span>4</span>
                  <strong>建立到 Meta</strong>
                  <em>Campaign、Ad Set、Creative、Ad</em>
                </div>
              </section>

              <section className="meta-banner">
                <div>
                  <strong>真實 Meta Marketing API</strong>
                  <p>SOON 會將選定素材真正建立到 Meta；新 Campaign 預設為 PAUSED，確認後才開始投放及扣款。</p>
                </div>
                <span>安全模式</span>
              </section>

              <section className="meta-panel">
                <div className="panel-heading">
                  <div>
                    <span>CAMPAIGNS</span>
                    <h3>廣告活動草稿</h3>
                  </div>
                  <button type="button" onClick={() => void openWizard()}>
                    ＋ 建立廣告活動
                  </button>
                </div>

                <div className="campaign-table-wrap">
                  <table className="campaign-table">
                    <thead>
                      <tr>
                        <th>狀態</th>
                        <th>活動名稱</th>
                        <th>預算</th>
                        <th>已花費</th>
                        <th>結果</th>
                        <th>每個結果成本</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#7b7f88', padding: '42px 20px' }}>
                          暫未有已同步 Campaign。按「建立廣告活動」開始真實 Meta 建立流程。
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="meta-grid">
                <article className="meta-panel">
                  <div className="panel-heading">
                    <div>
                      <span>AD STRATEGY</span>
                      <h3>SOON 建議</h3>
                    </div>
                  </div>
                  <div className="strategy-list">
                    <div>
                      <strong>先推已確認內容</strong>
                      <p>用已經通過客戶審批的貼文作測試，避免廣告素材同 organic 內容方向分裂。</p>
                    </div>
                    <div>
                      <strong>小額測試 72 小時</strong>
                      <p>先用低每日預算測試互動、收藏及 profile visit，再決定是否加大投放。</p>
                    </div>
                    <div>
                      <strong>分開受眾與素材</strong>
                      <p>同一素材測不同受眾，同一受眾測不同 hook，數據會更容易判斷下一步。</p>
                    </div>
                  </div>
                </article>

                <article className="meta-panel connection-panel">
                  <div className="panel-heading">
                    <div>
                      <span>CONNECTED META</span>
                      <h3>已連接帳戶</h3>
                    </div>
                  </div>
                  <div className="connection-list">
                    <div>
                      <MetaIcon />
                      <div>
                        <strong>Facebook</strong>
                        <span>{normalizeAccountName(facebookConnection?.account_name)}</span>
                      </div>
                    </div>
                    <div>
                      <MetaIcon />
                      <div>
                        <strong>Instagram</strong>
                        <span>{normalizeAccountName(instagramConnection?.account_name)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </section>
      {showWizard && workspaceId ? <MetaAdsWizard workspaceId={workspaceId} onClose={() => setShowWizard(false)} /> : null}

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${metaAdsStyles}` }} />
    </main>
  )
}

const metaAdsStyles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .meta-ads-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .meta-ads-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
  }

  .meta-ads-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  .meta-ads-topbar span {
    color: #72757d;
    font-size: 13px;
  }

  .meta-ads-topbar button,
  .panel-heading button,
  .meta-status-card button {
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

  .panel-heading button:disabled {
    color: #777b84;
    cursor: not-allowed;
    background: #f5f5f6;
  }

  .meta-ads-body {
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .meta-loading {
    width: min(1040px, 100%);
    border: 1px solid #ebecef;
    border-radius: 8px;
    padding: 28px;
    display: grid;
    gap: 14px;
  }

  .meta-loading div,
  .meta-loading span {
    border-radius: 999px;
    background: linear-gradient(90deg, #f0f1f3, #fafafa, #f0f1f3);
    min-height: 18px;
  }

  .meta-loading div {
    width: 44%;
    min-height: 34px;
  }

  .meta-loading span:nth-child(2) {
    width: 70%;
  }

  .meta-loading span:nth-child(3) {
    width: 54%;
  }

  .meta-alert {
    width: min(1040px, 100%);
    border-radius: 8px;
    padding: 12px 14px;
    background: #fff7e8;
    color: #8a5a12;
    font-size: 14px;
  }

  .meta-hero,
  .meta-steps,
  .meta-banner,
  .meta-panel,
  .meta-grid {
    width: min(1040px, 100%);
  }

  .meta-hero {
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

  .meta-hero h2 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0;
  }

  .meta-hero p {
    color: #696d76;
    font-size: 15px;
    line-height: 1.7;
    margin: 0;
    max-width: 720px;
  }

  .meta-status-card {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 136px;
    text-align: center;
  }

  .meta-status-card.connected {
    background: #ecfdf3;
    border-color: #bcf2cf;
  }

  .meta-status-card strong,
  .connection-list strong {
    display: block;
    font-size: 16px;
    line-height: 1.3;
  }

  .meta-status-card span,
  .connection-list span {
    color: #70747d;
    display: block;
    font-size: 13px;
    line-height: 1.45;
  }

  .meta-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .meta-icon svg {
    width: 28px;
    height: 28px;
    display: block;
  }

  .meta-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .meta-steps div {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    background: #ffffff;
    padding: 14px;
  }

  .meta-steps div.done {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .meta-steps span {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #202126;
    color: #ffffff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 10px;
  }

  .meta-steps strong,
  .meta-steps em {
    display: block;
  }

  .meta-steps strong {
    font-size: 15px;
    margin-bottom: 4px;
  }

  .meta-steps em {
    color: #70747d;
    font-size: 12px;
    font-style: normal;
  }

  .meta-banner {
    background: #ecfdf3;
    border: 1px solid #bcf2cf;
    border-radius: 8px;
    padding: 16px 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .meta-banner strong {
    display: block;
    margin-bottom: 4px;
  }

  .meta-banner p {
    color: #5f656f;
    font-size: 14px;
    line-height: 1.55;
    margin: 0;
  }

  .meta-banner > span {
    border-radius: 999px;
    background: #ffffff;
    color: #5f656f;
    font-size: 12px;
    font-weight: 750;
    padding: 7px 10px;
    white-space: nowrap;
  }

  .meta-panel {
    border: 1px solid #e4e6ea;
    border-radius: 8px;
    background: #ffffff;
    padding: 20px;
  }

  .panel-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .panel-heading h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0;
  }

  .campaign-table-wrap {
    overflow-x: auto;
  }

  .campaign-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 820px;
  }

  .campaign-table th,
  .campaign-table td {
    border-bottom: 1px solid #eef0f2;
    padding: 14px 10px;
    text-align: left;
    vertical-align: middle;
    font-size: 14px;
  }

  .campaign-table th {
    color: #8a8d94;
    font-size: 12px;
    font-weight: 750;
  }

  .campaign-name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .campaign-name strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-pill {
    border-radius: 999px;
    background: #fff7e6;
    color: #8a5a12;
    display: inline-flex;
    font-size: 12px;
    font-weight: 750;
    padding: 5px 9px;
    white-space: nowrap;
  }

  .status-pill.ready {
    background: #ecfdf3;
    color: #13723c;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 18px;
  }

  .strategy-list {
    display: grid;
    gap: 14px;
  }

  .strategy-list div {
    border-left: 3px solid #202126;
    padding-left: 12px;
  }

  .strategy-list strong {
    display: block;
    margin-bottom: 4px;
  }

  .strategy-list p {
    color: #666b75;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }

  .connection-list {
    display: grid;
    gap: 12px;
  }

  .connection-list > div {
    border: 1px solid #eceef1;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    min-width: 0;
  }

  .connection-list > div > div {
    min-width: 0;
  }

  .connection-list span {
    overflow-wrap: anywhere;
  }

  @media (max-width: 900px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      min-height: auto;
    }

    .meta-ads-topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 16px;
    }

    .meta-ads-body {
      padding: 16px;
    }

    .meta-hero,
    .meta-grid {
      grid-template-columns: 1fr;
    }

    .meta-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .meta-banner,
    .panel-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .meta-hero h2 {
      font-size: 24px;
    }

    .meta-steps {
      grid-template-columns: 1fr;
    }
  }
`
