import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type InviteRouteProps = {
  params: Promise<{ inviteId: string }>
}

async function currentUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  return user || null
}

export async function GET(_req: Request, { params }: InviteRouteProps) {
  try {
    const { inviteId } = await params
    if (!isUuid(inviteId)) return NextResponse.json({ error: 'Invalid invite id' }, { status: 400 })

    const supabase = createAdminSupabase()
    const { data: invite, error } = await supabase
      .from('workspace_members')
      .select('id,email,display_name,role,status,workspace_id')
      .eq('id', inviteId)
      .maybeSingle()

    if (error) throw error
    if (!invite?.id) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id,name')
      .eq('id', invite.workspace_id)
      .maybeSingle()

    if (workspaceError) throw workspaceError

    const user = await currentUser()
    return NextResponse.json({
      invite,
      signedInEmail: user?.email || null,
      workspace,
    })
  } catch (error) {
    console.error('[api/team-invites] GET error', error)
    return NextResponse.json({ error: 'Failed to load invite' }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: InviteRouteProps) {
  try {
    const { inviteId } = await params
    if (!isUuid(inviteId)) return NextResponse.json({ error: 'Invalid invite id' }, { status: 400 })

    const user = await currentUser()
    if (!user?.id || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminSupabase()
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_members')
      .select('id,email,status,workspace_id')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError) throw inviteError
    if (!invite?.id) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (String(invite.email || '').toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match invite' }, { status: 403 })
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({
        display_name: user.user_metadata?.full_name || user.email,
        status: 'active',
        user_id: user.id,
      })
      .eq('id', inviteId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      workspaceId: invite.workspace_id,
    })
  } catch (error) {
    console.error('[api/team-invites] POST error', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
