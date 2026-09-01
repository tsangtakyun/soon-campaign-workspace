'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'

import { defaultContentStrategyLibrary } from '@/lib/content-strategy-library'

type StrategyOption = {
  id: string
  emoji: string
  title: string
  titleZh?: string
  description: string
  reason?: string
  funnelStage?: string
  imageUrl?: string
  directionTitle?: string
  examples?: string[]
}

type StrategyResponse = {
  recommended: StrategyOption
  alternatives: StrategyOption[]
}

const fallbackStrategy: StrategyResponse = {
  recommended: mapLibraryItem(defaultContentStrategyLibrary[0]),
  alternatives: defaultContentStrategyLibrary.slice(1, 4).map(mapLibraryItem),
}

function mapLibraryItem(item: (typeof defaultContentStrategyLibrary)[number]): StrategyOption {
  return {
    id: item.id,
    emoji: item.emoji,
    title: item.name,
    titleZh: item.nameZh,
    description: item.description,
    reason: item.purpose,
    funnelStage: item.funnelStage,
    imageUrl: item.imageUrl,
    directionTitle: item.nameZh,
    examples: item.examples,
  }
}

function ContentStrategyContent() {
  const searchParams = useSearchParams()
  const [strategy, setStrategy] = useState<StrategyResponse>(fallbackStrategy)
  const [selectedId, setSelectedId] = useState(fallbackStrategy.recommended.id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const allStrategies = useMemo(() => [strategy.recommended, ...strategy.alternatives], [strategy])
  const selected = allStrategies.find((item) => item.id === selectedId) || strategy.recommended

  useEffect(() => {
    let isActive = true

    async function loadStrategy() {
      setLoading(true)
      setError('')

      const stored = sessionStorage.getItem('soon-business-profile-v1')
      const profile = stored ? JSON.parse(stored) : {}
      profile.budget = profile.budget || searchParams.get('budget') || ''
      const language = profile.language || searchParams.get('language') || '繁體中文'

      try {
        const response = await fetch('/api/content-strategy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ profile, language }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || '暫時未能建立內容策略。')
        if (!isActive) return
        setStrategy({
          recommended: data.recommended || fallbackStrategy.recommended,
          alternatives: Array.isArray(data.alternatives) && data.alternatives.length ? data.alternatives.slice(0, 3) : fallbackStrategy.alternatives,
        })
        setSelectedId((data.recommended || fallbackStrategy.recommended).id)
      } catch (error: any) {
        if (!isActive) return
        setError(error?.message || '暫時未能建立內容策略。')
        setStrategy(fallbackStrategy)
        setSelectedId(fallbackStrategy.recommended.id)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadStrategy()

    return () => {
      isActive = false
    }
  }, [searchParams])

  function handleContinue() {
    sessionStorage.setItem('soon-content-strategy-v1', JSON.stringify(selected))

    const url = new URL('/onboarding/campaign-details', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('strategy', selected.title)
    window.location.href = `${url.pathname}${url.search}`
  }

  if (loading) {
    return (
      <main className="strategy-page">
        <Steps />
        <section className="loading-state">
          <p>進行中...</p>
          <h1>正在建立內容策略</h1>
          <span>SOON 正在根據你的品牌定位、受眾和網站內容，挑選最適合的第一個內容方向。</span>
        </section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  return (
    <main className="strategy-page">
      <Steps />
      <section className="strategy-shell">
        <header>
          <h1>選擇第一個內容方向</h1>
          <p>SOON 已從 16 種內容策略中，揀出最適合你品牌的 {allStrategies.length} 個方向。</p>
        </header>

        {error ? <p className="notice">{error} 已先使用預設策略，你仍然可以繼續。</p> : null}

        <div className="strategy-list">
          {allStrategies.map((item) => {
            const isSelected = selectedId === item.id
            const isRecommended = strategy.recommended.id === item.id
            const imageUrl = item.imageUrl || fallbackStrategy.recommended.imageUrl || ''

            return (
              <button
                className={`strategy-card ${isSelected ? 'expanded' : 'compact'}`}
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{ '--strategy-image': `url("${imageUrl}")` } as CSSProperties}
              >
                {isSelected ? (
                  <>
                    <span className="image-wash" aria-hidden="true" />
                    {isRecommended ? <span className="badge">最適合你</span> : null}
                    <span className="check">✓</span>
                    <span className="expanded-copy">
                      <strong>
                        <span>{item.emoji} {item.directionTitle || item.titleZh || item.title}</span>
                        <em>{item.titleZh || item.title} · {funnelStageLabel(item.funnelStage)}</em>
                      </strong>
                      <p>{item.description}</p>
                    </span>
                    <span className="example-list">
                      {(item.examples || []).slice(0, 3).map((example) => <i key={example}>{example}</i>)}
                    </span>
                    <small><b>為甚麼適合你：</b>{item.reason || item.description}</small>
                  </>
                ) : (
                  <>
                    <span className="thumb">
                      <img src={imageUrl} alt="" />
                    </span>
                    <span className="compact-copy">
                      <strong>
                        <span>{item.emoji} {item.directionTitle || item.titleZh || item.title}</span>
                        <em>{item.titleZh || item.title} · {funnelStageLabel(item.funnelStage)}</em>
                      </strong>
                      <p>{item.description}</p>
                    </span>
                    {isRecommended ? <span className="mini-badge">最適合你</span> : null}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <footer className="strategy-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>以「{selected.titleZh || selected.title}」繼續</button>
      </footer>

      <style jsx>{styles}</style>
    </main>
  )
}

function funnelStageLabel(stage?: string) {
  if (stage === 'top') return '吸引新受眾'
  if (stage === 'bottom') return '推動查詢與行動'
  return '建立理解與信任'
}

function Steps() {
  return (
    <nav className="steps" aria-label="Onboarding progress">
      {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
        <span className={index === 1 ? 'active' : ''} key={step}>
          {step}
          {index < 4 ? <b>›</b> : null}
        </span>
      ))}
    </nav>
  )
}

const styles = `
  .strategy-page {
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

  .strategy-shell {
    width: min(100%, 840px);
    margin: 0 auto;
  }

  header {
    margin-bottom: 28px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: clamp(2.1rem, 4vw, 3rem);
    line-height: 1.08;
    letter-spacing: 0;
    font-weight: 700;
  }

  header p,
  .section-copy,
  .strategy-list p,
  .loading-state span {
    margin: 0;
    color: #62666d;
    font-size: 1rem;
    line-height: 1.45;
  }

  .notice {
    margin: 0 0 18px;
    border-radius: 8px;
    background: #fff7d8;
    color: #5a4500;
    padding: 12px 14px;
    font-weight: 650;
  }

  .strategy-list {
    display: grid;
    gap: 14px;
  }

  .strategy-card {
    width: 100%;
    border: 1px solid #e2e3e6;
    background: #ffffff;
    color: inherit;
    text-align: left;
    cursor: pointer;
    font: inherit;
    position: relative;
    overflow: hidden;
    transition:
      min-height 220ms ease,
      transform 220ms ease,
      box-shadow 220ms ease,
      border-color 220ms ease,
      background 220ms ease;
  }

  .strategy-card.compact {
    min-height: 104px;
    border-radius: 10px;
    padding: 16px;
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) auto;
    gap: 18px;
    align-items: center;
  }

  .strategy-card.compact:hover {
    border-color: #bfc2c8;
    transform: translateY(-1px);
  }

  .strategy-card.expanded {
    min-height: 240px;
    border-radius: 18px;
    padding: 28px;
    color: #ffffff;
    transform: scale(1.015);
    border-color: #171717;
    box-shadow: inset 0 0 0 8px #ffffff, 0 0 0 2px #181818, 0 18px 40px rgba(16, 16, 20, 0.12);
    background:
      linear-gradient(90deg, rgba(9, 6, 18, 0.96), rgba(67, 26, 128, 0.88), rgba(215, 112, 42, 0.64)),
      var(--strategy-image) center right / auto 120% no-repeat;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .strategy-card.expanded::before {
    content: '';
    position: absolute;
    inset: 8px;
    border-radius: 12px;
    background:
      linear-gradient(90deg, rgba(9, 6, 18, 0.9) 0%, rgba(48, 15, 77, 0.74) 48%, rgba(0, 0, 0, 0.04) 100%),
      var(--strategy-image) center right / cover no-repeat;
  }

  .image-wash {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(10, 6, 16, 0.12), rgba(255, 255, 255, 0));
    pointer-events: none;
  }

  .badge {
    position: relative;
    z-index: 2;
    display: inline-flex;
    width: fit-content;
    border-radius: 6px;
    background: #ffffff;
    color: #111111;
    padding: 8px 12px;
    font-size: 0.88rem;
    font-weight: 800;
    margin-bottom: 14px;
  }

  .check {
    position: absolute;
    z-index: 3;
    top: 30px;
    right: 30px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #0f2a2f;
    color: #ffffff;
    font-weight: 800;
  }

  .expanded-copy {
    position: relative;
    z-index: 2;
    display: block;
    max-width: 590px;
  }

  .expanded-copy strong {
    display: grid;
    gap: 4px;
    font-size: 1.42rem;
    margin-bottom: 14px;
  }

  .expanded-copy strong em,
  .compact-copy strong em {
    display: block;
    color: inherit;
    font-style: normal;
    font-size: 0.86em;
    font-weight: 750;
    opacity: 0.82;
  }

  .expanded-copy p {
    margin: 0;
    color: rgba(255, 255, 255, 0.88);
    font-size: 1.05rem;
    line-height: 1.45;
  }

  .example-list {
    position: relative;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 16px;
  }

  .example-list i {
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.92);
    padding: 6px 10px;
    font-size: 0.78rem;
    font-style: normal;
  }

  .strategy-card.expanded small {
    position: relative;
    z-index: 2;
    display: block;
    margin: auto -20px -20px;
    padding: 14px 20px;
    border-radius: 0 0 10px 10px;
    background: rgba(0, 0, 0, 0.34);
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.92rem;
    line-height: 1.4;
  }

  .thumb {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    background: #f2f4f7;
    overflow: hidden;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .compact-copy strong {
    display: grid;
    gap: 2px;
    margin-bottom: 6px;
    font-size: 1.05rem;
  }

  .mini-badge {
    border-radius: 999px;
    background: #f1f4e8;
    color: #617044;
    font-size: 0.82rem;
    font-weight: 800;
    padding: 7px 10px;
  }

  .strategy-footer {
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

  .strategy-footer button {
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

  .strategy-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  .loading-state {
    min-height: calc(100vh - 220px);
    display: grid;
    align-content: center;
    justify-items: center;
    text-align: center;
  }

  .loading-state p {
    margin: 0 0 18px;
    color: #9a9a9a;
    font-weight: 700;
  }

  .loading-state h1 {
    margin-bottom: 14px;
  }

  @media (max-width: 760px) {
    .strategy-page {
      padding: 22px 16px 110px;
    }

    .steps {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 34px;
      justify-content: flex-start;
    }

    .strategy-card.compact {
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 14px;
    }

    .strategy-card.expanded {
      min-height: 280px;
      padding: 22px;
      transform: scale(1);
    }

    .strategy-card.expanded::before {
      background:
        linear-gradient(90deg, rgba(9, 6, 18, 0.92) 0%, rgba(48, 15, 77, 0.78) 58%, rgba(0, 0, 0, 0.18) 100%),
        var(--strategy-image) center right / auto 120% no-repeat;
    }

    .strategy-card.expanded small {
      padding: 14px;
    }

    .thumb {
      width: 54px;
      height: 54px;
    }

    .strategy-footer {
      padding: 12px 14px;
    }
  }
`

export default function ContentStrategyPage() {
  return (
    <Suspense fallback={null}>
      <ContentStrategyContent />
    </Suspense>
  )
}
