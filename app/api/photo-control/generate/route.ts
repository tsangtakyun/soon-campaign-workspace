import { NextRequest, NextResponse } from 'next/server'

type PhotoControlMode = 'full-freedom' | 'balanced' | 'minimal-changes'

const modePrompts: Record<PhotoControlMode, string> = {
  'full-freedom': [
    'Create a polished photorealistic lifestyle advertising image based on the uploaded product photo.',
    'The uploaded product must remain the clear hero subject: large, sharp, appetizing, and immediately recognizable in the foreground.',
    'If the product is coffee, keep the cup and latte art visible and dominant.',
    'Add one or two Asian people in a warm modern Asian cafe environment enjoying or reacting to the product, but keep people secondary and behind or around the hero product.',
    'The image should feel aspirational, emotional, creative, and campaign-level, with natural editorial morning light and premium social media composition.',
    'Supporting props must stay subtle. Do not add pastries or other food that competes with the product.',
    'No text, no logo, no watermark. Vertical Instagram advertising image.',
  ].join(' '),
  balanced: [
    'Create a refined photorealistic product lifestyle image based on the uploaded photo.',
    'Keep the product clearly recognizable as the main subject and preserve its key shape, material, identity, and appeal.',
    'If the product is coffee, the cup, saucer, latte art, and ceramic shape must be the largest, sharpest, most appetizing visual focus.',
    'Improve the background, lighting, table styling, color tone, and composition into a premium campaign image.',
    'Supporting props may include a small spoon, napkin, plant, or subtle cafe texture only.',
    'Do not add people, pastries, or any object that becomes more important than the product.',
    'No text, no logo, no watermark. Vertical Instagram product image.',
  ].join(' '),
  'minimal-changes': [
    'Retouch the uploaded photo with minimal changes.',
    'Keep the original angle, product appearance, composition, and main details intact.',
    'Only improve lighting, color tone, contrast, sharpness, and small imperfections while keeping the image realistic.',
    'Resize it to a suitable Instagram size if needed.',
  ].join(' '),
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  let payload: { mode?: PhotoControlMode; originalImageUrl?: string; prompt?: string }
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
    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    const form = new FormData()
    form.append('model', imageModel)
    form.append('image', sourceImage)
    form.append('prompt', prompt)
    form.append('size', '1024x1536')
    form.append('quality', 'high')
    form.append('input_fidelity', mode === 'full-freedom' ? 'low' : 'high')

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

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${base64}`,
      model: result?.model || imageModel,
      usage: result?.usage || null,
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
