import { anthropicModel } from '@/lib/anthropic-models'
import { fetchSafeExternal } from '@/lib/safe-external-url'

export type WebsiteAnalysisInput = {
  website: string
  language: string
  name?: string
  budget?: string
  category?: string
  plan?: string
}

export type WebsiteAnalysisResult = {
  websiteUrl: string
  language: string
  businessName: string
  businessType: 'services' | 'local' | 'products'
  elevatorPitch: string
  logoUrl: string
  websiteImages: string[]
  audience: {
    ageMin: string
    ageMax: string
    gender: string
    locations: string[]
    summary: string
  }
  contentPeople: {
    ageRange: string
    gender: string
    ethnicity: string
  }
  marketPositioning: {
    primary: string
    secondary: string
    tertiary: string
  }
  brandProfile: {
    type: string
    audience: string
    position: string
    tone: string
    offer: string
  }
  sourceSummary: {
    title: string
    description: string
    headings: string[]
  }
}

type ScrapedWebsite = {
  url: string
  title: string
  description: string
  logoUrl: string
  websiteImages: string[]
  headings: string[]
  text: string
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
}

const IMAGE_HEADERS = {
  'User-Agent': BROWSER_HEADERS['User-Agent'],
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': BROWSER_HEADERS['Accept-Language'],
}

const SUBPAGE_PATH_HINTS = [
  'services',
  'service',
  'about',
  'about-us',
  'products',
  'product',
  'gallery',
  'photos',
  'treatments',
  'work',
  'portfolio',
  'case',
  'cases',
  'shop',
  'collection',
  'collections',
  'team',
  'blog',
  'hifu',
  'hifu-rf',
  'slim',
  'slimakase',
  'm22',
  'skinrevolution',
  'glacial',
  'skin',
  'femme',
  'facial',
  'laser',
]

const SUBPAGE_TEXT_HINTS = [
  ...SUBPAGE_PATH_HINTS,
  '療程',
  '服務',
  '產品',
  '案例',
  '作品',
  '相片',
  '圖片',
  '圖庫',
  '關於',
  '團隊',
  '媒體',
  '提拉',
  '緊緻',
  '溶脂',
  '瘦身',
  '嫩膚',
  '祛斑',
  '脫毛',
  '美容',
  '旅遊',
  '行程',
  '目的地',
]

const NON_CONTENT_IMAGE_PATTERN =
  /(logo|icon|favicon|sprite|placeholder|blank|pixel|tracking|facebook\.com\/tr|monogram|gencode|qrcode|qr[-_]?code|award|badge|singleline|title|bar|social|facebook|instagram|youtube|whatsapp|linkedin|pinterest|x-twitter|payment|visa|mastercard|blur_)/i

const TRUSTED_IMAGE_CDN_PATTERN =
  /(static\.wixstatic\.com|static\.parastorage\.com|squarespace-cdn\.com|images\.squarespace-cdn\.com|cdn\.shopify\.com|res\.cloudinary\.com)/i

