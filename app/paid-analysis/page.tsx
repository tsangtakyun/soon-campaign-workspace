'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { buildFullAnalysis, explainAnalysisPoint, type CampaignFormInput, type FullAnalysis, type StoredPaidAnalysisDraft } from '@/lib/analysis'

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
  brief: 'Panda Cafe 是一間主打日系甜品與打卡感空間的 cafe，希望吸引 18-30 歲女性與情侶於週末專程到訪。這次希望製作一條 social media 宣傳片，整體感覺不宜過於廣告化，而是讓人真實感受到這間 cafe 值得前往、拍照與品嚐甜品。',
  mustInclude: 'Panda Cafe 店名、店內打卡位、招牌甜品 close-up、適合朋友或情侶到訪、最後 CTA 提醒到店或追蹤',
}

function PaidAnalysisContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const demoMode = searchParams.get('demo') === '1'
  const campaignIntakeIdFromUrl = searchParams.get('campaign_intake_id')
  const [draft, setDraft] = useState<CampaignFormInput | null>(null)
  const [campaignIntakeId, setCampaignIntakeId] = useState('')
  const [paid, setPaid] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [savedAnalysis, setSavedAnalysis] = useState<FullAnalysis | null>(null)
  const [openExplanationId, setOpenExplanationId] = useState('')
  const [followUpQuestions, setFollowUpQuestions] = useState<Record<string, string>>({})
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({})
  const [followUpLoadingId, setFollowUpLoadingId] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredPaidAnalysisDraft | CampaignFormInput
        if ('form' in parsed) {
          setDraft(parsed.form)
          setCampaignIntakeId(parsed.campaignIntakeId || '')
        } else {
          setDraft(parsed)
        }
      } else if (demoMode) {
        setDraft(DEMO_FORM)
      }
    } catch {
      if (demoMode) setDraft(DEMO_FORM)
    }
  }, [demoMode])

  useEffect(() => {
    async function checkSession() {
      if (demoMode) {
        setPaid(true)
        setChecking(false)
        setSyncMessage('Demo mode 已開啟，已直接解鎖完整分析。')
        return
      }

      try {
        if (!sessionId && campaignIntakeIdFromUrl) {
          const savedRes = await fetch(`/api/paid-analysis/by-intake?campaign_intake_id=${encodeURIComponent(campaignIntakeIdFromUrl)}`)
          const savedData = await savedRes.json()
          if (!savedRes.ok) throw new Error(savedData.error || '未能載入已保存分析。')
          setPaid(true)
          setSavedAnalysis(savedData.analysis as FullAnalysis)
          setDraft(savedData.form as CampaignFormInput)
          setCampaignIntakeId(campaignIntakeIdFromUrl)
          setSyncMessage('已從你的帳戶載入已保存分析。')
          setChecking(false)
          return
        }

        if (!sessionId) {
          throw new Error('未找到付款 session。')
        }

        const res = await fetch(`/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '未能驗證付款狀態。')
        if (data.payment_status !== 'paid') throw new Error('付款尚未完成。')
        setPaid(true)

        const syncRes = await fetch('/api/paid-analysis/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            campaignIntakeId: campaignIntakeIdFromUrl || campaignIntakeId || undefined,
            form: draft || undefined,
          }),
        })

        const syncData = await syncRes.json()
        if (!syncRes.ok) throw new Error(syncData.error || '未能同步付款資料。')
        setSavedAnalysis(syncData.analysis as FullAnalysis)
        if (syncData.form) {
          setDraft(syncData.form as CampaignFormInput)
        }
        if (syncData.campaignIntakeId) {
          setCampaignIntakeId(syncData.campaignIntakeId as string)
        }
        setSyncMessage('付款狀態同完整分析已經成功寫入系統。')
      } catch (error: any) {
        setError(error.message || '未能確認付款狀態。')
      } finally {
        setChecking(false)
      }
    }

    checkSession()
  }, [campaignIntakeId, campaignIntakeIdFromUrl, demoMode, draft, sessionId])

  const analysis = useMemo(() => {
    if (savedAnalysis) return savedAnalysis
    if (!draft || !paid) return null
    return buildFullAnalysis(draft)
  }, [draft, paid, savedAnalysis])

  function updateQuestion(id: string, value: string) {
    setFollowUpQuestions((prev) => ({ ...prev, [id]: value }))
  }

  async function askQuestion(id: string, sectionTitle: string, item: string) {
    if (!draft) return
    const question = (followUpQuestions[id] || '').trim()
    if (!question) return

    setFollowUpLoadingId(id)

    try {
      const response = await fetch('/api/ai/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: draft,
          sectionTitle,
          item,
          question,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能取得 AI 回答。')
      }

      setFollowUpAnswers((prev) => ({ ...prev, [id]: data.answer }))
    } catch (error: any) {
      setFollowUpAnswers((prev) => ({ ...prev, [id]: error.message || '未能取得 AI 回答。' }))
    } finally {
      setFollowUpLoadingId('')
    }
  }

  const sections: Array<{ title: string; kicker: string; items: string[] }> = analysis ? [
    { title: '1. Strategy', kicker: '定位 + 目標', items: analysis.strategy },
    { title: '2. Content Planning', kicker: '內容設計', items: analysis.contentPlanning },
    { title: '3. Production', kicker: '拍攝 / 製作', items: analysis.production },
    { title: '4. Distribution', kicker: '發佈 + 放大', items: analysis.distribution },
    { title: '5. Conversion', kicker: '變現 / Lead', items: analysis.conversion },
    { title: '6. Data & Optimization', kicker: '數據優化', items: analysis.optimization },
  ] : []

  const campaignFlow = [
    '1. 填寫品牌 brief',
    '2. AI 分析宣傳方向',
    '3. 系統配對合適 creator',
    '4. 生成題材與腳本建議',
    '5. 整理拍攝方向與分鏡',
    '6. 跟進內容交付',
  ]
  const savedAnalysisHref = campaignIntakeIdFromUrl || campaignIntakeId
    ? `/paid-analysis?campaign_intake_id=${encodeURIComponent(campaignIntakeIdFromUrl || campaignIntakeId)}`
    : '/my-workspace'

  return (
    <main style={{
      minHeight: '100vh',
      color: '#1a1a18',
      padding: '28px 24px 90px',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <section style={{
          padding: '28px 32px',
          borderRadius: '22px',
          background: '#fbf8f1',
          border: '1px solid rgba(245,239,229,0.18)',
          marginBottom: '18px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.22)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>完整 AI 分析</p>
          <h1 style={{ margin: '0 0 10px', fontSize: '42px', lineHeight: 1.06, fontWeight: 500, letterSpacing: 0 }}>
            完整 AI 分析宣傳方向
          </h1>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.75, color: '#5b5348', maxWidth: '820px' }}>
            付款成功後，系統會解鎖完整策略方向、題材角度、交付建議與創作者適配方向。
          </p>
        </section>

        {checking && (
          <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
            正在確認付款狀態...
          </section>
        )}

        {!checking && error && (
          <section style={{ padding: '24px', borderRadius: '28px', background: 'rgba(181,69,69,0.16)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>未能解鎖完整分析</div>
            <div style={{ color: '#ffe7e3', marginBottom: '14px' }}>{error}</div>
            <Link href="/submit-brief" style={{ color: '#ffffff' }}>返回需求頁</Link>
          </section>
        )}

        {!checking && paid && analysis && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: '22px', alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: '18px' }}>
              {syncMessage && (
                <section style={{ padding: '18px 20px', borderRadius: '20px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
                  {syncMessage}
                </section>
              )}

              <section style={{ padding: '22px 24px', borderRadius: '18px', background: '#f7f1e1', border: '1px solid rgba(26,26,24,0.08)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '10px' }}>CAMPAIGN LOGIC</div>
                <div style={{ fontSize: '24px', lineHeight: 1.38, color: '#1a1a18' }}>
                  {analysis.campaignNorthStar}
                </div>
              </section>

              <section style={{ padding: '24px', borderRadius: '18px', background: '#1d1d1b', color: '#f5efe5' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '8px' }}>UNLOCKED</div>
                <div style={{ fontSize: '30px', lineHeight: 1.16, marginBottom: '10px' }}>{analysis.headline}</div>
                <div style={{ fontSize: '16px', lineHeight: 1.75, color: '#ede4d8' }}>{analysis.overview}</div>
              </section>

              {sections.map(({ title, kicker, items }) => (
                <section key={title} style={{ padding: '24px', borderRadius: '18px', background: '#f4efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
                  <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '6px' }}>{kicker}</div>
                  <div style={{ fontSize: '28px', lineHeight: 1.1, marginBottom: '16px', color: '#1a1a18' }}>{title}</div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {items.map((item, index) => {
                      const explanationId = `${title}-${index}`
                      const isOpen = openExplanationId === explanationId

                      return (
                        <div key={item} style={{ padding: '16px 18px', borderRadius: '14px', background: '#fffdf8', border: '1px solid rgba(26,26,24,0.08)', color: '#1a1a18' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: '12px', flex: 1 }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#efe5d3', color: '#6d6257', fontSize: '13px', flex: '0 0 auto' }}>
                                {index + 1}
                              </div>
                              <div style={{ lineHeight: 1.75, fontSize: '15px', color: '#2b2824' }}>{item}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenExplanationId(isOpen ? '' : explanationId)}
                              style={{
                                border: '1px solid rgba(26,26,24,0.12)',
                                borderRadius: '999px',
                                background: isOpen ? '#1a1a18' : 'rgba(255,255,255,0.9)',
                                color: isOpen ? '#f5efe5' : '#1a1a18',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isOpen ? '收起 AI 解釋' : '問 AI 點解'}
                            </button>
                          </div>

                          {isOpen && draft && (
                            <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                              <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#f3ead7', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.8, color: '#4f493f' }}>
                                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '8px' }}>AI EXPLANATION</div>
                                {explainAnalysisPoint(draft, title, item)}
                              </div>

                              <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#fffdf8', border: '1px solid rgba(26,26,24,0.08)' }}>
                                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '10px' }}>追問 AI</div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  <textarea
                                    value={followUpQuestions[explanationId] || ''}
                                    onChange={(event) => updateQuestion(explanationId, event.target.value)}
                                    placeholder="例如：點解唔建議我一開始衝曝光？"
                                    style={{
                                      width: '100%',
                                      minHeight: '92px',
                                      resize: 'vertical',
                                      borderRadius: '14px',
                                      border: '1px solid rgba(26,26,24,0.12)',
                                      padding: '12px 14px',
                                      background: '#ffffff',
                                      boxSizing: 'border-box',
                                      fontSize: '14px',
                                      fontFamily: 'inherit',
                                    }}
                                  />
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => askQuestion(explanationId, title, item)}
                                      disabled={followUpLoadingId === explanationId}
                                      style={{
                                        border: '1px solid rgba(26,26,24,0.12)',
                                        borderRadius: '999px',
                                        background: '#1a1a18',
                                        color: '#f5efe5',
                                        padding: '10px 14px',
                                        cursor: followUpLoadingId === explanationId ? 'wait' : 'pointer',
                                        opacity: followUpLoadingId === explanationId ? 0.72 : 1,
                                        fontSize: '12px',
                                      }}
                                    >
                                      {followUpLoadingId === explanationId ? 'AI 回答中...' : '即刻問 AI'}
                                    </button>
                                  </div>

                                  {followUpAnswers[explanationId] && (
                                    <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#f3ead7', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.8, color: '#4f493f' }}>
                                      <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '8px' }}>AI FOLLOW-UP</div>
                                      {followUpAnswers[explanationId]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}

              <section style={{ padding: '26px', borderRadius: '18px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
                <div style={{ fontSize: '30px', lineHeight: 1.12, marginBottom: '12px' }}>如果你認同呢個方向，可以即刻進入下一步。</div>
                <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                  你可以直接確認方向，交俾系統開始配對合適 creator；如果你想先同真人策略團隊對一對重點，我哋都可以下一步幫你承接。
                </div>
                <div style={{ marginBottom: '18px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', color: '#f0e7da', lineHeight: 1.7 }}>
                  想之後唔使再經付款流程？下一步會先帶你去 Google 登入頁。只要用同一個 email 嘅 Google 帳號登入，之後就可以直接喺你的 workspace 睇返已買分析。
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <Link
                    href={`/creator-matching${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      background: '#f5efe5',
                      color: '#1a1a18',
                      padding: '14px 18px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      border: '1px solid rgba(245,239,229,0.4)',
                    }}
                  >
                    確認方向，開始配對 creator
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
                    想先同 SOON 策略團隊傾一傾
                  </button>
                  <Link
                    href={`/login?next=${encodeURIComponent(savedAnalysisHref)}`}
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
                    用 Google 登入，保存並隨時返回
                  </Link>
                </div>
              </section>
            </div>

            <aside style={{ position: 'sticky', top: '112px' }}>
              <section style={{ padding: '20px', borderRadius: '18px', background: '#f4efe5', border: '1px solid rgba(26,26,24,0.10)', boxShadow: '0 18px 60px rgba(0,0,0,0.16)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '10px' }}>CAMPAIGN FLOW</div>
                <div style={{ fontSize: '28px', lineHeight: 1.05, color: '#1a1a18', marginBottom: '16px' }}>運作流程</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {campaignFlow.map((step, index) => {
                    const current = index === 1
                    const completed = index < 1
                    return (
                      <div
                        key={step}
                        style={{
                          padding: '14px 14px',
                          borderRadius: '14px',
                          border: current ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                          background: current ? '#f7f1e1' : completed ? '#f1f5eb' : '#fbf8f1',
                          color: '#1a1a18',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{step}</div>
                          <div style={{
                            minWidth: '58px',
                            textAlign: 'center',
                            padding: '6px 8px',
                            borderRadius: '999px',
                            background: current ? '#1a1a18' : completed ? '#dbe7d0' : 'rgba(26,26,24,0.06)',
                            color: current ? '#f5efe5' : '#4f5b41',
                            fontSize: '11px',
                            letterSpacing: '0.06em',
                          }}>
                            {current ? '進行中' : completed ? '完成' : '下一步'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PaidAnalysisPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        color: '#f7f8fb',
        padding: '42px 24px 90px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
            正在載入付款結果...
          </section>
        </div>
      </main>
    }>
      <PaidAnalysisContent />
    </Suspense>
  )
}
