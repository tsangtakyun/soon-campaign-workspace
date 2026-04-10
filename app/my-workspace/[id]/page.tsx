import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { buildCampaignProgress, buildCreatorMatches, extractWorkflowState, type CampaignFormInput, type FullAnalysis } from '@/lib/analysis'
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
  if (objective === 'sales') return '轉換導向'
  if (objective === 'reach') return '曝光導向'
  return '品牌導向'
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

  const workflow = extractWorkflowState(campaign.full_analysis)
  const progress = buildCampaignProgress({
    paymentStatus: campaign.payment_status,
    hasFullAnalysis: Boolean(campaign.full_analysis && Object.keys(campaign.full_analysis).length),
    hasCreatorMatchingConfirmed: workflow.creatorMatchingConfirmed,
    hasScriptPlanningConfirmed: workflow.scriptPlanningConfirmed,
    hasStoryboardPlanningConfirmed: workflow.storyboardPlanningConfirmed,
    hasDeliveryConfirmationConfirmed: workflow.deliveryConfirmationConfirmed,
  })
  const creatorMatches = buildCreatorMatches(form)
  const storyboardHref = `/storyboard-planning?campaign_intake_id=${encodeURIComponent(campaign.id)}`
  const deliveryConfirmationHref = `/delivery-confirmation?campaign_intake_id=${encodeURIComponent(campaign.id)}`
  const deliveryTrackingHref = `/delivery-tracking?campaign_intake_id=${encodeURIComponent(campaign.id)}`

  return (
    <main style={{
      minHeight: '100vh',
      color: '#f7f8fb',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) 340px',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <section style={{ padding: '30px', borderRadius: '30px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(162,178,214,0.8)' }}>專案工作台</p>
            <h1 style={{ margin: '0 0 10px', fontSize: '50px', lineHeight: 1.02, fontWeight: 350 }}>
              {campaign.business_name || '未命名品牌'}
            </h1>
            <p style={{ margin: '0 0 14px', fontSize: '18px', lineHeight: 1.8, color: 'rgba(210,217,234,0.8)' }}>
              {campaign.campaign_title || '廣告分析'} · {campaign.vertical} · {objectiveLabel(campaign.objective)}
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>專案摘要</div>
                <div style={{ lineHeight: 1.7 }}>{progress.summary}</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>最新更新</div>
                <div style={{ lineHeight: 1.7 }}>{progress.latestUpdate}</div>
              </div>
            </div>
          </section>

          <section style={{ padding: '24px', borderRadius: '30px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', color: '#f5efe5', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>目前階段</div>
            <div style={{ fontSize: '34px', lineHeight: 1.08, marginBottom: '10px' }}>{progress.currentStageLabel}</div>
            <div style={{ fontSize: '16px', lineHeight: 1.8, color: 'rgba(226,230,242,0.8)', marginBottom: '18px' }}>
              {workflow.deliveryConfirmationConfirmed
                ? '製作與交付安排已確認，下一步將由製作負責人跟進拍攝與交付流程。'
                : workflow.scriptPlanningConfirmed
                ? '你已確認腳本規劃，下一步可以進入分鏡與拍攝方向整理。'
                : workflow.creatorMatchingConfirmed
                  ? '創作者配對已確認，下一步會圍繞已選創作者組合與專案方向進入內容規劃。'
                  : '下一步會圍繞最合適的創作者組合與專案方向進入內容規劃。'}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(162,178,214,0.8)', marginBottom: '6px' }}>下一步</div>
              <div style={{ lineHeight: 1.7 }}>{progress.nextActionLabel}</div>
            </div>
          </section>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.04fr) 340px', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>需求摘要</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.8 }}>
                  {campaign.brief}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.8 }}>
                  <strong>必須包含：</strong> {campaign.must_include}
                </div>
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>建議創作者方向</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {creatorMatches.slice(0, 2).map((match, index) => (
                  <div key={match.title} style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(162,178,214,0.8)', marginBottom: '4px' }}>配對 {index + 1}</div>
                        <div style={{ fontSize: '26px', lineHeight: 1.08 }}>{match.title}</div>
                      </div>
                      <div style={{ minWidth: '78px', textAlign: 'center', padding: '8px 10px', borderRadius: '16px', background: 'rgba(255,94,54,0.12)' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,210,198,0.82)' }}>適配度</div>
                        <div style={{ fontSize: '24px' }}>{match.fitScore}</div>
                      </div>
                    </div>
                    <div style={{ lineHeight: 1.8, color: 'rgba(210,217,234,0.8)', marginBottom: '8px' }}>{match.summary}</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#dce2f3' }}>
                      <strong>最佳用途：</strong> {match.bestUse}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#dce2f3', marginTop: '6px' }}>
                      <strong>報價：</strong> {match.reelRate} · <strong>SOON 佣金：</strong> {match.soonCommissionRate} ({match.soonCommissionAmount})
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {workflow.selectedCreatorTitle && (
              <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '8px' }}>已確認方向</div>
                <div style={{ lineHeight: 1.8, color: 'rgba(210,217,234,0.8)' }}>
                  已確認創作者類型：<strong>{workflow.selectedCreatorTitle}</strong>
                  {workflow.deliveryConfirmationConfirmed
                    ? '，製作與交付安排亦已確認。'
                    : workflow.scriptPlanningConfirmed
                      ? '，腳本規劃亦已完成確認。'
                      : '，等待進入並確認腳本規劃。'}
                </div>
              </section>
            )}

            <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', color: '#f5efe5', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px' }}>下一步</div>
              <div style={{ fontSize: '32px', lineHeight: 1.08, marginBottom: '12px' }}>確認分鏡之後，客戶仍需正式確認製作與交付安排。</div>
              <div style={{ fontSize: '16px', lineHeight: 1.8, color: 'rgba(226,230,242,0.8)', marginBottom: '18px' }}>
                之後工作台會持續更新，由創作者配對、題材與腳本、分鏡規劃，到 50% 訂金鎖定專案與內容交付進度。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Link
                  href={`/creator-matching?campaign_intake_id=${encodeURIComponent(campaign.id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
                    color: '#ffffff',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  進入創作者配對
                </Link>
                <Link
                  href={`/script-planning?campaign_intake_id=${encodeURIComponent(campaign.id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  進入腳本規劃
                </Link>
                <Link
                  href={storyboardHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  進入分鏡規劃
                </Link>
                <Link
                  href={deliveryConfirmationHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  確認製作與交付安排
                </Link>
                <Link
                  href={deliveryTrackingHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5efe5',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  進入內容交付追蹤
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
            <section style={{ padding: '24px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(162,178,214,0.8)', marginBottom: '10px' }}>流程進度</div>
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
                        border: isCurrent ? '1px solid rgba(255,121,93,0.26)' : '1px solid rgba(255,255,255,0.08)',
                        background: isCurrent ? 'rgba(255,94,54,0.12)' : isDone ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '16px', lineHeight: 1.55 }}>{step.label}</div>
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
          </aside>
        </section>
      </div>
    </main>
  )
}
