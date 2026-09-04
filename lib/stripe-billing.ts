import Stripe from 'stripe'

export const STRATEGY_WORKSPACE_CREDITS = 800

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(secretKey)
}

export function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id || ''
}

export function stripeTimestamp(value: number | null | undefined) {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : null
}
