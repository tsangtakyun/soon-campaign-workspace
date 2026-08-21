'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  type WorkspaceSummary,
} from '@/lib/workspace-client'

function findUrl(value: string) {
  return value.match(/https?:\/\/[^\s]+/i)?.[0] || ''
}

export default function AddTopicPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrl(params.get('url') || findUrl(params.get('text') || ''))
    async function load() {
      try {
        const response = await fetch('/api/workspaces', { cache: 'no-store' })
        const payload = await response.json()
        const items = Array.isArray(payload?.workspaces) ? payload.workspaces : []
        const activeId = getActiveWorkspaceId()
        setWorkspaces(items)
        setSelectedId(items.some((item: WorkspaceSummary) => item.id === activeId) ? activeId || '' : items[0]?.id || '')
      } catch {
        setMessage('未能載入 workspace，請登入後再試。')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!url || !selectedId || saving) return
    setSaving(true)
    setMessage('正在整理題材…')
    try {
      const response = await fetch('/api/topic-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const idea = await response.json()
      if (!response.ok) throw new Error(idea.error || '未能加入題材')
      const saveResponse = await fetch('/api/workspace-topic-ideas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: selectedId, idea }),
      })
      const saved = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(saved.error || '未能儲存到 workspace')
      setActiveWorkspaceId(selectedId)
      router.replace('/onboarding/topic-library?added=1')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '未能加入題材')
      setSaving(false)
    }
  }

  return (
    <main className="quick-add-page">
      <form className="quick-add-card" onSubmit={save}>
        <div className="quick-add-mark">＋</div>
        <p>SOON 題材庫</p>
        <h1>加入新題材</h1>
        <label>
          題材連結
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="貼上 Instagram 或文章連結"
            required
          />
        </label>
        <fieldset disabled={loading || saving}>
          <legend>加入到哪一個 workspace？</legend>
          {workspaces.map((workspace) => (
            <label className={selectedId === workspace.id ? 'selected' : ''} key={workspace.id}>
              <input
                type="radio"
                name="workspace"
                value={workspace.id}
                checked={selectedId === workspace.id}
                onChange={() => setSelectedId(workspace.id)}
              />
              <span>{workspace.brandName || workspace.name}</span>
              {selectedId === workspace.id ? <b>✓</b> : null}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={loading || saving || !selectedId || !url}>
          {saving ? '正在加入…' : '加入題材庫'}
        </button>
        {message ? <output>{message}</output> : null}
      </form>
      <style jsx>{`
        .quick-add-page { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: #f3f4f6; color: #202126; }
        .quick-add-card { width: min(100%, 460px); border: 1px solid #e2e4e8; border-radius: 24px; background: white; box-shadow: 0 20px 60px rgba(0,0,0,.1); padding: 28px; }
        .quick-add-mark { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: #111; color: white; font-size: 28px; }
        p { margin: 18px 0 3px; color: #777b83; font-size: 13px; font-weight: 700; }
        h1 { margin: 0 0 24px; font-size: 28px; }
        label { display: block; color: #555961; font-size: 13px; font-weight: 700; }
        input[type='url'] { width: 100%; height: 48px; margin-top: 8px; border: 1px solid #d9dce1; border-radius: 12px; background: #f7f7f8; color: #202126; font: inherit; padding: 0 13px; outline: none; }
        input[type='url']:focus { border-color: #111; background: white; }
        fieldset { display: grid; gap: 8px; margin: 22px 0; padding: 0; border: 0; }
        legend { margin-bottom: 9px; color: #555961; font-size: 13px; font-weight: 700; }
        fieldset label { min-height: 48px; display: flex; align-items: center; gap: 10px; border: 1px solid #e1e3e7; border-radius: 12px; padding: 0 13px; cursor: pointer; }
        fieldset label.selected { border-color: #111; background: #f5f5f5; }
        fieldset input { accent-color: #111; }
        fieldset span { flex: 1; color: #202126; }
        fieldset b { color: #111; }
        button { width: 100%; height: 50px; border: 0; border-radius: 12px; background: #111; color: white; cursor: pointer; font: inherit; font-weight: 750; }
        button:disabled { cursor: wait; opacity: .5; }
        output { display: block; margin-top: 12px; color: #656971; font-size: 13px; text-align: center; }
      `}</style>
    </main>
  )
}
