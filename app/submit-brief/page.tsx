'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { type AnalysisPreview, type CampaignFormInput, type StoredPaidAnalysisDraft } from '@/lib/analysis'

const PAID_ANALYSIS_STORAGE_KEY = 'soon-paid-analysis-draft-v1'

const cardStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '28px',
  padding: '24px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 80px rgba(0,0,0,0.36)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f7f8fb',
  fontSize: '14px',
  boxSizing: 'border-box',
}

type FormState = {
  contactName: string
  objective: string
  businessName: string
  whatsapp: string
  email: string
  campaignTitle: string
  vertical: string
  budgetRange: string
  brief: string
  mustInclude: string
}

type TopicReference = {
  id: string
  label: string
  labelEn: string
  topic: string
  image: string | null
}

const initialState: FormState = {
  contactName: '',
  objective: 'sales',
  businessName: '',
  whatsapp: '',
  email: '',
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
  const [showPaidAnalysis, setShowPaidAnalysis] = useState(false)
  const [campaignIntakeId, setCampaignIntakeId] = useState('')
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const [paidUnlockMessage, setPaidUnlockMessage] = useState('')
  const [checkoutStatus, setCheckoutStatus] = useState('')
  const [aiPreview, setAiPreview] = useState<AnalysisPreview | null>(null)

  useEffect(() => {
    try {
      const storedProfile = window.sessionStorage.getItem('soon-business-profile-v1')
      const storedCampaign = window.sessionStorage.getItem('soon-campaign-details-v1')
      const storedDistribution = window.sessionStorage.getItem('soon-distribution-preferences-v1')
      const storedContentMix = window.sessionStorage.getItem('soon-content-mix-v1')
      const storedVisualStyle = window.sessionStorage.getItem('soon-visual-style-v1')
      const storedTypeface = window.sessionStorage.getItem('soon-typeface-v1')
      const storedPhotoControl = window.sessionStorage.getItem('soon-photo-control-v2')
      const storedTopicReview = window.sessionStorage.getItem('soon-topic-review-v1')
      const profile = storedProfile ? JSON.parse(storedProfile) : {}
      const campaign = storedCampaign ? JSON.parse(storedCampaign) : {}
      const distribution = storedDistribution ? JSON.parse(storedDistribution) : {}
      const contentMix = storedContentMix ? JSON.parse(storedContentMix) : {}
      const visualStyle = storedVisualStyle ? JSON.parse(storedVisualStyle) : {}
      const typeface = storedTypeface ? JSON.parse(storedTypeface) : {}
      const photoControl = storedPhotoControl ? JSON.parse(storedPhotoControl) : {}
      const topicReview = storedTopicReview ? (JSON.parse(storedTopicReview) as TopicReference[]) : []
      const reviewedTopics = Array.isArray(topicReview) ? topicReview : []
      const contentMixLine = Array.isArray(contentMix.items)
        ? contentMix.items
          .filter((item: any) => item.quantity > 0)
          .map((item: any) => `${item.title}: ${item.quantity}/week`)
          .join(', ')
        : ''
      const reviewedTopicLine = reviewedTopics
        .map((item) => item.topic || item.label || item.labelEn)
        .filter(Boolean)
        .slice(0, 6)
        .join('；')
      const reviewedTopicImageCount = reviewedTopics.filter((item) => item.image).length
      const nextMustInclude = [
        campaign.callToAction ? `CTA: ${campaign.callToAction}` : '',
        campaign.targetLink ? `Target link: ${campaign.targetLink}` : '',
        Array.isArray(distribution.channels) && distribution.channels.length
          ? `Distribution: ${distribution.channels.join(', ')}`
          : '',
        distribution.schedule ? `Schedule: ${distribution.schedule}` : '',
        contentMixLine ? `Content mix: ${contentMixLine}` : '',
        contentMix.totalCredits ? `Weekly credits: ${contentMix.totalCredits}` : '',
        visualStyle.title ? `Visual style: ${visualStyle.titleZh || visualStyle.title} / ${visualStyle.title}` : '',
        typeface.name || typeface.title
          ? `Typeface: ${typeface.name || typeface.title} (${typeface.nameEn || typeface.description || typeface.moodZh || typeface.subtitle || ''})`
          : '',
        photoControl.title ? `Photo control: ${photoControl.titleZh || photoControl.title} / ${photoControl.title}` : '',
        photoControl.generationPrompt ? `Photo generation prompt: ${photoControl.generationPrompt}` : '',
        reviewedTopicLine ? `已確認主題：${reviewedTopicLine}` : '',
        reviewedTopicImageCount ? `已準備參考圖片數量：${reviewedTopicImageCount}` : '',
      ].filter(Boolean).join('\n')

      setForm((prev) => ({
        ...prev,
        businessName: profile.businessName || prev.businessName,
        campaignTitle: campaign.campaignName || prev.campaignTitle,
        brief: campaign.theme || prev.brief,
        mustInclude: nextMustInclude || prev.mustInclude,
      }))
    } catch {}
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function persistPaidAnalysisDraft() {
    try {
      const payload: StoredPaidAnalysisDraft = {
        campaignIntakeId: campaignIntakeId || undefined,
        form,
      }
      window.localStorage.setItem(PAID_ANALYSIS_STORAGE_KEY, JSON.stringify(payload))
    } catch {}
  }

  function getOrCreateCampaignIntakeId() {
    if (campaignIntakeId) return campaignIntakeId
    const nextId = crypto.randomUUID()
    setCampaignIntakeId(nextId)
    return nextId
  }

  async function createCampaignIntake() {
    setGeneratedPreview(true)
    setSaving(true)
    setSaveMessage('')
    setPaidUnlockMessage('')
    persistPaidAnalysisDraft()

    try {
      const previewResponse = await fetch('/api/analysis-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const previewData = await previewResponse.json()
      const nextPreview = previewData.preview as AnalysisPreview | null

      if (!previewResponse.ok) throw new Error(previewData.error || 'Unable to generate analysis preview')
      setAiPreview(nextPreview)

      const nextCampaignIntakeId = getOrCreateCampaignIntakeId()
      const intakeResponse = await fetch('/api/campaign-intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextCampaignIntakeId,
          ...form,
          aiSummary: nextPreview?.summary || '',
          suggestedBudgetShape: nextPreview?.budgetGuide || '',
          suggestedAngle: nextPreview?.angleA || '',
          suggestedDeliverableShape: nextPreview?.angleB || '',
        }),
      })
      const intakeData = await intakeResponse.json()
      if (!intakeResponse.ok) throw new Error(intakeData.error || 'Unable to save campaign intake')
      try {
        const payload: StoredPaidAnalysisDraft = {
          campaignIntakeId: nextCampaignIntakeId,
          form,
        }
        window.localStorage.setItem(PAID_ANALYSIS_STORAGE_KEY, JSON.stringify(payload))
      } catch {}
      setSaveMessage('已成功記錄你的需求，我們可根據這份資料繼續跟進。')
      setCheckoutStatus('品牌需求已記錄。')
      return nextCampaignIntakeId
    } catch (error) {
      console.error(error)
      setSaveMessage('AI 分析已生成，但資料暫時未成功寫入系統。請稍後再試，或先繼續用預覽。')
      setCheckoutStatus('未能記錄品牌需求。')
      return ''
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await createCampaignIntake()
  }

  async function handleCheckout() {
    persistPaidAnalysisDraft()
    setPaidUnlockMessage('')
    setCheckoutStatus('準備建立付款流程...')
    setShowPaidAnalysis(true)
    setRedirectingToCheckout(true)

    let resolvedCampaignIntakeId = campaignIntakeId

    if (!resolvedCampaignIntakeId) {
      setCheckoutStatus('先為你記錄品牌需求...')
      resolvedCampaignIntakeId = await createCampaignIntake()
    }

    if (!resolvedCampaignIntakeId) {
      setPaidUnlockMessage('系統暫時未能記錄你的需求，因此未能進入付款流程。請檢查資料後再試。')
      setCheckoutStatus('付款流程未能開始。')
      setRedirectingToCheckout(false)
      return
    }

    setCheckoutStatus('正在建立 Stripe 付款頁面...')

    try {
      const selectedPlan = new URLSearchParams(window.location.search).get('plan') || 'ai-strategy'
      const cancelPath = `${window.location.pathname}${window.location.search}`
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIntakeId: resolvedCampaignIntakeId,
          email: form.email.trim(),
          plan: selectedPlan,
          cancelPath,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能建立付款頁面。')
      }

      if (!data.url) {
        throw new Error('未收到付款頁面連結。')
      }

      setCheckoutStatus('即將跳轉去付款頁面...')
      window.location.href = data.url
    } catch (error: any) {
      setPaidUnlockMessage(error.message || '未能建立付款頁面。')
      setCheckoutStatus('未能建立付款頁面。')
      setRedirectingToCheckout(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      color: '#f7f8fb',
      padding: '40px 24px 80px',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <section style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px', textTransform: 'uppercase' }}>
            SOON 廣告工作台
          </p>
          <h1 style={{ fontSize: 'clamp(2.8rem, 5vw, 4.6rem)', lineHeight: 0.98, fontWeight: 350, letterSpacing: '-0.07em', margin: '0 0 14px' }}>
            提交品牌需求
            <br />
            <span style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', fontWeight: 350, color: 'rgba(232,236,245,0.86)' }}>快速生成第一輪 AI 策略方向</span>
          </h1>
          <p style={{ maxWidth: '760px', fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', margin: 0 }}>
            品牌提交需求後，系統會先生成適合你的題材方向、預算建議與宣傳組合，方便你更快進入後續廣告流程。
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)', gap: '22px', alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>姓名</div>
                <input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} style={inputStyle} placeholder="例如 Tommy" />
              </label>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>公司 / 品牌</div>
                <input value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} style={inputStyle} placeholder="例如 Panda Cafe" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>WhatsApp</div>
                <input value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} style={inputStyle} placeholder="例如 9123 4567" />
              </label>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>電子郵件</div>
                <input value={form.email} onChange={(e) => updateField('email', e.target.value)} style={inputStyle} placeholder="例如 hello@pandacafe.com" />
              </label>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>這次最希望達成甚麼宣傳目標？</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { value: 'sales', label: '轉換優先', desc: '希望更快帶來查詢、下單與實際轉換。' },
                  { value: 'reach', label: '曝光優先', desc: '希望先提升觀看、分享與討論度。' },
                  { value: 'branding', label: '品牌形象優先', desc: '希望先建立定位、質感與品牌印象。' },
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
                        border: selected ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.08)',
                        background: selected ? 'rgba(255,94,54,0.12)' : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '15px', color: '#f7f8fb', marginBottom: '6px' }}>{option.label}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(210,217,234,0.72)', lineHeight: 1.6 }}>{option.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>專案名稱</div>
                <input value={form.campaignTitle} onChange={(e) => updateField('campaignTitle', e.target.value)} style={inputStyle} placeholder="例如 春季新 menu 推廣" />
              </label>
              <div />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>產業類型</div>
                <select value={form.vertical} onChange={(e) => updateField('vertical', e.target.value)} style={inputStyle}>
                  <option value="food">餐飲</option>
                  <option value="travel">旅遊</option>
                  <option value="product">產品</option>
                  <option value="experience">體驗</option>
                </select>
              </label>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>預算範圍</div>
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
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>需求內容</div>
                <textarea value={form.brief} onChange={(e) => updateField('brief', e.target.value)} style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }} placeholder="描述品牌希望達成甚麼、想吸引甚麼客群，以及希望帶出甚麼感覺。" />
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'rgba(162,178,214,0.8)' }}>必須包含的資訊</div>
                <textarea value={form.mustInclude} onChange={(e) => updateField('mustInclude', e.target.value)} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="例如地址、優惠、價格、預約方式、產品連結。" />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button type="submit" style={{
                border: 'none',
                borderRadius: '999px',
                padding: '14px 22px',
                background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}>
                {saving ? '生成中...' : 'AI 生成初步分析'}
              </button>

              <button
                type="button"
                onClick={() => setShowPaidAnalysis((prev) => !prev)}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '999px',
                  padding: '14px 22px',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f4f7ff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  letterSpacing: '0.03em',
                }}
              >
                完整 AI 分析宣傳方向
              </button>
            </div>

            {generatedPreview && (
              <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '14px', background: '#f7f2d8', color: '#6b5d1c', fontSize: '14px' }}>
                {saveMessage || 'AI 已根據你填寫的內容生成第一版方向建議。下一步可再將這份需求接入真實廣告流程。'}
              </div>
            )}

            {showPaidAnalysis && (
              <div style={{
                marginTop: '18px',
                padding: '18px',
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>進階解鎖</div>
                <div style={{ fontSize: '22px', lineHeight: 1.2, marginBottom: '10px', color: '#f7f8fb' }}>
                  完整 AI 分析宣傳方向
                </div>
                <div style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(210,217,234,0.78)', marginBottom: '12px' }}>
                  解鎖後可獲得完整預算形態、多組內容角度、建議交付組合、適合的創作者類型，以及首輪投放建議。
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  {['3 個預算打法', '5 個題材角度', '2 組交付建議', '首輪宣傳建議'].map((item) => (
                    <span key={item} style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}>
                      {item}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)' }}>限時價格</div>
                    <div style={{ fontSize: '28px', color: '#f7f8fb' }}>HK$199</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={redirectingToCheckout}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                      color: '#ffffff',
                      cursor: redirectingToCheckout ? 'wait' : 'pointer',
                      opacity: redirectingToCheckout ? 0.72 : 1,
                      fontSize: '14px',
                    }}
                  >
                    {redirectingToCheckout ? '前往付款中...' : '付款後解鎖'}
                  </button>
                </div>
                {paidUnlockMessage && (
                  <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '14px', background: '#f7f2d8', color: '#6b5d1c', fontSize: '13px', lineHeight: 1.6 }}>
                    {paidUnlockMessage}
                  </div>
                )}
                {checkoutStatus && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#8a7f71', lineHeight: 1.6 }}>
                    {checkoutStatus}
                  </div>
                )}
              </div>
            )}
          </form>

          <aside style={{ display: 'grid', gap: '18px' }}>
            <section style={cardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)' }}>AI 預覽摘要</p>
              {generatedPreview && aiPreview ? (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: '16px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)' }}>{aiPreview.summary}</p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>建議預算形態</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.budgetGuide}</strong>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>建議角度 A</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.angleA}</strong>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>建議交付組合</div>
                      <strong style={{ fontSize: '16px', fontWeight: 500 }}>{aiPreview.angleB}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.8, color: 'rgba(210,217,234,0.76)' }}>
                  當你按下「AI 生成初步分析」後，系統會根據你的品牌目標、預算與需求，生成專屬題材方向與宣傳建議。
                </p>
              )}
            </section>

            <section style={cardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)' }}>運作流程</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  '1. 填寫品牌需求',
                  '2. AI 分析宣傳方向',
                  '3. 系統配對合適創作者',
                  '4. 生成題材與腳本建議',
                  '5. 整理拍攝方向與分鏡',
                  '6. 跟進內容交付',
                ].map((step) => (
                  <div key={step} style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '14px' }}>
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