export async function analyzeWebsiteWithClaude(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const website = await scrapeWebsite(input.website)
  const model = anthropicModel(process.env.ANTHROPIC_WEBSITE_MODEL)

  const systemPrompt = [
    'You are a senior marketing strategist building an onboarding profile for SOON, an AI marketing and content commerce platform.',
    'Analyze the provided website content and return only valid JSON.',
    'All human-facing strings in the JSON must use the requested content language.',
    'If the requested language is Traditional Chinese, do not use English section labels such as Core Identity, Primary Positioning, or Elevator Pitch.',
    'Be commercially useful and specific. Avoid generic SaaS wording.',
    'For market positioning, write like a strategist: each item should contain a short quoted positioning phrase, followed by a concise explanation of what it emphasizes.',
    'Do not add unrelated platform or campaign execution claims unless they are clearly present in the website evidence.',
    'If evidence is weak, infer conservatively from the website title, metadata, headings, and user onboarding context.',
  ].join(' ')

  const userPrompt = [
    `Requested content language: ${input.language}`,
    `User name: ${input.name || '未提供'}`,
    `Monthly budget: ${input.budget || '未提供'}`,
    `Initial category: ${input.category || '未提供'}`,
    `Selected plan: ${input.plan || '未提供'}`,
    `Website URL: ${website.url}`,
    `Page title: ${website.title || '未提供'}`,
    `Meta description: ${website.description || '未提供'}`,
    `Possible logo/image URL: ${website.logoUrl || '未提供'}`,
    `Headings: ${website.headings.join(' | ') || '未提供'}`,
    `Visible website text:\n${website.text}`,
    '',
    'Return JSON with this exact shape:',
    JSON.stringify({
      businessName: 'string',
      businessType: 'services | local | products',
      elevatorPitch: '2-3 sentence positioning paragraph',
      audience: {
        ageMin: '18',
        ageMax: '34',
        gender: '所有性別',
        locations: ['香港'],
        summary: 'short audience summary',
      },
      contentPeople: {
        ageRange: '18-34',
        gender: '所有性別',
        ethnicity: '多元族群',
      },
      marketPositioning: {
        primary: '「核心定位句」- 說明這個定位強調甚麼情感、功能或市場價值',
        secondary: '「次要定位句」- 說明它如何支撐品牌差異化',
        tertiary: '「延伸定位句」- 說明它如何影響內容或轉化方向',
      },
      brandProfile: {
        type: 'business type and category',
        audience: 'audience in short form',
        position: 'market position',
        tone: 'brand tone',
        offer: 'main offer',
      },
    }),
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Anthropic API request failed')
  }

  const text = Array.isArray(data.content)
    ? data.content
      .filter((item: { type?: string }) => item.type === 'text')
      .map((item: { text?: string }) => item.text || '')
      .join('\n')
      .trim()
    : ''

  const parsed = parseJsonObject(text)
  const businessType = normalizeBusinessType(parsed.businessType)

  return {
    websiteUrl: website.url,
    language: input.language,
    businessName: stringValue(parsed.businessName, website.title || input.category || '你的品牌'),
    businessType,
    elevatorPitch: stringValue(parsed.elevatorPitch, website.description || 'SOON 會根據你的網站內容整理品牌定位、受眾方向與下一步內容策略。'),
    logoUrl: website.logoUrl,
    websiteImages: website.websiteImages,
    audience: {
      ageMin: stringValue(parsed.audience?.ageMin, '18'),
      ageMax: stringValue(parsed.audience?.ageMax, '34'),
      gender: stringValue(parsed.audience?.gender, '所有性別'),
      locations: Array.isArray(parsed.audience?.locations) && parsed.audience.locations.length ? parsed.audience.locations.map(String) : ['香港'],
      summary: stringValue(parsed.audience?.summary, '對品牌服務或產品有明確需求的潛在客戶。'),
    },
    contentPeople: {
      ageRange: stringValue(parsed.contentPeople?.ageRange, '18-34'),
      gender: stringValue(parsed.contentPeople?.gender, '所有性別'),
      ethnicity: stringValue(parsed.contentPeople?.ethnicity, '多元族群'),
    },
    marketPositioning: {
      primary: stringValue(parsed.marketPositioning?.primary, '以清晰的品牌主張建立信任，降低客戶理解成本。'),
      secondary: stringValue(parsed.marketPositioning?.secondary, '透過內容展示實際使用情境、成果與品牌個性。'),
      tertiary: stringValue(parsed.marketPositioning?.tertiary, '把網站資訊延伸成可投放、可追蹤、可優化的宣傳內容。'),
    },
    brandProfile: {
      type: stringValue(parsed.brandProfile?.type, businessType === 'products' ? '產品 / 電商' : businessType === 'local' ? '本地業務' : '服務型品牌'),
      audience: stringValue(parsed.brandProfile?.audience, '18-34，香港'),
      position: stringValue(parsed.brandProfile?.position, '以內容建立信任與轉化'),
      tone: stringValue(parsed.brandProfile?.tone, '專業、清晰、可信'),
      offer: stringValue(parsed.brandProfile?.offer, website.description || '品牌服務與內容體驗'),
    },
    sourceSummary: {
      title: website.title,
      description: website.description,
      headings: website.headings,
    },
  }
}

