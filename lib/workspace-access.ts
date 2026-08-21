import { createAdminSupabase } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'client_approver' | 'viewer'
export type WorkspaceCapability = 'canApprove' | 'canEdit' | 'canManagePrompt' | 'canManageWorkspace'

export async function getWorkspaceAccess(input: {
  email?: string | null
  userId: string
  workspaceId: string
}) {
  const admin = createAdminSupabase()
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .select('id,name,owner_id')
    .eq('id', input.workspaceId)
    .maybeSingle()
  if (workspaceError) throw workspaceError
  if (!workspace?.id) return null

  if (workspace.owner_id === input.userId) {
    return { admin, canApprove: true, canEdit: true, canManagePrompt: true, canManageWorkspace: true, role: 'owner' as const, workspace }
  }

  let query = admin
    .from('workspace_members')
    .select('id,role,status')
    .eq('workspace_id', input.workspaceId)
    .eq('status', 'active')
    .limit(1)
  query = input.email
    ? query.or(`user_id.eq.${input.userId},email.ilike.${input.email.toLowerCase()}`)
    : query.eq('user_id', input.userId)
  const { data: membership, error } = await query.maybeSingle()
  if (error) throw error
  if (!membership?.id) return null

  const role = (membership.role || 'member') as WorkspaceRole
  return {
    admin,
    canApprove: role === 'admin' || role === 'client_approver',
    canEdit: role === 'admin' || role === 'member',
    canManagePrompt: false,
    canManageWorkspace: role === 'admin',
    role,
    workspace,
  }
}

export async function withWorkspaceAuth<T>(
  input: { email?: string | null; userId: string; workspaceId: string },
  options: { require: WorkspaceCapability },
  handler: (access: NonNullable<Awaited<ReturnType<typeof getWorkspaceAccess>>>) => Promise<T>,
) {
  const access = await getWorkspaceAccess(input)
  if (!access || !access[options.require]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return handler(access)
}
