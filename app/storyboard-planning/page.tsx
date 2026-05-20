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
  brief: 'Panda Cafe 是一間主打日系甜品與打卡感空間的 cafe，希望吸引 18-30 歲女性與情侶於週末專程到訪。',
  mustInclude: 'Panda Cafe 店名、店內打卡位、招牌甜品 close-up、適合朋友或情侶到訪、最後 CTA 提醒到店或追蹤',
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
            setConfirmMessage('分鏡規劃已確認，專案已進入內容交付階段。')
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

  const dashboardHref = '/onboarding'
  const scriptPlanningHref = campaignIntakeId ? `/script-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/script-planning'
  const deliveryConfirmationHref = campaignIntakeId ? `/delivery-confirmation?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/delivery-confirmation'

  function toggleMustHaveShot(shotId: string) {
    setMustHaveShots((prev) => (prev.includes(shotId) ? prev.filter((item) => item !== shotId) : [...prev, shotId]))
  }

  async function confirmStoryboardPlanning() {
    if (!campaignIntakeId) {
      setConfirmMessage('目前 demo 版本未有 campaign id，未能正式確認。')
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
        throw new Error(data.error || '未能確認分鏡規劃。')
      }

      setStoryboardConfirmed(true)
      setConfirmMessage('分鏡規劃已確認，工作台會進入內容交付階段。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認分鏡規劃。')
    } finally {
      setConfirmingStoryboard(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      color: '#f7f8fb',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{ padding: '30px', borderRadius: '30px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>步驟 5</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>整理拍攝方向與分鏡</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', maxWidth: '820px' }}>
            這一步不是由客戶定死 opening hook、轉折或 ending。這些應交由創作者以自身風格發揮。客戶真正需要做的，是清楚選定【背景介紹】與【實測內容】之中哪 7 個 shots 為必備畫面。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步此專案的分鏡規劃資料...
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) 320px', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>STORYBOARD NORTH STAR</div>
              <div style={{ fontSize: '34px', lineHeight: 1.1, marginBottom: '12px' }}>{pack.headline}</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>{pack.rationale}</div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>創作者發揮範圍</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {pack.creatorCreativeScope.map((item) => (
                  <div key={item} style={{ padding: '16px 18px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>必備畫面</div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {pack.mustHaveShotGroups.map((group) => (
                  <section key={group.title} style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,94,54,0.1)', border: '1px solid rgba(255,121,93,0.18)' }}>
                      <div style={{ fontSize: '18px', lineHeight: 1.2, marginBottom: '6px', color: '#f8ddd5' }}>{group.title}</div>
                      <div style={{ lineHeight: 1.7, color: 'rgba(245,229,223,0.82)' }}>{group.description}</div>
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
                            background: checked ? 'rgba(255,94,54,0.12)' : 'rgba(255,255,255,0.05)',
                            border: checked ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                            <div style={{ fontSize: '18px', lineHeight: 1.2, color: '#f5efe5' }}>{option.name}</div>
                            <div style={{
                              minWidth: '74px',
                              textAlign: 'center',
                              padding: '6px 10px',
                              borderRadius: '999px',
                              background: checked ? '#ff5d36' : option.recommended ? 'rgba(134,205,144,0.18)' : 'rgba(255,255,255,0.08)',
                              color: '#ffffff',
                              fontSize: '11px',
                              letterSpacing: '0.06em',
                            }}>
                              {checked ? '必備' : option.recommended ? 'AI 建議' : '可選'}
                            </div>
                          </div>
                          <div style={{ lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>{option.description}</div>
                        </button>
                      )
                    })}
                  </section>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>畫面優先次序</div>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                {pack.visualPriority.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {pack.deliveryNotes.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,94,54,0.1)', border: '1px solid rgba(255,121,93,0.18)', lineHeight: 1.7, color: '#f8ddd5' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>確認分鏡規劃後，就會進入製作與交付安排確認。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                此步驟完成後，即代表客戶已接受「必須拍攝」的背景介紹與實測內容畫面。之後創作者可按自身風格安排 opening、轉場與 ending，而客戶下一步則需確認拍攝時間、交片時間、訂金與交付規則。
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
                    background: storyboardConfirmed ? 'rgba(134,205,144,0.18)' : 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                    color: '#ffffff',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: storyboardConfirmed ? '1px solid rgba(134,205,144,0.28)' : '1px solid rgba(255,121,93,0.26)',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingStoryboard ? '確認中...' : storyboardConfirmed ? '已確認分鏡規劃' : '確認分鏡規劃'}
                </button>
                <Link
                  href={deliveryConfirmationHref}
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
                  進入製作與交付安排確認
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
            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px' }}>流程進度</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, color: '#f7f8fb', marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: '1. 填寫品牌 brief', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適創作者', status: '完成' },
                  { label: '4. 生成題材與腳本建議', status: '完成' },
                  { label: '5. 整理拍攝方向與分鏡', status: storyboardConfirmed ? '完成' : '進行中' },
                  { label: '6. 確認製作與交付安排', status: storyboardConfirmed ? '進行中' : '下一步' },
                  { label: '7. 跟進內容交付', status: '下一步' },
                ].map((step) => {
                  const isCurrent = step.status === '進行中'
                  const isDone = step.status === '完成'

                  return (
                    <div
                      key={step.label}
                      style={{
                        padding: '18px',
                        borderRadius: '20px',
                        border: isCurrent ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.08)',
                        background: isCurrent ? 'rgba(255,94,54,0.12)' : isDone ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '16px', lineHeight: 1.55, color: '#f2f5fc' }}>{step.label}</div>
                        <div style={{
                          minWidth: '64px',
                          textAlign: 'center',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background: isCurrent ? '#ff5d36' : isDone ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                          color: '#ffffff',
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
            <div style={{ marginTop: '14px', fontSize: '14px', color: 'rgba(214,220,236,0.78)', lineHeight: 1.7 }}>
              <Link href={scriptPlanningHref} style={{ color: '#f5efe5' }}>返回腳本規劃</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function StoryboardPlanningPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', padding: '80px 24px', color: '#f7f8fb' }}>正在打開分鏡規劃...</main>}>
      <StoryboardPlanningContent />
    </Suspense>
  )
}
