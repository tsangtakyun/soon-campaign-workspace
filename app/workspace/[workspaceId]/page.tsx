'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { setActiveWorkspaceId, type WorkspaceSummary } from '@/lib/workspace-client'

export default function WorkspaceDeepLinkPage() {
  const params = useParams<{ workspaceId: string }>()
  const router = useRouter()
  const workspaceId = params.workspaceId
  const [message, setMessage] = useState('正在打開工作台...')

  useEffect(() => {
    let cancelled = false

    async function openWorkspace() {
      const response = await fetch('/api/workspaces', { cache: 'no-store' })
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/workspace/${workspaceId}`)}`
        return
      }

      const payload = await response.json().catch(() => null)
      const workspaces = Array.isArray(payload?.workspaces) ? (payload.workspaces as WorkspaceSummary[]) : []
      const workspace = workspaces.find((item) => item.id === workspaceId)

      if (cancelled) return
      if (!workspace) {
        setMessage('你暫時未有權限進入這個工作台。')
        return
      }

      setActiveWorkspaceId(workspace.id)
      router.replace('/onboarding')
    }

    void openWorkspace()
    return () => {
      cancelled = true
    }
  }, [router, workspaceId])

  return (
    <main className="workspace-link-page">
      <section>
        <h1>{message}</h1>
        <p>如果你剛收到邀請，請先登入被邀請的電郵帳戶。</p>
        <Link href={`/login?next=${encodeURIComponent(`/workspace/${workspaceId}`)}`}>登入 SOON</Link>
      </section>
      <style jsx>{`
        .workspace-link-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f7f7f8;
          color: #202126;
          padding: 24px;
        }
        section {
          width: min(440px, 100%);
          border: 1px solid #e6e7eb;
          border-radius: 12px;
          background: #ffffff;
          padding: 28px;
          text-align: center;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 22px;
        }
        p {
          margin: 0 0 18px;
          color: #6b7280;
          line-height: 1.6;
        }
        a {
          color: #111111;
          font-weight: 700;
          text-underline-offset: 4px;
        }
      `}</style>
    </main>
  )
}
