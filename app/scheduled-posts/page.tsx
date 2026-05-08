'use client'

import { useMemo, useState } from 'react'

type ScheduledPost = {
  id: string
  type: '靜態圖片' | '文章' | '短影片'
  time: string
  title: string
  body: string
  image: string
  status: '新內容' | '草稿'
}

type TopicReference = {
  id: string
  image: string
}

type PreviewChannel = 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'Google'

type ChannelCaption = {
  id: PreviewChannel
  label: string
  icon: string
  note: string
  limit: number
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' rx='18' fill='%23f3f4f6'/%3E%3Cpath d='M92 142l44-47 34 36 18-21 40 32H92z' fill='%23d9dde4'/%3E%3Ccircle cx='220' cy='76' r='18' fill='%23c8ced8'/%3E%3Crect x='88' y='58' width='144' height='104' rx='12' fill='none' stroke='%23c5cbd5' stroke-width='4'/%3E%3Ctext x='160' y='190' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%238b929e'%3E參考圖片%3C/text%3E%3C/svg%3E"

const FALLBACK_IMAGES = [
  '/photo-control/coffee-full-freedom.jpg',
  '/assets/content-strategies/photos/behind-the-scenes.jpg',
  '/assets/content-strategies/photos/lifestyle-content.jpg',
]

const CHANNELS: ChannelCaption[] = [
  {
    id: 'Instagram',
    label: 'Instagram',
    icon: 'IG',
    note: '輕鬆、口語、有畫面感，適合加 emoji 和短句。',
    limit: 2200,
  },
  {
    id: 'Facebook',
    label: 'Facebook',
    icon: 'f',
    note: '較完整、親切，適合補充故事背景並鼓勵留言。',
    limit: 33000,
  },
  {
    id: 'LinkedIn',
    label: 'LinkedIn',
    icon: 'in',
    note: '專業但有人味，聚焦品牌觀點、價值和啟發。',
    limit: 3000,
  },
  {
    id: 'X',
    label: 'X / Twitter',
    icon: 'X',
    note: '短促、有 hook，可以更直接或帶一點玩味。',
    limit: 280,
  },
  {
    id: 'Google',
    label: 'Google Business',
    icon: 'G',
    note: '清晰、在地、偏向更新消息和行動提示。',
    limit: 1500,
  },
]

function readTopicImages() {
  if (typeof window === 'undefined') return FALLBACK_IMAGES
  try {
    const raw = window.sessionStorage.getItem('soon-topic-review-v1')
    const topics = raw ? (JSON.parse(raw) as TopicReference[]) : []
    const images = topics
      .map((topic) => topic.image)
      .filter((image) => image && image !== PLACEHOLDER_IMAGE)
    return images.length ? images : FALLBACK_IMAGES
  } catch {
    return FALLBACK_IMAGES
  }
}

function buildScheduledPosts(images: string[]): ScheduledPost[] {
  return [
    {
      id: 'still-1000',
      type: '靜態圖片',
      time: '10:00',
      title: '差點沒拍下來的片段',
      body: '最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。',
      image: images[0] || FALLBACK_IMAGES[0],
      status: '新內容',
    },
    {
      id: 'blog-1400',
      type: '文章',
      time: '14:00',
      title: '一個簡單房間，幾段短片，突然就值得重播',
      body: '和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。',
      image: images[1] || FALLBACK_IMAGES[1],
      status: '新內容',
    },
    {
      id: 'short-1800',
      type: '短影片',
      time: '18:00',
      title: '今天值得留下的一秒',
      body: '晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。',
      image: images[2] || FALLBACK_IMAGES[2],
      status: '草稿',
    },
  ]
}

export default function ScheduledPostsPage() {
  const [compact, setCompact] = useState(false)
  const scheduledPosts = useMemo(() => buildScheduledPosts(readTopicImages()), [])
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>('Instagram')
  const [captions, setCaptions] = useState<Record<string, Partial<Record<PreviewChannel, string>>>>({})
  const [draftCaptions, setDraftCaptions] = useState<Partial<Record<PreviewChannel, string>>>({})
  const [captionModalOpen, setCaptionModalOpen] = useState(false)

  const openCaptionModal = (post: ScheduledPost) => {
    const currentCaptions = captions[post.id] || {}
    setDraftCaptions(
      CHANNELS.reduce<Partial<Record<PreviewChannel, string>>>((draft, channel) => {
        draft[channel.id] = currentCaptions[channel.id] || post.body
        return draft
      }, {})
    )
    setCaptionModalOpen(true)
  }

  const saveCaptionDrafts = () => {
    if (!selectedPost) return
    setCaptions((current) => ({
      ...current,
      [selectedPost.id]: {
        ...current[selectedPost.id],
        ...draftCaptions,
      },
    }))
    setCaptionModalOpen(false)
  }

  const selectedCaption =
    selectedPost ? captions[selectedPost.id]?.[previewChannel] || selectedPost.body : ''

  if (selectedPost) {
    return (
      <main className="post-editor-page">
        <header className="editor-topbar">
          <div className="editor-post-title">
            <button type="button" onClick={() => setSelectedPost(null)} aria-label="返回日曆">
              ←
            </button>
            <span className={selectedPost.type === '文章' ? 'post-type article' : 'post-type image'}>
              {selectedPost.title}
            </span>
            <strong>需要連接帳戶</strong>
          </div>

          <div className="editor-top-actions">
            <button type="button" disabled>
              上一個
            </button>
            <button type="button">下一個 ›</button>
            <span>✦ 180 Credits</span>
            <button type="button" className="upgrade-button">升級</button>
          </div>
        </header>

        <section className="editor-shell">
          <aside className="ai-improve-panel">
            <div className="improve-copy">
              <p>SOON 可以這樣改善這則貼文：</p>
              <ol>
                <li><strong>更改相片內容：</strong>「在背景加入人物，令場景更豐富」</li>
                <li><strong>調整背景：</strong>「將背景換成現代辦公室」</li>
                <li><strong>更改文字疊加：</strong>「將標題放大並移到頂部」</li>
                <li><strong>修改顏色：</strong>「令整體配色更鮮明」</li>
                <li><strong>修改品牌：</strong>「將我的 logo 加到右下角」</li>
              </ol>
              <p>你想怎樣調整？</p>
            </div>

            <form className="ai-command-box">
              <textarea placeholder="要求 SOON 修改這則貼文..." />
              <div>
                <label aria-label="附加檔案">
                  <input type="file" />
                  <span>附件</span>
                </label>
                <button type="button" aria-label="送出要求">↑</button>
              </div>
            </form>
          </aside>

          <section className="preview-stage" aria-label="貼文預覽">
            <div className="view-switcher" aria-label="預覽平台">
              <span>預覽</span>
              {[
                ['Instagram', 'IG'],
                ['Facebook', 'FB'],
                ['LinkedIn', 'in'],
                ['X', 'X'],
                ['Google', 'G'],
              ].map(([channel, label]) => (
                <button
                  className={previewChannel === channel ? 'active' : ''}
                  key={channel}
                  onClick={() => setPreviewChannel(channel as PreviewChannel)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <article className={`phone-preview ${previewChannel.toLowerCase()}`}>
              <header>
                <div className="avatar">S</div>
                <strong>{previewChannel === 'Instagram' ? 'soon_log' : 'SOON-LOG'}</strong>
                <span>尚未連接帳戶</span>
              </header>
              <div className="phone-image">
                <img src={selectedPost.image} alt="" />
                <div className="phone-overlay">
                  <strong>{selectedPost.title}</strong>
                  <span>{selectedPost.type}</span>
                </div>
              </div>
              <div className="phone-actions">
                <span>♡</span>
                <span>○</span>
                <span>⌲</span>
                <button type="button" onClick={() => openCaptionModal(selectedPost)}>編輯 caption</button>
              </div>
              <p>
                <strong>SOON-LOG</strong> {selectedCaption}
              </p>
            </article>

            <div className="result-actions">
              <span>你喜歡這個結果嗎？</span>
              <button type="button">不喜歡</button>
              <button type="button">喜歡</button>
              <button type="button" onClick={() => setSelectedPost(null)}>關閉</button>
            </div>
          </section>

          <aside className="post-settings-panel">
            <section>
              <p>發布時間</p>
              <button type="button">2026年5月8日 {selectedPost.time} ⌄</button>
            </section>

            <section>
              <p>發布到</p>
              {['Instagram', 'Facebook', 'LinkedIn', 'X / Twitter', 'Google Business'].map((channel) => (
                <button className={channel === 'Instagram' ? 'connected-channel' : ''} key={channel} type="button">
                  <span>{channel}</span>
                  <em>{channel === 'Instagram' ? '連接' : '＋'}</em>
                </button>
              ))}
            </section>

            <section>
              <p>宣傳活動</p>
              <strong>分享你的日常，建立真實連繫</strong>
              <span>生活內容</span>
            </section>

            <section>
              <p>快速編輯</p>
              <button type="button" onClick={() => openCaptionModal(selectedPost)}>調整 caption</button>
              <button type="button">編輯設計</button>
            </section>

            <section>
              <p>重新設計</p>
              <button type="button">重新生成設計</button>
              <button type="button">更換媒體</button>
            </section>
          </aside>
        </section>

        {captionModalOpen ? (
          <div className="caption-modal-backdrop" role="presentation">
            <section className="caption-modal" role="dialog" aria-modal="true" aria-label="編輯 caption">
              <header>
                <div>
                  <h2>編輯 Caption</h2>
                  <p>為不同平台調整同一則貼文的語氣。儲存後，預覽會即時更新。</p>
                </div>
                <button type="button" onClick={() => setCaptionModalOpen(false)} aria-label="關閉">
                  ×
                </button>
              </header>

              <div className="caption-grid">
                {CHANNELS.map((channel) => {
                  const value = draftCaptions[channel.id] || ''
                  return (
                    <article className="caption-column" key={channel.id}>
                      <div className="caption-channel-head">
                        <span>{channel.icon}</span>
                        <strong>{channel.label}</strong>
                        <button type="button">連接</button>
                      </div>
                      <p>{channel.note}</p>
                      <button className="caption-regenerate" type="button" aria-label={`重新生成 ${channel.label} caption`}>
                        ↻
                      </button>
                      <textarea
                        value={value}
                        onChange={(event) =>
                          setDraftCaptions((current) => ({
                            ...current,
                            [channel.id]: event.target.value,
                          }))
                        }
                      />
                      <small>
                        字數：{value.length}/{channel.limit}
                      </small>
                    </article>
                  )
                })}
              </div>

              <footer>
                <button type="button" onClick={() => setCaptionModalOpen(false)}>
                  取消
                </button>
                <button type="button" onClick={saveCaptionDrafts}>
                  儲存 Caption
                </button>
              </footer>
            </section>
          </div>
        ) : null}

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="workspace-switcher">
          <div className="workspace-mark">S</div>
          <strong>Tommy 的工作台</strong>
          <span>⌄</span>
        </div>

        <nav className="sidebar-nav" aria-label="工作台導覽">
          {[
            ['⌂', '首頁'],
            ['▣', '日曆'],
            ['▱', '宣傳活動'],
            ['↯', '整合', '0/4'],
            ['✤', '品牌素材庫'],
            ['☷', '內容偏好'],
            ['✓', '審批'],
            ['▥', '洞察'],
          ].map(([icon, label, meta]) => (
            <a className={label === '日曆' ? 'active' : ''} href="#" key={label}>
              <span>{icon}</span>
              <strong>{label}</strong>
              {meta ? <em>{meta}</em> : null}
            </a>
          ))}
        </nav>

        <div className="sidebar-group">
          <p>觸及</p>
          <a href="#">Ⓜ Meta Ads</a>
          <a href="#">SEO</a>
        </div>

        <div className="sidebar-footer">
          <a href="#">＋ 建立新項目</a>
          <a href="#">邀請團隊成員</a>
          <a href="#">幫助與學習</a>
        </div>
      </aside>

      <section className="calendar-shell">
        <header className="calendar-topbar">
          <div className="calendar-title">
            <h1>日曆</h1>
            <button type="button" aria-label="上一日">‹</button>
            <button type="button">今天</button>
            <button type="button" aria-label="下一日">›</button>
            <strong>5月8日</strong>
          </div>

          <div className="calendar-actions">
            <button type="button">＋ 建立</button>
            <button type="button">↻ 重新生成</button>
            <button type="button">⌁ 改善</button>
            <button type="button" onClick={() => setCompact((value) => !value)}>
              {compact ? '展開' : '緊湊'} ⌄
            </button>
            <span>✦ 180 Credits</span>
            <button type="button" className="upgrade-button">升級</button>
          </div>
        </header>

        <div className="connect-banner">
          <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
          <button type="button">連接</button>
        </div>

        <div className="calendar-date-pill">5月8日 星期五</div>

        <section className={compact ? 'schedule-column compact' : 'schedule-column'} aria-label="今日排程">
          {scheduledPosts.map((post) => (
            <article className="post-card" key={post.id} onClick={() => setSelectedPost(post)}>
              <div className="post-card-head">
                <span className={post.type === '文章' ? 'post-type article' : 'post-type image'}>{post.type}</span>
                <strong>{post.time}</strong>
              </div>
              <p className="post-preview">{post.body}</p>
              <div className="post-image-wrap">
                <img src={post.image} alt="" />
                <span>{post.status}</span>
              </div>
              <div className="post-copy">
                <h2>{post.title}</h2>
                <p>{post.body}</p>
              </div>
            </article>
          ))}
        </section>
      </section>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

const styles = `
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

  .sidebar {
    min-height: 100vh;
    border-right: 1px solid #e6e7ea;
    background: #f2f3f5;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .workspace-switcher {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 6px 18px;
    border-bottom: 1px solid #e2e3e6;
  }

  .workspace-mark {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #ffd946;
    color: #111111;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 13px;
  }

  .workspace-switcher strong {
    font-size: 14px;
    font-weight: 550;
  }

  .workspace-switcher span {
    color: #9a9da4;
  }

  .sidebar-nav,
  .sidebar-group,
  .sidebar-footer {
    display: grid;
    gap: 5px;
  }

  .sidebar-nav a,
  .sidebar-group a,
  .sidebar-footer a {
    min-height: 34px;
    border-radius: 9px;
    color: #6f7278;
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    text-decoration: none;
    font-size: 14px;
  }

  .sidebar-nav a.active {
    background: #e5e7eb;
    color: #202126;
  }

  .sidebar-nav strong {
    font-weight: 500;
  }

  .sidebar-nav em {
    color: #9b9ea6;
    font-style: normal;
  }

  .sidebar-group p {
    margin: 8px 10px 4px;
    color: #9a9da4;
    font-size: 12px;
  }

  .sidebar-footer {
    margin-top: auto;
    border-top: 1px solid #e2e3e6;
    padding-top: 12px;
  }

  .calendar-shell {
    min-width: 0;
    background: #ffffff;
  }

  .calendar-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 18px;
  }

  .calendar-title,
  .calendar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .calendar-title h1 {
    margin: 0 8px 0 0;
    font-size: 18px;
    font-weight: 650;
  }

  .calendar-title button,
  .calendar-actions button {
    border: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .calendar-title strong {
    font-size: 15px;
    font-weight: 550;
  }

  .calendar-actions span {
    font-size: 14px;
  }

  .calendar-actions .upgrade-button {
    border: 1px solid #e2d8ff;
    border-radius: 8px;
    color: #7c3aed;
    padding: 7px 11px;
  }

  .connect-banner {
    min-height: 48px;
    background: #fff7e8;
    border-bottom: 1px solid #efe3cc;
    color: #4c453b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 18px;
    font-size: 14px;
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 8px 14px;
    cursor: pointer;
  }

  .calendar-date-pill {
    width: fit-content;
    margin: 16px auto 14px;
    border-radius: 8px;
    background: #f2f3f5;
    color: #202126;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 650;
  }

  .schedule-column {
    width: min(100%, 320px);
    margin: 0 auto 80px;
    display: grid;
    gap: 10px;
  }

  .schedule-column.compact {
    width: min(100%, 280px);
  }

  .post-card {
    border: 2px solid #d946ef;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .post-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 34px rgba(32, 33, 38, 0.12);
  }

  .post-card-head {
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    border-bottom: 1px solid #ececef;
  }

  .post-type {
    color: #202126;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .post-type::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-card-head strong {
    font-size: 13px;
    font-weight: 550;
  }

  .post-preview {
    margin: 0;
    padding: 10px;
    color: #45474e;
    font-size: 13px;
    line-height: 1.35;
  }

  .post-image-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #f1f1f1;
    overflow: hidden;
  }

  .post-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-image-wrap span {
    position: absolute;
    left: 8px;
    bottom: 8px;
    border-radius: 6px;
    background: #d946ef;
    color: #ffffff;
    padding: 3px 7px;
    font-size: 12px;
  }

  .post-copy {
    padding: 12px;
  }

  .post-copy h2 {
    margin: 0;
    color: #202126;
    font-size: 21px;
    line-height: 1.05;
    font-weight: 850;
  }

  .post-copy p {
    margin: 10px 0 0;
    color: #555861;
    font-size: 12px;
    line-height: 1.42;
  }

  .schedule-column.compact .post-preview,
  .schedule-column.compact .post-copy p {
    display: none;
  }

  .post-editor-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
  }

  .editor-topbar {
    height: 58px;
    border-bottom: 1px solid #e7e8eb;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 14px;
  }

  .editor-post-title,
  .editor-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .editor-post-title button,
  .editor-top-actions button,
  .post-settings-panel button,
  .result-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .editor-post-title .post-type {
    max-width: min(42vw, 420px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 650;
  }

  .editor-post-title strong {
    border-radius: 7px;
    background: #fee2e2;
    color: #c2410c;
    padding: 7px 10px;
    font-size: 13px;
  }

  .editor-top-actions button:disabled {
    color: #b9bbc2;
    cursor: default;
  }

  .editor-top-actions .upgrade-button {
    color: #7c3aed;
    border-color: #e3d8ff;
  }

  .editor-shell {
    min-height: calc(100vh - 58px);
    display: grid;
    grid-template-columns: 340px minmax(420px, 1fr) 300px;
  }

  .ai-improve-panel,
  .post-settings-panel {
    background: #ffffff;
    border-right: 1px solid #e7e8eb;
    padding: 24px 18px;
  }

  .post-settings-panel {
    border-right: 0;
    border-left: 1px solid #e7e8eb;
    display: grid;
    align-content: start;
    gap: 18px;
  }

  .improve-copy {
    min-height: calc(100vh - 230px);
    display: grid;
    align-content: center;
    gap: 22px;
  }

  .improve-copy p {
    margin: 0;
    color: #292b31;
    font-size: 17px;
    line-height: 1.45;
  }

  .improve-copy ol {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 14px;
    color: #292b31;
    font-size: 16px;
    line-height: 1.55;
  }

  .improve-copy strong {
    font-weight: 780;
  }

  .ai-command-box {
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 36px rgba(32, 33, 38, 0.08);
    overflow: hidden;
  }

  .ai-command-box textarea {
    width: 100%;
    min-height: 82px;
    border: 0;
    resize: none;
    padding: 16px;
    color: #202126;
    background: transparent;
    font: inherit;
    font-size: 14px;
    outline: 0;
  }

  .ai-command-box div {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 10px;
  }

  .ai-command-box input {
    display: none;
  }

  .ai-command-box label span,
  .ai-command-box button {
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #5f636d;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .ai-command-box button {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    padding: 0;
  }

  .preview-stage {
    position: relative;
    display: grid;
    place-items: center;
    padding: 42px 24px 92px;
  }

  .view-switcher {
    position: absolute;
    left: max(20px, calc(50% - 310px));
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    gap: 9px;
    justify-items: center;
  }

  .view-switcher span {
    color: #979aa2;
    font-size: 13px;
  }

  .view-switcher button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e1e3e8;
    background: #ffffff;
    color: #3f424a;
    font-weight: 750;
    cursor: pointer;
  }

  .view-switcher button.active {
    border-color: #202126;
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #202126;
  }

  .phone-preview {
    width: 280px;
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    box-shadow: 0 24px 60px rgba(32, 33, 38, 0.16);
    overflow: hidden;
  }

  .phone-preview header {
    min-height: 48px;
    display: grid;
    grid-template-columns: 28px 1fr;
    column-gap: 9px;
    align-items: center;
    padding: 10px 14px;
  }

  .phone-preview header strong,
  .phone-preview header span {
    grid-column: 2;
    line-height: 1.1;
  }

  .phone-preview header strong {
    font-size: 13px;
    font-weight: 750;
  }

  .phone-preview header span {
    color: #979aa2;
    font-size: 11px;
  }

  .avatar {
    grid-row: 1 / 3;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f0eef7;
    color: #9f7aea;
    display: grid;
    place-items: center;
    font-weight: 850;
  }

  .phone-image {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #eceef2;
  }

  .phone-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .phone-overlay {
    position: absolute;
    inset: auto 18px 18px;
    color: #ffffff;
    text-shadow: 0 3px 16px rgba(0, 0, 0, 0.45);
    display: grid;
    gap: 6px;
  }

  .phone-overlay strong {
    max-width: 210px;
    font-size: 25px;
    line-height: 0.95;
    font-weight: 900;
  }

  .phone-overlay span {
    width: fit-content;
    border-radius: 6px;
    background: #d946ef;
    padding: 4px 7px;
    font-size: 11px;
    font-weight: 750;
  }

  .phone-actions {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 8px 14px;
  }

  .phone-actions span {
    font-size: 23px;
    line-height: 1;
  }

  .phone-actions button {
    margin-left: auto;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    padding: 7px 9px;
  }

  .phone-preview p {
    margin: 0;
    padding: 0 14px 18px;
    color: #464952;
    font-size: 13px;
    line-height: 1.35;
  }

  .phone-preview.facebook,
  .phone-preview.linkedin {
    width: 360px;
    border-radius: 14px;
  }

  .phone-preview.x,
  .phone-preview.google {
    width: 330px;
    border-radius: 18px;
  }

  .result-actions {
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 20px 50px rgba(32, 33, 38, 0.14);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    white-space: nowrap;
  }

  .result-actions span {
    font-size: 14px;
  }

  .post-settings-panel section {
    border-bottom: 1px solid #e7e8eb;
    padding-bottom: 16px;
    display: grid;
    gap: 8px;
  }

  .post-settings-panel p {
    margin: 0;
    color: #9a9da4;
    font-size: 14px;
  }

  .post-settings-panel section > strong {
    color: #2f3138;
    font-size: 14px;
    line-height: 1.35;
  }

  .post-settings-panel section > span {
    color: #7b7f88;
    font-size: 13px;
  }

  .post-settings-panel button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .post-settings-panel .connected-channel {
    background: #f6f7f9;
    border-color: #dee0e5;
  }

  .post-settings-panel em {
    color: #8a8d95;
    font-style: normal;
  }

  .caption-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(247, 248, 250, 0.72);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 28px;
  }

  .caption-modal {
    width: min(1180px, 100%);
    max-height: min(760px, calc(100vh - 56px));
    border-radius: 18px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 28px 90px rgba(32, 33, 38, 0.24);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
  }

  .caption-modal header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
    padding: 32px 36px 18px;
  }

  .caption-modal h2 {
    margin: 0;
    color: #17181c;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 650;
  }

  .caption-modal header p {
    margin: 10px 0 0;
    color: #70737c;
    font-size: 14px;
    line-height: 1.45;
  }

  .caption-modal header > button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .caption-grid {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(260px, 1fr);
    gap: 18px;
    padding: 10px 36px 24px;
  }

  .caption-column {
    min-width: 260px;
    display: grid;
    grid-template-rows: auto auto auto minmax(260px, 1fr) auto;
    gap: 10px;
  }

  .caption-channel-head {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    align-items: center;
    gap: 10px;
  }

  .caption-channel-head span {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #f2f3f6;
    color: #2864dc;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 850;
  }

  .caption-column:nth-child(1) .caption-channel-head span {
    color: #ffffff;
    background: linear-gradient(135deg, #f97316, #ec4899, #7c3aed);
  }

  .caption-column:nth-child(4) .caption-channel-head span {
    color: #ffffff;
    background: #111111;
  }

  .caption-column:nth-child(5) .caption-channel-head span {
    color: #4285f4;
    background: #ffffff;
    border: 1px solid #e1e3e8;
  }

  .caption-channel-head strong {
    font-size: 17px;
    font-weight: 650;
  }

  .caption-channel-head button {
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .caption-column p {
    min-height: 44px;
    margin: 0;
    color: #676a73;
    font-size: 13px;
    line-height: 1.35;
  }

  .caption-regenerate {
    justify-self: end;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font-size: 18px;
    cursor: pointer;
  }

  .caption-column textarea {
    width: 100%;
    min-height: 280px;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #2b2d34;
    padding: 14px;
    resize: none;
    outline: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1.35;
  }

  .caption-column textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .caption-column small {
    justify-self: end;
    color: #70737c;
    font-size: 12px;
  }

  .caption-modal footer {
    min-height: 66px;
    border-top: 1px solid #eef0f3;
    background: rgba(255, 255, 255, 0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 24px;
  }

  .caption-modal footer button {
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 15px;
    padding: 10px 14px;
    cursor: pointer;
  }

  .caption-modal footer button:last-child {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  @media (max-width: 700px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .calendar-topbar,
    .calendar-actions {
      flex-wrap: wrap;
    }

    .editor-shell {
      grid-template-columns: 1fr;
    }

    .view-switcher {
      position: static;
      transform: none;
      display: flex;
      margin-bottom: 16px;
    }

    .post-settings-panel {
      border-left: 0;
    }
  }
`