async function scrapeWebsite(rawUrl: string): Promise<ScrapedWebsite> {
  const url = normalizeUrl(rawUrl)
  const html = await fetchWebsiteHtml(url, true)
  const title = decodeHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const description = decodeHtml(matchMeta(html, 'description') || matchMeta(html, 'og:description'))
  const brandHint = cleanText(title).split(/[\s|｜-]/)[0] || ''
  const imageCandidates = await findWebsiteImageCandidates(html, url, brandHint)
  const logoUrl = imageCandidates.bestImage
  const subpageUrls = findRelevantSubpageUrls(html, url).slice(0, 5)
  const subpageImages: string[] = []

  await Promise.all(
    subpageUrls.map(async (subpageUrl) => {
      try {
        const subpageHtml = await fetchWebsiteHtml(subpageUrl, false)
        const subpageCandidates = await findWebsiteImageCandidates(subpageHtml, subpageUrl, brandHint)
        subpageImages.push(...subpageCandidates.images)
        console.log('[website-analysis] subpage images:', subpageUrl, subpageCandidates.images.length)
      } catch (error) {
        console.warn('[website-analysis] subpage fetch failed:', subpageUrl, error instanceof Error ? error.message : error)
      }
    })
  )

  const websiteImages = dedupeImageUrls([
    ...subpageImages,
    ...imageCandidates.images,
  ])
    .filter((image) => image && image !== logoUrl && !looksLikeNonContentImage(image))
    .slice(0, 15)

  console.log('[website-analysis] subpages scraped:', subpageUrls)
  console.log('[website-analysis] website images selected:', websiteImages.length, websiteImages)

  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
    .slice(0, 18)
  const text = cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  ).slice(0, 12000)

  return { url, title, description, logoUrl, websiteImages, headings, text }
}

async function findWebsiteImageCandidates(html: string, baseUrl: string, brandHint: string) {
  const imgCount = [...html.matchAll(/<img\b[^>]*>/gi)].length
  const ogImage = filterUsableImageUrl(absolutizeUrl(
    matchMeta(html, 'og:image') ||
      matchMeta(html, 'og:image:url') ||
      matchMeta(html, 'twitter:image') ||
      matchMeta(html, 'twitter:image:src') ||
      matchMeta(html, 'image'),
    baseUrl
  ))
  const logoImage = absolutizeUrl(matchLogoImage(html, brandHint), baseUrl)
  const contentImages = matchContentImages(html, baseUrl)
  const firstLargeImage = contentImages[0] || filterUsableImageUrl(absolutizeUrl(matchFirstLargeImage(html), baseUrl))
  const appleTouchIcon = absolutizeUrl(matchLink(html, 'apple-touch-icon'), baseUrl)
  const favicon = absolutizeUrl(matchLink(html, 'icon') || '/favicon.ico', baseUrl)
  const commonLogo = await findReachableCommonLogoUrl(baseUrl)
  const bestImage = logoImage || commonLogo || appleTouchIcon || favicon || ogImage || firstLargeImage
  const images = dedupeImageUrls([
    ...contentImages,
    ogImage,
    firstLargeImage,
  ])

  console.log('[website-analysis] og:image:', ogImage || null)
  console.log('[website-analysis] favicon:', favicon || null)
  console.log('[website-analysis] img tags found:', imgCount)
  console.log('[website-analysis] logo image:', logoImage || null)
  console.log('[website-analysis] first large image:', firstLargeImage || null)
  console.log('[website-analysis] common logo path:', commonLogo || null)
  console.log('[website-analysis] content images found:', contentImages.length)
  console.log('[website-analysis] selected image:', bestImage || null)

  return { bestImage, images, ogImage, favicon, imgCount, logoImage, firstLargeImage, commonLogo }
}

