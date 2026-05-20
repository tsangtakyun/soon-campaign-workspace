'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const STORAGE_KEY = 'soon-onboarding-claim-v1'

export function ClaimOnboardingSession() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const entries = Object.fromEntries(searchParams.entries())
    const hasClaimData =
      Boolean(entries.onboarding) ||
      Boolean(entries.plan) ||
      Boolean(entries.name) ||
      Boolean(entries.budget) ||
      Boolean(entries.category)

    if (!hasClaimData) return

    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...entries,
        capturedAt: new Date().toISOString(),
      })
    )
  }, [searchParams])

  return null
}
