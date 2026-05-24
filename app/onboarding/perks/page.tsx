import Link from 'next/link'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { createAdminSupabase } from '@/lib/server-supabase'

type BrandPerk = {
  id: string
  type: 'service' | 'product'
  title: string | null
  quota: number | null
  valid_until: string | null
  is_active: boolean | null
}

type PerkClaim = {
  perk_id: string | null
}

export default async function PerksPage() {
  const supabaseAdmin = createAdminSupabase()

  const [{ data: perks }, { data: claims }] = await Promise.all([
    supabaseAdmin.from('brand_perks').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('perk_claims').select('perk_id'),
  ])

  const claimCounts = ((claims ?? []) as PerkClaim[]).reduce<Record<string, number>>((acc, claim) => {
    if (!claim.perk_id) return acc
    acc[claim.perk_id] = (acc[claim.perk_id] || 0) + 1
    return acc
  }, {})

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="探索品牌優惠" />
      <section className="perks-main">
        <header className="perks-header">
          <div>
            <h1>探索品牌優惠</h1>
            <p>提供免費服務或產品，讓 KOL 主動了解你的品牌</p>
          </div>
          <Link className="primary-action" href="/onboarding/perks/new">
            + 新增優惠
          </Link>
        </header>

        <div className="perks-card">
          {!perks || perks.length === 0 ? (
            <div className="perks-empty">
              未有優惠，<Link href="/onboarding/perks/new">立即新增</Link>
            </div>
          ) : (
            <>
              <div className="perks-row head">
                <span>優惠</span>
                <span>類型</span>
                <span>名額</span>
                <span>狀態</span>
                <span />
              </div>
              {(perks as BrandPerk[]).map((perk) => (
                <div className="perks-row" key={perk.id}>
                  <div>
                    <strong>{perk.title || '未命名優惠'}</strong>
                    {perk.valid_until ? <em>有效至 {perk.valid_until}</em> : null}
                  </div>
                  <span>{perk.type === 'service' ? '服務' : '產品'}</span>
                  <span>
                    {claimCounts[perk.id] ?? 0} / {perk.quota ?? 0}
                  </span>
                  <span>
                    <em className={`status ${perk.is_active ? 'active' : 'paused'}`}>
                      {perk.is_active ? '進行中' : '已停用'}
                    </em>
                  </span>
                  <div className="perks-actions">
                    <Link href={`/onboarding/perks/new?id=${perk.id}`}>
                      編輯
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `${sidebarStyles}\n${styles}` }} />
    </main>
  )
}

const sidebarStyles = `
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
    grid-template-columns: 28px minmax(0, 1fr) auto;
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
  }

  .workspace-switcher strong,
  .sidebar-nav strong,
  .workspace-menu-list strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-switcher strong {
    font-size: 14px;
    font-weight: 550;
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
  }

  .workspace-menu p {
    margin: 4px 8px 8px;
    color: #9a9da4;
    font-size: 12px;
    font-weight: 600;
  }

  .workspace-menu-list,
  .workspace-menu-actions,
  .sidebar-nav,
  .sidebar-group,
  .sidebar-footer {
    display: grid;
    gap: 5px;
  }

  .workspace-menu-list {
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
    grid-template-columns: 18px minmax(0, 1fr);
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

  .workspace-menu-list em,
  .workspace-menu-empty {
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

  .workspace-menu-actions {
    border-top: 1px solid #eceef1;
    margin-top: 8px;
    padding-top: 8px;
  }

  .workspace-menu-actions button.logout {
    color: #991b1b;
  }

  .sidebar-nav a,
  .sidebar-group a,
  .sidebar-footer a {
    min-height: 34px;
    border-radius: 9px;
    color: #6f7278;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
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

  .sidebar-nav strong {
    font-weight: 500;
  }

  .sidebar-nav em {
    color: #9b9ea6;
    font-style: normal;
  }

  .sidebar-nav em.notification-badge {
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    display: inline-grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 0 5px;
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

  .sidebar-credit-card.warning {
    border-color: #fecaca;
    background: #fef2f2;
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
`

const styles = `
.dashboard-page {
  min-height: 100vh;
  background: #f7f7f8;
  color: #202126;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
}

.perks-main {
  padding: 48px;
}

.perks-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.perks-header h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.03em;
}

.perks-header p {
  color: #7d8088;
  font-size: 14px;
  margin: 8px 0 0;
}

.primary-action,
.perks-actions a {
  border: 1px solid #111111;
  border-radius: 10px;
  background: #111111;
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
  text-decoration: none;
}

.perks-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  overflow: hidden;
}

.perks-empty {
  color: #9a9da4;
  font-size: 14px;
  padding: 48px 24px;
  text-align: center;
}

.perks-empty a {
  color: #111827;
  font-weight: 650;
}

.perks-row {
  align-items: center;
  border-bottom: 1px solid #f0f1f3;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) 100px 100px 100px 100px;
  padding: 16px 20px;
}

.perks-row:last-child {
  border-bottom: 0;
}

.perks-row.head {
  background: #f8f8f9;
  color: #6f737d;
  font-size: 12px;
  font-weight: 650;
  padding: 10px 20px;
}

.perks-row strong {
  display: block;
  font-size: 14px;
  font-weight: 650;
}

.perks-row em {
  color: #9a9da4;
  display: block;
  font-size: 12px;
  font-style: normal;
  margin-top: 3px;
}

.perks-row span {
  color: #6f737d;
  font-size: 13px;
}

.status {
  border-radius: 999px;
  display: inline-flex !important;
  justify-content: center;
  margin: 0 !important;
  padding: 4px 9px;
  width: fit-content;
}

.status.active {
  background: #dcfce7;
  color: #15803d;
}

.status.paused {
  background: #f1f2f4;
  color: #6f737d;
}

.perks-actions {
  display: flex;
  justify-content: flex-end;
}

.perks-actions a {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #202126;
  padding: 7px 10px;
}

@media (max-width: 900px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .perks-main {
    padding: 28px 18px;
  }

  .perks-header,
  .perks-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
}
`
