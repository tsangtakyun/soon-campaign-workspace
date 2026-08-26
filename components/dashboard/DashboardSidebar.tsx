'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  cacheActiveWorkspace,
  clearActiveWorkspaceId,
  getActiveWorkspaceId,
  getCachedActiveWorkspace,
  isBechillWorkspaceLabel,
  isEggWorkspaceLabel,
  setActiveWorkspaceId,
  workspaceInitial,
  type WorkspaceSummary,
} from '@/lib/workspace-client'

type SidebarItem = {
  icon: string
  label: string
  href: string
}

const sidebarItems: SidebarItem[] = [
  { icon: '⌂', label: '首頁', href: '/onboarding' },
  { icon: '▣', label: '已排程內容', href: '/onboarding/scheduled-posts' },
  { icon: '▱', label: '題材庫', href: '/onboarding/topic-library' },
  { icon: '✦', label: '內容製作', href: '/onboarding/content-studio' },
  { icon: '↯', label: '整合', href: '/onboarding/integrations' },
  { icon: '✤', label: '品牌素材庫', href: '/onboarding/brand-kit' },
  { icon: '☷', label: '內容偏好', href: '/onboarding/content-preferences' },
  { icon: '▥', label: '洞察', href: '/onboarding/insights' },
]

type DashboardSidebarProps = {
  activeItem: string
}

const BECHILL_LOGO_URL = '/brand-assets/bechilltogether/bunchill-logo.png'
const EGG_SOON_LOGO_URL = '/brand-assets/eggsoon/soon-egg.png'

