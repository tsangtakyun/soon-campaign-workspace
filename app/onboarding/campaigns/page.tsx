'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  url?: string
  image: string
  height: 'short' | 'medium' | 'tall'
  category: string
  tags: string[]
  note: string
  format?: 'carousel' | 'single_image' | 'short_video' | 'story_series'
  central?: boolean
  recommended?: boolean
  countries?: string[]
  regions?: string[]
  localities?: string[]
  whyNow?: string
  hook?: string
  media?: string[]
}

type CentralTopic = {
  id: string
  title: string
  summary?: string | null
  why_now?: string | null
  hook?: string | null
  content_formats?: string[] | null
  countries?: string[] | null
  regions?: string[] | null
  localities?: string[] | null
  keywords?: string[] | null
  cover_url?: string | null
  media_urls?: string[] | null
  topic_item_directions?: Array<{
    is_primary?: boolean
    topic_directions?: { label_zh?: string | null } | null
  }> | null
  topic_sources?: Array<{ url?: string | null; source_name?: string | null }> | null
}

function centralTopicToIdea(topic: CentralTopic): ReferenceIdea {
  const primary = topic.topic_item_directions?.find((item) => item.is_primary)?.topic_directions?.label_zh
    || topic.topic_item_directions?.[0]?.topic_directions?.label_zh
    || '最新精選'
  const source = topic.topic_sources?.[0]
  const format = topic.content_formats?.[0]
  return {
    id: topic.id,
    title: topic.title,
    source: source?.source_name || 'SOON 編輯團隊',
    url: source?.url || undefined,
    image: topic.cover_url || '',
    height: 'medium',
    category: primary,
    tags: Array.isArray(topic.keywords) ? topic.keywords.slice(0, 6) : [],
    note: topic.summary || '',
    format: format === 'carousel' || format === 'single_image' || format === 'short_video' || format === 'story_series' ? format : 'short_video',
    central: true,
    countries: topic.countries || [],
    regions: topic.regions || [],
    localities: topic.localities || [],
    whyNow: topic.why_now || undefined,
    hook: topic.hook || undefined,
    media: Array.from(new Set([...(topic.media_urls || []), topic.cover_url || ''].filter(Boolean))),
  }
}

function IdeaMedia({ idea }: { idea: ReferenceIdea }) {
  const media = idea.media?.length ? idea.media : [idea.image].filter(Boolean)
  const [page, setPage] = useState(0)
  const hasCarousel = media.length > 1
  const image = media[page] || idea.image

  if (!hasCarousel && idea.url) {
    return <a className="idea-image-wrap" href={idea.url} target="_blank" rel="noopener noreferrer" aria-label={`查看原文：${idea.title}`}>
      <img src={image} alt="" /><span>{idea.category}</span>
    </a>
  }
  return <div className="idea-image-wrap idea-carousel">
    <img src={image} alt={`${idea.title}，第 ${page + 1} 張`} />
    <span>{idea.category}</span>
    {hasCarousel ? <>
      <button type="button" className="idea-carousel-arrow previous" aria-label="上一張圖片" onClick={() => setPage((current) => (current - 1 + media.length) % media.length)}>‹</button>
      <button type="button" className="idea-carousel-arrow next" aria-label="下一張圖片" onClick={() => setPage((current) => (current + 1) % media.length)}>›</button>
      <b className="idea-carousel-count">{page + 1}/{media.length}</b>
      <div className="idea-carousel-dots" aria-hidden="true">{media.map((url, index) => <i key={`${url}-${index}`} className={index === page ? 'active' : ''} />)}</div>
    </> : null}
  </div>
}

const bechillFilters = ['全部', '笨chill 詞典', '笨chill 任務報告', '如果笨chill 識…', 'IG Reel · 15 seconds'] as const
const eggFilters = ['全部', 'Trending 最新資訊', 'Entertainment 娛樂資訊', 'Celebrity 人物介紹', 'Travel 旅遊資訊', '兩性關係 relationship'] as const

// Bunchill has no seeded topic cards. Its library should contain only real ideas
// deliberately added to the workspace, never template or speculative placeholders.
const bechillReferenceIdeas: ReferenceIdea[] = []

