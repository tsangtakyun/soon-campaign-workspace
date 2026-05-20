'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { createClient } from '@/lib/supabase'
import { setActiveWorkspaceId } from '@/lib/workspace-client'

const ONBOARDING_SESSION_KEYS = [
  'soon-website-analysis-v1',
  'soon-business-profile-v1',
  'soon-content-strategy-v1',
  'soon-campaign-details-v1',
  'soon-distribution-preferences-v1',
  'soon-content-mix-v1',
  'soon-content-mood-v1',
  'soon-visual-style-v1',
  'soon-typeface-v1',
  'soon-photo-control-v2',
  'soon-topic-review-v1',
  'soon-campaign-themes-v1',
  'soon-onboarding-persisted-v1',
]

function clearOnboardingDraft() {
  ONBOARDING_SESSION_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key)
  })
}

export default function NewWorkspacePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok || typeof result?.workspace?.id !== 'string') {
        throw new Error(result?.error || 'Failed to create workspace')
      }

      clearOnboardingDraft()
      setActiveWorkspaceId(result.workspace.id)
      router.push('/onboarding/content-engine')
    } catch (err) {
      console.error('[new-workspace] failed to create workspace:', err)
      setError('建立工作台時出現問題，請再試一次。')
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const canSubmit = name.trim().length > 0 && !submitting

  return (
    <main className="new-workspace-page">
      <div className="workspace-card">
        <div className="workspace-card-top">
          <Link href="/onboarding">切換工作台</Link>
          <button type="button" onClick={handleSignOut}>
            登出
          </button>
        </div>

        <form onSubmit={handleSubmit} className="workspace-form">
          <div>
            <p className="workspace-eyebrow">SOON Workspace</p>
            <h1>建立新工作台</h1>
            <p>每個工作台代表一個品牌。你可以隨時切換。</p>
          </div>

          <label>
            <span>品牌或工作台名稱</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="輸入品牌或工作台名稱"
            />
          </label>

          {error ? <p className="workspace-error">{error}</p> : null}

          <button type="submit" disabled={!canSubmit} className="workspace-submit">
            {submitting ? '建立中...' : '開始建立 →'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .new-workspace-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(rgba(0, 0, 0, 0.38), rgba(0, 0, 0, 0.5)),
            url('/onboarding/new-workspace-bg.png') center / cover no-repeat,
            linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        }

        .new-workspace-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, black 0%, transparent 78%);
        }

        .new-workspace-page::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.2) 100%);
        }

        .workspace-card {
          position: relative;
          z-index: 2;
          width: min(100%, 480px);
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 22px;
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.35);
          padding: 22px;
          color: #202126;
          backdrop-filter: blur(14px);
        }

        .workspace-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 34px;
          font-size: 13px;
        }

        .workspace-card-top a,
        .workspace-card-top button {
          border: none;
          background: transparent;
          padding: 0;
          color: #5f636b;
          font: inherit;
          cursor: pointer;
          text-decoration: none;
        }

        .workspace-card-top a:hover,
        .workspace-card-top button:hover {
          color: #202126;
        }

        .workspace-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
          padding: 0 8px 8px;
        }

        .workspace-eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: 0;
          color: #111217;
        }

        h1 + p {
          margin: 12px 0 0;
          color: #6f737d;
          font-size: 15px;
          line-height: 1.6;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label span {
          font-size: 13px;
          color: #4d515a;
          font-weight: 600;
        }

        input {
          width: 100%;
          height: 52px;
          border: 1px solid #e0e2e7;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 15px;
          color: #17181d;
          background: #fff;
          outline: none;
          transition: border 150ms, box-shadow 150ms;
        }

        input:focus {
          border-color: #111217;
          box-shadow: 0 0 0 4px rgba(17, 18, 23, 0.08);
        }

        .workspace-error {
          margin: -8px 0 0;
          color: #b91c1c;
          font-size: 13px;
        }

        .workspace-submit {
          height: 52px;
          border: none;
          border-radius: 12px;
          background: #202126;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 150ms, opacity 150ms, background 150ms;
        }

        .workspace-submit:not(:disabled):hover {
          transform: translateY(-1px);
          background: #111217;
        }

        .workspace-submit:disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }

        @media (max-width: 640px) {
          .new-workspace-page {
            padding: 18px;
          }

          .workspace-card {
            border-radius: 18px;
            padding: 20px;
          }

          h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  )
}
