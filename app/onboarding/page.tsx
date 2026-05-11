'use client'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'

const upcomingPosts = [
  {
    id: '1',
    type: '靜態圖片',
    typeKind: 'image',
    title: '差點沒拍下來的片段',
    body: '最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。',
    time: '今天 10:00',
    image: '/photo-control/coffee-full-freedom.jpg',
    status: '新內容',
  },
  {
    id: '2',
    type: '文章',
    typeKind: 'article',
    title: '一個簡單房間，幾段短片，突然就值得重播',
    body: '和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。',
    time: '今天 14:00',
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    status: '新內容',
  },
  {
    id: '3',
    type: '短影片',
    typeKind: 'video',
    title: '今天值得留下的一秒',
    body: '晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。',
    time: '今天 18:00',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    status: '草稿',
  },
]

const campaigns = [
  {
    id: '1',
    name: 'Moms, Memories, and Moments That Matter',
    type: '生活內容',
    timing: '5月10日 - 5月16日',
    status: '今日生成中',
    statusKind: 'generating',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
  },
  {
    id: '2',
    name: '差點沒拍下來的片段',
    type: '分享日常',
    timing: '5月1日 - 5月8日',
    status: '已完成',
    statusKind: 'done',
    image: '/photo-control/coffee-full-freedom.jpg',
  },
]

const upNext = [
  {
    icon: '↯',
    title: '連接你的帳戶',
    desc: '連接後 SOON 可以自動按排程發布你的內容',
    cta: '立即連接',
  },
  {
    icon: '◎',
    title: '設定 SEO 計劃',
    desc: '選擇關鍵詞，自動生成 SEO 內容集群',
    cta: '開始設定',
  },
  {
    icon: '▻',
    title: '試試短影片',
    desc: '上傳素材，SOON 自動剪輯成短片',
    cta: '了解更多',
  },
]

