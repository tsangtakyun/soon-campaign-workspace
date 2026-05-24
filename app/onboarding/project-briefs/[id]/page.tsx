'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type Campaign = {
  id: string
  name: string | null
}

type BriefForm = {
  title: string
  campaign_id: string
  creator_username: string
  background: string
  objectives: string
  deliverablesText: string
  timeline: string
  budget: string
  dos: string
  donts: string
  referenceLinksText: string
  additional_notes: string
}

const emptyForm: BriefForm = {
  title: '',
  campaign_id: '',
  creator_username: '',
  background: '',
  objectives: '',
  deliverablesText: '',
  timeline: '',
  budget: '',
  dos: '',
  donts: '',
  referenceLinksText: '',
  additional_notes: '',
}

function textToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function listToText(value: unknown) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function normalizeCreatorUsername(value: string | null) {
  const username = (value || '').trim().replace(/^@+/, '')

  if (username.length % 2 === 0) {
    const midpoint = username.length / 2
    const firstHalf = username.slice(0, midpoint)
    const secondHalf = username.slice(midpoint)
    if (firstHalf && firstHalf === secondHalf) return firstHalf
  }

  return username
}

export default function ProjectBriefEditorPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const briefId = params.id
  const isNew = briefId === 'new'

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState<BriefForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const creatorUsername = normalizeCreatorUsername(searchParams.get('creator'))
  const campaignId = searchParams.get('campaign_id') || ''

  useEffect(() => {
    let cancelled = false

    async function loadEditor() {
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled) return

      setWorkspaceId(resolvedWorkspaceId)
      if (!resolvedWorkspaceId) return

      const { data: campaignData } = await supabase
        .from('marketing_campaigns')
        .select('id,name')
        .eq('workspace_id', resolvedWorkspaceId)
        .order('created_at', { ascending: false })

      if (!cancelled) setCampaigns((campaignData as Campaign[]) ?? [])

      if (isNew) {
        setForm({
          ...emptyForm,
          creator_username: creatorUsername,
          campaign_id: campaignId,
        })
        return
      }

      const { data } = await supabase.from('project_briefs').select('*').eq('id', briefId).single()
      if (!cancelled && data) {
        setForm({
          title: data.title || '',
          campaign_id: data.campaign_id || '',
          creator_username: data.creator_username || '',
          background: data.background || '',
          objectives: data.objectives || '',
          deliverablesText: listToText(data.deliverables),
          timeline: data.timeline || '',
          budget: data.budget || '',
          dos: data.dos || '',
          donts: data.donts || '',
          referenceLinksText: listToText(data.reference_links),
          additional_notes: data.additional_notes || '',
        })
      }
    }

    void loadEditor()
    return () => {
      cancelled = true
    }
  }, [briefId, isNew, creatorUsername, campaignId, supabase])

  function updateForm(field: keyof BriefForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveDraft() {
    if (!workspaceId) return null
    setSaving(true)

    const payload = {
      workspace_id: workspaceId,
      campaign_id: form.campaign_id || null,
      creator_username: form.creator_username || null,
      title: form.title || '未命名簡報',
      background: form.background || null,
      objectives: form.objectives || null,
      deliverables: textToList(form.deliverablesText),
      timeline: form.timeline || null,
      budget: form.budget || null,
      dos: form.dos || null,
      donts: form.donts || null,
      reference_links: textToList(form.referenceLinksText),
      additional_notes: form.additional_notes || null,
      status: 'draft',
    }

    const result = isNew
      ? await supabase.from('project_briefs').insert(payload).select('id').single()
      : await supabase.from('project_briefs').update(payload).eq('id', briefId).select('id').single()

    setSaving(false)

    if (result.error || !result.data?.id) {
      alert(result.error?.message || '儲存失敗，請稍後再試。')
      return null
    }

    if (isNew) router.replace(`/onboarding/project-briefs/${result.data.id}`)
    return result.data.id as string
  }

  async function sendToKol() {
    const savedId = await saveDraft()
    if (!savedId || !workspaceId) return

    const res = await fetch('/api/project-briefs/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_id: savedId, workspace_id: workspaceId }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      alert(data?.error || '發送失敗，請稍後再試。')
      return
    }

    router.push('/onboarding/project-briefs')
  }

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="項目簡報" />
      <section className="editor-main">
        <header className="editor-header">
          <p>Project Brief</p>
          <h1>{isNew ? '新增項目簡報' : '編輯項目簡報'}</h1>
        </header>

        <div className="editor-card">
          <label>
            標題
            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
          </label>
          <label>
            所屬 Campaign
            <select value={form.campaign_id} onChange={(event) => updateForm('campaign_id', event.target.value)}>
              <option value="">請選擇...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name || 'Untitled campaign'}
                </option>
              ))}
            </select>
          </label>
          <label>
            KOL
            <input value={form.creator_username} readOnly />
          </label>
          <label>
            背景介紹
            <textarea value={form.background} onChange={(event) => updateForm('background', event.target.value)} />
          </label>
          <label>
            合作目標
            <textarea value={form.objectives} onChange={(event) => updateForm('objectives', event.target.value)} />
          </label>
          <label>
            交付物（一行一項）
            <textarea value={form.deliverablesText} onChange={(event) => updateForm('deliverablesText', event.target.value)} />
          </label>
          <label>
            時間表
            <textarea value={form.timeline} onChange={(event) => updateForm('timeline', event.target.value)} />
          </label>
          <label>
            預算
            <input value={form.budget} onChange={(event) => updateForm('budget', event.target.value)} />
          </label>
          <label>
            注意事項（要做）
            <textarea value={form.dos} onChange={(event) => updateForm('dos', event.target.value)} />
          </label>
          <label>
            注意事項（不要做）
            <textarea value={form.donts} onChange={(event) => updateForm('donts', event.target.value)} />
          </label>
          <label>
            參考連結（一行一個）
            <textarea value={form.referenceLinksText} onChange={(event) => updateForm('referenceLinksText', event.target.value)} />
          </label>
          <label>
            補充備注
            <textarea value={form.additional_notes} onChange={(event) => updateForm('additional_notes', event.target.value)} />
          </label>

          <div className="editor-actions">
            <button disabled={saving} onClick={() => void saveDraft()} type="button">
              {saving ? '儲存中...' : '儲存草稿'}
            </button>
            <button disabled={saving} onClick={() => void sendToKol()} type="button">
              發送給 KOL
            </button>
          </div>
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
.editor-main { padding: 48px; }
.editor-header { margin-bottom: 24px; }
.editor-header p { margin: 0 0 8px; color: #7d8088; font-size: 13px; }
.editor-header h1 { margin: 0; font-size: 32px; letter-spacing: -0.03em; }
.editor-card {
  max-width: 860px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  display: grid;
  gap: 16px;
  padding: 24px;
}
.editor-card label {
  display: grid;
  gap: 8px;
  color: #374151;
  font-size: 13px;
  font-weight: 650;
}
.editor-card input,
.editor-card select,
.editor-card textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font: inherit;
  font-weight: 400;
  min-height: 42px;
  outline: none;
  padding: 10px 12px;
}
.editor-card textarea { min-height: 92px; resize: vertical; }
.editor-actions { display: flex; gap: 12px; justify-content: flex-end; }
.editor-actions button {
  border: 0;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 11px 18px;
}
.editor-actions button:first-child { background: #f3f4f6; color: #202126; }
.editor-actions button:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 900px) {
  .dashboard-page { grid-template-columns: 1fr; }
  .editor-main { padding: 28px 18px; }
}
`
