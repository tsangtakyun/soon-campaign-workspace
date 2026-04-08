'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  buildCreatorMatches,
  extractWorkflowState,
  type CampaignFormInput,
  type StoredPaidAnalysisDraft,
} from '@/lib/analysis'

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

const STORAGE_KEY = 'soon-paid-analysis-draft-v1'

function CreatorMatchingContent() {
  const searchParams = useSearchParams()
  const campaignIntakeId = searchParams.get('campaign_intake_id')
  const [form, setForm] = useState<CampaignFormInput>(DEMO_FORM)
  const [loadingSaved, setLoadingSaved] = useState(Boolean(campaignIntakeId))
  const [selectedCreatorTitle, setSelectedCreatorTitle] = useState('')
  const [creatorConfirmed, setCreatorConfirmed] = useState(false)
  const [confirmingCreator, setConfirmingCreator] = useState(false)
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
      // ignore local draft errors and fall back to demo
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
          if (workflow?.selectedCreatorTitle) {
            setSelectedCreatorTitle(workflow.selectedCreatorTitle)
          }
          if (workflow?.creatorMatchingConfirmed) {
            setCreatorConfirmed(true)
            setConfirmMessage('已確認 creator matching，dashboard 進度已更新。')
          }
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId])

  const creatorMatches = useMemo(() => buildCreatorMatches(form), [form])
  useEffect(() => {
    if (!selectedCreatorTitle && creatorMatches[0]) {
      setSelectedCreatorTitle(creatorMatches[0].title)
    }
  }, [creatorMatches, selectedCreatorTitle])
  const objectiveLabel =
    form.objective === 'sales'
      ? 'Conversion（轉化 / 銷售）'
      : form.objective === 'reach'
        ? 'Awareness（曝光）'
        : 'Engagement / Branding（互動 / 品牌感）'

  const analysisHref = campaignIntakeId
    ? `/paid-analysis?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}`
    : '/paid-analysis'
  const dashboardHref = campaignIntakeId
    ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}`
    : '/my-workspace'
  const scriptPlanningHref = campaignIntakeId
    ? `/script-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}`
    : '/script-planning'

  async function confirmCreatorMatching() {
    if (!campaignIntakeId) {
      setConfirmMessage('呢個 demo 版本未有 campaign id，未能正式確認。')
      return
    }

    setConfirmingCreator(true)
    setConfirmMessage('')

    try {
      const response = await fetch('/api/campaign-workflow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIntakeId,
          step: 'creator-matching',
          selectedCreatorTitle,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能確認 creator matching')
      }

      setCreatorConfirmed(true)
      setConfirmMessage('Creator matching 已確認，系統知道可以進入 script planning。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認 creator matching')
    } finally {
      setConfirmingCreator(false)
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
        <section style={{
          padding: '30px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(26,26,24,0.10)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>STEP 3</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>
            系統配對合適 creator
          </h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '780px' }}>
            你已經確認咗 {form.businessName || '品牌'} 嘅 campaign 方向。下一步，SOON 會根據你嘅目標、budget、內容角度同品牌氣質，開始配對最合適嘅 creator 組合。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步你呢個 campaign 嘅 creator matching 資料...
          </section>
        )}

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) 320px',
          gap: '22px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>MATCHING STATUS</div>
              <div style={{ fontSize: '34px', lineHeight: 1.12, marginBottom: '10px' }}>揀錯 creator = 燒錢；睇錯 KPI = 以為成功，但其實未必有生意。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>
                所以 SOON 唔會只睇 follower 數。對 {form.businessName || '品牌'} 而言，真正應該先睇目標、內容 fit、受眾、互動質素，同埋過往有冇轉化能力。
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>HOW SOON MATCHES CREATORS</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  `Step 1：先睇目的。你今次主目標係 ${objectiveLabel}，所以揀 creator 唔會同曝光 campaign 一樣。`,
                  'Step 2：睇內容 fit。唔係佢紅唔紅，而係佢平時講嘅內容、語氣同你產品 / 體驗有冇真正關聯。',
                  'Step 3：睇受眾。地區、年齡層、興趣，全部要對到你想要嘅客，而唔係得高 view 就算。',
                  'Step 4：睇數據。真正會睇 engagement rate、平均 view、retention、completion，而唔係只睇 followers。',
                  'Step 5：睇轉化能力。有啲人好紅，但完全賣唔到嘢；真正值錢係佢之前有冇 sales / click / leads 表現。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>RECOMMENDED CREATOR ARCHETYPES</div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {creatorMatches.map((match, index) => (
                  <section
                    key={match.title}
                    onClick={() => setSelectedCreatorTitle(match.title)}
                    style={{
                      padding: '18px',
                      borderRadius: '20px',
                      background: selectedCreatorTitle === match.title ? '#f7f1e1' : '#fbf8f1',
                      border: selectedCreatorTitle === match.title ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '6px' }}>MATCH {index + 1}</div>
                        <div style={{ fontSize: '28px', lineHeight: 1.05, color: '#1a1a18' }}>{match.title}</div>
                      </div>
                      <div style={{ minWidth: '90px', borderRadius: '18px', padding: '10px 12px', background: '#f1ebde', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#8b7c69' }}>FIT SCORE</div>
                        <div style={{ fontSize: '28px', color: '#1a1a18' }}>{match.fitScore}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '16px', lineHeight: 1.75, color: '#4c463d', marginBottom: '12px' }}>
                      {match.summary}
                    </div>

                    <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                      {match.strengths.map((strength) => (
                        <div key={strength} style={{ padding: '12px 14px', borderRadius: '14px', background: '#fff', border: '1px solid rgba(26,26,24,0.06)', lineHeight: 1.7 }}>
                          {strength}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '16px', background: '#fff', border: '1px solid rgba(26,26,24,0.06)' }}>
                        <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>Creator Rate</div>
                        <div style={{ lineHeight: 1.7 }}>{match.reelRate}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '16px', background: '#fff', border: '1px solid rgba(26,26,24,0.06)' }}>
                        <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>SOON Commission</div>
                        <div style={{ lineHeight: 1.7 }}>{match.soonCommissionRate} · {match.soonCommissionAmount}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '16px', background: '#fff', border: '1px solid rgba(26,26,24,0.06)' }}>
                        <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>Best Use</div>
                        <div style={{ lineHeight: 1.7 }}>{match.bestUse}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '16px', background: '#fff', border: '1px solid rgba(26,26,24,0.06)' }}>
                        <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>Deliverable Shape</div>
                        <div style={{ lineHeight: 1.7 }}>{match.deliverableShape}</div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>KPI PRIORITY</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  'Level 1：曝光 KPI（Reach / Impressions / Views）只係最表面，好睇但未必有用。',
                  'Level 2：內容 KPI（Retention / Completion / Shares / Saves / Comments）先反映 content 質素。Retention 高，先有機會爆。',
                  'Level 3：商業 KPI（CTR / Leads / Conversion / CPA / ROAS）先係最重要，因為真正要睇有冇變成生意。',
                  '總結：錢（conversion） > 行為（retention） > 表面（views）。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>CONTENT TESTING LOOP</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  'Step 1：唔係一開始搵一個最紅嘅人，而係可以同時測 5-10 個 creator，每人出 1-2 條內容。',
                  'Step 2：7 日內睇 retention、saves、comments、CTR，同埋邊個 creator 最容易帶出查詢。',
                  'Step 3：揀 top 20% 組合，再去 boost ads、再拍 variation、再放大 winning content。',
                  '呢個先係真係賺錢嘅玩法：creator 唔止 deliver content，而係幫你做 content testing loop。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>下一步會根據選定 creator 組合，開始生成題材與腳本建議。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                第一輪建議唔係同時搵最大量 creator，而係先用最 fit 嗰一至兩類組合測最有機會出結果嘅 angle，再用數據決定點樣放大。
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#d9cfbf', marginBottom: '14px' }}>
                目前確認方向：<strong>{selectedCreatorTitle || '未選擇 creator archetype'}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={confirmCreatorMatching}
                  disabled={confirmingCreator}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: creatorConfirmed ? '#dbe7d0' : '#f5efe5',
                    color: '#1a1a18',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingCreator ? '確認中...' : creatorConfirmed ? '已確認 creator 方向' : '確認 creator 方向'}
                </button>
                <Link
                  href={scriptPlanningHref}
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
                    textDecoration: 'none',
                  }}
                >
                  進入 script planning
                </Link>
                <button
                  type="button"
                  style={{
                    borderRadius: '999px',
                    background: 'transparent',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.35)',
                    cursor: 'pointer',
                  }}
                >
                  我想先同策略團隊確認 creator 組合
                </button>
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
                  { label: '3. 系統配對合適 creator', status: creatorConfirmed ? '完成' : '進行中' },
                  { label: '4. 生成題材與腳本建議', status: creatorConfirmed ? '進行中' : '下一步' },
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
              <Link href={analysisHref} style={{ color: '#1a1a18' }}>返回完整分析</Link>
              {' · '}
              <Link href={dashboardHref} style={{ color: '#1a1a18' }}>返回 campaign dashboard</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function CreatorMatchingPage() {
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
              正在載入 creator matching...
            </section>
          </div>
        </main>
      }
    >
      <CreatorMatchingContent />
    </Suspense>
  )
}
