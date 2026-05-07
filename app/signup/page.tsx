'use client'

import type { FormEvent } from 'react'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

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
      <section className="signup-shell">
        <div className="signup-panel">
          <div className="brand">
            <span />
            <strong>SOON</strong>
          </div>

          {step === 'account' ? (
            <>
              <h1>開始使用 SOON</h1>
              <p className="login-line">
                已有帳戶？<Link href={`/login?next=${encodeURIComponent(next)}`}>登入</Link>
              </p>

              <div className="social-buttons">
                <button type="button" onClick={handleGoogleSignup} disabled={loading === 'google'}>
                  <span className="google">G</span>
                  {loading === 'google' ? '正在前往 Google...' : '使用 Google 繼續'}
                </button>
                <button type="button" disabled>
                  <span className="facebook">f</span>
                  使用 Facebook 繼續
                </button>
                <button type="button" disabled>
                  <span className="apple">●</span>
                  使用 Apple 繼續
                </button>
              </div>

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

        <div className="preview-panel" aria-hidden="true">
          <div className="preview-window">
            <aside>
              <div className="mini-logo" />
              {['首頁', '內容日曆', '廣告分析', '審批', 'Campaigns', 'Brand Kit'].map((item, index) => (
                <div className={index === 1 ? 'side-item active' : 'side-item'} key={item}>{item}</div>
              ))}
            </aside>
            <section className="calendar">
              <div className="calendar-head">
                <strong>Content Calendar</strong>
                <span>Today</span>
              </div>
              <div className="post-grid">
                {[
                  ['Real stories turn attention into enquiries.', '12:15pm'],
                  ['Create content people want to save.', '10:00am'],
                  ['Turn one campaign into reusable angles.', '2:30pm'],
                  ['Spend less time guessing what to post.', '4:45pm'],
                ].map(([copy, time], index) => (
                  <div className={`post-card post-card-${index + 1}`} key={copy}>
                    <div className="post-meta">Post · {time}</div>
                    <strong>{copy}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <style jsx>{`
        .signup-page {
          min-height: calc(100vh - 88px);
          background: #f4f4f2;
          color: #161719;
          padding: 32px 7vw 64px;
        }

        .signup-shell {
          min-height: calc(100vh - 184px);
          display: grid;
          grid-template-columns: minmax(360px, 0.78fr) minmax(520px, 1.22fr);
          gap: clamp(48px, 8vw, 116px);
          align-items: center;
          max-width: 1420px;
          margin: 0 auto;
        }

        .signup-panel {
          width: min(100%, 460px);
          justify-self: center;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 34px;
          font-size: 1rem;
          letter-spacing: 0.06em;
          font-weight: 850;
        }

        .brand span {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #ef3f2f;
        }

        h1 {
          margin: 0 0 8px;
          font-size: clamp(2.45rem, 4vw, 3.5rem);
          line-height: 1;
          letter-spacing: 0;
          font-weight: 650;
        }

        .login-line {
          margin: 0 0 34px;
          color: #71737a;
          font-size: 1.06rem;
        }

        .login-line a {
          color: #161719;
          text-underline-offset: 4px;
        }

        .social-buttons,
        form {
          display: grid;
          gap: 12px;
        }

        .social-buttons button,
        .submit {
          width: 100%;
          min-height: 58px;
          border-radius: 8px;
          border: 1px solid #dedede;
          background: #ffffff;
          color: #171717;
          font: inherit;
          font-size: 1.05rem;
          font-weight: 650;
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          align-items: center;
          cursor: pointer;
        }

        .social-buttons button:disabled {
          color: #9b9b9b;
          cursor: not-allowed;
        }

        .google,
        .facebook,
        .apple {
          justify-self: center;
          font-size: 1.4rem;
          font-weight: 850;
        }

        .google { color: #4285f4; }
        .facebook { color: #1877f2; }
        .apple { color: #111111; }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 18px;
          margin: 30px 0 22px;
          color: #9a9a9a;
          font-size: 0.95rem;
        }

        .divider span {
          height: 1px;
          background: #dedede;
        }

        label {
          display: grid;
          gap: 8px;
          color: #595b60;
          font-size: 0.98rem;
          font-weight: 650;
        }

        input,
        select {
          width: 100%;
          min-height: 58px;
          border-radius: 8px;
          border: 1px solid #d9d9d9;
          background: #ffffff;
          padding: 0 18px;
          font: inherit;
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
          border-color: #ef3f2f;
          background: #ef3f2f;
          color: #ffffff;
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
          max-width: 360px;
          margin: 42px auto 0;
          text-align: center;
          color: #9a9a9a;
          line-height: 1.55;
          font-size: 0.9rem;
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
          min-height: 680px;
          border-radius: 26px;
          background: #ececea;
          display: grid;
          place-items: end center;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
        }

        .preview-window {
          width: min(92%, 820px);
          height: 610px;
          margin-bottom: -16px;
          border: 14px solid #111111;
          border-bottom-width: 22px;
          border-radius: 24px 24px 12px 12px;
          background: #f8f8f6;
          display: grid;
          grid-template-columns: 190px 1fr;
          overflow: hidden;
          box-shadow: 0 34px 70px rgba(0,0,0,0.18);
        }

        aside {
          padding: 26px 18px;
          background: #eeeeec;
          border-right: 1px solid #ddddda;
          display: grid;
          align-content: start;
          gap: 10px;
        }

        .mini-logo {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ef3f2f, #ffd84d);
          margin-bottom: 22px;
        }

        .side-item {
          padding: 10px 12px;
          border-radius: 8px;
          color: #777a7f;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .side-item.active {
          background: #dededb;
          color: #161719;
        }

        .calendar {
          padding: 28px;
          background: #fbfbfa;
        }

        .calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          color: #232428;
        }

        .calendar-head strong {
          font-size: 1.35rem;
        }

        .calendar-head span {
          color: #777a7f;
          font-weight: 700;
        }

        .post-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .post-card {
          min-height: 220px;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #ffffff;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68)),
            linear-gradient(135deg, #315d4f, #1b1d20);
        }

        .post-card-2 { background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68)), linear-gradient(135deg, #b7654a, #22252c); }
        .post-card-3 { background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68)), linear-gradient(135deg, #7057d8, #202229); }
        .post-card-4 { background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68)), linear-gradient(135deg, #d08b31, #1e2026); }

        .post-meta {
          color: rgba(255,255,255,0.8);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .post-card strong {
          max-width: 240px;
          font-size: 1.45rem;
          line-height: 1.06;
          letter-spacing: 0;
        }

        @media (max-width: 980px) {
          .signup-page {
            padding: 28px 20px 56px;
          }

          .signup-shell {
            grid-template-columns: 1fr;
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
