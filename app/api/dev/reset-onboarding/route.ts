import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type ResetBody = {
  email?: string
}

function isDevResetAllowed(request: Request) {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV
  if (appEnv !== 'production') return true

  const devKey = process.env.DEV_RESET_KEY
  const headerKey = request.headers.get('x-dev-key')
  return Boolean(devKey && headerKey && headerKey === devKey)
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function findUserIdByEmail(email: string) {
  const supabase = createAdminSupabase()
  const perPage = 1000

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data.users as Array<{ id: string; email?: string | null }>
    const user = users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (user) return user.id
    if (users.length < perPage) break
  }

  return null
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

export async function POST(request: Request) {
  try {
    if (!isDevResetAllowed(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as ResetBody
    const requestedEmail = normalizeEmail(body.email)

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    const email = requestedEmail || normalizeEmail(user?.email)
    const userId = requestedEmail ? await findUserIdByEmail(requestedEmail) : user?.id

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
