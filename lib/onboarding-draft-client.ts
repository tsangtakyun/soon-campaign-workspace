'use client'

import { getOrCreateOnboardingSessionId, getStoredOnboardingSessionId } from '@/lib/onboarding-session'

export type OnboardingDraftValues = Record<string, unknown>

export async function persistOnboardingDraft(
  values: OnboardingDraftValues,
  removeKeys: string[] = []
) {
  const sessionId = getOrCreateOnboardingSessionId()
  if (!sessionId) return false

  try {
    const response = await fetch('/api/onboarding/draft', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, values, removeKeys }),
      keepalive: true,
    })
    return response.ok
  } catch (error) {
    console.warn('[onboarding-draft] save failed; browser copy retained', error)
    return false
  }
}
export async function restoreOnboardingDraft() {
  const sessionId = getStoredOnboardingSessionId()
  if (!sessionId) return null

  try {
    const response = await fetch(`/api/onboarding/draft?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = await response.json() as { data?: OnboardingDraftValues }
    const data = payload.data || {}
    Object.entries(data).forEach(([key, value]) => {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    })
    return data
  } catch (error) {
    console.warn('[onboarding-draft] restore failed; using browser copy', error)
    return null
  }
}
