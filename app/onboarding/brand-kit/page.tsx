'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import {
  getOrCreateOnboardingSessionId,
  getStoredOnboardingSessionId,
  markOnboardingPersisted,
} from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { typefaces } from '@/lib/typefaces'
import { visualStylePresets } from '@/lib/visual-styles'
import {
  isBechillWorkspace,
  isEggWorkspace,
  resolveActiveWorkspace,
  workspaceInitial,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'

const tabs = ['來源素材', '媒體素材', '品牌樣式', '品牌聲音', '品牌資料'] as const

type BrandTab = (typeof tabs)[number]

const bunchillLogoUrl = '/brand-assets/bechilltogether/bunchill-logo.png'
const bunchillBrandColors = [
  { hex: '#F7F1EC', name: '奶白底色' },
  { hex: '#CFE3F1', name: '睡衣粉藍' },
  { hex: '#F1B8C6', name: '柔粉紅' },
  { hex: '#EFE3D2', name: '暖米色' },
  { hex: '#171717', name: '墨黑線條' },
]
const bunchillVisualStyle = '柔和手繪故事卡'
const bunchillTypeface = 'NaniFont'

const eggSoonLogoUrl = '/brand-assets/eggsoon/soon-egg.png'
const eggSoonBrandColors = [
  { hex: '#F4D547', name: 'Eggy 黃' },
  { hex: '#111111', name: '新聞黑' },
  { hex: '#F6F1E7', name: '米白紙感' },
  { hex: '#E24B35', name: '警示紅橙' },
  { hex: '#FFFFFF', name: '留白底色' },
]
const eggSoonVisualStyle = 'Editorial news carousel'
const eggSoonTypeface = 'GenSenRounded2 / 系統圓體'

const bunchillCoreAssets = [
  {
    category: '角色設定',
    description: '現行唯一角色體態、比例、服裝、肚腩及 chill 位置基準；每次生成必傳。',
    image: '/brand-assets/bechilltogether/bunchill-2D-character-sheet.png',
    title: 'Bunchill Character Sheet',
  },
  {
    category: '視覺語言',
    description: '線條、厚上色、柔和陰影、暖米白底及生活場景處理；每次生成必傳。',
    image: '/brand-assets/bechilltogether/bunchill-visual-language.png',
    title: 'Bunchill Visual Language',
  },
  {
    category: '表情 Clean',
    description: '日常、興奮、驚、煩躁。無標籤文字，供模型直接參考。',
    image: '/brand-assets/bechilltogether/bunchill-expression-core-clean.png',
    title: 'Expression Core',
  },
  {
    category: '表情 Clean',
    description: '悶、自信、拜託、傷心、嬲。無標籤文字，供模型直接參考。',
    image: '/brand-assets/bechilltogether/bunchill-expression-extended-clean.png',
    title: 'Expression Extended',
  },
  {
    category: '表情索引',
    description: '九種表情中英對照。生成時只作語義索引，禁止複製標籤或 sheet 排版。',
    image: '/brand-assets/bechilltogether/bunchill-expression-master-annotated.png',
    title: 'Nine-expression Master',
  },
]

const eggSoonCoreAssets = [
  {
    category: '角色設定',
    description: 'Eggy 固定角色比例、蛋白輪廓、蛋黃五官、手腳與整體質感。',
    image: '/brand-assets/eggsoon/eggy-character-sheet.png',
    title: 'Eggy 角色設定',
  },
  {
    category: '表情與動作',
    description: '可用表情與動作庫；Eggy 只作情緒輔助或觀眾視角，不需要每頁出現。',
    image: '/brand-assets/eggsoon/eggy-expression-library.png',
    title: 'Eggy 表情庫',
  },
  {
    category: '視覺語言',
    description: 'Egg.soon 的 news carousel 色彩、排版、資訊層次與品牌氣質。',
    image: '/brand-assets/eggsoon/egg-soon-visual-language.png',
    title: 'Egg.soon 視覺語言',
  },
  {
    category: '封面參考',
    description: '黑底緊急新聞、情緒人物、米白權威新聞、黃色好奇知識型等封面方向。',
    image: '/brand-assets/eggsoon/approved-carousel-references/01_cover-hooks/cover-yellow-curiosity-animal-fact.png',
    title: 'Approved Cover Hooks',
  },
]

type BrandKit = {
  business_name: string | null
  business_type: string | null
  website_url: string | null
  elevator_pitch: string | null
  language: string | null
  logo_url: string | null
  audience: unknown
  market_positioning: unknown
  visual_style_title: string | null
  visual_style_id?: string | null
  typeface_family: string | null
  typeface_id?: string | null
  typeface_direction?: string | null
  typeface_weight?: string | null
  typeface_name?: string | null
  brand_profile: unknown
  raw_business_profile: unknown
}

type BrandAsset = {
  id: string
  asset_type: string
  url: string
  filename: string | null
  is_used: boolean
  source_url?: string | null
}

type BrandSource = {
  id: string
  url: string
  type: string
  status: string
  last_scanned_at: string | null
  created_at: string | null
}

type BrandProfile = {
  business_name: string | null
  business_overview: string | null
  market_positioning: unknown
  competitors: unknown
  competitive_advantages: unknown
  customer_segments: unknown
}

type BrandVoice = {
  purpose: string | null
  audience: string | null
  tone: unknown
  emotion: unknown
  character: unknown
  syntax: unknown
  language: unknown
}

type WorkspaceBrandStyle = {
  logo_url: string | null
  visual_style: string | null
  font_style: string | null
  visual_identity_description: string | null
  brand_colors: unknown
}

type EditableProfileField =
  | 'business_name'
  | 'business_overview'
  | 'market_positioning'
  | 'competitors'
  | 'competitive_advantages'

type MediaFilter = 'all' | 'website' | 'upload'

type BrandVoiceScalarField = 'purpose' | 'audience'
type BrandVoiceTagField = 'tone' | 'emotion' | 'character' | 'syntax' | 'language'

const fallbackBrand: BrandKit = {
  audience: null,
  brand_profile: null,
  business_name: '',
  business_type: null,
  elevator_pitch: null,
  language: 'zh-HK',
  logo_url: null,
  market_positioning: null,
  raw_business_profile: null,
  typeface_family: null,
  visual_style_title: null,
  website_url: null,
}

function readSessionJson(key: string) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildOnboardingCompletePayload(workspaceId: string | null) {
  return {
    sessionId: getOrCreateOnboardingSessionId(),
    websiteAnalysis: readSessionJson('soon-website-analysis-v1'),
    businessProfile: readSessionJson('soon-business-profile-v1'),
    contentStrategy: readSessionJson('soon-content-strategy-v1'),
    campaignDetails: readSessionJson('soon-campaign-details-v1'),
    distributionPrefs: readSessionJson('soon-distribution-preferences-v1'),
    contentMix: readSessionJson('soon-content-mix-v1'),
    contentMood: readSessionJson('soon-content-mood-v1'),
    visualStyle: readSessionJson('soon-visual-style-v1'),
    typeface: readSessionJson('soon-typeface-v1'),
    photoControl: readSessionJson('soon-photo-control-v2'),
    topicReview: readSessionJson('soon-topic-review-v1'),
    campaignThemes: readSessionJson('soon-campaign-themes-v1'),
    workspaceId,
  }
}

async function backfillBrandKitFromOnboardingSession(workspaceId: string | null) {
  const payload = buildOnboardingCompletePayload(workspaceId)
  if (!payload.sessionId) return false
  if (!payload.businessProfile && !payload.websiteAnalysis) return false

  try {
    const response = await fetch('/api/onboarding/complete', {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!response.ok) return false
    markOnboardingPersisted()
    return true
  } catch {
    return false
  }
}

function displayImageUrl(value: string | null) {
  if (!value) return ''
  if (value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('/')) return value
  return `/api/logo-image?url=${encodeURIComponent(value)}`
}

function visualStyleLabel(brand: BrandKit) {
  return brand.visual_style_title || brand.visual_style_id || '未設定'
}

function typefaceLabel(brand: BrandKit) {
  return (
    brand.typeface_name ||
    brand.typeface_family ||
    brand.typeface_id ||
    brand.typeface_direction ||
    '未設定'
  )
}

function formatJsonValue(value: unknown) {
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-HK')
}

function sourceStatusLabel(status: string) {
  const map: Record<string, string> = {
    done: '完成',
    error: '錯誤',
    pending: '分析中...',
    scanning: '分析中...',
  }
  return map[status] ?? status
}

function sourceName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function colorSwatches(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return { hex: item, name: item }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          const hex = typeof record.hex === 'string' ? record.hex : ''
          const name = typeof record.name === 'string' ? record.name : hex
          return hex ? { hex, name } : null
        }
        return null
      })
      .filter((item): item is { hex: string; name: string } => Boolean(item?.hex) && !isGenericSystemBlue(item.hex))
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return colorSwatches(parsed)
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean).filter((hex) => !isGenericSystemBlue(hex)).map((hex) => ({ hex, name: hex }))
    }
  }
  return []
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

function normalizeHexColor(value: string) {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  return `#${hex.slice(0, 6)}`.toLowerCase()
}

function visualStyleDisplayName(value: string | null | undefined, brand: BrandKit) {
  if (!value) return visualStyleLabel(brand)
  const preset = visualStylePresets.find((style) => style.id === value || style.name === value || style.chineseName === value)
  return preset?.chineseName || preset?.titleZh || preset?.name || value
}

