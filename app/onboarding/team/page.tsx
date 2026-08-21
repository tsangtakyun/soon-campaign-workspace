'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT, type WorkspaceSummary } from '@/lib/workspace-client'

type TeamMember = {
  avatarUrl?: string | null
  created_at?: string | null
  display_name?: string | null
  email?: string | null
  id: string
  inviteUrl?: string | null
  role?: string | null
  status?: string | null
  user_id?: string | null
}

type TeamPayload = {
  canEdit?: boolean
  members?: TeamMember[]
  role?: string | null
  workspace?: {
    id: string
    name?: string | null
  }
}

const roleOptions = [
  { label: '管理員', value: 'admin' },
  { label: '成員', value: 'member' },
  { label: '客戶審批', value: 'client_approver' },
  { label: '只讀', value: 'viewer' },
]

const roleDescriptions = {
  admin: '可以邀請/移除成員及管理工作台設定。',
  member: '可以進入工作台，查看及處理內容。',
  client_approver: '只處理內容批准、要求修改及留言，不會看到 Prompt。',
  viewer: '只可以查看工作台內容。',
}

function roleLabel(value?: string | null) {
  if (value === 'owner') return '擁有人'
  if (value === 'admin') return '管理員'
  if (value === 'client_approver') return '客戶審批'
  if (value === 'viewer') return '只讀'
  return '成員'
}

function statusLabel(value?: string | null) {
  if (value === 'active') return '已加入'
  if (value === 'pending') return '等待接受'
  return '未確認'
}