const eggReferenceIdeas: ReferenceIdea[] = [
  {
    id: 'aday-police-cat-amsterdam',
    title: '阿姆斯特丹「社區警貓」有新搭檔',
    source: 'A Day Magazine · 2026.08.07',
    url: 'https://www.adaymag.com/2026/08/07/police-cat-amsterdam.html',
    image: '/topic-library/police-cat-amsterdam.jpg',
    height: 'tall',
    category: 'Trending 最新資訊',
    tags: ['動物趣聞', '阿姆斯特丹', '社群熱話'],
    note: '住在船屋的黑貓 Nimis 因穿上黃色 POLICE 救生衣巡邏而爆紅，現在更迎來黑貓妹妹 Boef，一起延續可愛的社區警貓故事。',
  },
  {
    id: 'aday-il-sonno-stone-supermarket',
    title: '米蘭期間限定「大理石超市」',
    source: 'A Day Magazine · 2026.06.19',
    url: 'https://www.adaymag.com/2026/06/19/il-sonno-stone-supermarket.html',
    image: '/topic-library/il-sonno-stone-supermarket.jpg',
    height: 'medium',
    category: 'Trending 最新資訊',
    tags: ['設計藝術', '米蘭設計週', '永續'],
    note: 'Solid Nature 與 AMO 把剩餘天然石材雕成香蕉、三明治等超市商品，以 Il Sonno Supermarket 反思快速消費與物件價值。',
  },
  {
    id: 'instagram-sleep-wind-down',
    title: '睡不着不是不夠累：睡前先讓身體慢慢關機',
    source: 'Instagram · @lilia0730000 · 2026.08.12',
    url: 'https://www.instagram.com/p/Db8Zw0qE0ay/?img_index=6',
    image: '/topic-library/sleep-wind-down.jpg',
    height: 'medium',
    category: 'Trending 最新資訊',
    tags: ['睡眠', '生活健康', '互動貼文'],
    note: '很累但仍然睡不着時，越逼自己入睡反而越清醒；可用「睡前關機」切入，再以留言關鍵字提供舒眠飲食清單。',
  },
  {
    id: 'instagram-buton-blue-eyes',
    title: '印尼布頓族罕見的藍色眼睛',
    source: 'Instagram · @moo.magazine · 2026.08.12',
    url: 'https://www.instagram.com/p/Db7ypoaj85V/?img_index=5',
    image: '/topic-library/buton-blue-eyes.jpg',
    height: 'short',
    category: 'Trending 最新資訊',
    tags: ['印尼文化', '罕見基因', '人物攝影'],
    note: '印尼布頓族部分族人因 Waardenburg Syndrome 擁有亮藍色眼睛，攝影師 Korchnoi Pasaribu 透過肖像記錄這種罕見特徵與族群故事。',
  },
  {
    id: 'instagram-spiderman-lizard',
    title: '大自然設計的「蜘蛛人蜥蜴」',
    source: 'Instagram · @moo.magazine · 2026.08.04',
    url: 'https://www.instagram.com/p/DbpxE6FD64e/',
    image: '/topic-library/spiderman-lizard.jpg',
    height: 'medium',
    category: 'Trending 最新資訊',
    tags: ['動物趣聞', '東非', '自然科普'],
    note: '東非的平頭岩蜥在繁殖季會呈現鮮紅與電光藍配色，外形酷似蜘蛛俠；雄性亦會以亮色吸引伴侶及震懾對手。',
  },
  {
    id: 'instagram-sweden-icehotel',
    title: '每年春天都會消失的瑞典 ICEHOTEL',
    source: 'Instagram · @junpin_design · 2026.07.23',
    url: 'https://www.instagram.com/p/DbvA-XZkXLX/',
    image: '/topic-library/sweden-icehotel.jpg',
    height: 'tall',
    category: 'Travel 旅遊資訊',
    tags: ['瑞典', '冰旅館', '建築設計'],
    note: '瑞典 Jukkasjärvi 的 ICEHOTEL 每年冬天以托爾訥河冰塊重建，春天再融回河流；不同藝術家每年打造全新的限定房間。',
  },
  {
    id: 'instagram-masayuki-oki-cats',
    title: '專拍貓咪失態瞬間的攝影師沖昌之',
    source: 'Instagram · @moom.cat · 2026.08.03',
    url: 'https://www.instagram.com/p/Dbk8HF7DHYn/',
    image: '/topic-library/masayuki-oki-cats.jpg',
    height: 'short',
    category: 'Celebrity 人物介紹',
    tags: ['貓咪攝影', '沖昌之', '街頭文化'],
    note: '日本攝影師沖昌之以貓的視線高度拍攝街貓，捕捉打呵欠、扭動和突發失態的真實瞬間，靠耐心建立信任後才按下快門。',
  },
  {
    id: 'instagram-three-second-rule',
    title: '食物跌落地，三秒內執起真的可以吃嗎？',
    source: 'Instagram · @wisdomkingdom_hk · 2026.06.23',
    url: 'https://www.instagram.com/p/DZ7UdWggTjd/',
    image: '/topic-library/three-second-rule.jpg',
    height: 'medium',
    category: 'Trending 最新資訊',
    tags: ['冷知識', '食物科學', '三秒定律'],
    note: '研究以不同食物、地面及接觸時間進行超過 2,500 次測試，發現細菌幾乎即時轉移；食物水分與地面材質往往比「三秒」更關鍵。',
  },
]

