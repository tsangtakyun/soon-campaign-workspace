import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import React from 'react'

import { anthropicModel } from '@/lib/anthropic-models'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'
import { createAdminSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const runtime = 'nodejs'
export const maxDuration = 60

type CarouselPage = {
  page: string
  headline: string
  subheadline: string
  body: string[]
  layout: 'cover' | 'editorial_article' | 'cta'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseJsonObject(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(clean)
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1))
    throw new Error('AI response is not valid JSON')
  }
}

function normalizePages(value: unknown, title: string, body: string, brandName: string): CarouselPage[] {
  const source = Array.isArray(value) ? value : []
  const pages = source.slice(0, 8).map((item, index) => {
    const page = asRecord(item)
    const paragraphs = Array.isArray(page.body)
      ? page.body.map((paragraph) => asString(paragraph)).filter(Boolean).slice(0, 3)
      : []
    return {
      page: `P.${index + 1}`,
      headline: asString(page.headline, index === 0 ? title : `重點 ${index}`),
      subheadline: asString(page.subheadline),
      body: paragraphs,
      layout: index === 0
        ? 'cover'
        : page.layout === 'cta' || index === source.length - 1
          ? 'cta'
          : 'editorial_article',
    } satisfies CarouselPage
  })

  if (pages.length >= 4) return pages
  const summary = body.replace(/\s+/g, ' ').trim()
  return [
    { page: 'P.1', headline: title, subheadline: `${brandName} 專業拆解`, body: [], layout: 'cover' },
    { page: 'P.2', headline: '點解值得留意？', subheadline: '', body: [summary || '先了解身體發出嘅訊號，避免問題持續累積'], layout: 'editorial_article' },
    { page: 'P.3', headline: '每個人情況都不同', subheadline: '', body: ['症狀位置未必等於問題來源', '訓練量、活動模式同恢復狀態都需要一併考慮'], layout: 'editorial_article' },
    { page: 'P.4', headline: '由專業評估開始', subheadline: '', body: ['先找出影響活動能力嘅因素', '再按個人需要制定循序漸進嘅處理方向'], layout: 'editorial_article' },
    { page: 'P.5', headline: '唔需要自己估', subheadline: '', body: ['如果不適持續、反覆出現或影響日常活動，應尋求合資格專業人士評估'], layout: 'editorial_article' },
    { page: 'P.6', headline: '想了解自己嘅情況？', subheadline: `聯絡 ${brandName}`, body: ['預約專業評估，搵出適合你嘅下一步'], layout: 'cta' },
  ]
}

async function planCarousel(input: {
  title: string
  body: string
  brandName: string
  businessType: string
  audience: unknown
  campaignTheme: unknown
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return normalizePages([], input.title, input.body, input.brandName)

  const prompt = [
    '你是香港社交媒體內容策略師。為以下品牌題材規劃一篇繁體中文 Instagram Carousel。',
    '按題材資訊量自行選擇 5 至 8 頁：單一觀念 5 頁、教學或專業拆解 6 至 8 頁。',
    '用家不需要自己補寫內容；每頁必須有可直接發布的 headline、subheadline 及 body。',
    'P.1 是吸引但不誇張的封面；中間頁逐步解釋；最後一頁是貼合品牌服務的 CTA。',
    '不可杜撰療效、診斷或未提供的數據。每頁 headline 最多 20 個中文字，body 每段最多 38 個中文字。',
    '',
    `品牌：${input.brandName}`,
    `服務類型：${input.businessType}`,
    `受眾：${JSON.stringify(input.audience || {})}`,
    `Campaign：${JSON.stringify(input.campaignTheme || {})}`,
    `題材：${input.title}`,
    `內容目的／資料：${input.body}`,
    '',
    '只輸出 JSON object：',
    '{"pages":[{"page":"P.1","headline":"","subheadline":"","body":[],"layout":"cover|editorial_article|cta"}]}',
  ].join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL),
        max_tokens: 4000,
        temperature: 0.3,
        system: 'Return valid JSON only. Write natural Traditional Chinese for Hong Kong readers.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(35_000),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'AI request failed')
    const text = Array.isArray(data.content)
      ? data.content.filter((item: any) => item.type === 'text').map((item: any) => item.text || '').join('\n')
      : ''
    return normalizePages(parseJsonObject(text).pages, input.title, input.body, input.brandName)
  } catch (error) {
    console.warn('[generate-post-carousel] using safe fallback plan', error)
    return normalizePages([], input.title, input.body, input.brandName)
  }
}

const box = (style: React.CSSProperties, children: React.ReactNode) =>
  React.createElement('div', { style: { display: 'flex', ...style } }, children)

