'use client'

import type { FormEvent } from 'react'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { createClient } from '@/lib/supabase'

function SignupContent() {
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const next = selectedPlan ? `/submit-brief?plan=${selectedPlan}` : '/submit-brief'
  const contentEngineBase = selectedPlan ? `/onboarding/content-engine?plan=${selectedPlan}` : '/onboarding/content-engine'
  const onboardingNext = selectedPlan ? `/signup?onboarding=1&plan=${selectedPlan}` : '/signup?onboarding=1'
  const nextWithOnboarding = (name: string, budget: string, category: string) => {
    const url = new URL(contentEngineBase, appUrl)
    url.searchParams.set('name', name)
    url.searchParams.set('budget', budget)
    url.searchParams.set('category', category)
    return `${url.pathname}${url.search}`
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'account' | 'onboarding'>(
    searchParams.get('onboarding') === '1' ? 'onboarding' : 'account'
  )
  const [fullName, setFullName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState('')
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://soon-campaign-workspace.vercel.app'

  async function handleGoogleSignup() {
    setLoading('google')
    document.cookie = `soon_auth_next=${encodeURIComponent(onboardingNext)}; Path=/; Max-Age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })
  }

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading('email')

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(onboardingNext)}`,
        },
      })

      if (error) throw error

      setMessage('已建立帳戶。請檢查電郵確認帳戶；你亦可以先完成以下設定。')
      setStep('onboarding')
    } catch (error: any) {
      setMessage(error.message || '暫時未能建立帳戶，請稍後再試。')
    } finally {
      setLoading('')
    }
  }

  function handleOnboardingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.location.href = nextWithOnboarding(fullName.trim(), monthlyBudget, businessCategory)
  }

  const canContinue = fullName.trim() && monthlyBudget && businessCategory

  return (
    <main className="signup-page">
      <ClaimOnboardingSession />
      <section className="signup-shell">
        <div className="signup-panel">
          <div className="auth-form-stack">
            {step === 'account' ? (
              <>
              <h1>開始使用 SOON</h1>
              <p className="login-line">
                已有帳戶？<Link href={`/login?next=${encodeURIComponent(next)}`}>登入</Link>
              </p>

              <div className="social-buttons">
                <button type="button" onClick={handleGoogleSignup} disabled={loading === 'google'}>
                  <span className="google" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" role="img">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </span>
                  {loading === 'google' ? '正在前往 Google...' : '使用 Google 繼續'}
                </button>
              </div>
              <p className="more-login-options">更多登入方式即將推出</p>

              <div className="divider">
                <span />
                或使用電郵註冊
                <span />
              </div>

              <form onSubmit={handleEmailSignup}>
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
                  <span>密碼</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="最少 8 個字元"
                  />
                </label>
                <button className="submit" type="submit" disabled={loading === 'email'}>
                  {loading === 'email' ? '建立中...' : '建立帳戶'}
                </button>
              </form>

              {message && <p className="message">{message}</p>}

              <p className="terms">
                建立帳戶即表示你同意 SOON 根據提交資料跟進你的試用與宣傳需求。
              </p>
              </>
            ) : (
              <>
              <Link className="sign-out-link" href="/">
                離開
              </Link>
              <h1>
                你的內容增長
                <br />
                由今日開始
              </h1>
              <p className="login-line">先讓 SOON 了解你的品牌情況。</p>

              <form className="onboarding-form" onSubmit={handleOnboardingSubmit}>
                <label>
                  <span>你的姓名</span>
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="輸入你的姓名"
                  />
                </label>

                <label>
                  <span>每月宣傳預算</span>
                  <select required value={monthlyBudget} onChange={(event) => setMonthlyBudget(event.target.value)}>
                    <option value="">選擇預算範圍</option>
                    <option value="HK$8,000 以下">HK$8,000 以下</option>
                    <option value="HK$8,000 - 15,000">HK$8,000 - 15,000</option>
                    <option value="HK$15,000 - 30,000">HK$15,000 - 30,000</option>
                    <option value="HK$30,000 - 50,000">HK$30,000 - 50,000</option>
                    <option value="HK$50,000 以上">HK$50,000 以上</option>
                  </select>
                </label>

                <label>
                  <span>業務類別</span>
                  <select required value={businessCategory} onChange={(event) => setBusinessCategory(event.target.value)}>
                    <option value="">選擇類別</option>
                    <option value="餐飲">餐飲</option>
                    <option value="本地服務">本地服務</option>
                    <option value="電商">電商</option>
                    <option value="教育">教育</option>
                    <option value="健康與美容">健康與美容</option>
                    <option value="旅遊與體驗">旅遊與體驗</option>
                    <option value="創作者 / 個人品牌">創作者 / 個人品牌</option>
                    <option value="其他">其他</option>
                  </select>
                </label>

                <button className="submit onboarding-submit" type="submit" disabled={!canContinue}>
                  繼續
                </button>
              </form>
              </>
            )}
          </div>
        </div>

        <div className="preview-panel" aria-hidden="true">
          <img src="https://auth.sooncreator.network/storage/v1/object/public/public-assets/dashboard-preview.png" alt="" />
        </div>
      </section>

      <style jsx>{`
        .signup-page {
          min-height: 100vh;
          background: #ffffff;
          color: #161719;
          padding: 0;
        }

        .signup-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 0;
          align-items: stretch;
          width: 100%;
        }

        .signup-panel {
          width: 100%;
          min-height: 100vh;
          padding: 0 32px 0 64px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }

        .auth-form-stack {
          width: min(100%, 420px);
        }

        h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
          line-height: 1.18;
          letter-spacing: 0;
          font-weight: 700;
        }

        .login-line {
          margin: 0 0 24px;
          color: #71737a;
          font-size: 0.875rem;
        }

        .login-line a {
          color: #ef4444;
          text-underline-offset: 4px;
          text-decoration: underline;
        }

        .social-buttons,
        form {
          display: grid;
          gap: 16px;
          width: 100%;
        }

        .social-buttons button,
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
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          align-items: center;
          cursor: pointer;
        }

        .social-buttons button:disabled {
          color: #9b9b9b;
          cursor: not-allowed;
        }

        .google {
          justify-self: center;
          display: grid;
          place-items: center;
        }

        .more-login-options {
          margin: 12px 0 0;
          color: #9ca3af;
          font-size: 0.75rem;
          text-align: center;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 24px 0 20px;
          color: #9ca3af;
          font-size: 0.75rem;
          width: 100%;
        }

        .divider span {
          height: 1px;
          background: #e5e7eb;
        }

        label {
          display: grid;
          gap: 8px;
          color: #161719;
          font-size: 0.875rem;
          font-weight: 500;
        }

        input,
        select {
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

        input:focus,
        select:focus {
          border-color: #161719;
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        select {
          appearance: auto;
        }

        .submit {
          margin-top: 4px;
          display: flex;
          justify-content: center;
          min-height: 44px;
          border-color: #ef4444;
          background: #ef4444;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .submit:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .message {
          margin: 18px 0 0;
          padding: 13px 15px;
          border-radius: 8px;
          background: #fff4cf;
          color: #5f5115;
          line-height: 1.6;
        }

        .terms {
          margin: 28px 0 0;
          text-align: center;
          color: #9ca3af;
          line-height: 1.55;
          font-size: 0.75rem;
        }

        .sign-out-link {
          position: fixed;
          top: 118px;
          right: 7vw;
          color: #161719;
          text-decoration: none;
          font-weight: 700;
        }

        .onboarding-form {
          margin-top: 34px;
          gap: 26px;
        }

        .onboarding-submit {
          width: fit-content;
          min-width: 128px;
          margin-top: 14px;
          padding: 0 24px;
          background: #ef3f2f;
        }

        .onboarding-submit:disabled {
          border-color: #b8b8b8;
          background: #b8b8b8;
          color: #ffffff;
          cursor: not-allowed;
        }

        .preview-panel {
          min-height: 100vh;
          border-radius: 0;
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
          .signup-page {
            padding: 0;
          }

          .signup-shell {
            grid-template-columns: 1fr;
          }

          .signup-panel {
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
          .signup-panel {
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}
