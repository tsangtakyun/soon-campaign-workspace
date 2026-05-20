import Link from 'next/link'

import { createAdminSupabase } from '@/lib/server-supabase'

type ApprovalPost = {
  id: string
  title?: string
  caption?: string
  body?: string
  image_url?: string
  image?: string
  platform?: string
  status?: string
  scheduled_at?: string
  campaign_id?: string
  marketing_campaigns?: {
    id?: string
    title?: string
    name?: string
  } | null
}

function formatDate(value?: string) {
  if (!value) return '未排程'
  return new Intl.DateTimeFormat('zh-HK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function loadPosts() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('campaign_posts')
    .select('*, marketing_campaigns(id, title, name)')
    .in('status', ['draft', 'pending', 'pending_approval', 'approved', 'scheduled'])
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Unable to load approval posts', error)
    return []
  }

  return (data || []) as ApprovalPost[]
}

export default async function ApprovalsPage() {
  const posts = await loadPosts()
  const grouped = posts.reduce<Record<string, ApprovalPost[]>>((acc, post) => {
    const campaignTitle =
      post.marketing_campaigns?.title ||
      post.marketing_campaigns?.name ||
      post.campaign_id ||
      '未分類 Campaign'
    acc[campaignTitle] = [...(acc[campaignTitle] || []), post]
    return acc
  }, {})

  return (
    <main className="approvals-page">
      <header className="approvals-hero">
        <div>
          <p>Approvals</p>
          <h1>內容審批</h1>
        </div>
        <Link href="/onboarding/scheduled-posts">日曆</Link>
      </header>

      {posts.length === 0 ? (
        <section className="empty-state">
          <h2>暫時未有需要審批的內容</h2>
          <p>當 campaign posts 建立後，會在這裡按 campaign 分組顯示。</p>
        </section>
      ) : (
        <section className="campaign-list">
          {Object.entries(grouped).map(([campaignTitle, campaignPosts]) => (
            <article className="campaign-group" key={campaignTitle}>
              <header>
                <h2>{campaignTitle}</h2>
                <span>{campaignPosts.length} posts</span>
              </header>

              <div className="post-grid">
                {campaignPosts.map((post) => {
                  const image = post.image_url || post.image || ''
                  const caption = post.caption || post.body || ''
                  return (
                    <Link className="post-card" href={`/onboarding/approvals/${post.id}`} key={post.id}>
                      {image ? <img src={image} alt="" /> : <div className="image-placeholder" />}
                      <div>
                        <span>{post.platform || 'Social'}</span>
                        <strong>{post.title || caption.slice(0, 72) || 'Untitled post'}</strong>
                        <p>{caption}</p>
                        <em>{formatDate(post.scheduled_at)} · {post.status || 'draft'}</em>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      <style>{`
        .approvals-page {
          min-height: 100vh;
          background: #f7f7f8;
          color: #17181c;
          padding: 28px;
        }

        .approvals-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin: 0 auto 24px;
          max-width: 1180px;
        }

        .approvals-hero p,
        .campaign-group span,
        .post-card span,
        .post-card em {
          margin: 0;
          color: #72757d;
          font-size: 13px;
          font-style: normal;
        }

        .approvals-hero h1 {
          margin: 4px 0 0;
          font-size: 28px;
          letter-spacing: 0;
        }

        .approvals-hero a,
        .post-card {
          color: inherit;
          text-decoration: none;
        }

        .approvals-hero a {
          border: 1px solid #dedfe3;
          border-radius: 8px;
          padding: 9px 14px;
          background: #ffffff;
        }

        .campaign-list,
        .empty-state {
          max-width: 1180px;
          margin: 0 auto;
        }

        .empty-state {
          border: 1px solid #e4e5e9;
          border-radius: 8px;
          background: #ffffff;
          padding: 36px;
        }

        .empty-state h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .empty-state p {
          margin: 0;
          color: #72757d;
        }

        .campaign-group {
          margin-bottom: 28px;
        }

        .campaign-group > header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .campaign-group h2 {
          margin: 0;
          font-size: 19px;
        }

        .post-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }

        .post-card {
          overflow: hidden;
          border: 1px solid #e4e5e9;
          border-radius: 8px;
          background: #ffffff;
        }

        .post-card img,
        .image-placeholder {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          background: #ebecef;
          display: block;
        }

        .post-card div:last-child {
          padding: 14px;
          display: grid;
          gap: 7px;
        }

        .post-card strong {
          font-size: 15px;
          line-height: 1.35;
        }

        .post-card p {
          min-height: 42px;
          max-height: 42px;
          overflow: hidden;
          margin: 0;
          color: #5f626b;
          font-size: 13px;
          line-height: 1.55;
        }
      `}</style>
    </main>
  )
}
