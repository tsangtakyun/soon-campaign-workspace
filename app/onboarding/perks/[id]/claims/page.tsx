import Link from 'next/link'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
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
