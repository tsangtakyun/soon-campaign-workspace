'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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
  image: string
}

const STORAGE_KEYS = {
  contentMix: 'soon-content-mix-v1',
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' rx='18' fill='%23f3f4f6'/%3E%3Cpath d='M92 142l44-47 34 36 18-21 40 32H92z' fill='%23d9dde4'/%3E%3Ccircle cx='220' cy='76' r='18' fill='%23c8ced8'/%3E%3Crect x='88' y='58' width='144' height='104' rx='12' fill='none' stroke='%23c5cbd5' stroke-width='4'/%3E%3Ctext x='160' y='190' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%238b929e'%3E參考圖片%3C/text%3E%3C/svg%3E"

const FALLBACK_TOPICS: TopicReference[] = [
  {
    id: 'still-image-1',
    label: '靜態圖片 1',
    type: 'image',
    topic: '當朋友可以一起看見日常裡的小片段，平凡的一天也會變得更值得分享',
    image: PLACEHOLDER_IMAGE,
  },
  {
    id: 'blog-post-1',
    label: '文章 1',
    type: 'post',
    topic: '最好的日常故事，往往是那些夠玩味、夠真實，而且真實到會想傳給朋友再看一次的片段',
    image: PLACEHOLDER_IMAGE,
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

const TOPIC_COPY: Record<string, string[]> = {
  'still-images': [
    '當朋友可以一起看見日常裡的小片段，平凡的一天也會變得更值得分享',
    '一個細小但有記憶點的畫面，可以令普通日常變成值得停下來看的內容',
  ],
  blogs: [
    '最好的日常故事，往往是那些夠玩味、夠真實，而且真實到會想傳給朋友再看一次的片段',
    '有用的故事如果聽起來像朋友會傳來的訊息，就會更容易被記住',
  ],
  carousels: [
    '用一組簡短畫面，把一個細小時刻整理成觀眾一眼明白的故事',
  ],
  'feed-videos': [
    '用一段短場景，令品牌自然出現在觀眾每日會經歷的節奏裡',
  ],
  'short-form-video': [
    '一個有動態的小瞬間，可以成為觀眾停下來看的理由',
  ],
  stories: [
    '內容應該感覺即時、輕鬆，而且容易令人即刻有反應',
  ],
  emails: [
    '直接訊息最有效的時候，是讀起來足夠個人化，令人願意繼續看下去',
  ],
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; type: TopicReference['type'] }> = {
  'still-images': { label: '靜態圖片', type: 'image' },
  blogs: { label: '文章', type: 'post' },
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

function buildTopics(): TopicReference[] {
  const contentMix = readStorage<ContentMixState>(STORAGE_KEYS.contentMix)
  const items = contentMix?.items?.filter((item) => item.quantity > 0) || []
  const topics: TopicReference[] = []

  items.forEach((item) => {
    const typeConfig = CONTENT_TYPE_LABELS[item.id] || {
      label: item.title || item.titleZh || 'Content',
      type: 'post' as const,
    }
    const copyOptions = TOPIC_COPY[item.id] || [
      `清晰的${typeConfig.label}應該令品牌更容易被理解，也更容易被分享`,
    ]

    for (let index = 0; index < item.quantity; index += 1) {
      const sequence = index + 1
      topics.push({
        id: `${item.id}-${sequence}`,
        label: `${typeConfig.label} ${sequence}`,
        type: typeConfig.type,
        topic: copyOptions[index % copyOptions.length],
        image: PLACEHOLDER_IMAGE,
      })
    }
  })

  if (topics.length) return topics.slice(0, 8)
  return FALLBACK_TOPICS
}

function TopicReviewContent() {
  const searchParams = useSearchParams()
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null)
  const topics = useMemo(() => buildTopics(), [])
  const activeTopic = topics.find((topic) => topic.id === activeReferenceId) || null

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsAnalyzing(false)
      window.sessionStorage.setItem('soon-topic-review-v1', JSON.stringify(topics))
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [topics])

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
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleContinue() {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('soon-topic-review-v1', JSON.stringify(topics))
    const url = new URL('/onboarding/review', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleBack() {
    window.history.back()
  }

  return (
    <main className="topic-review-page">
      <div className="topic-review-steps" aria-label="設定進度">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 2 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      {isAnalyzing ? (
        <section className="topic-loading" aria-live="polite">
          <p>分析中...</p>
          <h1>{topics.length > 1 ? '正在生成你的內容主題...' : '正在整理內容主題...'}</h1>
          <h2>
            每一條內容都由兩件事開始：一個決定方向的主題，以及一張保持品牌視覺一致的參考圖片。系統會先整理兩者之間的關係。
          </h2>

          <div className="loading-demo">
            <div className="loading-topic">
              <span>宣傳活動裡的主題：</span>
              <div className="demo-topic-card">
                <div className="demo-image">
                  <img src={PLACEHOLDER_IMAGE} alt="參考圖片佔位圖" />
                  <em>參考圖片</em>
                </div>
                <p>{topics[0]?.topic || FALLBACK_TOPICS[0].topic}</p>
              </div>
            </div>
            <div className="demo-arrow">→</div>
            <div className="generated-post">
              <span>生成內容示意：</span>
              <div className="mock-post">
                <img src={PLACEHOLDER_IMAGE} alt="生成內容示意" />
                <strong>日常<br />也可以<br />更有<br />畫面</strong>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="topic-review-content">
          <header>
            <h1>檢查你的內容主題與參考圖片。</h1>
            <p>你可以將這些視為之後 SOON 生成內容時，用來決定主體、方向和視覺目標的基礎。</p>
          </header>

          <div className="topic-list">
            {topics.map((topic) => (
              <article className="topic-row" key={topic.id}>
                <button
                  type="button"
                  className="topic-image topic-image-button"
                  onClick={() => setActiveReferenceId(topic.id)}
                  aria-label={`更換${topic.label}參考圖片`}
                >
                  <img src={topic.image} alt={`${topic.label} reference`} />
                </button>
                <div className="topic-copy">
                  <h2>
                    <span className={topic.type === 'image' ? 'topic-icon image' : 'topic-icon post'} aria-hidden="true">
                      {topic.type === 'image' ? '▧' : '▤'}
                    </span>
                    {topic.label}
                  </h2>
                  <p className="topic-label">主題：</p>
                  <p className="topic-text">{topic.topic}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="topic-review-footer">
        <button type="button" onClick={handleBack}>返回</button>
        {!isAnalyzing ? <button type="button" onClick={handleContinue}>繼續</button> : null}
      </footer>

      {activeTopic ? (
        <ReferenceImageModal topic={activeTopic} onClose={() => setActiveReferenceId(null)} />
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

function ReferenceImageModal({ topic, onClose }: { topic: TopicReference; onClose: () => void }) {
  const [view, setView] = useState<'library' | 'generate'>('library')
  const [size, setSize] = useState<'正方形' | '橫向' | '直向'>('正方形')
  const [style, setStyle] = useState<'相片' | '插畫'>('相片')

  return (
    <div className="reference-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={view === 'generate' ? 'reference-modal generate-modal' : 'reference-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="reference-modal-close" onClick={onClose} aria-label="關閉">
          ×
        </button>
        {view === 'generate' ? (
          <GenerateImagePanel
            setSize={setSize}
            setStyle={setStyle}
            size={size}
            style={style}
          />
        ) : (
          <>
            <header>
              <p>{topic.label}</p>
              <h2 id="reference-modal-title">更換參考圖片</h2>
            </header>

            <div className="reference-search" aria-hidden="true">
              <span>⌕</span>
              <p>搜尋圖片和影片</p>
            </div>

            <div className="modal-actions">
              <label className="upload-pill">
                <input type="file" />
                <span>上載</span>
              </label>
              <span className="file-empty">未選擇檔案</span>
              <button type="button" onClick={() => setView('generate')}>用 AI 生成</button>
            </div>

            <ReferenceSection title="用 AI 生成">
              <button type="button" className="create-card" onClick={() => setView('generate')}>
                <strong>AI</strong>
                <span>自行<br />建立</span>
              </button>
              {AI_REFERENCE_IMAGES.map((image) => (
                <button type="button" className="asset-card" key={image}>
                  <img src={image} alt="" />
                </button>
              ))}
            </ReferenceSection>

            <ReferenceSection title="你的品牌素材庫" action="SOON-LOG">
              <button type="button" className="brand-kit-card">
                <img src={PLACEHOLDER_IMAGE} alt="SOON-LOG" />
              </button>
            </ReferenceSection>

            <ReferenceSection title="庫存相片" action="查看全部">
              {STOCK_PHOTOS.map((image) => (
                <button type="button" className="asset-card" key={image}>
                  <img src={image} alt="" />
                </button>
              ))}
            </ReferenceSection>

            <ReferenceSection title="庫存影片" action="查看全部">
              {STOCK_VIDEOS.map((video) => (
                <button type="button" className="asset-card video-card" key={video.image}>
                  <img src={video.image} alt="" />
                  <span>{video.duration}</span>
                </button>
              ))}
            </ReferenceSection>
          </>
        )}
      </section>
    </div>
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
    padding: 24px clamp(24px, 5vw, 72px) 88px;
    position: relative;
  }

  .topic-review-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    color: #9b9b9b;
    font-size: 15px;
    line-height: 1;
  }

  .topic-review-steps span {
    display: inline-flex;
    align-items: center;
    gap: 18px;
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
  .topic-review-content {
    width: min(100%, 930px);
    margin: 76px auto 0;
  }

  .topic-loading {
    text-align: center;
  }

  .topic-loading > p {
    margin: 0 0 18px;
    color: #a6a6a6;
    font-size: 16px;
  }

  .topic-loading h1,
  .topic-review-content h1 {
    margin: 0;
    color: #1b1c20;
    font-size: clamp(34px, 4vw, 44px);
    line-height: 1.12;
    font-weight: 500;
    letter-spacing: 0;
  }

  .topic-loading h2,
  .topic-review-content header p {
    margin: 16px 0 0;
    color: #5d6067;
    font-size: 18px;
    line-height: 1.45;
    font-weight: 400;
  }

  .topic-loading h2 {
    max-width: 660px;
    margin-left: auto;
    margin-right: auto;
  }

  .loading-demo {
    margin-top: 48px;
    padding-top: 34px;
    border-top: 1px solid #ececec;
    display: grid;
    grid-template-columns: 1fr auto 250px;
    align-items: center;
    gap: 34px;
    text-align: left;
  }

  .loading-topic > span,
  .generated-post > span {
    display: block;
    margin-bottom: 14px;
    color: #25262a;
    font-size: 16px;
  }

  .demo-topic-card {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 14px;
    align-items: stretch;
  }

  .demo-image {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    min-height: 160px;
    background: #f1f1f1;
  }

  .demo-image img,
  .mock-post img,
  .topic-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .demo-image em {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px;
    color: #ffffff;
    background: linear-gradient(180deg, transparent, rgba(0,0,0,0.55));
    font-style: normal;
    text-align: center;
  }

  .demo-topic-card p {
    min-height: 160px;
    margin: 0;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 20px;
    color: #24252a;
    font-size: 18px;
    line-height: 1.35;
  }

  .demo-arrow {
    color: #111111;
    font-size: 48px;
    font-weight: 300;
  }

  .mock-post {
    position: relative;
    overflow: hidden;
    width: 250px;
    aspect-ratio: 4 / 5;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    background: #f5f5f5;
    box-shadow: 0 24px 70px rgba(0,0,0,0.08);
  }

  .mock-post img {
    object-fit: cover;
    opacity: 0.72;
  }

  .mock-post strong {
    position: absolute;
    top: 42px;
    right: 24px;
    color: #ffffff;
    font-size: 31px;
    line-height: 0.92;
    text-align: right;
  }

  .topic-review-content header {
    max-width: 820px;
  }

  .topic-list {
    margin-top: 44px;
    display: grid;
    gap: 56px;
  }

  .topic-row {
    display: grid;
    grid-template-columns: 160px minmax(0, 1fr);
    align-items: center;
    gap: 40px;
  }

  .topic-image {
    width: 160px;
    height: 110px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #ffffff;
  }

  .topic-image-button {
    border: 0;
    padding: 0;
    cursor: pointer;
    transition: transform 160ms ease, opacity 160ms ease;
  }

  .topic-image-button:hover {
    transform: translateY(-1px);
    opacity: 0.88;
  }

  .topic-copy h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1e1f24;
    font-size: 22px;
    font-weight: 550;
    line-height: 1.2;
  }

  .topic-icon {
    width: 20px;
    height: 20px;
    display: inline-grid;
    place-items: center;
    border-radius: 5px;
    font-size: 12px;
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
    margin: 18px 0 0;
    color: #666970;
    font-size: 14px;
  }

  .topic-text {
    margin: 18px 0 0;
    color: #202126;
    font-size: 20px;
    line-height: 1.45;
  }

  .topic-review-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    min-height: 68px;
    background: rgba(255,255,255,0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
  }

  .topic-review-footer button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 20px;
    cursor: pointer;
  }

  .topic-review-footer button:last-child {
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    padding: 12px 20px;
    font-size: 18px;
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
    width: min(100%, 1120px);
    max-height: calc(100vh - 72px);
    overflow: auto;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 26px 90px rgba(23, 24, 28, 0.14);
    padding: 46px 52px 54px;
  }

  .reference-modal-close {
    position: absolute;
    top: 24px;
    right: 28px;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #282a30;
    font-size: 30px;
    line-height: 1;
    cursor: pointer;
  }

  .reference-modal header p {
    margin: 0 0 8px;
    color: #8b91a0;
    font-size: 14px;
  }

  .reference-modal h2 {
    margin: 0;
    color: #1c1d21;
    font-size: 34px;
    line-height: 1.15;
    font-weight: 500;
  }

  .reference-search {
    margin-top: 34px;
    min-height: 64px;
    border: 1px solid #e6e8ec;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 22px;
    color: #8e95a3;
    font-size: 20px;
  }

  .reference-search p {
    margin: 0;
  }

  .modal-actions {
    margin-top: 14px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .modal-actions button,
  .upload-pill {
    min-height: 44px;
    border: 1px solid #e4e6eb;
    border-radius: 10px;
    background: #f9fafb;
    color: #1d1f24;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    font-size: 17px;
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
    font-size: 16px;
  }

  .reference-section {
    margin-top: 44px;
  }

  .reference-section-header {
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .reference-section-header h3 {
    margin: 0;
    color: #202126;
    font-size: 22px;
    font-weight: 600;
  }

  .reference-section-header span {
    color: #202126;
    font-size: 18px;
  }

  .reference-grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 142px;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .asset-card,
  .create-card,
  .brand-kit-card {
    position: relative;
    height: 112px;
    border: 0;
    border-radius: 10px;
    overflow: hidden;
    background: #f1f1f1;
    padding: 0;
    cursor: pointer;
  }

  .asset-card img,
  .brand-kit-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .create-card {
    display: grid;
    place-items: center;
    color: #1f2025;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.22;
  }

  .create-card strong {
    font-size: 16px;
  }

  .brand-kit-card {
    width: 172px;
    height: 118px;
    background: #ffffff;
  }

  .brand-kit-card img {
    object-fit: contain;
  }

  .video-card span {
    position: absolute;
    right: 8px;
    bottom: 8px;
    border-radius: 999px;
    background: rgba(0,0,0,0.72);
    color: #ffffff;
    padding: 4px 8px;
    font-size: 13px;
  }

  .generate-modal {
    width: min(100%, 1240px);
    padding: 46px 52px 42px;
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
      grid-template-columns: 120px 1fr;
      gap: 24px;
    }

    .topic-image {
      width: 120px;
      height: 92px;
    }

    .reference-modal {
      padding: 36px 24px 46px;
    }

    .generate-modal {
      padding: 36px 24px 42px;
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
      padding: 20px 18px 88px;
    }

    .topic-review-steps {
      justify-content: flex-start;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .topic-loading,
    .topic-review-content {
      margin-top: 48px;
    }

    .topic-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .topic-image {
      width: 160px;
      height: 110px;
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
