import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

const INVITE_LINK_EMAIL = '*'

async function currentUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  return user
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const supabase = createAdminSupabase()
    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .select('id,workspace_id,email,role,status,expires_at,message,created_at,workspaces(name)')
      .eq('token', token)
      .maybeSingle()

    if (error) throw error
    if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })

    const user = await currentUser()
    const expiresAt = new Date(invitation.expires_at)
    const expired = invitation.status === 'expired' || expiresAt.getTime() <= Date.now()

    const { data: membership } = user?.id
      ? await supabase
          .from('workspace_members')
          .select('workspace_id,status')
          .eq('workspace_id', invitation.workspace_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
      : { data: null }

    const workspaceJoin = (invitation as { workspaces?: { name?: string | null } | Array<{ name?: string | null }> }).workspaces
    const workspaceName = Array.isArray(workspaceJoin) ? workspaceJoin[0]?.name : workspaceJoin?.name
    const invitationEmail = String(invitation.email || '').toLowerCase()
    const userEmail = user?.email?.toLowerCase() || null
    const isOpenLink = invitationEmail === INVITE_LINK_EMAIL

    return NextResponse.json({
      invitation: {
        workspaceId: invitation.workspace_id,
        workspaceName,
        email: isOpenLink ? null : invitation.email,
        role: invitation.role,
        status: expired ? 'expired' : invitation.status,
        expiresAt: invitation.expires_at,
        message: invitation.message,
        openLink: isOpenLink,
      },
      currentUser: user
        ? {
            email: user.email,
            id: user.id,
          }
        : null,
      alreadyMember: Boolean(membership),
      emailMatches: Boolean(isOpenLink || (userEmail && userEmail === invitationEmail)),
    })
  } catch (error) {
    console.error('[invite/accept] GET', error)
    return NextResponse.json(
      { error: 'Failed to load invite', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string }
    if (!body.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const user = await currentUser()
    if (!user?.id || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminSupabase()
    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .select('id,workspace_id,email,role,status,expires_at')
      .eq('token', body.token)
      .maybeSingle()

    if (error) throw error
    if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 409 })
    }
    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      await supabase.from('workspace_invitations').update({ status: 'expired' }).eq('id', invitation.id)
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }

    const invitationEmail = String(invitation.email || '').toLowerCase()
    const userEmail = user.email.toLowerCase()
    if (invitationEmail !== INVITE_LINK_EMAIL && invitationEmail !== userEmail) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    }

    const displayName = user.user_metadata?.full_name || user.email
    const { error: memberError } = await supabase.from('workspace_members').upsert(
      {
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        email: user.email,
        display_name: displayName,
        role: invitation.role,
        status: 'active',
      },
      { onConflict: 'workspace_id,user_id' }
    )

    if (memberError) throw memberError

    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, workspaceId: invitation.workspace_id })
  } catch (error) {
    console.error('[invite/accept] POST', error)
    return NextResponse.json(
      { error: 'Failed to accept invite', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
