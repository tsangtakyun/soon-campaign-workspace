'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type ContentMixItem = {
  id: string
  title: string
  titleZh?: string
  quantity: number
}

type ContentMixState = {
  items?: ContentMixItem[]
}

type TopicReference = {
  id: string
  label: string
  type: 'image' | 'post'
  topic: string
  purpose: string
  image: string | null
  productImage?: string | null
  productImageOptOut?: boolean
  referenceImage?: string | null
  referenceImageOptOut?: boolean
  reference?: ReferenceSelection
}

type TopicImageType = 'product' | 'reference'

type ReferenceSelection = {
  url: string
  imageType: TopicImageType
}

type TopicAssetSelection = {
  productImage: string | null
  productImageOptOut: boolean
  referenceImage: string | null
  referenceImageOptOut: boolean
}

const STORAGE_KEYS = {
  profile: 'soon-business-profile-v1',
  strategy: 'soon-content-strategy-v1',
  campaign: 'soon-campaign-details-v1',
  distribution: 'soon-distribution-preferences-v1',
  contentMix: 'soon-content-mix-v1',
  visualStyle: 'soon-visual-style-v1',
  photoControl: 'soon-photo-control-v2',
  contentMood: 'soon-content-mood-v1',
  websiteAnalysis: 'soon-website-analysis-v1',
}

const DEFAULT_TOPIC_PURPOSE = '幫助目標受眾理解內容重點，並引導下一步。'

type GeneratedTopic = {
  topic: string
  purpose: string
}

const FALLBACK_TOPICS: TopicReference[] = [
  {
    id: 'still-image-1',
    label: '靜態圖片 1',
    type: 'image',
    topic: '',
    purpose: DEFAULT_TOPIC_PURPOSE,
    image: null,
  },
  {
    id: 'carousel-1',
    label: '輪播貼文 1',
    type: 'post',
    topic: '',
    purpose: DEFAULT_TOPIC_PURPOSE,
    image: null,
  },
]

const AI_REFERENCE_IMAGES = [
  '/photo-control/coffee-full-freedom.jpg',
  '/assets/content-strategies/photos/lifestyle-content.jpg',
  '/assets/content-strategies/photos/offer-promotion.jpg',
  '/visual-styles/previews/magic-hour.jpg',
  '/assets/content-strategies/photos/community-content.jpg',
]

const STOCK_PHOTOS = [
  '/visual-styles/previews/cold-chrome.jpg',
  '/visual-styles/previews/blue-hour.jpg',
  '/visual-styles/previews/soft-black-and-white.jpg',
  '/visual-styles/previews/lush-green.jpg',
  '/photo-control/coffee-balanced.jpg',
]

const STOCK_VIDEOS = [
  { image: '/content-mix/content-mix-feed-videos.png', duration: '00:30' },
  { image: '/content-mix/content-mix-short-form-video.png', duration: '00:52' },
  { image: '/content-mix/content-mix-stories.png', duration: '00:57' },
]

const TRENDING_EXAMPLES = [
  {
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    prompt: '開心顧客手持產品',
  },
  {
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    prompt: '俯拍創作者的工作桌',
  },
  {
    image: '/assets/content-strategies/photos/offer-promotion.jpg',
    prompt: '電商夏季優惠宣傳',
  },
  {
    image: '/photo-control/coffee-balanced.jpg',
    prompt: '餐廳歡樂時光場景',
  },
]

const CONTENT_TYPE_LABELS: Record<string, { label: string; type: TopicReference['type'] }> = {
  'still-images': { label: '靜態圖片', type: 'image' },
  carousels: { label: '輪播貼文', type: 'image' },
  'feed-videos': { label: '動態影片', type: 'post' },
  'short-form-video': { label: '短影片', type: 'post' },
  stories: { label: '限時動態', type: 'image' },
  emails: { label: '電郵內容', type: 'post' },
}

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function displayImageUrl(value: string) {
  if (!value) return ''
  if (value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('/')) return value
  return `/api/website-image?url=${encodeURIComponent(value)}`
}

function collectImageStrings(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectImageStrings)
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>
    return [
      objectValue.url,
      objectValue.src,
      objectValue.image,
      objectValue.imageUrl,
      objectValue.logoUrl,
    ].flatMap(collectImageStrings)
  }
  return []
}

function isUsableWebsiteReferenceImage(image: string) {
  if (!image) return false
  return !/(logo|icon|favicon|sprite|placeholder|blank|pixel|tracking|facebook\.com\/tr|monogram|gencode|qrcode|qr[-_]?code|award|badge|singleline|title|bar|social|payment|visa|mastercard|blur_|\.(svg|ico|gif)(?:\?|$))/i.test(image)
}

function normalizeWebsiteReferenceImage(image: string) {
  try {
    const url = new URL(image.trim())
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

    url.hash = ''
    return url.toString()
  } catch {
    return image.trim()
  }
}

function readWebsiteReferenceImages(): string[] {
  const websiteStored = readStorage<any>(STORAGE_KEYS.websiteAnalysis)
  const analysis = websiteStored?.analysis || websiteStored
  const images = [
    ...collectImageStrings(analysis?.websiteImages),
    ...collectImageStrings(analysis?.images),
    ...collectImageStrings(analysis?.media),
  ]
    .map(normalizeWebsiteReferenceImage)
    .filter(isUsableWebsiteReferenceImage)
    .map(displayImageUrl)

  return Array.from(new Set(images))
}

function pickWebsiteImage(websiteImages: string[], index: number) {
  if (!websiteImages.length) return null
  if (websiteImages.length <= 3) return websiteImages[index % websiteImages.length]

  const candidate = websiteImages[index % websiteImages.length]
  const previous = index > 0 ? websiteImages[(index - 1) % websiteImages.length] : ''
  if (candidate !== previous) return candidate

  return websiteImages[(index + 1) % websiteImages.length]
}