export function DashboardSidebar({ activeItem }: DashboardSidebarProps) {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const cachedWorkspace = getCachedActiveWorkspace()
    if (!cachedWorkspace) return

    setWorkspaces([cachedWorkspace])
    setActiveWorkspaceIdState(getActiveWorkspaceId() || cachedWorkspace.id)
  }, [])

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null
  const activeWorkspaceLabel = activeWorkspace?.brandName || activeWorkspace?.name || '你的工作台'
  const activeWorkspaceLogoUrl = activeWorkspace?.logoUrl || (isBechillWorkspaceLabel(activeWorkspaceLabel)
    ? BECHILL_LOGO_URL
    : isEggWorkspaceLabel(activeWorkspaceLabel)
      ? EGG_SOON_LOGO_URL
      : '')
  const canUseContentStudio = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'

  useEffect(() => {
    let cancelled = false

    async function loadSidebarData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user?.id) {
          return
        }

        const workspaceResponse = await fetch('/api/workspaces', { cache: 'no-store' })
        const workspacePayload = await workspaceResponse.json().catch(() => null)

        console.log('[DashboardSidebar] workspace query debug', {
          userId: user.id,
          source: 'GET /api/workspaces',
          responseStatus: workspaceResponse.status,
          workspacePayload,
        })

        if (!cancelled) {
          const mappedWorkspaces = Array.isArray(workspacePayload?.workspaces)
            ? (workspacePayload.workspaces as WorkspaceSummary[])
            : []

          setWorkspaces(mappedWorkspaces)
          if (!mappedWorkspaces.length) {
            setActiveWorkspaceIdState(null)
            return
          }

          const storedWorkspaceId = getActiveWorkspaceId()
          const nextActiveWorkspace =
            mappedWorkspaces.find((workspace) => workspace.id === storedWorkspaceId) || mappedWorkspaces[0]

          setActiveWorkspaceIdState(nextActiveWorkspace.id)
          cacheActiveWorkspace(nextActiveWorkspace)
          if (storedWorkspaceId !== nextActiveWorkspace.id) {
            setActiveWorkspaceId(nextActiveWorkspace.id)
          }
        }
      } catch {
        // Keep the dashboard usable when credit tables are not migrated yet.
      }
    }

    void loadSidebarData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }

    if (workspaceMenuOpen) {
      document.addEventListener('mousedown', handlePointerDown)
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [workspaceMenuOpen])

  function switchWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId)
    const nextWorkspace = workspaces.find((workspace) => workspace.id === workspaceId)
    if (nextWorkspace) cacheActiveWorkspace(nextWorkspace)
    setActiveWorkspaceIdState(workspaceId)
    setWorkspaceMenuOpen(false)
    router.refresh()
  }

  async function handleSignOut() {
    const supabase = createClient()
    clearActiveWorkspaceId()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div className="workspace-switcher-wrap" ref={workspaceMenuRef}>
        <button
          aria-expanded={workspaceMenuOpen}
          className="workspace-switcher"
          onClick={() => setWorkspaceMenuOpen((open) => !open)}
          type="button"
        >
          <div className={activeWorkspaceLogoUrl ? 'workspace-mark logo' : 'workspace-mark'}>
            {activeWorkspaceLogoUrl ? <img src={activeWorkspaceLogoUrl} alt="" /> : workspaceInitial(activeWorkspaceLabel)}
          </div>
          <strong
            style={{
              display: 'block',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeWorkspaceLabel}
          </strong>
          <span>⌄</span>
        </button>

        {workspaceMenuOpen ? (
          <div className="workspace-menu">
            <p>我的工作台</p>
            <div className="workspace-menu-list">
              {workspaces.length ? (
                workspaces.map((workspace) => (
                  <button
                    className={workspace.id === activeWorkspaceId ? 'active' : ''}
                    key={workspace.id}
                    onClick={() => switchWorkspace(workspace.id)}
                    type="button"
                  >
                    <span className="workspace-menu-check">
                      {workspace.id === activeWorkspaceId ? '✓' : ''}
                    </span>
                    <span>
                      <strong>{workspace.name}</strong>
                      <em>{workspace.brandName || workspace.description || '品牌工作台'}</em>
                    </span>
                  </button>
                ))
              ) : (
                <span className="workspace-menu-empty">暫時未有工作台</span>
              )}
            </div>
            <div className="workspace-menu-actions">
              <button type="button" className="logout" onClick={handleSignOut}>
                登出
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav" aria-label="工作台導覽">
        {sidebarItems.map((item) => {
          const isContentStudio = item.label === '內容製作'
          const itemDisabled = isContentStudio && !canUseContentStudio
          const content = <>
            <span>{item.icon}</span>
            <strong>{item.label}{itemDisabled ? <small>（暫時未公開）</small> : null}</strong>
          </>

          return itemDisabled ? (
            <span className="sidebar-disabled" aria-disabled="true" key={item.label}>{content}</span>
          ) : (
            <Link
              aria-current={item.label === activeItem ? 'page' : undefined}
              className={item.label === activeItem ? 'active' : ''}
              href={item.href}
              key={item.label}
              onClick={(event) => {
                event.preventDefault()
                router.push(item.href)
              }}
            >
              {content}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-credit-card is-unavailable" aria-label="Credits 暫時未公開">
        <span className="sidebar-credit-balance">0 credits 剩餘</span>
        <span className="sidebar-credit-action">暫時未公開</span>
      </div>

      <div className="sidebar-group">
        <p>觸及</p>
        <Link href="/onboarding/meta-ads">Ⓜ Meta Ads</Link>
        <Link href="/onboarding/team">邀請團隊成員</Link>
        <Link href="/onboarding/settings">設定</Link>
      </div>
    </aside>
  )
}

export const dashboardSidebarStyles = `
  .sidebar {
    min-height: 100vh;
    border-right: 1px solid #e6e7ea;
    background: #f2f3f5;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
    z-index: 30;
    pointer-events: auto;
  }

  .workspace-switcher-wrap {
    position: relative;
    border-bottom: 1px solid #e2e3e6;
    padding-bottom: 14px;
  }

  .workspace-switcher {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 10px;
    border: 0;
    background: transparent;
    width: 100%;
    padding: 8px 6px 4px;
    text-align: left;
    cursor: pointer;
    color: #202126;
  }

  .workspace-mark {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #ffd946;
    color: #111111;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 13px;
    overflow: hidden;
  }

  .workspace-mark.logo {
    background: #f7f1ec;
    border: 1px solid #e7ddd4;
  }

  .workspace-mark.logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .workspace-switcher strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 550;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-switcher span {
    color: #9a9da4;
  }

  .workspace-menu {
    position: absolute;
    left: 0;
    right: -8px;
    top: calc(100% + 8px);
    border: 1px solid #dedfe3;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 18px 42px rgba(18, 19, 24, 0.14);
    padding: 10px;
    z-index: 80;
    animation: workspaceMenuIn 140ms ease-out;
  }

  @keyframes workspaceMenuIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .workspace-menu p {
    margin: 4px 8px 8px;
    color: #9a9da4;
    font-size: 12px;
    font-weight: 600;
  }

  .workspace-menu-list {
    display: grid;
    gap: 4px;
    max-height: 260px;
    overflow-y: auto;
  }

  .workspace-menu-list button,
  .workspace-menu-actions button {
    border: 0;
    background: transparent;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 8px;
    padding: 9px 8px;
    text-align: left;
    width: 100%;
  }

  .workspace-menu-list button:hover,
  .workspace-menu-list button.active,
  .workspace-menu-actions button:hover {
    background: #f2f3f5;
  }

  .workspace-menu-check {
    color: #202126;
    font-size: 12px;
    line-height: 18px;
  }

  .workspace-menu-list strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
  }

  .workspace-menu-list em {
    color: #7d8088;
    display: block;
    font-size: 11px;
    font-style: normal;
    line-height: 1.35;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-menu-empty {
    color: #9a9da4;
    display: block;
    font-size: 12px;
    padding: 10px 8px;
  }

  .workspace-menu-actions {
    border-top: 1px solid #eceef1;
    display: grid;
    gap: 2px;
    margin-top: 8px;
    padding-top: 8px;
  }

  .workspace-menu-actions button {
    display: block;
    font-size: 13px;
  }

  .workspace-menu-actions button.logout {
    color: #991b1b;
  }

  .sidebar-nav,
  .sidebar-group,
  .sidebar-footer {
    display: grid;
    gap: 5px;
  }

  .sidebar-nav a,
  .sidebar-nav .sidebar-disabled,
  .sidebar-group a,
  .sidebar-footer a {
    min-height: 34px;
    border-radius: 9px;
    color: #6f7278;
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    text-decoration: none;
    font-size: 14px;
    white-space: nowrap;
    cursor: pointer;
  }

  .sidebar-group a,
  .sidebar-footer a {
    display: flex;
  }

  .sidebar-nav a.active {
    background: #e5e7eb;
    color: #202126;
  }

  .sidebar-nav .sidebar-disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .sidebar-nav strong small {
    font-size: 10px;
    font-weight: 500;
  }

  .sidebar-nav strong {
    font-weight: 500;
  }

  .sidebar-nav em {
    color: #9b9ea6;
    font-style: normal;
  }

  .sidebar-credit-card {
    border: 1px solid #dfe1e6;
    border-radius: 12px;
    background: #ffffff;
    color: #202126;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 11px 12px;
    text-decoration: none !important;
    white-space: normal;
  }

  .sidebar-credit-card:hover,
  .sidebar-credit-card:focus-visible {
    text-decoration: none !important;
  }

  .sidebar-credit-balance {
    color: #202126;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.25;
  }

  .sidebar-credit-action {
    color: #6f7278;
    font-size: 11px;
    line-height: 1.25;
    text-decoration: none;
  }

  .sidebar-credit-card:hover .sidebar-credit-action,
  .sidebar-credit-card:focus-visible .sidebar-credit-action {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .sidebar-credit-card.warning {
    border-color: #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }

  .sidebar-credit-card.warning .sidebar-credit-balance,
  .sidebar-credit-card.warning .sidebar-credit-action {
    color: #b91c1c;
  }

  .sidebar-group p {
    margin: 8px 10px 4px;
    color: #9a9da4;
    font-size: 12px;
  }

  .sidebar-footer {
    margin-top: auto;
    border-top: 1px solid #e2e3e6;
    padding-top: 12px;
  }

  @media (max-width: 980px) {
    .sidebar {
      min-height: auto;
      border-bottom: 1px solid #e1e3e8;
      border-right: 0;
      display: block;
      overflow: visible;
      padding: 10px 12px 8px;
      position: sticky;
      top: 0;
      z-index: 90;
    }

    .workspace-switcher-wrap {
      border-bottom: 0;
      padding-bottom: 8px;
    }

    .workspace-switcher {
      background: #ffffff;
      border: 1px solid #dedfe3;
      border-radius: 12px;
      min-height: 44px;
      padding: 7px 10px;
    }

    .workspace-menu {
      left: 0;
      right: 0;
      top: calc(100% + 4px);
    }

    .sidebar-nav {
      display: flex;
      gap: 8px;
      margin: 0 -12px;
      overflow-x: auto;
      padding: 0 12px 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .sidebar-nav::-webkit-scrollbar {
      display: none;
    }

    .sidebar-nav a,
    .sidebar-nav .sidebar-disabled {
      background: #ffffff;
      border: 1px solid #e2e4e8;
      border-radius: 999px;
      flex: 0 0 auto;
      grid-template-columns: auto auto;
      min-height: 36px;
      padding: 0 12px;
    }

    .sidebar-nav a.active {
      background: #111111;
      border-color: #111111;
      color: #ffffff;
    }

    .sidebar-nav a em {
      display: none;
    }

    .sidebar-credit-card,
    .sidebar-group,
    .sidebar-footer {
      display: none;
    }
  }
`