async function fetchWebsiteHtml(url: string, throwOnError: boolean) {
  const response = await fetchSafeExternal(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    if (throwOnError) throw new Error(`Unable to read website (${response.status})`)
    throw new Error(`Unable to read subpage (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    if (throwOnError) throw new Error(`Website did not return HTML (${contentType || 'unknown content type'})`)
    throw new Error(`Subpage did not return HTML (${contentType || 'unknown content type'})`)
  }

  return response.text()
}

function findRelevantSubpageUrls(html: string, baseUrl: string) {
  const base = new URL(baseUrl)
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => {
      const tag = match[0]
      const href = absolutizeUrl(decodeHtml(match[1]), baseUrl)
      const label = cleanText(tag)
      return { href, score: scoreSubpageCandidate(href, label, base) }
    })
    .filter((candidate) => candidate.href && candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.href)

  const commonCandidates = SUBPAGE_PATH_HINTS.map((hint) => absolutizeUrl(`/${hint}`, baseUrl))
    .filter(Boolean)
    .map((href) => ({ href, score: scoreSubpageCandidate(href, '', base) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.href)

  return Array.from(new Set([...links, ...commonCandidates]))
}

function scoreSubpageCandidate(href: string, label: string, base: URL) {
  if (!href) return -100
  try {
    const url = new URL(href)
    if (url.origin !== base.origin) return -100
    if (url.pathname === base.pathname || url.pathname === '/' || url.hash) return -20
    if (/\.(pdf|docx?|xlsx?|zip|rar|mp4|mov|webm|jpg|jpeg|png|webp|svg)$/i.test(url.pathname)) return -100
    const path = decodeURIComponent(url.pathname.toLowerCase())
    const text = `${path} ${label.toLowerCase()}`
    let score = 0
    SUBPAGE_TEXT_HINTS.forEach((hint) => {
      if (text.includes(hint.toLowerCase())) score += 8
    })
    if (/\/(services?|products?|gallery|photos?|treatments?|portfolio|work|about|case|shop|collections?)(\/|$)/i.test(path)) score += 12
    if (/(privacy|terms|contact|cart|checkout|login|account|policy|sitemap|cookie)/i.test(text)) score -= 40
    return score
  } catch {
    return -100
  }
}

async function findReachableCommonLogoUrl(baseUrl: string) {
  const paths = [
    '/logo.png',
    '/logo.jpg',
    '/logo.svg',
    '/images/logo.png',
    '/images/logo.jpg',
    '/images/logo.svg',
    '/assets/logo.png',
    '/assets/logo.jpg',
    '/assets/logo.svg',
    '/favicon.ico',
  ]

  for (const path of paths) {
    const candidate = absolutizeUrl(path, baseUrl)
    if (!candidate) continue
    if (await isReachableImage(candidate)) return candidate
  }

  return ''
}

async function isReachableImage(url: string) {
  try {
    const response = await fetchSafeExternal(url, {
      method: 'HEAD',
      headers: IMAGE_HEADERS,
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return false
    const contentType = response.headers.get('content-type') || ''
    return contentType.includes('image') || /\.(png|jpe?g|svg|webp|ico)(?:\?|$)/i.test(url)
  } catch {
    return false
  }
}

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  return url.toString()
}

function parseJsonObject(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced || text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start < 0 || end < start) {
    throw new Error('Claude did not return JSON')
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

function matchFirst(html: string, pattern: RegExp) {
  return html.match(pattern)?.[1]?.trim() || ''
}

function matchMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i'),
  ]

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1]
    if (value) return decodeHtml(value)
  }

  return ''
}

function matchLink(html: string, rel: string) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html.match(new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']*)["'][^>]*>`, 'i'))?.[1] || ''
}

function matchLogoImage(html: string, brandHint: string) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => {
      const tag = match[0]
      const src = imageSourceFromTag(tag)
      const alt = getAttribute(tag, 'alt')
      const className = getAttribute(tag, 'class')
      const id = getAttribute(tag, 'id')
      const ariaLabel = getAttribute(tag, 'aria-label')
      const scoreText = `${src} ${alt} ${className} ${id} ${ariaLabel}`.toLowerCase()
      const brand = brandHint.toLowerCase()
      let score = 0
      if (scoreText.includes('logo')) score += 4
      if (scoreText.includes('brand')) score += 2
      if (brand && scoreText.includes(brand)) score += 2
      if (scoreText.includes('icon')) score += 1
      if (scoreText.includes('facebook.com/tr')) score -= 10
      return { src, score }
    })
    .filter((image) => image.src && image.score > 0)
    .sort((a, b) => b.score - a.score)

  return images[0]?.src || ''
}

