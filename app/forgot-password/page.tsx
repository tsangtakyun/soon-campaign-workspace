'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getAppUrl()}/reset-password`,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message || '暫時未能發送重設連結，請稍後再試。')
      return
    }

    setMessage('重設連結已發送至你的電郵。')
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">SOON 帳戶</p>
        <h1>重設密碼</h1>
        <p className="intro">輸入你的公司電郵，我們會發送密碼重設連結。</p>

        <form onSubmit={handleSubmit}>
          <label>
            <span>公司電郵</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? '發送中...' : '發送重設連結'}
          </button>
        </form>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}

        <Link className="back-link" href="/login">
          返回登入
        </Link>
      </section>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 96px 24px 72px;
          background: #f4f4f2;
          color: #161719;
        }

        .auth-card {
          width: min(100%, 500px);
          padding: 38px 34px;
          border-radius: 24px;
          border: 1px solid #e2e2df;
          background: #ffffff;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.12);
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #8a8c91;
          font-size: 0.78rem;
          font-weight: 750;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 10px;
          font-size: clamp(1.85rem, 4vw, 2.5rem);
          line-height: 1.08;
        }

        .intro {
          margin: 0 0 24px;
          color: #6f737d;
          line-height: 1.65;
        }

        form,
        label {
          display: grid;
          gap: 12px;
        }

        label {
          gap: 8px;
          color: #595b60;
          font-size: 0.96rem;
          font-weight: 650;
        }

        input {
          width: 100%;
          min-height: 56px;
          border-radius: 8px;
          border: 1px solid #d9d9d9;
          background: #ffffff;
          padding: 0 16px;
          font: inherit;
          color: #161719;
          outline: none;
        }

        input:focus {
          border-color: #161719;
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        button {
          width: 100%;
          min-height: 56px;
          border: 1px solid #ef3f2f;
          border-radius: 8px;
          background: #ef3f2f;
          color: #ffffff;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .message {
          margin: 18px 0 0;
          padding: 12px 14px;
          border-radius: 10px;
          line-height: 1.6;
          font-size: 0.94rem;
        }

        .success {
          background: #f0fdf4;
          color: #065f46;
        }

        .error {
          background: #fef2f2;
          color: #991b1b;
        }

        .back-link {
          display: inline-block;
          margin-top: 22px;
          color: #6f737d;
          text-decoration: none;
          font-weight: 650;
        }
      `}</style>
    </main>
  )
}

function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://sooncreator.network'
}
