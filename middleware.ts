import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  const isPublicPage =
    pathname === '/' ||
    pathname === '/contact' ||
    pathname.startsWith('/claim') ||
    pathname === '/signup' ||
    pathname.startsWith('/onboarding') ||
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/stripe') ||
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

  if (pathname.startsWith('/ops') && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email || '')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  if (pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next')
    const safeNext = next && next.startsWith('/') ? next : '/onboarding'
    return NextResponse.redirect(new URL(safeNext, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/contact',
    '/claim/:path*',
    '/login',
    '/onboarding/:path*',
    '/ops/:path*',
    '/signup',
  ],
}
