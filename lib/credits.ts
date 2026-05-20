import { createAdminSupabase } from '@/lib/server-supabase'

export const CREDIT_COSTS = {
  'still-images': 6,
  carousels: 24,
  'feed-videos': 40,
  'short-form-video': 40,
  stories: 6,
  emails: 8,
} as const

export const PHOTO_GENERATION_CREDIT_COST = CREDIT_COSTS['still-images']

export type UserCredits = {
  balance: number
  total_earned: number
  total_spent: number
}

export type PlanType = 'trial' | 'strategy-workspace' | 'managed-service'

const PLAN_CREDIT_ALLOWANCES: Record<PlanType, number> = {
  trial: 200,
  'strategy-workspace': 800,
  'managed-service': 2000,
}

export async function grantTrialCredits(userId: string) {
  if (!userId) return null
  const supabase = createAdminSupabase()

  const { data: existing, error: existingError } = await supabase
    .from('user_credits')
    .select('balance,total_earned,total_spent')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing

  const { data, error } = await supabase
    .from('user_credits')
    .insert({
      user_id: userId,
      balance: 200,
      total_earned: 200,
    })
    .select('balance,total_earned,total_spent')
    .single()

  if (error) throw error

  await Promise.all([
    supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: 200,
      type: 'bonus',
      description: '7日試用積分',
    }),
    supabase.from('user_plans').upsert({
      user_id: userId,
      plan_type: 'trial',
      monthly_credit_allowance: PLAN_CREDIT_ALLOWANCES.trial,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
  ])

  return data
}

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  if (!userId) return null
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance,total_earned,total_spent')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function spendCredits(
  userId: string,
  amount: number,
  description: string,
  contentType?: string,
  campaignId?: string,
) {
  if (!userId) throw new Error('UNAUTHORIZED')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_CREDIT_AMOUNT')

  const supabase = createAdminSupabase()
  const { data: credits, error: creditsError } = await supabase
    .from('user_credits')
    .select('balance,total_spent')
    .eq('user_id', userId)
    .single()

  if (creditsError || !credits) throw new Error('INSUFFICIENT_CREDITS')
  if (credits.balance < amount) throw new Error('INSUFFICIENT_CREDITS')

  const nextBalance = credits.balance - amount
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      balance: nextBalance,
      total_spent: (credits.total_spent || 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) throw updateError

  const { error: transactionError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'spent',
    description,
    content_type: contentType,
    campaign_id: campaignId,
  })

  if (transactionError) throw transactionError
  return nextBalance
}

export async function grantPlanCredits(userId: string, planType: Exclude<PlanType, 'trial'>) {
  if (!userId) return null
  const allowance = PLAN_CREDIT_ALLOWANCES[planType]
  const supabase = createAdminSupabase()
  const current = await getUserCredits(userId)

  const nextBalance = (current?.balance || 0) + allowance
  const nextEarned = (current?.total_earned || 0) + allowance
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance: nextBalance,
      total_earned: nextEarned,
      total_spent: current?.total_spent || 0,
      updated_at: now,
    }, { onConflict: 'user_id' })
    .select('balance,total_earned,total_spent')
    .single()

  if (error) throw error

  await Promise.all([
    supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: allowance,
      type: 'earned',
      description: planType === 'strategy-workspace'
        ? '內容策略工作台每月積分'
        : 'SOON 代營運每月積分',
    }),
    supabase.from('user_plans').upsert({
      user_id: userId,
      plan_type: planType,
      monthly_credit_allowance: allowance,
      status: 'active',
      current_period_start: now,
      updated_at: now,
    }, { onConflict: 'user_id' }),
  ])

  return data
}
