import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

type GenerateWithReferenceBody = {
  currentPostImageUrl?: string
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

async function loadImageFile(imageUrl: string, filename: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Unable to load image (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const bytes = await response.arrayBuffer()
  return new File([bytes], filename, { type: contentType })
}

async function writeImagePrompt(input: {
  currentPostImageUrl: string
  postBody: string
  postTitle: string
  referenceImageUrl: string | null
  userCommand: string
}) {
  const fallbackPrompt = `
Professional social media marketing image for Hong Kong/Asian beauty and lifestyle market.
Post title: ${input.postTitle}
Post body: ${input.postBody}
Instruction: ${input.userCommand}
The current post image is the base image to edit.
${input.referenceImageUrl ? 'Use the reference image as an additional visual reference as instructed.' : 'No extra reference image is provided.'}
Apply the user's instruction while maintaining professional marketing quality. No text overlays.
`.trim()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackPrompt

  const anthropic = new Anthropic({ apiKey })
  const promptResponse = await anthropic.messages.create({
    messages: [
      {
        role: 'user',
        content: `You are an expert at writing image editing prompts for social media marketing.

Current post image: this is the BASE image to edit
Post title: ${input.postTitle}
Post body: ${input.postBody}
User instruction: ${input.userCommand}
${input.referenceImageUrl ? 'Reference image provided: yes (use it as visual reference for style/person/product to incorporate)' : 'No reference image provided'}

Write a detailed image editing prompt in English that:
- Starts from the current post image as the base
- Applies the user's instruction to modify/enhance it
${input.referenceImageUrl ? '- Incorporates elements from the reference image as instructed' : ''}
- Incorporates the user's instruction
- Maintains professional marketing quality
- Is suitable for the Hong Kong/Asian beauty/lifestyle market
- No text overlays in the image

Return ONLY the prompt text, no explanation.`,
      },
    ],
    max_tokens: 600,
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
    const userCommand = asString(body.userCommand)
    const currentPostImageUrl = asString(body.currentPostImageUrl)

    if (!isUuid(postId) || !isUuid(workspaceId) || !currentPostImageUrl || !userCommand) {
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
      .select('id,title,body,post_type,image_url,workspace_id,user_id,onboarding_session_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const imagePrompt = await writeImagePrompt({
      currentPostImageUrl,
      postBody: asString(post.body, asString(body.postBody)),
      postTitle: asString(post.title, asString(body.postTitle)),
      referenceImageUrl: referenceImageUrl || null,
      userCommand,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const currentPostImage = await loadImageFile(currentPostImageUrl, 'base-image.jpg')
    const imageInputs: File[] = [currentPostImage]
    if (referenceImageUrl) {
      const referenceImage = await loadImageFile(referenceImageUrl, 'reference.jpg')
      imageInputs.push(referenceImage)
    }
    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
    const imagePromptWithReferences = referenceImageUrl
      ? `${imagePrompt}

Use the first image as the base image. Use the second image only as an additional reference as instructed. Professional marketing photography, Asian beauty market style. No text overlays.`
      : imagePrompt

    let imageResponse: Awaited<ReturnType<typeof openai.images.edit>>
    try {
      imageResponse = await openai.images.edit({
        image: imageInputs.length === 1 ? imageInputs[0] : imageInputs,
        model: imageModel,
        output_format: 'jpeg',
        prompt: imagePromptWithReferences,
        quality: 'medium',
        size: '1024x1024',
      } as Parameters<typeof openai.images.edit>[0])
    } catch (error) {
      if (imageInputs.length === 1) throw error
      console.error('[generate-with-reference] multi-image edit failed, retrying with base image only:', error)
      imageResponse = await openai.images.edit({
        image: currentPostImage,
        model: imageModel,
        output_format: 'jpeg',
        prompt: `${imagePromptWithReferences}

Reference image URL: ${referenceImageUrl}`,
        quality: 'medium',
        size: '1024x1024',
      } as Parameters<typeof openai.images.edit>[0])
    }

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
