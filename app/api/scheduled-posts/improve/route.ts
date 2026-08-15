import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

type ImproveMode = 'copy' | 'image-prompt'

type ImproveRequest = {
  mode?: ImproveMode
  postIds?: string[]
  workspaceId?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced || text
  const start = candidate.indexOf('[')
  const end = candidate.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error('Claude did not return a JSON array')
  const parsed = JSON.parse(candidate.slice(start, end + 1))
  if (!Array.isArray(parsed)) throw new Error('Claude response was not an array')
  return parsed.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>
}

async function userCanAccessWorkspace(workspaceId: string, userId: string) {
  const supabase = createAdminSupabase()
  const [{ data: membership }, { data: ownedWorkspace }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', userId)
      .maybeSingle(),
  ])

  return Boolean(membership?.workspace_id || ownedWorkspace?.id)
}

async function improveWithClaude(input: {
  mode: ImproveMode
  posts: Array<{ id: string; title: string; body: string; post_type: string | null }>
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const model = anthropicModel(process.env.ANTHROPIC_SCHEDULED_POSTS_MODEL)
  const targetField = input.mode === 'copy' ? 'body' : 'improvedImagePrompt'
  const instruction =
    input.mode === 'copy'
      ? 'Rewrite each body in Traditional Chinese to be more engaging, specific, warm, and commercially useful. Keep it concise and suitable for social media.'
      : 'Write a richer image-generation prompt for each post in English. Include subject, scene, composition, lighting, mood, and product/brand context. Do not include text overlays.'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.35,
      system: 'You improve scheduled marketing posts for SOON. Return only valid JSON.',
      messages: [
        {
          role: 'user',
          content: [
            instruction,
            `Return a JSON array. Each item must be {"id":"post id","${targetField}":"improved text"}.`,
            'Posts:',
            JSON.stringify(input.posts),
          ].join('\n'),
        },
      ],
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Claude improvement request failed')
  }

  const text = Array.isArray(data?.content)
    ? data.content
        .filter((item: { type?: string }) => item.type === 'text')
        .map((item: { text?: string }) => item.text || '')
        .join('\n')
    : ''

  return parseJsonArray(text)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ImproveRequest
    const workspaceId = asString(body.workspaceId)
    const mode = body.mode === 'image-prompt' ? 'image-prompt' : body.mode === 'copy' ? 'copy' : null
    const postIds = Array.isArray(body.postIds)
      ? body.postIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    if (!mode) return NextResponse.json({ error: 'Missing improvement mode' }, { status: 400 })
    if (!postIds.length) return NextResponse.json({ error: 'Missing postIds' }, { status: 400 })

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await userCanAccessWorkspace(workspaceId, user.id))) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 403 })
    }

    const supabase = createAdminSupabase()
    const { data: posts, error: postsError } = await supabase
      .from('campaign_posts')
      .select('id,title,body,post_type,captions')
      .eq('workspace_id', workspaceId)
      .in('id', postIds)

    if (postsError) throw postsError
    if (!posts?.length) return NextResponse.json({ updated: [] })

    const improvements = await improveWithClaude({
      mode,
      posts: posts.map((post: any) => ({
        id: post.id,
        title: asString(post.title),
        body: asString(post.body),
        post_type: asString(post.post_type) || null,
      })),
    })
    const improvementsById = new Map(improvements.map((item) => [asString(item.id), item]))

    const updated: string[] = []
    for (const post of posts as any[]) {
      const improvement = improvementsById.get(post.id)
      if (!improvement) continue

      if (mode === 'copy') {
        const nextBody = asString(improvement.body)
        if (!nextBody) continue
        const { error } = await supabase
          .from('campaign_posts')
          .update({ body: nextBody, updated_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('id', post.id)
        if (error) throw error
        updated.push(post.id)
      } else {
        const improvedImagePrompt = asString(improvement.improvedImagePrompt)
        if (!improvedImagePrompt) continue
        const captions = {
          ...asRecord(post.captions),
          improvedImagePrompt,
        }
        const { error } = await supabase
          .from('campaign_posts')
          .update({ captions, updated_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('id', post.id)
        if (error) throw error
        updated.push(post.id)
      }
    }

    return NextResponse.json({ updated })
  } catch (error) {
    console.error('[scheduled-posts/improve]', error)
    return NextResponse.json(
      { error: 'Failed to improve scheduled posts', detail: String(error) },
      { status: 500 }
    )
  }
}
