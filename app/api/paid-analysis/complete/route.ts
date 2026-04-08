import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

import { buildFullAnalysis, type CampaignFormInput } from '@/lib/analysis'

type CompletePayload = {
  sessionId?: string
  campaignIntakeId?: string
  form?: CampaignFormInput
}

type CampaignIntakeRow = {
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
}

function toCampaignForm(row: CampaignIntakeRow): CampaignFormInput {
  return {
    campaignIntakeId: row.id,
    contactName: row.contact_name,
    objective: row.objective,
    businessName: row.business_name,
    whatsapp: row.whatsapp,
    email: row.email,
    campaignTitle: row.campaign_title,
    vertical: row.vertical,
    budgetRange: row.budget_range,
    brief: row.brief,
    mustInclude: row.must_include,
  }
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  let body: CompletePayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(body.sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed yet' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let resolvedForm = body.form || null
    let resolvedCampaignIntakeId = body.campaignIntakeId || ''

    if (!resolvedForm) {
      const customerEmail = session.customer_details?.email || session.customer_email || ''

      if (!customerEmail) {
        return NextResponse.json({ error: 'Missing form payload and customer email lookup failed' }, { status: 400 })
      }

      const { data: intake, error: intakeError } = await supabase
        .from('campaign_intakes')
        .select('id, contact_name, objective, business_name, whatsapp, email, campaign_title, vertical, budget_range, brief, must_include')
        .eq('email', customerEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<CampaignIntakeRow>()

      if (intakeError) throw intakeError
      if (!intake) {
        return NextResponse.json({ error: 'Unable to find the matching campaign brief for this payment' }, { status: 404 })
      }

      resolvedForm = toCampaignForm(intake)
      resolvedCampaignIntakeId = intake.id
    }

    const analysis = buildFullAnalysis(resolvedForm)

    if (resolvedCampaignIntakeId) {
      const { error } = await supabase
        .from('campaign_intakes')
        .update({
          payment_status: 'paid',
          payment_session_id: session.id,
          stripe_customer_email: session.customer_details?.email || '',
          stripe_payment_mode: session.mode || '',
          paid_at: new Date().toISOString(),
          full_analysis: analysis,
        })
        .eq('id', resolvedCampaignIntakeId)

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: session.payment_status,
      campaignIntakeId: resolvedCampaignIntakeId,
      form: resolvedForm,
      analysis,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to complete paid analysis sync' }, { status: 500 })
  }
}
