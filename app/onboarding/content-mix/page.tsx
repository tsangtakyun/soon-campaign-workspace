'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { CampaignTheme } from '@/lib/campaign-theme'
import type { ContentMixItem, ContentMixRecommendation } from '@/lib/content-mix'
import { contentMixCatalog, fallbackContentMix } from '@/lib/content-mix'
import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'
import { getPricingPlan } from '@/lib/pricing'

type DistributionPreferences = {
  channels?: string[]
  channelIds?: string[]
  schedule?: string
}

const fallbackMix = fallbackContentMix({})
const defaultVisibleContentTypes = ['still-images', 'carousels', 'feed-videos', 'stories', 'short-form-video', 'emails']

function ContentMixContent() {
  const searchParams = useSearchParams()
  const selectedPlan = useMemo(() => getPricingPlan(searchParams.get('plan')), [searchParams])
  const [items, setItems] = useState<ContentMixItem[]>(fallbackMix.items)
  const [visibleContentTypes, setVisibleContentTypes] = useState<string[]>(defaultVisibleContentTypes)
  const [weeklyCreditLimit, setWeeklyCreditLimit] = useState(selectedPlan.weeklyPlanningCredits)
  const [reason, setReason] = useState(fallbackMix.reason)
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

      setVisibleContentTypes(getVisibleContentTypes(selectedChannels))
      setLoading(true)
      setError('')

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

  function handleContinue() {
    const payload = {
      items,
      totalCredits,
      weeklyCreditLimit,
      reason,
      plan: selectedPlan,
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
            <h1>這是我們建議你第一週製作的內容組合</h1>
            <p>根據你的策略和渠道，這是一個適合第一週開始測試的組合。你可以隨時加減。</p>
          </header>

          {loading ? <p className="notice">AI 正在計算第一週內容組合...</p> : null}
          {error ? <p className="notice">{error} 已先使用預設組合，你可以自行加減。</p> : null}

          <div className="item-grid">
            {visibleItems.map((item) => (
              <article className={`mix-card ${item.quantity === 0 ? 'muted' : ''}`} key={item.id}>
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
                <h2>{item.titleZh} / {item.title}</h2>
                <p>{item.description}</p>
                <small>✦ {item.creditsEach} credits each</small>
                <div className="quantity-row">
                  <span>{item.quantity}</span>
                  <em>/ week</em>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="credits-card">
          <p>本週建議使用</p>
          <div className="credit-total">
            <strong>{totalCredits}</strong>
            <span>credits / week</span>
          </div>
          <p>Credits 是 SOON 用來規劃內容成本的單位。每種內容格式所需 credit 不同。</p>
          <hr />
          <h2>Credit 拆解</h2>
          <div className="breakdown">
            {activeItems.map((item) => (
              <div key={item.id}>
                <span>{item.titleZh} / {item.title}</span>
                <em>{item.quantity} x {item.creditsEach} credits</em>
                <strong>{item.quantity * item.creditsEach}</strong>
              </div>
            ))}
          </div>
          <div className="total-line">
            <span>每週合計：</span>
            <strong>{totalCredits}</strong>
          </div>
          <hr />
          <p className={totalCredits > weeklyCreditLimit ? 'over-limit' : ''}>
            目前方案：{selectedPlan.name}<br />
            本頁以每週 {weeklyCreditLimit} credits 作為規劃上限。
          </p>
          <p>
            {selectedPlan.trialDays
              ? `${selectedPlan.trialDays} 日試用包含 ${selectedPlan.trialCredits} credits；正式方案每月 ${selectedPlan.monthlyCredits} credits。`
              : `每月 ${selectedPlan.monthlyCredits} credits 起，實際額度會按代營運範圍調整。`}
          </p>
          <small>{reason}</small>
        </aside>
      </section>

      <footer className="mix-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>Continue</button>
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

function getVisibleContentTypes(channels: string[]) {
  const visible = new Set<string>()
  const ch = channels.map((channel) => channel.toLowerCase())

  if (ch.some((channel) => (
    ['instagram', 'facebook', 'threads', 'xiaohongshu', 'wechat'].includes(channel)
    || channel.includes('instagram-feed')
    || channel.includes('facebook-feed')
    || channel.includes('threads-feed')
    || channel.includes('rednote')
    || channel.includes('小紅書')
    || channel.includes('wechat-feed')
  ))) {
    visible.add('still-images')
    visible.add('carousels')
    visible.add('feed-videos')
  }

  if (ch.some((channel) => (
    channel.includes('stories')
    || channel.includes('instagram-stories')
    || channel.includes('facebook-stories')
  ))) {
    visible.add('stories')
  }

  if (ch.some((channel) => (
    ['reels', 'tiktok', 'youtube', 'instagram-reels', 'short-form-video'].includes(channel)
    || channel.includes('youtube-shorts')
  ))) {
    visible.add('short-form-video')
  }

  if (ch.some((channel) => ['newsletter', 'email', 'emails'].includes(channel))) {
    visible.add('emails')
  }

  if (visible.size === 0) return defaultVisibleContentTypes

  return Array.from(visible)
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

  .mix-card.muted {
    color: #9b9da2;
    background: #fdfdfd;
  }

  .preview {
    height: 124px;
    border-radius: 10px;
    background: #f2f2f3;
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
    background: #f3f3f3;
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

  .mix-card small {
    color: #9b9da2;
    font-size: 0.78rem;
    margin-top: 4px;
  }

  .quantity-row {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .quantity-row span {
    font-size: 1.18rem;
    font-weight: 620;
  }

  .quantity-row em {
    color: #999;
    font-style: normal;
    font-size: 0.82rem;
  }

  .credits-card {
    border: 1px solid #ececef;
    border-radius: 16px;
    padding: 26px 24px;
    display: grid;
    gap: 14px;
  }

  .credits-card p,
  .credits-card small {
    margin: 0;
    color: #565a61;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .credits-card .over-limit {
    color: #b63a2c;
  }

  .credit-total {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .credit-total strong {
    font-size: 3.1rem;
    line-height: 1;
    font-weight: 420;
  }

  .credit-total span {
    font-size: 0.92rem;
  }

  .credits-card hr {
    width: 100%;
    border: 0;
    border-top: 1px solid #ededed;
    margin: 2px 0;
  }

  .credits-card h2 {
    margin: 0;
    font-size: 0.94rem;
    font-weight: 560;
  }

  .breakdown {
    display: grid;
    gap: 9px;
  }

  .breakdown div,
  .total-line {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: baseline;
    font-size: 0.86rem;
  }

  .breakdown em,
  .total-line span {
    color: #999;
    font-style: normal;
  }

  .breakdown strong,
  .total-line strong {
    font-weight: 500;
  }

  .total-line {
    grid-template-columns: 1fr auto;
    padding-top: 4px;
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
