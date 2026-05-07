'use client'

import type { ChangeEvent } from 'react'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ContentMixItem = {
  id: string
  title: string
  titleZh?: string
  description?: string
  quantity: number
}

type ContentMixState = {
  items?: ContentMixItem[]
}

type PhotoControlState = {
  id?: string
  previewImage?: string
  generatedPreviewImage?: string | null
}

type BusinessProfileState = {
  brandName?: string
  logoUrl?: string
}

type TopicReference = {
  id: string
  label: string
  labelEn: string
  topic: string
  image: string | null
}

type LibraryAsset = {
  id: string
  title: string
  image: string
  kind: 'photo' | 'video' | 'brand'
}

const STORAGE_KEYS = {
  businessProfile: 'soon-business-profile-v1',
  contentMix: 'soon-content-mix-v1',
  photoControl: 'soon-photo-control-v2',
}

const STOCK_PHOTOS: LibraryAsset[] = [
  { id: 'stock-photo-1', title: '山景倒影', image: '/strategy-library/content-stills/still-images.png', kind: 'photo' },
  { id: 'stock-photo-2', title: '微距植物', image: '/strategy-library/content-stills/carousels.png', kind: 'photo' },
  { id: 'stock-photo-3', title: '步道風景', image: '/strategy-library/content-stills/feed-videos.png', kind: 'photo' },
  { id: 'stock-photo-4', title: '雪山湖景', image: '/strategy-library/content-stills/blogs.png', kind: 'photo' },
  { id: 'stock-photo-5', title: '水岸城市', image: '/strategy-library/content-stills/emails.png', kind: 'photo' },
]

const STOCK_VIDEOS: LibraryAsset[] = [
  { id: 'stock-video-1', title: '水下魚群', image: '/strategy-library/content-stills/short-form-video.png', kind: 'video' },
  { id: 'stock-video-2', title: '森林溪流', image: '/strategy-library/content-stills/stories.png', kind: 'video' },
  { id: 'stock-video-3', title: '古典建築', image: '/strategy-library/content-stills/feed-videos.png', kind: 'video' },
]

const TRENDING_EXAMPLES = [
  '開心顧客手持產品',
  '桌面俯拍產品與素材',
  '夏日促銷主視覺',
  '咖啡店生活感場景',
]

const STEP_LABELS = ['開始設定', '策略', '宣傳活動', '內容', '完成設定']

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function expandTopics(items: ContentMixItem[], fallbackImage: string | null): TopicReference[] {
  const results: TopicReference[] = []

  items
    .filter((item) => item.quantity > 0)
    .forEach((item) => {
      for (let index = 0; index < item.quantity; index += 1) {
        const sequence = index + 1
        const labelZh = item.titleZh || item.title
        results.push({
          id: `${item.id}-${sequence}`,
          label: `${labelZh} ${sequence}`,
          labelEn: `${item.title} ${sequence}`,
          topic: buildTopicCopy(item, sequence),
          image: fallbackImage,
        })
      }
    })

  return results
}

function buildTopicCopy(item: ContentMixItem, sequence: number) {
  const title = item.titleZh || item.title
  const prompts: Record<string, string[]> = {
    'still-images': [
      '用一個有記憶點的靜態畫面，講出品牌今日最值得記住的一刻。',
      '將品牌日常變成值得分享的視覺瞬間，讓觀眾一眼記得住。',
    ],
    carousels: [
      '用多張畫面一步步帶觀眾走入故事，令品牌情緒慢慢建立起來。',
    ],
    'feed-videos': [
      '用短片節奏放大情感與互動，令品牌畫面更有代入感。',
    ],
    'short-form-video': [
      '用短影音捕捉最有感染力的一秒，提升停留與分享意欲。',
    ],
    stories: [
      '用即時感強的內容，分享品牌當下發生的片段與氣氛。',
    ],
    blogs: [
      '用較完整的內容整理觀點，幫品牌建立更深一層的連結。',
    ],
    emails: [
      '用較私人的語氣向受眾說話，延續品牌與觀眾之間的關係。',
    ],
  }

  const options = prompts[item.id] || [`圍繞 ${title} 建立一個清晰主題，令品牌內容更容易被記住。`]
  return options[(sequence - 1) % options.length]
}

function getStepStatus(index: number) {
  if (index < 3) return 'completed'
  if (index === 3) return 'current'
  return 'upcoming'
}

