'use client'

import { useEffect, useState } from 'react'

type RegistryItem = {
  id: string
  strategyType: 'content_strategy' | 'angle_pattern'
  name: string
  nameZh: string
  description: string
  version: number
  definition: Record<string, unknown>
}

export default function StrategyRegistryPage() {
  const [type, setType] = useState<'content_strategy' | 'angle_pattern'>('content_strategy')
  const [items, setItems] = useState<RegistryItem[]>([])
  const [selected, setSelected] = useState<RegistryItem | null>(null)
  const [definition, setDefinition] = useState('{}')
  const [changeNote, setChangeNote] = useState('')
  const [status, setStatus] = useState('正在載入…')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('正在載入 published strategies…')
      const response = await fetch(`/api/strategy-registry?type=${type}`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (cancelled) return
      if (!response.ok) { setStatus(result?.detail || result?.error || '載入失敗'); return }
      const next = Array.isArray(result.items) ? result.items as RegistryItem[] : []
      setItems(next)
      setSelected(next[0] || null)
      setDefinition(JSON.stringify(next[0]?.definition || {}, null, 2))
      setStatus(`${next.length} 項 published strategies`)
    }
    void load()
    return () => { cancelled = true }
  }, [type])

  function choose(item: RegistryItem) {
    setSelected(item)
    setDefinition(JSON.stringify(item.definition, null, 2))
    setChangeNote('')
  }

  function createNew() {
    const item: RegistryItem = {
      id: `${type.replace('_', '-')}-${Date.now()}`,
      strategyType: type,
      name: '',
      nameZh: '',
      description: '',
      version: 0,
      definition: { isActive: true },
    }
    setSelected(item)
    setDefinition(JSON.stringify(item.definition, null, 2))
    setChangeNote('')
  }

  function updateSelected(patch: Partial<RegistryItem>) {
    setSelected((current) => current ? { ...current, ...patch } : current)
  }

  async function publish() {
    if (!selected || saving) return
    setSaving(true)
    setStatus('正在發布新版本…')
    try {
      const parsed = JSON.parse(definition)
      const response = await fetch('/api/strategy-registry', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          strategyId: selected.id, strategyType: selected.strategyType,
          name: selected.name, nameZh: selected.nameZh, description: selected.description,
          definition: parsed, changeNote, publish: true,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '發布失敗')
      const nextVersion = Number(result?.version?.version || selected.version + 1)
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, version: nextVersion, definition: parsed } : item))
      setSelected((current) => current ? { ...current, version: nextVersion, definition: parsed } : current)
      setChangeNote('')
      setStatus(`${selected.nameZh} v${nextVersion} 已發布`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '發布失敗')
    } finally { setSaving(false) }
  }

  return <main className="registry-page">
    <header><span>SOON CORE · INTERNAL</span><h1>Strategy Registry</h1><p>管理 Content Strategy building blocks及Product Campaign Angle Patterns。每次發布都建立新版本，舊 Campaign 不會被改寫。</p></header>
    <nav><button className={type === 'content_strategy' ? 'active' : ''} onClick={() => setType('content_strategy')} type="button">Content Strategies</button><button className={type === 'angle_pattern' ? 'active' : ''} onClick={() => setType('angle_pattern')} type="button">Angle Patterns</button><button onClick={createNew} type="button">＋ New</button><span>{status}</span></nav>
    <div className="registry-layout">
      <aside>{items.map((item) => <button className={selected?.id === item.id ? 'selected' : ''} key={item.id} onClick={() => choose(item)} type="button"><span>{item.nameZh}</span><small>{item.name} · v{item.version}</small></button>)}</aside>
      <section>{selected ? <><div className="editor-head"><div><small>{selected.id}</small><h2>{selected.nameZh || 'New strategy'}</h2><p>{selected.description || '建立新的 strategy definition。'}</p></div><b>{selected.version ? `Published v${selected.version}` : 'New'}</b></div><div className="name-grid"><label>English name<input value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label><label>中文名稱<input value={selected.nameZh} onChange={(event) => updateSelected({ nameZh: event.target.value })} /></label></div><label>Description<textarea className="description-input" value={selected.description} onChange={(event) => updateSelected({ description: event.target.value })} /></label><label>Version definition<textarea value={definition} onChange={(event) => setDefinition(event.target.value)} spellCheck={false} /></label><label>Change note<input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="今次版本修改了甚麼？" /></label><footer><p>發布後，新 Campaign 將使用新版本；已有 Campaign 保留原有 version reference。</p><button disabled={saving || !changeNote.trim() || !selected.name.trim() || !selected.nameZh.trim()} onClick={() => void publish()} type="button">{saving ? '發布中…' : 'Publish new version'}</button></footer></> : <p>未有 published strategy。</p>}</section>
    </div>
    <style jsx>{`
      .registry-page{min-height:100vh;background:#f2eee7;color:#1f1f1d;padding:40px clamp(18px,4vw,60px) 80px;font-family:Arial,sans-serif}header{max-width:900px}header>span{color:#826f51;font-size:12px;font-weight:800;letter-spacing:.16em}h1{margin:8px 0;font:500 clamp(38px,6vw,68px)/1 Georgia,serif}header p{max-width:760px;color:#69635a;line-height:1.65}nav{display:flex;align-items:center;gap:8px;margin:28px 0 14px}nav button{border:1px solid #d6cfc4;border-radius:999px;background:#fff;padding:10px 14px;cursor:pointer}nav button.active{background:#22211f;color:#fff}nav span{margin-left:auto;color:#756e64;font-size:13px}.registry-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px}.registry-layout>aside,.registry-layout>section{border:1px solid #dcd5ca;border-radius:20px;background:rgba(255,255,255,.78);padding:16px}.registry-layout>aside{display:grid;align-content:start;gap:7px;max-height:720px;overflow:auto}.registry-layout>aside button{display:grid;gap:4px;border:1px solid transparent;border-radius:12px;background:transparent;padding:12px;text-align:left;cursor:pointer}.registry-layout>aside button.selected{border-color:#252421;background:#252421;color:#fff}.registry-layout>aside small{color:#888076}.registry-layout>section{padding:24px}.editor-head{display:flex;justify-content:space-between;gap:20px}.editor-head small{color:#8b8173}.editor-head h2{margin:5px 0;font:500 32px Georgia,serif}.editor-head p{color:#716a60}.editor-head>b{height:fit-content;border-radius:999px;background:#e8f5eb;color:#29713e;padding:8px 11px;font-size:12px}.name-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.registry-layout label{display:grid;gap:8px;margin-top:18px;font-size:13px;font-weight:800}.registry-layout textarea,.registry-layout input{box-sizing:border-box;width:100%;border:1px solid #d9d2c7;border-radius:12px;background:#fff;padding:13px;font:14px monospace}.registry-layout textarea{min-height:360px;resize:vertical}.registry-layout textarea.description-input{min-height:90px;font-family:Arial,sans-serif}.registry-layout input{font-family:Arial,sans-serif}.registry-layout footer{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:18px}.registry-layout footer p{max-width:580px;color:#746d63;font-size:13px;line-height:1.5}.registry-layout footer button{min-height:44px;border:0;border-radius:12px;background:#22211f;color:#fff;padding:0 17px;font-weight:800;cursor:pointer}.registry-layout footer button:disabled{cursor:not-allowed;opacity:.45}@media(max-width:780px){nav{align-items:flex-start;flex-wrap:wrap}nav span{width:100%;margin:5px 0}.registry-layout{grid-template-columns:1fr}.registry-layout>aside{max-height:260px}.name-grid{grid-template-columns:1fr}.registry-layout footer{align-items:stretch;flex-direction:column}}
    `}</style>
  </main>
}
