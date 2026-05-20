'use client'

import { useEffect, useState } from 'react'

import { defaultStrategyLibrary, type StrategyItem, type StrategyLibraryState } from '@/lib/strategy-library'

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}`
}

function sectionTitle(title: string, subtitle: string) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '12px', letterSpacing: '0.15em', color: '#8b7c69', marginBottom: '6px' }}>{subtitle}</div>
      <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 500 }}>{title}</h2>
    </div>
  )
}

function emptyItem(prefix: string): StrategyItem {
  return { id: makeId(prefix), name: '', summary: '', fitFor: '', notFitFor: '', successMetric: '' }
}

export default function StrategyLibraryPage() {
  const [library, setLibrary] = useState<StrategyLibraryState>(defaultStrategyLibrary)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('正在載入 Supabase strategy library...')

  useEffect(() => {
    let cancelled = false

    async function loadLibrary() {
      try {
        const response = await fetch('/api/strategy-library', { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok) throw new Error(data.error || 'Unable to load strategy library')
        if (!cancelled) {
          setLibrary(data.library || defaultStrategyLibrary)
          setStatus('已同步 Supabase strategy library。')
        }
      } catch (error: any) {
        if (!cancelled) {
          setLibrary(defaultStrategyLibrary)
          setStatus(error.message || '未能同步 Supabase，暫時顯示預設 library。')
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    loadLibrary()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveLibrary(nextLibrary = library) {
    setSaving(true)
    setStatus('正在儲存到 Supabase...')

    try {
      const response = await fetch('/api/strategy-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library: nextLibrary }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.hint || data.error || 'Unable to save strategy library')
      setLibrary(data.library || nextLibrary)
      setStatus(`已儲存。${data.updatedAt ? `最後更新：${new Date(data.updatedAt).toLocaleString('zh-HK')}` : ''}`)
    } catch (error: any) {
      setStatus(error.message || '儲存失敗，請檢查 Supabase table 是否已建立。')
    } finally {
      setSaving(false)
    }
  }

  function updateItem(section: keyof StrategyLibraryState, id: string, patch: Partial<StrategyItem>) {
    setLibrary((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  function addItem(section: keyof StrategyLibraryState, prefix: string) {
    setLibrary((prev) => ({
      ...prev,
      [section]: [...prev[section], emptyItem(prefix)],
    }))
  }

  function removeItem(section: keyof StrategyLibraryState, id: string) {
    setLibrary((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }))
  }

  function resetLibrary() {
    setLibrary(defaultStrategyLibrary)
    saveLibrary(defaultStrategyLibrary)
  }

  function renderSection(
    section: keyof StrategyLibraryState,
    title: string,
    subtitle: string,
    addLabel: string,
    prefix: string
  ) {
    return (
      <section style={{
        background: 'rgba(255,255,255,0.76)',
        border: '1px solid rgba(26,26,24,0.10)',
        borderRadius: '24px',
        padding: '22px',
        boxShadow: '0 20px 50px rgba(26,26,24,0.05)',
      }}>
        {sectionTitle(title, subtitle)}
        <div style={{ display: 'grid', gap: '14px' }}>
          {library[section].map((item) => (
            <div key={item.id} style={{ padding: '16px', borderRadius: '18px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'start', marginBottom: '10px' }}>
                <input
                  value={item.name}
                  onChange={(e) => updateItem(section, item.id, { name: e.target.value })}
                  placeholder="名稱"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(26,26,24,0.14)', background: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(section, item.id)}
                  style={{ border: '1px solid rgba(26,26,24,0.14)', background: 'transparent', color: '#6d6257', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}
                >
                  刪除
                </button>
              </div>
              <textarea
                value={item.summary}
                onChange={(e) => updateItem(section, item.id, { summary: e.target.value })}
                placeholder="一句講清楚呢個 strategy rule 係咩。"
                style={{ width: '100%', minHeight: '82px', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(26,26,24,0.14)', background: '#fff', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', marginBottom: '10px' }}
              />
              <textarea
                value={item.fitFor}
                onChange={(e) => updateItem(section, item.id, { fitFor: e.target.value })}
                placeholder="適合邊啲 campaign / objective / brand situation。"
                style={{ width: '100%', minHeight: '72px', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(26,26,24,0.14)', background: '#fff', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', marginBottom: '10px' }}
              />
              <textarea
                value={item.notFitFor || ''}
                onChange={(e) => updateItem(section, item.id, { notFitFor: e.target.value })}
                placeholder="不適合情況：幾時唔應該用呢條規則。"
                style={{ width: '100%', minHeight: '68px', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(26,26,24,0.14)', background: '#fff', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', marginBottom: '10px' }}
              />
              <textarea
                value={item.successMetric || ''}
                onChange={(e) => updateItem(section, item.id, { successMetric: e.target.value })}
                placeholder="Success Metric：應該睇咩 KPI 判斷成功。"
                style={{ width: '100%', minHeight: '68px', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(26,26,24,0.14)', background: '#fff', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => addItem(section, prefix)}
          style={{ marginTop: '14px', border: 'none', borderRadius: '999px', padding: '12px 18px', background: '#1a1a18', color: '#f5efe5', cursor: 'pointer', fontSize: '14px' }}
        >
          {addLabel}
        </button>
      </section>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f6f1e8 0%, #ece3d6 100%)',
      padding: '42px 24px 90px',
      fontFamily: 'Georgia, Times New Roman, serif',
      color: '#1a1a18',
    }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '18px', marginBottom: '22px' }}>
          <div style={{ padding: '28px', borderRadius: '28px', background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(26,26,24,0.10)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>INTERNAL SYSTEM</p>
            <h1 style={{ margin: '0 0 12px', fontSize: '50px', lineHeight: 1.02, fontWeight: 500 }}>
              Campaign Strategy Library
            </h1>
            <p style={{ margin: 0, maxWidth: '760px', fontSize: '18px', lineHeight: 1.7, color: '#5b5348' }}>
              呢頁係俾 SOON internal team 定義同調整 Objective、Brand Situation、Budget Shape、Angle、Funnel Stage 同 Deliverable Shape。付款後嘅完整 AI 分析會優先讀取呢套 Supabase library。
            </p>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#6d6257' }}>{status}</div>
          </div>

          <div style={{ padding: '24px', borderRadius: '28px', background: 'rgba(29,29,27,0.94)', color: '#f5f0e6' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: '#b8b0a2', marginBottom: '10px' }}>HOW TO USE</div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '15px', lineHeight: 1.7 }}>
              <div>1. 先整理你想保留嘅 budget 策略類型</div>
              <div>2. 定義 objective、brand situation 同 funnel stage</div>
              <div>3. 再定義常用 angle 同 deliverable package</div>
              <div>4. 每條 rule 都寫埋不適合情況同 success metric</div>
            </div>
            <button
              type="button"
              onClick={() => saveLibrary()}
              disabled={!loaded || saving}
              style={{ marginTop: '18px', marginRight: '10px', border: 'none', borderRadius: '999px', padding: '12px 16px', background: '#f5f0e6', color: '#1a1a18', cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? '儲存中...' : '儲存 library'}
            </button>
            <button
              type="button"
              onClick={resetLibrary}
              disabled={saving}
              style={{ marginTop: '18px', border: '1px solid rgba(255,255,255,0.20)', borderRadius: '999px', padding: '12px 16px', background: 'transparent', color: '#f5f0e6', cursor: saving ? 'wait' : 'pointer' }}
            >
              重設做預設 library
            </button>
          </div>
        </section>

        <div style={{ display: 'grid', gap: '18px' }}>
          {renderSection('objectives', 'Objectives', 'CAMPAIGN GOAL', '新增 Objective', 'objective')}
          {renderSection('brandSituations', 'Brand Situations', 'BRAND CONTEXT', '新增 Brand Situation', 'situation')}
          {renderSection('budgetShapes', 'Budget Shapes', 'BUDGET STRATEGY', '新增 Budget Shape', 'budget')}
          {renderSection('angleTypes', 'Angle Types', 'CONTENT ANGLE', '新增 Angle Type', 'angle')}
          {renderSection('funnelStages', 'Funnel Stages', 'MARKETING FUNNEL', '新增 Funnel Stage', 'funnel')}
          {renderSection('deliverableShapes', 'Deliverable Shapes', 'DELIVERABLE PACKAGE', '新增 Deliverable Shape', 'deliverable')}
        </div>
      </div>
    </main>
  )
}
