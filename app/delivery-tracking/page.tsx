'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
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

function DeliveryTrackingContent() {
  const searchParams = useSearchParams()
  const campaignIntakeId = searchParams.get('campaign_intake_id')
  const [form, setForm] = useState<CampaignFormInput>(DEMO_FORM)
  const [loadingSaved, setLoadingSaved] = useState(Boolean(campaignIntakeId))
  const [deliveryDraft, setDeliveryDraft] = useState({
    expectedDeliveryWindow: '',
    expectedShootWindow: '',
    productionNotes: '',
    whatsappContactIntent: '',
    depositStatus: '',
    finalPaymentRule: '',
  })

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
            setDeliveryDraft({
              expectedDeliveryWindow: workflow.deliveryConfirmationDraft.expectedDeliveryWindow || '',
              expectedShootWindow: workflow.deliveryConfirmationDraft.expectedShootWindow || '',
              productionNotes: workflow.deliveryConfirmationDraft.productionNotes || '',
              whatsappContactIntent: workflow.deliveryConfirmationDraft.whatsappContactIntent || '',
              depositStatus: workflow.deliveryConfirmationDraft.depositStatus || '50% production deposit 已確認，project 已鎖定。',
              finalPaymentRule: workflow.deliveryConfirmationDraft.finalPaymentRule || '出片前完成 full payment，先正式交付無水印 final version。',
            })
          }
        }
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedCampaign()
  }, [campaignIntakeId])

  const dashboardHref = '/onboarding'
  const deliveryConfirmationHref = campaignIntakeId ? `/delivery-confirmation?campaign_intake_id=${encodeURIComponent(campaignIntakeId)}` : '/delivery-confirmation'

  const progressCards = useMemo(() => ([
    {
      title: '專案鎖定',
      status: '已鎖定',
      description: deliveryDraft.depositStatus || '50% production deposit 已確認，project 已鎖定。',
    },
    {
      title: '製作主任跟進',
      status: '下一步',
      description: deliveryDraft.whatsappContactIntent || '確認後請盡快由製作主任透過 WhatsApp 跟進拍攝細節、時間與製作交接。',
    },
    {
      title: '拍攝安排',
      status: '等待確認',
      description: deliveryDraft.expectedShootWindow || '等待客戶同製作主任確認 shooting window。',
    },
    {
      title: '帶水印版本',
      status: '未開始',
      description: deliveryDraft.expectedDeliveryWindow || '等待正式製作開始後安排第一輪帶水印版本。',
    },
    {
      title: '尾款付款',
      status: '未完成',
      description: deliveryDraft.finalPaymentRule || '出片前完成 full payment，先正式交付無水印 final version。',
    },
    {
      title: '最終交付',
      status: '等待交付',
      description: '完成尾數後，SOON 會正式交付 final master。',
    },
  ]), [deliveryDraft])

  return (
    <main style={{ minHeight: '100vh', color: '#f7f8fb', padding: '42px 24px 90px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{ padding: '30px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>步驟 7</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>跟進內容交付</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', maxWidth: '860px' }}>
            這一頁是客戶之後持續回來查看進度的地方。Marketing 訂閱費用主要用於持續追蹤 campaign、帶水印版本與製作交接；而實際製作部分，則會由製作主任按已確認安排跟進至最終交付。
          </p>
        </section>

        {loadingSaved && (
          <section style={{ padding: '20px 22px', borderRadius: '22px', background: '#eef6ea', border: '1px solid rgba(26,26,24,0.10)', color: '#314b2d' }}>
            正在同步你呢個 campaign 嘅 delivery tracking 資料...
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) 320px', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>DELIVERY STATUS</div>
              <div style={{ fontSize: '34px', lineHeight: 1.1, marginBottom: '12px' }}>{form.businessName || '你的品牌'} 已進入交付跟進階段</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>
                Project 已鎖定，之後會由製作主任跟進拍攝細節、出第一輪帶水印 cut，同埋一路更新交付狀態，直到 full payment 後正式交無水印 final version。
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {progressCards.map((card) => (
                <section key={card.title} style={{ padding: '22px', borderRadius: '22px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '24px', lineHeight: 1.1 }}>{card.title}</div>
                    <div style={{ minWidth: '78px', textAlign: 'center', padding: '7px 10px', borderRadius: '999px', background: card.status === '已鎖定' ? 'rgba(134,205,144,0.18)' : card.status === '下一步' ? 'rgba(255,94,54,0.12)' : 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '11px', letterSpacing: '0.06em' }}>
                      {card.status}
                    </div>
                  </div>
                  <div style={{ lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>{card.description}</div>
                </section>
              ))}
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>目前期望</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                  <strong>預期拍攝 / 對細節時間：</strong> {deliveryDraft.expectedShootWindow || '待確認'}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7, color: 'rgba(226,230,242,0.82)' }}>
                  <strong>預期第一輪帶水印版本：</strong> {deliveryDraft.expectedDeliveryWindow || '待確認'}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,94,54,0.1)', border: '1px solid rgba(255,121,93,0.18)', lineHeight: 1.7, color: '#f8ddd5' }}>
                  <strong>製作備註：</strong> {deliveryDraft.productionNotes || '暫未填寫'}
                </div>
              </div>
            </section>

            <section style={{ padding: '26px', borderRadius: '24px', background: '#1a1a18', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '12px' }}>之後你會持續在此查看製作進度、帶水印版本與尾款狀態。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px', maxWidth: '780px' }}>
                如之後需要調整拍攝安排、更新預期交期，或重新查看製作交接內容，都可以隨時返回上一頁調整。待你準備好正式 WhatsApp 號碼後，我可以再幫你接上製作主任聯絡按鈕。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button type="button" disabled style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: '#f5efe5', color: '#1a1a18', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.4)', opacity: 0.72 }}>
                  聯繫製作主任 WhatsApp（待接駁）
                </button>
                <Link href={deliveryConfirmationHref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'transparent', color: '#f5efe5', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.35)', textDecoration: 'none' }}>
                  返回製作與交付安排確認
                </Link>
                <Link href={dashboardHref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'transparent', color: '#f5efe5', padding: '14px 18px', fontSize: '14px', border: '1px solid rgba(245,239,229,0.35)', textDecoration: 'none' }}>
                  返回專案工作台
                </Link>
              </div>
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
                  { label: '6. 確認製作與交付安排', status: '完成' },
                  { label: '7. 跟進內容交付', status: '進行中' },
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
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function DeliveryTrackingPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', padding: '80px 24px', color: '#f7f8fb' }}>正在打開內容交付追蹤頁...</main>}>
      <DeliveryTrackingContent />
    </Suspense>
  )
}
