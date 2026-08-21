'use client'

import { useEffect } from 'react'

import {
  clearOnboardingSessionClaim,
  getStoredOnboardingSessionId,
  hasPersistedOnboardingSession,
} from '@/lib/onboarding-session'
import { WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

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
          // Pages that loaded before the anonymous onboarding data was claimed
          // need to resolve the newly attached workspace again.
          window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT))
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
