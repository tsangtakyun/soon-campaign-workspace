'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = searchParams.get('next') || '/my-workspace'
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
          Sign in with Google
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
