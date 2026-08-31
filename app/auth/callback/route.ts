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
              .select('id,status')
              .ilike('email', email)
              .in('status', ['active', 'pending'])
              .limit(20)
          : Promise.resolve({ data: null, error: null }),
      ])

      let invitationActivationError: { message?: string } | null = null
      const pendingInviteIds = (emailInvite.data || [])
        .filter((invite) => invite.status === 'pending')
        .map((invite) => invite.id)

      if (!emailInvite.error && pendingInviteIds.length) {
        const { error } = await admin
          .from('workspace_members')
          .update({
            display_name: user.user_metadata?.full_name || user.email,
            status: 'active',
            user_id: user.id,
          })
          .in('id', pendingInviteIds)
          .eq('status', 'pending')
        invitationActivationError = error
      }

      const hasWorkspaceAccess = Boolean(
        ownedWorkspace.data?.length ||
          userMembership.data?.length ||
          emailInvite.data?.length,
      )
      const hasEstablishedAccess = Boolean(
        ownedWorkspace.data?.length ||
          userMembership.data?.length ||
          (emailInvite.data || []).some((invite) => invite.status === 'active'),
      )
      const accessLookupErrors = [ownedWorkspace.error, userMembership.error, emailInvite.error]
        .filter(Boolean)
      const isSignupFlow = authFlow === 'signup'

      if (!hasWorkspaceAccess && isSignupFlow && !accessLookupErrors.length) {
        const displayName = String(
          user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || '新用戶',
        ).trim()
        const { data: workspace, error: workspaceError } = await admin
          .from('workspaces')
          .insert({
            name: `${displayName} 的工作空間`,
            type: 'brand',
            owner: user.email ?? null,
            owner_id: user.id,
            description: '尚未完成設定',
          })
          .select('id')
          .single()

        if (workspaceError || !workspace?.id) {
          console.error('[auth/callback] failed to provision signup workspace', {
            email,
            error: workspaceError?.message || 'Workspace id was not returned',
            userId: user.id,
          })
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL('/login?error=signup_failed', request.url))
        }

        const { error: memberError } = await admin.from('workspace_members').upsert(
          {
            workspace_id: workspace.id,
            user_id: user.id,
            email: user.email ?? user.id,
            display_name: displayName,
            role: 'owner',
            status: 'active',
          },
          { onConflict: 'workspace_id,user_id' },
        )

        if (memberError) {
          console.error('[auth/callback] signup workspace membership failed', {
            email,
            error: memberError.message,
            userId: user.id,
            workspaceId: workspace.id,
          })
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL('/login?error=signup_failed', request.url))
        }
      } else if (!hasWorkspaceAccess || (invitationActivationError && !hasEstablishedAccess)) {
        console.warn('[auth/callback] blocked account without invitation', {
          email,
          errors: [ownedWorkspace.error, userMembership.error, emailInvite.error]
            .filter(Boolean)
            .map((error) => error?.message),
          matches: {
            email: emailInvite.data?.length || 0,
            membership: userMembership.data?.length || 0,
            owned: ownedWorkspace.data?.length || 0,
          },
          userId: user.id,
        })
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
      }

      const lookupErrors = accessLookupErrors
        .map((error) => error?.message)
      if (lookupErrors.length) {
        console.warn('[auth/callback] access confirmed despite partial lookup failure', {
          email,
          errors: lookupErrors,
          matches: {
            email: emailInvite.data?.length || 0,
            membership: userMembership.data?.length || 0,
            owned: ownedWorkspace.data?.length || 0,
          },
          userId: user.id,
        })
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