function buildTopicShells(websiteImages: string[] = readWebsiteReferenceImages()): TopicReference[] {
  const contentMix = readStorage<ContentMixState>(STORAGE_KEYS.contentMix)
  const items = contentMix?.items?.filter((item) => item.quantity > 0) || []
  const topics: TopicReference[] = []

  items.forEach((item) => {
    const typeConfig = CONTENT_TYPE_LABELS[item.id] || {
      label: item.title || item.titleZh || 'Content',
      type: 'post' as const,
    }
    for (let index = 0; index < item.quantity; index += 1) {
      const sequence = index + 1
      topics.push({
        id: `${item.id}-${sequence}`,
        label: `${typeConfig.label} ${sequence}`,
        type: typeConfig.type,
        topic: '',
        purpose: DEFAULT_TOPIC_PURPOSE,
        image: pickWebsiteImage(websiteImages, topics.length),
      })
    }
  })

  if (topics.length) return topics
  return FALLBACK_TOPICS.map((topic, index) => ({
    ...topic,
    image: websiteImages.length ? pickWebsiteImage(websiteImages, index) : topic.image,
  }))
}

function normalizeGeneratedTopic(value: unknown): GeneratedTopic | null {
  if (typeof value === 'string' && value.trim()) {
    return { topic: value.trim(), purpose: DEFAULT_TOPIC_PURPOSE }
  }
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const topic = typeof item.topic === 'string' ? item.topic.trim() : ''
  const purpose = typeof item.purpose === 'string' ? item.purpose.trim() : ''
  return topic ? { topic, purpose: purpose || DEFAULT_TOPIC_PURPOSE } : null
}

