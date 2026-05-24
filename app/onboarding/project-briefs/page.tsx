'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type ProjectBrief = {
  id: string
  title: string | null
  creator_username: string | null
  campaign_id: string | null
  status: string | null
  created_at: string | null
}

type Campaign = {
  id: string
  name: string | null
}

export default function ProjectBriefsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<ProjectBrief[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadBriefs() {
      setLoading(true)
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled) return

      setWorkspaceId(resolvedWorkspaceId)
      if (!resolvedWorkspaceId) {
        setBriefs([])
        setLoading(false)
        return
      }

      const [briefResult, campaignResult] = await Promise.all([
        supabase
          .from('project_briefs')
          .select('id,title,creator_username,campaign_id,status,created_at')
          .eq('workspace_id', resolvedWorkspaceId)
          .order('created_at', { ascending: false }),
        supabase.from('marketing_campaigns').select('id,name').eq('workspace_id', resolvedWorkspaceId),
      ])

      if (!cancelled) {
        setBriefs((briefResult.data as ProjectBrief[]) ?? [])
        setCampaigns((campaignResult.data as Campaign[]) ?? [])
        setLoading(false)
      }
    }

    void loadBriefs()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name || 'Untitled campaign']))

  async function sendBrief(briefId: string) {
    if (!workspaceId) return

    const res = await fetch('/api/project-briefs/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_id: briefId, workspace_id: workspaceId }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      alert(data?.error || '發送失敗，請稍後再試。')
      return
    }

    setBriefs((current) =>
      current.map((brief) => (brief.id === briefId ? { ...brief, status: 'sent' } : brief))
    )
  }

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="項目簡報" />
      <section className="briefs-main">
        <header className="briefs-header">
          <div>
            <p>Project Briefs</p>
            <h1>項目簡報</h1>
          </div>
          <Link className="primary-button" href="/onboarding/project-briefs/new">
            + 新增簡報
          </Link>
        </header>

        <div className="briefs-card">
          {loading ? (
            <div className="empty-state">載入中...</div>
          ) : briefs.length === 0 ? (
            <div className="empty-state">暫時未有項目簡報。</div>
          ) : (
            briefs.map((brief) => (
              <article className="brief-row" key={brief.id}>
                <div>
                  <strong>{brief.title || '未命名簡報'}</strong>
                  <span>
                    {brief.creator_username ? `@${brief.creator_username}` : '未指定 KOL'} ·{' '}
                    {brief.campaign_id ? campaignNameById.get(brief.campaign_id) || 'Campaign' : '未指定 Campaign'}
                  </span>
                  {brief.created_at ? <small>{new Date(brief.created_at).toLocaleString('zh-HK')}</small> : null}
                </div>
                <em className={brief.status === 'sent' ? 'sent' : ''}>{brief.status === 'sent' ? '已發送' : '草稿'}</em>
                <div className="row-actions">
                  <Link href={`/onboarding/project-briefs/${brief.id}`}>編輯</Link>
                  <button disabled={brief.status === 'sent'} onClick={() => void sendBrief(brief.id)} type="button">
                    發送
                  </button>
                </div>
              </article>
            ))
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
.briefs-main { padding: 48px; }
.briefs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
.briefs-header p { margin: 0 0 8px; color: #7d8088; font-size: 13px; }
.briefs-header h1 { margin: 0; font-size: 32px; letter-spacing: -0.03em; }
.primary-button,
.row-actions a,
.row-actions button {
  border: 0;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
  padding: 10px 14px;
  text-decoration: none;
}
.briefs-card {
  max-width: 980px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  overflow: hidden;
}
.empty-state { color: #9a9da4; font-size: 14px; padding: 48px 24px; text-align: center; }
.brief-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid #f0f1f3;
  padding: 18px 20px;
}
.brief-row strong { display: block; font-size: 15px; }
.brief-row span, .brief-row small { color: #7d8088; display: block; font-size: 12px; margin-top: 4px; }
.brief-row em {
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 12px;
  font-style: normal;
  padding: 5px 10px;
}
.brief-row em.sent { background: #dcfce7; color: #15803d; }
.row-actions { display: flex; gap: 8px; }
.row-actions a { background: #ffffff; border: 1px solid #e5e7eb; color: #202126; }
.row-actions button:disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
@media (max-width: 900px) {
  .dashboard-page { grid-template-columns: 1fr; }
  .briefs-main { padding: 28px 18px; }
  .brief-row { grid-template-columns: 1fr; }
}
`