async function renderPage(input: {
  draft: CarouselPage
  index: number
  total: number
  baseImageUrl: string
  brandName: string
  logoUrl: string
  font: ArrayBuffer
}) {
  const { draft, index, total, baseImageUrl, brandName, logoUrl, font } = input
  const cover = draft.layout === 'cover'
  const cta = draft.layout === 'cta'
  const footer = box({ alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 24 }, [
    box({ alignItems: 'center', gap: 12 }, [
      logoUrl ? React.createElement('img', { key: 'logo', src: logoUrl, width: 36, height: 36, style: { objectFit: 'contain', borderRadius: 6 } }) : null,
      React.createElement('span', { key: 'brand' }, brandName),
    ]),
    React.createElement('span', { key: 'page' }, `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`),
  ])

  const content = cover
    ? box({ width: '100%', height: '100%', position: 'relative', flexDirection: 'column', justifyContent: 'flex-end', padding: '72px 68px 54px', color: '#fff', background: 'linear-gradient(0deg,rgba(0,0,0,.84),rgba(0,0,0,.05) 78%)' }, [
        React.createElement('div', { key: 'tag', style: { display: 'flex', fontSize: 25, marginBottom: 22, opacity: .9 } }, '治療師拆解系列'),
        React.createElement('div', { key: 'headline', style: { display: 'flex', fontSize: 72, fontWeight: 700, lineHeight: 1.12, marginBottom: 24 } }, draft.headline),
        React.createElement('div', { key: 'sub', style: { display: 'flex', fontSize: 31, lineHeight: 1.35, marginBottom: 60 } }, draft.subheadline),
        footer,
      ])
    : box({ width: '100%', height: '100%', flexDirection: 'column', padding: '66px 68px 52px', color: '#171717', background: cta ? '#E9F0EC' : '#F8F6F0' }, [
        React.createElement('div', { key: 'tag', style: { display: 'flex', fontSize: 23, color: '#6D746F', marginBottom: 30 } }, cta ? '下一步' : '治療師拆解系列'),
        React.createElement('div', { key: 'headline', style: { display: 'flex', fontSize: cta ? 66 : 58, fontWeight: 700, lineHeight: 1.16, marginBottom: 24 } }, draft.headline),
        draft.subheadline ? React.createElement('div', { key: 'sub', style: { display: 'flex', fontSize: 30, color: '#4E5651', marginBottom: 34 } }, draft.subheadline) : null,
        box({ flexDirection: 'column', gap: 22, flex: 1 }, draft.body.map((paragraph, bodyIndex) =>
          React.createElement('div', { key: bodyIndex, style: { display: 'flex', fontSize: 31, lineHeight: 1.55, paddingLeft: 22, borderLeft: '5px solid #769582' } }, paragraph),
        )),
        footer,
      ])

  return new ImageResponse(
    React.createElement('div', { style: { display: 'flex', width: '100%', height: '100%', position: 'relative', fontFamily: 'SOON CJK' } }, [
      cover && baseImageUrl ? React.createElement('img', { key: 'background', src: baseImageUrl, width: 1080, height: 1350, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } }) : null,
      React.createElement('div', { key: 'content', style: { display: 'flex', width: '100%', height: '100%', position: 'relative' } }, content),
    ]),
    { width: 1080, height: 1350, fonts: [{ name: 'SOON CJK', data: font, weight: 400 }, { name: 'SOON CJK', data: font, weight: 700 }] },
  )
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformUser()
    if (auth.error) return auth.error
    if (!(await consumeApiQuota(auth.access.user.id, 'generate-post-carousel', 8))) {
      return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
    }
    const body = await request.json().catch(() => ({}))
    const postId = asString(body.postId)
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const supabase = createAdminSupabase()
    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .select('id,workspace_id,user_id,title,body,post_type,image_url,captions')
      .eq('id', postId)
      .single()
    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.post_type !== 'carousels') return NextResponse.json({ error: 'Post is not a carousel' }, { status: 400 })
    if (!post.workspace_id || !post.image_url) return NextResponse.json({ error: 'Carousel cover image is not ready' }, { status: 409 })

    const access = await getWorkspaceAccess({
      email: auth.access.user.email,
      userId: auth.access.user.id,
      workspaceId: post.workspace_id,
    })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [{ data: brandKit }, { data: workspace }] = await Promise.all([
      supabase.from('brand_kits').select('business_name,business_type,audience,logo_url').eq('workspace_id', post.workspace_id).maybeSingle(),
      supabase.from('workspaces').select('name,logo_url').eq('id', post.workspace_id).maybeSingle(),
    ])
    const captions = asRecord(post.captions)
    const brandName = asString(brandKit?.business_name, asString(workspace?.name, '品牌'))
    const pages = await planCarousel({
      title: asString(post.title, '專業內容拆解'),
      body: asString(post.body),
      brandName,
      businessType: asString(brandKit?.business_type, '專業服務'),
      audience: brandKit?.audience,
      campaignTheme: captions.campaignTheme,
    })
    const fontFile = await readFile(path.join(process.cwd(), 'public/fonts/max32002/SweiGothicCJKtc-Regular.ttf'))
    const font = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength) as ArrayBuffer
    const logoUrl = asString(brandKit?.logo_url, asString(workspace?.logo_url))
    const generationId = Date.now()
    const assets = await Promise.all(pages.map(async (draft, index) => {
      const response = await renderPage({ draft, index, total: pages.length, baseImageUrl: post.image_url, brandName, logoUrl, font })
      const bytes = new Uint8Array(await response.arrayBuffer())
      const storagePath = `${post.workspace_id}/campaign-posts/${postId}/carousel/p-${index + 1}-${generationId}.png`
      const { error: uploadError } = await supabase.storage.from('brand-assets').upload(storagePath, bytes, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
      return { id: `${postId}-p-${index + 1}`, page: draft.page, url: data.publicUrl, width: 1080, height: 1350, sourceType: 'generated_carousel' }
    }))

    const nextCaptions = {
      ...captions,
      assets,
      carouselPlan: { pages, pageCount: pages.length, generatedAt: new Date().toISOString() },
    }
    const { error: updateError } = await supabase.from('campaign_posts').update({
      captions: nextCaptions,
      image_url: assets[0]?.url || post.image_url,
      status: 'ready',
      updated_at: new Date().toISOString(),
    }).eq('id', postId).eq('workspace_id', post.workspace_id)
    if (updateError) throw updateError

    console.log('[generate-post-carousel] completed', { postId, pageCount: pages.length })
    return NextResponse.json({ success: true, pageCount: pages.length, assets, plan: pages })
  } catch (error) {
    console.error('[generate-post-carousel]', error)
    return NextResponse.json({ error: '未能生成輪播貼文', detail: String(error) }, { status: 500 })
  }
}
