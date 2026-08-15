import { anthropicModel } from '@/lib/anthropic-models'
import { createAdminSupabase } from '@/lib/server-supabase'

export type BrandAnalysis = {
  business_name?: string
  business_overview?: string
  market_positioning?: unknown
  competitors?: unknown
  competitive_advantages?: unknown
  customer_segments?: unknown
  brand_voice_purpose?: string
  brand_voice_audience?: string
  brand_voice_tone?: unknown
  brand_voice_emotion?: unknown
  brand_voice_character?: unknown
  brand_voice_syntax?: unknown
  brand_voice_language?: unknown
  visual_identity_description?: string
  brand_colors?: unknown
}

type ScrapedImage = {
  sourceUrl: string
  url: string
}

const BROWSER_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

export async function processBrandSource(input: {
  brandSourceId: string
  url: string
  userId: string
  workspaceId: string
}) {
  const supabase = createAdminSupabase()
  console.log('[brand-source-analysis] starting', {
    brandSourceId: input.brandSourceId,
    workspaceId: input.workspaceId,
    url: input.url,
  })
  await supabase.from('brand_sources').update({ status: 'scanning' }).eq('id', input.brandSourceId)

  try {
    const scraped = await scrapeBrandWebsite(input.url)
    const analysis = await analyzeWithClaude(scraped.text, input.url, scraped.cssColors)
    const now = new Date().toISOString()

    const [profileResult, voiceResult, workspaceResult, sourceResult] = await Promise.all([
      supabase.from('brand_profiles').upsert(
        {
          workspace_id: input.workspaceId,
          business_name: stringValue(analysis.business_name),
          business_overview: stringValue(analysis.business_overview),
          market_positioning: analysis.market_positioning || [],
          competitors: analysis.competitors || { local: [], international: [] },
          competitive_advantages: analysis.competitive_advantages || [],
          customer_segments: analysis.customer_segments || [],
          updated_at: now,
        },
        { onConflict: 'workspace_id' }
      ),
      supabase.from('brand_voices').upsert(
        {
          workspace_id: input.workspaceId,
          purpose: stringValue(analysis.brand_voice_purpose),
          audience: stringValue(analysis.brand_voice_audience),
          tone: arrayValue(analysis.brand_voice_tone),
          emotion: arrayValue(analysis.brand_voice_emotion),
          character: arrayValue(analysis.brand_voice_character),
          syntax: arrayValue(analysis.brand_voice_syntax),
          language: arrayValue(analysis.brand_voice_language),
          updated_at: now,
        },
        { onConflict: 'workspace_id' }
      ),
      supabase
        .from('workspaces')
        .update({
          brand_colors: normalizeBrandColors(analysis.brand_colors, scraped.cssColors),
          visual_identity_description: stringValue(analysis.visual_identity_description),
        })
        .eq('id', input.workspaceId),
      supabase
        .from('brand_sources')
        .update({ status: 'done', last_scanned_at: now })
        .eq('id', input.brandSourceId),
    ])

    console.log('[brand-source-analysis] write results', {
      brandSourceId: input.brandSourceId,
      workspaceId: input.workspaceId,
      profileError: profileResult.error,
      voiceError: voiceResult.error,
      workspaceError: workspaceResult.error,
      sourceError: sourceResult.error,
    })

    if (profileResult.error) throw profileResult.error
    if (voiceResult.error) throw voiceResult.error
    if (workspaceResult.error) throw workspaceResult.error
    if (sourceResult.error) throw sourceResult.error

    await saveMediaAssets({
      images: scraped.images,
      userId: input.userId,
      workspaceId: input.workspaceId,
    })

    return { analysis, mediaCount: scraped.images.length }
  } catch (error) {
    await supabase.from('brand_sources').update({ status: 'error' }).eq('id', input.brandSourceId)
    throw error
  }
}

