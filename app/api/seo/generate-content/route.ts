import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getUserCredits, spendCredits } from '@/lib/credits'
import { createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

const SEO_CONTENT_CREDIT_COST = 5

type GenerateSeoContentBody = {
  keyword?: string
  platform?: string
  tone?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function extractText(content: unknown) {
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (part && typeof part === 'object' && 'type' in part && part.type === 'text' && 'text' in part) {
        return typeof part.text === 'string' ? part.text : ''
      }
      return ''
    })
    .join('\n')
    .trim()
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateSeoContentBody
    const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'IG Caption'
    const tone = typeof body.tone === 'string' ? body.tone.trim() : '教育性'

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword required' }, { status: 400 })
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
    if (!credits || credits.balance < SEO_CONTENT_CREDIT_COST) {
      return NextResponse.json(
        {
          balance: credits?.balance ?? 0,
          error: 'INSUFFICIENT_CREDITS',
          required: SEO_CONTENT_CREDIT_COST,
        },
        { status: 402 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        max_tokens: 900,
        model: process.env.ANTHROPIC_SEO_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        system: '你係一個專業社交媒體內容創作者，專注香港美容護膚市場。請用繁體中文撰寫。',
        messages: [
          {
            role: 'user',
            content: `請為關鍵詞「${keyword}」撰寫一篇${platform}內容，風格為${tone}，字數約200-300字，包含3個相關hashtag，適合香港受眾。`,
          },
        ],
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Anthropic API request failed')
    }

    const generatedContent = extractText(data?.content)
    if (!generatedContent) throw new Error('No content generated')

    const creditsRemaining = await spendCredits(
      user.id,
      SEO_CONTENT_CREDIT_COST,
      `SEO 社交內容生成：${keyword}`,
      'seo-social-content'
    )

    return NextResponse.json({
      content: generatedContent,
      creditsRemaining,
      creditsUsed: SEO_CONTENT_CREDIT_COST,
    })
  } catch (error) {
    console.error('[seo/generate-content]', error)
    return NextResponse.json(
      { error: 'Failed to generate SEO content', detail: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
