import { notFound } from 'next/navigation'

import { createAdminSupabase } from '@/lib/server-supabase'
import { PostReviewClient, type ReviewPost } from './PostReviewClient'

async function loadReviewPost(postId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  const supabase = createAdminSupabase()
  const { data: post, error } = await supabase
    .from('campaign_posts')
    .select('*, marketing_campaigns(id, title, name)')
    .eq('id', postId)
    .maybeSingle()

  if (error || !post) return null

  const campaignId = post.campaign_id || post.marketing_campaigns?.id
  const { data: siblings } = campaignId
    ? await supabase
        .from('campaign_posts')
        .select('id, title, scheduled_at')
        .eq('campaign_id', campaignId)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
    : { data: [] }

  return {
    post: post as ReviewPost,
    siblingIds: (siblings || []).map((item) => item.id as string),
  }
}

export default async function ApprovalReviewPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const data = await loadReviewPost(postId)

  if (!data) notFound()

  return <PostReviewClient post={data.post} siblingIds={data.siblingIds} />
}
