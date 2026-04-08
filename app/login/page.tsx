'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = searchParams.get('next') || '/my-workspace'
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://soon-campaign-workspace.vercel.app'

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F2EC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, Times New Roman, serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '48px' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#888', marginBottom: '8px' }}>
          SOON · Campaign Workspace
        </p>
        <h1 style={{ fontSize: '34px', fontWeight: '400', color: '#1a1a1a', marginBottom: '18px' }}>
          Merchant & Creator Platform
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '40px', fontStyle: 'italic' }}>
          Sign in once, then return to your paid analysis any time
        </p>

        <div style={{ marginBottom: '24px', padding: '14px 16px', borderRadius: '16px', background: '#f8f2e4', color: '#5b5348', fontSize: '14px', lineHeight: 1.7 }}>
          用你付款時同一個 email 嘅 Google 帳號登入，之後就可以直接返嚟睇已購買分析，唔使再重複經付款流程。
        </div>

        {error === 'unauthorized' && (
          <p style={{ color: '#c0392b', marginBottom: '24px', fontSize: '14px' }}>
            你的帳號未獲授權，請聯絡管理員。
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '14px 24px',
            border: '1px solid #1a1a1a',
            backgroundColor: 'transparent',
            color: '#1a1a1a',
            fontSize: '15px',
            fontFamily: 'Georgia, Times New Roman, serif',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          用 Google 登入並保存分析
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