function TopicReviewContent() {
  const searchParams = useSearchParams()
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingTopicText, setEditingTopicText] = useState('')
  const [editingPurposeText, setEditingPurposeText] = useState('')
  const [topics, setTopics] = useState<TopicReference[]>(() => buildTopicShells())
  const [regeneratingTopicId, setRegeneratingTopicId] = useState<string | null>(null)
  const [topicActionError, setTopicActionError] = useState<string | null>(null)
  const activeTopic = topics.find((topic) => topic.id === activeReferenceId) || null

  const requestGeneratedTopics = useCallback(async (requestedPieces?: string[]) => {
    const profile = readStorage<any>(STORAGE_KEYS.profile)
    const strategy = readStorage<any>(STORAGE_KEYS.strategy)
    const campaign = readStorage<any>(STORAGE_KEYS.campaign)
    const distribution = readStorage<any>(STORAGE_KEYS.distribution)
    const contentMix = readStorage<any>(STORAGE_KEYS.contentMix)
    const visualStyle = readStorage<any>(STORAGE_KEYS.visualStyle)
    const photoControl = readStorage<any>(STORAGE_KEYS.photoControl)
    const contentMood = readStorage<any>(STORAGE_KEYS.contentMood)
    const websiteAnalysis = readStorage<any>(STORAGE_KEYS.websiteAnalysis)
    const language =
      profile?.primaryLanguage ||
      profile?.primary_language ||
      profile?.language ||
      searchParams.get('language') ||
      'zh-TW'

    const response = await fetch('/api/topic-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        strategy,
        campaign,
        distribution,
        contentMix,
        visualStyle,
        photoControl,
        contentMood,
        websiteAnalysis,
        language,
        requestedPieces,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(data?.topics)) {
      throw new Error(data?.detail || data?.error || 'Failed to generate topics')
    }
    return data.topics
      .map(normalizeGeneratedTopic)
      .filter((topic: GeneratedTopic | null): topic is GeneratedTopic => Boolean(topic))
  }, [searchParams])

  const generateTopics = useCallback(async () => {
    const topicShells = buildTopicShells(readWebsiteReferenceImages())
    setTopics(topicShells)
    setIsAnalyzing(true)
    setError(null)
    setTopicActionError(null)
    try {
      const generated = await requestGeneratedTopics()
      const updatedTopics = topicShells.map((topic, index) => ({
        ...topic,
        ...(generated[index] || {}),
      }))
      setTopics(updatedTopics)
      persistTopics(updatedTopics)
    } catch (err) {
      console.warn('[topic-review] failed:', err)
      setError('暫時未能整理內容題材，請稍後再試。')
    } finally {
      setIsAnalyzing(false)
    }
  }, [requestGeneratedTopics])

  useEffect(() => {
    generateTopics()
  }, [generateTopics])

  function preserveParams(url: URL) {
    ;[
      'plan',
      'name',
      'budget',
      'category',
      'website',
      'language',
      'brandName',
      'strategy',
      'campaign',
      'visualStyle',
      'typeface',
      'photoControl',
      'contentMood',
      'contentModification',
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleContinue() {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('soon-topic-review-v1', JSON.stringify(topics))
    const url = new URL('/onboarding/source-materials', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleBack() {
    window.history.back()
  }

  function persistTopics(nextTopics: TopicReference[]) {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('soon-topic-review-v1', JSON.stringify(nextTopics))
  }

  function handleConfirmTopicAssets(topicId: string, selection: TopicAssetSelection) {
    setTopics((currentTopics) => {
      const updatedTopics = currentTopics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              ...selection,
              image: selection.productImage || topic.image,
              reference: undefined,
            }
          : topic
      )
      persistTopics(updatedTopics)
      return updatedTopics
    })
    setActiveReferenceId(null)
  }

  function startEditingTopic(topic: TopicReference) {
    setEditingTopicId(topic.id)
    setEditingTopicText(topic.topic)
    setEditingPurposeText(topic.purpose)
  }

  function saveEditedTopic(topicId: string) {
    const trimmedText = editingTopicText.trim()
    const trimmedPurpose = editingPurposeText.trim()
    setTopics((currentTopics) => {
      const updatedTopics = currentTopics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              topic: trimmedText || topic.topic,
              purpose: trimmedPurpose || DEFAULT_TOPIC_PURPOSE,
            }
          : topic
      )
      persistTopics(updatedTopics)
      return updatedTopics
    })
    setEditingTopicId(null)
    setEditingTopicText('')
    setEditingPurposeText('')
  }

  function cancelEditingTopic() {
    setEditingTopicId(null)
    setEditingTopicText('')
    setEditingPurposeText('')
  }

  async function regenerateTopic(topic: TopicReference) {
    setRegeneratingTopicId(topic.id)
    setTopicActionError(null)
    try {
      const generated = await requestGeneratedTopics([topic.label])
      if (!generated[0]) throw new Error('No topic returned')
      setTopics((currentTopics) => {
        const updatedTopics = currentTopics.map((item) =>
          item.id === topic.id ? { ...item, ...generated[0] } : item
        )
        persistTopics(updatedTopics)
        return updatedTopics
      })
    } catch (err) {
      console.warn('[topic-review] regeneration failed:', err)
      setTopicActionError('暫時未能重新整理這個題材，請稍後再試。')
    } finally {
      setRegeneratingTopicId(null)
    }
  }

  function resizeTopicTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  return (
    <main className="topic-review-page">
      <div className="topic-review-steps" aria-label="設定進度">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 3 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      {isAnalyzing ? (
        <section className="topic-loading" aria-live="polite">
          <p>內容準備中</p>
          <h1>正在整理第一週內容題材…</h1>
          <h2>SOON 正按你的品牌、受眾和渠道整理可直接使用的內容方向。</h2>
          <div className="topic-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      ) : error ? (
        <section className="topic-error" aria-live="polite">
          <p>生成未完成</p>
          <h1>{error}</h1>
          <h2>我們未能成功取得 AI 內容主題。你可以重新嘗試，系統會保留目前的內容組合和設定。</h2>
          <button type="button" onClick={generateTopics}>再試一次</button>
        </section>
      ) : (
        <section className="topic-review-content">
          <header className="topic-review-header-row">
            <div>
              <h1>確認第一週內容題材</h1>
              <p>SOON 已按你的品牌、受眾及渠道整理第一週內容，你可以直接修改或重新生成。</p>
            </div>
            <button
              type="button"
              className="topic-regenerate-all"
              onClick={generateTopics}
              disabled={Boolean(regeneratingTopicId)}
            >
              全部重新生成
            </button>
          </header>

          {topicActionError ? <p className="topic-action-error">{topicActionError}</p> : null}

          <div className="topic-list">
            {topics.map((topic) => {
              const primaryImage = topic.productImage || topic.image
              return <article className="topic-row" key={topic.id}>
                <div className="topic-image-stack">
                  <div className={`topic-image${primaryImage ? '' : ' topic-image-empty'}`}>
                    {primaryImage ? <img src={primaryImage} alt={`${topic.label}參考圖片`} /> : (
                      <span><b>暫未有參考圖片</b><small>不影響繼續</small></span>
                    )}
                    {topic.productImage ? (
                      <span className="topic-image-badge product">產品圖</span>
                    ) : null}
                    {topic.referenceImage ? (
                      <span className="topic-reference-thumb">
                        <img src={topic.referenceImage} alt="" />
                        <span className="topic-image-badge reference">
                          靈感圖
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <button type="button" className="topic-image-action" onClick={() => setActiveReferenceId(topic.id)}>
                    {primaryImage || topic.referenceImage ? '更換參考圖' : '加入參考圖'}
                  </button>
                </div>
                <div className="topic-copy">
                  <h2>
                    <span className={topic.type === 'image' ? 'topic-icon image' : 'topic-icon post'} aria-hidden="true">
                      {topic.type === 'image' ? '▧' : '▤'}
                    </span>
                    {topic.label}
                  </h2>
                  {editingTopicId === topic.id ? (
                    <div className="topic-editor">
                      <label className="topic-editor-field">題材
                        <textarea className="topic-text-editor" value={editingTopicText} autoFocus rows={2}
                          onChange={(event) => { setEditingTopicText(event.target.value); resizeTopicTextarea(event.currentTarget) }} />
                      </label>
                      <label className="topic-editor-field">內容目的
                        <textarea className="topic-text-editor" value={editingPurposeText} rows={2}
                          onChange={(event) => { setEditingPurposeText(event.target.value); resizeTopicTextarea(event.currentTarget) }} />
                      </label>
                      <div className="topic-editor-actions">
                        <button type="button" onClick={cancelEditingTopic}>取消</button>
                        <button type="button" onClick={() => saveEditedTopic(topic.id)}>儲存</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="topic-label">題材</p>
                      <p className="topic-text">{topic.topic}</p>
                      <p className="topic-purpose-label">內容目的</p>
                      <p className="topic-purpose">{topic.purpose}</p>
                      <div className="topic-card-actions">
                        <button type="button" onClick={() => startEditingTopic(topic)}>編輯</button>
                        <button type="button" onClick={() => regenerateTopic(topic)} disabled={Boolean(regeneratingTopicId)}>
                          {regeneratingTopicId === topic.id ? '重新整理中…' : '重新生成'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            })}
          </div>
        </section>
      )}

      <footer className="topic-review-footer">
        <button type="button" onClick={handleBack}>返回</button>
        {!isAnalyzing && !error ? <button type="button" onClick={handleContinue}>確認並建立第一週內容</button> : null}
      </footer>

      {activeTopic ? (
        <ReferenceImageModal
          topic={activeTopic}
          onClose={() => setActiveReferenceId(null)}
          onConfirm={(selection) => handleConfirmTopicAssets(activeTopic.id, selection)}
        />
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

function ReferenceImageModal({
  topic,
  onClose,
  onConfirm,
}: {
  topic: TopicReference
  onClose: () => void
  onConfirm: (selection: TopicAssetSelection) => void
}) {
  const legacyReference =
    topic.reference?.imageType === 'reference'
      ? topic.reference.url
      : topic.reference?.imageType === 'product'
        ? null
        : null
  const [productImage, setProductImage] = useState<string | null>(
    topic.productImage || (topic.reference?.imageType === 'product' ? topic.reference.url : null)
  )
  const [referenceImage, setReferenceImage] = useState<string | null>(topic.referenceImage || legacyReference)
  const [productImageOptOut, setProductImageOptOut] = useState(Boolean(topic.productImageOptOut))
  const [referenceImageOptOut, setReferenceImageOptOut] = useState(Boolean(topic.referenceImageOptOut))
  const [uploadingField, setUploadingField] = useState<TopicImageType | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleConfirm() {
    onConfirm({
      productImage: productImageOptOut ? null : productImage,
      productImageOptOut,
      referenceImage: referenceImageOptOut ? null : referenceImage,
      referenceImageOptOut,
    })
  }

  async function uploadTopicImage(file: File, imageType: TopicImageType) {
    const supabase = createClient()
    const sessionId = window.localStorage.getItem('soon-onboarding-session-id')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const ownerId = user?.id || sessionId

    if (!ownerId) {
      throw new Error('Missing onboarding session')
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const storagePath = `${ownerId}/topic-review/${topic.id}/${imageType}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
    const url = publicUrlData.publicUrl

    const { error: insertError } = await supabase.from('brand_assets').insert({
      user_id: user?.id || null,
      onboarding_session_id: sessionId || null,
      asset_type: imageType === 'product' ? 'product' : 'reference',
      url,
      filename: file.name,
      is_used: true,
    })
    if (insertError) throw insertError

    return url
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>, imageType: TopicImageType) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('請上傳 JPG 或 PNG 圖片。')
      event.target.value = ''
      return
    }

    setUploadingField(imageType)
    setUploadError(null)
    try {
      const url = await uploadTopicImage(file, imageType)
      if (imageType === 'product') {
        setProductImage(url)
        setProductImageOptOut(false)
      } else {
        setReferenceImage(url)
        setReferenceImageOptOut(false)
      }
    } catch (err) {
      console.warn('[topic-review/assets] upload failed:', err)
      setUploadError('上傳未完成，請稍後再試。')
    } finally {
      setUploadingField(null)
      event.target.value = ''
    }
  }

  return (
    <div className="reference-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="reference-modal topic-data-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="reference-modal-close" onClick={onClose} aria-label="關閉">
          ×
        </button>
        <div className="reference-modal-body">
          <header>
            <h2 id="reference-modal-title">為「{topic.label}」填寫資料</h2>
          </header>

          <section className="topic-data-section">
            <div className="topic-data-section-heading">
              <h3>這個 post 想展示什麼？</h3>
              <p>上傳你想推廣的產品、服務或場景的圖片</p>
            </div>
            <UploadDropzone
              disabled={productImageOptOut}
              image={productImage}
              inputId={`product-image-${topic.id}`}
              isUploading={uploadingField === 'product'}
              label="上傳產品、服務或場景圖片"
              onUpload={(event) => handleUpload(event, 'product')}
            />
            <label className="topic-data-radio">
              <input
                type="radio"
                checked={productImageOptOut}
                onChange={() => {
                  setProductImageOptOut(true)
                  setProductImage(null)
                }}
              />
              <span>這個 post 不需要展示任何產品或服務</span>
            </label>
          </section>

          <hr className="topic-data-divider" />

          <section className="topic-data-section">
            <div className="topic-data-section-heading">
              <h3>有沒有你喜歡的感覺參考？</h3>
              <p>在 Instagram 或 Pinterest 見過覺得好看的圖？截圖上傳，SOON 會參考它的氛圍。</p>
            </div>
            <UploadDropzone
              disabled={referenceImageOptOut}
              image={referenceImage}
              inputId={`reference-image-${topic.id}`}
              isUploading={uploadingField === 'reference'}
              label="上傳感覺參考圖"
              onUpload={(event) => handleUpload(event, 'reference')}
            />
            <label className="topic-data-radio">
              <input
                type="radio"
                checked={referenceImageOptOut}
                onChange={() => {
                  setReferenceImageOptOut(true)
                  setReferenceImage(null)
                }}
              />
              <span>沒有，讓 SOON 自行決定</span>
            </label>
          </section>

          {uploadError ? <p className="asset-error">{uploadError}</p> : null}
        </div>

        <div className="insert-image-bar">
          <button type="button" className="deselect-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="insert-image-button" onClick={handleConfirm}>
            確認
          </button>
        </div>
      </section>
    </div>
  )
}

function UploadDropzone({
  disabled,
  image,
  inputId,
  isUploading,
  label,
  onUpload,
}: {
  disabled: boolean
  image: string | null
  inputId: string
  isUploading: boolean
  label: string
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className={`topic-upload-zone ${disabled ? 'disabled' : ''}`} htmlFor={inputId}>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        disabled={disabled || isUploading}
        onChange={onUpload}
      />
      {image ? (
        <img src={image} alt="" />
      ) : (
        <span>
          <strong>{isUploading ? '上傳中...' : label}</strong>
          <em>支援 JPG、PNG</em>
        </span>
      )}
    </label>
  )
}

function SelectableAssetButton({
  children,
  className = '',
  image,
  imageType,
  isSelected,
  label = '參考圖片',
  onSelect,
}: {
  children?: React.ReactNode
  className?: string
  image: string
  imageType: TopicImageType
  isSelected: boolean
  label?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`asset-card selectable-asset ${className} ${isSelected ? 'selected' : ''}`}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <img src={image} alt="" />
      {isSelected ? <span className="selected-check" aria-hidden="true">✓</span> : null}
      {children}
      <span className={`asset-type-label ${imageType}`}>
        {imageType === 'product' ? 'AI 會以此作為主角' : 'AI 會參考此風格'}
      </span>
    </button>
  )
}

function GenerateImagePanel({
  setSize,
  setStyle,
  size,
  style,
}: {
  setSize: (size: '正方形' | '橫向' | '直向') => void
  setStyle: (style: '相片' | '插畫') => void
  size: '正方形' | '橫向' | '直向'
  style: '相片' | '插畫'
}) {
  return (
    <div className="generate-image-panel">
      <header>
        <h2 id="reference-modal-title">生成圖片</h2>
        <p>由 ChatGPT 圖像生成支援</p>
      </header>

      <h3>描述你想生成的圖片，或者參考以下例子</h3>

      <div className="prompt-composer">
        <textarea placeholder="描述圖片" aria-label="描述圖片" />
        <div className="prompt-controls">
          <OptionPicker
            label="尺寸"
            options={['正方形', '橫向', '直向']}
            value={size}
            onSelect={setSize}
          />
          <OptionPicker
            label="風格"
            options={['相片', '插畫']}
            value={style}
            onSelect={setStyle}
          />
          <button type="button" className="generate-submit">
            生成 ✨5
          </button>
        </div>
      </div>

      <div className="credit-note">
        <span>每次生成需要 5 credits</span>
      </div>

      <section className="trending-examples" aria-label="熱門例子">
        <h3>熱門例子</h3>
        <div className="trending-grid">
          {TRENDING_EXAMPLES.map((example) => (
            <article className="trending-card" key={example.prompt}>
              <img src={example.image} alt="" />
              <p>{example.prompt}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function OptionPicker<T extends string>({
  label,
  onSelect,
  options,
  value,
}: {
  label: string
  onSelect: (value: T) => void
  options: T[]
  value: T
}) {
  return (
    <div className="option-picker" aria-label={label}>
      <span>{label}</span>
      {options.map((option) => (
        <button
          type="button"
          className={option === value ? 'selected' : ''}
          key={option}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function ReferenceSection({
  title,
  action,
  children,
}: {
  title: string
  action?: string
  children: React.ReactNode
}) {
  return (
    <section className="reference-section">
      <div className="reference-section-header">
        <h3>{title}</h3>
        {action ? <span>{action}</span> : null}
      </div>
      <div className="reference-grid">{children}</div>
    </section>
  )
}

const styles = `
  .topic-review-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #191a1d;
    padding: 17px clamp(18px, 4vw, 50px) 64px;
    position: relative;
  }

  .topic-review-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #9b9b9b;
    font-size: 11px;
    line-height: 1;
  }

  .topic-review-steps span {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    white-space: nowrap;
  }

  .topic-review-steps .active {
    color: #17181c;
    font-weight: 600;
  }

  .topic-review-steps b {
    color: #b6b6b6;
    font-weight: 400;
  }

  .topic-loading,
  .topic-error,
  .topic-review-content {
    width: min(100%, 760px);
    margin: 52px auto 0;
  }

  .topic-loading {
    min-height: calc(100vh - 190px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 0;
    padding-bottom: 48px;
    text-align: center;
  }

  .topic-error {
    text-align: center;
  }

  .topic-loading > p,
  .topic-error > p {
    margin: 0 0 13px;
    color: #a6a6a6;
    font-size: 11px;
  }

  .topic-loading h1,
  .topic-error h1,
  .topic-review-content h1 {
    margin: 0;
    color: #1b1c20;
    font-size: clamp(24px, 3vw, 31px);
    line-height: 1.12;
    font-weight: 500;
    letter-spacing: 0;
  }

  .topic-loading h2,
  .topic-error h2,
  .topic-review-content header p {
    margin: 11px 0 0;
    color: #5d6067;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 400;
  }

  .topic-loading h2,
  .topic-error h2 {
    max-width: 462px;
    margin-left: auto;
    margin-right: auto;
  }

  .topic-error button {
    margin-top: 22px;
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    padding: 10px 16px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .topic-loading-dots {
    margin-top: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .topic-loading-dots span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #191a1d;
    opacity: 0.28;
    animation: topicDotPulse 900ms ease-in-out infinite;
  }

  .topic-loading-dots span:nth-child(2) {
    animation-delay: 120ms;
  }

  .topic-loading-dots span:nth-child(3) {
    animation-delay: 240ms;
  }

  @keyframes topicDotPulse {
    0%, 80%, 100% {
      transform: translateY(0);
      opacity: 0.28;
    }
    40% {
      transform: translateY(-5px);
      opacity: 0.78;
    }
  }

  .topic-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .topic-review-content header {
    max-width: none;
  }

  .topic-review-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 28px;
  }

  .topic-review-header-row > div {
    max-width: 650px;
  }

  .topic-regenerate-all,
  .topic-image-action,
  .topic-card-actions button,
  .topic-editor-actions button {
    border: 1px solid #dedfe3;
    border-radius: 7px;
    background: #ffffff;
    color: #25262b;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease, opacity 150ms ease;
  }

  .topic-regenerate-all {
    flex: 0 0 auto;
    padding: 9px 13px;
  }

  .topic-regenerate-all:hover,
  .topic-image-action:hover,
  .topic-card-actions button:hover,
  .topic-editor-actions button:hover {
    border-color: #aaaeb6;
    background: #f8f8f8;
  }

  .topic-regenerate-all:disabled,
  .topic-card-actions button:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .topic-action-error {
    margin: 20px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: #fff3f2;
    color: #a8322b;
    font-size: 13px;
  }

  .topic-list {
    margin-top: 31px;
    display: grid;
    gap: 39px;
  }

  .topic-row {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    align-items: center;
    gap: 28px;
  }

  .topic-image-stack {
    width: 112px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .topic-image {
    position: relative;
    width: 112px;
    height: 77px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #ffffff;
    border-radius: 8px;
  }

  .topic-image-empty {
    border: 1px dashed #d5d7dc;
    background: #f8f8f8;
    color: #737780;
    text-align: center;
  }

  .topic-image-empty > span {
    display: grid;
    gap: 4px;
    padding: 8px;
  }

  .topic-image-empty b {
    color: #555962;
    font-size: 10px;
    font-weight: 650;
  }

  .topic-image-empty small {
    font-size: 9px;
  }

  .topic-image-action {
    width: 100%;
    padding: 5px 7px;
    color: #5c6068;
    font-size: 10px;
  }

  .topic-image-button {
    border: 0;
    padding: 0;
    cursor: pointer;
    transition: transform 160ms ease, opacity 160ms ease;
  }

  .topic-image-button > img {
    border-radius: 8px;
    background: #f8f8f8;
  }

  .topic-image-button:hover {
    transform: translateY(-1px);
    opacity: 0.88;
  }

  .topic-website-image-label {
    color: #8b9099;
    font-size: 10px;
    line-height: 1;
  }

  .topic-image-badge {
    position: absolute;
    left: 6px;
    bottom: 6px;
    border-radius: 999px;
    padding: 3px 7px;
    color: #ffffff;
    font-size: 9px;
    font-weight: 650;
    line-height: 1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.16);
  }

  .topic-image-badge.product {
    background: #2563eb;
  }

  .topic-image-badge.reference {
    background: #d4a843;
  }

  .topic-reference-thumb {
    position: absolute;
    right: 5px;
    bottom: 5px;
    width: 42px;
    height: 32px;
    border: 2px solid #ffffff;
    border-radius: 7px;
    overflow: hidden;
    background: #f3f4f6;
    box-shadow: 0 6px 16px rgba(0,0,0,0.18);
  }

  .topic-reference-thumb > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .topic-reference-thumb .topic-image-badge {
    left: 3px;
    right: 3px;
    bottom: 3px;
    padding: 2px 4px;
    font-size: 8px;
    text-align: center;
  }

  .topic-copy h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    color: #1e1f24;
    font-size: 15px;
    font-weight: 550;
    line-height: 1.2;
  }

  .topic-icon {
    width: 14px;
    height: 14px;
    display: inline-grid;
    place-items: center;
    border-radius: 4px;
    font-size: 8px;
    line-height: 1;
  }

  .topic-icon.image {
    color: #ef5148;
    border: 1px solid rgba(239, 81, 72, 0.42);
  }

  .topic-icon.post {
    color: #2e9a55;
    border: 1px solid rgba(46, 154, 85, 0.45);
  }

  .topic-label {
    margin: 13px 0 0;
    color: #666970;
    font-size: 10px;
  }

  .topic-text {
    margin: 4px 0 0;
    color: #202126;
    font-size: 14px;
    line-height: 1.45;
  }

  .topic-purpose-label {
    margin: 14px 0 0;
    color: #666970;
    font-size: 10px;
  }

  .topic-purpose {
    margin: 4px 0 0;
    color: #555962;
    font-size: 13px;
    line-height: 1.5;
  }

  .topic-card-actions,
  .topic-editor-actions {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 14px;
  }

  .topic-card-actions button,
  .topic-editor-actions button {
    padding: 6px 10px;
  }

  .topic-card-actions button:last-child,
  .topic-editor-actions button:last-child {
    border-color: #1f2024;
    background: #1f2024;
    color: #ffffff;
  }

  .topic-editor {
    margin-top: 13px;
  }

  .topic-editor-field {
    display: block;
    margin-top: 10px;
    color: #666970;
    font-size: 10px;
    font-weight: 550;
  }

  .editable-topic-text {
    position: relative;
    width: 100%;
    border: 0;
    background: transparent;
    padding: 0 24px 2px 0;
    text-align: left;
    font: inherit;
    cursor: text;
  }

  .editable-topic-text:hover {
    color: #111111;
  }

  .topic-edit-icon {
    position: absolute;
    right: 0;
    top: 1px;
    color: #9ca3af;
    font-size: 13px;
    opacity: 0;
    transition: opacity 140ms ease;
  }

  .editable-topic-text:hover .topic-edit-icon {
    opacity: 1;
  }

  .topic-text-editor {
    width: 100%;
    margin: 10px 0 0;
    padding: 7px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    background: #fbfbfb;
    color: #202126;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
    resize: none;
    overflow: hidden;
    outline: none;
  }

  .topic-text-editor:focus {
    border-color: #d4a843;
    box-shadow: 0 0 0 3px rgba(212,168,67,0.14);
  }

  .topic-review-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    min-height: 48px;
    background: rgba(255,255,255,0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 17px;
  }

  .topic-review-footer button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .topic-review-footer button:last-child {
    border-radius: 6px;
    background: #111111;
    color: #ffffff;
    padding: 8px 14px;
    font-size: 13px;
  }

  .reference-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(241, 243, 245, 0.74);
    backdrop-filter: blur(7px);
    display: grid;
    place-items: center;
    padding: 36px 20px;
  }

  .reference-modal {
    position: relative;
    width: min(100%, 720px);
    max-height: calc(100vh - 72px);
    overflow: hidden;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 26px 90px rgba(23, 24, 28, 0.14);
    display: flex;
    flex-direction: column;
  }

  .reference-modal-close {
    position: absolute;
    top: 18px;
    right: 20px;
    z-index: 5;
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #282a30;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .reference-modal-body {
    min-height: 0;
    overflow: auto;
    padding: 32px 36px 28px;
  }

  .reference-modal header p {
    margin: 0 0 6px;
    color: #8b91a0;
    font-size: 12px;
  }

  .reference-modal h2 {
    margin: 0;
    color: #1c1d21;
    font-size: 24px;
    line-height: 1.15;
    font-weight: 500;
  }

  .topic-data-modal .reference-modal-body {
    padding-bottom: 20px;
  }

  .topic-data-section {
    margin-top: 26px;
  }

  .topic-data-section-heading h3 {
    margin: 0;
    color: #1d1f24;
    font-size: 16px;
    line-height: 1.25;
    font-weight: 700;
  }

  .topic-data-section-heading p {
    margin: 6px 0 0;
    color: #7a7f8b;
    font-size: 13px;
    line-height: 1.45;
  }

  .topic-upload-zone {
    margin-top: 14px;
    min-height: 160px;
    border: 1.5px dashed #cfd4dc;
    border-radius: 14px;
    background: #fafafa;
    display: grid;
    place-items: center;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease, opacity 160ms ease;
  }

  .topic-upload-zone:hover {
    border-color: #aeb5c2;
    background: #f7f7f8;
  }

  .topic-upload-zone.disabled {
    cursor: not-allowed;
    opacity: 0.48;
    background: #f3f4f6;
  }

  .topic-upload-zone input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .topic-upload-zone img {
    width: 100%;
    height: 100%;
    max-height: 280px;
    object-fit: contain;
    display: block;
    background: #ffffff;
  }

  .topic-upload-zone span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: #202126;
    font-size: 14px;
    text-align: center;
  }

  .topic-upload-zone strong {
    font-weight: 650;
  }

  .topic-upload-zone em {
    color: #9ca3af;
    font-size: 12px;
    font-style: normal;
  }

  .topic-data-radio {
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #3d414a;
    font-size: 13px;
    cursor: pointer;
  }

  .topic-data-radio input {
    width: 15px;
    height: 15px;
    accent-color: #17181c;
  }

  .topic-data-divider {
    margin: 28px 0 0;
    border: 0;
    border-top: 1px solid #eceef2;
  }

  .reference-modal header > span {
    display: block;
    margin-top: 8px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.45;
  }

  .reference-tabs {
    margin-top: 22px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 10px;
    background: #f3f4f6;
    padding: 4px;
  }

  .reference-tabs button {
    min-height: 34px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #6b7280;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 0 14px;
    cursor: pointer;
  }

  .reference-tabs button.active {
    background: #ffffff;
    color: #17181c;
    box-shadow: 0 1px 7px rgba(0,0,0,0.08);
  }

  .reference-tab-panel {
    margin-top: 22px;
  }

  .reference-info {
    margin: 0 0 16px;
    border: 1px solid #f1e6bd;
    border-radius: 9px;
    background: #fff8e1;
    color: #78622a;
    font-size: 13px;
    line-height: 1.5;
    padding: 10px 12px;
  }

  .product-upload-button {
    width: 100%;
    min-height: 54px;
    border: 1px dashed #c8ccd3;
    border-radius: 12px;
    background: #f9fafb;
    color: #202126;
    display: grid;
    place-items: center;
    font: inherit;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
  }

  .product-upload-button input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .asset-error {
    margin: 10px 0 0;
    color: #b42318;
    font-size: 12px;
  }

  .product-asset-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }

  .product-asset-empty {
    margin-top: 18px;
    border: 1px solid #eceef2;
    border-radius: 12px;
    background: #fbfbfb;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.5;
    padding: 18px;
    text-align: center;
  }

  .reference-search {
    margin-top: 0;
    min-height: 46px;
    border: 1px solid #e6e8ec;
    border-radius: 9px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    color: #8e95a3;
    font-size: 15px;
  }

  .reference-search p {
    margin: 0;
  }

  .modal-actions {
    margin-top: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .modal-actions button,
  .upload-pill {
    min-height: 32px;
    border: 1px solid #e4e6eb;
    border-radius: 8px;
    background: #f9fafb;
    color: #1d1f24;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .upload-pill input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .file-empty {
    color: #747986;
    font-size: 12px;
  }

  .reference-section {
    margin-top: 30px;
  }

  .reference-section-header {
    margin-bottom: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .reference-section-header h3 {
    margin: 0;
    color: #202126;
    font-size: 16px;
    font-weight: 600;
  }

  .reference-section-header span {
    color: #202126;
    font-size: 13px;
  }

  .reference-grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100px;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .asset-card,
  .create-card,
  .brand-kit-card {
    position: relative;
    height: 110px;
    border: 0;
    border-radius: 8px;
    overflow: hidden;
    background: #f1f1f1;
    padding: 0;
    cursor: pointer;
  }

  .selectable-asset {
    outline: 0 solid transparent;
    transition: box-shadow 160ms ease, outline-color 160ms ease, transform 160ms ease;
  }

  .selectable-asset:hover {
    transform: translateY(-1px);
    box-shadow: 0 7px 18px rgba(0,0,0,0.1);
  }

  .selectable-asset.selected {
    outline: 2px solid #191a1d;
    box-shadow: 0 0 0 4px #ffffff, 0 8px 20px rgba(0,0,0,0.12);
  }

  .selected-check {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: #111111;
    color: #ffffff;
    display: grid;
    place-items: center;
    font-size: 17px;
    line-height: 1;
  }

  .asset-card img,
  .brand-kit-card img {
    width: 100%;
    height: calc(100% - 26px);
    object-fit: cover;
    display: block;
  }

  .asset-type-label {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.94);
    color: #5d6067;
    font-size: 10px;
    font-weight: 600;
    padding: 0 6px;
    text-align: center;
  }

  .asset-type-label.product {
    color: #1d4ed8;
  }

  .asset-type-label.reference {
    color: #9a6b05;
  }

  .create-card {
    display: grid;
    place-items: center;
    color: #1f2025;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.22;
  }

  .create-card strong {
    font-size: 12px;
  }

  .brand-kit-card {
    width: 120px;
    height: 110px;
    background: #ffffff;
  }

  .brand-kit-card img {
    object-fit: contain;
  }

  .video-card span {
    position: absolute;
    right: 6px;
    bottom: 6px;
    border-radius: 999px;
    background: rgba(0,0,0,0.72);
    color: #ffffff;
    padding: 3px 6px;
    font-size: 10px;
  }

  .insert-image-bar {
    flex: 0 0 auto;
    min-height: 62px;
    border-top: 1px solid #ececec;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px;
  }

  .deselect-button,
  .insert-image-button {
    min-height: 36px;
    border: 0;
    border-radius: 8px;
    font: inherit;
    font-size: 14px;
    padding: 0 14px;
    cursor: pointer;
  }

  .deselect-button {
    background: transparent;
    color: #8a8d94;
  }

  .insert-image-button {
    background: #111111;
    color: #ffffff;
  }

  .deselect-button:disabled,
  .insert-image-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .generate-modal {
    width: min(100%, 1240px);
    overflow: auto;
    display: block;
    padding: 32px 36px 30px;
  }

  .generate-image-panel header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  .generate-image-panel header p {
    margin: 10px 44px 0 0;
    color: #6b717c;
    font-size: 15px;
  }

  .generate-image-panel h3 {
    margin: 58px 0 0;
    color: #2a2d35;
    font-size: 29px;
    line-height: 1.22;
    font-weight: 600;
  }

  .prompt-composer {
    margin-top: 66px;
    border: 1px solid #d7d7d7;
    border-radius: 22px;
    padding: 26px 24px 24px;
  }

  .prompt-composer textarea {
    width: 100%;
    min-height: 76px;
    resize: vertical;
    border: 0;
    outline: 0;
    color: #1f2127;
    font: inherit;
    font-size: 27px;
    line-height: 1.35;
  }

  .prompt-composer textarea::placeholder {
    color: #98a0ae;
  }

  .prompt-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .option-picker {
    min-height: 54px;
    border-radius: 999px;
    background: #f6f6f6;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px 7px 18px;
  }

  .option-picker span {
    color: #8c8f96;
    font-size: 23px;
  }

  .option-picker button {
    min-height: 38px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #222329;
    font: inherit;
    font-size: 18px;
    font-weight: 600;
    padding: 0 12px;
    cursor: pointer;
  }

  .option-picker button.selected {
    background: #ffffff;
    box-shadow: 0 1px 8px rgba(0,0,0,0.08);
  }

  .generate-submit {
    min-height: 56px;
    border: 0;
    border-radius: 12px;
    background: #b9b9bb;
    color: #ffffff;
    font: inherit;
    font-size: 24px;
    margin-left: auto;
    padding: 0 22px;
    cursor: pointer;
  }

  .credit-note {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: #747986;
    font-size: 14px;
  }

  .credit-note span {
    border-radius: 999px;
    background: #f6f6f6;
    padding: 7px 11px;
  }

  .trending-examples {
    margin-top: 38px;
  }

  .trending-examples h3 {
    margin: 0;
    color: #17181c;
    font-size: 31px;
    font-weight: 500;
  }

  .trending-grid {
    margin-top: 28px;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 290px;
    gap: 28px;
    overflow-x: auto;
    padding: 0 0 12px 8px;
  }

  .trending-card {
    border: 1px solid #e4e4e4;
    border-radius: 14px;
    background: #ffffff;
    overflow: hidden;
  }

  .trending-card img {
    width: calc(100% - 32px);
    height: 260px;
    margin: 16px 16px 0;
    border-radius: 7px;
    object-fit: cover;
    display: block;
  }

  .trending-card p {
    min-height: 72px;
    margin: 14px 16px 18px;
    color: #1f2025;
    font-size: 22px;
    line-height: 1.24;
  }

  @media (max-width: 900px) {
    .loading-demo {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .demo-topic-card {
      grid-template-columns: 1fr;
    }

    .demo-arrow {
      transform: rotate(90deg);
    }

    .mock-post {
      margin: 0 auto;
    }

    .topic-row {
      grid-template-columns: 84px 1fr;
      gap: 17px;
    }

    .topic-image-stack {
      width: 84px;
    }

    .topic-image {
      width: 84px;
      height: 64px;
    }

    .reference-modal-body {
      padding: 28px 24px 22px;
    }

    .insert-image-bar {
      padding: 12px 16px;
    }

    .generate-modal {
      padding: 28px 24px 34px;
    }

    .prompt-composer {
      margin-top: 34px;
    }

    .generate-submit {
      margin-left: 0;
    }
  }

  @media (max-width: 640px) {
    .topic-review-page {
      padding: 14px 13px 62px;
    }

    .topic-review-steps {
      justify-content: flex-start;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .topic-loading,
    .topic-review-content {
      margin-top: 34px;
    }

    .topic-row {
      grid-template-columns: 1fr;
      gap: 11px;
    }

    .topic-review-header-row {
      display: grid;
      gap: 16px;
    }

    .topic-regenerate-all {
      width: fit-content;
    }

    .topic-image-stack {
      width: 112px;
    }

    .topic-image {
      width: 112px;
      height: 77px;
    }

    .generate-image-panel h3 {
      margin-top: 36px;
      font-size: 24px;
    }

    .prompt-composer textarea {
      font-size: 22px;
    }

    .option-picker {
      width: 100%;
      justify-content: flex-start;
      overflow-x: auto;
    }

    .generate-submit {
      width: 100%;
    }

    .trending-grid {
      grid-auto-columns: 250px;
    }

    .trending-card img {
      height: 220px;
    }
  }
`

function TopicReviewFallback() {
  return <main className="topic-review-page" />
}

export default function TopicReviewPage() {
  return (
    <Suspense fallback={<TopicReviewFallback />}>
      <TopicReviewContent />
    </Suspense>
  )
}