function typefaceDisplayName(value: string | null | undefined, brand: BrandKit) {
  if (!value) return typefaceLabel(brand)
  const font = typefaces.find((typeface) => typeface.id === value || typeface.fontFamily === value || typeface.name === value)
  return font?.name || value
}

function voiceScalarValue(voice: BrandVoice | null, field: BrandVoiceScalarField) {
  return field === 'purpose' ? voice?.purpose || '' : voice?.audience || ''
}

function voiceTagsValue(voice: BrandVoice | null, field: BrandVoiceTagField) {
  if (!voice) return []
  return asArray(voice[field])
}

function normalizeMediaImageUrl(value: string | null | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return normalizeWixImageUrl(trimmed)
  if (trimmed.startsWith('//')) return normalizeWixImageUrl(`https:${trimmed}`)
  if (trimmed.startsWith('static.wixstatic.com/') || trimmed.startsWith('media.wixstatic.com/')) {
    return normalizeWixImageUrl(`https://${trimmed}`)
  }
  if (/^[\w-]+_[\w~-]+\.(jpg|jpeg|png|webp)$/i.test(trimmed)) {
    return `https://static.wixstatic.com/media/${trimmed}`
  }
  if (trimmed.startsWith('/')) return trimmed
  return trimmed
}

function normalizeWixImageUrl(value: string) {
  try {
    const url = new URL(value)
    if (!/(^|\.)wixstatic\.com$/i.test(url.hostname)) return value
    url.hostname = 'static.wixstatic.com'
    url.protocol = 'https:'

    const mediaPrefix = '/media/'
    const mediaStart = url.pathname.indexOf(mediaPrefix)
    if (mediaStart < 0) return url.toString()

    const filenameStart = mediaStart + mediaPrefix.length
    const v1Start = url.pathname.indexOf('/v1/', filenameStart)
    const filenameEnd = v1Start >= 0 ? v1Start : url.pathname.indexOf('/', filenameStart)
    const encodedFilename = filenameEnd >= 0
      ? url.pathname.slice(filenameStart, filenameEnd)
      : url.pathname.slice(filenameStart)
    const filename = decodeURIComponent(encodedFilename)
    if (!filename) return url.toString()

    return `https://static.wixstatic.com/media/${filename}/v1/fill/w_600,h_600,al_c,q_85/${filename}`
  } catch {
    return value
  }
}

function linesFromArray(value: unknown) {
  return asArray(value).join('\n')
}

function arrayFromLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function arrayFromCommaList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function draftForProfileField(field: EditableProfileField, profile: BrandProfile, brand: BrandKit) {
  if (field === 'business_name') return profile.business_name || brand.business_name || ''
  if (field === 'business_overview') return profile.business_overview || brand.elevator_pitch || ''
  if (field === 'market_positioning') return linesFromArray(profile.market_positioning)
  if (field === 'competitive_advantages') return linesFromArray(profile.competitive_advantages)
  const competitors = asRecord(profile.competitors)
  return {
    international: asArray(competitors.international).join(', '),
    local: asArray(competitors.local).join(', '),
  }
}

function profileFieldPayload(field: EditableProfileField, draft: unknown) {
  if (field === 'market_positioning' || field === 'competitive_advantages') {
    return arrayFromLines(typeof draft === 'string' ? draft : '')
  }
  if (field === 'competitors') {
    const record = asRecord(draft)
    return {
      international: arrayFromCommaList(typeof record.international === 'string' ? record.international : ''),
      local: arrayFromCommaList(typeof record.local === 'string' ? record.local : ''),
    }
  }
  return typeof draft === 'string' ? draft.trim() : ''
}

