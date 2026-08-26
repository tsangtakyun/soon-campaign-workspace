import { NextResponse } from 'next/server'

import {
  BECHILL_REFERENCE_PROMPT,
  isBechillBrand,
  loadBechillReferenceFiles,
} from '@/lib/bechill-brand-references'
import { createAdminSupabase } from '@/lib/server-supabase'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const maxDuration = 60

type GeneratePostImageBody = {
  postId?: string
}

const WRONG_WEBSITE_IMAGE_POST_ID = '473d2688-e1f1-4625-b3c1-96128052442f'
const OWN_SUPABASE_STORAGE_PREFIX = 'https://auth.sooncreator.network/storage/v1/object/public/'
const ALLOWED_GENERATED_IMAGE_HOSTS = new Set([
  'auth.sooncreator.network',
  'cdn.fal.ai',
  'fal.media',
  'fal.run',
  'storage.googleapis.com',
])

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isAllowedGeneratedImageUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    if (value.startsWith(OWN_SUPABASE_STORAGE_PREFIX)) return true
    return (
      ALLOWED_GENERATED_IMAGE_HOSTS.has(hostname) ||
      hostname.endsWith('.fal.run') ||
      hostname.endsWith('.supabase.co')
    )
  } catch {
    return false
  }
}

function isWebsiteScrapeImageUrl(value: string | null) {
  if (!value) return false
  if (value.startsWith('/api/website-image')) return true

  try {
    const url = new URL(value, 'https://sooncreator.network')
    const hostname = url.hostname.toLowerCase()
    const rawUrl = url.toString().toLowerCase()
    const proxiedUrl = url.searchParams.get('url') || ''
    const decodedProxiedUrl = decodeURIComponent(proxiedUrl).toLowerCase()

    return (
      url.pathname.startsWith('/api/website-image') ||
      hostname === 'static.wix.com' ||
      hostname === 'static.wixstatic.com' ||
      hostname.endsWith('.wixstatic.com') ||
      rawUrl.includes('/api/website-image') ||
      decodedProxiedUrl.includes('wixstatic.com') ||
      decodedProxiedUrl.includes('static.wix.com')
    )
  } catch {
    return false
  }
}

async function retryOnce<T>(operation: () => Promise<T>, onFailure: (error: unknown) => void) {
  try {
    return await operation()
  } catch (error) {
    onFailure(error)
    await new Promise((resolve) => setTimeout(resolve, 5000))
    return operation()
  }
}

function contentMoodPrompts(value: unknown): string[] {
  const record = asRecord(value)
  const selectedMoods = Array.isArray(record.selectedMoods) ? record.selectedMoods : []
  return selectedMoods
    .map((item) => asString(asRecord(item).generationMood, asString(asRecord(item).label)))
    .filter(Boolean)
}

const VISUAL_STYLE_PROMPTS: Record<string, string> = {
  korean_drama:
    'soft indoor diffused lighting, cool white balance, teal-green shadows, lifted milky highlights, Korean drama aesthetic',
  hard_boost: 'hard lighting, high contrast, vivid saturation, bold commercial photography style',
  japanese_film: 'soft diffused light, slightly underexposed, muted warm midtones, slight green in shadows, film grain',
  magic_hour: 'golden hour warm tones, cinematic amber color grade',
  natural_boost: 'natural light, neutral color tone, clean and fresh',
  lush_green: 'soft natural light, rich green tones, organic feel',
}

const CONTENT_MOOD_PROMPTS: Record<string, string> = {
  authentic_daily:
    'candid lifestyle photography, unposed real moments, imperfect and relatable, shot on phone aesthetic, genuine expressions, everyday home or street setting, not studio, not posed, feels like a friend took the photo',
  street_trendy:
    'urban street setting, bold editorial composition, fashion-forward framing, strong shadows, graphic elements, city backdrop, trendy Gen-Z aesthetic, magazine editorial style',
  humorous: 'playful, fun, comedic visual style',
  educational: 'clean informational layout, clear product focus',
  warm_caring: 'warm intimate tone, soft emotional feel',
  cinematic_ad: 'high production commercial advertisement style',
}

