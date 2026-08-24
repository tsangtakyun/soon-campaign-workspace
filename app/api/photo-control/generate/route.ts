import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PHOTO_GENERATION_CREDIT_COST, getUserCredits, spendCredits } from '@/lib/credits'
import {
  BECHILL_REFERENCE_PROMPT,
  isBechillBrand,
  loadBechillReferenceFiles,
} from '@/lib/bechill-brand-references'
import { createServerSupabase } from '@/lib/server-supabase'

type PhotoControlMode = 'minimal' | 'balanced' | 'full' | 'strict'

const modePrompts: Record<PhotoControlMode, string> = {
  minimal: [
    'Keep the original product fully recognizable.',
    'Only make minimal adjustments: slightly improve lighting, refine color tone, sharpen details.',
    'Do not change the composition, background, or add any new elements.',
    'The result should look like a professionally edited version of the original photo.',
  ].join(' '),
  balanced: [
    'Keep the main product recognizable but make moderate creative improvements.',
    'Enhance the background environment, improve lighting quality, add complementary props if needed.',
    'The product should remain the clear focal point but the overall image should feel more polished and brand-ready.',
  ].join(' '),
  full: [
    'Use the uploaded image as creative inspiration only.',
    'Feel free to completely reimagine the scene — add people, change the environment, introduce lifestyle elements, create an editorial or advertising quality image.',
    'The result can look significantly different from the original as long as it captures the brand and product essence.',
  ].join(' '),
  strict: [
    'Use only the exact uploaded brand assets without any AI modification.',
    'Do not alter the composition, lighting, or any element of the original image.',
  ].join(' '),
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id) {
    const credits = await getUserCredits(user.id)
    if (!credits || credits.balance < PHOTO_GENERATION_CREDIT_COST) {
      return NextResponse.json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'INSUFFICIENT_CREDITS',
        balance: credits?.balance || 0,
        required: PHOTO_GENERATION_CREDIT_COST,
      }, { status: 402 })
    }
  }

  let payload: {
    brandName?: string
    mode?: PhotoControlMode
    originalImageUrl?: string
    referenceImageUrls?: string[]
    prompt?: string
    requestedSize?: 'square' | 'landscape' | 'portrait'
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const mode = payload.mode || 'balanced'
  const prompt = payload.prompt || modePrompts[mode]
  const originalImageUrl = payload.originalImageUrl || '/photo-control/coffee-original.jpg'

  if (!modePrompts[mode]) {
    return NextResponse.json({ error: 'Invalid photo control mode' }, { status: 400 })
  }

  try {
    const sourceImage = await loadImage(originalImageUrl, request)
    const referenceImageUrls = Array.isArray(payload.referenceImageUrls)
      ? payload.referenceImageUrls.filter((value): value is string => typeof value === 'string' && value.length > 0).slice(0, 4)
      : []
    const referenceImages = await Promise.all(
      referenceImageUrls.map((source) => loadImage(source, request)),
    )
    const bechillReferenceImages = isBechillBrand(payload.brandName)
      ? await loadBechillReferenceFiles()
      : []
    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    const requestedSize = payload.requestedSize || 'portrait'
    const outputSize = requestedSize === 'landscape'
      ? '1536x1024'
      : requestedSize === 'square'
        ? '1024x1024'
        : '1024x1536'
    const form = new FormData()
    form.append('model', imageModel)
    if (referenceImages.length || bechillReferenceImages.length) {
      form.append('image[]', sourceImage)
      referenceImages.forEach((image) => form.append('image[]', image))
      bechillReferenceImages.forEach((image) => form.append('image[]', image))
    } else {
      form.append('image', sourceImage)
    }
    form.append(
      'prompt',
      bechillReferenceImages.length ? `${prompt} ${BECHILL_REFERENCE_PROMPT}` : prompt,
    )
    form.append('size', outputSize)
    form.append('quality', 'high')
    form.append('input_fidelity', mode === 'full' ? 'low' : 'high')

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    })

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error?.message || 'Unable to generate image' },
        { status: response.status }
      )
    }

    const base64 = result?.data?.[0]?.b64_json
    if (!base64) {
      return NextResponse.json({ error: 'Image API returned no image' }, { status: 502 })
    }

    let remainingCredits: number | null = null
    if (user?.id) {
      remainingCredits = await spendCredits(
        user.id,
        PHOTO_GENERATION_CREDIT_COST,
        '生成相片預覽',
        'photo-generation',
      )
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${base64}`,
      model: result?.model || imageModel,
      usage: result?.usage || null,
      credits: user?.id ? {
        spent: PHOTO_GENERATION_CREDIT_COST,
        remaining: remainingCredits,
      } : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to generate image' }, { status: 500 })
  }
}

async function loadImage(source: string, request: NextRequest) {
  if (source.startsWith('data:')) {
    const match = source.match(/^data:(.+?);base64,(.+)$/)
    if (!match) throw new Error('Invalid data image')
    const [, mimeType, base64] = match
    const bytes = Buffer.from(base64, 'base64')
    return new File([bytes], 'source-image.png', { type: mimeType })
  }

  const url = source.startsWith('http')
    ? source
    : new URL(source, request.nextUrl.origin).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load source image (${response.status})`)

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const bytes = await response.arrayBuffer()
  return new File([bytes], 'source-image.jpg', { type: contentType })
}
