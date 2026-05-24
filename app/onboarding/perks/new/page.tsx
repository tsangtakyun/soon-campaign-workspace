'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type PrProjectType = 'service' | 'product'

type PrProjectForm = {
  type: PrProjectType
  title: string
  description: string
  requirements: string
  quota: number
  valid_until: string
  is_active: boolean
  contact_name: string
  contact_phone: string
  contact_email: string
}

const initialForm: PrProjectForm = {
  type: 'service',
  title: '',
  description: '',
  requirements: '',
  quota: 10,
  valid_until: '',
  is_active: true,
  contact_name: '',
  contact_phone: '',
  contact_email: '',
}

export default function NewPrProjectPage() {
  return (
    <Suspense fallback={<div />}>
      <NewPrProjectForm />
    </Suspense>
  )
}

function NewPrProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prProjectId = searchParams.get('id')
  const supabase = useMemo(() => createClient(), [])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [form, setForm] = useState<PrProjectForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPrProject() {
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled) return
      setWorkspaceId(resolvedWorkspaceId)

      if (!prProjectId) return

      const { data } = await supabase.from('brand_perks').select('*').eq('id', prProjectId).maybeSingle()
      if (!cancelled && data) {
        setForm({
          type: data.type === 'product' ? 'product' : 'service',
          title: data.title || '',
          description: data.description || '',
          requirements: data.requirements || '',
          quota: data.quota ?? 10,
          valid_until: data.valid_until || '',
          is_active: data.is_active ?? true,
          contact_name: data.contact_name || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
        })
      }
    }

    void loadPrProject()

    return () => {
      cancelled = true
    }
  }, [prProjectId, supabase])

  function updateForm<K extends keyof PrProjectForm>(key: K, value: PrProjectForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function savePrProject() {
    if (!workspaceId) {
      setError('請先選擇工作空間。')
      return
    }

    if (!form.title.trim()) {
      setError('請填寫公關項目標題。')
      return
    }

    if (!form.contact_name.trim()) {
      setError('請填寫聯絡人姓名。')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      workspace_id: workspaceId,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      requirements: form.requirements.trim() || null,
      quota: form.quota,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
    }

    const result = prProjectId
      ? await supabase.from('brand_perks').update(payload).eq('id', prProjectId)
      : await supabase.from('brand_perks').insert(payload)

    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    router.push('/onboarding/perks')
  }

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="探索品牌" />
      <section className="perk-form-main">
        <header>
          <h1>{prProjectId ? '編輯公關項目' : '新增公關項目'}</h1>
          <p>透過免費服務或產品，讓 KOL 主動體驗你的品牌。</p>
        </header>

        <div className="perk-form-card">
          <div>
            <label>類型</label>
            <div className="type-options">
              {[
                { value: 'service' as const, label: '服務類' },
                { value: 'product' as const, label: '產品類' },
              ].map((item) => (
                <button
                  className={form.type === item.value ? 'active' : ''}
                  key={item.value}
                  onClick={() => updateForm('type', item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="標題">
            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
          </Field>

          <Field label="描述">
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="詳細介紹服務或產品"
            />
          </Field>

          <Field label="要求">
            <textarea
              rows={3}
              value={form.requirements}
              onChange={(event) => updateForm('requirements', event.target.value)}
              placeholder="KOL 需要符合的條件（可選）"
            />
          </Field>

          <div className="form-grid">
            <Field label="名額">
              <input
                min={1}
                type="number"
                value={form.quota}
                onChange={(event) => updateForm('quota', Number(event.target.value) || 1)}
              />
            </Field>
            <Field label="有效期至">
              <input value={form.valid_until} onChange={(event) => updateForm('valid_until', event.target.value)} type="date" />
            </Field>
          </div>

          <div className="toggle-row">
            <div>
              <strong>啟用</strong>
              <span>啟用後會出現在 SOON-EGG 探索品牌公關宣傳頁</span>
            </div>
            <button
              className={form.is_active ? 'toggle active' : 'toggle'}
              onClick={() => updateForm('is_active', !form.is_active)}
              type="button"
            >
              <span />
            </button>
          </div>

          <div className="form-section">
            <h3>聯絡人資料</h3>
            <p className="hint">KOL 申請後，我們會通知你安排跟進</p>

            <Field label="聯絡人姓名 *">
              <input
                value={form.contact_name}
                onChange={(event) => updateForm('contact_name', event.target.value)}
                placeholder="例如：市場部 Mary"
              />
            </Field>

            <Field label="聯絡電話">
              <input
                value={form.contact_phone}
                onChange={(event) => updateForm('contact_phone', event.target.value)}
                placeholder="例如：9123 4567"
              />
            </Field>

            <Field label="聯絡電郵">
              <input
                type="email"
                value={form.contact_email}
                onChange={(event) => updateForm('contact_email', event.target.value)}
                placeholder="例如：marketing@brand.com"
              />
            </Field>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="actions">
            <button disabled={saving} onClick={() => void savePrProject()} type="button">
              {saving ? '儲存中...' : '儲存'}
            </button>
            <button onClick={() => router.push('/onboarding/perks')} type="button">
              取消
            </button>
          </div>
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
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

.perk-form-main {
  padding: 48px;
}

.perk-form-main header {
  margin-bottom: 24px;
}

.perk-form-main h1 {
  font-size: 32px;
  letter-spacing: -0.03em;
  margin: 0;
}

.perk-form-main p {
  color: #7d8088;
  font-size: 14px;
  margin: 8px 0 0;
}

.perk-form-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  display: grid;
  gap: 18px;
  max-width: 720px;
  padding: 24px;
}

.form-section {
  border-top: 1px solid #eef0f3;
  display: grid;
  gap: 14px;
  padding-top: 18px;
}

.form-section h3 {
  font-size: 16px;
  margin: 0;
}

.form-section .hint {
  color: #7d8088;
  font-size: 13px;
  margin: -8px 0 0;
}

.type-options {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  margin-top: 8px;
}

.type-options button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #4b5563;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  padding: 12px;
}

.type-options button.active {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

.field {
  display: grid;
  gap: 6px;
}

.field span,
.perk-form-card > div > label {
  color: #4b5563;
  font-size: 13px;
  font-weight: 650;
}

.field input,
.field select,
.field textarea,
.perk-form-card input,
.perk-form-card select,
.perk-form-card textarea {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font: inherit;
  font-size: 14px;
  padding: 11px 12px;
}

.field textarea {
  resize: vertical;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}

.toggle-row {
  align-items: center;
  border: 1px solid #eef0f3;
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  padding: 14px;
}

.toggle-row strong {
  display: block;
  font-size: 14px;
}

.toggle-row span {
  color: #7d8088;
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

.toggle {
  background: #d1d5db;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  height: 24px;
  padding: 0;
  position: relative;
  width: 44px;
}

.toggle.active {
  background: #7c3aed;
}

.toggle > span {
  background: white;
  border-radius: 999px;
  height: 18px;
  left: 3px;
  position: absolute;
  top: 3px;
  transition: transform 160ms ease;
  width: 18px;
}

.toggle.active > span {
  transform: translateX(20px);
}

.form-error {
  background: #fef2f2;
  border-radius: 12px;
  color: #b91c1c !important;
  margin: 0 !important;
  padding: 10px 12px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  border: 1px solid #111827;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  padding: 11px 18px;
}

.actions button:first-child {
  background: #111827;
  color: #ffffff;
}

.actions button:last-child {
  background: #ffffff;
  color: #4b5563;
  border-color: #e5e7eb;
}

@media (max-width: 900px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .perk-form-main {
    padding: 28px 18px;
  }

  .form-grid,
  .type-options {
    grid-template-columns: 1fr;
  }
}
`
