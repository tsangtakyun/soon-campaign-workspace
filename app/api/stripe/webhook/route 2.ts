import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { createAdminSupabase } from '@/lib/server-supabase'
import {
  getStripe,
  STRATEGY_WORKSPACE_CREDITS,
  stripeId,
  stripeTimestamp,
} from '@/lib/stripe-billing'

export const runtime = 'nodejs'

type SubscriptionLike = Stripe.Subscription & {
  current_period_start?: number
  current_period_end?: number
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch (error) {
    console.warn('[stripe/webhook] invalid signature', {
      error: error instanceof Error ? error.message : 'Unknown signature error',
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const handled = await handleStripeEvent(event)
    return NextResponse.json({ received: true, handled })
  } catch (error) {
    console.error('[stripe/webhook] processing failed', {
      error: error instanceof Error ? error.message : 'Unknown processing error',
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const subscriptionId = stripeId(session.subscription)
    if (!subscriptionId) return recordIgnored(event)
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as SubscriptionLike
    return applySubscriptionEvent(event, subscription, `checkout:${session.id}`, true)
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    const invoiceWithParent = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
      parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } } | null
    }
    const subscriptionId = stripeId(
      invoiceWithParent.parent?.subscription_details?.subscription || invoiceWithParent.subscription,
    )
    if (!subscriptionId) return recordIgnored(event)
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as SubscriptionLike
    return applySubscriptionEvent(event, subscription, `invoice:${invoice.id}`, true)
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    return applySubscriptionEvent(event, event.data.object as SubscriptionLike, null, false)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const invoiceWithParent = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
      parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } } | null
    }
    const subscriptionId = stripeId(
      invoiceWithParent.parent?.subscription_details?.subscription || invoiceWithParent.subscription,
    )
    if (!subscriptionId) return recordIgnored(event)
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as SubscriptionLike
    return applySubscriptionEvent(event, subscription, null, false, 'past_due')
  }

  return false
}

async function applySubscriptionEvent(
  event: Stripe.Event,
  subscription: SubscriptionLike,
  creditReference: string | null,
  mayGrantCredits: boolean,
  forcedStatus?: string,
) {
  const metadataUserId = subscription.metadata?.soon_user_id || ''
  const userId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(metadataUserId)
    ? metadataUserId
    : null
  const planType = subscription.metadata?.soon_plan_type === 'managed-service'
    ? 'managed-service'
    : 'strategy-workspace'
  const status = forcedStatus || subscription.status
  const canGrant = mayGrantCredits && ['active', 'trialing'].includes(status) && Boolean(userId)
  const periodStart = stripeTimestamp(subscription.current_period_start)
  const periodReference = periodStart
    ? `subscription-period:${subscription.id}:${periodStart}`
    : creditReference
  const admin = createAdminSupabase()
  const { data, error } = await admin.rpc('apply_stripe_subscription_event', {
    p_credit_allowance: canGrant ? STRATEGY_WORKSPACE_CREDITS : 0,
    p_credit_reference: canGrant ? periodReference : null,
    p_customer_id: stripeId(subscription.customer),
    p_event_id: event.id,
    p_event_type: event.type,
    p_period_end: stripeTimestamp(subscription.current_period_end),
    p_period_start: periodStart,
    p_plan_type: planType,
    p_status: status,
    p_subscription_id: subscription.id,
    p_user_id: userId,
  })
  if (error) throw error
  return data
}

async function recordIgnored(event: Stripe.Event) {
  const admin = createAdminSupabase()
  const { error } = await admin.from('stripe_webhook_events').upsert({
    event_id: event.id,
    event_type: event.type,
    status: 'ignored',
  }, { onConflict: 'event_id', ignoreDuplicates: true })
  if (error) throw error
  return false
}
