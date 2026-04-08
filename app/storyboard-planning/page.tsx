'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  buildStoryboardPlanningPack,
  extractWorkflowState,
  type CampaignFormInput,
  type StoredPaidAnalysisDraft,
} from '@/lib/analysis'

const STORAGE_KEY = 'soon-paid-analysis-draft-v1'

const DEMO_FORM: CampaignFormInput = {
  contactName: 'Tommy',
  objective: 'sales',
  businessName: 'Panda Cafe',
  whatsapp: '9123 4567',
  email: 'hello@pandacafe.com',
  campaignTitle: 'Panda Cafe 春季宣傳',
  vertical: 'food',
  budgetRange: '15000-30000',
  brief: 'Panda Cafe 係一間主打日系甜品同打卡感空間嘅 cafe，我哋想吸引 18-30 歲女仔同情侶喺週末專程過嚟。',
  mustInclude: 'Panda Cafe 店名、店內打卡位、招牌甜品 close-up、適合朋友/情侶去、最後 CTA 提醒到店或 follow',
}

function StoryboardPlanningContent() {
  const searchParams = useSearchParams()
  const campaignIntakeId = searchParams.get('campaign_intake_id')
  const [form, setForm] = useState<CampaignFormInput>(DEMO_FORM)
  const [loadingSaved, setLoadingSaved] = useState(Boolean(campaignIntakeId))
  const [storyboardDraft, setStoryboardDraft] = useState({
    openingShot: '',
    heroProductShot: '',
    environmentShot: '',
    ctaShot: '',
  })
  const [storyboardConfirmed, setStoryboardConfirmed] = useState(false)
  const [confirmingStoryboard, setConfirmingStoryboard] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredPaidAnalysisDraft | CampaignFormInput
      if ('form' in parsed) {
        setForm(parsed.form)
      } else {
        setForm(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    async function loadSavedCampaign() {
      if (!campaignIntakeId) {
        setLoadingSaved(false)
        return
      }

      try {
        const response = await fetch(`/api/paid-analysis/by-intake?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}`)
        const data = await response.json()
        if (response.ok && data.form) {
          setForm(data.form as CampaignFormInput)
          const workflow = data.workflow || extractWorkflowState(data.analysis as Record<string, unknown>)
          if (workflow?.storyboardDraft) {
            setStoryboardDraft({
              openingShot: workflow.storyboardDraft.openingShot || '',
              heroProductShot: workflow.storyboardDraft.heroProductShot || '',
              environmentShot: workflow.storyboardDraft.environmentShot || '',
              ctaShot: workflow.storyboardDraft.ctaShot || '',
            })
          }
          if (workflow?.storyboardPlanningConfirmed) {
            setStoryboardConfirmed(true)
            setConfirmMessage('Storyboard planning 已確認，campaign 已進入內容交付階段。')
          }
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId])

  const pack = useMemo(() => buildStoryboardPlanningPack(form), [form])

  useEffect(() => {
    setStoryboardDraft((prev) => (
      prev.openingShot || prev.heroProductShot || prev.environmentShot || prev.ctaShot
        ? prev
        : {
            openingShot: pack.shotPlan[0]?.visualDirection || '',
            heroProductShot: pack.shotPlan[1]?.visualDirection || '',
            environmentShot: pack.shotPlan[2]?.visualDirection || '',
            ctaShot: pack.shotPlan[3]?.visualDirection || '',
          }
    ))
  }, [pack])

  const dashboardHref = campaignIntakeId ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}` : '/my-workspace'
  const scriptPlanningHref = campaignIntakeId ? `/script-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/script-planning'

  function updateStoryboardDraft(
    field: 'openingShot' | 'heroProductShot' | 'environmentShot' | 'ctaShot',
    value: string
  ) {
    setStoryboardDraft((prev) => ({ ...prev, [field]: value }))
  }

  async function confirmStoryboardPlanning() {
    if (!campaignIntakeId) {
      setConfirmMessage('呢個 demo 版本未有 campaign id，未能正式確認。')
      return
    }

    setConfirmingStoryboard(true)
    setConfirmMessage('')

    try {
      const response = await fetch('/api/campaign-workflow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIntakeId,
          step: 'storyboard-planning',
          storyboardDraft,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能確認 storyboard planning')
      }

      setStoryboardConfirmed(true)
      setConfirmMessage('Storyboard planning 已確認，dashboard 會進入內容交付階段。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認 storyboard planning')
    } finally {
      setConfirmingStoryboard(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{ padding: '30px', borderRadius: '28px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>STEP 5</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>整理拍攝方向與分鏡</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '820px' }}>
            呢一步係將已確認嘅 script planning 變成 creator 同 production 真正可執行嘅 storyboard direction。重點唔係寫死每一鏡，而係整理最需要出現嘅畫面次序、情緒節奏同 CTA 收尾。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步你呢個 campaign 嘅 storyboard planning 資料...
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) 320px', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>STORYBOARD NORTH STAR</div>
              <div style={{ fontSize: '34px', lineHeight: 1.1, marginBottom: '12px' }}>{pack.headline}</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>{pack.rationale}</div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>SHOT PLAN</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {pack.shotPlan.map((shot, index) => (
                  <div key={shot.title} style={{ padding: '18px', borderRadius: '18px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                    <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '6px' }}>SHOT {index + 1}</div>
                    <div style={{ fontSize: '26px', lineHeight: 1.08, marginBottom: '8px' }}>{shot.title}</div>
                    <div style={{ lineHeight: 1.7, color: '#4f493f', marginBottom: '8px' }}>
                      <strong>Purpose：</strong> {shot.purpose}
                    </div>
                    <div style={{ lineHeight: 1.7, color: '#4f493f', marginBottom: '8px' }}>
                      <strong>Direction：</strong> {shot.visualDirection}
                    </div>
                    <div style={{ lineHeight: 1.7, color: '#6a6258' }}>{shot.notes}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>CLIENT CONFIRMATION BLOCK</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { key: 'openingShot' as const, label: 'Opening Shot', placeholder: '第一鏡最應該見到乜，先可以令人停低？' },
                  { key: 'heroProductShot' as const, label: 'Hero Product / Core Value Shot', placeholder: '最強賣點應該由邊個畫面帶出？' },
                  { key: 'environmentShot' as const, label: 'Environment / Mood Shot', placeholder: '邊個場景最能夠令人代入？' },
                  { key: 'ctaShot' as const, label: 'CTA Shot', placeholder: '最後一幕應該點收，先最容易行動？' },
                ].map((field) => (
                  <label key={field.key} style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#5b5348' }}>{field.label}</div>
                    <textarea
                      value={storyboardDraft[field.key]}
                      onChange={(event) => updateStoryboardDraft(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        minHeight: '88px',
                        resize: 'vertical',
                        borderRadius: '16px',
                        border: '1px solid rgba(26,26,24,0.12)',
                        padding: '14px 16px',
                        boxSizing: 'border-box',
                        fontSize: '14px',
                        lineHeight: 1.7,
                        fontFamily: 'inherit',
                        background: '#fbf8f1',
                        color: '#1a1a18',
                      }}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>VISUAL PRIORITY</div>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                {pack.visualPriority.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {pack.deliveryNotes.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#f3ead7', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7, color: '#4f493f' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>確認 storyboard 後，就會進入內容交付同 production handoff。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                呢一步完成，即代表 client 已接受第一輪分鏡方向，之後就可以交俾 creator / production 開始準備實拍。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={confirmStoryboardPlanning}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: storyboardConfirmed ? '#dbe7d0' : '#f5efe5',
                    color: '#1a1a18',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingStoryboard ? '確認中...' : storyboardConfirmed ? '已確認 storyboard' : '確認 storyboard'}
                </button>
                <Link
                  href={dashboardHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.35)',
                    textDecoration: 'none',
                  }}
                >
                  返回 campaign dashboard
                </Link>
              </div>
              {confirmMessage && (
                <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.08)', color: '#f0e7da', lineHeight: 1.7 }}>
                  {confirmMessage}
                </div>
              )}
            </section>
          </div>

          <aside style={{ position: 'sticky', top: '24px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '10px' }}>CAMPAIGN FLOW</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, color: '#1a1a18', marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: '1. 填寫品牌 brief', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適 creator', status: '完成' },
                  { label: '4. 生成題材與腳本建議', status: '完成' },
                  { label: '5. 整理拍攝方向與分鏡', status: storyboardConfirmed ? '完成' : '進行中' },
                  { label: '6. 跟進內容交付', status: storyboardConfirmed ? '進行中' : '下一步' },
                ].map((step) => {
                  const isCurrent = step.status === '進行中'
                  const isDone = step.status === '完成'

                  return (
                    <div
                      key={step.label}
                      style={{
                        padding: '18px',
                        borderRadius: '20px',
                        border: isCurrent ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                        background: isCurrent ? '#f7f1e1' : isDone ? '#f1f5eb' : '#fbf8f1',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '16px', lineHeight: 1.55 }}>{step.label}</div>
                        <div style={{
                          minWidth: '64px',
                          textAlign: 'center',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background: isCurrent ? '#1a1a18' : isDone ? '#dbe7d0' : 'rgba(26,26,24,0.06)',
                          color: isCurrent ? '#f5efe5' : '#4f5b41',
                          fontSize: '11px',
                          letterSpacing: '0.06em',
                        }}>
                          {step.status}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            <div style={{ marginTop: '14px', fontSize: '14px', color: '#5b5348', lineHeight: 1.7 }}>
              <Link href={scriptPlanningHref} style={{ color: '#1a1a18' }}>返回 script planning</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function StoryboardPlanningPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', padding: '80px 24px', background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)', fontFamily: 'Georgia, Times New Roman, serif' }}>正在打開 storyboard planning...</main>}>
      <StoryboardPlanningContent />
    </Suspense>
  )
}
