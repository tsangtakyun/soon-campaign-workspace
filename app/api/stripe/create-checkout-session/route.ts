import { NextResponse } from 'next/server'
import Stripe from 'stripe'

type CreateCheckoutPayload = {
  campaignIntakeId?: string
  email?: string
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID not configured' }, { status: 500 })
  }

  let body: CreateCheckoutPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.campaignIntakeId) {
    return NextResponse.json({ error: 'Missing campaignIntakeId' }, { status: 400 })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://soon-campaign-workspace.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      success_url: `${origin}/paid-analysis?session_id={CHECKOUT_SESSION_ID}&campaign_intake_id=${encodeURIComponent(body.campaignIntakeId)}`,
      cancel_url: `${origin}/submit-brief`,
      metadata: {
        campaign_intake_id: body.campaignIntakeId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to create checkout session' }, { status: 500 })
  }
}
