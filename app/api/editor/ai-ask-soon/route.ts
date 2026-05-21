import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getUserCredits, spendCredits } from '@/lib/credits'
import { createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

const AI_ASK_SOON_CREDIT_COST = 10

type AiAskSoonBody = {
  imageBase64?: string
  prompt?: string
  workspaceId?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function parseDataUrlImage(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid imageBase64 data URL')

  return {
    buffer: Buffer.from(match[2], 'base64'),
    mimeType: match[1],
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as AiAskSoonBody
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''

    if (!prompt || !imageBase64 || !workspaceId) {
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

    const credits = await getUserCredits(user.id)
    if (!credits || credits.balance < AI_ASK_SOON_CREDIT_COST) {
      return NextResponse.json(
        {
          balance: credits?.balance ?? 0,
          error: 'INSUFFICIENT_CREDITS',
          required: AI_ASK_SOON_CREDIT_COST,
        },
        { status: 402 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const { buffer, mimeType } = parseDataUrlImage(imageBase64)
    const extension = mimeType.split('/')[1] || 'png'
    const imageFile = new File([buffer], `canvas.${extension}`, { type: mimeType })

    const openai = new OpenAI({ apiKey })
    const response = await openai.images.edit({
      image: [imageFile],
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      n: 1,
      prompt: `${prompt}. Keep all people, products and text in the original image exactly as they are. Only modify the background.`,
      size: '1024x1024',
    } as Parameters<typeof openai.images.edit>[0])

    const imageData = (response as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0]
    const imageUrl = imageData?.url || (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '')

    if (!imageUrl) throw new Error('No edited image returned')

    const creditsRemaining = await spendCredits(
      user.id,
      AI_ASK_SOON_CREDIT_COST,
      'AI Ask SOON canvas image edit',
      'photo-generation'
    )

    return NextResponse.json({
      creditsRemaining,
      creditsUsed: AI_ASK_SOON_CREDIT_COST,
      imageUrl,
    })
  } catch (error) {
    console.error('[editor/ai-ask-soon]', error)
    return NextResponse.json(
      { error: 'Failed to edit canvas image', detail: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