async function analyzeWithClaude(text: string, url: string, cssColors: string[]): Promise<BrandAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    body: JSON.stringify({
      max_tokens: 1800,
      messages: [
        {
          content: [
            'Analyze this website content and extract brand information in Traditional Chinese.',
            'Return JSON with these exact fields:',
            JSON.stringify({
              business_name: 'string',
              business_overview: 'string (2-3 sentences)',
              market_positioning: ['primary', 'secondary', 'tertiary'],
              competitors: { local: ['name1', 'name2'], international: ['name1', 'name2'] },
              competitive_advantages: ['advantage1', 'advantage2'],
              customer_segments: [{ name: 'string', percentage: 50, details: ['string'] }],
              brand_voice_purpose: 'string',
              brand_voice_audience: 'string',
              brand_voice_tone: ['tag1', 'tag2', 'tag3'],
              brand_voice_emotion: ['tag1', 'tag2', 'tag3'],
              brand_voice_character: ['tag1', 'tag2', 'tag3'],
              brand_voice_syntax: ['tag1', 'tag2'],
              brand_voice_language: ['tag1', 'tag2', 'tag3'],
              visual_identity_description: 'string (detailed paragraph)',
              brand_colors: [{ hex: '#xxxxxx', name: 'descriptive name in Chinese' }],
            }),
            'Also extract the top 3-5 brand colors as hex codes from this website CSS and visual design. Return them in brand_colors as objects with hex and Traditional Chinese descriptive name.',
            `Website URL: ${url}`,
            `Detected CSS colors:\n${cssColors.slice(0, 20).join(', ') || 'none detected'}`,
            `Website content:\n${text.slice(0, 24000)}`,
          ].join('\n\n'),
          role: 'user',
        },
      ],
      model: anthropicModel(process.env.ANTHROPIC_BRAND_SOURCE_MODEL),
      system: 'You are a senior brand strategist for SOON. Return only valid JSON. No markdown.',
      temperature: 0.2,
    }),
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    method: 'POST',
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || 'Anthropic API request failed')

  const textResponse = Array.isArray(data.content)
    ? data.content
        .filter((item: { type?: string }) => item.type === 'text')
        .map((item: { text?: string }) => item.text || '')
        .join('\n')
    : ''

  return parseJsonObject(textResponse)
}

async function scrapeBrandWebsite(rawUrl: string) {
  const rootUrl = normalizeUrl(rawUrl)
  const home = await fetchHtmlPage(rootUrl)
  const priorityTargets = ['/about', '/about-us', '/contact'].map((path) => new URL(path, rootUrl).toString())
  const discoveredTargets = home?.html ? extractPriorityInternalLinks(home.html, rootUrl) : []
  const targets = Array.from(new Set([rootUrl, ...priorityTargets, ...discoveredTargets])).slice(0, 12)
  const pages = (
    await Promise.all(
      targets.map(async (target) => {
        if (target === rootUrl && home) return home
        return fetchHtmlPage(target)
      })
    )
  ).filter((page): page is { html: string; url: string } => Boolean(page?.html))

  const combinedHtml = pages.map((page) => page.html).join('\n')
  if (!combinedHtml) throw new Error('Unable to fetch website content')
  const images = dedupeImages(
    pages.flatMap((page) => extractImageUrls(page.html, rootUrl, page.url))
  ).slice(0, 60)

  return {
    cssColors: extractCssColors(combinedHtml).slice(0, 20),
    images,
    text: extractReadableText(combinedHtml),
  }
}

async function fetchHtmlPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null
    return { html: await response.text(), url }
  } catch {
    return null
  }
}

async function saveMediaAssets(input: { images: ScrapedImage[]; userId: string; workspaceId: string }) {
  if (!input.images.length) return
  const supabase = createAdminSupabase()
  const { data: brandKit } = await supabase
    .from('brand_kits')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  await Promise.all(
    input.images.map(async (image) => {
      const { data: existing } = await supabase
        .from('brand_assets')
        .select('id')
        .eq('workspace_id', input.workspaceId)
        .eq('asset_type', 'website_image')
        .eq('url', image.url)
        .maybeSingle()

      if (existing?.id) return

      await supabase.from('brand_assets').insert({
        asset_type: 'website_image',
        brand_kit_id: brandKit?.id || null,
        filename: filenameFromUrl(image.url),
        is_used: false,
        source_url: image.sourceUrl,
        url: image.url,
        user_id: input.userId,
        workspace_id: input.workspaceId,
      })
    })
  )
}

function extractReadableText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  ).slice(0, 28000)
}

function extractImageUrls(html: string, baseUrl: string, sourceUrl: string): ScrapedImage[] {
  const metaImages = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)].map((match) => match[1])
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)]
  const tagImages = imgTags
    .filter((match) => !isTinyImageTag(match[0]))
    .map((match) => {
      const srcset = match[0].match(/\bsrcset=["']([^"']+)["']/i)?.[1]
      const src = match[0].match(/\bsrc=["']([^"']+)["']/i)?.[1]
      return src || firstSrcsetUrl(srcset || '')
    })
  return [...metaImages, ...tagImages]
    .map((url) => absolutizeUrl(decodeHtml(url || ''), sourceUrl || baseUrl))
    .filter((url) => isUsefulBrandImageUrl(url, baseUrl))
    .map((url) => ({ sourceUrl, url }))
}

