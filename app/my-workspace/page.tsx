import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { buildCampaignProgress, extractWorkflowState } from '@/lib/analysis'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type WorkspaceCampaign = {
  id: string
  business_name: string
  campaign_title: string
  objective: string
  vertical: string
  created_at: string
  payment_status: string
  email: string
  stripe_customer_email: string
  full_analysis: Record<string, unknown> | null
}

function objectiveLabel(objective: string) {
  if (objective === 'sales') return '轉換導向'
  if (objective === 'reach') return '曝光導向'
  return '品牌導向'
}

const shellStyle = {
  minHeight: '100vh',
  padding: '40px 24px 100px',
  color: '#f7f8fb',
} as const

const containerStyle = {
  maxWidth: '1180px',
  margin: '0 auto',
  display: 'grid',
  gap: '20px',
} as const

const cardStyle = {
  borderRadius: '30px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 80px rgba(0,0,0,0.36)',
} as const

const eyebrowStyle = {
  fontSize: '12px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'rgba(162,178,214,0.8)',
  marginBottom: '10px',
} as const

export default async function MyWorkspacePage() {
  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login?next=/my-workspace')
  }

  const admin = createAdminSupabase()
  const normalizedEmail = user.email.trim().toLowerCase()
  const { data: analyses } = await admin
    .from('campaign_intakes')
    .select(
      'id, business_name, campaign_title, objective, vertical, created_at, payment_status, email, stripe_customer_email, full_analysis'
    )
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const campaigns = ((analyses || []) as WorkspaceCampaign[]).filter((item) => {
    const formEmail = (item.email || '').trim().toLowerCase()
    const stripeEmail = (item.stripe_customer_email || '').trim().toLowerCase()
    return formEmail === normalizedEmail || stripeEmail === normalizedEmail
  })

  const activeCampaign = campaigns[0]
  const activeProgress = activeCampaign
    ? (() => {
        const workflow = extractWorkflowState(activeCampaign.full_analysis)
        return buildCampaignProgress({
          paymentStatus: activeCampaign.payment_status,
          hasFullAnalysis: Boolean(
            activeCampaign.full_analysis &&
              Object.keys(activeCampaign.full_analysis).length
          ),
          hasCreatorMatchingConfirmed: workflow.creatorMatchingConfirmed,
          hasScriptPlanningConfirmed: workflow.scriptPlanningConfirmed,
          hasStoryboardPlanningConfirmed: workflow.storyboardPlanningConfirmed,
          hasDeliveryConfirmationConfirmed: workflow.deliveryConfirmationConfirmed,
        })
      })()
    : null

  return (
    <main style={shellStyle}>
      <div style={containerStyle}>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) 360px',
            gap: '20px',
            alignItems: 'stretch',
          }}
        >
          <section style={{ ...cardStyle, padding: '30px' }}>
            <div style={eyebrowStyle}>品牌工作台</div>
            <h1
              style={{
                margin: '0 0 12px',
                fontSize: 'clamp(2.6rem, 5vw, 4.4rem)',
                lineHeight: 0.98,
                letterSpacing: '-0.07em',
                fontWeight: 350,
              }}
            >
              你的廣告工作台
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '18px',
                lineHeight: 1.8,
                color: 'rgba(210,217,234,0.8)',
                maxWidth: '760px',
              }}
            >
              每次返回這裡，你看到的不只是單一分析，而是每個專案目前進行到哪一步、最新建議為何，以及下一步應如何推進。
            </p>
          </section>

          <section style={{ ...cardStyle, padding: '26px' }}>
            <div style={eyebrowStyle}>目前狀態</div>
            <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '10px', fontWeight: 350 }}>
              {activeProgress ? activeProgress.currentStageLabel : '等待建立第一個廣告專案'}
            </div>
            <div
              style={{
                fontSize: '16px',
                lineHeight: 1.8,
                color: 'rgba(226,230,242,0.78)',
                marginBottom: '16px',
              }}
            >
              {activeProgress
                ? activeProgress.summary
                : '完成第一份需求與分析後，這裡便會自動成為你的專案進度總覽。'}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>進行中專案</div>
                <div style={{ fontSize: '32px' }}>{campaigns.length}</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>下一步行動</div>
                <div style={{ lineHeight: 1.7 }}>
                  {activeProgress ? activeProgress.nextActionLabel : '建立第一份廣告需求'}
                </div>
              </div>
            </div>
          </section>
        </section>

        {campaigns.length ? (
          <section style={{ display: 'grid', gap: '16px' }}>
            {campaigns.map((item) => {
              const workflow = extractWorkflowState(item.full_analysis)
              const progress = buildCampaignProgress({
                paymentStatus: item.payment_status,
                hasFullAnalysis: Boolean(
                  item.full_analysis && Object.keys(item.full_analysis).length
                ),
                hasCreatorMatchingConfirmed: workflow.creatorMatchingConfirmed,
                hasScriptPlanningConfirmed: workflow.scriptPlanningConfirmed,
                hasStoryboardPlanningConfirmed: workflow.storyboardPlanningConfirmed,
                hasDeliveryConfirmationConfirmed:
                  workflow.deliveryConfirmationConfirmed,
              })

              return (
                <section key={item.id} style={{ ...cardStyle, padding: '24px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.1fr) 330px',
                      gap: '18px',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          alignItems: 'center',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(162,178,214,0.8)' }}>
                          {new Date(item.created_at).toLocaleDateString('zh-HK')}
                        </div>
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            background: 'rgba(255,94,54,0.14)',
                            color: '#ffd9cf',
                            fontSize: '11px',
                            letterSpacing: '0.06em',
                          }}
                        >
                          已完成付款
                        </div>
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#d7dded',
                            fontSize: '11px',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {objectiveLabel(item.objective)}
                        </div>
                      </div>

                      <div style={{ fontSize: '34px', lineHeight: 1.06, marginBottom: '8px', fontWeight: 350 }}>
                        {item.business_name || '未命名品牌'}
                      </div>
                      <div style={{ fontSize: '17px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', marginBottom: '14px' }}>
                        {item.campaign_title || '廣告分析'} · {item.vertical} · {progress.currentStageLabel}
                      </div>

                      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>最新更新</div>
                          <div style={{ lineHeight: 1.75 }}>{progress.latestUpdate}</div>
                        </div>
                        <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>下一步</div>
                          <div style={{ lineHeight: 1.75 }}>{progress.nextActionLabel}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <Link
                          href={`/my-workspace/${encodeURIComponent(item.id)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '999px',
                            background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                            color: '#ffffff',
                            padding: '12px 18px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            border: '1px solid rgba(255,121,93,0.24)',
                          }}
                        >
                          查看專案工作台
                        </Link>
                        <Link
                          href={`/paid-analysis?campaign_intake_id=${encodeURIComponent(item.id)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#f4f7ff',
                            padding: '12px 18px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          查看完整分析
                        </Link>
                      </div>
                    </div>

                    <aside style={{ display: 'grid', gap: '10px' }}>
                      {progress.steps.map((step) => {
                        const isCurrent = step.status === '進行中'
                        const isDone = step.status === '完成'

                        return (
                          <div
                            key={step.label}
                            style={{
                              padding: '16px',
                              borderRadius: '18px',
                              border: isCurrent
                                ? '1px solid rgba(255,121,93,0.26)'
                                : '1px solid rgba(255,255,255,0.08)',
                              background: isCurrent
                                ? 'rgba(255,94,54,0.12)'
                                : isDone
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(255,255,255,0.03)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
                              <div style={{ fontSize: '15px', lineHeight: 1.55 }}>
                                {step.label}
                              </div>
                              <div
                                style={{
                                  minWidth: '64px',
                                  textAlign: 'center',
                                  padding: '6px 10px',
                                  borderRadius: '999px',
                                  background: isCurrent
                                    ? '#ff5d36'
                                    : isDone
                                      ? 'rgba(255,255,255,0.12)'
                                      : 'rgba(255,255,255,0.06)',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {step.status}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </aside>
                  </div>
                </section>
              )
            })}
          </section>
        ) : (
          <section
            style={{
              ...cardStyle,
              padding: '24px',
              color: 'rgba(210,217,234,0.8)',
              lineHeight: 1.8,
            }}
          >
            目前尚未有已保存的專案。完成第一次付款後，第一個專案工作台便會自動出現在這裡。
          </section>
        )}
      </div>
    </main>
  )
}
