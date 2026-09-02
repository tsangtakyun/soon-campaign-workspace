'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { CampaignTheme } from '@/lib/campaign-theme'
import type { ContentStrategyOption, ContentStrategyProfile } from '@/lib/content-strategy'

const emptyCampaign: CampaignTheme = {
  campaignName: '',
  theme: '',
  primaryGoal: '建立信任',
  contentFocus: '',
  contentFormats: '',
  audienceAction: '',
  callToAction: '',
  targetLink: '',
}

const campaignGoals = ['建立信任', '增加查詢', '推動預約']

const loadingMessages = [
  '正在建立第一個內容系列',
  '正在整理系列名稱',
  '正在拆解內容重點',
  '正在準備行動提示與連結',
]

function CampaignDetailsContent() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<ContentStrategyProfile>({})
  const [strategy, setStrategy] = useState<ContentStrategyOption | null>(null)
  const [campaign, setCampaign] = useState<CampaignTheme>(emptyCampaign)
  const [loading, setLoading] = useState(true)
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [error, setError] = useState('')

  const strategyName = strategy?.titleZh || strategy?.title || searchParams.get('strategy') || '內容策略'
  const strategyDescription = strategy?.description || '內容策略會決定之後每一段內容的主題、角度與行動方向。'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingMessages.length)
    }, 1150)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadCampaign() {
      const storedProfile = readSession<ContentStrategyProfile>('soon-business-profile-v1') || {}
      const storedStrategy = readSession<ContentStrategyOption>('soon-content-strategy-v1')
      const language = storedProfile.language || searchParams.get('language') || '繁體中文'
      const website = storedProfile.websiteUrl || searchParams.get('website') || ''
      const localStrategyName = storedStrategy?.titleZh || storedStrategy?.title || searchParams.get('strategy') || '內容策略'
      const localStrategyDescription = storedStrategy?.description || '內容策略會決定之後每一段內容的主題、角度與行動方向。'
      const mergedProfile: ContentStrategyProfile = {
        ...storedProfile,
        websiteUrl: website,
        language,
        businessName: storedProfile.businessName || searchParams.get('brandName') || searchParams.get('name') || '',
      }

      if (!isActive) return
      setProfile(mergedProfile)
      setStrategy(storedStrategy)
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/campaign-theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            profile: mergedProfile,
            strategy: storedStrategy || {
              title: searchParams.get('strategy') || 'Lifestyle Content',
              titleZh: searchParams.get('strategy') || '生活方式內容',
              description: localStrategyDescription,
            },
            language,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || '暫時未能生成 Campaign 方向。')
        if (!isActive) return
        setCampaign({
          campaignName: data.campaignName || '',
          theme: data.theme || '',
          primaryGoal: data.primaryGoal || '建立信任',
          contentFocus: data.contentFocus || data.theme || '',
          contentFormats: data.contentFormats || '專業短片、圖文拆解、常見問題問答',
          audienceAction: data.audienceAction || '',
          callToAction: data.callToAction || '',
          targetLink: data.targetLink || website,
        })
      } catch (error: any) {
        if (!isActive) return
        setError(error?.message || '暫時未能生成 Campaign 方向。')
        setCampaign({
          campaignName: `${mergedProfile.businessName || '你的品牌'}｜${localStrategyName}`,
          theme: `${mergedProfile.businessName || '你的品牌'} 可以用「${localStrategyName}」作為第一個 Campaign 方向，將品牌定位、受眾痛點與實際使用情境連接起來，讓之後的內容更集中和更容易轉化。`,
          primaryGoal: '建立信任',
          contentFocus: `圍繞受眾最常遇到的問題，以「${localStrategyName}」提供實用解答。`,
          contentFormats: '專業短片、圖文拆解、常見問題問答',
          audienceAction: '令受眾理解品牌的專業價值，並願意進一步了解或查詢。',
          callToAction: '立即了解更多或聯絡團隊查詢。',
          targetLink: website,
        })
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadCampaign()

    return () => {
      isActive = false
    }
  }, [searchParams])

  const campaignPreview = useMemo(() => {
    return campaign.campaignName || '正在建立系列名稱'
  }, [campaign.campaignName])

  function updateCampaign<K extends keyof CampaignTheme>(key: K, value: CampaignTheme[K]) {
    setCampaign((current) => ({ ...current, [key]: value }))
  }

  function handleContinue() {
    const payload = {
      ...campaign,
      theme: buildStructuredTheme(campaign),
      selectedStrategy: strategy,
      profile,
    }
    sessionStorage.setItem('soon-campaign-details-v1', JSON.stringify(payload))

    const url = new URL('/onboarding/distribution', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    if (strategy?.title) url.searchParams.set('strategy', strategy.title)
    if (campaign.campaignName) url.searchParams.set('campaign', campaign.campaignName)
    url.searchParams.set('autoAnalyze', '1')
    window.location.href = `${url.pathname}${url.search}`
  }

  const targetLinkWarning = shouldWarnAboutTargetLink(campaign.callToAction, campaign.targetLink)

  if (loading) {
    return (
      <main className="campaign-page loading-page">
        <Steps />
        <button className="more-button" type="button" aria-label="More options">...</button>

        <section className="loading-shell">
          <p>進行中...</p>
          <h1>{loadingMessages[loadingIndex]}</h1>
          <span>每個內容系列會決定下一輪內容的主題、目標與行動方向。</span>

          <div className="loading-preview">
            <article className="strategy-mini">
              <small>已選內容方向</small>
              <strong>{strategy?.emoji} {strategyName}</strong>
              <span>{strategyDescription}</span>
            </article>
            <b className="arrow">→</b>
            <article className="campaign-mini">
              <small>第一個內容系列</small>
              <strong>{campaignPreview}</strong>
              <span className="typing" />
            </article>
          </div>
        </section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  return (
    <main className="campaign-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="form-shell">
        <header>
          <span className="eyebrow">第一個內容系列</span>
          <h1>設定第一個內容系列</h1>
          <p>SOON 已將你選擇的內容方向整理成可直接開始製作的系列，你可以逐項修改。</p>
        </header>

        {error ? <p className="notice">{error} 已先使用預設方向，你仍然可以修改後繼續。</p> : null}

        <div className="divider" />

        <aside className="strategy-summary">
          <small>你剛才選擇的方向</small>
          <strong>{strategy?.emoji} {strategyName}</strong>
          <span>{strategyDescription}</span>
        </aside>

        <label className="field">
          <span>系列名稱</span>
          <input value={campaign.campaignName} onChange={(event) => updateCampaign('campaignName', event.target.value)} />
        </label>

        <fieldset className="goal-field">
          <legend>主要目標</legend>
          <div className="goal-options">
            {campaignGoals.map((goal) => (
              <button
                className={campaign.primaryGoal === goal ? 'selected' : ''}
                key={goal}
                onClick={() => updateCampaign('primaryGoal', goal)}
                type="button"
              >
                {goal}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="direction-card">
          <h2>這個系列會點樣做</h2>
          <label className="field compact">
            <span>內容重點</span>
            <textarea value={campaign.contentFocus} onChange={(event) => updateCampaign('contentFocus', event.target.value)} />
          </label>
          <label className="field compact">
            <span>表達形式</span>
            <input value={campaign.contentFormats} onChange={(event) => updateCampaign('contentFormats', event.target.value)} />
          </label>
          <label className="field compact">
            <span>希望觀眾之後點做</span>
            <textarea value={campaign.audienceAction} onChange={(event) => updateCampaign('audienceAction', event.target.value)} />
          </label>
        </section>

        <label className="field">
          <span>行動提示 <em>（選填）</em></span>
          <input value={campaign.callToAction} onChange={(event) => updateCampaign('callToAction', event.target.value)} />
          <small>SOON 不會自行加入未經確認的免費服務、折扣或成效保證。</small>
        </label>

        <label className="field">
          <span>行動連結 <em>（選填）</em></span>
          <input value={campaign.targetLink} onChange={(event) => updateCampaign('targetLink', event.target.value)} />
          <small>如希望觀眾預約或查詢，建議使用直接預約、WhatsApp 或聯絡頁。</small>
          {targetLinkWarning ? <b className="field-warning">目前似乎係網站首頁，請確認係咪有更直接嘅預約或聯絡連結。</b> : null}
        </label>
      </section>

      <footer className="campaign-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>確認並繼續</button>
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

function buildStructuredTheme(campaign: CampaignTheme) {
  const parts = [
    campaign.contentFocus,
    campaign.contentFormats ? `內容會以${campaign.contentFormats}呈現。` : '',
    campaign.audienceAction,
  ].filter(Boolean)
  return parts.join(' ')
}

function shouldWarnAboutTargetLink(callToAction: string, targetLink: string) {
  if (!/(預約|查詢|聯絡|WhatsApp)/i.test(callToAction) || !targetLink) return false
  try {
    const url = new URL(targetLink)
    return url.pathname === '/' || url.pathname === ''
  } catch {
    return false
  }
}

const styles = `
  .campaign-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #161719;
    position: relative;
    padding: 28px 24px 108px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto 46px;
    display: flex;
    align-items: center;
    gap: 16px;
    color: #9a9a9a;
    font-size: 0.92rem;
    font-weight: 650;
  }

  .steps span {
    display: inline-flex;
    align-items: center;
    gap: 16px;
    white-space: nowrap;
  }

  .steps .active {
    color: #1b1c1f;
  }

  .steps b {
    color: #b4b4b4;
    font-size: 1.05rem;
    font-weight: 500;
  }

  .more-button {
    position: absolute;
    top: 28px;
    right: 36px;
    border: 0;
    background: transparent;
    color: #1b1c1f;
    font-size: 1.05rem;
    cursor: pointer;
  }

  .form-shell {
    width: min(100%, 660px);
    margin: 0 auto;
  }

  header {
    margin-bottom: 26px;
  }

  .eyebrow {
    display: inline-flex;
    margin-bottom: 12px;
    border-radius: 999px;
    background: #f1f8f2;
    color: #287540;
    padding: 7px 12px;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  h1 {
    margin: 0 0 10px;
    font-size: clamp(2rem, 4vw, 2.7rem);
    line-height: 1.08;
    letter-spacing: 0;
    font-weight: 700;
  }

  header p,
  .loading-shell span {
    margin: 0;
    color: #62666d;
    font-size: 1rem;
    line-height: 1.55;
  }

  .divider {
    height: 1px;
    background: #ececec;
    margin: 28px 0;
  }

  .notice {
    margin: 0 0 18px;
    border-radius: 8px;
    background: #fff7d8;
    color: #5a4500;
    padding: 12px 14px;
    font-weight: 650;
  }

  .strategy-summary {
    display: grid;
    gap: 7px;
    margin: 0 0 28px;
    border: 1px solid #e5e8e6;
    border-radius: 12px;
    background: #f8faf8;
    padding: 18px 20px;
  }

  .strategy-summary small {
    color: #6f7771;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .strategy-summary strong {
    font-size: 1.05rem;
  }

  .strategy-summary span {
    color: #626a64;
    line-height: 1.55;
  }

  .field {
    display: grid;
    gap: 10px;
    margin-bottom: 24px;
    font-weight: 700;
    color: #1e1f23;
  }

  .field.compact {
    margin-bottom: 18px;
  }

  .field.compact:last-child {
    margin-bottom: 0;
  }

  .field small {
    color: #757982;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.5;
  }

  .goal-field {
    margin: 0 0 28px;
    border: 0;
    padding: 0;
  }

  .goal-field legend {
    margin-bottom: 10px;
    color: #1e1f23;
    font-weight: 700;
  }

  .goal-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .goal-options button {
    min-height: 48px;
    border: 1px solid #dedfe3;
    border-radius: 10px;
    background: #ffffff;
    color: #25272d;
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }

  .goal-options button.selected {
    border-color: #202124;
    background: #202124;
    color: #ffffff;
  }

  .direction-card {
    margin: 0 0 28px;
    border: 1px solid #e2e4e7;
    border-radius: 14px;
    background: #fafafa;
    padding: 22px;
  }

  .direction-card h2 {
    margin: 0 0 20px;
    color: #17181b;
    font-size: 1.05rem;
  }

  .direction-card textarea {
    min-height: 108px;
  }

  .field-warning {
    border-radius: 8px;
    background: #fff5dc;
    color: #795300;
    padding: 10px 12px;
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .field em {
    color: #9b9b9b;
    font-style: normal;
    font-weight: 600;
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #e2e3e6;
    background: #ffffff;
    color: #25272d;
    border-radius: 10px;
    padding: 16px;
    font: inherit;
    font-size: 1rem;
    line-height: 1.45;
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  textarea {
    min-height: 150px;
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    border-color: #191919;
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
  }

  .campaign-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 74px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    z-index: 20;
  }

  .campaign-footer button {
    min-height: 44px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: #191919;
    font: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0 18px;
  }

  .campaign-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  .loading-page {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .loading-shell {
    width: min(100%, 760px);
    margin: 0 auto;
    min-height: calc(100vh - 250px);
    display: grid;
    align-content: center;
    justify-items: center;
    text-align: center;
  }

  .loading-shell > p {
    margin: 0 0 18px;
    color: #9a9a9a;
    font-weight: 700;
  }

  .loading-shell h1 {
    margin-bottom: 12px;
  }

  .loading-preview {
    width: 100%;
    margin-top: 44px;
    padding-top: 34px;
    border-top: 1px solid #ececec;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 26px;
    align-items: center;
    text-align: left;
  }

  .strategy-mini,
  .campaign-mini {
    min-height: 112px;
    border: 1px solid #e3e4e8;
    border-radius: 10px;
    background: #ffffff;
    padding: 18px;
    display: grid;
    gap: 8px;
  }

  .strategy-mini strong,
  .campaign-mini strong {
    font-size: 1rem;
  }

  .strategy-mini small,
  .campaign-mini small {
    color: #8d8f95;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
  }

  .strategy-mini span,
  .campaign-mini span {
    color: #656871;
    font-size: 0.95rem;
  }

  .campaign-mini {
    background: #fbfbfb;
  }

  .typing {
    width: 82%;
    height: 48px;
    border-radius: 8px;
    background: linear-gradient(90deg, #ececec, #f8f8f8, #ececec);
    background-size: 180% 100%;
    animation: shimmer 1.25s ease-in-out infinite;
  }

  .arrow {
    font-size: 2.4rem;
    font-weight: 400;
  }

  @keyframes shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }

  @media (max-width: 760px) {
    .campaign-page {
      padding: 22px 16px 110px;
    }

    .steps {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 34px;
      justify-content: flex-start;
    }

    .loading-preview {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .arrow {
      display: none;
    }

    .goal-options {
      grid-template-columns: 1fr;
    }

    .direction-card {
      padding: 18px;
    }

    .campaign-footer {
      padding: 12px 14px;
    }
  }
`

export default function CampaignDetailsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignDetailsContent />
    </Suspense>
  )
}