export default function BrandKitPage() {
  const [activeTab, setActiveTab] = useState<BrandTab>('品牌樣式')
  const [brand, setBrand] = useState<BrandKit>(fallbackBrand)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sources, setSources] = useState<BrandSource[]>([])
  const [workspaceStyle, setWorkspaceStyle] = useState<WorkspaceBrandStyle | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceLabel, setWorkspaceLabel] = useState('你的工作台')
  const [isBechillActive, setIsBechillActive] = useState(false)
  const [isEggActive, setIsEggActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [analysisNotice, setAnalysisNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProfileField, setEditingProfileField] = useState<EditableProfileField | null>(null)
  const [profileDraft, setProfileDraft] = useState<unknown>('')
  const [savingProfileField, setSavingProfileField] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [failedAssetIds, setFailedAssetIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingVisualStyle, setEditingVisualStyle] = useState(false)
  const [editingTypeface, setEditingTypeface] = useState(false)
  const [visualStyleDraft, setVisualStyleDraft] = useState('')
  const [typefaceDraft, setTypefaceDraft] = useState('')
  const [visualIdentityDraft, setVisualIdentityDraft] = useState('')
  const [savingVisualIdentity, setSavingVisualIdentity] = useState(false)
  const [editingVoiceScalar, setEditingVoiceScalar] = useState<BrandVoiceScalarField | null>(null)
  const [voiceScalarDraft, setVoiceScalarDraft] = useState('')
  const [addingVoiceTag, setAddingVoiceTag] = useState<BrandVoiceTagField | null>(null)
  const [voiceTagDraft, setVoiceTagDraft] = useState('')
  const [savingBrandVoice, setSavingBrandVoice] = useState(false)

  const filteredAssets = useMemo(() => {
    if (mediaFilter === 'website') return assets.filter((asset) => asset.asset_type === 'website_image')
    if (mediaFilter === 'upload') return assets.filter((asset) => asset.asset_type !== 'website_image')
    return assets
  }, [assets, mediaFilter])
  const brandColorItems = useMemo(() => colorSwatches(workspaceStyle?.brand_colors), [workspaceStyle?.brand_colors])
  const workspaceCoreAssets = isEggActive ? eggSoonCoreAssets : isBechillActive ? bunchillCoreAssets : []
  const workspaceFallbackColors = isEggActive ? eggSoonBrandColors : isBechillActive ? bunchillBrandColors : []
  const fallbackLogoUrl = isEggActive ? eggSoonLogoUrl : isBechillActive ? bunchillLogoUrl : ''
  const fallbackVisualStyle = isEggActive ? eggSoonVisualStyle : isBechillActive ? bunchillVisualStyle : '尚未設定'
  const fallbackTypeface = isEggActive ? eggSoonTypeface : isBechillActive ? bunchillTypeface : '尚未設定'
  const visualStyleNote = isEggActive
    ? '資料核查、強 hook、4:5 editorial 排版，適合新聞、熱話、文化現象及品牌空間分析。'
    : isBechillActive
      ? '2D 手繪角色、清晰中粗深啡描邊、厚上色與柔和陰影；暖米白及低飽和生活場景，角色保持畫面主體。'
      : ''

  useEffect(() => {
    setVisualIdentityDraft(workspaceStyle?.visual_identity_description || '')
  }, [workspaceStyle?.visual_identity_description])

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/workspace-settings?workspace_id=${encodeURIComponent(workspaceId)}`, {
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((data) => {
        const nextWorkspaceStyle = (data?.workspace || data || null) as WorkspaceBrandStyle | null
        if (nextWorkspaceStyle?.brand_colors || nextWorkspaceStyle?.visual_identity_description) {
          setWorkspaceStyle(nextWorkspaceStyle)
        }
      })
      .catch(console.error)
  }, [workspaceId])

  async function refreshBrandKit(targetWorkspaceId?: string | null) {
    const resolvedWorkspaceId = targetWorkspaceId || workspaceId
    if (!resolvedWorkspaceId) return

    const [response, workspaceResponse] = await Promise.all([
      fetch(`/api/brand-kit-data?workspace_id=${encodeURIComponent(resolvedWorkspaceId)}`, {
        cache: 'no-store',
      }),
      fetch(`/api/workspace-settings?workspace_id=${encodeURIComponent(resolvedWorkspaceId)}`, {
        cache: 'no-store',
      }),
    ])
    const payload = await response.json().catch(() => null)
    const workspacePayload = await workspaceResponse.json().catch(() => null)
    const nextWorkspaceStyle = (workspacePayload?.workspace || workspacePayload || null) as WorkspaceBrandStyle | null

    if (workspaceResponse.ok && nextWorkspaceStyle) setWorkspaceStyle(nextWorkspaceStyle)

    if (!response.ok || !payload) return

    setSources((payload.sources || []) as BrandSource[])
    setBrandProfile((payload.brandProfile || null) as BrandProfile | null)
    setBrandVoice((payload.brandVoice || null) as BrandVoice | null)
    setAssets((payload.assets || []) as BrandAsset[])
  }

  async function openGeneratedTab(tab: Extract<BrandTab, '品牌資料' | '品牌聲音'>) {
    if (workspaceId) await refreshBrandKit(workspaceId)
    setActiveTab(tab)
  }

  function startProfileEdit(field: EditableProfileField) {
    if (!brandProfile) return
    setSaveNotice('')
    setEditingProfileField(field)
    setProfileDraft(draftForProfileField(field, brandProfile, brand))
  }

  function cancelProfileEdit() {
    setEditingProfileField(null)
    setProfileDraft('')
  }

  async function saveProfileEdit(field: EditableProfileField) {
    if (!workspaceId) return
    setSavingProfileField(true)
    setSaveNotice('')

    try {
      const response = await fetch('/api/brand-kit-data', {
        body: JSON.stringify({
          field,
          value: profileFieldPayload(field, profileDraft),
          workspace_id: workspaceId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '儲存失敗')
      setBrandProfile((payload?.brandProfile || null) as BrandProfile | null)
      setEditingProfileField(null)
      setProfileDraft('')
      setSaveNotice('已儲存')
      window.setTimeout(() => setSaveNotice(''), 2200)
      await refreshBrandKit(workspaceId)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSavingProfileField(false)
    }
  }

  async function handleMediaUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !workspaceId) return
    setUploadingMedia(true)
    setAnalysisError('')

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('請先登入')

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const storagePath = `${user.id}/brand-kit/${workspaceId}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
      const { error: insertError } = await supabase.from('brand_assets').insert({
        asset_type: 'upload',
        filename: file.name,
        is_used: false,
        source_url: null,
        url: publicUrlData.publicUrl,
        user_id: user.id,
        workspace_id: workspaceId,
      })
      if (insertError) throw insertError

      await refreshBrandKit(workspaceId)
      setSaveNotice('已新增媒體')
      window.setTimeout(() => setSaveNotice(''), 2200)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '上傳失敗')
    } finally {
      setUploadingMedia(false)
      event.target.value = ''
    }
  }

  async function updateWorkspaceSettings(updates: Record<string, unknown>) {
    if (!workspaceId) return null
    const response = await fetch('/api/workspace-settings', {
      body: JSON.stringify({ updates, workspace_id: workspaceId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload?.error || '儲存失敗')
    setWorkspaceStyle((payload.workspace || payload || null) as WorkspaceBrandStyle | null)
    setSaveNotice('已儲存 ✓')
    window.setTimeout(() => setSaveNotice(''), 2200)
    return payload.workspace as WorkspaceBrandStyle
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !workspaceId) return
    setUploadingLogo(true)
    setAnalysisError('')

    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const storagePath = `${workspaceId}/logo/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(storagePath, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
      await updateWorkspaceSettings({ logo_url: publicUrlData.publicUrl })
      await refreshBrandKit(workspaceId)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Logo 上傳失敗')
    } finally {
      setUploadingLogo(false)
      event.target.value = ''
    }
  }

  async function handleVisualStyleChange(value: string) {
    if (!value) return
    await updateWorkspaceSettings({ visual_style: value })
    setEditingVisualStyle(false)
    if (workspaceId) await refreshBrandKit(workspaceId)
  }

  function openVisualStylePicker() {
    setVisualStyleDraft(workspaceStyle?.visual_style || '')
    setEditingVisualStyle(true)
  }

  async function handleTypefaceChange(value: string) {
    if (!value) return
    await updateWorkspaceSettings({ font_style: value })
    setEditingTypeface(false)
    if (workspaceId) await refreshBrandKit(workspaceId)
  }

  function openTypefacePicker() {
    setTypefaceDraft(workspaceStyle?.font_style || '')
    setEditingTypeface(true)
  }

  async function addBrandColor(value: string) {
    const hex = normalizeHexColor(value)
    if (!hex || !workspaceId) return
    const nextColors = [
      ...colorSwatches(workspaceStyle?.brand_colors),
      { hex, name: '品牌色' },
    ].filter((color, index, list) => list.findIndex((item) => item.hex === color.hex) === index)
    await updateWorkspaceSettings({ brand_colors: nextColors })
    await refreshBrandKit(workspaceId)
  }

  async function removeBrandColor(hex: string) {
    if (!workspaceId) return
    const nextColors = colorSwatches(workspaceStyle?.brand_colors).filter((color) => color.hex !== hex)
    await updateWorkspaceSettings({ brand_colors: nextColors })
    await refreshBrandKit(workspaceId)
  }

  async function saveVisualIdentityDescription() {
    if (!workspaceId) return
    const current = workspaceStyle?.visual_identity_description || ''
    if (visualIdentityDraft.trim() === current.trim()) return
    setSavingVisualIdentity(true)
    try {
      const response = await fetch('/api/brand-kit-data', {
        body: JSON.stringify({
          field: 'visual_identity_description',
          value: visualIdentityDraft,
          workspace_id: workspaceId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '儲存失敗')
      setWorkspaceStyle((payload.workspace || null) as WorkspaceBrandStyle | null)
      setSaveNotice('已儲存 ✓')
      window.setTimeout(() => setSaveNotice(''), 2200)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSavingVisualIdentity(false)
    }
  }

  function startVoiceScalarEdit(field: BrandVoiceScalarField) {
    setAddingVoiceTag(null)
    setEditingVoiceScalar(field)
    setVoiceScalarDraft(voiceScalarValue(brandVoice, field))
  }

  function cancelVoiceEdit() {
    setEditingVoiceScalar(null)
    setVoiceScalarDraft('')
    setAddingVoiceTag(null)
    setVoiceTagDraft('')
  }

  async function patchBrandVoice(field: BrandVoiceScalarField | BrandVoiceTagField, value: string | string[]) {
    if (!workspaceId) return
    setSavingBrandVoice(true)
    try {
      const response = await fetch('/api/brand-kit-data', {
        body: JSON.stringify({ field, value, workspace_id: workspaceId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '儲存失敗')
      setBrandVoice((payload.brandVoice || null) as BrandVoice | null)
      setSaveNotice('已儲存 ✓')
      window.setTimeout(() => setSaveNotice(''), 2200)
      cancelVoiceEdit()
      await refreshBrandKit(workspaceId)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSavingBrandVoice(false)
    }
  }

  function startVoiceTagAdd(field: BrandVoiceTagField) {
    setEditingVoiceScalar(null)
    setAddingVoiceTag(field)
    setVoiceTagDraft('')
  }

  async function addVoiceTag(field: BrandVoiceTagField) {
    const tag = voiceTagDraft.trim()
    if (!tag) return
    const nextTags = [...voiceTagsValue(brandVoice, field), tag]
      .filter((item, index, list) => list.indexOf(item) === index)
    await patchBrandVoice(field, nextTags)
  }

  async function removeVoiceTag(field: BrandVoiceTagField, tag: string) {
    const nextTags = voiceTagsValue(brandVoice, field).filter((item) => item !== tag)
    await patchBrandVoice(field, nextTags)
  }

  async function handleAnalyzeSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId || !sourceUrl.trim() || analyzing) return

    setAnalyzing(true)
    setAnalysisError('')

    try {
      const response = await fetch('/api/analyze-brand-source', {
        body: JSON.stringify({ workspace_id: workspaceId, url: sourceUrl.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '分析失敗')
      const sourceId = typeof payload?.id === 'string' ? payload.id : ''
      if (sourceId) {
        const pendingSource: BrandSource = {
          created_at: new Date().toISOString(),
          id: sourceId,
          last_scanned_at: null,
          status: payload?.status || 'pending',
          type: 'website',
          url: payload?.url || sourceUrl.trim(),
        }
        setSources((current) => [pendingSource, ...current.filter((source) => source.id !== sourceId)])
        void fetch('/api/analyze-brand-source-worker', {
          body: JSON.stringify({
            brand_source_id: sourceId,
            workspace_id: workspaceId,
            url: payload?.url || sourceUrl.trim(),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        pollBrandSourceStatus(sourceId, workspaceId)
      }
      setSourceUrl('')
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '分析失敗，請稍後再試。')
    } finally {
      setAnalyzing(false)
    }
  }

  function pollBrandSourceStatus(sourceId: string, targetWorkspaceId: string) {
    const startedAt = Date.now()
    const poll = async () => {
      if (Date.now() - startedAt > 120000) {
        setAnalysisError('分析逾時，請稍後重新整理查看結果。')
        setAnalyzing(false)
        return
      }

      try {
        const response = await fetch(`/api/brand-source-status?id=${encodeURIComponent(sourceId)}`, {
          cache: 'no-store',
        })
        const status = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(status?.error || 'Unable to load status')

        setSources((current) =>
          current.map((source) =>
            source.id === sourceId
              ? {
                  ...source,
                  last_scanned_at: status.last_scanned_at || source.last_scanned_at,
                  status: status.status || source.status,
                }
              : source
          )
        )

        if (status.status === 'done') {
          await refreshBrandKit(targetWorkspaceId)
          setAnalysisNotice('品牌分析完成！')
          setActiveTab('品牌資料')
          setAnalyzing(false)
          return
        }

        if (status.status === 'error') {
          await refreshBrandKit(targetWorkspaceId)
          setAnalysisError('分析失敗，請重試')
          setAnalyzing(false)
          return
        }

        window.setTimeout(poll, 3000)
      } catch {
        window.setTimeout(poll, 3000)
      }
    }

    window.setTimeout(poll, 3000)
  }

  useEffect(() => {
    let cancelled = false

    async function loadBrandKit() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()

        if (!user?.id && !sessionId) return
        let workspaceId: string | null = null

        const buildBrandQuery = () => supabase.from('brand_kits').select('*').order('updated_at', { ascending: false }).limit(1)
        const buildAssetsQuery = () => supabase.from('brand_assets').select('*').order('created_at', { ascending: false })
        let brandQuery = buildBrandQuery()
        let assetsQuery = supabase.from('brand_assets').select('*').order('created_at', { ascending: false })

        if (user?.id) {
          const resolvedWorkspace = await resolveActiveWorkspace()
          workspaceId = resolvedWorkspace.workspaceId
          if (!workspaceId) return
          if (!cancelled) {
            setWorkspaceId(workspaceId)
            setWorkspaceLabel(resolvedWorkspace.activeWorkspace?.brandName || resolvedWorkspace.activeWorkspace?.name || '你的工作台')
            setIsBechillActive(isBechillWorkspace(resolvedWorkspace.activeWorkspace))
            setIsEggActive(isEggWorkspace(resolvedWorkspace.activeWorkspace))
          }

          brandQuery = brandQuery.eq('workspace_id', workspaceId)
          assetsQuery = buildAssetsQuery().eq('workspace_id', workspaceId)
        } else if (sessionId) {
          brandQuery = brandQuery.eq('onboarding_session_id', sessionId)
          assetsQuery = assetsQuery.eq('onboarding_session_id', sessionId)
        }

        const [{ data: brandData, error: brandError }, { data: assetData, error: assetError }] = await Promise.all([
          brandQuery.maybeSingle(),
          assetsQuery,
        ])

        let nextBrandData = brandData
        let nextAssetData = assetData

        if (!brandData && sessionId) {
          const backfilled = await backfillBrandKitFromOnboardingSession(workspaceId)
          if (backfilled) {
            const retryBrandQuery = user?.id && workspaceId
              ? buildBrandQuery().eq('workspace_id', workspaceId)
              : buildBrandQuery().eq('onboarding_session_id', sessionId)
            const retryAssetsQuery = user?.id && workspaceId
              ? buildAssetsQuery().eq('workspace_id', workspaceId)
              : buildAssetsQuery().eq('onboarding_session_id', sessionId)
            const [{ data: retryBrandData }, { data: retryAssetData }] = await Promise.all([
              retryBrandQuery.maybeSingle(),
              retryAssetsQuery,
            ])
            nextBrandData = retryBrandData
            nextAssetData = retryAssetData
          }
        }

        if (cancelled) return
        setBrand(!brandError && nextBrandData ? (nextBrandData as BrandKit) : fallbackBrand)
        setAssets(!assetError && nextAssetData ? (nextAssetData as BrandAsset[]) : [])
        if (workspaceId) await refreshBrandKit(workspaceId)
      } catch {
        // Keep fallback until onboarding data is persisted.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBrandKit()

    function handleWorkspaceChanged() {
      setLoading(true)
      void loadBrandKit()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    void refreshBrandKit(workspaceId)
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    if (!['品牌資料', '品牌聲音', '品牌樣式', '媒體素材', '來源素材'].includes(activeTab)) return
    void refreshBrandKit(workspaceId)
  }, [activeTab, workspaceId])

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="品牌素材庫" />
      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar-left">
            <h1>品牌素材庫</h1>
          </div>
        </header>

        {loading ? (
          <div className="brand-kit-loading" aria-busy="true">
            <section className="brand-kit-loading-hero">
              <div>
                <span />
                <strong>正在載入品牌素材庫</strong>
                <p>SOON 正在讀取目前工作台的 Logo、角色設定及品牌視覺方向。</p>
              </div>
              <i />
            </section>
            <section className="brand-kit-loading-grid">
              <i />
              <i />
              <i />
            </section>
          </div>
        ) : (
        <div className="simple-brand-kit">
          {saveNotice ? <div className="brand-save-toast">{saveNotice}</div> : null}
          {analysisError ? <div className="simple-brand-alert">{analysisError}</div> : null}

          <section className="brand-hero-panel">
            <div>
              <span className="brand-kicker">{workspaceLabel}</span>
              <h2>品牌素材庫</h2>
              <p>此頁集中管理 Logo、角色設定、表情動作及品牌視覺方向，SOON 之後會依照這套素材生成內容。</p>
            </div>
            <div className="brand-logo-card">
              <span>Logo</span>
              {workspaceStyle?.logo_url || brand.logo_url || fallbackLogoUrl ? (
                <img
                  src={displayImageUrl(workspaceStyle?.logo_url || brand.logo_url || fallbackLogoUrl)}
                  alt={`${workspaceLabel} Logo`}
                />
              ) : (
                <div className="brand-logo-placeholder">{workspaceInitial(workspaceLabel)}</div>
              )}
              <label>
                {uploadingLogo ? '上傳中...' : '上傳 / 更換 Logo'}
                <input accept="image/*" type="file" onChange={handleLogoUpload} disabled={uploadingLogo || !workspaceId} />
              </label>
            </div>
          </section>

          <section className="simple-brand-section">
            <div className="simple-section-head">
              <div>
                <span className="brand-kicker">核心素材</span>
                <h3>角色、表情、視覺方向</h3>
              </div>
              <p>{workspaceCoreAssets.length ? `${workspaceCoreAssets.length} 個固定參考` : '尚未加入固定參考'}</p>
            </div>
            {workspaceCoreAssets.length ? (
              <div className="brand-asset-grid">
                {workspaceCoreAssets.map((asset) => (
                <article className="brand-asset-card" key={asset.title}>
                  <div className="brand-asset-image">
                    <img src={asset.image} alt={asset.title} loading="lazy" />
                  </div>
                  <div>
                    <span>{asset.category}</span>
                    <h4>{asset.title}</h4>
                    <p>{asset.description}</p>
                  </div>
                </article>
                ))}
              </div>
            ) : (
              <div className="simple-empty-panel">
                <strong>核心素材準備中</strong>
                <p>上傳 Logo、產品圖或視覺 reference 後，SOON 會在這裡整理成可跟隨的品牌素材。</p>
              </div>
            )}
          </section>

          <section className="simple-brand-section">
            <div className="simple-section-head">
              <div>
                <span className="brand-kicker">品牌設定</span>
                <h3>顏色、視覺風格、字體</h3>
              </div>
            </div>
            <div className="simple-settings-grid">
              <div>
                <label>品牌色</label>
                <div className="simple-color-row">
                  {(brandColorItems.length > 0 ? brandColorItems : workspaceFallbackColors).map((color) => (
                    <span className="simple-color-chip" key={color.hex}>
                      <i style={{ backgroundColor: color.hex }} />
                      <strong>{color.name}</strong>
                      <em>{color.hex}</em>
                    </span>
                  ))}
                  {brandColorItems.length === 0 && workspaceFallbackColors.length === 0 ? <span className="simple-unset">尚未設定</span> : null}
                </div>
              </div>
              <div>
                <label>視覺風格</label>
                <p>{workspaceStyle?.visual_style ? visualStyleDisplayName(workspaceStyle.visual_style, brand) : fallbackVisualStyle}</p>
                {visualStyleNote || workspaceStyle?.visual_style ? <em>{visualStyleNote}</em> : null}
              </div>
              <div>
                <label>字體</label>
                <p style={{ fontFamily: workspaceStyle?.font_style || 'NaniFont-Regular', fontSize: '20px' }}>
                  {workspaceStyle?.font_style ? typefaceDisplayName(workspaceStyle.font_style, brand) : fallbackTypeface}
                </p>
              </div>
            </div>
          </section>
        </div>
        )}

        {!loading ? <div className="brand-kit-layout">
          <nav className="brand-kit-subnav" aria-label="品牌素材庫分類">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`brand-kit-subnav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span>{tab}</span>
                {tab === '來源素材' ? <em>{sources.length}</em> : null}
              </button>
            ))}
          </nav>

          <div className="brand-kit-content">
            {analysisNotice ? (
              <div className="analysis-success-banner">
                <span>{analysisNotice}</span>
                <div>
                  <button type="button" onClick={() => void openGeneratedTab('品牌資料')}>查看品牌資料</button>
                  <button type="button" onClick={() => void openGeneratedTab('品牌聲音')}>查看品牌聲音</button>
                </div>
              </div>
            ) : null}
            {saveNotice ? <div className="brand-save-toast">{saveNotice}</div> : null}

            {activeTab === '來源素材' ? (
              <section>
                <div className="brand-kit-content-head">
                  <div>
                    <h2>來源素材</h2>
                    <p>{loading ? '載入中' : `${sources.length} 個來源`}</p>
                  </div>
                </div>

                <div className="source-materials-panel">
                  <p>
                    幫助 SOON 了解你的品牌。上傳行銷或品牌素材（網站、小冊子、影片、媒體報道等），SOON 會分析並應用到你的內容。
                  </p>
                  <form className="source-materials-form" onSubmit={handleAnalyzeSource}>
                    <input
                      aria-label="網站 URL"
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder="https://你的網站.com"
                      type="url"
                      value={sourceUrl}
                    />
                    <button type="submit" disabled={analyzing || !workspaceId}>
                      {analyzing ? '分析中...' : '＋ 新增來源素材'}
                    </button>
                  </form>
                  {analysisError ? <span className="source-error">{analysisError}</span> : null}
                </div>

                {sources.length === 0 ? (
                  <div className="brand-kit-empty">
                    <p>尚未新增來源素材</p>
                  </div>
                ) : (
                  <div className="source-table">
                    <div className="source-table-head">
                      <span>名稱</span>
                      <span>類型</span>
                      <span>最後掃描</span>
                      <span>新增日期</span>
                    </div>
                    {sources.map((source) => (
                      <div className="source-table-row" key={source.id}>
                        <span>
                          <strong>{sourceName(source.url)}</strong>
                          <em>{source.url}</em>
                        </span>
                        <span>{source.type === 'website' ? '網站' : source.type}</span>
                        <span>
                          {formatDateTime(source.last_scanned_at)}
                          <em className={`source-status ${source.status}`}>
                            {source.status === 'pending' || source.status === 'scanning' ? <i /> : null}
                            {sourceStatusLabel(source.status)}
                          </em>
                        </span>
                        <span>{formatDateTime(source.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === '媒體素材' ? (
              <section>
                <div className="brand-kit-content-head">
                  <div>
                    <h2>媒體素材</h2>
                    <p>{loading ? '載入中' : `${filteredAssets.length} / ${assets.length} 個檔案`}</p>
                  </div>
                  <label className="home-create-btn media-upload-btn">
                    {uploadingMedia ? '上傳中...' : '＋ 新增媒體'}
                    <input accept="image/*" type="file" onChange={handleMediaUpload} disabled={uploadingMedia || !workspaceId} />
                  </label>
                </div>

                <div className="media-filter-tabs" aria-label="媒體類型">
                  {[
                    { id: 'all', label: '所有' },
                    { id: 'website', label: '網站圖片' },
                    { id: 'upload', label: '上傳' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={mediaFilter === filter.id ? 'active' : ''}
                      onClick={() => setMediaFilter(filter.id as MediaFilter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {filteredAssets.length === 0 ? (
                  <div className="brand-kit-empty">
                    <p>尚未上傳任何素材</p>
                    <p>上傳圖片或影片，SOON 會在生成內容時使用。</p>
                  </div>
                ) : (
                  <div className="brand-kit-media-grid">
                    {filteredAssets.map((asset) => (
                      <article key={asset.id} className="brand-kit-media-card" title={asset.source_url || asset.url}>
                        <label className="media-select-check" aria-label="選取媒體">
                          <input
                            checked={selectedAssetIds.includes(asset.id)}
                            onChange={(event) =>
                              setSelectedAssetIds((current) =>
                                event.target.checked
                                  ? [...current, asset.id]
                                  : current.filter((id) => id !== asset.id)
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                        {failedAssetIds.includes(asset.id) ? (
                          <div className="media-image-fallback" aria-label="圖片載入失敗">
                            <span />
                          </div>
                        ) : (
                            <img
                              src={normalizeMediaImageUrl(asset.url)}
                              alt={asset.filename ?? asset.asset_type}
                              loading="lazy"
                              onError={() => {
                              setFailedAssetIds((current) => current.includes(asset.id) ? current : [...current, asset.id])
                            }}
                          />
                        )}
                        <span className="brand-kit-used-badge">
                          {asset.asset_type === 'website_image' ? '網站圖片' : '上傳'}
                        </span>
                        <p>{asset.filename ?? asset.asset_type}</p>
                        {asset.source_url ? <em>{sourceName(asset.source_url)}</em> : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === '品牌樣式' ? (
              <section className="brand-style-content">
                <h2>品牌樣式</h2>
                <div className="brand-style-grid">
                  <div className="brand-style-card">
                    <label>Logo</label>
                    {workspaceStyle?.logo_url || brand.logo_url ? (
                      <img src={displayImageUrl(workspaceStyle?.logo_url || brand.logo_url)} alt="Logo" className="brand-logo-preview" />
                    ) : (
                      <div className="brand-logo-placeholder">
                        <span>{workspaceInitial(brand.business_name || '品牌')}</span>
                      </div>
                    )}
                    <label className="brand-secondary-action">
                      {uploadingLogo ? '上傳中...' : '更換 Logo'}
                      <input accept="image/*" type="file" onChange={handleLogoUpload} disabled={uploadingLogo || !workspaceId} />
                    </label>
                  </div>
                  <div className="brand-style-card">
                    <div className="brand-style-title-row">
                      <label>視覺風格</label>
                      <button type="button" onClick={openVisualStylePicker}>更改</button>
                    </div>
                    {editingVisualStyle ? (
                      <div className="brand-picker-panel">
                        <div className="visual-style-picker-grid">
                          {visualStylePresets.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              className={visualStyleDraft === style.id ? 'selected' : ''}
                              onClick={() => setVisualStyleDraft(style.id)}
                            >
                              <img src={style.previewImage} alt={style.chineseName || style.titleZh || style.name} />
                              <span>{style.chineseName || style.titleZh || style.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="picker-actions">
                          <button type="button" onClick={() => void handleVisualStyleChange(visualStyleDraft)} disabled={!visualStyleDraft}>確認</button>
                          <button type="button" onClick={() => setEditingVisualStyle(false)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <p>{visualStyleDisplayName(workspaceStyle?.visual_style, brand)}</p>
                    )}
                  </div>
                  <div className="brand-style-card">
                    <div className="brand-style-title-row">
                      <label>字體</label>
                      <button type="button" onClick={openTypefacePicker}>更改</button>
                    </div>
                    {editingTypeface ? (
                      <div className="brand-picker-panel">
                        <div className="typeface-picker-grid">
                          {typefaces.map((typeface) => (
                            <button
                              key={typeface.id}
                              type="button"
                              className={typefaceDraft === typeface.id ? 'selected' : ''}
                              onClick={() => setTypefaceDraft(typeface.id)}
                            >
                              <strong style={{ fontFamily: typeface.fontFamily }}>銀幸の美學</strong>
                              <span>{typeface.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="picker-actions">
                          <button type="button" onClick={() => void handleTypefaceChange(typefaceDraft)} disabled={!typefaceDraft}>確認</button>
                          <button type="button" onClick={() => setEditingTypeface(false)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontFamily: workspaceStyle?.font_style || brand.typeface_family || 'inherit' }}>
                        {typefaceDisplayName(workspaceStyle?.font_style, brand)}
                      </p>
                    )}
                  </div>
                  <div className="brand-style-card">
                    <label>品牌色</label>
                    <div style={{ alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {brandColorItems.map((color) => (
                        <div
                          key={color.hex}
                          title={`${color.name} ${color.hex}`}
                          style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '72px',
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: color.hex,
                              borderRadius: '50%',
                              cursor: 'pointer',
                              flexShrink: 0,
                              height: '56px',
                              position: 'relative',
                              width: '56px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => void removeBrandColor(color.hex)}
                              aria-label={`移除 ${color.hex}`}
                              style={{
                                alignItems: 'center',
                                backgroundColor: 'rgba(17, 24, 39, 0.82)',
                                border: 0,
                                borderRadius: '50%',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '14px',
                                height: '22px',
                                justifyContent: 'center',
                                position: 'absolute',
                                right: '3px',
                                top: '3px',
                                width: '22px',
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '11px', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                            {color.hex}
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: '11px', lineHeight: 1.1, textAlign: 'center' }}>
                            {color.name || '品牌色'}
                          </span>
                        </div>
                      ))}
                      <label
                        style={{
                          alignItems: 'center',
                          backgroundColor: 'transparent',
                          border: '2px dashed #d1d5db',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          flexShrink: 0,
                          height: '56px',
                          justifyContent: 'center',
                          position: 'relative',
                          width: '56px',
                        }}
                      >
                        <span style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.15, textAlign: 'center' }}>
                          + 新增<br />品牌色
                        </span>
                        <input
                          type="color"
                          style={{
                            cursor: 'pointer',
                            height: '100%',
                            inset: 0,
                            opacity: 0,
                            position: 'absolute',
                            width: '100%',
                          }}
                          onChange={(event) => void addBrandColor(event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="brand-style-card wide">
                    <label>Visual Identity Description</label>
                    <textarea
                      onBlur={() => void saveVisualIdentityDescription()}
                      onChange={(event) => setVisualIdentityDraft(event.target.value)}
                      placeholder="描述品牌視覺語言、構圖、色彩和影像風格"
                      value={visualIdentityDraft}
                    />
                    {savingVisualIdentity ? <span className="brand-field-saving">儲存中...</span> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === '品牌聲音' ? (
              <section>
                <h2>品牌聲音</h2>
                {brandVoice ? (
                  <div className="brand-voice-fields">
                    {[
                      { key: 'purpose', label: '目的', type: 'scalar', scalar: brandVoice.purpose, tags: [] },
                      { key: 'audience', label: '受眾', type: 'scalar', scalar: brandVoice.audience, tags: [] },
                      { key: 'tone', label: '語調', type: 'tags', scalar: '', tags: asArray(brandVoice.tone) },
                      { key: 'emotion', label: '情感', type: 'tags', scalar: '', tags: asArray(brandVoice.emotion) },
                      { key: 'character', label: '性格', type: 'tags', scalar: '', tags: asArray(brandVoice.character) },
                      { key: 'syntax', label: '句式', type: 'tags', scalar: '', tags: asArray(brandVoice.syntax) },
                      { key: 'language', label: '語言', type: 'tags', scalar: '', tags: asArray(brandVoice.language) },
                    ]
                      .map((field) => (
                        <div key={field.label} className="brand-voice-field">
                          <label>{field.label}</label>
                          {field.type === 'scalar' ? (
                            editingVoiceScalar === field.key ? (
                              <div className="voice-edit-panel">
                                <textarea
                                  className="brand-edit-textarea"
                                  onChange={(event) => setVoiceScalarDraft(event.target.value)}
                                  rows={3}
                                  value={voiceScalarDraft}
                                />
                                <div className="picker-actions">
                                  <button
                                    type="button"
                                    onClick={() => void patchBrandVoice(field.key as BrandVoiceScalarField, voiceScalarDraft)}
                                    disabled={savingBrandVoice}
                                  >
                                    儲存
                                  </button>
                                  <button type="button" onClick={cancelVoiceEdit}>取消</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {field.scalar ? <p>{field.scalar}</p> : null}
                                <button
                                  type="button"
                                  className="tag-add-btn"
                                  onClick={() => startVoiceScalarEdit(field.key as BrandVoiceScalarField)}
                                >
                                  ＋ 新增
                                </button>
                              </>
                            )
                          ) : (
                            <div className="brand-tags">
                              {field.tags.map((tag) => (
                                <span key={tag}>
                                  {tag}
                                  <button type="button" onClick={() => void removeVoiceTag(field.key as BrandVoiceTagField, tag)}>×</button>
                                </span>
                              ))}
                              {String(addingVoiceTag) === String(field.key) ? (
                                <div className="tag-inline-editor">
                                  <input
                                    className="brand-inline-input"
                                    onChange={(event) => setVoiceTagDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault()
                                        void addVoiceTag(field.key as BrandVoiceTagField)
                                      }
                                      if (event.key === 'Escape') cancelVoiceEdit()
                                    }}
                                    placeholder="新增標籤"
                                    value={voiceTagDraft}
                                    autoFocus
                                  />
                                  <button type="button" onClick={() => void addVoiceTag(field.key as BrandVoiceTagField)}>＋</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="tag-add-btn"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    startVoiceTagAdd(field.key as BrandVoiceTagField)
                                  }}
                                >
                                  ＋ 新增
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="brand-kit-empty">
                    <p>尚未設定品牌聲音</p>
                    <button type="button" className="home-create-btn" onClick={() => setActiveTab('來源素材')}>
                      立即分析
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === '品牌資料' ? (
              <section>
                <h2>品牌資料</h2>
                {brandProfile ? (
                  <div className="brand-profile-fields">
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>品牌名稱</label>
                        {editingProfileField === 'business_name' ? (
                          <span>
                            <button type="button" onClick={() => void saveProfileEdit('business_name')} disabled={savingProfileField}>儲存</button>
                            <button type="button" onClick={cancelProfileEdit}>取消</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => startProfileEdit('business_name')}>Edit</button>
                        )}
                      </div>
                      {editingProfileField === 'business_name' ? (
                        <input
                          className="brand-edit-input"
                          onChange={(event) => setProfileDraft(event.target.value)}
                          value={typeof profileDraft === 'string' ? profileDraft : ''}
                        />
                      ) : (
                        <p>{brandProfile.business_name || brand.business_name || '未設定'}</p>
                      )}
                    </div>
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>業務概覽與定位</label>
                        {editingProfileField === 'business_overview' ? (
                          <span>
                            <button type="button" onClick={() => void saveProfileEdit('business_overview')} disabled={savingProfileField}>儲存</button>
                            <button type="button" onClick={cancelProfileEdit}>取消</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => startProfileEdit('business_overview')}>Edit</button>
                        )}
                      </div>
                      {editingProfileField === 'business_overview' ? (
                        <textarea
                          className="brand-edit-textarea"
                          onChange={(event) => setProfileDraft(event.target.value)}
                          rows={3}
                          value={typeof profileDraft === 'string' ? profileDraft : ''}
                        />
                      ) : (
                        <p>{brandProfile.business_overview || brand.elevator_pitch || '未設定'}</p>
                      )}
                    </div>
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>市場定位</label>
                        {editingProfileField === 'market_positioning' ? (
                          <span>
                            <button type="button" onClick={() => void saveProfileEdit('market_positioning')} disabled={savingProfileField}>儲存</button>
                            <button type="button" onClick={cancelProfileEdit}>取消</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => startProfileEdit('market_positioning')}>Edit</button>
                        )}
                      </div>
                      {editingProfileField === 'market_positioning' ? (
                        <textarea
                          className="brand-edit-textarea"
                          onChange={(event) => setProfileDraft(event.target.value)}
                          rows={4}
                          value={typeof profileDraft === 'string' ? profileDraft : ''}
                        />
                      ) : (
                        <ul>
                          {asArray(brandProfile.market_positioning).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>直接競爭對手</label>
                        {editingProfileField === 'competitors' ? (
                          <span>
                            <button type="button" onClick={() => void saveProfileEdit('competitors')} disabled={savingProfileField}>儲存</button>
                            <button type="button" onClick={cancelProfileEdit}>取消</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => startProfileEdit('competitors')}>Edit</button>
                        )}
                      </div>
                      {editingProfileField === 'competitors' ? (
                        <div className="competitor-edit-grid">
                          <label>
                            本地
                            <textarea
                              className="brand-edit-textarea"
                              onChange={(event) =>
                                setProfileDraft((current) => ({ ...asRecord(current), local: event.target.value }))
                              }
                              rows={2}
                              value={String(asRecord(profileDraft).local || '')}
                            />
                          </label>
                          <label>
                            國際
                            <textarea
                              className="brand-edit-textarea"
                              onChange={(event) =>
                                setProfileDraft((current) => ({ ...asRecord(current), international: event.target.value }))
                              }
                              rows={2}
                              value={String(asRecord(profileDraft).international || '')}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="competitor-groups">
                          <p><strong>本地</strong> {asArray(asRecord(brandProfile.competitors).local).join('、') || '未設定'}</p>
                          <p><strong>國際</strong> {asArray(asRecord(brandProfile.competitors).international).join('、') || '未設定'}</p>
                        </div>
                      )}
                    </div>
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>競爭優勢</label>
                        {editingProfileField === 'competitive_advantages' ? (
                          <span>
                            <button type="button" onClick={() => void saveProfileEdit('competitive_advantages')} disabled={savingProfileField}>儲存</button>
                            <button type="button" onClick={cancelProfileEdit}>取消</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => startProfileEdit('competitive_advantages')}>Edit</button>
                        )}
                      </div>
                      {editingProfileField === 'competitive_advantages' ? (
                        <textarea
                          className="brand-edit-textarea"
                          onChange={(event) => setProfileDraft(event.target.value)}
                          rows={4}
                          value={typeof profileDraft === 'string' ? profileDraft : ''}
                        />
                      ) : (
                        <ol>
                          {asArray(brandProfile.competitive_advantages).map((item) => <li key={item}>{item}</li>)}
                        </ol>
                      )}
                    </div>
                    <div className="brand-profile-card">
                      <div className="field-title-row">
                        <label>主要客戶群</label>
                        <span className="read-only-note">暫時只讀</span>
                      </div>
                      <div className="customer-segments">
                        {Array.isArray(brandProfile.customer_segments)
                          ? brandProfile.customer_segments.map((segment: any) => (
                              <article key={`${segment?.name}-${segment?.percentage}`}>
                                <strong>{segment?.name || '客戶群'} · {segment?.percentage || 0}%</strong>
                                <ul>
                                  {asArray(segment?.details).map((detail) => <li key={detail}>{detail}</li>)}
                                </ul>
                              </article>
                            ))
                          : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="brand-kit-empty">
                    <p>尚未分析品牌資料</p>
                    <button type="button" className="home-create-btn" onClick={() => setActiveTab('來源素材')}>
                      立即分析
                    </button>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div> : null}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${brandKitStyles}` }} />
    </main>
  )
}

const brandKitStyles = `
  @font-face {
    font-family: 'NaniFont-Regular';
    src: url('/fonts/max32002/NaniFont-Regular.woff2') format('woff2');
    font-style: normal;
    font-weight: 300;
    font-display: swap;
  }

  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .home-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar-left h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .home-create-btn {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 7px 12px;
    cursor: pointer;
  }

  .brand-kit-layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    min-height: calc(100vh - 58px);
  }

  .brand-kit-subnav {
    border-right: 1px solid #e8e9ec;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .brand-kit-subnav-item {
    text-align: left;
    padding: 9px 20px;
    border: none;
    background: none;
    font: inherit;
    font-size: 14px;
    color: #6f737d;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: all 150ms;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .brand-kit-subnav-item em {
    background: #eceef2;
    border-radius: 999px;
    color: #6f737d;
    font-size: 11px;
    font-style: normal;
    min-width: 20px;
    padding: 1px 6px;
    text-align: center;
  }

  .brand-kit-subnav-item:hover {
    color: #202126;
    background: #f5f5f7;
  }

  .brand-kit-subnav-item.active {
    color: #202126;
    font-weight: 600;
    border-left-color: #202126;
    background: #f5f5f7;
  }

  .brand-kit-content {
    padding: 28px 24px;
    overflow-y: auto;
  }

  .analysis-success-banner {
    align-items: center;
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    border-radius: 12px;
    color: #065f46;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    margin-bottom: 18px;
    padding: 12px 14px;
  }

  .analysis-success-banner span {
    font-size: 13px;
    font-weight: 600;
  }

  .analysis-success-banner div {
    display: flex;
    gap: 8px;
  }

  .analysis-success-banner button {
    border: 1px solid #047857;
    border-radius: 8px;
    background: #ffffff;
    color: #047857;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 9px;
  }

  .brand-kit-content h2,
  .brand-style-content h2 {
    margin: 0 0 20px;
    font-size: 20px;
    font-weight: 650;
  }

  .brand-kit-content-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    gap: 16px;
  }

  .brand-kit-content-head h2 {
    margin: 0;
  }

  .brand-kit-content-head p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #6f737d;
  }

  .brand-kit-empty {
    border: 1px dashed #e0e0e0;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    color: #9a9da4;
  }

  .brand-kit-empty p {
    margin: 4px 0;
    font-size: 14px;
  }

  .brand-kit-empty .home-create-btn {
    margin-top: 14px;
  }

  .source-materials-panel {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    display: grid;
    gap: 14px;
    margin-bottom: 18px;
    padding: 16px;
  }

  .source-materials-panel p {
    color: #6f737d;
    font-size: 14px;
    line-height: 1.55;
    margin: 0;
    max-width: 760px;
  }

  .source-materials-form {
    display: flex;
    gap: 10px;
    max-width: 720px;
  }

  .source-materials-form input {
    border: 1px solid #dfe1e6;
    border-radius: 8px;
    flex: 1;
    font: inherit;
    font-size: 14px;
    min-width: 0;
    padding: 9px 11px;
  }

  .source-materials-form button {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 13px;
    white-space: nowrap;
  }

  .source-materials-form button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .source-error {
    color: #b91c1c;
    font-size: 12px;
  }

  .source-table {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .source-table-head,
  .source-table-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) 120px 140px 120px;
    gap: 14px;
    align-items: center;
  }

  .source-table-head {
    background: #f8f8f9;
    border-bottom: 1px solid #e8e9ec;
    color: #6f737d;
    font-size: 12px;
    font-weight: 600;
    padding: 10px 14px;
  }

  .source-table-row {
    border-bottom: 1px solid #f0f1f3;
    font-size: 13px;
    padding: 12px 14px;
  }

  .source-table-row:last-child {
    border-bottom: 0;
  }

  .source-table-row strong,
  .source-table-row em {
    display: block;
  }

  .source-table-row em {
    color: #8a8d94;
    font-size: 11px;
    font-style: normal;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-status {
    align-items: center;
    display: inline-flex !important;
    gap: 5px;
    width: fit-content;
  }

  .source-status i {
    animation: spin 900ms linear infinite;
    border: 2px solid #fcd34d;
    border-top-color: #92400e;
    border-radius: 999px;
    height: 10px;
    width: 10px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .source-status.done {
    color: #047857;
  }

  .source-status.error {
    color: #b91c1c;
  }

  .source-status.pending,
  .source-status.scanning {
    color: #92400e;
  }

  .brand-kit-media-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .brand-kit-media-card {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  .brand-kit-media-card img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }

  .brand-kit-media-card p {
    font-size: 12px;
    padding: 6px 8px;
    color: #6f737d;
    margin: 0;
  }

  .brand-kit-used-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #202126;
    color: #ffffff;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
  }

  .brand-style-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .brand-style-card {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    padding: 16px;
  }

  .brand-style-card.wide {
    grid-column: 1 / -1;
  }

  .brand-style-card label,
  .brand-voice-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #9a9da4;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
  }

  .brand-style-card p {
    margin: 0;
    font-size: 14px;
    color: #202126;
  }

  .brand-style-card textarea {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    color: #202126;
    font: inherit;
    font-size: 14px;
    line-height: 1.55;
    min-height: 110px;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;
  }

  .brand-color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .brand-color-swatches span {
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 999px;
    height: 28px;
    width: 28px;
  }

  .brand-logo-preview {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
  }

  .brand-logo-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: #6f737d;
  }

  .brand-voice-fields,
  .brand-profile-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .brand-voice-field {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    padding: 14px 16px;
  }

  .field-title-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .field-title-row button {
    border: 0;
    background: transparent;
    color: #6f737d;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
  }

  .brand-voice-field p {
    margin: 0;
    font-size: 14px;
    color: #202126;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .brand-voice-field ul,
  .brand-voice-field ol {
    margin: 0;
    padding-left: 20px;
  }

  .brand-voice-field li {
    font-size: 14px;
    line-height: 1.55;
    margin: 4px 0;
  }

  .brand-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .brand-tags span,
  .brand-tags button {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    font: inherit;
    font-size: 12px;
    gap: 6px;
    padding: 5px 9px;
  }

  .brand-tags span {
    background: #f1f2f4;
    color: #202126;
  }

  .brand-tags span button {
    border: 0;
    background: transparent;
    color: #7d8088;
    cursor: pointer;
    padding: 0;
  }

  .tag-add-btn {
    border: 1px dashed #cfd3da;
    background: #ffffff;
    color: #6f737d;
    cursor: pointer;
  }

  .competitor-groups {
    display: grid;
    gap: 6px;
  }

  .competitor-groups strong {
    margin-right: 8px;
  }

  .customer-segments {
    display: grid;
    gap: 12px;
  }

  .customer-segments article {
    display: grid;
    gap: 6px;
  }

  .brand-save-toast {
    background: #111827;
    border-radius: 999px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 12px;
    position: fixed;
    right: 22px;
    top: 70px;
    z-index: 30;
  }

  .media-upload-btn {
    align-items: center;
    display: inline-flex;
    position: relative;
  }

  .media-upload-btn input {
    height: 1px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    width: 1px;
  }

  .media-filter-tabs {
    display: flex;
    gap: 8px;
    margin: -4px 0 18px;
  }

  .media-filter-tabs button {
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    background: #ffffff;
    color: #6b7280;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 10px;
  }

  .media-filter-tabs button.active {
    background: #111827;
    border-color: #111827;
    color: #ffffff;
  }

  .brand-kit-media-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .brand-kit-media-card p,
  .brand-kit-media-card em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-kit-media-card em {
    color: #9ca3af;
    display: block;
    font-size: 11px;
    font-style: normal;
    padding: 0 8px 8px;
  }

  .media-select-check {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
  }

  .media-select-check input {
    accent-color: #111827;
    height: 16px;
    width: 16px;
  }

  .media-image-fallback {
    align-items: center;
    aspect-ratio: 1;
    background: #f3f4f6;
    color: #9ca3af;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .media-image-fallback span {
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    height: 34px;
    position: relative;
    width: 42px;
  }

  .media-image-fallback span::before {
    background: #cbd5e1;
    border-radius: 999px;
    content: '';
    height: 7px;
    position: absolute;
    right: 8px;
    top: 7px;
    width: 7px;
  }

  .media-image-fallback span::after {
    border-bottom: 11px solid #cbd5e1;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    bottom: 6px;
    content: '';
    left: 8px;
    position: absolute;
  }

  .brand-color-swatches {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .brand-color-swatches span {
    align-items: center;
    background: #ffffff;
    border: 0;
    display: inline-flex;
    flex-direction: column;
    gap: 7px;
    min-width: 72px;
    padding: 0;
  }

  .brand-color-swatches i {
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 999px;
    display: block;
    height: 56px;
    position: relative;
    width: 56px;
  }

  .brand-color-swatches i button {
    align-items: center;
    background: rgba(17, 24, 39, 0.82);
    border: 0;
    border-radius: 999px;
    color: #ffffff;
    cursor: pointer;
    display: none;
    font: inherit;
    font-size: 14px;
    height: 22px;
    justify-content: center;
    position: absolute;
    right: 5px;
    top: 5px;
    width: 22px;
  }

  .brand-color-swatches span:hover i button {
    display: inline-flex;
  }

  .brand-color-swatches em,
  .brand-color-swatches strong {
    display: block;
    font-style: normal;
    line-height: 1.1;
  }

  .brand-color-swatches em {
    color: #6b7280;
    font-size: 11px;
    text-align: center;
    white-space: nowrap;
  }

  .brand-color-swatches strong {
    color: #374151;
    font-size: 11px;
    font-weight: 600;
    max-width: 84px;
    text-align: center;
  }

  .brand-color-add,
  .brand-secondary-action {
    align-items: center;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
    color: #4b5563 !important;
    cursor: pointer;
    display: inline-flex !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    justify-content: center;
    letter-spacing: 0 !important;
    min-height: 34px;
    padding: 8px 10px;
    text-transform: none !important;
  }

  .brand-color-add {
    border: 2px dashed #d1d5db;
    border-radius: 999px;
    height: 56px;
    margin: 0 !important;
    min-height: 56px;
    min-width: 56px;
    padding: 8px;
    text-align: center;
    width: 56px;
  }

  .brand-color-add input,
  .brand-secondary-action input {
    height: 1px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    width: 1px;
  }

  .brand-style-title-row {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .brand-style-title-row label {
    margin: 0;
  }

  .brand-style-title-row button {
    border: 0;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
  }

  .brand-style-select {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    color: #111827;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
  }

  .brand-style-card textarea {
    background: #ffffff;
    border-color: #e5e7eb;
    color: #1f2937;
  }

  .brand-field-saving {
    color: #6b7280;
    display: inline-block;
    font-size: 12px;
    margin-top: 8px;
  }

  .brand-voice-field,
  .brand-profile-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    padding: 14px 16px;
  }

  .brand-style-card label,
  .brand-voice-field label,
  .brand-profile-card label {
    color: #9ca3af;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .field-title-row span {
    display: inline-flex;
    gap: 8px;
  }

  .field-title-row button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .brand-voice-field p,
  .brand-profile-card p,
  .brand-profile-card li {
    color: #111827;
    font-weight: 400;
  }

  .brand-profile-card ul,
  .brand-profile-card ol {
    margin: 0;
    padding-left: 20px;
  }

  .brand-edit-input,
  .brand-edit-textarea,
  .brand-inline-input,
  .brand-kit-content input:not([type="checkbox"]):not([type="color"]):not([type="file"]),
  .brand-kit-content textarea {
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    color: #111827 !important;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    padding: 9px 10px;
    width: 100%;
  }

  .brand-kit-content input::placeholder,
  .brand-kit-content textarea::placeholder {
    color: #9ca3af !important;
  }

  .brand-kit-content input:focus,
  .brand-kit-content textarea:focus {
    box-shadow: 0 0 0 2px #d1d5db;
    outline: none;
  }

  .brand-edit-textarea {
    resize: vertical;
  }

  .competitor-edit-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .competitor-edit-grid label {
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    margin: 0;
    text-transform: none;
  }

  .read-only-note {
    color: #9ca3af;
    font-size: 12px;
  }

  .brand-picker-panel {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    display: grid;
    gap: 12px;
    padding: 12px;
  }

  .visual-style-picker-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-height: 360px;
    overflow: auto;
  }

  .visual-style-picker-grid button,
  .typeface-picker-grid button {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    color: #111827;
    cursor: pointer;
    display: grid;
    gap: 7px;
    padding: 8px;
    text-align: left;
  }

  .visual-style-picker-grid button.selected,
  .typeface-picker-grid button.selected {
    border-color: #111827;
    box-shadow: 0 0 0 2px #111827;
  }

  .visual-style-picker-grid img {
    aspect-ratio: 4 / 3;
    border-radius: 8px;
    display: block;
    object-fit: cover;
    width: 100%;
  }

  .visual-style-picker-grid span,
  .typeface-picker-grid span {
    color: #374151;
    font-size: 12px;
    font-weight: 600;
  }

  .typeface-picker-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 360px;
    overflow: auto;
  }

  .typeface-picker-grid strong {
    color: #111827;
    font-size: 20px;
    font-weight: 600;
  }

  .picker-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .picker-actions button {
    border: 1px solid #111827;
    border-radius: 8px;
    background: #111827;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 11px;
  }

  .picker-actions button:last-child {
    background: #ffffff;
    border-color: #d1d5db;
    color: #374151;
  }

  .picker-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .voice-edit-panel {
    display: grid;
    gap: 10px;
  }

  .tag-inline-editor {
    align-items: center;
    background: #ffffff !important;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    display: inline-flex;
    gap: 4px;
    padding: 4px !important;
  }

  .tag-inline-editor .brand-inline-input {
    border: 0 !important;
    box-shadow: none !important;
    min-width: 120px;
    padding: 2px 6px;
    width: 140px;
  }

  .tag-inline-editor > button {
    background: #111827;
    border: 0;
    border-radius: 999px;
    color: #ffffff;
    cursor: pointer;
    height: 24px;
    width: 24px;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .brand-kit-layout {
      grid-template-columns: 1fr;
    }

    .brand-kit-subnav {
      border-right: 0;
      border-bottom: 1px solid #e8e9ec;
      flex-direction: row;
      overflow-x: auto;
      padding: 10px;
    }

    .brand-style-grid,
    .brand-kit-media-grid,
    .source-table-head,
    .source-table-row {
      grid-template-columns: 1fr;
    }

    .source-materials-form {
      flex-direction: column;
    }
  }

  .simple-brand-kit {
    display: grid;
    gap: 18px;
    padding: 28px;
  }

  .brand-kit-loading {
    display: grid;
    gap: 18px;
    padding: 28px;
  }

  .brand-kit-loading-hero {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e4e5e9;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(32, 33, 38, 0.04);
    display: flex;
    justify-content: space-between;
    gap: 24px;
    min-height: 190px;
    padding: 28px 30px;
  }

  .brand-kit-loading-hero div {
    display: grid;
    gap: 10px;
  }

  .brand-kit-loading-hero span,
  .brand-kit-loading-hero i,
  .brand-kit-loading-grid i {
    display: block;
    border-radius: 12px;
    background: linear-gradient(90deg, #f1f2f4 0%, #fbfbfc 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: brandKitSkeleton 1.2s ease-in-out infinite;
  }

  .brand-kit-loading-hero span {
    height: 14px;
    width: 120px;
  }

  .brand-kit-loading-hero strong {
    color: #202126;
    font-size: 24px;
    font-weight: 800;
  }

  .brand-kit-loading-hero p {
    color: #6f737d;
    font-size: 15px;
    line-height: 1.6;
    margin: 0;
  }

  .brand-kit-loading-hero i {
    flex: 0 0 auto;
    height: 118px;
    width: 190px;
  }

  .brand-kit-loading-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .brand-kit-loading-grid i {
    min-height: 170px;
  }

  @keyframes brandKitSkeleton {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  .brand-kit-layout {
    display: none;
  }

  .simple-brand-alert {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #991b1b;
    font-size: 13px;
    padding: 10px 12px;
  }

  .brand-hero-panel,
  .simple-brand-section {
    background: #ffffff;
    border: 1px solid #e6e7eb;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(17, 24, 39, 0.04);
  }

  .brand-hero-panel {
    align-items: stretch;
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 1fr) 260px;
    padding: 24px;
  }

  .brand-kicker {
    color: #7b7f88;
    display: block;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .brand-hero-panel h2,
  .simple-section-head h3 {
    color: #202126;
    font-size: 24px;
    font-weight: 750;
    line-height: 1.2;
    margin: 0;
  }

  .brand-hero-panel p,
  .simple-section-head p,
  .brand-asset-card p,
  .simple-empty-panel p,
  .simple-settings-grid p {
    color: #6f737d;
    font-size: 14px;
    line-height: 1.55;
    margin: 8px 0 0;
  }

  .brand-logo-card {
    align-items: center;
    background: #f8f8f9;
    border: 1px solid #ebecef;
    border-radius: 12px;
    display: grid;
    gap: 12px;
    justify-items: center;
    padding: 18px;
    text-align: center;
  }

  .brand-logo-card > span,
  .simple-settings-grid label {
    color: #8a8d94;
    font-size: 12px;
    font-weight: 700;
  }

  .brand-logo-card img {
    max-height: 92px;
    max-width: 180px;
    object-fit: contain;
  }

  .brand-logo-mark,
  .brand-logo-placeholder {
    align-items: center;
    background: #ffe15c;
    border-radius: 14px;
    color: #202126;
    display: flex;
    font-size: 32px;
    font-weight: 800;
    height: 92px;
    justify-content: center;
    width: 92px;
  }

  .simple-unset {
    color: #777b84;
    font-size: 14px;
  }

  .brand-logo-card label,
  .simple-upload-button {
    align-items: center;
    background: #111111;
    border: 1px solid #111111;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    font-weight: 700;
    justify-content: center;
    min-height: 36px;
    padding: 8px 12px;
    position: relative;
  }

  .brand-logo-card input,
  .simple-upload-button input,
  .simple-color-add input {
    height: 1px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    width: 1px;
  }

  .simple-brand-section {
    display: grid;
    gap: 18px;
    padding: 22px;
  }

  .simple-section-head {
    align-items: flex-start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .brand-asset-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .brand-asset-card {
    border: 1px solid #ebecef;
    border-radius: 12px;
    overflow: hidden;
    background: #ffffff;
  }

  .brand-asset-image {
    align-items: center;
    aspect-ratio: 1;
    background: #f5f5f6;
    display: flex;
    justify-content: center;
  }

  .brand-asset-image img {
    display: block;
    height: 100%;
    object-fit: contain;
    width: 100%;
  }

  .brand-asset-card div:last-child {
    display: grid;
    gap: 6px;
    padding: 12px;
  }

  .brand-asset-card span {
    color: #8a8d94;
    font-size: 11px;
    font-weight: 700;
  }

  .brand-asset-card h4 {
    color: #202126;
    font-size: 15px;
    font-weight: 750;
    line-height: 1.3;
    margin: 0;
  }

  .brand-asset-card p {
    font-size: 12px;
    margin: 0;
  }

  .simple-upload-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .simple-upload-grid article {
    border: 1px solid #ebecef;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  .simple-upload-grid img {
    aspect-ratio: 1;
    display: block;
    object-fit: cover;
    width: 100%;
  }

  .simple-upload-grid span {
    background: rgba(17, 17, 17, 0.82);
    border-radius: 999px;
    bottom: 8px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    left: 8px;
    padding: 4px 8px;
    position: absolute;
  }

  .simple-empty-panel {
    border: 1px dashed #dfe1e6;
    border-radius: 12px;
    padding: 20px;
  }

  .simple-settings-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .simple-settings-grid > div {
    background: #f8f8f9;
    border: 1px solid #ebecef;
    border-radius: 12px;
    padding: 14px;
  }

  .simple-color-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .simple-color-row button,
  .simple-color-add {
    border: 1px solid rgba(17, 24, 39, 0.12);
    border-radius: 999px;
    cursor: pointer;
    height: 34px;
    width: 34px;
  }

  .simple-color-add {
    align-items: center;
    background: #ffffff;
    color: #6f737d;
    display: inline-flex;
    justify-content: center;
    position: relative;
  }

  .simple-color-chip {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e3e4e8;
    border-radius: 999px;
    color: #202126;
    display: inline-grid;
    gap: 6px;
    grid-template-columns: 22px auto auto;
    min-height: 36px;
    padding: 6px 10px 6px 7px;
  }

  .simple-color-chip i {
    border: 1px solid rgba(17, 24, 39, 0.12);
    border-radius: 999px;
    display: block;
    height: 22px;
    width: 22px;
  }

  .simple-color-chip strong {
    font-size: 12px;
    font-weight: 700;
  }

  .simple-color-chip em {
    color: #8a8d94;
    font-size: 11px;
    font-style: normal;
    font-weight: 600;
  }

  .simple-settings-grid > div em {
    color: #7b7f88;
    display: block;
    font-size: 12px;
    font-style: normal;
    line-height: 1.45;
    margin-top: 8px;
  }

  @media (max-width: 1180px) {
    .brand-asset-grid,
    .simple-upload-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .simple-brand-kit {
      padding: 16px;
    }

    .brand-hero-panel,
    .simple-settings-grid {
      grid-template-columns: 1fr;
    }

    .simple-section-head {
      align-items: stretch;
      flex-direction: column;
    }

    .brand-asset-grid,
    .simple-upload-grid {
      grid-template-columns: 1fr;
    }
  }
`
