'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type BrandPerk = {
  id: string
  workspace_id: string
  type: 'service' | 'product'
  title: string
  description: string | null
  requirements: string | null
  quota: number | null
  claimed_count: number | null
  valid_until: string | null
  is_active: boolean | null
  created_at: string | null
}

export default function PerksPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [perks, setPerks] = useState<BrandPerk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPerks() {
      setLoading(true)
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled) return

      setWorkspaceId(resolvedWorkspaceId)
      if (!resolvedWorkspaceId) {
        setPerks([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('brand_perks')
        .select('id,workspace_id,type,title,description,requirements,quota,claimed_count,valid_until,is_active,created_at')
        .eq('workspace_id', resolvedWorkspaceId)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        setPerks((data as BrandPerk[]) ?? [])
        setLoading(false)
      }
    }

    void loadPerks()

    return () => {
      cancelled = true
    }
  }, [supabase])

  async function setPerkActive(perk: BrandPerk, isActive: boolean) {
    const { error } = await supabase.from('brand_perks').update({ is_active: isActive }).eq('id', perk.id)
    if (!error) {
      setPerks((current) => current.map((item) => (item.id === perk.id ? { ...item, is_active: isActive } : item)))
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="探索品牌" />
      <section className="perks-main">
        <header className="perks-header">
          <div>
            <h1>探索品牌 Perks</h1>
            <p>提供免費服務或產品，讓 KOL 主動了解你的品牌</p>
          </div>
          <button type="button" onClick={() => router.push('/onboarding/perks/new')}>
            + 新增 Perk
          </button>
        </header>

        <div className="perks-card">
          {loading ? (
            <div className="perks-empty">載入中...</div>
          ) : !workspaceId ? (
            <div className="perks-empty">請先選擇工作空間。</div>
          ) : perks.length === 0 ? (
            <div className="perks-empty">尚未建立 Perk，點擊「新增 Perk」開始。</div>
          ) : (
            <div className="perks-list">
              <div className="perks-row head">
                <span>Perk</span>
                <span>名額</span>
                <span>有效期</span>
                <span>狀態</span>
                <span />
              </div>
              {perks.map((perk) => {
                const claimed = perk.claimed_count ?? 0
                const quota = perk.quota ?? 0

                return (
                  <div className="perks-row" key={perk.id}>
                    <div>
                      <strong>{perk.title}</strong>
                      <em>{perk.type === 'service' ? '服務類' : '產品類'}</em>
                    </div>
                    <span>
                      {claimed}/{quota}
                    </span>
                    <span>{perk.valid_until || '—'}</span>
                    <span className={perk.is_active ? 'status active' : 'status paused'}>
                      {perk.is_active ? '啟用中' : '已停用'}
                    </span>
                    <div className="perks-actions">
                      <button type="button" onClick={() => router.push(`/onboarding/perks/new?id=${perk.id}`)}>
                        編輯
                      </button>
                      <button type="button" onClick={() => void setPerkActive(perk, !perk.is_active)}>
                        {perk.is_active ? '停用' : '啟用'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
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

.perks-header button,
.perks-actions button {
  border: 1px solid #111111;
  border-radius: 10px;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
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

.perks-row {
  align-items: center;
  border-bottom: 1px solid #f0f1f3;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) 100px 120px 90px 140px;
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
  display: inline-flex;
  justify-content: center;
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
  gap: 8px;
  justify-content: flex-end;
}

.perks-actions button {
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
