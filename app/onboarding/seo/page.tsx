'use client'

import { useEffect, useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type ViewState = 'landing' | 'scanning' | 'clusters' | 'plan'
type Frequency = '2篇/週' | '4篇/週' | '每日'
type Platform = 'IG Caption' | '小紅書圖文' | 'TikTok Script'
type Tone = '教育性' | '推薦式' | '測評式'

type Cluster = {
  id: string
  name: string
  detail: string
  kd: string
  volume: string
}

type KeywordRow = {
  id: string
  label: string
  keyword: string
  kd: string
  volume: string
  date: string
}

const clusters: Cluster[] = [
  { id: 'hyaluronic', name: '玻尿酸護膚教學', detail: '12個關鍵詞', kd: '8.0', volume: '45.2k' },
  { id: 'hk-beauty', name: '香港美容推薦', detail: '9個關鍵詞', kd: '12.0', volume: '33.8k' },
  { id: 'affordable', name: '平價護膚品牌', detail: '15個關鍵詞', kd: '5.0', volume: '28.5k' },
  { id: 'whitening', name: '美白精華推薦', detail: '11個關鍵詞', kd: '22.0', volume: '88.0k' },
  { id: 'sensitive', name: '敏感肌護膚程序', detail: '8個關鍵詞', kd: '18.0', volume: '15.2k' },
]

const keywordGroups: Record<string, KeywordRow[]> = {
  hyaluronic: [
    { id: 'h-main', label: 'Main', keyword: '玻尿酸護膚教學', kd: '8.0', volume: '45.2k', date: '5月25日' },
    { id: 'h-1', label: '1.1', keyword: '玻尿酸精華液推薦', kd: '5.0', volume: '22.1k', date: '5月27日' },
    { id: 'h-2', label: '1.2', keyword: '玻尿酸面膜效果', kd: '3.0', volume: '18.5k', date: '5月29日' },
    { id: 'h-3', label: '1.3', keyword: '平價玻尿酸護膚品', kd: '6.0', volume: '12.3k', date: '6月1日' },
    { id: 'h-4', label: '1.4', keyword: '玻尿酸眼霜推薦', kd: '4.0', volume: '9.8k', date: '6月3日' },
  ],
  'hk-beauty': [
    { id: 'hk-main', label: 'Main', keyword: '香港美容推薦', kd: '12.0', volume: '33.8k', date: '6月24日' },
    { id: 'hk-1', label: '2.1', keyword: '香港護膚品牌', kd: '8.0', volume: '15.2k', date: '6月26日' },
    { id: 'hk-2', label: '2.2', keyword: '香港美容院推薦', kd: '15.0', volume: '12.8k', date: '6月29日' },
    { id: 'hk-3', label: '2.3', keyword: '香港有機護膚品', kd: '6.0', volume: '8.5k', date: '7月1日' },
  ],
  affordable: [
    { id: 'a-main', label: 'Main', keyword: '平價護膚品牌', kd: '5.0', volume: '28.5k', date: '7月24日' },
    { id: 'a-1', label: '3.1', keyword: '平價保濕護膚品', kd: '4.0', volume: '18.2k', date: '7月27日' },
    { id: 'a-2', label: '3.2', keyword: '學生護膚品推薦', kd: '3.0', volume: '15.6k', date: '7月29日' },
    { id: 'a-3', label: '3.3', keyword: '便宜又好用護膚品', kd: '2.0', volume: '12.1k', date: '8月1日' },
  ],
}

function formatTimer(seconds: number) {
  return `00:${String(seconds).padStart(2, '0')} sec`
}

export default function SeoPage() {
  const [view, setView] = useState<ViewState>('landing')
  const [elapsed, setElapsed] = useState(0)
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>(['hyaluronic', 'hk-beauty', 'affordable'])
  const [frequency, setFrequency] = useState<Frequency>('4篇/週')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    affordable: true,
    hyaluronic: true,
    'hk-beauty': true,
  })
  const [generatedRows, setGeneratedRows] = useState<Record<string, boolean>>({})
  const [generationKeyword, setGenerationKeyword] = useState<KeywordRow | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['IG Caption'])
  const [tone, setTone] = useState<Tone>('教育性')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [copied, setCopied] = useState(false)

  const selectedClusters = useMemo(
    () => clusters.filter((cluster) => selectedClusterIds.includes(cluster.id)),
    [selectedClusterIds]
  )

  useEffect(() => {
    if (view !== 'scanning') return undefined
    setElapsed(0)
    const interval = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
      setView('clusters')
    }, 3000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [view])

  function toggleCluster(clusterId: string) {
    setSelectedClusterIds((current) => {
      if (current.includes(clusterId)) return current.filter((id) => id !== clusterId)
      if (current.length >= 3) return current
      return [...current, clusterId]
    })
  }

  function openGenerationModal(keyword: KeywordRow) {
    setGenerationKeyword(keyword)
    setSelectedPlatforms(['IG Caption'])
    setTone('教育性')
    setGeneratedContent('')
    setGenerationError('')
    setCopied(false)
  }

  async function generateContent() {
    if (!generationKeyword || !selectedPlatforms.length) return
    setGenerating(true)
    setGenerationError('')
    try {
      const response = await fetch('/api/seo/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: generationKeyword.keyword,
          platform: selectedPlatforms.join('、'),
          tone,
        }),
      })
      const data = await response.json().catch(() => null)
      if (response.status === 402) {
        throw new Error(`Credits 不足（需要 ${data?.required ?? 5} credits，現有 ${data?.balance ?? 0}）`)
      }
      if (!response.ok) throw new Error(data?.detail || data?.error || '生成失敗')
      setGeneratedContent(data.content || '')
      setGeneratedRows((current) => ({ ...current, [generationKeyword.id]: true }))
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '生成失敗，請重試。')
    } finally {
      setGenerating(false)
    }
  }

  async function copyGeneratedContent() {
    if (!generatedContent) return
    await navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="SEO" />
      <section className="seo-shell">
        {view === 'landing' ? (
          <section className="landing-full">
            <img
              src="/seo/seo-banner.png"
              alt="SEO Banner"
              style={{ width: '100%', maxWidth: '100%', borderRadius: '12px' }}
            />
            <button
              className="yellow-button large"
              style={{ marginTop: '24px' }}
              type="button"
              onClick={() => setView('scanning')}
            >
              設定我的 SEO 計劃
            </button>
          </section>
        ) : null}

        {view === 'scanning' ? (
          <section className="modal-card narrow">
            <h1>揀選 3 個話題集群來提升排名</h1>
            <p>正在掃描搜尋量...</p>
            <strong className="timer">{formatTimer(elapsed)}</strong>
            <div className="skeleton-list">
              {[0, 1, 2].map((item) => (
                <div className="skeleton-row" key={item}>
                  <span />
                  <em>KD: --</em>
                  <em>Vol.: --</em>
                </div>
              ))}
            </div>
            <button className="disabled-button" disabled type="button">
              確認話題集群
            </button>
          </section>
        ) : null}

        {view === 'clusters' ? (
          <section className="modal-card">
            <h1>揀選 3 個話題集群來提升排名</h1>
            <div className="cluster-table">
              <div className="cluster-head">
                <span>選擇</span>
                <span>話題集群</span>
                <span>KD</span>
                <span>月搜尋量</span>
              </div>
              {clusters.map((cluster) => {
                const selected = selectedClusterIds.includes(cluster.id)
                return (
                  <button
                    className={`cluster-row ${selected ? 'selected' : ''}`}
                    key={cluster.id}
                    onClick={() => toggleCluster(cluster.id)}
                    type="button"
                  >
                    <span className="checkbox">{selected ? '✓' : ''}</span>
                    <strong>
                      {cluster.name}
                      <small>（{cluster.detail}）</small>
                    </strong>
                    <span>{cluster.kd}</span>
                    <span>{cluster.volume}</span>
                  </button>
                )
              })}
            </div>
            <p className="note">KD = 關鍵詞難度（越低越易排名）· Vol. = 月搜尋量</p>
            <footer className="cluster-actions">
              <button className="text-button" type="button" onClick={() => setSelectedClusterIds(['hyaluronic', 'hk-beauty', 'affordable'])}>
                重設選擇
              </button>
              <button
                className="black-button"
                disabled={selectedClusterIds.length !== 3}
                onClick={() => setView('plan')}
                type="button"
              >
                確認 {selectedClusterIds.length} 個話題集群
              </button>
            </footer>
          </section>
        ) : null}

        {view === 'plan' ? (
          <section className="plan-page">
            <header className="plan-header">
              <div>
                <h1>SEO 社交計劃</h1>
                <div className="status-badge">
                  <span /> 進行中
                </div>
                <p>你的 SEO 計劃已啟動 — SOON 正按排程生成社交內容</p>
              </div>
              <div className="frequency-control">
                <span>發布頻率</span>
                <div>
                  {(['2篇/週', '4篇/週', '每日'] as Frequency[]).map((item) => (
                    <button
                      className={frequency === item ? 'active' : ''}
                      key={item}
                      onClick={() => setFrequency(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div className="info-grid">
              <article>
                <h2>為什麼 SEO 社交計劃有效</h2>
                <p>每篇針對目標關鍵詞的帖文都是一個排名機會，發布得愈多，自然流量複利增長愈快。</p>
              </article>
              <article>
                <h2>運作方式</h2>
                <p>SOON 逐個關鍵詞自動生成社交內容，每次生成消耗 5 credits，可隨時調整頻率。</p>
              </article>
            </div>

            <div className="cluster-sections">
              {selectedClusters.map((cluster) => (
                <section className="keyword-section" key={cluster.id}>
                  <button
                    className="section-toggle"
                    onClick={() => setExpanded((current) => ({ ...current, [cluster.id]: !current[cluster.id] }))}
                    type="button"
                  >
                    <strong>{cluster.name}</strong>
                    <span>{expanded[cluster.id] ? '⌃' : '⌄'}</span>
                  </button>
                  {expanded[cluster.id] ? (
                    <div className="keyword-table">
                      <div className="keyword-head">
                        <span>#</span>
                        <span>關鍵詞</span>
                        <span>KD</span>
                        <span>月搜尋量</span>
                        <span>發布日期</span>
                        <span>狀態</span>
                        <span>操作</span>
                      </div>
                      {(keywordGroups[cluster.id] || []).map((row) => (
                        <div className="keyword-row" key={row.id}>
                          <span>{row.label}</span>
                          <strong>{row.keyword}</strong>
                          <span>{row.kd}</span>
                          <span>{row.volume}</span>
                          <span>{row.date}</span>
                          <span className={generatedRows[row.id] ? 'generated-status' : 'planned-status'}>
                            {generatedRows[row.id] ? '已生成 ✓' : '計劃中'}
                          </span>
                          <button className="generate-button" onClick={() => openGenerationModal(row)} type="button">
                            生成內容 · 5 credits
                          </button>
                        </div>
                      ))}
                      <button className="add-keyword" type="button">
                        + 加入新關鍵詞
                      </button>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </section>
        ) : null}

        {generationKeyword ? (
          <div className="modal-overlay" onClick={() => setGenerationKeyword(null)}>
            <section className="generation-modal" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <h2>生成 SEO 社交內容</h2>
                  <p>{generationKeyword.keyword}</p>
                </div>
                <button aria-label="關閉" onClick={() => setGenerationKeyword(null)} type="button">
                  x
                </button>
              </header>

              {!generatedContent ? (
                <>
                  <div className="modal-field">
                    <span>選擇平台</span>
                    <div className="chip-row">
                      {(['IG Caption', '小紅書圖文', 'TikTok Script'] as Platform[]).map((platform) => {
                        const selected = selectedPlatforms.includes(platform)
                        return (
                          <button
                            className={selected ? 'selected' : ''}
                            key={platform}
                            onClick={() =>
                              setSelectedPlatforms((current) =>
                                selected ? current.filter((item) => item !== platform) : [...current, platform]
                              )
                            }
                            type="button"
                          >
                            {platform}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="modal-field">
                    <span>內容風格</span>
                    <div className="chip-row">
                      {(['教育性', '推薦式', '測評式'] as Tone[]).map((item) => (
                        <button
                          className={tone === item ? 'selected' : ''}
                          key={item}
                          onClick={() => setTone(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="modal-note">生成後將消耗 5 credits，內容可加入宣傳活動。</p>
                  {generationError ? <p className="modal-error">{generationError}</p> : null}
                  <footer>
                    <button className="cancel-button" onClick={() => setGenerationKeyword(null)} type="button">
                      取消
                    </button>
                    <button
                      className="purple-button"
                      disabled={generating || selectedPlatforms.length === 0}
                      onClick={() => void generateContent()}
                      type="button"
                    >
                      {generating ? '生成中...' : '生成內容 · 5 credits →'}
                    </button>
                  </footer>
                </>
              ) : (
                <>
                  <div className="generated-content">{generatedContent}</div>
                  <footer>
                    <button className="cancel-button" onClick={() => void copyGeneratedContent()} type="button">
                      {copied ? '已複製' : '複製內容'}
                    </button>
                    <button className="purple-button" onClick={() => setGenerationKeyword(null)} type="button">
                      加入宣傳活動 →
                    </button>
                  </footer>
                </>
              )}
            </section>
          </div>
        ) : null}
      </section>
      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
.dashboard-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  background: #f7f7fb;
  color: #111827;
}

.seo-shell {
  min-height: 100vh;
  padding: 32px;
}

.modal-card,
.plan-page {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, .08);
}

.landing-full {
  width: 100%;
  text-align: center;
}

.landing-card h1,
.modal-card h1,
.plan-header h1 {
  margin: 0;
  color: #111827;
  letter-spacing: 0;
}

.landing-card h1 {
  font-size: 34px;
}

.landing-card p,
.modal-card p,
.plan-header p,
.info-grid p {
  color: #6b7280;
  line-height: 1.7;
}

.landing-card p {
  max-width: 560px;
  margin: 16px auto 0;
}

.black-button,
.yellow-button,
.disabled-button,
.purple-button,
.cancel-button {
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 900;
  padding: 11px 16px;
}

.black-button {
  background: #0a0a0a;
  color: #ffffff;
}

.yellow-button {
  background: #facc15;
  color: #0a0a0a;
}

.black-button.large,
.yellow-button.large {
  font-size: 16px;
  padding: 14px 22px;
}

.black-button:disabled,
.purple-button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.disabled-button {
  width: 100%;
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.modal-card {
  max-width: 820px;
  margin: 7vh auto 0;
  padding: 28px;
}

.modal-card.narrow {
  max-width: 560px;
}

.timer {
  display: block;
  margin: 18px 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 28px;
}

.skeleton-list {
  display: grid;
  gap: 10px;
  margin: 18px 0;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #f1f2f5;
  border-radius: 10px;
  padding: 12px;
}

.skeleton-row span {
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6);
  background-size: 220% 100%;
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-row em {
  color: #9ca3af;
  font-style: normal;
  font-size: 13px;
}

@keyframes pulse {
  to { background-position: -220% 0; }
}

.cluster-table {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 18px;
}

.cluster-head,
.cluster-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 90px 120px;
  align-items: center;
  gap: 12px;
}

.cluster-head {
  background: #fafafa;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  padding: 12px 16px;
}

.cluster-row {
  width: 100%;
  border: 0;
  border-top: 1px solid #f1f2f5;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  padding: 14px 16px;
  text-align: left;
}

.cluster-row.selected {
  background: #faf5ff;
}

.checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 900;
}

.cluster-row.selected .checkbox {
  background: #7c3aed;
  border-color: #7c3aed;
}

.cluster-row small {
  color: #6b7280;
  font-weight: 700;
}

.note {
  margin: 12px 0 0;
  font-size: 13px;
}

.cluster-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
}

.text-button {
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-weight: 800;
}

.plan-page {
  padding: 28px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.plan-header h1 {
  font-size: 32px;
  margin-bottom: 10px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #15803d;
  font-size: 13px;
  font-weight: 900;
  padding: 7px 11px;
}

.status-badge span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #16a34a;
}

.frequency-control {
  display: grid;
  gap: 8px;
}

.frequency-control > span {
  color: #374151;
  font-size: 13px;
  font-weight: 900;
}

.frequency-control div {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.frequency-control button {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-weight: 900;
  padding: 9px 13px;
}

.frequency-control button.active {
  background: #0a0a0a;
  color: #ffffff;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.info-grid article {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fafafa;
  padding: 18px;
}

.info-grid h2 {
  margin: 0 0 8px;
  font-size: 17px;
}

.info-grid p {
  margin: 0;
}

.cluster-sections {
  display: grid;
  gap: 14px;
}

.keyword-section {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.section-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  background: #ffffff;
  cursor: pointer;
  padding: 16px 18px;
}

.section-toggle strong {
  font-size: 18px;
}

.section-toggle span {
  color: #6b7280;
  font-size: 20px;
}

.keyword-head,
.keyword-row {
  display: grid;
  grid-template-columns: 70px minmax(180px, 1fr) 70px 100px 100px 100px 170px;
  gap: 10px;
  align-items: center;
}

.keyword-head {
  background: #fafafa;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  padding: 11px 18px;
}

.keyword-row {
  border-top: 1px solid #f1f2f5;
  padding: 13px 18px;
  font-size: 14px;
}

.planned-status,
.generated-status {
  border-radius: 999px;
  justify-self: start;
  font-size: 12px;
  font-weight: 900;
  padding: 5px 8px;
}

.planned-status {
  background: #f3f4f6;
  color: #4b5563;
}

.generated-status {
  background: #ecfdf5;
  color: #15803d;
}

.generate-button {
  border: 1px solid #c4b5fd;
  border-radius: 8px;
  background: #ffffff;
  color: #7c3aed;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 8px 10px;
}

.add-keyword {
  border: 0;
  background: #ffffff;
  color: #7c3aed;
  cursor: pointer;
  font-weight: 900;
  padding: 14px 18px 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, .52);
  padding: 24px;
}

.generation-modal {
  width: min(100%, 580px);
  max-height: 84vh;
  overflow: auto;
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .22);
  padding: 22px;
}

.generation-modal header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.generation-modal h2 {
  margin: 0 0 4px;
  font-size: 21px;
}

.generation-modal header p {
  margin: 0;
  color: #6b7280;
}

.generation-modal header button {
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 18px;
}

.modal-field {
  display: grid;
  gap: 9px;
  margin-bottom: 16px;
}

.modal-field > span {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-row button {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  font-weight: 800;
  padding: 9px 12px;
}

.chip-row button.selected {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.modal-note {
  border-radius: 10px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  margin: 0 0 14px;
  padding: 11px 12px;
}

.modal-error {
  color: #dc2626;
  font-size: 13px;
  margin: 0 0 12px;
}

.generation-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
}

.purple-button {
  background: #7c3aed;
  color: #ffffff;
}

.generated-content {
  max-height: 340px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  color: #111827;
  line-height: 1.7;
  margin-bottom: 16px;
  padding: 14px;
}

@media (max-width: 980px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .seo-shell {
    padding: 22px 14px;
  }

  .modal-card,
  .plan-page {
    padding: 22px;
  }

  .cluster-head,
  .cluster-row,
  .keyword-head,
  .keyword-row {
    grid-template-columns: 1fr;
  }

  .keyword-head {
    display: none;
  }

  .plan-header,
  .info-grid {
    grid-template-columns: 1fr;
    display: grid;
  }
}
`