const PHOTO_CONTROL_PROMPTS: Record<string, string> = {
  full_freedom:
    'Full creative freedom: AI can reimagine the scene completely, add people, change environment, create new narrative around the product, and produce an advertising-quality image while preserving the brand and product essence.',
  balanced:
    'Balanced creative changes: keep the product recognizable while improving background, lighting, and composition.',
  minimal:
    'Minimal changes: keep the original product fully recognizable and only refine lighting, color tone, and details.',
  strict_brand_control:
    'Strict brand control: use only the exact uploaded brand assets without changing the original product or composition.',
}

function normalizeId(value: unknown) {
  return asString(value).replace(/-/g, '_')
}

function mappedVisualStylePrompt(value: unknown) {
  const id = normalizeId(value)
  return VISUAL_STYLE_PROMPTS[id] || ''
}

function mappedContentMoodPrompts(value: unknown) {
  const moodAliases: Record<string, string> = {
    funny: 'humorous',
    lifestyle: 'authentic_daily',
    cinematic: 'cinematic_ad',
    warm: 'warm_caring',
    street: 'street_trendy',
  }

  const ids = Array.isArray(value) ? value : []
  return ids
    .map((item) => moodAliases[normalizeId(item)] || normalizeId(item))
    .map((id) => CONTENT_MOOD_PROMPTS[id] || '')
    .filter(Boolean)
}

function contentMoodIdsFromPreference(value: unknown) {
  const record = asRecord(value)
  const selectedMoods = Array.isArray(record.selectedMoods) ? record.selectedMoods : []
  return selectedMoods
    .map((item) => normalizeId(asRecord(item).id) || normalizeId(asRecord(item).label))
    .filter(Boolean)
}

function mappedPhotoControlPrompt(value: unknown) {
  const id = normalizeId(value)
  if (id === 'full') return PHOTO_CONTROL_PROMPTS.full_freedom
  if (id === 'strict') return PHOTO_CONTROL_PROMPTS.strict_brand_control
  return PHOTO_CONTROL_PROMPTS[id] || ''
}

const ALL_COMPOSITIONS = [
  'extreme close-up of product texture or skin detail',
  'wide lifestyle scene with person in environment',
  'flat lay of products arranged aesthetically',
  'candid over-the-shoulder or mirror shot',
  'dramatic single subject with negative space',
  'split scene or before/after style',
]

