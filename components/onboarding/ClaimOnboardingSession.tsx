'use client'

import { useEffect } from 'react'

import {
  clearOnboardingSessionClaim,
  getStoredOnboardingSessionId,
  hasPersistedOnboardingSession,
} from '@/lib/onboarding-session'

export function ClaimOnboardingSession() {
  useEffect(() => {
    async function claim() {
      const sessionId = getStoredOnboardingSessionId()
      if (!sessionId || !hasPersistedOnboardingSession()) return

      try {
        const response = await fetch('/api/onboarding/claim', {
          body: JSON.stringify({ sessionId }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (response.ok) {
          clearOnboardingSessionClaim()
          console.log('[onboarding/claim] success')
        } else if (response.status === 409) {
          clearOnboardingSessionClaim()
          console.warn('[onboarding/claim] skipped stale session')
        }
      } catch (error) {
        console.warn('[onboarding/claim] failed:', error)
      }
    }

    void claim()
  }, [])

  return null
}
