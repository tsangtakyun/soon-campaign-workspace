import { NextRequest, NextResponse } from 'next/server'

const USER_AGENT = 'Mozilla/5.0 (compatible; SOON Topic Library/1.0)'

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return decodeHtml(match[1].trim())
  }
  return ''
}

function safeUrl(raw: string) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只支援 http 或 https 連結')
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  ) throw new Error('不支援內部網絡連結')
  return url
}

async function fetchPage(raw: string) {
  const url = safeUrl(raw)
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error('未能讀取這個連結')
  return { html: await response.text(), url: response.url || url.toString() }
}

function cleanTitle(value: string) {
  const instagramMarker = value.toLowerCase().indexOf(' on instagram:')
  const candidate = instagramMarker >= 0 ? value.slice(instagramMarker + 14) : value
  return candidate
    .replace(/^\s*["“]?/, '')
    .replace(/["”]\s*$/, '')
    .split(/\r?\n/)[0]
    .trim()
}

function categoryFor(text: string) {
  if (/旅遊|酒店|旅館|景點|城市|travel|hotel/i.test(text)) return 'Travel 旅遊資訊'
  if (/明星|演員|歌手|導演|攝影師|artist|celebrity/i.test(text)) return 'Celebrity 人物介紹'
  if (/電影|音樂|劇集|娛樂|concert|movie/i.test(text)) return 'Entertainment 娛樂資訊'
  if (/戀愛|拍拖|婚姻|伴侶|relationship/i.test(text)) return '兩性關係 relationship'
  return 'Trending 最新資訊'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sourceUrl = safeUrl(String(body.url || '')).toString()
    const { html, url } = await fetchPage(sourceUrl)
    const rawTitle = meta(html, 'og:title') || meta(html, 'twitter:title') || html.match(/<title[^>]*>([^<]+)/i)?.[1] || ''
    const description = meta(html, 'og:description') || meta(html, 'description') || ''
    const title = cleanTitle(decodeHtml(rawTitle)).slice(0, 90) || new URL(url).hostname
    const note = decodeHtml(description)
      .replace(/^\d+[\d,.]* likes?,\s*\d+[\d,.]* comments?\s*-\s*[^:]+:\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/["”]\.?\s*$/, '')
      .trim()
      .slice(0, 180)
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const handle = html.match(/<meta property="og:title" content="([^"<]+?) on Instagram:/i)?.[1]

    return NextResponse.json({
      id: `user-${Date.now()}`,
      title,
      source: handle ? `Instagram · ${decodeHtml(handle)}` : hostname,
      url,
      image: `/api/topic-import?image=1&source=${encodeURIComponent(sourceUrl)}`,
      height: 'medium',
      category: categoryFor(`${title} ${note}`),
      tags: ['用家提交', hostname],
      note: note || '由用家加入的題材連結，按「查看原文」瀏覽完整內容。',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未能加入題材' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('image') !== '1') throw new Error('Invalid request')
    const source = request.nextUrl.searchParams.get('source') || ''
    const sourceUrl = safeUrl(source)
    const instagramMatch = sourceUrl.hostname.endsWith('instagram.com')
      ? sourceUrl.pathname.match(/\/(?:p|reel)\/([^/]+)/i)
      : null
    let imageUrl = ''
    if (instagramMatch) {
      imageUrl = `https://www.instagram.com/p/${instagramMatch[1]}/media/?size=l`
    } else {
      const { html } = await fetchPage(source)
      imageUrl = meta(html, 'og:image') || meta(html, 'twitter:image')
    }
    if (!imageUrl) throw new Error('找不到圖片')
    const response = await fetch(safeUrl(imageUrl), {
      headers: { 'user-agent': USER_AGENT, referer: source },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error('未能讀取圖片')
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