export default function OnboardingHomePage() {
  return (
    <main className="dashboard-page">
      <DashboardSidebar activeItem="首頁" />

      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar-left">
            <h1>歡迎回來，Tommy</h1>
          </div>
          <div className="home-topbar-right">
            <span className="credits-badge">✦ 180 Credits</span>
            <button type="button" className="upgrade-button">
              升級
            </button>
          </div>
        </header>

        <div className="connect-banner">
          <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
          <button type="button">連接</button>
        </div>

        <div className="home-body">
          <section className="home-main">
            <section className="home-section">
              <div className="home-section-head">
                <h2>即將發布</h2>
                <div className="home-section-actions">
                  <button type="button">查看全部內容</button>
                  <button type="button" className="home-create-btn">
                    ＋ 建立
                  </button>
                </div>
              </div>

              <div className="upcoming-posts-list">
                {upcomingPosts.map((post) => (
                  <article key={post.id} className="upcoming-post-row">
                    <div className="upcoming-post-img">
                      <img src={post.image} alt="" />
                    </div>
                    <div className="upcoming-post-content">
                      <div className="upcoming-post-meta">
                        <span className={`post-type-badge ${post.typeKind}`}>{post.type}</span>
                        <span className="upcoming-post-time">{post.time}</span>
                        <span className={`post-status-badge ${post.status === '草稿' ? 'draft' : 'new'}`}>
                          {post.status}
                        </span>
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.body}</p>
                    </div>
                    <div className="upcoming-post-actions">
                      <button type="button">編輯</button>
                      <button type="button" aria-label="更多操作">
                        ⋯
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="home-section">
              <div className="home-section-head">
                <h2>宣傳活動</h2>
                <button type="button">查看全部活動</button>
              </div>
              <div className="campaigns-table">
                <div className="campaigns-table-head">
                  <span>活動</span>
                  <span>時間</span>
                  <span>狀態</span>
                  <span />
                </div>
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="campaign-row">
                    <div className="campaign-info">
                      <img src={campaign.image} alt="" className="campaign-thumb" />
                      <div>
                        <strong>{campaign.name}</strong>
                        <span>🎯 {campaign.type}</span>
                      </div>
                    </div>
                    <span className="campaign-timing">{campaign.timing}</span>
                    <span className={`campaign-status ${campaign.statusKind}`}>{campaign.status}</span>
                    <button type="button" className="campaign-arrow" aria-label="查看活動">
                      ›
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="home-aside">
            <section className="home-aside-section">
              <h3>過去 7 天</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">0</span>
                  <span className="stat-label">已發布貼文</span>
                </div>
              </div>
              <p className="stats-hint">連接帳戶後即可查看數據分析</p>
            </section>

            <section className="home-aside-section">
              <h3>下一步</h3>
              <div className="up-next-list">
                {upNext.map((item) => (
                  <div key={item.title} className="up-next-item">
                    <div className="up-next-icon">{item.icon}</div>
                    <div className="up-next-content">
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                      <button type="button">{item.cta} →</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${homeStyles}` }} />
    </main>
  )
}

const homeStyles = `
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

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .home-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar-left h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .home-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .credits-badge {
    font-size: 14px;
    color: #202126;
  }

  .upgrade-button {
    border: 1px solid #7c3aed;
    border-radius: 9px;
    background: #ffffff;
    color: #7c3aed;
    font: inherit;
    font-size: 14px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .connect-banner {
    min-height: 46px;
    background: #fff7e8;
    border-bottom: 1px solid #f5e5c7;
    color: #4d4030;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
    font-size: 14px;
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .home-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
    padding: 28px 20px 60px;
    gap: 28px;
  }

  .home-main {
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .home-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .home-section-head h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
  }

  .home-section-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .home-section-head button,
  .home-section-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 12px;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .home-section-head button:hover,
  .home-section-actions button:hover {
    background: #f5f5f7;
  }

  .home-create-btn {
    background: #111111 !important;
    color: #ffffff !important;
    border-color: #111111 !important;
  }

  .upcoming-posts-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .upcoming-post-row {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    padding: 14px;
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    background: #ffffff;
    transition: box-shadow 150ms ease, border-color 150ms ease;
    cursor: pointer;
  }

  .upcoming-post-row:hover {
    border-color: #c8c9ce;
    box-shadow: 0 4px 16px rgba(32, 33, 38, 0.06);
  }

  .upcoming-post-img {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .upcoming-post-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .upcoming-post-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .upcoming-post-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .post-type-badge {
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .post-type-badge::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type-badge.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-type-badge.video::before {
    content: '▶';
    color: #7c3aed;
  }

  .upcoming-post-time {
    font-size: 12px;
    color: #6f737d;
  }

  .post-status-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 600;
  }

  .post-status-badge.new {
    background: #7c3aed;
    color: #ffffff;
  }

  .post-status-badge.draft {
    background: #f1f2f4;
    color: #6f737d;
  }

  .upcoming-post-content h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .upcoming-post-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .upcoming-post-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .upcoming-post-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 7px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    padding: 5px 9px;
    cursor: pointer;
    transition: background 150ms;
  }

  .upcoming-post-actions button:hover {
    background: #f5f5f7;
  }

  .campaigns-table {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .campaigns-table-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 10px 16px;
    background: #f8f8f9;
    border-bottom: 1px solid #e8e9ec;
    font-size: 12px;
    font-weight: 600;
    color: #6f737d;
  }

  .campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid #f0f1f3;
    transition: background 150ms;
    cursor: pointer;
  }

  .campaign-row:last-child {
    border-bottom: none;
  }

  .campaign-row:hover {
    background: #fafafa;
  }

  .campaign-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .campaign-thumb {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .campaign-info strong {
    display: block;
    font-size: 13px;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-info span,
  .campaign-timing {
    font-size: 12px;
    color: #6f737d;
  }

  .campaign-status {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .campaign-status.generating {
    background: #fef3c7;
    color: #92400e;
  }

  .campaign-status.done {
    background: #d1fae5;
    color: #065f46;
  }

  .campaign-arrow {
    border: 0;
    background: transparent;
    color: #9a9da4;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
  }

  .home-aside {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .home-aside-section {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .home-aside-section h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 650;
  }

  .stats-grid {
    display: flex;
    gap: 16px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #202126;
  }

  .stat-label,
  .stats-hint {
    font-size: 12px;
    color: #6f737d;
  }

  .stats-hint {
    margin: 0;
    color: #9a9da4;
    line-height: 1.4;
  }

  .up-next-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .up-next-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .up-next-icon {
    font-size: 18px;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f5f7;
    border-radius: 8px;
  }

  .up-next-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .up-next-content strong {
    font-size: 13px;
    font-weight: 650;
  }

  .up-next-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
  }

  .up-next-content button {
    width: fit-content;
    border: 0;
    background: transparent;
    color: #7c3aed;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
    margin-top: 2px;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .home-body {
      grid-template-columns: 1fr;
    }

    .campaigns-table-head,
    .campaign-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`
