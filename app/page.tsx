import Link from 'next/link'

const featureCard = (eyebrow: string, title: string, body: string) => (
  <div style={{
    padding: '24px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(26,26,24,0.10)',
    boxShadow: '0 20px 50px rgba(26,26,24,0.05)',
  }}>
    <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: '#8a7e6f', marginBottom: '8px' }}>{eyebrow}</div>
    <div style={{ fontSize: '28px', lineHeight: 1.1, marginBottom: '10px' }}>{title}</div>
    <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#5a5349' }}>{body}</div>
  </div>
)

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(255,255,255,0.65), transparent 34%), linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '22px', alignItems: 'stretch', marginBottom: '28px' }}>
          <div style={{
            padding: '34px',
            borderRadius: '30px',
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(26,26,24,0.10)',
            boxShadow: '0 28px 60px rgba(26,26,24,0.05)',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>
              SOON EXTERNAL PLATFORM
            </p>
            <h1 style={{ margin: '0 0 14px', fontSize: '64px', lineHeight: 0.98, fontWeight: 500 }}>
              Campaign Workspace
            </h1>
            <p style={{ margin: '0 0 22px', maxWidth: '720px', fontSize: '19px', lineHeight: 1.7, color: '#564f45' }}>
              一個俾商戶、creator 同 SOON ops 一齊用嘅內容商務工作區。由 brief、matching、script、storyboard 到 deliverable tracking，都用同一個 workflow 串起。
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Link href="/submit-brief" style={{
                display: 'inline-flex',
                padding: '14px 20px',
                borderRadius: '999px',
                textDecoration: 'none',
                background: '#1a1a18',
                color: '#f5efe5',
                fontSize: '14px',
              }}>
                Submit Campaign Brief
              </Link>
              <Link href="/ops/campaigns" style={{
                display: 'inline-flex',
                padding: '14px 20px',
                borderRadius: '999px',
                textDecoration: 'none',
                border: '1px solid rgba(26,26,24,0.18)',
                color: '#1a1a18',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.75)',
              }}>
                Open Ops Workspace
              </Link>
            </div>
          </div>

          <div style={{
            padding: '28px',
            borderRadius: '30px',
            background: '#1d1d1b',
            color: '#f5efe5',
          }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '12px' }}>WHY THIS PRODUCT</div>
            <div style={{ display: 'grid', gap: '14px', fontSize: '16px', lineHeight: 1.7 }}>
              <div>商戶唔需要由零開始諗 brief，同時可以更快搵到合適 creator。</div>
              <div>SOON 可以用同一套 AI workflow 管 campaign，唔使分散喺唔同 internal tools。</div>
              <div>未來自然延伸到 Picked、One Bite、Found Here 同 selective external tooling。</div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '18px' }}>
          {featureCard('MERCHANT ENTRY', 'Brief Intake', '商戶提交 campaign brief，AI 幫手整理內容角度、must include 同 target platform。')}
          {featureCard('OPS LAYER', 'Creator Matching', 'SOON 內部可以根據 niche、budget、style 去配對 creator，再記錄邀請與回覆狀態。')}
          {featureCard('PRODUCTION', 'AI Workflow', '之後直接接返 script-generator 同 soon-storyboard，做出片前準備同 production handoff。')}
        </section>

        <section style={{
          padding: '24px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(26,26,24,0.10)',
        }}>
          <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8a7e6f', marginBottom: '10px' }}>MVP FLOW</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {[
              '1. Merchant submit brief',
              '2. AI enrich campaign',
              '3. Match creators',
              '4. Generate script / storyboard',
              '5. Track deliverables',
            ].map((step) => (
              <div key={step} style={{ padding: '14px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', fontSize: '14px', lineHeight: 1.6 }}>
                {step}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
