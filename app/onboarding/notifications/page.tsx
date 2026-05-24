'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type WorkspaceNotification = {
  id: string
  workspace_id: string
  type: string | null
  title: string | null
  body: string | null
  meta: {
    campaign_id?: string | null
    campaign_name?: string | null
    status?: string | null
    creator_username?: string | null
    creator_display_name?: string | null
    creator_mediakit_url?: string | null
    creator_ig_followers?: number | null
    brief_title?: string | null
    brand_name?: string | null
    first_submission_date?: string | null
    final_submission_date?: string | null
    notes?: string | null
  } | null
  is_read: boolean | null
  created_at: string | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      setLoading(true)
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled) return

      setWorkspaceId(resolvedWorkspaceId)
      if (!resolvedWorkspaceId) {
        setNotifications([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('workspace_notifications')
        .select('id,workspace_id,type,title,body,meta,is_read,created_at')
        .eq('workspace_id', resolvedWorkspaceId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!cancelled) {
        setNotifications((data as WorkspaceNotification[]) ?? [])
        setLoading(false)
      }
    }

    void loadNotifications()

    return () => {
      cancelled = true
    }
  }, [supabase])

  async function openNotification(notification: WorkspaceNotification) {
    await supabase.from('workspace_notifications').update({ is_read: true }).eq('id', notification.id)
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
    )

    const campaignId = notification.meta?.campaign_id
    if (campaignId) {
      router.push(`/onboarding/campaigns/${campaignId}`)
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="通知" />
      <section className="notifications-main">
        <header className="notifications-header">
          <p>品牌與創作者動態</p>
          <h1>通知</h1>
        </header>

        <div className="notifications-card">
          {loading ? (
            <div className="notifications-empty">載入中...</div>
          ) : !workspaceId ? (
            <div className="notifications-empty">請先選擇工作空間。</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">暫時未有通知。</div>
          ) : (
            notifications.map((notification) => {
              const isDealConfirmed = notification.type === 'deal_confirmed'

              return (
                <button
                  className={`notification-row ${notification.is_read ? 'read' : ''} ${
                    isDealConfirmed ? 'deal-confirmed' : ''
                  }`}
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                  type="button"
                >
                  <span className="notification-dot">{isDealConfirmed ? '✓' : ''}</span>
                  <span className="notification-content">
                    <strong>{notification.title || '新通知'}</strong>
                    {notification.body ? <em>{notification.body}</em> : null}
                    {isDealConfirmed ? (
                      <span className="deal-confirmed-details">
                        {notification.meta?.creator_display_name || notification.meta?.creator_username ? (
                          <span>
                            KOL：{notification.meta.creator_display_name || notification.meta.creator_username}
                            {notification.meta.creator_ig_followers
                              ? ` · ${notification.meta.creator_ig_followers.toLocaleString()} followers`
                              : ''}
                          </span>
                        ) : null}
                        {notification.meta?.first_submission_date ? (
                          <span>首次交稿：{notification.meta.first_submission_date}</span>
                        ) : null}
                        {notification.meta?.final_submission_date ? (
                          <span>最終交稿：{notification.meta.final_submission_date}</span>
                        ) : null}
                        {notification.meta?.notes ? <span>備注：{notification.meta.notes}</span> : null}
                      </span>
                    ) : null}
                    {notification.created_at ? (
                      <small>{new Date(notification.created_at).toLocaleString('zh-HK')}</small>
                    ) : null}
                  </span>
                  {notification.meta?.status === 'accepted' ? (
                    <a
                      className="notification-link"
                      href={`/onboarding/project-briefs/new?creator=${encodeURIComponent(
                        notification.meta.creator_username || ''
                      )}&campaign_id=${encodeURIComponent(notification.meta.campaign_id || '')}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      發送 Project Brief
                    </a>
                  ) : null}
                  {isDealConfirmed ? (
                    <button
                      className="notification-link invoice"
                      onClick={(event) => event.stopPropagation()}
                      type="button"
                    >
                      發送 Invoice
                    </button>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
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
  grid-template-columns: 260px minmax(0, 1fr);
}

.notifications-main {
  padding: 48px;
}

.notifications-header {
  margin-bottom: 24px;
}

.notifications-header p {
  margin: 0 0 8px;
  color: #7d8088;
  font-size: 13px;
}

.notifications-header h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.03em;
}

.notifications-card {
  max-width: 840px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  overflow: hidden;
}

.notifications-empty {
  color: #9a9da4;
  font-size: 14px;
  padding: 48px 24px;
  text-align: center;
}

.notification-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f0f1f3;
  background: #ffffff;
  color: #202126;
  cursor: pointer;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 18px 20px;
  text-align: left;
}

.notification-row:hover {
  background: #f9fafb;
}

.notification-row.read {
  opacity: 0.64;
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  display: grid;
  font-size: 7px;
  place-items: center;
}

.notification-row.read .notification-dot {
  background: #d1d5db;
}

.notification-content {
  display: grid;
  gap: 4px;
}

.notification-content strong {
  font-size: 14px;
  font-weight: 650;
}

.notification-content em {
  color: #6f7278;
  font-size: 13px;
  font-style: normal;
}

.notification-content small {
  color: #a1a1aa;
  font-size: 12px;
}

.deal-confirmed-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 4px;
}

.deal-confirmed-details span {
  color: #4b5563;
  font-size: 12px;
}

.notification-link {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #202126;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  text-decoration: none;
}

.notification-link.invoice {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

@media (max-width: 900px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .notifications-main {
    padding: 28px 18px;
  }
}
`
