'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type ReviewPost = {
  id: string
  title?: string
  caption?: string
  body?: string
  image_url?: string
  image?: string
  platform?: string
  status?: string
  scheduled_at?: string
  marketing_campaigns?: {
    title?: string
    name?: string
  } | null
}

type PostReviewClientProps = {
  post: ReviewPost
  siblingIds: string[]
}

const platforms = ['Instagram', 'Facebook', 'Threads']

export function PostReviewClient({ post, siblingIds }: PostReviewClientProps) {
  const router = useRouter()
  const [caption, setCaption] = useState(post.caption || post.body || '')
  const [activePlatform, setActivePlatform] = useState(platforms[0])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const image = post.image_url || post.image || ''
  const title = post.title || caption.slice(0, 80) || 'Untitled post'
  const campaignTitle = post.marketing_campaigns?.title || post.marketing_campaigns?.name || 'Campaign'

  const currentIndex = siblingIds.indexOf(post.id)
  const previousId = currentIndex > 0 ? siblingIds[currentIndex - 1] : ''
  const nextId = currentIndex >= 0 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : ''

  const previewCaption = useMemo(() => {
    if (activePlatform === 'Threads') return caption.slice(0, 500)
    if (activePlatform === 'Facebook') return caption
    return caption.slice(0, 2200)
  }, [activePlatform, caption])

  async function submitAction(action: 'publish' | 'reject' | 'update-caption') {
    setBusy(action)
    setMessage('')

    const endpoint =
      action === 'publish'
        ? '/api/posts/publish'
        : action === 'reject'
          ? '/api/posts/reject'
          : '/api/posts/update-caption'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        caption,
        reason: action === 'reject' ? 'Rejected from approval review' : undefined,
      }),
    })

    const result = await response.json().catch(() => ({}))
    setBusy('')

    if (!response.ok) {
      setMessage(result.error || '操作失敗，請再試一次。')
      return
    }

    if (action === 'update-caption') {
      setMessage('Caption 已更新。')
      router.refresh()
      return
    }

    router.push('/onboarding/approvals')
  }

  return (
    <main className="review-page">
      <header className="review-topbar">
        <Link href="/onboarding/approvals">← 返回</Link>
        <div>
          <strong>{campaignTitle}</strong>
          <span>{post.status || 'draft'}</span>
        </div>
        <nav aria-label="Post navigation">
          <Link aria-disabled={!previousId} href={previousId ? `/onboarding/approvals/${previousId}` : '#'}>上一個</Link>
          <Link aria-disabled={!nextId} href={nextId ? `/onboarding/approvals/${nextId}` : '#'}>下一個</Link>
        </nav>
        <button type="button" onClick={() => submitAction('reject')} disabled={Boolean(busy)}>
          不發布
        </button>
        <button className="approve-button" type="button" onClick={() => submitAction('publish')} disabled={Boolean(busy)}>
          批准
        </button>
      </header>

      <section className="review-grid">
        <aside className="review-panel">
          <p>Post</p>
          <h1>{title}</h1>
          <dl>
            <div>
              <dt>平台</dt>
              <dd>{post.platform || activePlatform}</dd>
            </div>
            <div>
              <dt>排程</dt>
              <dd>{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('zh-HK') : '未排程'}</dd>
            </div>
          </dl>
          <Link className="design-link" href={`/scheduled-posts?postId=${post.id}`}>
            編輯設計
          </Link>
        </aside>

        <section className="preview-column">
          <div className="platform-tabs">
            {platforms.map((platform) => (
              <button
                className={platform === activePlatform ? 'active' : ''}
                key={platform}
                type="button"
                onClick={() => setActivePlatform(platform)}
              >
                {platform}
              </button>
            ))}
          </div>

          <article className="social-preview">
            <header>
              <div className="avatar">S</div>
              <div>
                <strong>SOON Creator</strong>
                <span>{activePlatform}</span>
              </div>
            </header>
            {image ? <img src={image} alt="" /> : <div className="preview-placeholder" />}
            <p>{previewCaption}</p>
          </article>
        </section>

        <aside className="caption-panel">
          <label>
            <span>Caption</span>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} />
          </label>
          <button type="button" onClick={() => submitAction('update-caption')} disabled={Boolean(busy)}>
            儲存 caption
          </button>
          {message ? <p>{message}</p> : null}
        </aside>
      </section>

      <style>{`
        .review-page {
          min-height: 100vh;
          background: #f4f5f6;
          color: #17181c;
        }

        .review-topbar {
          min-height: 58px;
          border-bottom: 1px solid #e2e4e8;
          background: #ffffff;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto auto;
          align-items: center;
          gap: 14px;
          padding: 0 18px;
        }

        .review-topbar a,
        .design-link {
          color: inherit;
          text-decoration: none;
        }

        .review-topbar div {
          min-width: 0;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .review-topbar span,
        .review-panel p,
        dt,
        .social-preview span,
        .caption-panel span {
          color: #777a82;
          font-size: 13px;
        }

        .review-topbar nav {
          display: flex;
          gap: 8px;
        }

        .review-topbar nav a,
        .review-topbar button,
        .caption-panel button,
        .design-link,
        .platform-tabs button {
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px 12px;
          font: inherit;
          cursor: pointer;
        }

        .review-topbar nav a[aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.45;
        }

        .review-topbar .approve-button,
        .caption-panel button {
          border-color: #111111;
          background: #111111;
          color: #ffffff;
        }

        .review-grid {
          display: grid;
          grid-template-columns: 280px minmax(320px, 1fr) 360px;
          gap: 18px;
          padding: 18px;
        }

        .review-panel,
        .caption-panel,
        .social-preview {
          border: 1px solid #e1e3e8;
          border-radius: 8px;
          background: #ffffff;
        }

        .review-panel,
        .caption-panel {
          padding: 18px;
        }

        .review-panel h1 {
          margin: 6px 0 18px;
          font-size: 22px;
          line-height: 1.25;
          letter-spacing: 0;
        }

        .review-panel dl {
          display: grid;
          gap: 14px;
          margin: 0 0 22px;
        }

        .review-panel dt,
        .review-panel dd {
          margin: 0;
        }

        .review-panel dd {
          margin-top: 4px;
          font-weight: 600;
        }

        .design-link {
          display: inline-flex;
        }

        .preview-column {
          display: grid;
          align-content: start;
          justify-items: center;
          gap: 14px;
        }

        .platform-tabs {
          display: flex;
          gap: 8px;
        }

        .platform-tabs .active {
          border-color: #111111;
        }

        .social-preview {
          width: min(440px, 100%);
          overflow: hidden;
        }

        .social-preview header {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 12px;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffd946;
          display: grid;
          place-items: center;
          font-weight: 800;
        }

        .social-preview img,
        .preview-placeholder {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          display: block;
          background: #e8eaee;
        }

        .social-preview p {
          margin: 0;
          padding: 14px;
          color: #282a30;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .caption-panel {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .caption-panel label {
          display: grid;
          gap: 8px;
        }

        .caption-panel textarea {
          width: 100%;
          min-height: 420px;
          resize: vertical;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 12px;
          font: inherit;
          line-height: 1.6;
        }

        .caption-panel p {
          margin: 0;
          color: #247a3d;
          font-size: 13px;
        }

        @media (max-width: 960px) {
          .review-topbar,
          .review-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
