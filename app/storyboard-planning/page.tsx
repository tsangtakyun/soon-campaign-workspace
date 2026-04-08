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
  const [mustHaveShots, setMustHaveShots] = useState<string[]>([])
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
          if (workflow?.storyboardDraft?.mustHaveShots?.length) {
            setMustHaveShots(workflow.storyboardDraft.mustHaveShots)
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
    setMustHaveShots((prev) => (
      prev.length
        ? prev
        : pack.mustHaveShotGroups.flatMap((group) => group.options.filter((option) => option.recommended).map((option) => option.id))
    ))
  }, [pack])

  const dashboardHref = campaignIntakeId ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}` : '/my-workspace'
  const scriptPlanningHref = campaignIntakeId ? `/script-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/script-planning'

  function toggleMustHaveShot(shotId: string) {
    setMustHaveShots((prev) => (prev.includes(shotId) ? prev.filter((item) => item !== shotId) : [...prev, shotId]))
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
          storyboardDraft: { mustHaveShots },
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
            呢一步唔係俾客戶定死 opening hook、轉折或者 ending。呢啲應該交俾 creator 用自己風格去發揮。客戶真正要做嘅，係揀清楚【背景介紹】同【實測內容】入面邊 7 個 shots 係一定要有。
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
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>CREATOR CREATIVE SCOPE</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {pack.creatorCreativeScope.map((item) => (
                  <div key={item} style={{ padding: '16px 18px', borderRadius: '18px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>MUST-HAVE SHOTS</div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {pack.mustHaveShotGroups.map((group) => (
                  <section key={group.title} style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#f3ead7', border: '1px solid rgba(26,26,24,0.08)' }}>
                      <div style={{ fontSize: '18px', lineHeight: 1.2, marginBottom: '6px' }}>{group.title}</div>
                      <div style={{ lineHeight: 1.7, color: '#5a5348' }}>{group.description}</div>
                    </div>
                    {group.options.map((option) => {
                      const checked = mustHaveShots.includes(option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleMustHaveShot(option.id)}
                          style={{
                            textAlign: 'left',
                            padding: '16px 18px',
                            borderRadius: '18px',
                            background: checked ? '#f7f1e1' : '#fbf8f1',
                            border: checked ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                            <div style={{ fontSize: '18px', lineHeight: 1.2 }}>{option.name}</div>
                            <div style={{
                              minWidth: '74px',
                              textAlign: 'center',
                              padding: '6px 10px',
                              borderRadius: '999px',
                              background: checked ? '#1a1a18' : option.recommended ? '#dbe7d0' : 'rgba(26,26,24,0.06)',
                              color: checked ? '#f5efe5' : option.recommended ? '#4f5b41' : '#6a6258',
                              fontSize: '11px',
                              letterSpacing: '0.06em',
                            }}>
                              {checked ? '必備' : option.recommended ? 'AI 建議' : '可選'}
                            </div>
                          </div>
                          <div style={{ lineHeight: 1.7, color: '#5a5348' }}>{option.description}</div>
                        </button>
                      )
                    })}
                  </section>
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
                呢一步完成，即代表 client 已接受「一定要拍」嘅背景介紹同實測內容 shots。之後 creator 可以按自己風格安排 opening、轉場、ending，同 production 開始準備實拍。
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#d9cfbf', marginBottom: '14px' }}>
                已選必備 shots：<strong>{mustHaveShots.length}</strong> / 7
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
