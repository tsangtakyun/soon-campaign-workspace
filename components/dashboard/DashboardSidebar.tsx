'use client'

import Link from 'next/link'

type SidebarItem = {
  icon: string
  label: string
  href: string
  meta?: string
}

const sidebarItems: SidebarItem[] = [
  { icon: '⌂', label: '首頁', href: '/onboarding' },
  { icon: '▣', label: '日曆', href: '/onboarding/scheduled-posts' },
  { icon: '▱', label: '宣傳活動', href: '#' },
  { icon: '↯', label: '整合', href: '#', meta: '0/4' },
  { icon: '✤', label: '品牌素材庫', href: '#' },
  { icon: '☷', label: '內容偏好', href: '#' },
  { icon: '✓', label: '審批', href: '#' },
  { icon: '▥', label: '洞察', href: '#' },
]

type DashboardSidebarProps = {
  activeItem: string
}

export function DashboardSidebar({ activeItem }: DashboardSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="workspace-switcher">
        <div className="workspace-mark">S</div>
        <strong>Tommy 的工作台</strong>
        <span>⌄</span>
      </div>

      <nav className="sidebar-nav" aria-label="工作台導覽">
        {sidebarItems.map((item) => (
          <Link
            aria-current={item.label === activeItem ? 'page' : undefined}
            className={item.label === activeItem ? 'active' : ''}
            href={item.href}
            key={item.label}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
            {item.meta ? <em>{item.meta}</em> : null}
          </Link>
        ))}
      </nav>

      <div className="sidebar-group">
        <p>觸及</p>
        <a href="#">Ⓜ Meta Ads</a>
        <a href="#">SEO</a>
      </div>

      <div className="sidebar-footer">
        <a href="#">＋ 建立新項目</a>
        <a href="#">邀請團隊成員</a>
        <a href="#">幫助與學習</a>
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
  }

  .workspace-switcher {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 6px 18px;
    border-bottom: 1px solid #e2e3e6;
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
  }

  .workspace-switcher strong {
    font-size: 14px;
    font-weight: 550;
  }

  .workspace-switcher span {
    color: #9a9da4;
  }

  .sidebar-nav,
  .sidebar-group,
  .sidebar-footer {
    display: grid;
    gap: 5px;
  }

  .sidebar-nav a,
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
  }

  .sidebar-group a,
  .sidebar-footer a {
    display: flex;
  }

  .sidebar-nav a.active {
    background: #e5e7eb;
    color: #202126;
  }

  .sidebar-nav strong {
    font-weight: 500;
  }

  .sidebar-nav em {
    color: #9b9ea6;
    font-style: normal;
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
`
