import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess, type WorkspaceCapability } from '@/lib/workspace-access'

export async function getPlatformUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
    error: userError,
  } = await serverSupabase.auth.getUser()

  if (userError || !user?.id) return null

  const admin = createAdminSupabase()
  const email = user.email?.trim().toLowerCase() || ''
  const [ownedWorkspace, userMembership, emailMembership] = await Promise.all([
    admin.from('workspaces').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    admin
      .from('workspace_members')
      .select('id,workspace_id,role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    email
      ? admin
          .from('workspace_members')
          .select('id,workspace_id,role')
          .ilike('email', email)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const accessError = ownedWorkspace.error || userMembership.error || emailMembership.error
  if (accessError) throw accessError
  if (!ownedWorkspace.data && !userMembership.data && !emailMembership.data) return null

  return { admin, user }
}

export async function requirePlatformUser() {
  try {
    const access = await getPlatformUser()
    if (!access) {
      return {
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        access: null,
      }
    }
    return { access, error: null }
  } catch (error) {
    console.error('[platform-access] unable to verify access', error)
    return {
      error: NextResponse.json({ error: 'Unable to verify access' }, { status: 500 }),
      access: null,
    }
  }
}

export async function consumeApiQuota(userId: string, action: string, limit: number) {
  const admin = createAdminSupabase()
  const { data, error } = await admin.rpc('consume_api_rate_limit', {
    p_action: action,
    p_limit: limit,
    p_user_id: userId,
  })

  if (error) throw error
  return data === true
}

export async function requireWorkspaceUser(workspaceId: string, require?: WorkspaceCapability) {
  const platform = await requirePlatformUser()
  if (platform.error) return platform

  const access = await getWorkspaceAccess({
    email: platform.access.user.email,
    userId: platform.access.user.id,
    workspaceId,
  })
  if (!access || (require && !access[require])) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      access: null,
    }
  }
  return { access: { ...platform.access, workspace: access }, error: null }
}
