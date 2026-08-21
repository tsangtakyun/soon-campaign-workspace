import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function resetOnboardingFlag(table: 'profiles' | 'workspaces', userId: string) {
  const supabase = createAdminSupabase()
  const matchColumn = table === 'profiles' ? 'id' : 'owner_id'
  const { error } = await supabase
    .from(table)
    .update({ onboarding_completed: false })
    .eq(matchColumn, userId)

  if (
    error &&
    error.code !== 'PGRST204' &&
    !error.message?.toLowerCase().includes('onboarding_completed')
  ) {
    throw error
  }
}

export async function POST() {
  try {
    if (process.env.ENABLE_DEV_RESET !== 'true') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    const email = normalizeEmail(user?.email)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = createAdminSupabase()

    const { count: postsCount, error: postsError } = await supabase
      .from('campaign_posts')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    if (postsError) throw postsError

    const { count: campaignsCount, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    if (campaignsError) throw campaignsError

    let intakesCount = 0
    if (email) {
      const { count, error: intakesError } = await supabase
        .from('campaign_intakes')
        .delete({ count: 'exact' })
        .eq('email', email)
      if (intakesError) throw intakesError
      intakesCount = count ?? 0
    }

    await Promise.all([
      resetOnboardingFlag('profiles', userId),
      resetOnboardingFlag('workspaces', userId),
    ])

    return NextResponse.json({
      success: true,
      deleted: {
        posts: postsCount ?? 0,
        campaigns: campaignsCount ?? 0,
        intakes: intakesCount,
      },
    })
  } catch (error) {
    console.error('[dev/reset-onboarding]', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding', detail: String(error) },
      { status: 500 }
    )
  }
}
