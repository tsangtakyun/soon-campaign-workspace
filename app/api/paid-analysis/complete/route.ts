import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

import { buildFullAnalysis, type CampaignFormInput } from '@/lib/analysis'

type CompletePayload = {
  sessionId?: string
  campaignIntakeId?: string
  form?: CampaignFormInput
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

  if (!body.form) {
    return NextResponse.json({ error: 'Missing form payload' }, { status: 400 })
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

    const analysis = buildFullAnalysis(body.form)

    if (body.campaignIntakeId) {
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
        .eq('id', body.campaignIntakeId)

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: session.payment_status,
      analysis,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to complete paid analysis sync' }, { status: 500 })
  }
}
