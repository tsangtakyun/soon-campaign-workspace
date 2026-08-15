import { NextResponse } from 'next/server'
import Stripe from 'stripe'

type CreateCheckoutPayload = {
  campaignIntakeId?: string
  email?: string
  plan?: string
  cancelPath?: string
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
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://soon-campaign-workspace.vercel.app'
    const safeCancelPath =
      typeof body.cancelPath === 'string' && body.cancelPath.startsWith('/') ? body.cancelPath : '/onboarding'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          campaign_intake_id: body.campaignIntakeId,
          plan: body.plan || 'ai-strategy',
        },
      },
      customer_email: body.email || undefined,
      success_url: `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}&campaign_intake_id=${encodeURIComponent(body.campaignIntakeId)}`,
      cancel_url: `${origin}${safeCancelPath}`,
      metadata: {
        campaign_intake_id: body.campaignIntakeId,
        plan: body.plan || 'ai-strategy',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to create checkout session' }, { status: 500 })
  }
}
