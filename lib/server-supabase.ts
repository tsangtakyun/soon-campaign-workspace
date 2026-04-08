import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { CookieOptions } from '@supabase/ssr'

type CookieStoreLike = {
  getAll: () => Array<{ name: string; value: string }>
  set: (name: string, value: string, options: CookieOptions) => void
}

export function createServerSupabase(cookieStore: CookieStoreLike) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
