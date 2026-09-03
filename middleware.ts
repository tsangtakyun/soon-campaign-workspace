import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  if (pathname === '/onboarding/campaigns') {
    return NextResponse.redirect(new URL('/onboarding/topic-library', request.url))
  }

  if (pathname === '/my-workspace' || pathname.startsWith('/my-workspace/')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (pathname === '/onboarding/new-workspace') {
    return NextResponse.redirect(new URL('/select-workspace', request.url))
  }

  const isPublicPage =
    pathname === '/' ||
    pathname === '/contact' ||
    pathname === '/pricing' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/submit-brief' ||
    pathname.startsWith('/paid-analysis') ||
    pathname.startsWith('/creator-matching') ||
    pathname.startsWith('/script-planning') ||
    pathname.startsWith('/storyboard-planning') ||
    pathname.startsWith('/delivery-confirmation') ||
    pathname.startsWith('/delivery-tracking') ||
    pathname === '/login' ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/stripe') ||
    pathname.startsWith('/api/paid-analysis') ||
    pathname.startsWith('/api/campaign-workflow')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (!isPublicPage) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  const isProtectedWorkspacePage =
    pathname === '/select-workspace' ||
    pathname === '/scheduled-posts' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/workspace')

  if (isProtectedWorkspacePage) {
    const email = user.email?.trim().toLowerCase() || ''
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    let membershipQuery = admin
        .from('workspace_members')
        .select('id')
        .eq('status', 'active')
        .limit(1)
    membershipQuery = email
      ? membershipQuery.or(`user_id.eq.${user.id},email.ilike.${email}`)
      : membershipQuery.eq('user_id', user.id)

    const [{ data: membership, error: membershipError }, { data: ownedWorkspace, error: ownerError }] = await Promise.all([
      membershipQuery,
      admin
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1),
    ])

    if (membershipError || ownerError || (!membership?.length && !ownedWorkspace?.length)) {
      if (membershipError || ownerError) {
        console.error('[middleware] unable to verify workspace access', {
          membership: membershipError?.message,
          owner: ownerError?.message,
        })
      }
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'unauthorized')
      if (email) loginUrl.searchParams.set('email', email)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/ops') && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email || '')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  if (pathname === '/login') {
    if (request.nextUrl.searchParams.get('google') === '1') return response
    const next = request.nextUrl.searchParams.get('next')
    const safeNext = normalizeAuthNext(next)
    return NextResponse.redirect(new URL(safeNext, request.url))
  }

  return response
}

function normalizeAuthNext(value: string | null) {
  if (!value || value === '/my-workspace' || value.startsWith('/my-workspace/')) return '/onboarding'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding'
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|paid-analysis|api|.*\\..*).*)'],
}
