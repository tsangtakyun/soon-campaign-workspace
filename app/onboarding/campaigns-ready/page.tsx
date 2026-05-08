'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type CampaignTheme = {
  id: number
  dateRange: string
  title: string
  body: string
}

const CAMPAIGN_THEMES: CampaignTheme[] = [
  {
    id: 1,
    dateRange: '5月3日 - 5月9日',
    title: '分享你的日常，點燃真實連結',
    body: 'SOON-LOG 邀請用戶用創意方式記錄並分享日常故事。主題聚焦於以玩味、細膩而有情緒的短片，建立親密感和社群連結，令數碼分享變得更個人、更真實。',
  },
  {
    id: 2,
    dateRange: '5月10日 - 5月16日',
    title: '媽媽、回憶，和那些值得留下的時刻',
    body: 'SOON-LOG 以母親節為切入點，鼓勵用戶捕捉與媽媽，或生命中重要照顧者相處的細小片段。溫暖視覺與 AI 創意會令平凡經驗變成值得保存的故事。',
  },
  {
    id: 3,
    dateRange: '5月17日 - 5月23日',
    title: '日常魔法：讓回憶動起來',
    body: '這個主題展示每一個日常瞬間，只要被捕捉和分享，就可以變得更有意思。內容方向會突出創作自由、情感親近，以及用戶參與式故事。',
  },
  {
    id: 4,
    dateRange: '5月24日 - 5月30日',
    title: 'AI 製作的日常回憶',
    body: '以日常敘事為核心，展示 SOON-LOG 如何將生活片段變成有記憶點、以社群為中心的內容。主題會強調簡單、親近，以及不需要剪片技巧也能分享世界。',
  },
]

