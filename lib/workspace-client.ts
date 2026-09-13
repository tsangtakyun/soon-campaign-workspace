'use client'

export const ACTIVE_WORKSPACE_STORAGE_KEY = 'soon-active-workspace-id'
export const ACTIVE_WORKSPACE_CACHE_KEY = 'soon-active-workspace'
export const WORKSPACE_CHANGED_EVENT = 'soon-workspace-changed'

export type WorkspaceSummary = {
  id: string
  name: string
  brandName?: string | null
  description?: string | null
  logoUrl?: string | null
  promptProfileKey?: string | null
  role?: 'owner' | 'admin' | 'member' | 'client_approver' | 'viewer' | null
}

export function isBechillWorkspaceLabel(label?: string | null) {
  const normalized = label?.toLowerCase().replace(/\s+/g, '') || ''
  return normalized.includes('bechilltogether') || normalized.includes('bunchill')
}

export function isBechillWorkspace(workspace?: WorkspaceSummary | null) {
  return isBechillWorkspaceLabel(workspace?.brandName || workspace?.name || '')
}

export function isEggWorkspaceLabel(label?: string | null) {
  const normalized = label?.toLowerCase().replace(/\s+/g, '') || ''
  return normalized.includes('egg.soon') || normalized.includes('eggsoon')
}

export function isEggWorkspace(workspace?: WorkspaceSummary | null) {
  return isEggWorkspaceLabel(workspace?.brandName || workspace?.name || '')
}

export function getActiveWorkspaceId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)
}

export function getCachedActiveWorkspace(): WorkspaceSummary | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(ACTIVE_WORKSPACE_CACHE_KEY)
    if (!raw) return null

    const workspace = JSON.parse(raw) as Partial<WorkspaceSummary>
    if (typeof workspace.id !== 'string' || typeof workspace.name !== 'string') return null
    return workspace as WorkspaceSummary
  } catch {
    return null
  }
}

export function cacheActiveWorkspace(workspace: WorkspaceSummary) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_WORKSPACE_CACHE_KEY, JSON.stringify(workspace))
}

export function setActiveWorkspaceId(workspaceId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId)
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: { workspaceId } }))
}

export function clearActiveWorkspaceId() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY)
  window.localStorage.removeItem(ACTIVE_WORKSPACE_CACHE_KEY)
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: { workspaceId: null } }))
}

async function fetchWorkspaceList(attempts = 3) {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch('/api/workspaces', { cache: 'no-store' })
      if (response.ok || response.status < 500 || attempt === attempts - 1) {
        return response
      }
    } catch (error) {
      lastError = error
      if (attempt === attempts - 1) throw error
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350 * 2 ** attempt))
  }

  throw lastError instanceof Error ? lastError : new Error('未能載入工作空間')
}

export async function resolveActiveWorkspace() {
  const storedWorkspaceId = getActiveWorkspaceId()
  const workspaceResponse = await fetchWorkspaceList()
  const workspacePayload = await workspaceResponse.json().catch(() => null)
  if (!workspaceResponse.ok) {
    throw new Error(workspacePayload?.error || '未能載入工作空間')
  }
  const workspaces = Array.isArray(workspacePayload?.workspaces)
    ? (workspacePayload.workspaces as WorkspaceSummary[])
    : []
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === storedWorkspaceId) ||
    workspaces[0] ||
    null
  const workspaceId = activeWorkspace?.id || null

  if (workspaceId && storedWorkspaceId !== workspaceId) {
    setActiveWorkspaceId(workspaceId)
  }
  if (activeWorkspace) cacheActiveWorkspace(activeWorkspace)

  return {
    activeWorkspace,
    workspaceId,
    workspaces,
  }
}

export function workspaceInitial(label?: string | null) {
  const value = label?.trim()
  if (!value) return 'S'
  return value.slice(0, 1).toUpperCase()
}