function extractPriorityInternalLinks(html: string, rootUrl: string) {
  const patterns = /(service|treatment|product|about|team|technician|gallery|blog|post)/i
  const root = new URL(rootUrl)
  return [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)]
    .map((match) => absolutizeUrl(decodeHtml(match[1]), rootUrl))
    .filter((url) => {
      try {
        const next = new URL(url)
        return next.origin === root.origin && patterns.test(next.pathname)
      } catch {
        return false
      }
    })
    .slice(0, 8)
}

function extractCssColors(html: string) {
  const cssText = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]),
    ...[...html.matchAll(/\bstyle=["']([^"']+)["']/gi)].map((match) => match[1]),
  ].join('\n')
  const colorValues = [
    ...[...cssText.matchAll(/(?:background-color|border-color|color|background)\s*:\s*([^;}"']+)/gi)].map((match) => match[1]),
    ...[...cssText.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => match[0]),
    ...[...cssText.matchAll(/rgba?\([^)]+\)/gi)].map((match) => match[0]),
  ]
  return Array.from(new Set(colorValues.map(colorToHex).filter(Boolean))).filter((color) => !isNeutralColor(color) && !isGenericSystemBlue(color))
}

function normalizeBrandColors(value: unknown, fallbackColors: string[]) {
  const fromClaude = Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === 'string') return { hex: normalizeHexColor(item), name: item }
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>
            return {
              hex: normalizeHexColor(typeof record.hex === 'string' ? record.hex : ''),
              name: typeof record.name === 'string' ? record.name : '',
            }
          }
          return null
        })
        .filter((item): item is { hex: string; name: string } => Boolean(item?.hex) && !isGenericSystemBlue(item.hex))
    : []
  const filteredFallback = fallbackColors.filter((hex) => !isGenericSystemBlue(hex))
  const colors = fromClaude.length
    ? fromClaude
    : filteredFallback.slice(0, 5).map((hex) => ({ hex, name: '品牌色' }))
  return colors.slice(0, 5)
}

function colorToHex(value: string) {
  const color = value.trim()
  if (color.startsWith('#')) return normalizeHexColor(color)
  const rgb = color.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (!rgb) return ''
  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
    .join('')}`
}

function normalizeHexColor(value: string) {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  return `#${hex.slice(0, 6)}`.toLowerCase()
}

function isNeutralColor(hex: string) {
  return ['#ffffff', '#000000', '#f5f5f5', '#f6f6f6', '#f7f7f7', '#f8f8f8', '#f9f9f9', '#eeeeee', '#e5e5e5'].includes(hex)
}

function isGenericSystemBlue(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (['#116dff', '#0000ff', '#0099ff'].includes(normalized)) return true
  const match = normalized.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
  if (!match) return false
  const red = Number.parseInt(match[1], 16)
  const green = Number.parseInt(match[2], 16)
  const blue = Number.parseInt(match[3], 16)
  return red <= 0x44 && green <= 0x44 && blue >= 0xcc
}

function isUsefulBrandImageUrl(url: string, rootUrl: string) {
  if (!/^https?:\/\//i.test(url)) return false
  if (/base64|pixel|tracking|sprite|blank|placeholder|avatar|analytics/i.test(url)) return false
  try {
    const image = new URL(url)
    const root = new URL(rootUrl)
    const isWixCdn = /(media\.wixstatic\.com|static\.wixstatic\.com|static\.wix\.com)$/i.test(image.hostname)
    if (!isWixCdn && /(favicon|icon|logo)/i.test(url)) return false
    const allowedExternalCdn = /(wixstatic|static\.wix|squarespace|shopify|cdninstagram|cloudfront|contentful|sanity|wordpress|wp-content|images\.ctfassets)/i
    return image.hostname === root.hostname || image.hostname.endsWith(`.${root.hostname}`) || isWixCdn || allowedExternalCdn.test(image.hostname + image.pathname)
  } catch {
    return false
  }
}

function isTinyImageTag(tag: string) {
  const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0)
  const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 0)
  return Boolean((width && width < 50) || (height && height < 50))
}

function firstSrcsetUrl(srcset: string) {
  return srcset.split(',').map((item) => item.trim().split(/\s+/)[0]).find(Boolean) || ''
}

function dedupeImages(images: ScrapedImage[]) {
  const seen = new Set<string>()
  return images.filter((image) => {
    if (seen.has(image.url)) return false
    seen.add(image.url)
    return true
  })
}

export function normalizeBrandSourceUrl(value: string) {
  const trimmed = value.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProtocol).toString()
}

const normalizeUrl = normalizeBrandSourceUrl

function absolutizeUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
}

function parseJsonObject(text: string): BrandAnalysis {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      return JSON.parse(match[0])
    } catch {
      return {}
    }
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function filenameFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'website-image')
  } catch {
    return 'website-image'
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}
