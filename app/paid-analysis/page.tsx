'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { buildFullAnalysis, type CampaignFormInput } from '@/lib/analysis'

const STORAGE_KEY = 'soon-paid-analysis-draft-v1'

function PaidAnalysisContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [draft, setDraft] = useState<CampaignFormInput | null>(null)
  const [paid, setPaid] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setDraft(JSON.parse(raw) as CampaignFormInput)
    } catch {}
  }, [])

  useEffect(() => {
    async function checkSession() {
      if (!sessionId) {
        setChecking(false)
        setError('未找到付款 session。')
        return
      }

      try {
        const res = await fetch(`/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to verify payment')
        if (data.payment_status !== 'paid') throw new Error('付款尚未完成。')
        setPaid(true)
      } catch (error: any) {
        setError(error.message || '未能確認付款狀態。')
      } finally {
        setChecking(false)
      }
    }

    checkSession()
  }, [sessionId])

  const analysis = useMemo(() => {
    if (!draft || !paid) return null
    return buildFullAnalysis(draft)
  }, [draft, paid])

  const sections: Array<{ title: string; items: string[] }> = analysis ? [
    { title: '預算打法', items: analysis.budgetShapes },
    { title: '題材角度', items: analysis.contentAngles },
    { title: '交付組合', items: analysis.deliverablePlan },
    { title: 'Creator 建議', items: analysis.creatorFit },
    { title: '第一輪行動建議', items: analysis.firstWavePlan },
  ] : []

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <section style={{
          padding: '30px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(26,26,24,0.10)',
          marginBottom: '20px',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>PAID AI ANALYSIS</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '50px', lineHeight: 1.02, fontWeight: 500 }}>
            完整 AI 分析宣傳方向
          </h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348' }}>
            付款成功之後，先會解鎖完整預算打法、題材角度、交付建議同 creator fit 建議。
          </p>
        </section>

        {checking && (
          <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
            正在確認付款狀態...
          </section>
        )}

        {!checking && error && (
          <section style={{ padding: '24px', borderRadius: '24px', background: '#fbf2df', border: '1px solid rgba(26,26,24,0.10)' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>未能解鎖完整分析</div>
            <div style={{ color: '#5a5349', marginBottom: '14px' }}>{error}</div>
            <Link href="/submit-brief" style={{ color: '#1a1a18' }}>返回 brief 頁</Link>
          </section>
        )}

        {!checking && paid && analysis && (
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '8px' }}>UNLOCKED</div>
              <div style={{ fontSize: '34px', lineHeight: 1.15, marginBottom: '10px' }}>{analysis.headline}</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7 }}>{analysis.overview}</div>
            </section>

            {sections.map(({ title, items }) => (
              <section key={title} style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>{title}</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {items.map((item) => (
                    <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function PaidAnalysisPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
        color: '#1a1a18',
        fontFamily: 'Georgia, Times New Roman, serif',
        padding: '42px 24px 90px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
            正在載入付款結果...
          </section>
        </div>
      </main>
    }>
      <PaidAnalysisContent />
    </Suspense>
  )
}
