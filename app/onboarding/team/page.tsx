'use client'

import { useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type InviteTab = 'email' | 'link'
type RoleKey = 'admin' | 'editor' | 'viewer'

const roleOptions: Array<{ key: RoleKey; label: string; description: string }> = [
  { key: 'admin', label: '管理員', description: '可管理所有內容、成員及設定' },
  { key: 'editor', label: '編輯', description: '可建立及編輯內容，不可管理成員' },
  { key: 'viewer', label: '只讀', description: '只可瀏覽內容及審批' },
]

const members = [
  { name: '你（Tommy）', email: 'tsangtakyun@gmail.com', role: '管理員', status: '擁有者', statusTone: 'owner' },
  { name: 'Dingding', email: 'dingding@sooncreator.network', role: '編輯', status: '已接受 ✓', statusTone: 'accepted' },
  { name: 'Renee', email: 'renee@sooncreator.network', role: '只讀', status: '待確認 ⏳', statusTone: 'pending' },
]

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<InviteTab>('email')
  const [emailInput, setEmailInput] = useState('')
  const [emailTags, setEmailTags] = useState<string[]>([])
  const [emailRole, setEmailRole] = useState<RoleKey>('editor')
  const [linkRole, setLinkRole] = useState<RoleKey>('editor')
  const [linkExpiry, setLinkExpiry] = useState('30 日')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const inviteLink = 'https://sooncreator.network/invite/abc123xyz'

  function showToast(text: string) {
    setToast(text)
    window.setTimeout(() => setToast(''), 3200)
  }

  function addEmails(rawValue: string) {
    const nextEmails = rawValue
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (nextEmails.length === 0) return
    setEmailTags((current) => Array.from(new Set([...current, ...nextEmails])))
    setEmailInput('')
  }

  function handleEmailKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addEmails(emailInput)
  }

  function sendInvites() {
    if (emailInput.trim()) addEmails(emailInput)
    showToast('✓ 邀請已發送！')
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      // Keep the UI optimistic even when clipboard permission is blocked.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="邀請團隊成員" />

      <section className="team-shell">
        {toast ? <div className="success-toast">{toast}</div> : null}

        <div className="team-panel">
          <header className="team-header">
            <div>
              <h1>邀請團隊成員</h1>
              <span className="free-badge">✓ 完全免費 · 唔需要升級</span>
              <p>邀請你的團隊一起使用 SOON，共同管理內容、審批帖文、協作創作。</p>
            </div>
          </header>

          <section className="invite-card">
            <div className="tab-row" role="tablist" aria-label="邀請方式">
              <button
                aria-selected={activeTab === 'email'}
                className={activeTab === 'email' ? 'active' : ''}
                onClick={() => setActiveTab('email')}
                role="tab"
                type="button"
              >
                用 Email 邀請
              </button>
              <button
                aria-selected={activeTab === 'link'}
                className={activeTab === 'link' ? 'active' : ''}
                onClick={() => setActiveTab('link')}
                role="tab"
                type="button"
              >
                邀請連結
              </button>
            </div>

            {activeTab === 'email' ? (
              <div className="invite-form">
                <label>
                  <span>Email 地址</span>
                  <input
                    onBlur={() => addEmails(emailInput)}
                    onChange={(event) => setEmailInput(event.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="輸入 Email，用逗號或 Enter 分隔"
                    value={emailInput}
                  />
                </label>
                {emailTags.length > 0 ? (
                  <div className="email-tags">
                    {emailTags.map((email) => (
                      <span key={email}>
                        {email}
                        <button
                          aria-label={`移除 ${email}`}
                          onClick={() => setEmailTags((current) => current.filter((item) => item !== email))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="field-group">
                  <span>邀請身份</span>
                  <div className="role-grid">
                    {roleOptions.map((role) => (
                      <button
                        className={emailRole === role.key ? 'selected' : ''}
                        key={role.key}
                        onClick={() => setEmailRole(role.key)}
                        type="button"
                      >
                        <strong>{role.label}</strong>
                        <em>{role.description}</em>
                      </button>
                    ))}
                  </div>
                </div>

                <label>
                  <span>個人訊息（選填）</span>
                  <textarea
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="例：歡迎加入我們的 SOON 工作台！"
                    rows={4}
                    value={message}
                  />
                </label>

                <button className="primary-button full-width" onClick={sendInvites} type="button">
                  發送邀請 →
                </button>
              </div>
            ) : (
              <div className="invite-form">
                <label>
                  <span>邀請連結</span>
                  <div className="link-box">
                    <code>{inviteLink}</code>
                    <button onClick={() => void copyInviteLink()} type="button">
                      {copied ? '✓ 已複製！' : '複製連結'}
                    </button>
                  </div>
                </label>

                <div className="field-group">
                  <span>連結有效期</span>
                  <div className="expiry-options">
                    {['7 日', '30 日', '永久有效'].map((option) => (
                      <label key={option}>
                        <input
                          checked={linkExpiry === option}
                          onChange={() => setLinkExpiry(option)}
                          type="radio"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                <label>
                  <span>受邀者身份</span>
                  <select onChange={(event) => setLinkRole(event.target.value as RoleKey)} value={linkRole}>
                    {roleOptions.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.label} — {role.description}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="link-footer-row">
                  <button className="secondary-button" type="button">
                    重新生成連結
                  </button>
                  <p>任何持有此連結的人都可以加入你的工作台</p>
                </div>
              </div>
            )}
          </section>

          <section className="members-card">
            <header>
              <h2>現有成員</h2>
              <span>{members.length}</span>
            </header>

            <div className="member-table">
              <div className="member-table-head">
                <span>成員</span>
                <span>身份</span>
                <span>狀態</span>
                <span>操作</span>
              </div>

              {members.map((member) => (
                <div className="member-row" key={member.email}>
                  <div className="member-profile">
                    <div className="avatar">{member.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </div>
                  </div>
                  <span className="role-badge">{member.role}</span>
                  <span className={`status-badge ${member.statusTone}`}>{member.status}</span>
                  <div className="member-actions">
                    {member.statusTone === 'owner' ? (
                      <span className="no-action">—</span>
                    ) : member.statusTone === 'pending' ? (
                      <>
                        <button type="button">重發邀請</button>
                        <button className="danger-link" type="button">移除</button>
                      </>
                    ) : (
                      <>
                        <button type="button">更改身份 ▼</button>
                        <button className="danger-link" type="button">移除</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
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
  grid-template-columns: 240px minmax(0, 1fr);
}

.team-shell {
  min-height: 100vh;
  min-width: 0;
  background: #f7f7fb;
  color: #111827;
  padding: 32px;
  position: relative;
}

.team-panel {
  max-width: 1080px;
  margin: 0 auto;
}

.team-header {
  margin-bottom: 22px;
}

.team-header h1 {
  margin: 0 0 10px;
  font-size: 32px;
  line-height: 1.12;
}

.team-header p {
  max-width: 680px;
  margin: 14px 0 0;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.7;
}

.free-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  background: #ecfdf5;
  color: #15803d;
  font-size: 13px;
  font-weight: 900;
  padding: 7px 11px;
}

.invite-card,
.members-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
}

.invite-card {
  margin-bottom: 20px;
  padding: 20px;
}

.tab-row {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  margin-bottom: 20px;
}

.tab-row button {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 9px 16px;
}

.tab-row button.active {
  background: #0a0a0a;
  color: #ffffff;
}

.invite-form {
  display: grid;
  gap: 16px;
}

.invite-form label,
.field-group {
  display: grid;
  gap: 8px;
}

.invite-form label > span,
.field-group > span {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.invite-form input,
.invite-form textarea,
.invite-form select {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  padding: 11px 13px;
}

.invite-form input::placeholder,
.invite-form textarea::placeholder {
  color: #9ca3af;
}

.email-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.email-tags span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: #7c3aed;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  padding: 7px 10px;
}

.email-tags button {
  border: 0;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.role-grid button {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  display: grid;
  gap: 5px;
  padding: 13px;
  text-align: left;
}

.role-grid button.selected {
  border-color: #7c3aed;
  background: #f5f3ff;
  box-shadow: inset 0 0 0 1px #7c3aed;
}

.role-grid strong {
  font-size: 14px;
}

.role-grid em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
}

.primary-button {
  border: 0;
  border-radius: 10px;
  background: #7c3aed;
  color: #ffffff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
  padding: 13px 18px;
  box-shadow: 0 12px 24px rgba(124, 58, 237, .24);
}

.full-width {
  width: 100%;
}

.link-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.link-box code {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  color: #374151;
  display: block;
  overflow: hidden;
  padding: 11px 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-box button {
  border: 1px solid #d8c9ff;
  border-radius: 10px;
  background: #ffffff;
  color: #7c3aed;
  cursor: pointer;
  font-weight: 900;
  padding: 0 14px;
}

.expiry-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.expiry-options label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #374151;
  cursor: pointer;
  font-weight: 800;
  padding: 9px 12px;
}

.expiry-options input {
  accent-color: #7c3aed;
  width: auto;
}

.link-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.secondary-button {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

.link-footer-row p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.members-card {
  overflow: hidden;
}

.members-card > header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 18px 20px;
  border-bottom: 1px solid #eef0f4;
}

.members-card h2 {
  margin: 0;
  font-size: 20px;
}

.members-card > header span {
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 8px;
}

.member-table-head,
.member-row {
  display: grid;
  grid-template-columns: 1.7fr .8fr .8fr 1fr;
  gap: 14px;
  align-items: center;
}

.member-table-head {
  background: #fafafa;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  padding: 12px 20px;
}

.member-row {
  padding: 16px 20px;
  border-top: 1px solid #f1f2f5;
}

.member-profile {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 900;
}

.member-profile strong,
.member-profile small {
  display: block;
}

.member-profile small {
  color: #9ca3af;
  font-size: 12px;
  margin-top: 3px;
}

.role-badge,
.status-badge {
  justify-self: start;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
}

.role-badge {
  background: #f4f4f5;
  color: #374151;
}

.status-badge.owner {
  background: #eef2ff;
  color: #4338ca;
}

.status-badge.accepted {
  background: #ecfdf5;
  color: #15803d;
}

.status-badge.pending {
  background: #fffbeb;
  color: #b45309;
}

.member-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-actions button {
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 8px 10px;
}

.member-actions .danger-link {
  border-color: #fecaca;
  color: #dc2626;
}

.no-action {
  color: #9ca3af;
}

.success-toast {
  position: sticky;
  top: 18px;
  z-index: 20;
  max-width: 1080px;
  margin: 0 auto 16px;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 14px;
  font-weight: 900;
  padding: 12px 16px;
  box-shadow: 0 10px 24px rgba(22, 163, 74, .12);
}

@media (max-width: 1040px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .team-shell {
    padding: 24px;
  }
}

@media (max-width: 760px) {
  .team-shell {
    padding: 18px;
  }

  .role-grid,
  .member-table-head,
  .member-row,
  .link-box {
    grid-template-columns: 1fr;
  }

  .member-table-head {
    display: none;
  }

  .link-footer-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
`
