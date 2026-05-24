import Link from 'next/link'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { createAdminSupabase } from '@/lib/server-supabase'
import { ClaimRow } from './ClaimRow'

type Perk = {
  id: string
  type: 'service' | 'product'
  title: string | null
}

type Claim = {
  id: string
  perk_id: string
  egg_creator_username: string | null
  preferred_date: string | null
  preferred_time: string | null
  party_size: number | null
  delivery_name: string | null
  delivery_phone: string | null
  delivery_district: string | null
  delivery_address: string | null
  status: string | null
  brand_notes: string | null
  claimed_at: string | null
  created_at?: string | null
}

export default async function PerkClaimsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabaseAdmin = createAdminSupabase()

  const [{ data: perk }, { data: claims }] = await Promise.all([
    supabaseAdmin.from('brand_perks').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('perk_claims')
      .select('*')
      .eq('perk_id', id)
      .order('claimed_at', { ascending: false, nullsFirst: false }),
  ])

  const typedPerk = perk as Perk | null
  const typedClaims = (claims ?? []) as Claim[]

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="探索品牌" />
      <section className="claims-main">
        <header className="claims-header">
          <Link href="/onboarding/perks">← 返回公關項目</Link>
          <div>
            <h1>{typedPerk?.title || '公關項目申請'}</h1>
            <p>
              {typedPerk?.type === 'service' ? '服務類' : '產品類'} · {typedClaims.length} 個申請
            </p>
          </div>
        </header>

        <div className="claims-card">
          {typedClaims.length === 0 ? (
            <div className="claims-empty">暫未有申請</div>
          ) : (
            <>
              <div className="claims-row head">
                <span>創作者</span>
                <span>{typedPerk?.type === 'service' ? '預約詳情' : '寄送資料'}</span>
                <span>申請時間</span>
                <span>狀態</span>
                <span>操作</span>
              </div>
              {typedClaims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} perkType={typedPerk?.type || 'product'} />
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
    overflow: hidden;
  }

  .workspace-switcher-wrap {
    position: relative;
    border-bottom: 1px solid #e2e3e6;
    padding-bottom: 14px;
    background: #f2f3f5 !important;
  }

  .workspace-switcher {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    appearance: none;
    border: 0 !important;
    background: transparent !important;
    width: 100%;
    padding: 8px 6px 4px;
    text-align: left;
    cursor: pointer;
    color: #202126 !important;
    font: inherit;
  }

  .workspace-mark {
    width: 24px !important;
    height: 24px !important;
    border-radius: 7px !important;
    background: #ffd946 !important;
    color: #111111 !important;
    display: grid !important;
    place-items: center;
    font-weight: 800 !important;
    font-size: 13px !important;
    flex: 0 0 auto;
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
    color: #202126 !important;
  }

  .workspace-switcher span {
    color: #9a9da4 !important;
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

.dashboard-page .sidebar {
  box-sizing: border-box !important;
  width: 260px !important;
  min-width: 260px !important;
  max-width: 260px !important;
  overflow: hidden !important;
}

.dashboard-page .workspace-switcher {
  display: grid !important;
  grid-template-columns: 28px minmax(0, 1fr) auto !important;
}

.dashboard-page .workspace-switcher strong,
.dashboard-page .sidebar-nav strong,
.dashboard-page .workspace-menu-list strong {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.dashboard-page .sidebar-nav,
.dashboard-page .sidebar-group,
.dashboard-page .sidebar-footer {
  display: grid !important;
  gap: 5px !important;
}

.dashboard-page .sidebar-nav a,
.dashboard-page .sidebar-group a,
.dashboard-page .sidebar-footer a {
  align-items: center !important;
  border-radius: 9px !important;
  color: #6f7278 !important;
  display: grid !important;
  font-size: 14px !important;
  gap: 8px !important;
  grid-template-columns: 24px minmax(0, 1fr) auto !important;
  min-height: 34px !important;
  padding: 0 10px !important;
  text-decoration: none !important;
  white-space: nowrap !important;
}

.dashboard-page .sidebar-group a,
.dashboard-page .sidebar-footer a {
  display: flex !important;
}

.dashboard-page .sidebar-nav a.active {
  background: #e5e7eb !important;
  color: #202126 !important;
}

.dashboard-page .sidebar-credit-card {
  border: 1px solid #dfe1e6 !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  color: #202126 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  padding: 11px 12px !important;
  text-decoration: none !important;
  white-space: normal !important;
}

.dashboard-page .sidebar-footer {
  margin-top: auto !important;
  border-top: 1px solid #e2e3e6 !important;
  padding-top: 12px !important;
}

.claims-main { padding: 48px; background: #f7f7f8; min-height: 100vh; }
.claims-header { margin-bottom: 24px; }
.claims-header a { color: #6f737d; font-size: 13px; text-decoration: none; }
.claims-header h1 { font-size: 28px; margin: 8px 0 4px; }
.claims-header p { color: #6f737d; font-size: 14px; margin: 0; }
.claims-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
.claims-empty { padding: 48px; text-align: center; color: #9a9da4; }
.claims-row { display: grid; grid-template-columns: 180px minmax(0, 1fr) 100px 100px 190px; gap: 12px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f0f1f3; }
.claims-row:last-child { border-bottom: 0; }
.claims-row.head { background: #f8f8f9; font-size: 12px; font-weight: 650; color: #6f737d; padding: 10px 20px; }
.claims-row strong { display: block; font-size: 13px; font-weight: 600; }
.mediakit-link { font-size: 11px; color: #7c3aed; text-decoration: none; display: block; margin-top: 2px; }
.claim-details { font-size: 12px; color: #6f737d; display: flex; flex-direction: column; gap: 2px; }
.claim-details .address { color: #374151; }
.claim-time { font-size: 12px; color: #9a9da4; }
.status-badge { font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 999px; width: fit-content; }
.status-pending { background: #fefce8; color: #a16207; }
.status-confirmed { background: #eff6ff; color: #1d4ed8; }
.status-progress { background: #f5f3ff; color: #6d28d9; }
.status-completed { background: #f0fdf4; color: #15803d; }
.status-rejected { background: #f3f4f6; color: #6b7280; }
.claim-actions { display: flex; gap: 6px; flex-wrap: wrap; position: relative; }
.claim-actions button { border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.btn-confirm { background: #111; color: #fff; border: 0; }
.btn-reject, .btn-notes { background: #fff; color: #6b7280; border: 1px solid #e5e7eb; }
.btn-progress { background: #7c3aed; color: #fff; border: 0; }
.btn-complete { background: #16a34a; color: #fff; border: 0; }
.done-label { font-size: 12px; color: #9a9da4; }
.notes-editor { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12); display: grid; gap: 8px; padding: 10px; position: absolute; right: 0; top: 34px; width: 220px; z-index: 20; }
.notes-editor textarea { border: 1px solid #e5e7eb; border-radius: 8px; font: inherit; font-size: 12px; padding: 8px; resize: vertical; }
.notes-editor button { background: #111; border: 0; color: #fff; }
@media (max-width: 900px) {
  .dashboard-page { grid-template-columns: 1fr; }
  .claims-main { padding: 28px 18px; }
  .claims-row { grid-template-columns: 1fr; align-items: start; }
}
`
