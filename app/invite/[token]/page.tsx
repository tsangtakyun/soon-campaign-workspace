'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase'

type InvitePayload = {
  invitation?: {
    workspaceId: string
    workspaceName?: string | null
    email?: string | null
    role: 'admin' | 'editor' | 'viewer'
    status: 'pending' | 'accepted' | 'expired'
    expiresAt: string
    message?: string | null
    openLink?: boolean
  }
  currentUser?: { id: string; email?: string | null } | null
  alreadyMember?: boolean
  emailMatches?: boolean
  error?: string
}

function roleLabel(role?: string) {
  if (role === 'admin') return '管理員'
  if (role === 'viewer') return '只讀'
  return '編輯'
}

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const [payload, setPayload] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadInvite() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/invite/accept?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        const data = await response.json().catch(() => null)
        if (!cancelled) {
          setPayload(data)
          if (!response.ok) setError(data?.error || '此邀請連結已失效或不存在')
        }
      } catch {
        if (!cancelled) setError('無法載入邀請，請稍後再試。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInvite()

    return () => {
      cancelled = true
    }
  }, [token])

  async function acceptInvite() {
    setAccepting(true)
    setError('')
    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || '接受邀請失敗')
      router.push('/onboarding')
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : '接受邀請失敗')
    } finally {
      setAccepting(false)
    }
  }

  async function signOutAndLogin() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  const invitation = payload?.invitation
  const invalid = Boolean(error && !invitation)
  const expired = invitation?.status === 'expired'
  const accepted = invitation?.status === 'accepted' || payload?.alreadyMember
  const loggedIn = Boolean(payload?.currentUser)
  const emailMismatch = loggedIn && payload?.emailMatches === false

  return (
    <main className="invite-page">
      <section className="invite-card">
        <div className="brand-mark">SOON</div>

        {loading ? (
          <>
            <h1>載入邀請中...</h1>
            <p>請稍候，我哋正在確認邀請連結。</p>
          </>
        ) : invalid || expired ? (
          <>
            <h1>此邀請連結已失效或不存在</h1>
            <p>請聯絡工作台管理員重新發送邀請。</p>
            <button type="button" onClick={() => router.push('/')}>
              返回 SOON
            </button>
          </>
        ) : accepted ? (
          <>
            <h1>你已經係此工作台的成員</h1>
            <p>{invitation?.workspaceName || 'SOON 工作台'} 已經可以喺你的工作台列表中使用。</p>
            <button type="button" onClick={() => router.push('/onboarding')}>
              前往工作台
            </button>
          </>
        ) : emailMismatch ? (
          <>
            <h1>登入 Email 與邀請不相符</h1>
            <p>
              呢個邀請係寄俾 {invitation?.email}，你目前登入的是 {payload?.currentUser?.email}。
            </p>
            <button type="button" onClick={() => void signOutAndLogin()}>
              轉用受邀 Email 登入
            </button>
          </>
        ) : !loggedIn ? (
          <>
            <h1>你被邀請加入 {invitation?.workspaceName || 'SOON 工作台'}</h1>
            <p>請先登入或註冊，完成後就可以接受邀請。</p>
            <button type="button" onClick={() => router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)}>
              登入 / 註冊以接受邀請
            </button>
          </>
        ) : (
          <>
            <h1>你被邀請加入 {invitation?.workspaceName || 'SOON 工作台'}</h1>
            <div className="invite-details">
              <span>身份</span>
              <strong>{roleLabel(invitation?.role)}</strong>
              <span>到期日</span>
              <strong>{invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('zh-HK') : '-'}</strong>
              {invitation?.message ? (
                <>
                  <span>留言</span>
                  <strong>{invitation.message}</strong>
                </>
              ) : null}
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" disabled={accepting} onClick={() => void acceptInvite()}>
              {accepting ? '接受中...' : '接受邀請'}
            </button>
          </>
        )}
      </section>

      <style jsx>{`
        .invite-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f8fafc, #f5f3ff);
          color: #111827;
          padding: 24px;
        }

        .invite-card {
          width: min(100%, 460px);
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
          padding: 32px;
          text-align: center;
        }

        .brand-mark {
          display: inline-grid;
          place-items: center;
          width: 58px;
          height: 58px;
          margin-bottom: 18px;
          border-radius: 16px;
          background: #0a0a0a;
          color: #ffffff;
          font-weight: 900;
          letter-spacing: 0;
        }

        h1 {
          margin: 0 0 12px;
          font-size: 26px;
          line-height: 1.2;
        }

        p {
          margin: 0 0 22px;
          color: #6b7280;
          line-height: 1.7;
        }

        button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: #7c3aed;
          color: #ffffff;
          cursor: pointer;
          font-size: 15px;
          font-weight: 900;
          padding: 13px 18px;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .invite-details {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px 14px;
          margin: 20px 0 22px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          padding: 14px;
          text-align: left;
        }

        .invite-details span {
          color: #6b7280;
          font-size: 13px;
        }

        .invite-details strong {
          color: #111827;
          font-size: 14px;
        }

        .error {
          margin: 0 0 14px;
          color: #dc2626;
          font-size: 13px;
        }
      `}</style>
    </main>
  )
}
