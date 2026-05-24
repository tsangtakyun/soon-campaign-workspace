import Link from 'next/link'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
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
      <DashboardSidebar activeItem="探索品牌" />
      <section className="perks-main">
        <header className="perks-header">
          <div>
            <h1>探索品牌 Perks</h1>
            <p>提供免費服務或產品，讓 KOL 主動了解你的品牌</p>
          </div>
          <Link className="primary-action" href="/onboarding/perks/new">
            + 新增 Perk
          </Link>
        </header>

        <div className="perks-card">
          {!perks || perks.length === 0 ? (
            <div className="perks-empty">
              未有 Perk，<Link href="/onboarding/perks/new">立即新增</Link>
            </div>
          ) : (
            <>
              <div className="perks-row head">
                <span>Perk</span>
                <span>類型</span>
                <span>名額</span>
                <span>狀態</span>
                <span />
              </div>
              {(perks as BrandPerk[]).map((perk) => (
                <div className="perks-row" key={perk.id}>
                  <div>
                    <strong>{perk.title || '未命名 Perk'}</strong>
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
