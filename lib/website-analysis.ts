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
  headings: string[]
  text: string
}

export async function analyzeWebsiteWithClaude(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const website = await scrapeWebsite(input.website)
  const model = process.env.ANTHROPIC_WEBSITE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

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
  const response = await fetch(url, {
    headers: {
      'user-agent': 'SOON Website Analyzer/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Unable to read website (${response.status})`)
  }

  const html = await response.text()
  const title = decodeHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const description = decodeHtml(matchMeta(html, 'description') || matchMeta(html, 'og:description'))
  const brandHint = cleanText(title).split(/[\s|｜-]/)[0] || ''
  const logoUrl = absolutizeUrl(
    matchLogoImage(html, brandHint) ||
      matchMeta(html, 'og:logo') ||
      matchMeta(html, 'og:image') ||
      matchLink(html, 'apple-touch-icon') ||
      matchLink(html, 'icon'),
    url
  )
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

  return { url, title, description, logoUrl, headings, text }
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
      const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src') || getAttribute(tag, 'data-nimg')
      const alt = getAttribute(tag, 'alt')
      const className = getAttribute(tag, 'class')
      const ariaLabel = getAttribute(tag, 'aria-label')
      const scoreText = `${src} ${alt} ${className} ${ariaLabel}`.toLowerCase()
      const brand = brandHint.toLowerCase()
      let score = 0
      if (scoreText.includes('logo')) score += 4
      if (scoreText.includes('brand')) score += 2
      if (brand && scoreText.includes(brand)) score += 2
      if (scoreText.includes('icon')) score += 1
      return { src, score }
    })
    .filter((image) => image.src && image.score > 0)
    .sort((a, b) => b.score - a.score)

  return images[0]?.src || ''
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
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
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
