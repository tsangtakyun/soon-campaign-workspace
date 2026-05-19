import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { assertWorkspaceAccess } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

import { PostReviewClient, type ReviewCampaign, type ReviewPost } from './PostReviewClient'

type ApprovalPostPageProps = {
  params: Promise<{ postId: string }>
}

type PostRow = ReviewPost & {
  user_id: string | null
}

export default async function ApprovalPostPage({ params }: ApprovalPostPageProps) {
  const { postId } = await params
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  if (!user?.id) redirect('/onboarding/approvals')

  const supabase = createAdminSupabase()
  const { data: post, error: postError } = await supabase
    .from('campaign_posts')
    .select('id,title,body,post_type,scheduled_at,image_url,status,approved_at,campaign_id,captions,workspace_id,user_id')
    .eq('id', postId)
    .maybeSingle()

  if (postError || !post) redirect('/onboarding/approvals')

  const postRow = post as PostRow
  if (!postRow.workspace_id) {
    if (postRow.user_id !== user.id) redirect('/onboarding/approvals')
  } else {
    try {
      await assertWorkspaceAccess({
        email: user.email,
        userId: user.id,
        workspaceId: postRow.workspace_id,
      })
    } catch {
      redirect('/onboarding/approvals')
    }
  }

  const [campaignResult, siblingsResult] = await Promise.all([
    postRow.campaign_id
      ? supabase
          .from('marketing_campaigns')
          .select('name,strategy_emoji')
          .eq('id', postRow.campaign_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    postRow.campaign_id
      ? supabase
          .from('campaign_posts')
          .select('id')
          .eq('campaign_id', postRow.campaign_id)
          .order('scheduled_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const siblings = ((siblingsResult.data || []) as Array<{ id: string }>).filter((item) => item.id)
  const currentIndex = siblings.findIndex((item) => item.id === postId)
  const prevId = currentIndex > 0 ? siblings[currentIndex - 1]?.id || null : null
  const nextId = currentIndex >= 0 ? siblings[currentIndex + 1]?.id || null : null

  return (
    <PostReviewClient
      campaign={(campaignResult.data || null) as ReviewCampaign | null}
      nextId={nextId}
      post={postRow}
      prevId={prevId}
      workspaceId={postRow.workspace_id || ''}
    />
  )
}
