'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { buildScriptPlanningPack, type CampaignFormInput, type StoredPaidAnalysisDraft } from '@/lib/analysis'

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
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId])

  const pack = useMemo(() => buildScriptPlanningPack(form), [form])
  useEffect(() => {
    setBackingInfo(pack.backingInformation)
    setTestContentItems(pack.testContentItems)
  }, [pack])
  const dashboardHref = campaignIntakeId ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}` : '/my-workspace'
  const creatorHref = campaignIntakeId ? `/creator-matching?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/creator-matching'

  function updateBackingInfo(field: 'corePositioning' | 'strongestSellingPoint' | 'suitableAudience' | 'backgroundNotes', value: string) {
    setBackingInfo((prev) => ({ ...prev, [field]: value }))
  }

  function updateTestContent(index: number, value: string) {
    setTestContentItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
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
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>STEP 4</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>生成題材與腳本建議</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '820px' }}>
            呢一步唔係幫客戶寫死完整 script。真正應該由客戶先確認嘅，係 internal script system 入面最重要嘅兩塊：第 2 part【背景 VO】同第 4 part【實測內容】；至於 Hook / 轉場 / Ending，應該交返俾 creator 用自己風格去發揮。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步你呢個 campaign 嘅 script planning 資料...
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
                你而家見到嘅係第一輪 script planning。之後再進一步，就會變成 shot plan、opening / transition / ending 分鏡同實際 production handoff。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: '#f5efe5',
                    color: '#1a1a18',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  下一步整理 storyboard
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
                  { label: '4. 生成題材與腳本建議', status: '進行中' },
                  { label: '5. 整理拍攝方向與分鏡', status: '下一步' },
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
              <Link href={creatorHref} style={{ color: '#1a1a18' }}>返回 creator matching</Link>
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
          background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
          color: '#1a1a18',
          fontFamily: 'Georgia, Times New Roman, serif',
          padding: '42px 24px 90px',
        }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              正在載入 script planning...
            </section>
          </div>
        </main>
      }
    >
      <ScriptPlanningContent />
    </Suspense>
  )
}
