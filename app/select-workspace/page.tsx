'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase'
import {
  cacheActiveWorkspace,
  clearActiveWorkspaceId,
  isBechillWorkspace,
  isEggWorkspace,
  setActiveWorkspaceId,
  workspaceInitial,
  type WorkspaceSummary,
} from '@/lib/workspace-client'

const SOON_LOGO_URL = 'https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/Soon_logo.png'

function workspaceLogoUrl(workspace: WorkspaceSummary) {
  if (workspace.logoUrl) return workspace.logoUrl
  if (isBechillWorkspace(workspace)) return '/brand-assets/bechilltogether/bunchill-logo.png'
  if (isEggWorkspace(workspace)) return '/brand-assets/eggsoon/soon-egg.png'
  return null
}

const roleLabels: Record<string, string> = {
  owner: '擁有者',
  admin: '管理員',
  member: '成員',
  client_approver: '客戶審批人',
  viewer: '檢視者',
}

function WorkspaceSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = normalizeWorkspaceNext(searchParams.get('next'))
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectingId, setSelectingId] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadWorkspaces() {
      try {
        const response = await fetch('/api/workspaces', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || '未能載入工作空間。')
        if (cancelled) return
        setWorkspaces(Array.isArray(payload?.workspaces) ? payload.workspaces : [])
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : '未能載入工作空間。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadWorkspaces()
    return () => {
      cancelled = true
    }
  }, [])

  function selectWorkspace(workspace: WorkspaceSummary) {
    setSelectingId(workspace.id)
    setActiveWorkspaceId(workspace.id)
    cacheActiveWorkspace(workspace)
    window.location.assign(next)
  }

  async function signOut() {
    const supabase = createClient()
    clearActiveWorkspaceId()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="workspace-select-page">
      <div className="workspace-select-glow workspace-select-glow--one" />
      <div className="workspace-select-glow workspace-select-glow--two" />

      <section className="workspace-select-shell">
        <header>
          <a className="soon-mark" href="/" aria-label="返回 SOON 首頁">
            <img src={SOON_LOGO_URL} alt="SOON" />
          </a>
          <button type="button" onClick={signOut}>使用其他帳戶</button>
        </header>

        <div className="workspace-card">
          <p className="eyebrow">歡迎回來</p>
          <h1>選擇工作空間</h1>
          <p className="intro">揀選今次要管理嘅品牌，之後仍可在左上角切換。</p>

          {loading ? <div className="status">正在載入你的工作空間...</div> : null}
          {message ? <div className="status error">{message}</div> : null}

          {!loading && !message ? (
            <div className="workspace-list">
              {workspaces.map((workspace) => {
                const label = workspace.brandName || workspace.name
                const logoUrl = workspaceLogoUrl(workspace)
                return (
                  <button
                    type="button"
                    className="workspace-option"
                    disabled={Boolean(selectingId)}
                    key={workspace.id}
                    onClick={() => selectWorkspace(workspace)}
                  >
                    <span className={`workspace-avatar${logoUrl ? ' workspace-avatar--logo' : ''}`}>
                      {logoUrl ? <img src={logoUrl} alt={`${label} logo`} /> : workspaceInitial(label)}
                    </span>
                    <span className="workspace-copy">
                      <strong>{label}</strong>
                      <small>{workspace.description || workspace.name || '品牌工作空間'}</small>
                    </span>
                    <span className="workspace-role">{roleLabels[workspace.role || ''] || '成員'}</span>
                    <span className="workspace-arrow">{selectingId === workspace.id ? '開啟中…' : '→'}</span>
                  </button>
                )
              })}

              {!workspaces.length ? (
                <div className="empty-state">
                  <strong>你暫時未有工作空間</strong>
                  <p>建立第一個品牌工作空間，開始設定內容策略。</p>
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </section>

      <style jsx>{`
        .workspace-select-page {
          min-height: 100vh;
          overflow: hidden;
          position: relative;
          display: grid;
          place-items: center;
          padding: 40px 24px;
          background: #07080b;
          color: #f7f8fb;
        }
        .workspace-select-glow {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.24;
          pointer-events: none;
        }
        .workspace-select-glow--one { top: -280px; left: -160px; background: #ef3f2f; }
        .workspace-select-glow--two { right: -180px; bottom: -300px; background: #ffd337; }
        .workspace-select-shell { width: min(720px, 100%); position: relative; z-index: 1; }
        header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        header button {
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.68);
          font: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .soon-mark { display: inline-flex; align-items: center; }
        .soon-mark img { display: block; width: auto; height: 52px; object-fit: contain; }
        .workspace-card {
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 22px;
          background: rgba(20,21,25,0.94);
          box-shadow: 0 36px 100px rgba(0,0,0,0.52);
          padding: clamp(26px, 5vw, 48px);
        }
        .eyebrow { margin: 0 0 8px; color: #ffd337; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.16em; }
        h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.35rem); line-height: 1.08; }
        .intro { margin: 12px 0 30px; color: rgba(255,255,255,0.62); line-height: 1.65; }
        .workspace-list { display: grid; gap: 12px; }
        .workspace-option {
          width: 100%;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) auto auto;
          gap: 14px;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          background: rgba(255,255,255,0.045);
          color: #ffffff;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
        }
        .workspace-option:hover { border-color: rgba(255,211,55,0.62); background: rgba(255,255,255,0.075); transform: translateY(-1px); }
        .workspace-option:disabled { cursor: wait; opacity: 0.7; transform: none; }
        .workspace-avatar { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 12px; background: #ef3f2f; font-weight: 900; }
        .workspace-avatar--logo { overflow: hidden; background: #ffffff; }
        .workspace-avatar--logo img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .workspace-copy { min-width: 0; display: grid; gap: 4px; }
        .workspace-copy strong, .workspace-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .workspace-copy strong { font-size: 1rem; }
        .workspace-copy small { color: rgba(255,255,255,0.5); font-size: 0.8rem; }
        .workspace-role { border-radius: 999px; background: rgba(255,255,255,0.08); padding: 5px 9px; color: rgba(255,255,255,0.7); font-size: 0.72rem; white-space: nowrap; }
        .workspace-arrow { min-width: 24px; color: #ffd337; font-size: 1rem; text-align: right; white-space: nowrap; }
        .status, .empty-state { border-radius: 14px; background: rgba(255,255,255,0.05); padding: 22px; color: rgba(255,255,255,0.7); text-align: center; }
        .status.error { color: #ffb7b0; }
        .empty-state p { margin: 7px 0 0; color: rgba(255,255,255,0.52); font-size: 0.9rem; }
        @media (max-width: 580px) {
          .workspace-select-page { padding: 24px 16px; align-items: start; }
          .workspace-select-shell { margin-top: 32px; }
          .workspace-card { border-radius: 18px; }
          .workspace-option { grid-template-columns: 42px minmax(0, 1fr) auto; }
          .workspace-avatar { width: 42px; height: 42px; }
          .soon-mark img { height: 44px; }
          .workspace-role { display: none; }
        }
      `}</style>
    </main>
  )
}

function normalizeWorkspaceNext(value: string | null) {
  if (!value || value === '/login' || value.startsWith('/login?') || value.startsWith('/select-workspace')) {
    return '/onboarding'
  }
  return value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding'
}

export default function SelectWorkspacePage() {
  return (
    <Suspense>
      <WorkspaceSelector />
    </Suspense>
  )
}