const COMPOSITIONS_BY_POST_TYPE: Record<string, string[]> = {
  still_image: ALL_COMPOSITIONS,
  still_images: ALL_COMPOSITIONS,
  'still-image': ALL_COMPOSITIONS,
  'still-images': ALL_COMPOSITIONS,
  carousel: ['flat lay of products arranged aesthetically', 'split scene or before/after style'],
  carousels: ['flat lay of products arranged aesthetically', 'split scene or before/after style'],
  short_video: [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  short_videos: [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  short_form_video: [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  'short-form-video': [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  feed_video: [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  feed_videos: [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  'feed-videos': [
    'wide lifestyle scene with person in environment',
    'candid over-the-shoulder or mirror shot',
  ],
  email: ['extreme close-up of product texture or skin detail'],
  emails: ['extreme close-up of product texture or skin detail'],
}

function hashString(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0
  }, 0)
}

function compositionForPost(postType: unknown, postId: string) {
  const normalizedPostType = normalizeId(postType)
  const options = COMPOSITIONS_BY_POST_TYPE[normalizedPostType] || ALL_COMPOSITIONS
  return options[hashString(`${postId}:${normalizedPostType}`) % options.length]
}

function imagePrompt(input: {
  postId: string
  topic: string
  postType: string
  compositionDirection: string
  visualStyleKeywords: string
  photoControlPrompt: string
  contentMoods: string[]
  styleInstruction: string
  businessName: string
  businessType: string
  productImageUrl: string | null
  referenceImageUrl: string | null
}) {
  const moodDescription = input.contentMoods.join(', ')

  return `
Create a social media ${input.postType} image for ${input.businessName} (${input.businessType}).

Content topic: ${input.topic}

Visual style: ${input.visualStyleKeywords}

Content mood: ${moodDescription}

Composition direction: ${input.compositionDirection}

Photo direction: ${input.photoControlPrompt}

Style instructions: ${input.styleInstruction}

${input.productImageUrl ? 'Base this image on the product/scene shown in the reference product photo. Keep the product recognizable.' : ''}

${input.referenceImageUrl ? 'Match the visual mood, lighting and composition style of the reference image provided.' : ''}

Avoid repeating the same default portrait composition. Do not make every image a pretty person holding a skincare product. Vary camera angle, subject distance, framing, background, and product placement based on the composition direction.

The image should be optimized for social media, square format (1:1), high quality, no text overlays.
`.trim()
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformUser()
    if (auth.error) return auth.error
    if (!(await consumeApiQuota(auth.access.user.id, 'generate-post-image', 20))) {
      return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
    }

    console.log('[generate-post-image] request received')

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[generate-post-image] missing OPENAI_API_KEY')
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const body = (await request.json()) as GeneratePostImageBody
    const postId = asString(body.postId)
    console.log('[generate-post-image] payload:', {
      postId,
    })

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    const supabase = createAdminSupabase()
    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .select('id,campaign_id,user_id,workspace_id,onboarding_session_id,title,body,post_type,captions,visual_style,content_mood,typeface,photo_control')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      console.error('[generate-post-image] post not found:', { postId, postError })
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!post.workspace_id) {
      return NextResponse.json({ error: 'Post is not assigned to a workspace' }, { status: 403 })
    }
    const workspaceAccess = await getWorkspaceAccess({
      email: auth.access.user.email,
      userId: auth.access.user.id,
      workspaceId: post.workspace_id,
    })
    if (!workspaceAccess?.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (postId === WRONG_WEBSITE_IMAGE_POST_ID) {
      const { error: resetError } = await supabase
        .from('campaign_posts')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', WRONG_WEBSITE_IMAGE_POST_ID)
        .eq('workspace_id', post.workspace_id)
        .like('image_url', '%/api/website-image%')

      if (resetError) {
        console.error('[generate-post-image] failed to reset wrong website image URL:', { postId, error: resetError })
      }
    }

    const ownerFilter = post.workspace_id
      ? { column: 'workspace_id', value: post.workspace_id }
      : post.user_id
      ? { column: 'user_id', value: post.user_id }
      : { column: 'onboarding_session_id', value: post.onboarding_session_id }

    const [{ data: brandKitRows }, { data: preferenceRows }, { data: workspaceRow }] = await Promise.all([
      supabase
        .from('brand_kits')
        .select('business_name,business_type,visual_style_id,visual_style_keywords')
        .eq(ownerFilter.column, ownerFilter.value)
        .limit(1),
      supabase
        .from('content_preferences')
        .select('photo_control_id,photo_control_prompt,content_mood,raw_photo_control,raw_content_mix')
        .eq(ownerFilter.column, ownerFilter.value)
        .limit(1),
      post.workspace_id
        ? supabase.from('workspaces').select('name').eq('id', post.workspace_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const brandKit = asRecord(brandKitRows?.[0])
    const isBechill =
      isBechillBrand(brandKit.business_name) || isBechillBrand(workspaceRow?.name)
    const preferences = asRecord(preferenceRows?.[0])
    const captions = asRecord(post.captions)
    const topicPayload = asRecord(captions.topic)
    const productImageUrl = asString(captions.productImage) || asString(topicPayload.productImage) || null
    const referenceImageUrl = asString(captions.referenceImage) || asString(topicPayload.referenceImage) || null
    if (isWebsiteScrapeImageUrl(productImageUrl)) {
      console.error('[generate-post-image] blocked website scrape image as generation source:', {
        postId,
        productImageUrl,
      })
      await supabase
        .from('campaign_posts')
        .update({
          image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
      return NextResponse.json(
        { success: false, error: 'Source is website image, not AI generated' },
        { status: 400 }
      )
    }

    const improvedImagePrompt = asString(captions.improvedImagePrompt)
    const contentMoods =
      Array.isArray(captions.contentMoods) && captions.contentMoods.every((item) => typeof item === 'string')
        ? (captions.contentMoods as string[])
        : contentMoodPrompts(preferences.content_mood || asRecord(preferences.raw_content_mix).contentMood)
    const rawPhotoControl = asRecord(preferences.raw_photo_control)
    const mappedVisualStyle = mappedVisualStylePrompt(post.visual_style || brandKit.visual_style_id)
    const preferenceMoodIds = contentMoodIdsFromPreference(
      preferences.content_mood || asRecord(preferences.raw_content_mix).contentMood
    )
    const mappedMoods = mappedContentMoodPrompts(
      Array.isArray(post.content_mood) && post.content_mood.length ? post.content_mood : preferenceMoodIds
    )
    const mappedPhotoControl = mappedPhotoControlPrompt(post.photo_control || preferences.photo_control_id)
    const storedPhotoControlPrompt = asString(
      preferences.photo_control_prompt,
      asString(rawPhotoControl.generationPrompt, 'Create a polished brand-ready image.')
    )
    const photoControlInstruction = mappedPhotoControl || storedPhotoControlPrompt
    const compositionDirection = compositionForPost(post.post_type, postId)
    const styleInstruction = [
      mappedVisualStyle,
      ...mappedMoods,
      `Composition: ${compositionDirection}`,
      photoControlInstruction,
      post.typeface ? `Typography direction: ${normalizeId(post.typeface).replace(/_/g, ' ')}` : '',
      isBechill ? BECHILL_REFERENCE_PROMPT : '',
    ]
      .filter(Boolean)
      .join('. ')
    const prompt = imagePrompt({
      postId,
      topic: improvedImagePrompt || asString(post.title, asString(post.body, 'Create a brand-relevant social media post image.')),
      postType: asString(post.post_type, 'social media post'),
      compositionDirection,
      visualStyleKeywords: [
        mappedVisualStyle,
        asString(brandKit.visual_style_keywords, 'clean, polished, social media ready'),
      ]
        .filter(Boolean)
        .join(', '),
      photoControlPrompt: photoControlInstruction,
      contentMoods: [...mappedMoods, ...contentMoods],
      styleInstruction,
      productImageUrl,
      referenceImageUrl,
      businessName: asString(brandKit.business_name, 'SOON brand'),
      businessType: asString(brandKit.business_type, 'business'),
    })

    console.log('[generate-post-image] post context loaded:', {
      postId,
      postType: post.post_type,
      hasProductImage: Boolean(productImageUrl),
      hasReferenceImage: Boolean(referenceImageUrl),
      hasVisualStyleKeywords: Boolean(brandKit.visual_style_keywords),
      hasImprovedImagePrompt: Boolean(improvedImagePrompt),
      visualStyle: post.visual_style,
      contentMood: post.content_mood,
      photoControl: post.photo_control,
      styleInstruction,
      compositionDirection,
      moodCount: contentMoods.length,
      mandatoryBrandReferenceCount: isBechill ? 5 : 0,
    })

    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
    console.log('[generate-post-image] calling OpenAI image API:', {
      postId,
      model: imageModel,
      mode: productImageUrl ? 'edit' : 'generation',
    })

    const brandReferenceFiles = isBechill ? await loadBechillReferenceFiles() : []
    let generatedBase64 = ''
    try {
      generatedBase64 = await retryOnce(
        () =>
          productImageUrl
            ? editImageFromProduct({
                apiKey,
                model: imageModel,
                prompt,
                productImageUrl,
                brandReferenceFiles,
              })
            : brandReferenceFiles.length
              ? editImageFromBrandReferences({
                  apiKey,
                  model: imageModel,
                  prompt,
                  brandReferenceFiles,
                })
            : generateImage({
                apiKey,
                model: imageModel,
                prompt,
              }),
        (error) => {
          console.error('Image generation failed for post:', postId, error)
          console.log('[generate-post-image] retrying once after 5 seconds:', { postId })
        }
      )
    } catch (error) {
      console.error('Image generation failed for post:', postId, error)
      await supabase
        .from('campaign_posts')
        .update({
          image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
      return NextResponse.json(
        { success: false, error: errorMessage(error) },
        { status: 500 }
      )
    }

    console.log('[generate-post-image] OpenAI image generated:', { postId })

    const imageBytes = Buffer.from(generatedBase64, 'base64')
    const ownerFolder = post.user_id || post.onboarding_session_id || 'anonymous'
    let bucket = process.env.SUPABASE_POST_IMAGES_BUCKET || 'public-assets'
    const storagePath = `post-images/${ownerFolder}/${postId}.jpg`

    let { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, imageBytes, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError && /bucket not found/i.test(`${uploadError.message || uploadError}`) && bucket !== 'public-assets') {
      console.error('[generate-post-image] configured storage bucket not found, retrying public-assets:', {
        postId,
        configuredBucket: bucket,
        error: uploadError,
      })
      bucket = 'public-assets'
      const retry = await supabase.storage
        .from(bucket)
        .upload(storagePath, imageBytes, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        })
      uploadError = retry.error
    }

    if (uploadError) throw uploadError
    console.log('[generate-post-image] image uploaded:', { postId, bucket, storagePath })

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const imageUrl = publicUrlData.publicUrl
    if (!isAllowedGeneratedImageUrl(imageUrl)) {
      throw new Error(`Generated image URL is not an allowed generated-image domain: ${imageUrl}`)
    }

    const { error: updateError } = await supabase
      .from('campaign_posts')
      .update({
        image_url: imageUrl,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Failed to update post image:', { postId, imageUrl, error: updateError })
      throw updateError
    }
    console.log('Updated post image:', postId, imageUrl)
    console.log('[generate-post-image] campaign post updated:', { postId, imageUrl })

    if (post.campaign_id) {
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('cover_image_url')
        .eq('id', post.campaign_id)
        .maybeSingle()

      if (!campaign?.cover_image_url) {
        const { error: campaignUpdateError } = await supabase
          .from('marketing_campaigns')
          .update({
            cover_image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.campaign_id)

        if (campaignUpdateError) {
          console.error('[generate-post-image] failed to update campaign cover:', {
            campaignId: post.campaign_id,
            error: campaignUpdateError,
            imageUrl,
            postId,
          })
        } else {
          console.log('[generate-post-image] campaign cover image updated:', {
            campaignId: post.campaign_id,
            imageUrl,
            postId,
          })
        }
      }
    }

    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error('[generate-post-image]', error)
    return NextResponse.json(
      { success: false, error: errorMessage(error) },
      { status: 500 }
    )
  }
}

async function generateImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string
  model: string
  prompt: string
}) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'jpeg',
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('[generate-post-image] OpenAI generation error:', data)
    throw new Error(data?.error?.message || 'OpenAI image generation failed')
  }

  const base64 = data?.data?.[0]?.b64_json
  if (!base64) throw new Error('OpenAI returned no image data')
  return base64 as string
}

async function editImageFromProduct({
  apiKey,
  model,
  prompt,
  productImageUrl,
  brandReferenceFiles = [],
}: {
  apiKey: string
  model: string
  prompt: string
  productImageUrl: string
  brandReferenceFiles?: File[]
}) {
  const productImage = await loadImageFile(productImageUrl)
  const form = new FormData()
  form.append('model', model)
  if (brandReferenceFiles.length) {
    form.append('image[]', productImage)
    brandReferenceFiles.forEach((reference) => form.append('image[]', reference))
  } else {
    form.append('image', productImage)
  }
  form.append('prompt', prompt)
  form.append('size', '1024x1024')
  form.append('quality', 'medium')
  form.append('output_format', 'jpeg')

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('[generate-post-image] OpenAI edit error:', data)
    throw new Error(data?.error?.message || 'OpenAI image edit failed')
  }

  const base64 = data?.data?.[0]?.b64_json
  if (!base64) throw new Error('OpenAI returned no image data')
  return base64 as string
}

async function editImageFromBrandReferences({
  apiKey,
  model,
  prompt,
  brandReferenceFiles,
}: {
  apiKey: string
  model: string
  prompt: string
  brandReferenceFiles: File[]
}) {
  const form = new FormData()
  form.append('model', model)
  brandReferenceFiles.forEach((reference) => form.append('image[]', reference))
  form.append('prompt', prompt)
  form.append('size', '1024x1024')
  form.append('quality', 'medium')
  form.append('output_format', 'jpeg')
  form.append('input_fidelity', 'high')

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('[generate-post-image] OpenAI brand-reference edit error:', data)
    throw new Error(data?.error?.message || 'OpenAI image edit failed')
  }
  const base64 = data?.data?.[0]?.b64_json
  if (!base64) throw new Error('OpenAI returned no image data')
  return base64 as string
}

async function loadImageFile(imageUrl: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    console.error('[generate-post-image] unable to load product image:', {
      imageUrl,
      status: response.status,
    })
    throw new Error(`Unable to load product image (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const bytes = await response.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const decoded = Buffer.from(base64, 'base64')

  return new File([decoded], 'product-reference.jpg', { type: contentType })
}
