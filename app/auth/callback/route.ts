/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { grantTrialCredits } from '@/lib/credits'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextFromQuery = requestUrl.searchParams.get('next')
  const nextFromCookie = request.cookies.get('soon_auth_next')?.value

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
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) {
      await grantTrialCredits(user.id).catch((error) => {
        console.warn('[auth/callback] grantTrialCredits failed:', error)
      })
    }
  }

  const next = nextFromQuery || nextFromCookie || '/onboarding'
  const safeNext = normalizeAuthNext(next)
  const response = NextResponse.redirect(new URL(safeNext, request.url))
  response.cookies.set('soon_auth_next', '', { path: '/', maxAge: 0 })
  return response
}

function normalizeAuthNext(value: string) {
  if (!value || value === '/my-workspace' || value.startsWith('/my-workspace/')) return '/onboarding'
  return value.startsWith('/') ? value : '/onboarding'
}