export default function CampaignsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('全部')
  const [activeLocation, setActiveLocation] = useState('全部地區')
  const [query, setQuery] = useState('')
  const [reactions, setReactions] = useState<Record<string, Reaction | undefined>>({})
  const [isBechillActive, setIsBechillActive] = useState(false)
  const [isEggActive, setIsEggActive] = useState(false)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [canStartContent, setCanStartContent] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [masonryColumnCount, setMasonryColumnCount] = useState(4)
  const [userIdeas, setUserIdeas] = useState<ReferenceIdea[]>([])
  const [ideaUrl, setIdeaUrl] = useState('')
  const [importingIdea, setImportingIdea] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [dismissedIdeaIds, setDismissedIdeaIds] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState<ReferenceIdea | null>(null)
  const [deletingIdea, setDeletingIdea] = useState(false)
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null)
  const [centralIdeas, setCentralIdeas] = useState<ReferenceIdea[]>([])
  const [centralFeedStatus, setCentralFeedStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    async function loadCentralTopics() {
      try {
        const feeds = await Promise.allSettled([
          fetch('https://soon-core.vercel.app/api/topics?language=zh-HK&limit=60'),
          fetch('https://egg.sooncreator.network/api/public/topics'),
        ])
        const payloads = await Promise.all(feeds.map(async (result) => {
          if (result.status !== 'fulfilled' || !result.value.ok) return [] as CentralTopic[]
          const payload = await result.value.json().catch(() => null)
          return Array.isArray(payload?.topics) ? payload.topics as CentralTopic[] : []
        }))
        const mergedTopics = Array.from(new Map(payloads.flat().map((topic) => [topic.id, topic])).values())
        if (!mergedTopics.length) throw new Error('未能載入中央題材')
        if (!cancelled) {
          setCentralIdeas(mergedTopics.map(centralTopicToIdea))
          setCentralFeedStatus('ready')
        }
      } catch (error) {
        console.error('Central topic feed unavailable', error)
        if (!cancelled) setCentralFeedStatus('error')
      }
    }
    void loadCentralTopics()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!cancelled) setWorkspaceLoading(true)
      try {
        const { activeWorkspace, workspaceId } = await resolveActiveWorkspace()
        if (!cancelled) {
          setIsBechillActive(isBechillWorkspace(activeWorkspace))
          setIsEggActive(isEggWorkspace(activeWorkspace))
          setActiveWorkspaceId(workspaceId)
          setCanStartContent(activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin')
          if (workspaceId) {
            const legacyKey = `soon-topic-library-user-ideas:${workspaceId}`
            const globalLegacyKey = 'soon-topic-library-user-ideas'
            let legacyIdeas: ReferenceIdea[] = []
            let migrationSucceeded = false
            try {
              const scoped = JSON.parse(window.localStorage.getItem(legacyKey) || '[]')
              const global = JSON.parse(window.localStorage.getItem(globalLegacyKey) || '[]')
              legacyIdeas = [...(Array.isArray(scoped) ? scoped : []), ...(Array.isArray(global) ? global : [])]
                .filter((idea, index, items) => idea?.url && items.findIndex((item) => item.url === idea.url) === index)
              if (legacyIdeas.length > 0) {
                const migrationResponses = await Promise.all(
                  legacyIdeas.map((idea) =>
                    fetch('/api/workspace-topic-ideas', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ workspaceId, idea }),
                    })
                  )
                )
                migrationSucceeded = migrationResponses.every((response) => response.ok)
                if (migrationSucceeded) {
                  window.localStorage.removeItem(legacyKey)
                  window.localStorage.removeItem(globalLegacyKey)
                }
              }
            } catch {
              migrationSucceeded = false
            }
            const ideasResponse = await fetch(
              `/api/workspace-topic-ideas?workspaceId=${encodeURIComponent(workspaceId)}`,
              { cache: 'no-store' }
            )
            const ideasPayload = await ideasResponse.json().catch(() => null)
            if (!ideasResponse.ok) throw new Error(ideasPayload?.error || '未能載入 workspace 題材')
            if (!cancelled) {
              const sharedIdeas = Array.isArray(ideasPayload?.ideas) ? ideasPayload.ideas : []
              setDismissedIdeaIds(
                Array.isArray(ideasPayload?.dismissedIdeaIds) ? ideasPayload.dismissedIdeaIds : []
              )
              setUserIdeas(
                migrationSucceeded
                  ? sharedIdeas
                  : [...sharedIdeas, ...legacyIdeas.filter((idea) => !sharedIdeas.some((shared: ReferenceIdea) => shared.url === idea.url))]
              )
            }
          } else {
            setUserIdeas([])
          }
        }
      } catch {
        if (!cancelled) {
          setIsBechillActive(false)
          setIsEggActive(false)
          setCanStartContent(false)
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

  useEffect(() => {
    function updateColumnCount() {
      const width = window.innerWidth
      setMasonryColumnCount(width <= 520 ? 1 : width <= 860 ? 2 : width <= 1180 ? 3 : 4)
    }

    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)
    return () => window.removeEventListener('resize', updateColumnCount)
  }, [])

  const centralFilters = ['全部', ...Array.from(new Set(centralIdeas.map((idea) => idea.category)))]
  const filters = workspaceLoading || centralFeedStatus === 'loading'
    ? ['全部']
    : centralFeedStatus === 'ready' ? centralFilters : ['全部']
  const baseReferenceIdeas = workspaceLoading
    ? []
    : centralFeedStatus === 'ready'
      ? centralIdeas
      : []
  const referenceIdeas = [...userIdeas, ...baseReferenceIdeas]
    .filter((idea) => !dismissedIdeaIds.includes(idea.id))
  const locations = ['全部地區', ...Array.from(new Set(referenceIdeas.flatMap((idea) => [
    ...(idea.localities || []),
    ...(idea.regions || []),
    ...(idea.countries || []),
  ])))]

  useEffect(() => {
    if (!filters.includes(activeFilter as never)) {
      setActiveFilter('全部')
    }
  }, [activeFilter, filters])

  const visibleIdeas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return referenceIdeas.filter((idea) => {
      const matchesFilter = activeFilter === '全部' || idea.category === activeFilter
      const matchesLocation = activeLocation === '全部地區' || [
        ...(idea.localities || []),
        ...(idea.regions || []),
        ...(idea.countries || []),
      ].includes(activeLocation)
      const searchable = `${idea.title} ${idea.source} ${idea.category} ${idea.tags.join(' ')} ${idea.note}`.toLowerCase()
      return matchesFilter && matchesLocation && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [activeFilter, activeLocation, query, referenceIdeas])

  function setReaction(ideaId: string, reaction: Reaction) {
    setReactions((current) => ({
      ...current,
      [ideaId]: current[ideaId] === reaction ? undefined : reaction,
    }))
  }

  async function startContentProject(idea: ReferenceIdea) {
    if (!activeWorkspaceId || creatingProjectId) return
    setCreatingProjectId(idea.id)
    setImportMessage('正在建立 Content Project…')
    try {
      const response = await fetch('/api/content-projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceName: idea.source,
          sourceNote: idea.note,
          sourceUrl: idea.url || null,
          selectedFormat: idea.format || null,
          title: idea.title,
          topicIdeaId: idea.id,
          workspaceId: activeWorkspaceId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.project?.id) throw new Error(payload?.detail || payload?.error || '未能建立內容')
      setReaction(idea.id, 'like')
      router.push(`/onboarding/content-studio?project=${encodeURIComponent(payload.project.id)}`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : '未能建立內容')
      setCreatingProjectId(null)
    }
  }

  async function importIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedUrl = ideaUrl.trim()
    if (!trimmedUrl || !activeWorkspaceId || importingIdea) return
    setImportingIdea(true)
    setImportMessage('正在讀取連結…')
    try {
      const response = await fetch('/api/topic-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      })
      const extractedIdea = await response.json()
      if (!response.ok) throw new Error(extractedIdea.error || '未能加入題材')
      const saveResponse = await fetch('/api/workspace-topic-ideas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, idea: extractedIdea }),
      })
      const savedPayload = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(savedPayload.error || '未能儲存到 workspace')
      setUserIdeas((current) => [
        savedPayload.idea as ReferenceIdea,
        ...current.filter((idea) => idea.url !== savedPayload.idea.url),
      ])
      setIdeaUrl('')
      setActiveFilter('全部')
      setImportMessage('已加入題材庫')
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : '未能加入題材')
    } finally {
      setImportingIdea(false)
    }
  }

  async function confirmDeleteIdea() {
    if (!pendingDelete || !activeWorkspaceId || deletingIdea) return
    setDeletingIdea(true)
    try {
      const response = await fetch('/api/workspace-topic-ideas', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, ideaId: pendingDelete.id, central: pendingDelete.central === true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || '未能刪除題材')
      setUserIdeas((current) => current.filter((idea) => idea.id !== pendingDelete.id))
      setDismissedIdeaIds((current) => [...current, pendingDelete.id])
      setPendingDelete(null)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : '未能刪除題材')
    } finally {
      setDeletingIdea(false)
    }
  }

  const masonryColumns = Array.from({ length: masonryColumnCount }, (_, columnIndex) =>
    visibleIdeas.filter((_, ideaIndex) => ideaIndex % masonryColumnCount === columnIndex)
  )

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="題材庫" />
      <section className="library-shell">
        <header className="library-topbar">
          <div>
            <h1>題材庫</h1>
            <span>
              {workspaceLoading || centralFeedStatus === 'loading'
                ? '正在載入 SOON 最新題材'
                : centralFeedStatus === 'error'
                  ? '中央題材暫時未能更新，現正顯示工作台已保存的內容'
                  : 'SOON 每日整理新題材，並按目前工作台的內容方向優先排列'}
            </span>
          </div>
          <form className="idea-importer" onSubmit={importIdea}>
            <label htmlFor="idea-url">加入新題材</label>
            <div>
              <input
                id="idea-url"
                type="url"
                inputMode="url"
                value={ideaUrl}
                onChange={(event) => setIdeaUrl(event.target.value)}
                placeholder="貼上 Instagram 或文章連結"
                required
              />
              <button type="submit" disabled={importingIdea}>
                {importingIdea ? '讀取中…' : '加入'}
              </button>
            </div>
            {importMessage ? <span className="idea-import-message">{importMessage}</span> : null}
          </form>
        </header>

        <section className="library-body">
          {workspaceLoading || centralFeedStatus === 'loading' ? (
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
                {locations.length > 1 ? (
                  <div className="library-locations" aria-label="地區篩選">
                    {locations.map((location) => (
                      <button type="button" key={location} className={location === activeLocation ? 'active' : ''} onClick={() => setActiveLocation(location)}>
                        {location}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                className="idea-masonry"
                style={{ gridTemplateColumns: `repeat(${masonryColumnCount}, minmax(0, 1fr))` }}
                aria-label="題材 reference"
              >
                {masonryColumns.map((column, columnIndex) => (
                  <div className="idea-column" key={`column-${columnIndex}`}>
                    {column.map((idea) => {
                      const reaction = reactions[idea.id]
                      return (
                        <article className={`idea-card ${idea.height}`} key={idea.id}>
                      <IdeaMedia idea={idea} />
                      <div className="idea-copy">
                        <p>{idea.source}</p>
                        <h2>
                          {idea.url ? (
                            <a href={idea.url} target="_blank" rel="noopener noreferrer">
                              {idea.title}
                            </a>
                          ) : idea.title}
                        </h2>
                        <span>{idea.note}</span>
                        {idea.whyNow ? <span className="idea-why-now"><b>點解值得留意：</b>{idea.whyNow}</span> : null}
                        {idea.hook ? <span className="idea-hook"><b>開場 Hook：</b>{idea.hook}</span> : null}
                        <div className="idea-tags">
                          {idea.tags.map((tag) => (
                            <em key={tag}>{tag}</em>
                          ))}
                        </div>
                        {idea.url ? (
                          <a className="idea-source-link" href={idea.url} target="_blank" rel="noopener noreferrer">
                            查看原文 ↗
                          </a>
                        ) : null}
                        <div className="idea-reactions" aria-label={`${idea.title} 客戶反應`}>
                          <button
                            type="button"
                            className={reaction === 'like' ? 'active' : ''}
                            disabled={creatingProjectId === idea.id || !canStartContent}
                            onClick={() => void startContentProject(idea)}
                            title={canStartContent ? '建立 Content Project' : '只限 Workspace Owner 或 Admin'}
                          >
                            {creatingProjectId === idea.id ? '建立中…' : canStartContent ? '喜歡' : '只限管理員'}
                          </button>
                          <button
                            type="button"
                            className="muted"
                            onClick={() => setPendingDelete(idea)}
                          >
                            不合適
                          </button>
                        </div>
                      </div>
                        </article>
                      )
                    })}
                  </div>
                ))}
              </div>

              {visibleIdeas.length === 0 ? (
                <div className="library-empty">
                  <strong>暫時未有相符題材</strong>
                  <span>可以清除搜尋或切換分類。</span>
                  {referenceIdeas.length > 0 ? (
                    <button type="button" onClick={() => { setQuery(''); setActiveFilter('全部'); setActiveLocation('全部地區') }}>
                      查看全部
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </section>

      {pendingDelete ? (
        <div className="delete-dialog-backdrop" role="presentation" onMouseDown={() => !deletingIdea && setPendingDelete(null)}>
          <section
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="delete-dialog-icon">!</div>
            <h2 id="delete-dialog-title">刪除這個題材？</h2>
            <p>「{pendingDelete.title}」會從目前 workspace 刪除，其他成員亦會看不到。</p>
            <div>
              <button type="button" onClick={() => setPendingDelete(null)} disabled={deletingIdea}>取消</button>
              <button type="button" className="danger" onClick={confirmDeleteIdea} disabled={deletingIdea}>
                {deletingIdea ? '正在刪除…' : '確認刪除'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

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

  .idea-importer {
    position: relative;
    width: min(460px, 46vw);
  }

  .idea-importer > label {
    display: block;
    color: #555961;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .idea-importer > div {
    display: grid;
    grid-template-columns: minmax(210px, 1fr) auto;
    gap: 6px;
  }

  .idea-importer input {
    min-width: 0;
    height: 36px;
    border: 1px solid #dfe1e5;
    border-radius: 9px;
    background: #f7f7f8;
    color: #202126;
    font: inherit;
    font-size: 13px;
    outline: 0;
    padding: 0 11px;
  }

  .idea-importer input:focus {
    border-color: #202126;
    background: #ffffff;
  }

  .idea-importer button {
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 0 16px;
  }

  .idea-importer button:disabled {
    cursor: wait;
    opacity: 0.58;
  }

  .idea-import-message {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    color: #555961 !important;
    font-size: 11px !important;
    white-space: nowrap;
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

  .library-locations {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 9px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .library-locations button {
    border: 1px solid #e1e3e7;
    border-radius: 999px;
    background: #ffffff;
    color: #686c74;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    padding: 6px 10px;
    white-space: nowrap;
  }

  .library-locations button.active {
    border-color: #f59e0b;
    background: #fffbeb;
    color: #92400e;
  }

  .idea-masonry {
    display: grid;
    align-items: start;
    gap: 18px;
  }

  .idea-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .idea-card {
    display: block;
    width: 100%;
    border: 1px solid #e7e8eb;
    border-radius: 12px;
    background: #ffffff;
    margin: 0;
    overflow: hidden;
    transition: transform 150ms ease, box-shadow 150ms ease;
  }

  .idea-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(18, 19, 24, 0.08);
  }

  .idea-image-wrap {
    display: block;
    position: relative;
    background: #f2f1ee;
    overflow: hidden;
  }

  .idea-image-wrap img {
    width: 100%;
    height: auto;
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

  .idea-carousel-arrow {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.72);
    color: #fff;
    cursor: pointer;
    font: 500 29px/34px system-ui, sans-serif;
    transform: translateY(-50%);
    backdrop-filter: blur(6px);
  }

  .idea-carousel-arrow:hover { background: rgba(17, 17, 17, 0.9); }
  .idea-carousel-arrow.previous { left: 10px; }
  .idea-carousel-arrow.next { right: 10px; }

  .idea-carousel-count {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 2;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.72);
    color: #fff;
    font-size: 11px;
    padding: 5px 8px;
  }

  .idea-carousel-dots {
    position: absolute;
    left: 50%;
    bottom: 10px;
    z-index: 2;
    display: flex;
    max-width: calc(100% - 24px);
    gap: 4px;
    transform: translateX(-50%);
  }

  .idea-carousel-dots i {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  }

  .idea-carousel-dots i.active { width: 16px; background: #fff; }

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

  .idea-copy h2 a {
    color: inherit;
    text-decoration: none;
  }

  .idea-copy h2 a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .idea-copy > span {
    display: block;
    margin-top: 8px;
    color: #5d616a;
    font-size: 12px;
    line-height: 1.45;
  }

  .idea-copy .idea-why-now {
    border-radius: 9px;
    background: #fffbeb;
    color: #78350f;
    padding: 8px 9px;
  }

  .idea-copy .idea-hook {
    color: #34363c;
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

  .idea-source-link {
    display: inline-block;
    margin-top: 12px;
    color: #34373e;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }

  .idea-source-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .idea-reactions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .idea-reactions button.muted:hover {
    border-color: #d92d20;
    color: #b42318;
  }

  .delete-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(17, 17, 17, 0.48);
    backdrop-filter: blur(5px);
  }

  .delete-dialog {
    width: min(100%, 420px);
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
    color: #202126;
    padding: 24px;
    text-align: center;
  }

  .delete-dialog-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin: 0 auto 14px;
    background: #fff1f0;
    color: #b42318;
    font-size: 22px;
    font-weight: 800;
  }

  .delete-dialog h2 {
    margin: 0;
    font-size: 20px;
  }

  .delete-dialog p {
    margin: 10px 0 22px;
    color: #686c74;
    font-size: 14px;
    line-height: 1.55;
  }

  .delete-dialog > div:last-child {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .delete-dialog button {
    min-height: 42px;
    border: 1px solid #dfe1e5;
    border-radius: 10px;
    background: #ffffff;
    color: #34373e;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
  }

  .delete-dialog button.danger {
    border-color: #d92d20;
    background: #d92d20;
    color: #ffffff;
  }

  .delete-dialog button:disabled {
    cursor: wait;
    opacity: 0.6;
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

  @media (max-width: 860px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .library-topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 16px 18px;
    }

    .idea-importer {
      width: 100%;
    }

    .idea-importer > div {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .library-body {
      padding: 16px 14px 32px;
    }

    .idea-masonry,
    .idea-column {
      gap: 12px;
    }

    .idea-card {
      border-radius: 10px;
    }

    .idea-copy h2 {
      font-size: 15px;
    }

    .idea-reactions {
      grid-template-columns: 1fr;
    }
  }

`
