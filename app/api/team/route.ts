import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { appUrl, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'client_approver' | 'viewer'

const EDITOR_ROLES = new Set(['owner', 'admin'])

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeRole(value: unknown): WorkspaceRole {
  return value === 'admin' || value === 'viewer' || value === 'client_approver' || value === 'owner' ? value : 'member'
}

async function currentUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser()

  if (error || !user?.id) return null
  return user
}

async function getWorkspaceContext(workspaceId: string, userId: string, email?: string | null) {
  const supabase = createAdminSupabase()

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id,name,owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError) throw workspaceError
  if (!workspace?.id) return null

  const isOwner = workspace.owner_id === userId
  let memberQuery = supabase
    .from('workspace_members')
    .select('id,role,status,email,user_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .limit(1)

  if (email) {
    memberQuery = memberQuery.or(`user_id.eq.${userId},email.ilike.${email.toLowerCase()}`)
  } else {
    memberQuery = memberQuery.eq('user_id', userId)
  }

  const { data: member, error: memberError } = await memberQuery.maybeSingle()
  if (memberError) throw memberError

  const role = isOwner ? 'owner' : (member?.role || null)
  if (!isOwner && !member?.id) return null

  return {
    canEdit: Boolean(role && EDITOR_ROLES.has(role)),
    role,
    workspace,
  }
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url)
    const workspaceId = requestUrl.searchParams.get('workspace_id') || ''
    if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 })

    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const context = await getWorkspaceContext(workspaceId, user.id, user.email)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('id,email,display_name,role,status,user_id,invited_by,created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const userIds = Array.from(
      new Set((members || []).map((member: any) => member.user_id).filter(Boolean))
    )
    const avatarByUserId = new Map<string, string | null>()

    await Promise.all(
      userIds.map(async (memberUserId) => {
        const { data: userData } = await supabase.auth.admin.getUserById(memberUserId)
        const avatarUrl =
          userData.user?.user_metadata?.avatar_url ||
          userData.user?.user_metadata?.picture ||
          null
        avatarByUserId.set(memberUserId, avatarUrl)
      })
    )

    return NextResponse.json({
      canEdit: context.canEdit,
      members: (members || []).map((member: any) => ({
        ...member,
        avatarUrl: member.user_id ? avatarByUserId.get(member.user_id) || null : null,
        inviteUrl:
          member.status === 'pending'
            ? `${appUrl(req)}/invite/${member.id}`
            : null,
      })),
      role: context.role,
      workspace: context.workspace,
    })
  } catch (error) {
    console.error('[api/team] GET error', error)
    return NextResponse.json({ error: 'Failed to load team members' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const email = normalizeEmail(body?.email)
    const role = normalizeRole(body?.role)

    if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 })
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    if (role === 'owner') return NextResponse.json({ error: 'Owner role cannot be invited' }, { status: 400 })

    const context = await getWorkspaceContext(workspaceId, user.id, user.email)
    if (!context?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const { data: existing, error: existingError } = await supabase
      .from('workspace_members')
      .select('id,status,user_id')
      .eq('workspace_id', workspaceId)
      .ilike('email', email)
      .maybeSingle()

    if (existingError) throw existingError

    const payload = {
      display_name: email,
      email,
      invited_by: user.id,
      role,
      status: existing?.status === 'active' ? 'active' : 'pending',
      workspace_id: workspaceId,
    }

    const { data: member, error } = existing?.id
      ? await supabase
          .from('workspace_members')
          .update(payload)
          .eq('id', existing.id)
          .select('id,email,display_name,role,status,user_id,invited_by,created_at')
          .single()
      : await supabase
          .from('workspace_members')
          .insert(payload)
          .select('id,email,display_name,role,status,user_id,invited_by,created_at')
          .single()

    if (error) throw error

    return NextResponse.json({
      inviteUrl: `${appUrl(req)}/invite/${member.id}`,
      member,
      success: true,
    })
  } catch (error) {
    console.error('[api/team] POST error', error)
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const memberId = typeof body?.member_id === 'string' ? body.member_id.trim() : ''
    const role = normalizeRole(body?.role)

    if (!isUuid(workspaceId) || !isUuid(memberId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (role === 'owner') return NextResponse.json({ error: 'Owner role cannot be assigned here' }, { status: 400 })

    const context = await getWorkspaceContext(workspaceId, user.id, user.email)
    if (!context?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .neq('role', 'owner')

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/team] PATCH error', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requestUrl = new URL(req.url)
    const workspaceId = requestUrl.searchParams.get('workspace_id') || ''
    const memberId = requestUrl.searchParams.get('member_id') || ''

    if (!isUuid(workspaceId) || !isUuid(memberId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const context = await getWorkspaceContext(workspaceId, user.id, user.email)
    if (!context?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id,role,user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (memberError) throw memberError
    if (!member?.id) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (member.role === 'owner') return NextResponse.json({ error: 'Owner cannot be removed' }, { status: 400 })

    const { error } = await supabase.from('workspace_members').delete().eq('id', memberId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/team] DELETE error', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
