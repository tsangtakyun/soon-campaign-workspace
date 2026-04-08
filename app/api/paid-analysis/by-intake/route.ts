import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { extractWorkflowState } from '@/lib/analysis'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const campaignIntakeId = requestUrl.searchParams.get('campaign_intake_id')

  if (!campaignIntakeId) {
    return NextResponse.json({ error: 'Missing campaign_intake_id' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Please sign in to access your saved analysis' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  const admin = createAdminSupabase()
  const normalizedEmail = user.email.trim().toLowerCase()
  const { data, error } = await admin
    .from('campaign_intakes')
    .select('id, contact_name, objective, business_name, whatsapp, email, campaign_title, vertical, budget_range, brief, must_include, full_analysis, payment_status, stripe_customer_email')
    .eq('id', campaignIntakeId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Unable to load saved analysis' }, { status: 500 })
  }

  const recordEmail = (data?.email || '').trim().toLowerCase()
  const stripeCustomerEmail = (data?.stripe_customer_email || '').trim().toLowerCase()
  const emailMatches = recordEmail === normalizedEmail || stripeCustomerEmail === normalizedEmail

  if (!data || data.payment_status !== 'paid' || !emailMatches) {
    return NextResponse.json({ error: 'No saved paid analysis found for this account' }, { status: 404 })
  }

  return NextResponse.json({
    form: {
      campaignIntakeId: data.id,
      contactName: data.contact_name,
      objective: data.objective,
      businessName: data.business_name,
      whatsapp: data.whatsapp,
      email: data.email,
      campaignTitle: data.campaign_title,
      vertical: data.vertical,
      budgetRange: data.budget_range,
      brief: data.brief,
      mustInclude: data.must_include,
    },
    analysis: data.full_analysis,
    workflow: extractWorkflowState(data.full_analysis as Record<string, unknown>),
  })
}
