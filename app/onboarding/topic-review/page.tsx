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

type BusinessProfileState = {
  brandName?: string
  logoUrl?: string
}

type PhotoControlState = {
  previewImage?: string
  generatedPreviewImage?: string | null
}

type TopicReference = {
  id: string
  label: string
  type: 'image' | 'post'
  topic: string
  image: string
}

const STORAGE_KEYS = {
  businessProfile: 'soon-business-profile-v1',
  contentMix: 'soon-content-mix-v1',
  photoControl: 'soon-photo-control-v2',
}

const FALLBACK_TOPICS: TopicReference[] = [
  {
    id: 'still-image-1',
    label: 'Still Image 1',
    type: 'image',
    topic: 'A shared day feels bigger when your friends can watch the little moments with you',
    image: '/soon-log-logo.png',
  },
  {
    id: 'blog-post-1',
    label: 'Blog Post 1',
    type: 'post',
    topic: 'The best daily stories are the ones that feel playful, messy, and real enough to send twice',
    image: '/soon-log-logo.png',
  },
]

const TOPIC_COPY: Record<string, string[]> = {
  'still-images': [
    'A shared day feels bigger when your friends can watch the little moments with you',
    'The smallest visual detail can make an ordinary day feel worth sharing',
  ],
  blogs: [
    'The best daily stories are the ones that feel playful, messy, and real enough to send twice',
    'A useful story becomes more memorable when it sounds like something a friend would send',
  ],
  carousels: [
    'A quick sequence can turn one small moment into a story people understand immediately',
  ],
  'feed-videos': [
    'A short scene can make the brand feel present in the everyday rhythm of the audience',
  ],
  'short-form-video': [
    'A tiny moment with movement can become the reason someone stops scrolling',
  ],
  stories: [
    'The content should feel immediate, casual, and easy to react to in the moment',
  ],
  emails: [
    'A direct note works best when it feels personal enough to keep reading',
  ],
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; type: TopicReference['type'] }> = {
  'still-images': { label: 'Still Image', type: 'image' },
  blogs: { label: 'Blog Post', type: 'post' },
  carousels: { label: 'Carousel', type: 'image' },
  'feed-videos': { label: 'Feed Video', type: 'post' },
  'short-form-video': { label: 'Short Form Video', type: 'post' },
  stories: { label: 'Story', type: 'image' },
  emails: { label: 'Email', type: 'post' },
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

function getReferenceImage() {
  const businessProfile = readStorage<BusinessProfileState>(STORAGE_KEYS.businessProfile)
  const photoControl = readStorage<PhotoControlState>(STORAGE_KEYS.photoControl)

  return (
    businessProfile?.logoUrl ||
    photoControl?.generatedPreviewImage ||
    photoControl?.previewImage ||
    '/soon-log-logo.png'
  )
}

function buildTopics(referenceImage: string): TopicReference[] {
  const contentMix = readStorage<ContentMixState>(STORAGE_KEYS.contentMix)
  const items = contentMix?.items?.filter((item) => item.quantity > 0) || []
  const topics: TopicReference[] = []

  items.forEach((item) => {
    const typeConfig = CONTENT_TYPE_LABELS[item.id] || {
      label: item.title || item.titleZh || 'Content',
      type: 'post' as const,
    }
    const copyOptions = TOPIC_COPY[item.id] || [
      `A clear ${typeConfig.label.toLowerCase()} should make the brand feel easy to understand and easy to share`,
    ]

    for (let index = 0; index < item.quantity; index += 1) {
      const sequence = index + 1
      topics.push({
        id: `${item.id}-${sequence}`,
        label: `${typeConfig.label} ${sequence}`,
        type: typeConfig.type,
        topic: copyOptions[index % copyOptions.length],
        image: referenceImage,
      })
    }
  })

  if (topics.length) return topics.slice(0, 8)
  return FALLBACK_TOPICS.map((topic) => ({ ...topic, image: referenceImage }))
}

function TopicReviewContent() {
  const searchParams = useSearchParams()
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const referenceImage = useMemo(() => getReferenceImage(), [])
  const topics = useMemo(() => buildTopics(referenceImage), [referenceImage])

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
      <div className="topic-review-steps" aria-label="Onboarding progress">
        {['Getting started', 'Strategy', 'Campaign', 'Content', 'Finishing up'].map((step, index) => (
          <span className={index === 2 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      {isAnalyzing ? (
        <section className="topic-loading" aria-live="polite">
          <p>In progress...</p>
          <h1>{topics.length > 1 ? 'Generating your topics...' : 'Crafting each topic...'}</h1>
          <h2>
            Every post starts with two things: a topic that sets the direction, and a reference image that keeps it looking like you. Here's how it comes together:
          </h2>

          <div className="loading-demo">
            <div className="loading-topic">
              <span>Topic inside your campaign:</span>
              <div className="demo-topic-card">
                <div className="demo-image">
                  <img src={referenceImage} alt="Reference image" />
                  <em>Reference image</em>
                </div>
                <p>{topics[0]?.topic || FALLBACK_TOPICS[0].topic}</p>
              </div>
            </div>
            <div className="demo-arrow">→</div>
            <div className="generated-post">
              <span>Generated post:</span>
              <div className="mock-post">
                <img src={referenceImage} alt="Generated post preview" />
                <strong>unlock<br />your<br />creative<br />potential</strong>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="topic-review-content">
          <header>
            <h1>Review your topics and their reference images.</h1>
            <p>You can think of these as what directs the main subject and target of the content Blaze generates.</p>
          </header>

          <div className="topic-list">
            {topics.map((topic) => (
              <article className="topic-row" key={topic.id}>
                <div className="topic-image">
                  <img src={topic.image} alt={`${topic.label} reference`} />
                </div>
                <div className="topic-copy">
                  <h2>
                    <span className={topic.type === 'image' ? 'topic-icon image' : 'topic-icon post'} aria-hidden="true">
                      {topic.type === 'image' ? '▧' : '▤'}
                    </span>
                    {topic.label}
                  </h2>
                  <p className="topic-label">Topic:</p>
                  <p className="topic-text">{topic.topic}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="topic-review-footer">
        <button type="button" onClick={handleBack}>Back</button>
        {!isAnalyzing ? <button type="button" onClick={handleContinue}>Continue</button> : null}
      </footer>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
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
