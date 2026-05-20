import { createAdminSupabase } from '@/lib/server-supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SocialConnectionPayload = {
  access_token?: string | null
  account_id: string
  account_name: string
  connected_at?: string
  onboarding_session_id?: string | null
  page_access_token?: string | null
  page_id?: string | null
  platform: string
  refresh_token?: string | null
  token_expires_at?: string | null
  user_id?: string | null
  workspace_id: string
}

export function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_RE.test(value))
}

export function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

export function expiresAtFromSeconds(seconds: unknown) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(Date.now() + seconds * 1000).toISOString()
}

export async function assertWorkspaceAccess({
  email,
  userId,
  workspaceId,
}: {
  email?: string | null
  userId: string
  workspaceId: string
}) {
  if (!isUuid(workspaceId)) {
    throw new Error('Invalid workspace id')
  }

  const supabase = createAdminSupabase()
  const { data: ownedWorkspace, error: ownedError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (ownedError) throw ownedError
  if (ownedWorkspace?.id) return

  let membershipQuery = supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .limit(1)

  if (email) {
    membershipQuery = membershipQuery.or(`user_id.eq.${userId},email.ilike.${email.toLowerCase()}`)
  } else {
    membershipQuery = membershipQuery.eq('user_id', userId)
  }

  const { data: membership, error: membershipError } = await membershipQuery.maybeSingle()
  if (membershipError) throw membershipError
  if (!membership?.workspace_id) {
    throw new Error('Workspace is not available to this user')
  }
}

export async function saveWorkspaceSocialConnection(payload: SocialConnectionPayload) {
  const supabase = createAdminSupabase()
  const connection = {
    ...payload,
    connected_at: payload.connected_at || new Date().toISOString(),
    onboarding_session_id: payload.onboarding_session_id || null,
    user_id: payload.user_id || null,
  }

  const { data: existing, error: lookupError } = await supabase
    .from('social_connections')
    .select('id')
    .eq('workspace_id', payload.workspace_id)
    .eq('platform', payload.platform)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('social_connections')
      .update(connection)
      .eq('id', existing.id)
    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabase.from('social_connections').insert(connection)
  if (insertError) throw insertError
}
