'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DevResetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devKey, setDevKey] = useState('')
  const [deleted, setDeleted] = useState<{ posts: number; campaigns: number; intakes: number } | null>(null)

  async function handleReset() {
    setLoading(true)
    setError('')
    setDeleted(null)

    try {
      const res = await fetch('/api/dev/reset-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(devKey.trim() ? { 'X-Dev-Key': devKey.trim() } : {}),
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.detail || 'Reset failed')
      }

      setDeleted(data.deleted)
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('soon-'))
        .forEach((key) => sessionStorage.removeItem(key))

      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#1a1a1a]">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Dev Tool</p>
          <h1 className="mt-2 text-2xl font-bold">Reset onboarding</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            清走目前登入用戶的 posts、campaigns 和 intake 記錄，然後重新進入 onboarding。
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Dev key
          <input
            type="password"
            value={devKey}
            onChange={(event) => setDevKey(event.target.value)}
            placeholder="Production 需要填寫"
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-black"
          />
        </label>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="h-11 rounded-lg bg-[#111] px-4 text-sm font-semibold text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset My Onboarding'}
        </button>

        {deleted && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Deleted {deleted.posts} posts, {deleted.campaigns} campaigns, {deleted.intakes} intakes.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
