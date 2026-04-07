'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase'

const cardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(26,26,24,0.12)',
  borderRadius: '22px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(26,26,24,0.06)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(26,26,24,0.14)',
  background: 'rgba(255,255,255,0.88)',
  fontSize: '14px',
  boxSizing: 'border-box',
}

type FormState = {
  objective: string
  businessName: string
  campaignTitle: string
  vertical: string
  budgetRange: string
  brief: string
  mustInclude: string
}

const initialState: FormState = {
  objective: 'sales',
  businessName: '',
  campaignTitle: '',
  vertical: 'food',
  budgetRange: '8000-15000',
  brief: '',
  mustInclude: '',
}

export default function SubmitBriefPage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [generatedPreview, setGeneratedPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const aiPreview = useMemo(() => {
    if (!form.brief.trim()) return null

    const focusMap: Record<string, string> = {
      food: '以第一口 reaction 同氛圍感做主線',
      travel: '以地方感同 reveal 動線做主線',
      product: '以實用情境同轉化點做主線',
      experience: '以體驗前後反差同過程感做主線',
    }

    const objectiveMap: Record<string, string> = {
      sales: '直接推動查詢、落單同轉化',
      reach: '盡量吸引多人睇、多人分享同多人記得',
      branding: '建立品牌形象同感覺，唔急住硬 sell',
    }

    return {
      summary: `${form.businessName || '你嘅品牌'}而家最想要嘅方向係${objectiveMap[form.objective] || '清楚 angle'}。系統會根據你填寫嘅內容，極速生成最適合你嘅題材方向，再分析適合點樣做 social media 宣傳。`,
      angleA: form.vertical === 'food'
        ? '值唔值得專程去食'
        : form.vertical === 'travel'
          ? '離開城市半日就去到另一個世界'
          : form.vertical === 'product'
            ? '生活中一用就有感分別'
            : '原來香港仲有呢種體驗',
      angleB: form.vertical === 'product'
        ? '一條偏實測，一條偏情境種草'
        : '一條主 Reel + 一條補充 cutdown',
      budgetGuide: form.budgetRange === '3000-8000'
        ? '適合做單條快狠準測試內容'
        : form.budgetRange === '8000-15000'
          ? '適合做一條主片 + 一條補充內容'
          : form.budgetRange === '30000-50000'
            ? '適合做多 creator 測試、完整 campaign 包裝同更進取放大'
          : '適合做完整 campaign 試驗同多角度內容',
    }
  }, [form])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGeneratedPreview(true)
    setSaving(true)
    setSaveMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.from('campaign_intakes').insert({
        objective: form.objective,
        business_name: form.businessName.trim(),
        campaign_title: form.campaignTitle.trim(),
        vertical: form.vertical,
        budget_range: form.budgetRange,
        brief: form.brief.trim(),
        must_include: form.mustInclude.trim(),
        ai_summary: aiPreview?.summary || '',
        suggested_budget_shape: aiPreview?.budgetGuide || '',
        suggested_angle: aiPreview?.angleA || '',
        suggested_deliverable_shape: aiPreview?.angleB || '',
        source_channel: 'soon-campaign-workspace',
      })

      if (error) throw error
      setSaveMessage('已經成功記錄你嘅 brief，我哋可以用呢份資料繼續跟進。')
    } catch (error) {
      console.error(error)
      setSaveMessage('AI 分析已生成，但資料暫時未成功寫入系統。請稍後再試，或先繼續用預覽。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f4efe6 0%, #ebe3d6 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '40px 24px 80px',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <section style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', letterSpacing: '0.18em', color: '#857866', marginBottom: '10px' }}>
            SOON AI SYSTEM
          </p>
          <h1 style={{ fontSize: '54px', lineHeight: 1.02, fontWeight: 500, margin: '0 0 14px' }}>
            一鍵配對
            <br />
            <span style={{ fontSize: '34px', fontWeight: 400 }}>Submit A Campaign Brief</span>
          </h1>
          <p style={{ maxWidth: '760px', fontSize: '18px', lineHeight: 1.7, color: '#5a5349', margin: 0 }}>
            商戶交 brief 之後，系統會極速生成最適合你的題材做選擇，AI 分析你需要嘅 social media 宣傳方案。
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)', gap: '22px', alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={cardStyle}>
            <div style={{ marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px', fontSize: '13px', color: '#6b6257' }}>你今次最想達成咩宣傳目標？</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { value: 'sales', label: '全力衝 Sales！', desc: '最想快啲有查詢、落單、轉化。' },
                  { value: 'reach', label: '我要多人睇！', desc: '最想衝觀看、分享、討論度。' },
                  { value: 'branding', label: '品牌形象優先', desc: '重感覺同定位，唔急住 hard sell。' },
                ].map((option) => {
                  const selected = form.objective === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('objective', option.value)}
                      style={{
                        textAlign: 'left',
                        padding: '14px',
                        borderRadius: '16px',
                        border: selected ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.12)',
                        background: selected ? '#f7f1e4' : 'rgba(255,255,255,0.82)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '15px', color: '#1a1a18', marginBottom: '6px' }}>{option.label}</div>
                      <div style={{ fontSize: '12px', color: '#6e665b', lineHeight: 1.5 }}>{option.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>Business / Brand</div>
                <input value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} style={inputStyle} placeholder="例如 One Bite / cafe / 餐廳品牌" />
              </label>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>Campaign Title</div>
                <input value={form.campaignTitle} onChange={(e) => updateField('campaignTitle', e.target.value)} style={inputStyle} placeholder="例如 春季新 menu 推廣" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>Vertical</div>
                <select value={form.vertical} onChange={(e) => updateField('vertical', e.target.value)} style={inputStyle}>
                  <option value="food">Food</option>
                  <option value="travel">Travel</option>
                  <option value="product">Product</option>
                  <option value="experience">Experience</option>
                </select>
              </label>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>預算範圍</div>
                <select value={form.budgetRange} onChange={(e) => updateField('budgetRange', e.target.value)} style={inputStyle}>
                  <option value="3000-8000">HK$3,000 - 8,000</option>
                  <option value="8000-15000">HK$8,000 - 15,000</option>
                  <option value="15000-30000">HK$15,000 - 30,000</option>
                  <option value="30000-50000">HK$30,000 - 50,000</option>
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>Campaign Brief</div>
                <textarea value={form.brief} onChange={(e) => updateField('brief', e.target.value)} style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }} placeholder="描述商戶想做咩、想吸引咩客、想帶出咩感覺。" />
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b6257' }}>Must Include</div>
                <textarea value={form.mustInclude} onChange={(e) => updateField('mustInclude', e.target.value)} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="例如地址、優惠、價格、預約方式、產品連結。" />
              </label>
            </div>

            <button type="submit" style={{
              border: 'none',
              borderRadius: '999px',
              padding: '14px 22px',
              background: '#1a1a18',
              color: '#f4efe6',
              cursor: 'pointer',
              fontSize: '14px',
              letterSpacing: '0.05em',
            }}>
              {saving ? '生成中...' : 'AI 自動生成分析'}
            </button>

            {generatedPreview && (
              <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '14px', background: '#f7f2d8', color: '#6b5d1c', fontSize: '14px' }}>
                {saveMessage || 'AI 已經根據你填寫嘅內容生成第一版方向建議。下一步我哋可以再將呢份 brief 接去真實 campaign workflow。'}
              </div>
            )}
          </form>

          <aside style={{ display: 'grid', gap: '18px' }}>
            <section style={cardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.16em', color: '#857866' }}>AI ENRICHED PREVIEW</p>
              {generatedPreview && aiPreview ? (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: '16px', lineHeight: 1.7, color: '#433d35' }}>{aiPreview.summary}</p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ padding: '14px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                      <div style={{ fontSize: '12px', color: '#8a7f71', marginBottom: '6px' }}>Suggested Budget Shape</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.budgetGuide}</strong>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                      <div style={{ fontSize: '12px', color: '#8a7f71', marginBottom: '6px' }}>Suggested Angle A</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.angleA}</strong>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                      <div style={{ fontSize: '12px', color: '#8a7f71', marginBottom: '6px' }}>Suggested Deliverable Shape</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.angleB}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: '#6f675d' }}>
                  當你按下「AI 自動生成分析」之後，系統先會根據你嘅品牌目標、預算同 brief，生成專屬題材方向同宣傳建議。
                </p>
              )}
            </section>

            <section style={cardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.16em', color: '#857866' }}>運作流程</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  '1. 填寫品牌 brief',
                  '2. AI 分析宣傳方向',
                  '3. 系統配對合適 creator',
                  '4. 生成題材與腳本建議',
                  '5. 整理拍攝方向與分鏡',
                  '6. 跟進內容交付',
                ].map((step) => (
                  <div key={step} style={{ padding: '12px 14px', borderRadius: '14px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', fontSize: '14px' }}>
                    {step}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