function CampaignsReadyContent() {
  const searchParams = useSearchParams()
  const [isGenerating, setIsGenerating] = useState(true)
  const [themes, setThemes] = useState(CAMPAIGN_THEMES)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsGenerating(false), 1200)
    return () => window.clearTimeout(timer)
  }, [])

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

  function handleBack() {
    window.history.back()
  }

  function handleContinue() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('soon-campaign-themes-v1', JSON.stringify(themes))
    }
    const url = new URL('/onboarding/scheduled-posts', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleRegenerate(themeId: number) {
    setThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              title: `${theme.title.replace('（已重新生成）', '')}（已重新生成）`,
            }
          : theme
      )
    )
  }

  function handleBodyChange(themeId: number, body: string) {
    setThemes((currentThemes) =>
      currentThemes.map((theme) => (theme.id === themeId ? { ...theme, body } : theme))
    )
  }

  return (
    <main className="campaigns-page">
      <div className="campaign-steps" aria-label="設定進度">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 4 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      {isGenerating ? (
        <section className="campaign-loading" aria-live="polite">
          <p>AI 正在生成...</p>
          <h1>正在整理你的首四個宣傳活動主題...</h1>
          <div className="loading-stack">
            {[1, 2, 3, 4].map((item) => (
              <div className="loading-card" key={item}>
                <span />
                <strong />
                <p />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="campaign-content">
          <header>
            <h1>你的首四個宣傳活動已準備好！</h1>
            <p>在系統生成內容之前，你可以調整任何主題，或者重新生成它們。</p>
          </header>

          <div className="campaign-list">
            {themes.map((theme) => (
              <article className="campaign-card" key={theme.id}>
                <div className="campaign-meta">
                  <span>宣傳活動 {theme.id}</span>
                  <strong>{theme.dateRange}</strong>
                </div>

                <div className="campaign-copy">
                  <div className="campaign-card-header">
                    <h2>{theme.title}</h2>
                    <div className="campaign-actions">
                      <button type="button" onClick={() => setEditingId(editingId === theme.id ? null : theme.id)}>
                        {editingId === theme.id ? '完成調整' : '調整'}
                      </button>
                      <button type="button" onClick={() => handleRegenerate(theme.id)}>重新生成</button>
                    </div>
                  </div>

                  {editingId === theme.id ? (
                    <textarea
                      aria-label={`調整宣傳活動 ${theme.id}`}
                      value={theme.body}
                      onChange={(event) => handleBodyChange(theme.id, event.target.value)}
                    />
                  ) : (
                    <p>{theme.body}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="campaign-footer">
        <button type="button" onClick={handleBack}>返回</button>
        {!isGenerating ? <button type="button" onClick={handleContinue}>繼續</button> : null}
      </footer>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

const styles = `
  .campaigns-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #191a1d;
    padding: 17px clamp(18px, 4vw, 50px) 64px;
  }

  .campaign-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #9b9b9b;
    font-size: 11px;
    line-height: 1;
  }

  .campaign-steps span {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    white-space: nowrap;
  }

  .campaign-steps .active {
    color: #17181c;
    font-weight: 600;
  }

  .campaign-steps b {
    color: #b6b6b6;
    font-weight: 400;
  }

  .campaign-loading,
  .campaign-content {
    width: min(100%, 760px);
    margin: 52px auto 0;
  }

  .campaign-loading {
    text-align: center;
  }

  .campaign-loading > p {
    margin: 0 0 13px;
    color: #6c95d8;
    font-size: 12px;
  }

  .campaign-loading h1,
  .campaign-content h1 {
    margin: 0;
    color: #1b1c20;
    font-size: clamp(24px, 3vw, 31px);
    line-height: 1.12;
    font-weight: 500;
    letter-spacing: 0;
  }

  .campaign-content header p {
    margin: 11px 0 0;
    color: #5d6067;
    font-size: 13px;
    line-height: 1.45;
  }

  .loading-stack {
    margin-top: 34px;
    display: grid;
    gap: 14px;
  }

  .loading-card {
    min-height: 104px;
    border: 1px solid #e9e9e9;
    border-radius: 12px;
    padding: 20px;
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 24px;
  }

  .loading-card span,
  .loading-card strong,
  .loading-card p {
    display: block;
    border-radius: 999px;
    background: linear-gradient(90deg, #f1f1f1, #fafafa, #f1f1f1);
    background-size: 220% 100%;
    animation: shimmer 1.3s infinite;
  }

  .loading-card span {
    width: 84px;
    height: 15px;
  }

  .loading-card strong {
    height: 16px;
  }

  .loading-card p {
    height: 42px;
    grid-column: 2;
    margin: -58px 0 0;
  }

  @keyframes shimmer {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  .campaign-list {
    margin-top: 25px;
    display: grid;
    gap: 15px;
  }

  .campaign-card {
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    padding: 21px;
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 22px;
  }

  .campaign-meta span {
    display: block;
    color: #9a9a9a;
    font-size: 13px;
  }

  .campaign-meta strong {
    display: block;
    margin-top: 9px;
    color: #1f2025;
    font-size: 13px;
    font-weight: 500;
  }

  .campaign-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .campaign-copy h2 {
    margin: 0;
    color: #1d1f24;
    font-size: 15px;
    line-height: 1.28;
    font-weight: 650;
  }

  .campaign-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .campaign-actions button {
    min-height: 29px;
    border: 1px solid #dfe7f4;
    border-radius: 7px;
    background: #f4f8ff;
    color: #3d7dd8;
    font: inherit;
    font-size: 12px;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
  }

  .campaign-copy p,
  .campaign-copy textarea {
    margin: 13px 0 0;
    color: #22242a;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
  }

  .campaign-copy textarea {
    width: 100%;
    min-height: 110px;
    border: 1px solid #dfdfdf;
    border-radius: 8px;
    padding: 12px;
    resize: vertical;
  }

  .campaign-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 48px;
    background: rgba(255,255,255,0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 17px;
  }

  .campaign-footer button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .campaign-footer button:last-child {
    border-radius: 6px;
    background: #111111;
    color: #ffffff;
    padding: 8px 14px;
    font-size: 13px;
  }

  @media (max-width: 760px) {
    .campaign-card {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .campaign-card-header {
      display: grid;
    }

    .campaign-actions {
      justify-content: flex-start;
    }
  }
`

function CampaignsReadyFallback() {
  return <main className="campaigns-page" />
}

export default function CampaignsReadyPage() {
  return (
    <Suspense fallback={<CampaignsReadyFallback />}>
      <CampaignsReadyContent />
    </Suspense>
  )
}
