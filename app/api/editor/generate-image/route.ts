import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getUserCredits, spendCredits } from '@/lib/credits'
import { createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60
const EDITOR_IMAGE_CREDIT_COST = 5

type GenerateEditorImageBody = {
  prompt?: string
  size?: string
  style?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateEditorImageBody
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
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
    if (!credits || credits.balance < EDITOR_IMAGE_CREDIT_COST) {
      return NextResponse.json(
        {
          balance: credits?.balance ?? 0,
          error: 'INSUFFICIENT_CREDITS',
          required: EDITOR_IMAGE_CREDIT_COST,
        },
        { status: 402 }
      )
    }

    const sizeMap: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
      landscape: '1792x1024',
      portrait: '1024x1792',
      square: '1024x1024',
    }
    const imageSize = sizeMap[body.size || 'square'] || '1024x1024'
    const styleInstruction = body.style === 'illustration' ? 'Illustration style.' : 'Professional photography style.'

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const response = await openai.images.generate({
      model: 'dall-e-3',
      n: 1,
      prompt: `${prompt}. ${styleInstruction} High quality marketing image, suitable for social media. No text overlays.`,
      quality: 'standard',
      size: imageSize,
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) throw new Error('No image generated')

    const remaining = await spendCredits(
      user.id,
      EDITOR_IMAGE_CREDIT_COST,
      '設計編輯器 AI 圖片生成',
      'photo-generation'
    )

    return NextResponse.json({
      creditsRemaining: remaining,
      creditsUsed: EDITOR_IMAGE_CREDIT_COST,
      imageUrl,
    })
  } catch (error) {
    console.error('[editor/generate-image]', error)
    return NextResponse.json(
      { error: 'Failed to generate image', detail: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