function TopicReviewContent() {
  const searchParams = useSearchParams()

  const businessProfile = readStorage<BusinessProfileState>(STORAGE_KEYS.businessProfile)
  const contentMix = readStorage<ContentMixState>(STORAGE_KEYS.contentMix)
  const photoControl = readStorage<PhotoControlState>(STORAGE_KEYS.photoControl)

  const fallbackImage =
    photoControl?.generatedPreviewImage ||
    photoControl?.previewImage ||
    businessProfile?.logoUrl ||
    '/soon-log-logo.png'

  const initialTopics = useMemo(
    () => expandTopics(contentMix?.items || [], fallbackImage || null),
    [contentMix?.items, fallbackImage],
  )

  const [topics, setTopics] = useState<TopicReference[]>(initialTopics)
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [linkValue, setLinkValue] = useState('')
  const [promptValue, setPromptValue] = useState('')
  const [aiSize, setAiSize] = useState<'Square' | 'Landscape' | 'Portrait'>('Square')
  const [aiStyle, setAiStyle] = useState<'Photo' | 'Illustration'>('Photo')
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const brandAssets = useMemo<LibraryAsset[]>(
    () =>
      businessProfile?.logoUrl || fallbackImage
        ? [
            {
              id: 'brand-logo',
              title: businessProfile?.brandName || '品牌標誌',
              image: businessProfile?.logoUrl || fallbackImage || '/soon-log-logo.png',
              kind: 'brand',
            },
          ]
        : [],
    [businessProfile?.brandName, businessProfile?.logoUrl, fallbackImage],
  )

  const activeTopic = useMemo(
    () => topics.find((topic) => topic.id === activeTopicId) || null,
    [topics, activeTopicId],
  )

  const visiblePhotoAssets = useMemo(() => {
    if (!searchValue.trim()) return STOCK_PHOTOS
    return STOCK_PHOTOS.filter((asset) => asset.title.includes(searchValue.trim()))
  }, [searchValue])

  const visibleVideoAssets = useMemo(() => {
    if (!searchValue.trim()) return STOCK_VIDEOS
    return STOCK_VIDEOS.filter((asset) => asset.title.includes(searchValue.trim()))
  }, [searchValue])

  function openLibrary(topicId: string) {
    setActiveTopicId(topicId)
    setSearchValue('')
    setLinkValue('')
    setPromptValue('')
    setGeneratedDraft(null)
    setDraftError(null)
    setIsGeneratingDraft(false)
    setIsLibraryOpen(true)
  }

  function updateTopicImage(image: string) {
    if (!activeTopicId) return
    setTopics((current) =>
      current.map((topic) => (topic.id === activeTopicId ? { ...topic, image } : topic)),
    )
    setIsLibraryOpen(false)
    setIsAiModalOpen(false)
    setGeneratedDraft(null)
    setDraftError(null)
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    updateTopicImage(objectUrl)
    event.target.value = ''
  }

  function handleInsertFromLink() {
    if (!linkValue.trim()) return
    updateTopicImage(linkValue.trim())
  }

  async function handleGenerateDraft() {
    const topicPrompt =
      promptValue.trim() ||
      `請為這個主題生成一張參考圖片：${activeTopic?.topic || '品牌內容'}。構圖比例為${aiSize}，風格為${
        aiStyle === 'Photo' ? '真實照片' : '插畫'
      }，畫面要貼近品牌內容提案，適合作為社交媒體內容參考圖。`

    try {
      setIsGeneratingDraft(true)
      setDraftError(null)

      const response = await fetch('/api/photo-control/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: aiStyle === 'Illustration' ? 'full-freedom' : 'balanced',
          originalImageUrl: activeTopic?.image || fallbackImage || '/soon-log-logo.png',
          prompt: topicPrompt,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.imageDataUrl) {
        throw new Error(data?.error || '生成圖片失敗，請稍後再試。')
      }

      setGeneratedDraft(data.imageDataUrl)
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : '生成圖片失敗，請稍後再試。')
      setGeneratedDraft(null)
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  function handleContinue() {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('soon-topic-review-v1', JSON.stringify(topics))
    const url = new URL('/onboarding/review', window.location.origin)
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
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleBack() {
    window.history.back()
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171717]">
      <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-6 pb-10 pt-8 sm:px-8 lg:px-12">
        <div className="flex items-center justify-center gap-4 border-b border-black/6 pb-6 text-sm text-black/40 sm:gap-6">
          {STEP_LABELS.map((label, index) => {
            const status = getStepStatus(index)
            return (
              <div key={label} className="flex items-center gap-4 sm:gap-6">
                <span className={status === 'current' ? 'font-medium text-black' : status === 'completed' ? 'text-black/72' : 'text-black/36'}>
                  {label}
                </span>
                {index < STEP_LABELS.length - 1 ? <span className="text-black/22">›</span> : null}
              </div>
            )
          })}
        </div>

        <div className="mx-auto flex w-full max-w-[980px] flex-1 flex-col pt-14">
          <div className="space-y-4">
            <h1 className="text-4xl font-medium tracking-tight text-black sm:text-5xl">
              檢查主題與參考圖片
            </h1>
            <p className="max-w-[760px] text-lg leading-8 text-black/56">
              你可以將呢一頁當成之後每一條內容嘅方向說明。每個主題都可以換圖、上載、貼連結，或者直接用 AI 生成更貼近品牌感覺嘅參考畫面。
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {topics.map((topic) => (
              <article
                key={topic.id}
                className="grid gap-6 rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.25)] sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6"
              >
                <button
                  type="button"
                  onClick={() => openLibrary(topic.id)}
                  className="group relative overflow-hidden rounded-[22px] border border-black/10 bg-[#f6f6f1] text-left transition hover:border-black/20 hover:shadow-md"
                >
                  {topic.image ? (
                    <img
                      src={topic.image}
                      alt={topic.label}
                      className="h-[180px] w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-full"
                    />
                  ) : (
                    <div className="flex h-[180px] items-center justify-center text-sm text-black/35">
                      未設定參考圖片
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-4 py-3 text-white">
                    <span className="text-sm font-medium">更換參考圖片</span>
                    <span className="rounded-full border border-white/30 bg-white/15 px-2 py-1 text-xs">
                      點擊編輯
                    </span>
                  </div>
                </button>

                <div className="flex min-w-0 flex-col justify-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-black/42">
                      <span className="rounded-full bg-[#fff7e5] px-3 py-1 font-medium text-[#8c5f0a]">
                        內容項目
                      </span>
                      <span>{topic.labelEn}</span>
                    </div>
                    <h2 className="text-3xl font-medium tracking-tight text-black">{topic.label}</h2>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-black/8 bg-[#faf9f5] p-5">
                    <p className="text-sm font-medium tracking-wide text-black/42">主題方向</p>
                    <p className="mt-3 text-xl leading-9 text-black/84">{topic.topic}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-black/6 pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-base font-medium text-black transition hover:border-black/20 hover:bg-black/[0.03]"
          >
            返回
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-full bg-black px-7 py-3 text-base font-medium text-white transition hover:bg-black/90"
          >
            繼續
          </button>
        </div>
      </section>

      {isLibraryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-[1120px] overflow-auto rounded-[34px] bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => {
                setIsLibraryOpen(false)
                setIsAiModalOpen(false)
              }}
              className="absolute right-5 top-5 rounded-full border border-black/10 px-3 py-1 text-sm text-black/65 transition hover:border-black/20 hover:text-black"
            >
              關閉
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-4xl font-medium tracking-tight text-black">更換參考圖片</h3>
                <p className="mt-3 text-base leading-7 text-black/55">
                  你可以搜尋、上載、貼連結，或者直接用 AI 生一張較貼近呢條內容方向嘅參考圖。
                </p>
              </div>

              <div className="rounded-[24px] border border-black/8 bg-[#fafaf8] p-4">
                <div className="rounded-[18px] border border-black/10 bg-white px-4 py-3">
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="搜尋圖片或影片"
                    className="w-full bg-transparent text-base outline-none placeholder:text-black/30"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:border-black/20">
                    <span>上載</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadChange} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:border-black/20"
                  >
                    用 AI 生成
                  </button>
                  <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
                    <input
                      value={linkValue}
                      onChange={(event) => setLinkValue(event.target.value)}
                      placeholder="貼上圖片連結"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/30"
                    />
                    <button
                      type="button"
                      onClick={handleInsertFromLink}
                      className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black/90"
                    >
                      插入
                    </button>
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-medium text-black">從品牌素材挑選</h4>
                  <span className="text-sm text-black/35">Brand Kit</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {brandAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onSelect={() => updateTopicImage(asset.image)} />
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-medium text-black">素材圖片</h4>
                  <span className="text-sm text-black/35">Stock Photos</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {visiblePhotoAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onSelect={() => updateTopicImage(asset.image)} />
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-medium text-black">素材影片</h4>
                  <span className="text-sm text-black/35">Stock Videos</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleVideoAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onSelect={() => updateTopicImage(asset.image)} />
                  ))}
                </div>
              </section>
            </div>

            {isAiModalOpen ? (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm">
                <div className="max-h-[88vh] w-full max-w-[1060px] overflow-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-4xl font-medium tracking-tight text-black">生成圖片</h4>
                      <p className="mt-3 text-base leading-7 text-black/55">
                        輸入你想生成嘅參考畫面描述，或者直接選下面嘅熱門例子做起點。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/65 transition hover:border-black/20 hover:text-black"
                    >
                      關閉
                    </button>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-black/8 bg-[#fafaf8] p-5">
                    <textarea
                      value={promptValue}
                      onChange={(event) => setPromptValue(event.target.value)}
                      placeholder="描述你想生成嘅圖片"
                      rows={4}
                      className="w-full resize-none rounded-[18px] border border-black/10 bg-white px-4 py-3 text-base outline-none placeholder:text-black/30"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <SegmentedControl
                        value={aiSize}
                        options={['Square', 'Landscape', 'Portrait']}
                        onChange={(value) => setAiSize(value as 'Square' | 'Landscape' | 'Portrait')}
                      />
                      <SegmentedControl
                        value={aiStyle}
                        options={['Photo', 'Illustration']}
                        onChange={(value) => setAiStyle(value as 'Photo' | 'Illustration')}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateDraft}
                        className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black/90"
                      >
                        生成預覽
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {TRENDING_EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setPromptValue(example)}
                        className="rounded-[22px] border border-black/8 bg-[#fafaf8] p-5 text-left transition hover:border-black/20 hover:bg-white"
                      >
                        <p className="text-base font-medium text-black">{example}</p>
                      </button>
                    ))}
                  </div>

                  {generatedDraft ? (
                    <div className="mt-8 rounded-[28px] border border-black/8 bg-[#f8f7f3] p-5">
                      <p className="text-sm font-medium tracking-wide text-black/42">AI 生成預覽</p>
                      <img
                        src={generatedDraft}
                        alt="AI generated draft"
                        className="mt-4 h-[280px] w-full rounded-[22px] object-cover"
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => updateTopicImage(generatedDraft)}
                          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black/90"
                        >
                          插入圖片
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}

function TopicReviewFallback() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-400">Loading</p>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
            正在整理你的內容方向
          </h1>
          <p className="text-sm text-neutral-500 sm:text-base">
            我們正在準備每個題材的參考圖片與主題建議。
          </p>
        </div>
      </div>
    </main>
  )
}

export default function TopicReviewPage() {
  return (
    <Suspense fallback={<TopicReviewFallback />}>
      <TopicReviewContent />
    </Suspense>
  )
}

function AssetCard({ asset, onSelect }: { asset: LibraryAsset; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group overflow-hidden rounded-[22px] border border-black/8 bg-white text-left transition hover:-translate-y-0.5 hover:border-black/18 hover:shadow-md"
    >
      <img src={asset.image} alt={asset.title} className="h-[150px] w-full object-cover" />
      <div className="p-4">
        <p className="text-base font-medium text-black">{asset.title}</p>
        <p className="mt-1 text-sm text-black/40">
          {asset.kind === 'brand' ? '品牌素材' : asset.kind === 'video' ? '影片素材' : '圖片素材'}
        </p>
      </div>
    </button>
  )
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            value === option ? 'bg-black text-white' : 'text-black/55 hover:text-black'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function generatedDraftFromPrompt(prompt: string, size: 'Square' | 'Landscape' | 'Portrait', style: 'Photo' | 'Illustration') {
  const normalized = encodeURIComponent(`${prompt}-${size}-${style}`)
  const height = size === 'Portrait' ? 960 : size === 'Landscape' ? 720 : 860
  const width = size === 'Portrait' ? 720 : size === 'Landscape' ? 1280 : 860
  return `https://picsum.photos/seed/${normalized}/${width}/${height}`
}
