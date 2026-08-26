'use client'

import type { FormEvent } from 'react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { createClient } from '@/lib/supabase'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = normalizeAuthNext(searchParams.get('next'))
  const startGoogleAutomatically = searchParams.get('google') === '1'
  const automaticGoogleStarted = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'google' | 'email' | ''>('')
  const [message, setMessage] = useState('')

  const handleGoogleLogin = useCallback(async () => {
    setLoading('google')
    document.cookie = `soon_auth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax`
    document.cookie = 'soon_auth_flow=login; Path=/; Max-Age=600; SameSite=Lax'
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }, [next])

  useEffect(() => {
    if (!startGoogleAutomatically || automaticGoogleStarted.current) return
    automaticGoogleStarted.current = true
    void handleGoogleLogin()
  }, [handleGoogleLogin, startGoogleAutomatically])

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading('email')

    try {
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) throw loginError

      window.location.href = `/select-workspace?next=${encodeURIComponent(next)}`
    } catch (err: any) {
      setMessage(err.message || '登入失敗，請檢查電郵或密碼。')
    } finally {
      setLoading('')
    }
  }

  return (
    <main className="login-page">
      <ClaimOnboardingSession />
      <section className="login-shell">
        <div className="login-panel">
          <div className="login-card">
            <h1>登入 SOON</h1>
            <p className="intro auth-link-line">
              未有帳戶？<Link href="/signup">開始試用</Link>
            </p>

            {error === 'unauthorized' ? (
              <div className="auth-error">
                目前無法授權此帳號登入，請聯絡管理員協助處理。
              </div>
            ) : null}
            {error === 'invite_required' ? (
              <div className="auth-error">
                SOON 現時只開放予獲邀請用戶。請使用管理員提供的邀請連結。
              </div>
            ) : null}
            {error === 'oauth_failed' ? (
              <div className="auth-error">
                登入流程未完成，請重新選擇帳戶再試。
              </div>
            ) : null}

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
              disabled={loading === 'google'}
            >
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" role="img">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </span>
              {loading === 'google' ? '正在前往 Google...' : '使用 Google 登入'}
            </button>

            <div className="divider">
              <span />
              或使用電郵登入
              <span />
            </div>

            <form onSubmit={handleEmailLogin}>
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

              <label>
                <span className="password-label">
                  密碼
                  <Link href="/forgot-password">忘記密碼？</Link>
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="輸入密碼"
                />
              </label>

              <button className="submit" type="submit" disabled={loading === 'email'}>
                {loading === 'email' ? '登入中...' : '登入'}
              </button>
            </form>

            {message && <p className="message">{message}</p>}
          </div>
        </div>

        <div className="preview-panel" aria-hidden="true">
          <img src="https://auth.sooncreator.network/storage/v1/object/public/public-assets/dashboard-preview.png" alt="" />
        </div>
      </section>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: #ffffff;
          color: #161719;
        }

        .login-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: stretch;
        }

        .login-panel {
          min-height: 100vh;
          padding: 0 32px 0 64px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }

        .login-card {
          width: min(100%, 420px);
        }

        h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
          line-height: 1.18;
          font-weight: 700;
          letter-spacing: 0;
        }

        .intro {
          margin: 0 0 24px;
          color: #71737a;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .auth-link-line a {
          color: #ef4444;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .auth-error,
        .message {
          margin: 0 0 18px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #fff4cf;
          color: #5f5115;
          line-height: 1.6;
          font-size: 0.94rem;
        }

        .auth-error {
          background: #fef2f2;
          color: #991b1b;
        }

        .google-button,
        .submit {
          width: 100%;
          min-height: 48px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #171717;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
        }

        .google-button {
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          align-items: center;
        }

        .google-button span {
          justify-self: center;
          display: grid;
          place-items: center;
        }

        .google-button:disabled,
        .submit:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          margin: 28px 0 22px;
          color: #9ca3af;
          font-size: 0.75rem;
        }

        .divider span {
          height: 1px;
          background: #e5e7eb;
        }

        form {
          display: grid;
          gap: 16px;
        }

        label {
          display: grid;
          gap: 8px;
          color: #161719;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .password-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .password-label a {
          color: #6f737d;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
        }

        .password-label a:hover {
          color: #161719;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        input {
          width: 100%;
          min-height: 44px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 0 14px;
          font: inherit;
          font-size: 0.95rem;
          color: #161719;
          outline: none;
        }

        input:focus {
          border-color: #161719;
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        .submit {
          margin-top: 4px;
          min-height: 44px;
          border-color: #ef4444;
          background: #ef4444;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .message {
          margin: 18px 0 0;
        }

        .preview-panel {
          min-height: 100vh;
          background: #f3f3f3;
          position: relative;
          overflow: hidden;
        }

        .preview-panel img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
        }

        @media (max-width: 980px) {
          .login-shell {
            grid-template-columns: 1fr;
          }

          .login-panel {
            min-height: auto;
            padding: 96px 24px 48px;
            max-width: none;
            align-items: center;
          }

          .preview-panel {
            min-height: 520px;
          }
        }

        @media (max-width: 620px) {
          .login-card {
            width: 100%;
          }

          .preview-panel {
            display: none;
          }
        }
      `}</style>
    </main>
  )
}

function normalizeAuthNext(value: string | null) {
  if (!value || value === '/my-workspace' || value.startsWith('/my-workspace/')) return '/onboarding'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding'
}

function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://sooncreator.network'
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
