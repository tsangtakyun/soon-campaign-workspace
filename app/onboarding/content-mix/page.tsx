'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { CampaignTheme } from '@/lib/campaign-theme'
import type { ContentMixItem, ContentMixRecommendation } from '@/lib/content-mix'
import {
  contentMixCatalog,
  fallbackContentMix,
  getAllowedContentMixTypes,
  getContentMixFrequencyBounds,
} from '@/lib/content-mix'
import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'
import { getPricingPlan } from '@/lib/pricing'

type DistributionPreferences = {
  channels?: string[]
  channelIds?: string[]
  schedule?: string
}

const fallbackMix = fallbackContentMix({})
const defaultVisibleContentTypes = ['still-images', 'carousels']

const contentTypeDescriptions: Record<string, string> = {
  'still-images': '單張圖片貼文',
  carousels: '多頁輪播教學或故事',
  'feed-videos': '較完整的動態影片',
  'short-form-video': 'Instagram Reels、TikTok 或 Shorts 短片',
  stories: '限時動態內容',
  emails: '電子報內容',
}

function ContentMixContent() {
  const searchParams = useSearchParams()
  const selectedPlan = useMemo(() => getPricingPlan(searchParams.get('plan')), [searchParams])
  const [items, setItems] = useState<ContentMixItem[]>(fallbackMix.items)
  const [visibleContentTypes, setVisibleContentTypes] = useState<string[]>(defaultVisibleContentTypes)
  const [weeklyCreditLimit, setWeeklyCreditLimit] = useState(selectedPlan.weeklyPlanningCredits)
  const [reason, setReason] = useState(fallbackMix.reason)
  const [distribution, setDistribution] = useState<DistributionPreferences>({})
  const [distributionSignature, setDistributionSignature] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const visibleContentTypeSet = useMemo(() => new Set(visibleContentTypes), [visibleContentTypes])
  const visibleItems = useMemo(() => {
    return items.filter((item) => visibleContentTypeSet.has(item.id))
  }, [items, visibleContentTypeSet])
  const totalCredits = useMemo(() => {
    return visibleItems.reduce((sum, item) => sum + item.quantity * item.creditsEach, 0)
  }, [visibleItems])

  const activeItems = visibleItems.filter((item) => item.quantity > 0)
  const inactiveItems = visibleItems.filter((item) => item.quantity === 0)
  const totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0)
  const frequency = getContentMixFrequencyBounds(distribution.schedule)
  const platformLabels = getPlatformLabels(distribution)

  useEffect(() => {
    let isActive = true

    async function loadMix() {
      const profile = readSession<ContentStrategyProfile>('soon-business-profile-v1') || {}
      const strategy = readSession<ContentStrategyOption>('soon-content-strategy-v1') || null
      const campaign = readSession<CampaignTheme>('soon-campaign-details-v1') || null
      const distribution = readSession<DistributionPreferences>('soon-distribution-preferences-v1') || {}
      const selectedChannels = [
        ...(distribution.channels || []),
        ...(distribution.channelIds || []),
      ]
      const language = profile.language || searchParams.get('language') || '繁體中文'
      const plan = searchParams.get('plan') || undefined
      const signature = JSON.stringify({
        channels: selectedChannels.map((channel) => channel.toLowerCase()).sort(),
        schedule: distribution.schedule || '',
      })

      setDistribution(distribution)
      setDistributionSignature(signature)
      setVisibleContentTypes(getVisibleContentTypes(selectedChannels, distribution))
      setLoading(true)
      setError('')

      const savedDraft = readSession<{
        items?: ContentMixItem[]
        weeklyCreditLimit?: number
        reason?: string
        distributionSignature?: string
      }>('soon-content-mix-v1')
      if (savedDraft?.distributionSignature === signature && savedDraft.items?.length) {
        setItems(normalizeItems(savedDraft.items))
        setWeeklyCreditLimit(savedDraft.weeklyCreditLimit || selectedPlan.weeklyPlanningCredits)
        setReason(savedDraft.reason || fallbackMix.reason)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/content-mix', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ profile, strategy, campaign, distribution, language, plan }),
        })
        const data = await response.json() as ContentMixRecommendation & { error?: string }
        if (!response.ok) throw new Error(data.error || '暫時未能生成第一週內容組合。')
        if (!isActive) return
        setItems(normalizeItems(data.items))
        setWeeklyCreditLimit(data.weeklyCreditLimit || selectedPlan.weeklyPlanningCredits)
        setReason(data.reason || fallbackMix.reason)
      } catch (error: any) {
        if (!isActive) return
        const fallback = fallbackContentMix({
          distribution: readSession<DistributionPreferences>('soon-distribution-preferences-v1') || {},
          plan,
        })
        setItems(fallback.items)
        setWeeklyCreditLimit(fallback.weeklyCreditLimit)
        setReason(fallback.reason)
        setError(error?.message || '暫時未能生成第一週內容組合。')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadMix()

    return () => {
      isActive = false
    }
  }, [searchParams, selectedPlan.weeklyPlanningCredits])

  useEffect(() => {
    if (loading) return
    const payload = { items, totalCredits, weeklyCreditLimit, reason, plan: selectedPlan, distributionSignature }
    sessionStorage.setItem('soon-content-mix-v1', JSON.stringify(payload))
  }, [distributionSignature, items, loading, reason, selectedPlan, totalCredits, weeklyCreditLimit])

  function updateQuantity(id: string, delta: number) {
    setItems((current) => {
      const currentTotal = current.reduce((sum, item) => sum + item.quantity, 0)
      return current.map((item) => {
        if (item.id !== id) return item
        const nextQuantity = Math.max(0, item.quantity + delta)
        if (delta > 0 && currentTotal >= frequency.max) return item
        return { ...item, quantity: nextQuantity, enabled: nextQuantity > 0 }
      })
    })
  }

  function handleContinue() {
    const payload = {
      items,
      totalCredits,
      weeklyCreditLimit,
      reason,
      plan: selectedPlan,
      distributionSignature,
    }
    sessionStorage.setItem('soon-content-mix-v1', JSON.stringify(payload))

    const url = new URL('/onboarding/visual-style', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('autoAnalyze', '1')
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="mix-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="mix-layout">
        <div className="mix-main">
          <header>
            <h1>你的第一週內容計劃</h1>
            <p>{frequency.label}｜{platformLabels.join(' + ') || '已選平台'}。SOON 已按你的策略和發佈渠道整理，可在下方微調。</p>
          </header>

          {loading ? <p className="notice">AI 正在計算第一週內容組合...</p> : null}
          {error ? <p className="notice">{error} 已先使用預設組合，你可以自行加減。</p> : null}

          <div className="item-grid">
            {activeItems.map((item) => (
              <article className="mix-card" key={item.id}>
                <div className={`preview preview-${item.id}`}>
                  <img
                    src={getContentMixImage(item.id)}
                    alt={`${item.titleZh} / ${item.title}`}
                    onError={(event) => {
                      event.currentTarget.src = `/content-mix/content-mix-${item.id}.png`
                    }}
                  />
                  {['feed-videos', 'short-form-video'].includes(item.id) ? <span className="play">▶</span> : null}
                </div>
                <h2>{item.titleZh}</h2>
                <p>{contentTypeDescriptions[item.id] || item.description}</p>
                <div className="quantity-row">
                  <div className="stepper">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`減少${item.titleZh}`}>−</button>
                    <strong>{item.quantity}</strong>
                    <button type="button" onClick={() => updateQuantity(item.id, 1)} disabled={totalItems >= frequency.max} aria-label={`增加${item.titleZh}`}>＋</button>
                  </div>
                  <em>每週</em>
                </div>
              </article>
            ))}
          </div>

          {inactiveItems.length ? (
            <section className="add-formats">
              <h2>加入其他格式</h2>
              <div>
                {inactiveItems.map((item) => (
                  <button type="button" key={item.id} onClick={() => updateQuantity(item.id, 1)} disabled={totalItems >= frequency.max}>
                    ＋ {item.titleZh}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="summary-card">
          <p className="eyebrow">本週計劃摘要</p>
          <div className="plan-total">
            <strong>{totalItems}</strong>
            <span>篇內容</span>
          </div>
          <hr />
          <div className="summary-list">
            <div><span>發佈平台</span><strong>{platformLabels.join('、') || '稍後設定'}</strong></div>
            <div><span>發佈頻率</span><strong>{frequency.label}</strong></div>
            <div><span>內容格式</span><strong>{activeItems.length} 種</strong></div>
          </div>
          <hr />
          <h2>內容分配</h2>
          <div className="breakdown">
            {activeItems.map((item) => (
              <div key={item.id}>
                <span>{item.titleZh}</span>
                <strong>{item.quantity} 篇</strong>
              </div>
            ))}
          </div>
          <hr />
          <h2>SOON 建議原因</h2>
          <p>{reason}</p>
          {totalItems < frequency.min ? <p className="warning">目前少於建議頻率，請最少加入 {frequency.min} 篇內容。</p> : null}
        </aside>
      </section>

      <footer className="mix-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue} disabled={totalItems < frequency.min}>繼續</button>
      </footer>

      <style jsx>{styles}</style>
    </main>
  )
}

function Steps() {
  return (
    <nav className="steps" aria-label="Onboarding progress">
      {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
        <span className={index === 2 ? 'active' : ''} key={step}>
          {step}
          {index < 4 ? <b>›</b> : null}
        </span>
      ))}
    </nav>
  )
}

function readSession<T>(key: string): T | null {
  try {
    const value = sessionStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

function getVisibleContentTypes(_channels: string[], distribution: DistributionPreferences) {
  return getAllowedContentMixTypes(distribution)
}

function getPlatformLabels(distribution: DistributionPreferences) {
  const ids = [...(distribution.channelIds || []), ...(distribution.channels || [])]
  const labels: string[] = []
  const add = (label: string) => {
    if (!labels.includes(label)) labels.push(label)
  }

  ids.forEach((rawId) => {
    const id = rawId.toLowerCase()
    if (id.includes('instagram')) add('Instagram')
    else if (id.includes('facebook')) add('Facebook')
    else if (id.includes('threads')) add('Threads')
    else if (id.includes('tiktok')) add('TikTok')
    else if (id.includes('youtube')) add('YouTube')
    else if (id.includes('newsletter') || id.includes('email')) add('電子報')
    else if (id.includes('rednote') || id.includes('xiaohongshu') || id.includes('小紅書')) add('小紅書')
    else if (id.includes('wechat')) add('WeChat')
  })
  return labels
}

function normalizeItems(items: ContentMixItem[] | undefined) {
  const byId = new Map((items || []).map((item) => [item.id, item]))
  return contentMixCatalog.map((base) => {
    const item = byId.get(base.id)
    const quantity = Math.max(0, Math.min(12, Math.round(item?.quantity || 0)))
    return {
      ...base,
      quantity,
      enabled: quantity > 0,
    }
  })
}

function getContentMixImage(id: string) {
  if (id === 'carousels') {
    return 'https://auth.sooncreator.network/storage/v1/object/public/public-assets/content-strategies/content-mix-carousels.png'
  }

  return `https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/content-strategies/content-mix-${id}.png`
}

const styles = `
  .mix-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #17181c;
    position: relative;
    padding: 18px 22px 86px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto 28px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9a9a9a;
    font-size: 0.78rem;
    font-weight: 500;
  }

  .steps span {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }

  .steps .active {
    color: #1b1c1f;
  }

  .steps b {
    color: #b4b4b4;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .more-button {
    position: absolute;
    top: 18px;
    right: 30px;
    border: 0;
    background: transparent;
    color: #1b1c1f;
    font-size: 0.92rem;
    cursor: pointer;
  }

  .mix-layout {
    width: min(100%, 1120px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 28px;
    align-items: start;
  }

  header {
    margin-bottom: 26px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: clamp(1.8rem, 3.1vw, 2.55rem);
    line-height: 1.05;
    letter-spacing: 0;
    font-weight: 520;
  }

  header p,
  .notice {
    margin: 0;
    color: #666970;
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .notice {
    margin-bottom: 16px;
    border-radius: 8px;
    background: #fff8d8;
    color: #5c4b10;
    padding: 10px 12px;
  }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .mix-card {
    min-height: 248px;
    border: 1px solid #ececef;
    border-radius: 14px;
    background: #ffffff;
    padding: 14px;
    display: grid;
    align-content: start;
    gap: 4px;
  }

  .preview {
    height: 180px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #f0f0f0;
    display: grid;
    place-items: center;
    position: relative;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .preview-short-form-video img,
  .preview-stories img {
    object-fit: contain;
    padding: 8px;
    background: #ffffff;
  }

  .play {
    position: absolute;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(0,0,0,0.68);
    color: #ffffff;
    font-size: 0.86rem;
  }

  .mix-card h2 {
    margin: 0;
    font-size: 0.96rem;
    line-height: 1.2;
    font-weight: 650;
  }

  .mix-card p {
    margin: 0;
    color: #676a70;
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .quantity-row {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .quantity-row em {
    color: #999;
    font-style: normal;
    font-size: 0.82rem;
  }

  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #e3e3e5;
    border-radius: 999px;
    padding: 3px;
  }

  .stepper button {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 50%;
    background: #f1f1f2;
    color: #1b1c1f;
    font: inherit;
    font-size: 1.05rem;
    cursor: pointer;
  }

  .stepper button:disabled,
  .add-formats button:disabled,
  .mix-footer button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .stepper strong {
    min-width: 18px;
    text-align: center;
    font-size: 1rem;
  }

  .add-formats {
    margin-top: 20px;
    border-top: 1px solid #ececef;
    padding-top: 16px;
  }

  .add-formats h2 {
    margin: 0 0 10px;
    font-size: 0.92rem;
  }

  .add-formats div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .add-formats button {
    min-height: 36px;
    border: 1px solid #dedee1;
    border-radius: 999px;
    background: #fff;
    color: #2b2d31;
    padding: 0 14px;
    font: inherit;
    font-size: 0.84rem;
    cursor: pointer;
  }

  .summary-card {
    border: 1px solid #ececef;
    border-radius: 16px;
    padding: 26px 24px;
    display: grid;
    gap: 14px;
    position: sticky;
    top: 18px;
  }

  .summary-card p,
  .summary-card small {
    margin: 0;
    color: #565a61;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .summary-card .eyebrow {
    color: #25272b;
    font-weight: 650;
  }

  .plan-total {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .plan-total strong {
    font-size: 3.1rem;
    line-height: 1;
    font-weight: 420;
  }

  .plan-total span {
    font-size: 0.92rem;
  }

  .summary-card hr {
    width: 100%;
    border: 0;
    border-top: 1px solid #ededed;
    margin: 2px 0;
  }

  .summary-card h2 {
    margin: 0;
    font-size: 0.94rem;
    font-weight: 560;
  }

  .breakdown {
    display: grid;
    gap: 9px;
  }

  .breakdown div {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: baseline;
    font-size: 0.86rem;
  }

  .summary-list {
    display: grid;
    gap: 12px;
  }

  .summary-list div {
    display: grid;
    gap: 3px;
  }

  .summary-list span {
    color: #8b8e94;
    font-size: 0.78rem;
  }

  .summary-list strong,
  .breakdown strong {
    color: #25272b;
    font-size: 0.9rem;
    font-weight: 570;
  }

  .summary-card .warning {
    color: #a33a2d;
    background: #fff3f0;
    border-radius: 8px;
    padding: 9px 10px;
  }

  .mix-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 56px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 22px;
    z-index: 20;
  }

  .mix-footer button {
    min-height: 34px;
    border-radius: 7px;
    border: 0;
    background: transparent;
    color: #191919;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0 14px;
  }

  .mix-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  @media (max-width: 980px) {
    .mix-layout {
      grid-template-columns: 1fr;
    }

    .item-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .mix-page {
      padding: 18px 14px 86px;
    }

    .steps {
      width: 100%;
      overflow-x: auto;
      justify-content: flex-start;
    }

    .item-grid {
      grid-template-columns: 1fr;
    }
  }
`

export default function ContentMixPage() {
  return (
    <Suspense fallback={null}>
      <ContentMixContent />
    </Suspense>
  )
}
