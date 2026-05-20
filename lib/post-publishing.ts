import { createAdminSupabase } from '@/lib/server-supabase'

type PublishResult = {
  id: string
  status: string
  published_at: string
}

export async function publishPost(postId: string): Promise<PublishResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin client not configured')
  }

  const publishedAt = new Date().toISOString()
  const supabase = createAdminSupabase()

  const { data, error } = await supabase
    .from('campaign_posts')
    .update({
      status: 'published',
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq('id', postId)
    .select('id, status, published_at')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Post not found')

  return data as PublishResult
}

export async function publishDuePosts() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin client not configured')
  }

  const supabase = createAdminSupabase()
  const now = new Date().toISOString()

  const { data: duePosts, error } = await supabase
    .from('campaign_posts')
    .select('id')
    .lte('scheduled_at', now)
    .in('status', ['approved', 'scheduled'])

  if (error) throw error

  const results = []
  for (const post of duePosts || []) {
    try {
      results.push(await publishPost(post.id))
    } catch (error: any) {
      results.push({ id: post.id, error: error.message || 'Unable to publish post' })
    }
  }

  return results
}
