'use client'

const SESSION_ID_KEY = 'soon-onboarding-session-id'
const PERSISTED_KEY = 'soon-onboarding-persisted'

export function getStoredOnboardingSessionId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(SESSION_ID_KEY)
}

export function getOrCreateOnboardingSessionId() {
  if (typeof window === 'undefined') return null

  const existing = window.localStorage.getItem(SESSION_ID_KEY)
  if (existing) return existing

  const next = window.crypto.randomUUID()
  window.localStorage.setItem(SESSION_ID_KEY, next)
  return next
}

export function markOnboardingPersisted() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PERSISTED_KEY, 'true')
}

export function hasPersistedOnboardingSession() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PERSISTED_KEY) === 'true'
}

export function clearOnboardingSessionClaim() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_ID_KEY)
  window.localStorage.removeItem(PERSISTED_KEY)
}
