'use client'

import { useEffect, useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import {
  isBechillWorkspace,
  isEggWorkspace,
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'

type Reaction = 'like' | 'try' | 'pass'

type ReferenceIdea = {
  id: string
  title: string
  source: string
  image: string
  height: 'short' | 'medium' | 'tall'
  category: string
  tags: string[]
  note: string
}

const bechillFilters = ['全部', '人生態度 meme 圖', '人生金句故事卡', 'AI短片', '人與動物小故事連載'] as const
const eggFilters = ['全部', 'Trending 最新資訊', 'Entertainment 娛樂資訊', 'Celebrity 人物介紹', 'Travel 旅遊資訊', '兩性關係 relationship'] as const

const bechillReferenceIdeas: ReferenceIdea[] = [
  {
    id: 'warm-daily-moment',
    title: '日常一刻變成情緒入口',
    source: 'SOON brainstorm',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    height: 'tall',
    category: '人生態度 meme 圖',
    tags: ['1-3 張', 'punchline', 'share'],
    note: '一個日常壓力，加一個 Bunchill 式舒服答案，適合短、快、易 share。',
  },
  {
    id: 'pet-inner-voice',
    title: '用角色內心聲講關係',
    source: 'Bechill idea board',
    image: '/mood/mood-warm.jpg',
    height: 'medium',
    category: '人與動物小故事連載',
    tags: ['Elkie', '人寵關係', '1-3 張'],
    note: '用具體小事推進角色世界觀，讓 Bunchill 不是講道理，而是做一個小動作。',
  },
  {
    id: 'tiny-problem-big-feeling',
    title: '小煩惱，大情緒',
    source: 'Caption angle',
    image: '/assets/content-strategies/photos/problem-solution.jpg',
    height: 'short',
    category: '人生態度 meme 圖',
    tags: ['日常壓力', '反差', 'tag 朋友'],
    note: '題材不需要很大，越細越容易用 1-3 張圖做出笑位。',
  },
  {
    id: 'behind-the-scene-soft',
    title: 'Bunchill 認真做事，最後只是想舒服',
    source: 'AI video storyboard direction',
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    height: 'medium',
    category: 'AI短片',
    tags: ['15 秒', '3D', '反轉'],
    note: '頭 10 秒建立預期，最後 5 秒揭示 Bunchill 真正追求的是舒服。',
  },
  {
    id: 'comment-prompt',
    title: '一個低壓力問題，變成金句收結',
    source: 'Saveable carousel angle',
    image: '/assets/content-strategies/photos/community-content.jpg',
    height: 'tall',
    category: '人生金句故事卡',
    tags: ['save', '4-8 格', '情緒累積'],
    note: '適合疲累、陪伴、慢活這類題材，逐格累積情緒，最後安靜收結。',
  },
  {
    id: 'visual-soft-story',
    title: '柔和插畫感，可以做保存型內容',
    source: 'Visual reference',
    image: '/visual-styles/previews/magic-hour.jpg',
    height: 'medium',
    category: '人生金句故事卡',
    tags: ['quote', '保存', '留白'],
    note: '人生金句故事卡需要多留白、少說教，讓 Bunchill 安靜陪襯情緒。',
  },
  {
    id: 'trend-but-brand-safe',
    title: 'Trend 題材做成 Bunchill 無厘頭短片',
    source: 'Trend scan',
    image: '/assets/content-strategies/photos/trend-hijacking.jpg',
    height: 'short',
    category: 'AI短片',
    tags: ['trend reaction', '角色記憶', '短片'],
    note: '可用季節、天氣、城市生活現象做 3D 反轉，保持安全同角色感。',
  },
  {
    id: 'series-template',
    title: '固定欄目：笨chill 今日想講',
    source: 'Series idea',
    image: '/assets/content-strategies/photos/series-content.jpg',
    height: 'tall',
    category: '人與動物小故事連載',
    tags: ['角色世界觀', '吸 fans', '日常默契'],
    note: '用固定欄目建立長期角色記憶，適合 Bunchill 同 Elkie 的陪伴小故事。',
  },
]

const eggReferenceIdeas: ReferenceIdea[] = [
  {
    id: 'egg-trending-city',
    title: '城市熱話用 Egg.soon 角度拆解',
    source: 'Egg.soon brainstorm',
    image: '/assets/content-strategies/photos/trend-hijacking.jpg',
    height: 'medium',
    category: 'Trending 最新資訊',
    tags: ['hot topic', '快訊', '懶人包'],
    note: '將近期網絡熱話變成易讀重點，先講事件，再加一個 SOON 式觀察角度。',
  },
  {
    id: 'egg-entertainment-watchlist',
    title: '一週娛樂 watchlist',
    source: 'Entertainment scan',
    image: '/assets/content-strategies/photos/community-content.jpg',
    height: 'tall',
    category: 'Entertainment 娛樂資訊',
    tags: ['劇集', '電影', '社交話題'],
    note: '整理近期值得留意的劇集、電影、節目或平台內容，適合做 carousel。',
  },
  {
    id: 'egg-celebrity-profile',
    title: '人物介紹：由一個細節認識名人',
    source: 'Profile angle',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    height: 'short',
    category: 'Celebrity 人物介紹',
    tags: ['人物故事', '背景資料', 'timeline'],
    note: '不是單純報導，而是用一個行為、造型或訪問片段切入，建立人物記憶點。',
  },
  {
    id: 'egg-travel-pocket-guide',
    title: '旅遊資訊做成收藏型 mini guide',
    source: 'Travel reference',
    image: '/assets/content-strategies/photos/series-content.jpg',
    height: 'tall',
    category: 'Travel 旅遊資訊',
    tags: ['目的地', '打卡', 'save'],
    note: '用地點、交通、預算、適合人群做快速整理，重點係令人想 save 起。',
  },
  {
    id: 'egg-relationship-question',
    title: 'Relationship 討論題：一句問題帶出留言',
    source: 'Relationship prompt',
    image: '/assets/content-strategies/photos/problem-solution.jpg',
    height: 'medium',
    category: '兩性關係 relationship',
    tags: ['互動', '留言', '情感觀察'],
    note: '用「你會唔會...」或「你點睇...」切入，保持輕鬆但有討論空間。',
  },
  {
    id: 'egg-entertainment-moment',
    title: '娛樂事件的三個看點',
    source: 'Newsroom format',
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    height: 'short',
    category: 'Entertainment 娛樂資訊',
    tags: ['3 points', '快讀', 'IG post'],
    note: '適合快速追蹤新歌、活動、紅毯、節目片段，用三點式降低閱讀成本。',
  },
]

export default function CampaignsPage() {
  const [activeFilter, setActiveFilter] = useState('全部')
  const [query, setQuery] = useState('')
  const [reactions, setReactions] = useState<Record<string, Reaction | undefined>>({})
  const [isBechillActive, setIsBechillActive] = useState(false)
  const [isEggActive, setIsEggActive] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!cancelled) setWorkspaceLoading(true)
      try {
        const { activeWorkspace } = await resolveActiveWorkspace()
        if (!cancelled) {
          setIsBechillActive(isBechillWorkspace(activeWorkspace))
          setIsEggActive(isEggWorkspace(activeWorkspace))
        }
      } catch {
        if (!cancelled) {
          setIsBechillActive(false)
          setIsEggActive(false)
        }
      } finally {
        if (!cancelled) setWorkspaceLoading(false)
      }
    }

    void loadWorkspace()

    function handleWorkspaceChanged() {
      void loadWorkspace()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  const filters = workspaceLoading ? ['全部'] : isEggActive ? eggFilters : bechillFilters
  const referenceIdeas = workspaceLoading
    ? []
    : isEggActive
      ? eggReferenceIdeas
      : isBechillActive
        ? bechillReferenceIdeas
        : []

  useEffect(() => {
    if (!filters.includes(activeFilter as never)) {
      setActiveFilter('全部')
    }
  }, [activeFilter, filters])

  const visibleIdeas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return referenceIdeas.filter((idea) => {
      const matchesFilter = activeFilter === '全部' || idea.category === activeFilter
      const searchable = `${idea.title} ${idea.source} ${idea.category} ${idea.tags.join(' ')} ${idea.note}`.toLowerCase()
      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [activeFilter, query, referenceIdeas])

  function setReaction(ideaId: string, reaction: Reaction) {
    setReactions((current) => ({
      ...current,
      [ideaId]: current[ideaId] === reaction ? undefined : reaction,
    }))
  }

  const likedCount = Object.values(reactions).filter(Boolean).length

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="題材庫" />
      <section className="library-shell">
        <header className="library-topbar">
          <div>
            <h1>題材庫</h1>
            <span>
              {workspaceLoading
                ? '正在載入目前工作台的題材方向'
                : isEggActive
                ? '按 Egg.soon 內容方向整理最新資訊、娛樂、人物、旅遊及 relationship 題材'
                : isBechillActive
                  ? '按 Bunchill 內容格式整理 reference、題材方向和 brainstorm'
                  : '這裡會按目前工作台整理 reference、題材方向和 brainstorm'}
            </span>
          </div>
          <div className="library-summary">
            <strong>{likedCount}</strong>
            <span>個客戶反應</span>
          </div>
        </header>

        <section className="library-body">
          {workspaceLoading ? (
            <div className="library-loading" aria-label="正在載入題材庫">
              <div className="library-loading-search" />
              <div className="library-loading-filters">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="library-loading-grid">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          ) : (
            <>
              <div className="library-tools">
                <label className="library-search">
                  <span>⌕</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜尋題材、reference、tag"
                  />
                </label>
                <div className="library-filters" aria-label="內容格式分類">
                  {filters.map((filter) => (
                    <button
                      type="button"
                      key={filter}
                      className={filter === activeFilter ? 'active' : ''}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="idea-masonry" aria-label="題材 reference">
                {visibleIdeas.map((idea) => {
                  const reaction = reactions[idea.id]
                  return (
                    <article className={`idea-card ${idea.height}`} key={idea.id}>
                      <div className="idea-image-wrap">
                        <img src={idea.image} alt="" />
                        <span>{idea.category}</span>
                      </div>
                      <div className="idea-copy">
                        <p>{idea.source}</p>
                        <h2>{idea.title}</h2>
                        <span>{idea.note}</span>
                        <div className="idea-tags">
                          {idea.tags.map((tag) => (
                            <em key={tag}>{tag}</em>
                          ))}
                        </div>
                        <div className="idea-reactions" aria-label={`${idea.title} 客戶反應`}>
                          <button
                            type="button"
                            className={reaction === 'like' ? 'active' : ''}
                            onClick={() => setReaction(idea.id, 'like')}
                          >
                            喜歡
                          </button>
                          <button
                            type="button"
                            className={reaction === 'try' ? 'active' : ''}
                            onClick={() => setReaction(idea.id, 'try')}
                          >
                            想試
                          </button>
                          <button
                            type="button"
                            className={reaction === 'pass' ? 'muted active' : 'muted'}
                            onClick={() => setReaction(idea.id, 'pass')}
                          >
                            不合適
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              {visibleIdeas.length === 0 ? (
                <div className="library-empty">
                  <strong>暫時未有相符題材</strong>
                  <span>可以清除搜尋或切換分類。</span>
                  {referenceIdeas.length > 0 ? (
                    <button type="button" onClick={() => { setQuery(''); setActiveFilter('全部') }}>
                      查看全部
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${libraryStyles}` }} />
    </main>
  )
}

const libraryStyles = `
  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .library-shell {
    min-width: 0;
    background: #ffffff;
  }

  .library-topbar {
    min-height: 64px;
    border-bottom: 1px solid #ebecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 24px;
    background: #ffffff;
  }

  .library-topbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 750;
  }

  .library-topbar span {
    color: #70747d;
    font-size: 13px;
  }

  .library-summary {
    min-width: 116px;
    border: 1px solid #e6e7ea;
    border-radius: 10px;
    padding: 8px 12px;
    text-align: right;
  }

  .library-summary strong {
    display: block;
    font-size: 20px;
    line-height: 1;
  }

  .library-summary span {
    display: block;
    margin-top: 4px;
    font-size: 11px;
  }

  .library-body {
    padding: 22px 24px 42px;
  }

  .library-tools {
    position: sticky;
    top: 0;
    z-index: 5;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(10px);
    padding-bottom: 18px;
  }

  .library-loading {
    display: block;
  }

  .library-loading-search,
  .library-loading-filters i,
  .library-loading-grid i {
    background: linear-gradient(90deg, #f2f3f5 25%, #e7e8eb 50%, #f2f3f5 75%);
    background-size: 200% 100%;
    animation: library-shimmer 1.2s infinite;
  }

  .library-loading-search {
    height: 48px;
    border-radius: 12px;
  }

  .library-loading-filters {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .library-loading-filters i {
    display: block;
    width: 118px;
    height: 34px;
    border-radius: 999px;
  }

  .library-loading-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-top: 18px;
  }

  .library-loading-grid i {
    display: block;
    min-height: 260px;
    border-radius: 12px;
  }

  .library-loading-grid i:nth-child(2),
  .library-loading-grid i:nth-child(5) {
    min-height: 340px;
  }

  .library-loading-grid i:nth-child(3) {
    min-height: 220px;
  }

  @keyframes library-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .library-search {
    min-height: 48px;
    border-radius: 12px;
    background: #ececea;
    display: grid;
    grid-template-columns: 30px 1fr;
    align-items: center;
    padding: 0 14px;
  }

  .library-search span {
    color: #65686f;
    font-size: 20px;
  }

  .library-search input {
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 16px;
  }

  .library-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .library-filters button {
    border: 0;
    border-radius: 999px;
    background: #f2f3f5;
    color: #555961;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 13px;
    white-space: nowrap;
  }

  .library-filters button.active {
    background: #111111;
    color: #ffffff;
  }

  .idea-masonry {
    column-count: 4;
    column-gap: 18px;
  }

  .idea-card {
    display: inline-block;
    width: 100%;
    break-inside: avoid;
    border: 1px solid #e7e8eb;
    border-radius: 12px;
    background: #ffffff;
    margin: 0 0 18px;
    overflow: hidden;
    transition: transform 150ms ease, box-shadow 150ms ease;
  }

  .idea-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(18, 19, 24, 0.08);
  }

  .idea-image-wrap {
    position: relative;
    background: #f2f1ee;
    overflow: hidden;
  }

  .idea-card.short .idea-image-wrap {
    aspect-ratio: 4 / 3;
  }

  .idea-card.medium .idea-image-wrap {
    aspect-ratio: 4 / 5;
  }

  .idea-card.tall .idea-image-wrap {
    aspect-ratio: 3 / 4;
  }

  .idea-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .idea-image-wrap span {
    position: absolute;
    left: 10px;
    top: 10px;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.74);
    color: #ffffff;
    font-size: 11px;
    font-weight: 650;
    padding: 5px 8px;
  }

  .idea-copy {
    padding: 12px;
  }

  .idea-copy p {
    margin: 0;
    color: #8a8e96;
    font-size: 11px;
    font-weight: 650;
    text-transform: uppercase;
  }

  .idea-copy h2 {
    margin: 6px 0 0;
    color: #202126;
    font-size: 17px;
    line-height: 1.15;
    font-weight: 800;
  }

  .idea-copy > span {
    display: block;
    margin-top: 8px;
    color: #5d616a;
    font-size: 12px;
    line-height: 1.45;
  }

  .idea-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .idea-tags em {
    border-radius: 999px;
    background: #f2f3f5;
    color: #686c74;
    font-size: 11px;
    font-style: normal;
    padding: 4px 7px;
  }

  .idea-reactions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
  }

  .idea-reactions button {
    min-height: 32px;
    border: 1px solid #e2e3e6;
    border-radius: 8px;
    background: #ffffff;
    color: #35373d;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
  }

  .idea-reactions button.active {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .idea-reactions button.muted.active {
    border-color: #d5d7dc;
    background: #f1f2f4;
    color: #5f636b;
  }

  .library-empty {
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    margin-top: 18px;
    padding: 32px;
    text-align: center;
  }

  .library-empty strong {
    display: block;
    margin-bottom: 12px;
  }

  .library-empty span {
    color: #6f737d;
    display: block;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 14px;
  }

  .library-empty button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
  }

  @media (max-width: 1180px) {
    .idea-masonry {
      column-count: 3;
    }
  }

  @media (max-width: 860px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .library-topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 16px 18px;
    }

    .library-summary {
      text-align: left;
    }

    .library-body {
      padding: 16px 14px 32px;
    }

    .idea-masonry {
      column-count: 2;
      column-gap: 12px;
    }

    .idea-card {
      margin-bottom: 12px;
      border-radius: 10px;
    }

    .idea-copy h2 {
      font-size: 15px;
    }

    .idea-reactions {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .idea-masonry {
      column-count: 1;
    }
  }
`
