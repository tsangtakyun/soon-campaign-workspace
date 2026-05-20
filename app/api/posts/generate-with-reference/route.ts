import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

type GenerateWithReferenceBody = {
  postBody?: string
  postId?: string
  postTitle?: string
  referenceImageUrl?: string
  userCommand?: string
  workspaceId?: string
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function loadImageFile(imageUrl: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Unable to load reference image (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const bytes = await response.arrayBuffer()
  return new File([bytes], 'reference-image.jpg', { type: contentType })
}

async function writeImagePrompt(input: {
  postBody: string
  postTitle: string
  userCommand: string
}) {
  const fallbackPrompt = `
Professional social media marketing image for Hong Kong/Asian beauty and lifestyle market.
Post title: ${input.postTitle}
Post body: ${input.postBody}
Instruction: ${input.userCommand}
Use the attached reference image for visual style, mood, lighting, and composition. No text overlays.
`.trim()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackPrompt

  const anthropic = new Anthropic({ apiKey })
  const promptResponse = await anthropic.messages.create({
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `You are an expert at writing image generation prompts for social media marketing.

Post title: ${input.postTitle}
Post body: ${input.postBody}
User instruction: ${input.userCommand}

Write a detailed image generation prompt in English that:
- Uses the provided reference image as the visual reference for style, mood, lighting, and composition
- Captures the mood and style suitable for this post
- Is optimized for social media: vibrant, professional, eye-catching
- Incorporates the user's instruction
- Is suitable for the Hong Kong/Asian beauty/lifestyle market
- Avoids text overlays, logos, watermarks, and unreadable text

Return ONLY the prompt text, no explanation.`,
      },
    ],
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  })

  const firstContent = promptResponse.content[0]
  return firstContent?.type === 'text' ? firstContent.text : fallbackPrompt
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateWithReferenceBody
    const postId = asString(body.postId)
    const workspaceId = asString(body.workspaceId)
    const referenceImageUrl = asString(body.referenceImageUrl)
    const userCommand = asString(body.userCommand, 'Generate a high quality marketing image')

    if (!isUuid(postId) || !isUuid(workspaceId) || !referenceImageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const adminSupabase = createAdminSupabase()
    const { data: post, error: postError } = await adminSupabase
      .from('campaign_posts')
      .select('id,title,body,post_type,workspace_id,user_id,onboarding_session_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const imagePrompt = await writeImagePrompt({
      postBody: asString(post.body, asString(body.postBody)),
      postTitle: asString(post.title, asString(body.postTitle)),
      userCommand,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const referenceImage = await loadImageFile(referenceImageUrl)
    const imageResponse = await openai.images.edit({
      image: referenceImage,
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      output_format: 'jpeg',
      prompt: `${imagePrompt}\n\nUse the provided image as the visual reference. Create a new professional marketing image inspired by it, not a direct copy. No text overlays.`,
      quality: 'medium',
      size: '1024x1024',
    } as Parameters<typeof openai.images.edit>[0])

    const imageData = imageResponse as { data?: Array<{ b64_json?: string }> }
    const generatedBase64 = imageData.data?.[0]?.b64_json
    if (!generatedBase64) throw new Error('OpenAI returned no image data')

    const imageBytes = Buffer.from(generatedBase64, 'base64')
    let bucket = process.env.SUPABASE_POST_IMAGES_BUCKET || 'public-assets'
    const ownerFolder = asString(post.user_id, asString(post.onboarding_session_id, workspaceId))
    const storagePath = `post-images/${ownerFolder}/${postId}-ref-${Date.now()}.jpg`

    let { error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(storagePath, imageBytes, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError && /bucket not found/i.test(`${uploadError.message || uploadError}`) && bucket !== 'public-assets') {
      bucket = 'public-assets'
      const retry = await adminSupabase.storage
        .from(bucket)
        .upload(storagePath, imageBytes, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        })
      uploadError = retry.error
    }

    if (uploadError) throw uploadError

    const { data: publicUrlData } = adminSupabase.storage.from(bucket).getPublicUrl(storagePath)
    const imageUrl = publicUrlData.publicUrl

    const { error: updateError } = await adminSupabase
      .from('campaign_posts')
      .update({
        image_url: imageUrl,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error('[generate-with-reference]', error)
    return NextResponse.json(
      { error: 'Failed to generate image', detail: errorMessage(error) },
      { status: 500 }
    )
  }
}
