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
  brief: 'Panda Cafe 是一間主打日系甜品與打卡感空間的 cafe，希望吸引 18-30 歲女性與情侶於週末專程到訪。',
  mustInclude: 'Panda Cafe 店名、店內打卡位、招牌甜品 close-up、適合朋友或情侶到訪、最後 CTA 提醒到店或追蹤',
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
            setConfirmMessage('已確認創作者配對，工作台進度已更新。')
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
      setConfirmMessage('目前 demo 版本未有 campaign id，未能正式確認。')
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
        throw new Error(data.error || '未能確認創作者配對。')
      }

      setCreatorConfirmed(true)
      setConfirmMessage('創作者配對已確認，系統知道可以進入腳本規劃階段。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認創作者配對。')
    } finally {
      setConfirmingCreator(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      color: '#f7f8fb',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{
          padding: '30px',
          borderRadius: '30px',
          background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>步驟 3</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>
            系統配對合適創作者
          </h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', maxWidth: '780px' }}>
            你已確認 {form.businessName || '品牌'} 的廣告方向。下一步，SOON 會根據目標、預算、內容角度與品牌氣質，開始配對最合適的創作者組合。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步此專案的創作者配對資料...
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
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>配對核心</div>
              <div style={{ fontSize: '34px', lineHeight: 1.12, marginBottom: '10px' }}>選錯創作者會浪費預算；看錯 KPI，亦可能誤以為 campaign 已成功。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>
                所以 SOON 不會只看 follower 數。對 {form.businessName || '品牌'} 而言，真正應先看目標、內容契合度、受眾、互動質素，以及過往有否轉化能力。
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>SOON 配對邏輯</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  `步驟 1：先看目標。你今次主目標是 ${objectiveLabel}，因此創作者選擇不會與單純曝光 campaign 相同。`,
                  '步驟 2：看內容契合度。重點不在於對方是否夠紅，而是其日常內容、語氣與你的產品或體驗是否真正相關。',
                  '步驟 3：看受眾。地區、年齡層與興趣都要對準你想接觸的客群，而不是只看高 view 數。',
                  '步驟 4：看數據。真正需要看的，是 engagement rate、平均 view、retention 與 completion，而不只是 followers。',
                  '步驟 5：看轉化能力。有些人雖然很紅，卻未必賣得到產品；真正有價值的，是過往有否帶來 sales、click 或 leads。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>建議創作者類型</div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {creatorMatches.map((match, index) => (
                  <section
                    key={match.title}
                    onClick={() => setSelectedCreatorTitle(match.title)}
                    style={{
                      padding: '18px',
                      borderRadius: '20px',
                      background: selectedCreatorTitle === match.title ? 'rgba(255,94,54,0.12)' : 'rgba(255,255,255,0.05)',
                      border: selectedCreatorTitle === match.title ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>配對 {index + 1}</div>
                        <div style={{ fontSize: '28px', lineHeight: 1.05, color: '#f7f8fb' }}>{match.title}</div>
                      </div>
                      <div style={{ minWidth: '90px', borderRadius: '18px', padding: '10px 12px', background: 'rgba(255,94,54,0.12)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(255,210,198,0.82)' }}>適配度</div>
                        <div style={{ fontSize: '28px', color: '#f7f8fb' }}>{match.fitScore}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(210,217,234,0.8)', marginBottom: '12px' }}>
                      {match.summary}
                    </div>

                    <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                      {match.strengths.map((strength) => (
                        <div key={strength} style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: '#e8edf9' }}>
                          {strength}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>創作者報價</div>
                        <div style={{ lineHeight: 1.7, color: '#e8edf9' }}>{match.reelRate}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>SOON 佣金</div>
                        <div style={{ lineHeight: 1.7, color: '#e8edf9' }}>{match.soonCommissionRate} · {match.soonCommissionAmount}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>最佳用途</div>
                        <div style={{ lineHeight: 1.7, color: '#e8edf9' }}>{match.bestUse}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>交付形式</div>
                        <div style={{ lineHeight: 1.7, color: '#e8edf9' }}>{match.deliverableShape}</div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>KPI 優先次序</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  'Level 1：曝光 KPI（Reach / Impressions / Views）只屬表層指標，好看但未必有效。',
                  'Level 2：內容 KPI（Retention / Completion / Shares / Saves / Comments）才較能反映內容質素。Retention 高，才更有機會放大。',
                  'Level 3：商業 KPI（CTR / Leads / Conversion / CPA / ROAS）最重要，因為真正要看的，是能否轉化為生意。',
                  '總結：轉化（conversion） > 行為（retention） > 表面數字（views）。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>內容測試循環</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  '步驟 1：不是一開始只找最紅的人，而是可同時測試 5 至 10 位創作者，每人先產出 1 至 2 條內容。',
                  '步驟 2：在 7 日內觀察 retention、saves、comments、CTR，以及哪位創作者最容易帶來查詢。',
                  '步驟 3：選出表現最佳的前 20% 組合，再放大 ads、補拍 variation，並擴大 winning content。',
                  '這才是真正能帶來收益的做法：創作者不只是交付內容，更是協助你建立 content testing loop。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>下一步會根據選定的創作者組合，開始生成題材與腳本建議。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                第一輪建議不是同時動用最多創作者，而是先以最合適的一至兩類組合，測試最有機會產生結果的 angle，再以數據決定如何放大。
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#d9cfbf', marginBottom: '14px' }}>
                目前確認方向：<strong>{selectedCreatorTitle || '尚未選擇創作者類型'}</strong>
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
                    background: creatorConfirmed ? 'rgba(134,205,144,0.18)' : 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                    color: '#ffffff',
                    padding: '14px 18px',
                    fontSize: '14px',
                    border: creatorConfirmed ? '1px solid rgba(134,205,144,0.28)' : '1px solid rgba(255,121,93,0.26)',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingCreator ? '確認中...' : creatorConfirmed ? '已確認創作者方向' : '確認創作者方向'}
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
                  進入腳本規劃
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
                  我想先與策略團隊確認創作者組合
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
            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px' }}>流程進度</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, color: '#f7f8fb', marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: '1. 填寫品牌 brief', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適創作者', status: creatorConfirmed ? '完成' : '進行中' },
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
              <Link href={analysisHref} style={{ color: '#f5efe5' }}>返回完整分析</Link>
              {' · '}
              <Link href={dashboardHref} style={{ color: '#f5efe5' }}>返回專案工作台</Link>
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
          color: '#f7f8fb',
          padding: '42px 24px 90px',
        }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              正在載入創作者配對...
            </section>
          </div>
        </main>
      }
    >
      <CreatorMatchingContent />
    </Suspense>
  )
}
