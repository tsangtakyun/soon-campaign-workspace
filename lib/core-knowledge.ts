type CoreAsset = {
  assetType: 'topic' | 'direction' | 'method'
  ref: string
  evidenceLevel: string
  content: Record<string, unknown>
}

type CoreIndustry = {
  code: string
  label_zh: string
  label_en: string
  description: string
  monitor_profile: Record<string, unknown>
  compliance_level: 'standard' | 'elevated' | 'regulated'
}

type CoreBundle = {
  bundleVersion: string
  contentHash: string
  assets: CoreAsset[]
  taxonomy?: { industries?: CoreIndustry[]; industryAliases?: Array<{ alias: string; code: string }> }
}

function terms(value: string) {
  return [...new Set(value.toLowerCase().split(/[\s,，。／/·|：:（）()]+/).filter((item) => item.length > 1))]
}

export async function loadCoreIndustryKnowledge(query: string) {
  const key = process.env.SOON_CORE_BUNDLE_KEY || process.env.SOON_CORE_KNOWLEDGE_KEY
  const baseUrl = process.env.SOON_CORE_URL || 'https://soon-core.vercel.app'
  if (!key) return null
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/intelligence/bundle`, {
      headers: { 'x-soon-knowledge-key': key }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Core bundle returned ${response.status}`)
    const bundle = await response.json() as CoreBundle
    const needles = terms(query)
    const aliases = bundle.taxonomy?.industryAliases ?? []
    const matchedCodes = new Set(aliases.filter((item) => needles.some((term) => item.alias.toLowerCase().includes(term) || term.includes(item.alias.toLowerCase()))).map((item) => item.code))
    const industries = (bundle.taxonomy?.industries ?? []).map((industry) => ({
      ...industry,
      score: (matchedCodes.has(industry.code) ? 5 : 0) + needles.reduce((score, term) => score + (JSON.stringify(industry).toLowerCase().includes(term) ? 1 : 0), 0),
    })).sort((a, b) => b.score - a.score).slice(0, 3)
    const assets = (bundle.assets ?? []).map((asset) => ({ asset, score: needles.reduce((score, term) => score + (JSON.stringify(asset.content).toLowerCase().includes(term) ? 1 : 0), 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map((item) => item.asset)
    return { bundleVersion: bundle.bundleVersion, contentHash: bundle.contentHash, industries, assets }
  } catch (error) {
    console.error('[core knowledge] bundle unavailable; continuing without it', error)
    return null
  }
}
