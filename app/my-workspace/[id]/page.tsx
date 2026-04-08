import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { buildCampaignProgress, buildCreatorMatches, type CampaignFormInput, type FullAnalysis } from '@/lib/analysis'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type CampaignRecord = {
  id: string
  contact_name: string
  objective: string
  business_name: string
  whatsapp: string
  email: string
  campaign_title: string
  vertical: string
  budget_range: string
  brief: string
  must_include: string
  full_analysis: FullAnalysis | null
  payment_status: string
  stripe_customer_email: string
  created_at: string
}

function objectiveLabel(objective: string) {
  if (objective === 'sales') return '轉化 / Sales'
  if (objective === 'reach') return '曝光 / Reach'
  return '品牌 / Engagement'
}

export default async function WorkspaceCampaignDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect(`/login?next=/my-workspace/${encodeURIComponent(id)}`)
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('campaign_intakes')
    .select('id, contact_name, objective, business_name, whatsapp, email, campaign_title, vertical, budget_range, brief, must_include, full_analysis, payment_status, stripe_customer_email, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const campaign = data as CampaignRecord
  const normalizedEmail = user.email.trim().toLowerCase()
  const formEmail = (campaign.email || '').trim().toLowerCase()
  const stripeEmail = (campaign.stripe_customer_email || '').trim().toLowerCase()

  if (campaign.payment_status !== 'paid' || (normalizedEmail !== formEmail && normalizedEmail !== stripeEmail)) {
    notFound()
  }

  const form: CampaignFormInput = {
    campaignIntakeId: campaign.id,
    contactName: campaign.contact_name,
    objective: campaign.objective,
    businessName: campaign.business_name,
    whatsapp: campaign.whatsapp,
    email: campaign.email,
    campaignTitle: campaign.campaign_title,
    vertical: campaign.vertical,
    budgetRange: campaign.budget_range,
    brief: campaign.brief,
    mustInclude: campaign.must_include,
  }

  const progress = buildCampaignProgress({
    paymentStatus: campaign.payment_status,
    hasFullAnalysis: Boolean(campaign.full_analysis && Object.keys(campaign.full_analysis).length),
    hasCreatorShortlist: false,
  })
  const creatorMatches = buildCreatorMatches(form)

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
          gridTemplateColumns: 'minmax(0, 1.1fr) 340px',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <section style={{ padding: '30px', borderRadius: '28px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>CAMPAIGN DASHBOARD</p>
            <h1 style={{ margin: '0 0 10px', fontSize: '50px', lineHeight: 1.02, fontWeight: 500 }}>
              {campaign.business_name || '未命名品牌'}
            </h1>
            <p style={{ margin: '0 0 14px', fontSize: '18px', lineHeight: 1.7, color: '#5b5348' }}>
              {campaign.campaign_title || 'Campaign analysis'} · {campaign.vertical} · {objectiveLabel(campaign.objective)}
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>Campaign summary</div>
                <div style={{ lineHeight: 1.7 }}>{progress.summary}</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px' }}>Latest update</div>
                <div style={{ lineHeight: 1.7 }}>{progress.latestUpdate}</div>
              </div>
            </div>
          </section>

          <section style={{ padding: '24px', borderRadius: '28px', background: '#1d1d1b', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '8px' }}>CURRENT STAGE</div>
            <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '10px' }}>{progress.currentStageLabel}</div>
            <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px' }}>
              下一步會圍繞你最 fit 嘅 creator 組合同 campaign direction，進入內容規劃。
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#c7bdaf', marginBottom: '6px' }}>NEXT ACTION</div>
              <div style={{ lineHeight: 1.7 }}>{progress.nextActionLabel}</div>
            </div>
          </section>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.04fr) 340px', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>BRIEF SNAPSHOT</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                  {campaign.brief}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                  <strong>Must include：</strong> {campaign.must_include}
                </div>
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>RECOMMENDED CREATOR DIRECTION</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {creatorMatches.slice(0, 2).map((match, index) => (
                  <div key={match.title} style={{ padding: '18px', borderRadius: '18px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: '#8b7c69', marginBottom: '4px' }}>MATCH {index + 1}</div>
                        <div style={{ fontSize: '26px', lineHeight: 1.08 }}>{match.title}</div>
                      </div>
                      <div style={{ minWidth: '78px', textAlign: 'center', padding: '8px 10px', borderRadius: '16px', background: '#f1ebde' }}>
                        <div style={{ fontSize: '11px', color: '#8b7c69' }}>FIT</div>
                        <div style={{ fontSize: '24px' }}>{match.fitScore}</div>
                      </div>
                    </div>
                    <div style={{ lineHeight: 1.7, color: '#5b5348', marginBottom: '8px' }}>{match.summary}</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#4f493f' }}>
                      <strong>Best use：</strong> {match.bestUse}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>NEXT STEP</div>
              <div style={{ fontSize: '32px', lineHeight: 1.08, marginBottom: '12px' }}>確認 creator 方向之後，就可以正式進入 script planning。</div>
              <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#e8ddcf', marginBottom: '18px' }}>
                之後你個 dashboard 會繼續更新，由 creator matching 去到題材與腳本、再到 storyboard 同交付進度。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Link
                  href={`/creator-matching?campaign_intake_id=${encodeURIComponent(campaign.id)}`}
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
                  }}
                >
                  進入 creator matching
                </Link>
                <Link
                  href={`/script-planning?campaign_intake_id=${encodeURIComponent(campaign.id)}`}
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
                  進入 script planning
                </Link>
                <Link
                  href={`/paid-analysis?campaign_intake_id=${encodeURIComponent(campaign.id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    border: '1px solid rgba(245,239,229,0.35)',
                  }}
                >
                  返回完整分析
                </Link>
              </div>
            </section>
          </div>

          <aside style={{ position: 'sticky', top: '24px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '10px' }}>CAMPAIGN FLOW</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {progress.steps.map((step) => {
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
          </aside>
        </section>
      </div>
    </main>
  )
}
