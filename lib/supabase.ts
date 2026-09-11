import { createBrowserClient } from '@supabase/ssr'

import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function onboardingBoundFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  const sessionId = getStoredOnboardingSessionId()
  if (sessionId && UUID_PATTERN.test(sessionId)) headers.set('x-soon-onboarding-session', sessionId)
  return fetch(input, { ...init, headers })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: onboardingBoundFetch } }
  )
}
