'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { setActiveWorkspaceId } from '@/lib/workspace-client'

type InvitePayload = {
  invite?: {
    email?: string | null
    role?: string | null
    status?: string | null
    workspace_id?: string | null
  }
  signedInEmail?: string | null
  workspace?: { name?: string | null } | null
}

function roleLabel(role?: string | null) {
  if (role === 'admin') return '管理員'
  if (role === 'client_approver') return '客戶審批人'
  if (role === 'viewer') return '只讀成員'
  return '成員'
}

export default function InvitePage() {
  const params = useParams<{ inviteId: string }>()
  const router = useRouter()
  const inviteId = params.inviteId
  const [payload, setPayload] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadInvite() {
      setLoading(true)
      const response = await fetch(`/api/team-invites/${inviteId}`, { cache: 'no-store' })
      const nextPayload = await response.json().catch(() => null)
      if (cancelled) return
      setPayload(response.ok ? nextPayload : null)
      setMessage(response.ok ? '' : '邀請連結無效或已被移除。')
      setLoading(false)
    }

    void loadInvite()
    return () => {
      cancelled = true
    }
  }, [inviteId])

  async function acceptInvite() {
    setAccepting(true)
    setMessage('')

    const response = await fetch(`/api/team-invites/${inviteId}`, { method: 'POST' })
    const result = await response.json().catch(() => null)

    if (response.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`
      return
    }

    if (!response.ok || !result?.workspaceId) {
      setMessage(result?.error === 'Email does not match invite'
        ? '你目前登入的電郵與邀請電郵不一致。請用被邀請的電郵登入。'
        : '暫時未能接受邀請，請稍後再試。')
      setAccepting(false)
      return
    }

    setActiveWorkspaceId(result.workspaceId)
    router.replace('/onboarding')
  }

  const invite = payload?.invite
  const workspaceName = payload?.workspace?.name || 'SOON 工作台'
  const signedInEmail = payload?.signedInEmail
  const inviteEmail = invite?.email || ''
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`
  const signupHref = `/signup?next=${encodeURIComponent(`/invite/${inviteId}`)}`

  return (
    <main className="invite-page">
      <section className="invite-card">
        {loading ? (
          <h1>正在載入邀請...</h1>
        ) : invite ? (
          <>
            <span>SOON workspace invite</span>
            <h1>加入 {workspaceName}</h1>
            <p>
              你被邀請以「{roleLabel(invite.role)}」身份加入這個工作台。
            </p>
            <div className="invite-detail">
              <strong>邀請電郵</strong>
              <em>{inviteEmail}</em>
            </div>
            {signedInEmail ? (
              <div className="invite-detail">
                <strong>目前登入</strong>
                <em>{signedInEmail}</em>
              </div>
            ) : null}
            {invite.status === 'active' ? (
              <button type="button" onClick={() => {
                if (invite.workspace_id) setActiveWorkspaceId(invite.workspace_id)
                router.replace('/onboarding')
              }}>
                打開工作台
              </button>
            ) : signedInEmail ? (
              <button type="button" disabled={accepting} onClick={acceptInvite}>
                {accepting ? '處理中...' : '接受邀請'}
              </button>
            ) : (
              <div className="invite-actions">
                <Link href={loginHref}>登入接受邀請</Link>
                <Link href={signupHref}>建立帳戶</Link>
              </div>
            )}
          </>
        ) : (
          <h1>{message || '邀請連結無效'}</h1>
        )}
        {message && invite ? <p className="message">{message}</p> : null}
      </section>
      <style jsx>{`
        .invite-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f7f7f8;
          color: #202126;
          padding: 24px;
        }
        .invite-card {
          width: min(460px, 100%);
          border: 1px solid #e6e7eb;
          border-radius: 12px;
          background: #ffffff;
          padding: 30px;
          box-shadow: 0 18px 50px rgba(32, 33, 38, 0.08);
        }
        span {
          color: #767a83;
          display: block;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        h1 {
          margin: 0 0 10px;
          font-size: 26px;
        }
        p {
          color: #666b74;
          line-height: 1.6;
          margin: 0 0 18px;
        }
        .invite-detail {
          border: 1px solid #eceef1;
          border-radius: 8px;
          display: grid;
          gap: 4px;
          margin-bottom: 10px;
          padding: 12px;
        }
        .invite-detail strong {
          font-size: 12px;
          color: #777b84;
        }
        .invite-detail em {
          color: #202126;
          font-style: normal;
          font-weight: 650;
        }
        button,
        .invite-actions a {
          align-items: center;
          border-radius: 8px;
          display: inline-flex;
          font: inherit;
          font-weight: 750;
          justify-content: center;
          min-height: 44px;
          text-decoration: none;
        }
        button {
          background: #111111;
          border: 1px solid #111111;
          color: #ffffff;
          cursor: pointer;
          margin-top: 10px;
          width: 100%;
        }
        button:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .invite-actions {
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr 1fr;
          margin-top: 18px;
        }
        .invite-actions a:first-child {
          background: #111111;
          color: #ffffff;
        }
        .invite-actions a:last-child {
          border: 1px solid #e1e3e7;
          color: #111111;
        }
        .message {
          background: #fff4cf;
          border-radius: 8px;
          color: #665719;
          margin: 16px 0 0;
          padding: 12px;
        }
      `}</style>
    </main>
  )
}
