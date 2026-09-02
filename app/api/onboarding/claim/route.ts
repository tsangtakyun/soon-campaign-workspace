import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

const CLAIM_TABLES = [
  'brand_kits',
  'content_preferences',
  'marketing_campaigns',
  'brand_assets',
  'campaign_posts',
  'designs',
  'social_connections',
  'onboarding_drafts',
]

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const now = new Date().toISOString()
    const { data: brandKitForWorkspace } = await supabase
      .from('brand_kits')
      .select('business_name,elevator_pitch')
      .eq('onboarding_session_id', sessionId)
      .limit(1)
      .maybeSingle()

    let workspaceId: string | null = null
    if (brandKitForWorkspace?.business_name) {
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: brandKitForWorkspace.business_name,
          type: 'brand',
          owner: user.email ?? null,
          owner_id: user.id,
          description: brandKitForWorkspace.elevator_pitch ?? null,
        })
        .select('id')
        .single()

      if (workspaceError) throw workspaceError
      workspaceId = workspace.id

      const { error: memberError } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          email: user.email ?? user.id,
          display_name: user.user_metadata?.full_name ?? user.email ?? brandKitForWorkspace.business_name,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'workspace_id,user_id' }
      )

      if (memberError) throw memberError
    }

    const claimedOwnerFields = workspaceId
      ? { claimed_at: now, user_id: user.id, workspace_id: workspaceId }
      : { claimed_at: now, user_id: user.id }
    const claimedUserFields = workspaceId ? { user_id: user.id, workspace_id: workspaceId } : { user_id: user.id }

    const ownershipChecks = await Promise.all(
      CLAIM_TABLES.map((table) =>
        supabase
          .from(table)
          .select('user_id')
          .eq('onboarding_session_id', sessionId)
          .not('user_id', 'is', null)
          .limit(1)
      )
    )
    const ownershipError = ownershipChecks.find((result) => result.error)?.error
    if (ownershipError) throw ownershipError

    const ownedByOtherUser = ownershipChecks.some((result) =>
      result.data?.some((row) => row.user_id && row.user_id !== user.id)
    )

    if (ownedByOtherUser) {
      console.warn('[onboarding/claim] refused session owned by another user:', {
        sessionId,
        userId: user.id,
      })
      return NextResponse.json(
        { error: 'Session belongs to another user', reason: 'session_owned_by_other_user' },
        { status: 409 }
      )
    }

    const results = await Promise.all([
      supabase
        .from('brand_kits')
        .update(claimedOwnerFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null)
        .is('claimed_at', null),
      supabase
        .from('content_preferences')
        .update(claimedOwnerFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null)
        .is('claimed_at', null),
      supabase
        .from('marketing_campaigns')
        .update(claimedOwnerFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null)
        .is('claimed_at', null),
      supabase
        .from('brand_assets')
        .update(claimedUserFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null),
      supabase
        .from('campaign_posts')
        .update(claimedUserFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null),
      supabase
        .from('designs')
        .update({ user_id: user.id })
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null),
      supabase
        .from('social_connections')
        .update(claimedUserFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null),
      supabase
        .from('onboarding_drafts')
        .update(claimedUserFields)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null),
    ])

    const error = results.find((result) => result.error)?.error
    if (error) throw error

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('[onboarding/claim]', error)
    return NextResponse.json(
      { detail: String(error), error: 'Failed to claim onboarding data' },
      { status: 500 }
    )
  }
}