function memberInitial(member: TeamMember) {
  const value = member.display_name || member.email || 'S'
  return value.slice(0, 1).toUpperCase()
}

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [lastInviteUrl, setLastInviteUrl] = useState('')

  const workspaceLink = useMemo(() => {
    if (!workspace?.id || typeof window === 'undefined') return ''
    return `${window.location.origin}/workspace/${workspace.id}`
  }, [workspace?.id])

  async function loadTeam() {
    setLoading(true)
    setMessage('')

    try {
      const { activeWorkspace } = await resolveActiveWorkspace()
      setWorkspace(activeWorkspace)
      if (!activeWorkspace?.id) {
        setMembers([])
        setCanEdit(false)
        setMessage('未找到目前工作台。')
        return
      }

      const response = await fetch(`/api/team?workspace_id=${encodeURIComponent(activeWorkspace.id)}`, {
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as TeamPayload | null
      if (!response.ok) throw new Error('未能載入團隊成員。')

      setMembers(payload?.members || [])
      setCanEdit(Boolean(payload?.canEdit))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '未能載入團隊成員。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeam()

    function handleWorkspaceChanged() {
      void loadTeam()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
  }, [])

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace?.id || saving || !email.trim()) return

    setSaving(true)
    setMessage('')
    setLastInviteUrl('')

    try {
      const response = await fetch('/api/team', {
        body: JSON.stringify({
          email: email.trim(),
          role,
          workspace_id: workspace.id,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || '未能建立邀請。')

      setEmail('')
      setRole('member')
      setLastInviteUrl(payload?.inviteUrl || '')
      setMessage('邀請已建立。你可以複製邀請連結傳給對方。')
      await loadTeam()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '未能建立邀請。')
    } finally {
      setSaving(false)
    }
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(successMessage)
    } catch {
      setMessage('未能複製，請手動選取連結。')
    }
  }

  async function updateRole(memberId: string, nextRole: string) {
    if (!workspace?.id) return
    setMessage('')

    const response = await fetch('/api/team', {
      body: JSON.stringify({
        member_id: memberId,
        role: nextRole,
        workspace_id: workspace.id,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })

    if (!response.ok) {
      setMessage('未能更新權限。')
      return
    }

    await loadTeam()
  }

  async function removeMember(memberId: string) {
    if (!workspace?.id) return
    setMessage('')

    const response = await fetch(
      `/api/team?workspace_id=${encodeURIComponent(workspace.id)}&member_id=${encodeURIComponent(memberId)}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      setMessage('未能移除成員。')
      return
    }

    await loadTeam()
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="邀請團隊成員" />

      <section className="team-shell">
        <header className="team-topbar">
          <div>
            <h1>邀請團隊成員</h1>
            <p>{workspace?.brandName || workspace?.name || '目前工作台'}</p>
          </div>
        </header>

        <div className="team-body">
          <section className="team-hero">
            <div>
              <span>Workspace access</span>
              <h2>每個工作台都有獨立成員名單</h2>
            </div>
            {workspaceLink ? (
              <button type="button" onClick={() => copyText(workspaceLink, '已複製工作台連結。')}>
                複製工作台連結
              </button>
            ) : null}
          </section>

          {message ? <div className="team-message">{message}</div> : null}

          {lastInviteUrl ? (
            <section className="invite-link-card">
              <div>
                <strong>邀請連結</strong>
                <span>{lastInviteUrl}</span>
              </div>
              <button type="button" onClick={() => copyText(lastInviteUrl, '已複製邀請連結。')}>
                複製
              </button>
            </section>
          ) : null}

          <section className="team-grid">
            <form className="invite-panel" onSubmit={inviteMember}>
              <h2>邀請新成員</h2>
              <label>
                <span>電郵地址</span>
                <input
                  disabled={!canEdit || saving}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                <span>權限</span>
                <select disabled={!canEdit || saving} onChange={(event) => setRole(event.target.value)} value={role}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <p className="role-help">{roleDescriptions[role as keyof typeof roleDescriptions]}</p>
              <button disabled={!canEdit || saving || !workspace?.id} type="submit">
                {saving ? '建立邀請中...' : '建立邀請'}
              </button>
              {!canEdit ? <p className="panel-note">只有擁有人或管理員可以邀請成員。</p> : null}
            </form>

            <section className="member-panel">
              <div className="panel-head">
                <h2>成員</h2>
                <span>{members.length} 人</span>
              </div>

              {loading ? (
                <div className="member-empty">載入中...</div>
              ) : members.length ? (
                <div className="member-list">
                  {members.map((member) => (
                    <article className="member-row" key={member.id}>
                      <div className="member-avatar">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : memberInitial(member)}
                      </div>
                      <div className="member-main">
                        <strong>{member.display_name || member.email || '未命名成員'}</strong>
                        <span>{member.email}</span>
                        {member.inviteUrl ? (
                          <button type="button" onClick={() => copyText(member.inviteUrl || '', '已複製邀請連結。')}>
                            複製邀請連結
                          </button>
                        ) : null}
                      </div>
                      <div className="member-controls">
                        <em className={`status ${member.status || 'pending'}`}>{statusLabel(member.status)}</em>
                        {canEdit && member.role !== 'owner' ? (
                          <select value={member.role || 'member'} onChange={(event) => updateRole(member.id, event.target.value)}>
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <strong>{roleLabel(member.role)}</strong>
                        )}
                        {canEdit && member.role !== 'owner' ? (
                          <button className="remove" type="button" onClick={() => removeMember(member.id)}>
                            移除
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="member-empty">暫時未有成員。</div>
              )}
            </section>
          </section>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
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

  .team-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .team-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    padding: 0 24px;
  }

  .team-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 750;
  }

  .team-topbar p {
    color: #767a83;
    font-size: 12px;
    margin: 3px 0 0;
  }

  .team-body {
    display: grid;
    gap: 18px;
    padding: 28px;
  }

  .team-hero,
  .invite-link-card,
  .invite-panel,
  .member-panel {
    border: 1px solid #e6e7eb;
    border-radius: 12px;
    background: #ffffff;
  }

  .team-hero {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
  }

  .team-hero span {
    color: #8a8d95;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .team-hero h2,
  .invite-panel h2,
  .member-panel h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  .team-hero p {
    color: #626772;
    line-height: 1.7;
    margin: 8px 0 0;
    max-width: 620px;
  }

  .team-hero button,
  .invite-link-card button,
  .invite-panel button {
    border-radius: 8px;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 750;
    min-height: 42px;
    padding: 0 16px;
    white-space: nowrap;
  }

  .team-hero button,
  .invite-link-card button {
    background: #ffffff;
    border: 1px solid #dfe2e7;
    color: #202126;
  }

  .team-message {
    background: #fff7d7;
    border: 1px solid #f4e6a8;
    border-radius: 10px;
    color: #655615;
    padding: 12px 14px;
  }

  .invite-link-card {
    align-items: center;
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 14px;
  }

  .invite-link-card strong,
  .invite-link-card span {
    display: block;
  }

  .invite-link-card strong {
    font-size: 12px;
    color: #767a83;
    margin-bottom: 4px;
  }

  .invite-link-card span {
    color: #202126;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .team-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  }

  .invite-panel,
  .member-panel {
    padding: 20px;
  }

  .invite-panel {
    align-self: start;
    display: grid;
    gap: 16px;
  }

  .invite-panel label {
    display: grid;
    gap: 8px;
  }

  .invite-panel label span {
    color: #4d525c;
    font-size: 13px;
    font-weight: 700;
  }

  .invite-panel input,
  .invite-panel select,
  .member-controls select {
    min-height: 40px;
    border: 1px solid #dfe2e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    opacity: 1;
    padding: 0 12px;
  }

  .invite-panel input:disabled,
  .invite-panel select:disabled,
  .member-controls select:disabled {
    -webkit-text-fill-color: #202126;
    background: #ffffff;
    color: #202126;
    opacity: 1;
  }

  .invite-panel button {
    background: #111111;
    border: 1px solid #111111;
    color: #ffffff;
  }

  .invite-panel button:disabled {
    background: #d7d9de;
    border-color: #d7d9de;
    cursor: not-allowed;
  }

  .panel-note {
    color: #888c95;
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
  }

  .role-help {
    background: #f7f7f8;
    border: 1px solid #eceef1;
    border-radius: 8px;
    color: #555b66;
    font-size: 13px;
    line-height: 1.55;
    margin: -6px 0 0;
    padding: 10px 12px;
  }

  .panel-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .panel-head span {
    color: #767a83;
    font-size: 13px;
    font-weight: 700;
  }

  .member-list {
    display: grid;
    gap: 10px;
  }

  .member-row {
    align-items: center;
    border: 1px solid #eceef1;
    border-radius: 10px;
    display: grid;
    gap: 12px;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    padding: 12px;
  }

  .member-avatar {
    align-items: center;
    background: #ffd946;
    border-radius: 10px;
    color: #111111;
    display: flex;
    font-weight: 900;
    height: 38px;
    justify-content: center;
    width: 38px;
    overflow: hidden;
  }

  .member-avatar img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .member-main {
    min-width: 0;
  }

  .member-main strong,
  .member-main span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .member-main span {
    color: #767a83;
    font-size: 13px;
    margin-top: 3px;
  }

  .member-main button {
    background: transparent;
    border: 0;
    color: #111111;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    margin-top: 6px;
    padding: 0;
  }

  .member-controls {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .member-controls strong {
    color: #4b5563;
    font-size: 13px;
  }

  .status {
    border-radius: 999px;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
    padding: 5px 9px;
    white-space: nowrap;
  }

  .status.active {
    background: #dcfce7;
    color: #166534;
  }

  .status.pending {
    background: #fff1c2;
    color: #7a5a00;
  }

  .remove {
    background: #ffffff;
    border: 1px solid #efcaca;
    border-radius: 8px;
    color: #b42318;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    min-height: 34px;
    padding: 0 10px;
  }

  .member-empty {
    border: 1px dashed #dfe2e7;
    border-radius: 10px;
    color: #767a83;
    padding: 26px;
    text-align: center;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .team-body {
      padding: 18px;
    }

    .team-grid,
    .member-row {
      grid-template-columns: 1fr;
    }

    .team-hero,
    .member-controls {
      align-items: stretch;
      flex-direction: column;
    }

    .team-hero button,
    .member-controls select,
    .remove {
      width: 100%;
    }
  }
`
