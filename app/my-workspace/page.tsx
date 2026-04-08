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
  if (objective === 'sales') return '轉化 / Sales'
  if (objective === 'reach') return '曝光 / Reach'
  return '品牌 / Engagement'
}

export default async function MyWorkspacePage() {
  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login?next=/my-workspace')
  }

  const admin = createAdminSupabase()
  const normalizedEmail = user.email.trim().toLowerCase()
  const { data: analyses } = await admin
    .from('campaign_intakes')
    .select('id, business_name, campaign_title, objective, vertical, created_at, payment_status, email, stripe_customer_email, full_analysis')
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
          hasFullAnalysis: Boolean(activeCampaign.full_analysis && Object.keys(activeCampaign.full_analysis).length),
          hasCreatorMatchingConfirmed: workflow.creatorMatchingConfirmed,
          hasScriptPlanningConfirmed: workflow.scriptPlanningConfirmed,
        })
      })()
    : null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) 360px',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <section style={{ padding: '30px', borderRadius: '28px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>CLIENT DASHBOARD</p>
            <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>你的 campaign dashboard</h1>
            <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '760px' }}>
              每次返嚟，你唔係只會見到一份分析，而係見到每個 campaign 做到邊一步、系統最新建議係咩，下一步應該點行。
            </p>
          </section>

          <section style={{ padding: '26px', borderRadius: '28px', background: '#1d1d1b', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>ACTIVE STATUS</div>
            <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '10px' }}>
              {activeProgress ? activeProgress.currentStageLabel : '等待建立第一個 campaign'}
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '16px' }}>
              {activeProgress ? activeProgress.summary : '完成第一個 brief + analysis 後，呢度會自動變成你嘅 campaign 進度總覽。'}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#c7bdaf', marginBottom: '6px' }}>ACTIVE CAMPAIGNS</div>
                <div style={{ fontSize: '32px' }}>{campaigns.length}</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#c7bdaf', marginBottom: '6px' }}>NEXT ACTION</div>
                <div style={{ lineHeight: 1.7 }}>{activeProgress ? activeProgress.nextActionLabel : '建立第一個 campaign brief'}</div>
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
                hasFullAnalysis: Boolean(item.full_analysis && Object.keys(item.full_analysis).length),
                hasCreatorMatchingConfirmed: workflow.creatorMatchingConfirmed,
                hasScriptPlanningConfirmed: workflow.scriptPlanningConfirmed,
              })

              return (
                <section
                  key={item.id}
                  style={{
                    padding: '24px',
                    borderRadius: '26px',
                    background: 'rgba(255,255,255,0.78)',
                    border: '1px solid rgba(26,26,24,0.10)',
                    boxShadow: '0 20px 50px rgba(26,26,24,0.05)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) 330px', gap: '18px', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: '#8b7c69' }}>
                          {new Date(item.created_at).toLocaleDateString('zh-HK')}
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: '999px', background: '#eef5e8', color: '#3d5b35', fontSize: '11px', letterSpacing: '0.06em' }}>
                          已付費解鎖
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: '999px', background: '#f2ecdf', color: '#665f54', fontSize: '11px', letterSpacing: '0.06em' }}>
                          {objectiveLabel(item.objective)}
                        </div>
                      </div>

                      <div style={{ fontSize: '34px', lineHeight: 1.06, marginBottom: '8px' }}>
                        {item.business_name || '未命名品牌'}
                      </div>
                      <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#5b5348', marginBottom: '14px' }}>
                        {item.campaign_title || 'Campaign analysis'} · {item.vertical} · {progress.currentStageLabel}
                      </div>

                      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                          <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>最新更新</div>
                          <div style={{ lineHeight: 1.7 }}>{progress.latestUpdate}</div>
                        </div>
                        <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                          <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>下一步</div>
                          <div style={{ lineHeight: 1.7 }}>{progress.nextActionLabel}</div>
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
                            background: '#1a1a18',
                            color: '#f5efe5',
                            padding: '12px 18px',
                            textDecoration: 'none',
                            fontSize: '14px',
                          }}
                        >
                          查看 campaign dashboard
                        </Link>
                        <Link
                          href={`/paid-analysis?campaign_intake_id=${encodeURIComponent(item.id)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '999px',
                            background: '#fff',
                            color: '#1a1a18',
                            padding: '12px 18px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            border: '1px solid rgba(26,26,24,0.12)',
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
                              border: isCurrent ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                              background: isCurrent ? '#f7f1e1' : isDone ? '#f1f5eb' : '#fbf8f1',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ fontSize: '15px', lineHeight: 1.55 }}>{step.label}</div>
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
                    </aside>
                  </div>
                </section>
              )
            })}
          </section>
        ) : (
          <section style={{ padding: '24px', borderRadius: '24px', background: '#fbf2df', border: '1px solid rgba(26,26,24,0.10)', color: '#5a5349' }}>
            你而家仲未有已保存嘅 campaign。完成第一次付款後，第一個 campaign dashboard 會自動出現喺呢度。
          </section>
        )}
      </div>
    </main>
  )
}
