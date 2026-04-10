'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  buildScriptPlanningPack,
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

function ScriptPlanningContent() {
  const searchParams = useSearchParams()
  const campaignIntakeId = searchParams.get('campaign_intake_id')
  const [form, setForm] = useState<CampaignFormInput>(DEMO_FORM)
  const [loadingSaved, setLoadingSaved] = useState(Boolean(campaignIntakeId))
  const [backingInfo, setBackingInfo] = useState({
    corePositioning: '',
    strongestSellingPoint: '',
    suitableAudience: '',
    backgroundNotes: '',
  })
  const [testContentItems, setTestContentItems] = useState(['', '', '', ''])
  const [scriptPlanningConfirmed, setScriptPlanningConfirmed] = useState(false)
  const [confirmingScriptPlanning, setConfirmingScriptPlanning] = useState(false)
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
          if (workflow?.scriptPlanningDraft) {
            setBackingInfo({
              corePositioning: workflow.scriptPlanningDraft.corePositioning || '',
              strongestSellingPoint: workflow.scriptPlanningDraft.strongestSellingPoint || '',
              suitableAudience: workflow.scriptPlanningDraft.suitableAudience || '',
              backgroundNotes: workflow.scriptPlanningDraft.backgroundNotes || '',
            })
            setTestContentItems([
              workflow.scriptPlanningDraft.testContentItems?.[0] || '',
              workflow.scriptPlanningDraft.testContentItems?.[1] || '',
              workflow.scriptPlanningDraft.testContentItems?.[2] || '',
              workflow.scriptPlanningDraft.testContentItems?.[3] || '',
            ])
          }
          if (workflow?.scriptPlanningConfirmed) {
            setScriptPlanningConfirmed(true)
            setConfirmMessage('腳本規劃已確認，專案進度已更新。')
          }
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId])

  const pack = useMemo(() => buildScriptPlanningPack(form), [form])
  useEffect(() => {
    setBackingInfo((prev) => (prev.corePositioning || prev.strongestSellingPoint || prev.suitableAudience || prev.backgroundNotes ? prev : pack.backingInformation))
    setTestContentItems((prev) => (prev.some((item) => item.trim()) ? prev : pack.testContentItems))
  }, [pack])
  const dashboardHref = campaignIntakeId ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}` : '/my-workspace'
  const creatorHref = campaignIntakeId ? `/creator-matching?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/creator-matching'
  const storyboardHref = campaignIntakeId ? `/storyboard-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/storyboard-planning'

  function updateBackingInfo(field: 'corePositioning' | 'strongestSellingPoint' | 'suitableAudience' | 'backgroundNotes', value: string) {
    setBackingInfo((prev) => ({ ...prev, [field]: value }))
  }

  function updateTestContent(index: number, value: string) {
    setTestContentItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  async function confirmScriptPlanning() {
    if (!campaignIntakeId) {
      setConfirmMessage('目前 demo 版本未有 campaign id，未能正式確認。')
      return
    }

    setConfirmingScriptPlanning(true)
    setConfirmMessage('')

    try {
      const response = await fetch('/api/campaign-workflow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIntakeId,
          step: 'script-planning',
          scriptPlanningDraft: {
            ...backingInfo,
            testContentItems,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能確認腳本規劃。')
      }

      setScriptPlanningConfirmed(true)
      setConfirmMessage('腳本規劃已確認，系統知道可以進入分鏡規劃階段。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認腳本規劃。')
    } finally {
      setConfirmingScriptPlanning(false)
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
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>步驟 4</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>生成題材與腳本建議</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', maxWidth: '820px' }}>
            這一步不是直接替客戶寫死完整腳本。真正需要先確認的，是內部腳本系統中最關鍵的兩部分：第 2 段【背景旁白】與第 4 段【實測內容】；至於 Hook、轉場與 Ending，應交由創作者以自身風格發揮。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步此專案的腳本規劃資料...
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) 320px', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>SCRIPT NORTH STAR</div>
              <div style={{ fontSize: '34px', lineHeight: 1.1, marginBottom: '12px' }}>{pack.headline}</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>{pack.rationale}</div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>CREATOR CREATIVE SCOPE</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {pack.creatorCreativeDirection.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>PART 2 · 背景 VO / BACKING INFORMATION</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  {
                    key: 'corePositioning' as const,
                    label: `${form.businessName || '品牌'} 嘅核心定位`,
                    placeholder: '例如：呢間店最值得被記住嘅唔係「全部都好」，而係最強賣點夠集中。',
                  },
                  {
                    key: 'strongestSellingPoint' as const,
                    label: '最強賣點',
                    placeholder: '例如：AI 可先幫你揀一個，但你亦可以再改。',
                  },
                  {
                    key: 'suitableAudience' as const,
                    label: `清楚講出 ${form.businessName || '品牌'} 適合咩人去`,
                    placeholder: '例如：朋友聚會、情侶約會、週末打卡',
                  },
                  {
                    key: 'backgroundNotes' as const,
                    label: '品牌背景要補充乜',
                    placeholder: '例如：新開幕、限定 menu、人氣招牌、尖沙咀位置、夜晚氣氛',
                  },
                ].map((field) => (
                  <label key={field.key} style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#5b5348' }}>{field.label}</div>
                    <textarea
                      value={backingInfo[field.key]}
                      onChange={(event) => updateBackingInfo(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        minHeight: field.key === 'backgroundNotes' ? '96px' : '78px',
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
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>PART 4 · 實測內容</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {testContentItems.map((item, index) => (
                  <label key={`test-content-${index}`} style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#5b5348' }}>實測內容 {index + 1}</div>
                    <textarea
                      value={item}
                      onChange={(event) => updateTestContent(index, event.target.value)}
                      placeholder={`第 ${index + 1} 個最值得拍 / 試 / 講嘅位`}
                      style={{
                        width: '100%',
                        minHeight: '110px',
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
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>CLIENT DECISIONS + CTA</div>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                {pack.clientDecisions.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px', borderRadius: '18px', background: '#f3ead7', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.8, color: '#4f493f' }}>
                <strong>CTA Direction：</strong> {pack.ctaDirection}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>下一步會將腳本方向整理成 storyboard 同拍攝方向。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                你現在看到的是第一輪腳本規劃。再往下一步，便會轉化為 shot plan、opening / transition / ending 分鏡與實際製作交接內容。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={confirmScriptPlanning}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: scriptPlanningConfirmed ? '#dbe7d0' : '#f5efe5',
                    color: '#1a1a18',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingScriptPlanning ? '確認中...' : scriptPlanningConfirmed ? '已確認腳本規劃' : '確認腳本規劃'}
                </button>
                <Link
                  href={storyboardHref}
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
                  進入分鏡規劃
                </Link>
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
                  返回專案工作台
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
                  { label: '1. 填寫品牌需求', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適創作者', status: '完成' },
                  { label: '4. 生成題材與腳本建議', status: scriptPlanningConfirmed ? '完成' : '進行中' },
                  { label: '5. 整理拍攝方向與分鏡', status: scriptPlanningConfirmed ? '進行中' : '下一步' },
                  { label: '6. 跟進內容交付', status: '下一步' },
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
              <Link href={creatorHref} style={{ color: '#1a1a18' }}>返回創作者配對</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function ScriptPlanningPage() {
  return (
    <Suspense
      fallback={
        <main style={{
          minHeight: '100vh',
          color: '#f7f8fb',
          padding: '42px 24px 90px',
        }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              正在載入腳本規劃...
            </section>
          </div>
        </main>
      }
    >
      <ScriptPlanningContent />
    </Suspense>
  )
}