function matchFirstLargeImage(html: string) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => {
      const tag = match[0]
      const src = imageSourceFromTag(tag)
      const width = Number(getAttribute(tag, 'width') || 0)
      const height = Number(getAttribute(tag, 'height') || 0)
      const alt = getAttribute(tag, 'alt')
      const className = getAttribute(tag, 'class')
      const scoreText = `${src} ${alt} ${className}`.toLowerCase()
      let score = 0
      if (!src || src.startsWith('data:')) score -= 100
      if (looksLikeNonContentImage(scoreText)) score -= 100
      if (width >= 300) score += 3
      if (height >= 180) score += 3
      if (/\.(jpe?g|png|webp)(?:\?|$)/i.test(src)) score += 2
      if (/\/resize\/|\/media\/|\/uploads?\//i.test(src)) score += 2
      return { src, score }
    })
    .filter((image) => image.src && image.score > 0)
    .sort((a, b) => b.score - a.score)

  return images[0]?.src || ''
}

function matchContentImages(html: string, baseUrl: string) {
  const images = [
    ...html.matchAll(/<img\b[^>]*>/gi),
    ...html.matchAll(/<source\b[^>]*>/gi),
  ]
    .map((match) => scoreContentImage(match[0], baseUrl))
    .filter((image) => image.url && image.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((image) => image.url)

  const backgroundImages = [...html.matchAll(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/gi)]
    .map((match) => scoreImageUrl(absolutizeUrl(match[2], baseUrl), 'background image'))
    .filter((image) => image.url && image.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((image) => image.url)

  const inlineImageUrls = [...html.matchAll(/https?:\/\/[^"'()<>\s]+?\.(?:jpe?g|png|webp|avif)(?:\/[^"'()<>\s]*)?(?:\?[^"'()<>\s]*)?/gi)]
    .map((match) => scoreImageUrl(match[0], 'inline image url'))
    .filter((image) => image.url && image.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((image) => image.url)

  return dedupeImageUrls([...images, ...backgroundImages, ...inlineImageUrls])
}

function scoreContentImage(tag: string, baseUrl: string) {
  const rawSrc = imageSourceFromTag(tag)
  const url = filterUsableImageUrl(absolutizeUrl(rawSrc, baseUrl))
  if (!url) return { url: '', score: -100 }

  const width = numericAttribute(tag, 'width')
  const height = numericAttribute(tag, 'height')
  const alt = getAttribute(tag, 'alt')
  const className = getAttribute(tag, 'class')
  const id = getAttribute(tag, 'id')
  const loading = getAttribute(tag, 'loading')
  const scoreText = `${url} ${alt} ${className} ${id}`.toLowerCase()
  const trustedCdn = isTrustedImageCdn(url)
  let score = scoreImageUrl(url, scoreText).score

  if (!trustedCdn && width && height && (width < 160 || height < 160)) score -= 100
  if (width >= 400) score += 8
  else if (width >= 300) score += 5
  else if (width >= 200) score += 2
  if (height >= 400) score += 6
  else if (height >= 250) score += 3

  if (/\.(jpe?g|png|webp|avif)(?:\?|$)/i.test(url)) score += 4
  if (/\/(uploads?|media|photos?|gallery|products?|services?|images?)\//i.test(url)) score += 5
  if (/(hero|banner|cover|product|service|gallery|photo|team|case|work|portfolio|treatment|model|face|skin|room|reception|makeup|facial|before|after|tour|travel|trip|destination)/i.test(scoreText)) score += 5
  if (loading === 'lazy') score += 1
  if (looksLikeNonContentImage(scoreText)) score -= 100

  return { url, score }
}

function scoreImageUrl(value: string, context = '') {
  const url = filterUsableImageUrl(value)
  if (!url) return { url: '', score: -100 }

  const scoreText = `${url} ${context}`.toLowerCase()
  const dimensions = imageDimensionsFromUrl(url)
  let score = 0

  if (dimensions?.width && dimensions.width >= 600) score += 10
  else if (dimensions?.width && dimensions.width >= 400) score += 7
  else if (dimensions?.width && dimensions.width >= 240) score += 3

  if (dimensions?.height && dimensions.height >= 500) score += 8
  else if (dimensions?.height && dimensions.height >= 260) score += 4

  if (/\.(jpe?g|png|webp|avif)(?:\?|$)/i.test(url)) score += 4
  if (/(wixstatic|cloudfront|cdn|uploads?|media|photos?|gallery|products?|services?|images?|assets)/i.test(scoreText)) score += 3
  if (/(product|service|gallery|photo|team|case|work|portfolio|treatment|model|face|skin|room|reception|makeup|facial|before|after|tour|travel|trip|destination)/i.test(scoreText)) score += 6
  if (looksLikeNonContentImage(scoreText)) score -= 100

  return { url, score }
}

function filterUsableImageUrl(value: string) {
  if (!value) return ''
  const decoded = normalizeCdnImageUrl(decodeHtml(value).trim())
  if (!decoded || decoded.startsWith('data:') || decoded.startsWith('blob:')) return ''
  if (/\.(svg|ico|gif)(?:\?|$)/i.test(decoded)) return ''
  if (looksLikeNonContentImage(decoded)) return ''
  if (!isTrustedImageCdn(decoded) && hasTinyImageDimensions(decoded)) return ''
  return decoded
}

function looksLikeNonContentImage(value: string) {
  return NON_CONTENT_IMAGE_PATTERN.test(value)
}

function hasTinyImageDimensions(value: string) {
  const dimensions = imageDimensionsFromUrl(value)
  if (!dimensions) return false
  if (dimensions.width && dimensions.height) return dimensions.width < 180 || dimensions.height < 180
  return Boolean((dimensions.width && dimensions.width < 140) || (dimensions.height && dimensions.height < 140))
}

function imageDimensionsFromUrl(value: string) {
  if (isTrustedImageCdn(value)) return null

  const decoded = safeDecodeURIComponent(value)
  const queryWidth = decoded.match(/[?&](?:w|width)=(\d{2,5})/i)?.[1]
  const queryHeight = decoded.match(/[?&](?:h|height)=(\d{2,5})/i)?.[1]
  if (queryWidth || queryHeight) {
    return {
      width: queryWidth ? Number.parseInt(queryWidth, 10) : 0,
      height: queryHeight ? Number.parseInt(queryHeight, 10) : 0,
    }
  }

  const wixWidthHeight = decoded.match(/(?:^|[/_,])w[_=-](\d{2,5}),h[_=-](\d{2,5})/i)
  if (wixWidthHeight) {
    return {
      width: Number.parseInt(wixWidthHeight[1], 10),
      height: Number.parseInt(wixWidthHeight[2], 10),
    }
  }

  const wixHeightWidth = decoded.match(/(?:^|[/_,])h[_=-](\d{2,5}),w[_=-](\d{2,5})/i)
  if (wixHeightWidth) {
    return {
      width: Number.parseInt(wixHeightWidth[2], 10),
      height: Number.parseInt(wixHeightWidth[1], 10),
    }
  }

  const simpleDimensions = decoded.match(/(?:^|[/_-])(\d{2,5})x(\d{2,5})(?:[._/-]|$)/i)
  if (simpleDimensions) {
    return {
      width: Number.parseInt(simpleDimensions[1], 10),
      height: Number.parseInt(simpleDimensions[2], 10),
    }
  }

  return null
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function dedupeImageUrls(images: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const image of images) {
    const normalized = normalizeImageKey(image)
    if (!image || !normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(image)
  }

  return result
}

function normalizeImageKey(value: string) {
  try {
    const url = new URL(normalizeCdnImageUrl(value))
    url.hash = ''
    ;['width', 'height', 'w', 'h', 'fit', 'crop', 'auto', 'format'].forEach((param) => url.searchParams.delete(param))
    return url.toString()
  } catch {
    return value
  }
}

function numericAttribute(tag: string, attribute: string) {
  const value = getAttribute(tag, attribute)
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function imageSourceFromTag(tag: string) {
  const srcset = getAttribute(tag, 'srcset') || getAttribute(tag, 'data-srcset')
  const srcsetSource = firstSrcFromSrcset(srcset)
  if (srcsetSource) return srcsetSource

  const direct =
    getAttribute(tag, 'src') ||
    getAttribute(tag, 'data-src') ||
    getAttribute(tag, 'data-lazy-src') ||
    getAttribute(tag, 'data-original') ||
    getAttribute(tag, 'data-url') ||
    getAttribute(tag, 'data-bg') ||
    getAttribute(tag, 'data-background') ||
    getAttribute(tag, 'data-image') ||
    getAttribute(tag, 'data-nimg')

  if (direct) return direct
  return ''
}

function firstSrcFromSrcset(srcset: string) {
  if (!srcset) return ''
  const candidates = [
    ...srcset.matchAll(/(https?:\/\/.*?)(?:\s+(\d+(?:\.\d+)?[wx]))(?=,\s*https?:\/\/|$)/gi),
  ]
    .map((match) => {
      const scored = scoreImageUrl(match[1]?.trim() || '')
      const url = scored.url
      const descriptor = match[2] || ''
      const dimensions = imageDimensionsFromUrl(url)
      const descriptorWidth = descriptor.endsWith('w')
        ? Number.parseInt(descriptor, 10)
        : descriptor.endsWith('x')
          ? Math.round(Number.parseFloat(descriptor) * 1000)
          : 0
      const width = Math.max(descriptorWidth, dimensions?.width || 0)
      return { url, width, score: scored.score }
    })
    .filter((candidate) => candidate.url)
    .sort((a, b) => b.score - a.score || b.width - a.width)

  if (candidates.length) return candidates[0]?.url || ''

  const fallbackCandidates = srcset
    .split(/,\s*(?=https?:\/\/|\/)/i)
    .map((entry) => {
      const [url, descriptor] = entry.trim().split(/\s+/)
      const scored = scoreImageUrl(url)
      const width = descriptor?.endsWith('w') ? Number.parseInt(descriptor, 10) : imageDimensionsFromUrl(scored.url)?.width || 0
      return { url: scored.url, width, score: scored.score }
    })
    .filter((candidate) => candidate.url)
    .sort((a, b) => b.score - a.score || b.width - a.width)

  return fallbackCandidates[0]?.url || ''
}

function getAttribute(tag: string, attribute: string) {
  return tag.match(new RegExp(`${attribute}=["']([^"']*)["']`, 'i'))?.[1] || ''
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function absolutizeUrl(value: string, baseUrl: string) {
  if (!value) return ''
  try {
    return normalizeCdnImageUrl(new URL(value, baseUrl).toString())
  } catch {
    return ''
  }
}

function isTrustedImageCdn(value: string) {
  return TRUSTED_IMAGE_CDN_PATTERN.test(value)
}

function normalizeCdnImageUrl(value: string) {
  if (!value) return ''
  const decoded = decodeHtml(value).trim()
  if (!decoded) return ''

  try {
    const url = new URL(decoded)

    if (/static\.wixstatic\.com$/i.test(url.hostname) || /static\.parastorage\.com$/i.test(url.hostname)) {
      const mediaMatch = url.pathname.match(/^(\/media\/[^/]+\.(?:jpe?g|png|webp|avif))(?:\/.*)?$/i)
      if (mediaMatch?.[1]) {
        url.pathname = mediaMatch[1]
        url.search = ''
        url.hash = ''
        return url.toString()
      }
    }

    if (/cdn\.shopify\.com$/i.test(url.hostname) || /\.myshopify\.com$/i.test(url.hostname)) {
      url.pathname = url.pathname.replace(
        /_(?:\d+x\d*|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|master)(?=\.(?:jpe?g|png|webp|avif)$)/i,
        ''
      )
      url.search = ''
      url.hash = ''
      return url.toString()
    }

    if (/squarespace-cdn\.com$/i.test(url.hostname) || /images\.squarespace-cdn\.com$/i.test(url.hostname)) {
      url.hash = ''
      return url.toString()
    }

    if (/res\.cloudinary\.com$/i.test(url.hostname)) {
      url.hash = ''
      return url.toString()
    }
  } catch {
    return decoded
  }

  return decoded
}

function normalizeBusinessType(value: unknown): WebsiteAnalysisResult['businessType'] {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('local')) return 'local'
  if (normalized.includes('product') || normalized.includes('ecommerce') || normalized.includes('電商') || normalized.includes('產品')) return 'products'
  return 'services'
}

function stringValue(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}
