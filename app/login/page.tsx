'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = searchParams.get('next') || '/my-workspace'
  const supabase = createClient()
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://soon-campaign-workspace.vercel.app'

  const handleGoogleLogin = async () => {
    document.cookie = `soon_auth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })
  }

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 24px 96px',
      }}
    >
      <section
        style={{
          width: 'min(100%, 560px)',
          padding: '40px 32px',
          borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(13,15,21,0.92), rgba(7,8,12,0.94))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 80px rgba(0,0,0,0.36)',
          textAlign: 'center',
          color: '#f7f8fb',
        }}
      >
        <p
          style={{
            margin: '0 0 10px',
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(162,178,214,0.8)',
          }}
        >
          SOON 廣告工作台
        </p>
        <h1
          style={{
            margin: '0 0 14px',
            fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
            lineHeight: 0.96,
            letterSpacing: '-0.06em',
            fontWeight: 350,
          }}
        >
          登入品牌工作台
        </h1>
        <p
          style={{
            margin: '0 auto 24px',
            maxWidth: '420px',
            fontSize: '16px',
            lineHeight: 1.8,
            color: 'rgba(210,217,234,0.78)',
          }}
        >
          完成登入後，即可回到你已購買的分析頁面與廣告工作流程，不必重新進入付款步驟。
        </p>

        <div
          style={{
            marginBottom: '24px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(222,227,241,0.82)',
            fontSize: '14px',
            lineHeight: 1.75,
          }}
        >
          請使用付款時所填寫的電子郵件之 Google 帳號登入，系統便會自動連結至對應的已購買分析內容。
        </div>

        {error === 'unauthorized' ? (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(181,69,69,0.16)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#ffe7e3',
              lineHeight: 1.7,
            }}
          >
            目前無法授權此帳號登入，請聯絡管理員協助處理。
          </div>
        ) : null}

        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            minHeight: '56px',
            padding: '0 22px',
            borderRadius: '999px',
            border: '1px solid rgba(142,180,255,0.24)',
            background: 'linear-gradient(135deg, #ff5d36, #ff3d2e)',
            color: '#ffffff',
            fontSize: '15px',
            fontFamily:
              '"SF Pro Rounded", "SF Pro Display", "Avenir Next", ui-rounded, "Nunito Sans", system-ui, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(255,121,93,0.18), 0 0 30px rgba(255,84,48,0.32)',
          }}
        >
          使用 Google 登入
        </button>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
