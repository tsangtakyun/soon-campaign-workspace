import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export default async function MyWorkspacePage() {
  const cookieStore = await cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login?next=/my-workspace')
  }

  const admin = createAdminSupabase()
  const normalizedEmail = user.email.trim().toLowerCase()
  const { data: analyses } = await admin
    .from('campaign_intakes')
    .select('id, business_name, campaign_title, objective, vertical, created_at, payment_status, email, stripe_customer_email')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const savedAnalyses = (analyses || []).filter((item: any) => {
    const formEmail = (item.email || '').trim().toLowerCase()
    const stripeEmail = (item.stripe_customer_email || '').trim().toLowerCase()
    return formEmail === normalizedEmail || stripeEmail === normalizedEmail
  })

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{ padding: '30px', borderRadius: '28px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>MY WORKSPACE</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>你的已購買分析</h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '780px' }}>
            只要你用同一個 Google / email 登入，就可以隨時返嚟睇之前已解鎖嘅 campaign 分析，唔使再重新付款。
          </p>
        </section>

        {savedAnalyses.length ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {savedAnalyses.map((item: any) => (
              <section key={item.id} style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: '#8b7c69', marginBottom: '8px' }}>
                      {new Date(item.created_at).toLocaleDateString('zh-HK')}
                    </div>
                    <div style={{ fontSize: '32px', lineHeight: 1.08, marginBottom: '8px' }}>
                      {item.business_name || '未命名品牌'}
                    </div>
                    <div style={{ fontSize: '16px', color: '#5b5348', lineHeight: 1.7 }}>
                      {item.campaign_title || 'Campaign analysis'} · {item.vertical} · {item.objective}
                    </div>
                  </div>

                  <Link
                    href={`/paid-analysis?campaign_intake_id=${encodeURIComponent(item.id)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      background: '#1a1a18',
                      color: '#f5efe5',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      fontSize: '14px',
                    }}
                  >
                    查看完整分析
                  </Link>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section style={{ padding: '24px', borderRadius: '24px', background: '#fbf2df', border: '1px solid rgba(26,26,24,0.10)', color: '#5a5349' }}>
            你而家仲未有已保存嘅付費分析。完成第一次付款後，分析會自動出現喺呢度。
          </section>
        )}
      </div>
    </main>
  )
}
