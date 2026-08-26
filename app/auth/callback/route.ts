/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { grantTrialCredits } from '@/lib/credits'
import { createAdminSupabase } from '@/lib/server-supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextFromQuery = requestUrl.searchParams.get('next')
  const nextFromCookie = request.cookies.get('soon_auth_next')?.value
  const authFlow = request.cookies.get('soon_auth_flow')?.value

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll() as any,
          setAll: (all: any) => {
            all.forEach(({ name, value, options }: any) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) {
      const admin = createAdminSupabase()
      const email = user.email?.trim().toLowerCase() || ''
      const [ownedWorkspace, userMembership, emailInvite] = await Promise.all([
        admin.from('workspaces').select('id').eq('owner_id', user.id).limit(1),
        admin
          .from('workspace_members')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['active', 'pending'])
          .limit(1),
        email
          ? admin
              .from('workspace_members')
              .select('id')
              .ilike('email', email)
              .in('status', ['active', 'pending'])
              .limit(1)
          : Promise.resolve({ data: null, error: null }),
      ])

      const membershipError = ownedWorkspace.error || userMembership.error || emailInvite.error
      if (
        membershipError ||
        (!ownedWorkspace.data?.length && !userMembership.data?.length && !emailInvite.data?.length)
      ) {
        console.warn('[auth/callback] blocked account without invitation', { email, userId: user.id })
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
      }

      await grantTrialCredits(user.id).catch((error) => {
        console.warn('[auth/callback] grantTrialCredits failed:', error)
      })
    }
  }

  const next = nextFromQuery || nextFromCookie || '/onboarding'
  const safeNext = normalizeAuthNext(next)
  const destination = authFlow === 'login'
    ? `/select-workspace?next=${encodeURIComponent(safeNext)}`
    : safeNext
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set('soon_auth_next', '', { path: '/', maxAge: 0 })
  response.cookies.set('soon_auth_flow', '', { path: '/', maxAge: 0 })
  return response
}

function normalizeAuthNext(value: string) {
  if (!value || value === '/my-workspace' || value.startsWith('/my-workspace/')) return '/onboarding'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding'
}
