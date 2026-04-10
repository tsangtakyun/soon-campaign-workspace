'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  buildDeliveryConfirmationPack,
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

function DeliveryConfirmationContent() {
  const searchParams = useSearchParams()
  const campaignIntakeId = searchParams.get('campaign_intake_id')
  const [form, setForm] = useState<CampaignFormInput>(DEMO_FORM)
  const [loadingSaved, setLoadingSaved] = useState(Boolean(campaignIntakeId))
  const [deliveryConfirmationConfirmed, setDeliveryConfirmationConfirmed] = useState(false)
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [expectedDeliveryWindow, setExpectedDeliveryWindow] = useState('')
  const [expectedShootWindow, setExpectedShootWindow] = useState('')
  const [productionNotes, setProductionNotes] = useState('')
  const [whatsappContactIntent, setWhatsappContactIntent] = useState('確認後請盡快由製作主任透過 WhatsApp 跟進拍攝細節、時間與製作交接。')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredPaidAnalysisDraft | CampaignFormInput
      setForm('form' in parsed ? parsed.form : parsed)
    } catch {
      // ignore
    }
  }, [])

  const pack = useMemo(() => buildDeliveryConfirmationPack(form), [form])

  useEffect(() => {
    setExpectedDeliveryWindow((prev) => prev || pack.defaultDeliveryExpectation)
    setExpectedShootWindow((prev) => prev || pack.defaultShootWindow)
    setProductionNotes((prev) => prev || pack.defaultProductionNotes)
  }, [pack])

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
          if (workflow?.deliveryConfirmationDraft) {
            setExpectedDeliveryWindow(workflow.deliveryConfirmationDraft.expectedDeliveryWindow || pack.defaultDeliveryExpectation)
            setExpectedShootWindow(workflow.deliveryConfirmationDraft.expectedShootWindow || pack.defaultShootWindow)
            setProductionNotes(workflow.deliveryConfirmationDraft.productionNotes || pack.defaultProductionNotes)
            setWhatsappContactIntent(workflow.deliveryConfirmationDraft.whatsappContactIntent || '確認後請盡快由製作主任透過 WhatsApp 跟進拍攝細節、時間與製作交接。')
          }
          if (workflow?.deliveryConfirmationConfirmed) {
            setDeliveryConfirmationConfirmed(true)
            setConfirmMessage('製作與交付安排已確認，project 已鎖定並等待製作主任跟進。')
          }
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId, pack.defaultDeliveryExpectation, pack.defaultProductionNotes, pack.defaultShootWindow])

  const dashboardHref = campaignIntakeId ? `/my-workspace/${encodeURIComponent(campaignIntakeId)}` : '/my-workspace'
  const storyboardHref = campaignIntakeId ? `/storyboard-planning?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/storyboard-planning'
  const deliveryTrackingHref = campaignIntakeId ? `/delivery-tracking?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/delivery-tracking'

  async function confirmDelivery() {
    if (!campaignIntakeId) {
      setConfirmMessage('呢個 demo 版本未有 campaign id，未能正式確認。')
      return
    }

    setConfirmingDelivery(true)
    setConfirmMessage('')

    try {
      const response = await fetch('/api/campaign-workflow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIntakeId,
          step: 'delivery-confirmation',
          deliveryConfirmationDraft: {
            expectedDeliveryWindow,
            expectedShootWindow,
            productionNotes,
            whatsappContactIntent,
            depositStatus: '50% deposit required to lock project',
            finalPaymentRule: 'Watermarked cuts only until full payment before final release',
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '未能確認製作與交付安排')
      }

      setDeliveryConfirmationConfirmed(true)
      setConfirmMessage('製作與交付安排已確認。客戶需要支付 50% 訂金以鎖定專案，之後由製作主任透過 WhatsApp 跟進細節。')
    } catch (error: any) {
      setConfirmMessage(error.message || '未能確認製作與交付安排')
    } finally {
      setConfirmingDelivery(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', color: '#f7f8fb', padding: '42px 24px 90px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{ padding: '30px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>步驟 6</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>確認製作與交付安排</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', maxWidth: '860px' }}>
            這一步是正式鎖定專案。你先前支付的 marketing 費用，主要用於持續跟進 campaign 進展並進入下一流程；而此處的 50% 製作訂金，才是正式安排拍攝、交付帶水印版本與最終成片的製作費用。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步你呢個 campaign 嘅 delivery confirmation 資料...
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) 320px', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>DELIVERY NORTH STAR</div>
              <div style={{ fontSize: '34px', lineHeight: 1.1, marginBottom: '12px' }}>{pack.headline}</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>{pack.rationale}</div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>確認範圍</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {pack.scopeSummary.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>客戶期望</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#d7def0' }}>你預期何時收到第一輪帶水印版本</div>
                  <textarea value={expectedDeliveryWindow} onChange={(e) => setExpectedDeliveryWindow(e.target.value)} style={{ width: '100%', minHeight: '90px', resize: 'vertical', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', boxSizing: 'border-box', fontSize: '14px', lineHeight: 1.7, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#f5efe5' }} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#d7def0' }}>你預期何時安排拍攝或與製作主任確認細節</div>
                  <textarea value={expectedShootWindow} onChange={(e) => setExpectedShootWindow(e.target.value)} style={{ width: '100%', minHeight: '90px', resize: 'vertical', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', boxSizing: 'border-box', fontSize: '14px', lineHeight: 1.7, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#f5efe5' }} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#d7def0' }}>需要製作主任預先知道的拍攝、場地或產品安排</div>
                  <textarea value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} style={{ width: '100%', minHeight: '118px', resize: 'vertical', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', boxSizing: 'border-box', fontSize: '14px', lineHeight: 1.7, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#f5efe5' }} />
                </label>
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>鎖定規則</div>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                {pack.paymentRules.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
              <label style={{ display: 'grid', gap: '8px' }}>
                <div style={{ fontSize: '14px', color: '#d7def0' }}>交予製作主任透過 WhatsApp 跟進的備註</div>
                <textarea value={whatsappContactIntent} onChange={(e) => setWhatsappContactIntent(e.target.value)} style={{ width: '100%', minHeight: '96px', resize: 'vertical', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', boxSizing: 'border-box', fontSize: '14px', lineHeight: 1.7, fontFamily: 'inherit', background: 'rgba(255,94,54,0.1)', color: '#f8ddd5' }} />
              </label>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>製作交接流程</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {pack.productionSteps.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                {pack.logisticsChecklist.map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,94,54,0.1)', border: '1px solid rgba(255,121,93,0.18)', lineHeight: 1.7, color: '#f8ddd5' }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>確認之後，專案便會正式鎖定，並等待製作主任跟進。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                客戶確認此步驟後，需要支付 50% 訂金。之後你會收到帶水印版本，並可持續於工作台追蹤進度；直到出片前完成尾款，我們才會正式交付無水印最終版本。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button type="button" onClick={confirmDelivery} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: deliveryConfirmationConfirmed ? 'rgba(134,205,144,0.18)' : 'linear-gradient(135deg, #ff5d36, #ff3d2e)', color: '#ffffff', padding: '14px 18px', fontSize: '14px', border: deliveryConfirmationConfirmed ? '1px solid rgba(134,205,144,0.28)' : '1px solid rgba(255,121,93,0.26)', cursor: 'pointer' }}>
                  {confirmingDelivery ? '確認中...' : deliveryConfirmationConfirmed ? '已確認製作與交付安排' : '確認製作與交付安排'}
                </button>
                <button type="button" disabled style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'transparent', color: '#f5efe5', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.35)', opacity: 0.72 }}>
                  聯繫製作主任 WhatsApp（待接駁）
                </button>
                <Link href={deliveryTrackingHref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'transparent', color: '#f5efe5', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.35)', textDecoration: 'none' }}>
                  進入內容交付追蹤
                </Link>
                <Link href={dashboardHref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'transparent', color: '#f5efe5', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.35)', textDecoration: 'none' }}>
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
            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px' }}>流程進度</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, color: '#f7f8fb', marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: '1. 填寫品牌 brief', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適創作者', status: '完成' },
                  { label: '4. 生成題材與腳本建議', status: '完成' },
                  { label: '5. 整理拍攝方向與分鏡', status: '完成' },
                  { label: '6. 確認製作與交付安排', status: deliveryConfirmationConfirmed ? '完成' : '進行中' },
                  { label: '7. 跟進內容交付', status: deliveryConfirmationConfirmed ? '進行中' : '下一步' },
                ].map((step) => {
                  const isCurrent = step.status === '進行中'
                  const isDone = step.status === '完成'
                  return (
                    <div key={step.label} style={{ padding: '18px', borderRadius: '20px', border: isCurrent ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.08)', background: isCurrent ? 'rgba(255,94,54,0.12)' : isDone ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '16px', lineHeight: 1.55, color: '#f2f5fc' }}>{step.label}</div>
                        <div style={{ minWidth: '64px', textAlign: 'center', padding: '6px 10px', borderRadius: '999px', background: isCurrent ? '#ff5d36' : isDone ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '11px', letterSpacing: '0.06em' }}>
                          {step.status}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            <div style={{ marginTop: '14px', fontSize: '14px', color: 'rgba(214,220,236,0.78)', lineHeight: 1.7 }}>
              <Link href={storyboardHref} style={{ color: '#f5efe5' }}>返回分鏡規劃</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function DeliveryConfirmationPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', padding: '80px 24px', color: '#f7f8fb' }}>正在打開製作與交付確認頁...</main>}>
      <DeliveryConfirmationContent />
    </Suspense>
  )
}
