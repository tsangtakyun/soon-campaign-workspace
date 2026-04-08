import Link from 'next/link'

function featureCard(eyebrow: string, title: string, body: string) {
  return (
    <div style={{
      padding: '24px',
      borderRadius: '24px',
      background: 'rgba(255,255,255,0.76)',
      border: '1px solid rgba(26,26,24,0.10)',
      boxShadow: '0 20px 50px rgba(26,26,24,0.05)',
    }}>
      <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: '#8a7e6f', marginBottom: '8px' }}>{eyebrow}</div>
      <div style={{ fontSize: '28px', lineHeight: 1.1, marginBottom: '10px' }}>{title}</div>
      <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#5a5349' }}>{body}</div>
    </div>
  )
}

function numberPill(label: string, value: string, note: string) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '18px',
      background: '#fbf8f1',
      border: '1px solid rgba(26,26,24,0.08)',
    }}>
      <div style={{ fontSize: '12px', color: '#8b7c69', marginBottom: '6px', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '34px', lineHeight: 1, marginBottom: '6px', color: '#1a1a18' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6f675d', lineHeight: 1.5 }}>{note}</div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(255,255,255,0.64), transparent 34%), linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1.08fr 0.92fr',
          gap: '22px',
          alignItems: 'stretch',
          marginBottom: '28px',
        }}>
          <div style={{
            padding: '36px',
            borderRadius: '32px',
            background: 'rgba(255,255,255,0.78)',
            border: '1px solid rgba(26,26,24,0.10)',
            boxShadow: '0 28px 60px rgba(26,26,24,0.05)',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>
              SOON AI SYSTEM
            </p>
            <h1 style={{ margin: '0 0 14px', fontSize: '68px', lineHeight: 0.92, fontWeight: 500 }}>
              將廣告成本
              <br />
              轉化為收益
            </h1>
            <p style={{ margin: '0 0 24px', maxWidth: '720px', fontSize: '21px', lineHeight: 1.7, color: '#564f45' }}>
              別讓中介人收取費用。我們用 AI 計算、配對、分析，幫你搵最適合嘅內容方向與 creator。無中介，助你業務成長。
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              <Link href="/submit-brief" style={{
                display: 'inline-flex',
                padding: '14px 22px',
                borderRadius: '999px',
                textDecoration: 'none',
                background: '#1a1a18',
                color: '#f5efe5',
                fontSize: '15px',
              }}>
                一鍵開始
              </Link>
              <a href="#how-it-works" style={{
                display: 'inline-flex',
                padding: '14px 22px',
                borderRadius: '999px',
                textDecoration: 'none',
                border: '1px solid rgba(26,26,24,0.18)',
                color: '#1a1a18',
                fontSize: '15px',
                background: 'rgba(255,255,255,0.76)',
              }}>
                了解運作方式
              </a>
              <Link href="/login?next=/my-workspace" style={{
                display: 'inline-flex',
                padding: '14px 22px',
                borderRadius: '999px',
                textDecoration: 'none',
                border: '1px solid rgba(26,26,24,0.18)',
                color: '#1a1a18',
                fontSize: '15px',
                background: '#f8f4ec',
              }}>
                Google 登入查看已買分析
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6a6156', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {['#d5b59a', '#c7d3a2', '#9db9d3'].map((color, index) => (
                  <div
                    key={color}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid #f5efe5',
                      marginLeft: index === 0 ? 0 : -8,
                    }}
                  />
                ))}
              </div>
              <span>AI 先幫你整理方向，再決定點樣投放預算最有效。已購買客戶亦可以直接 Google 登入返自己 dashboard。</span>
            </div>
          </div>

          <div style={{
            padding: '28px',
            borderRadius: '32px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(249,244,236,0.92) 100%)',
            border: '1px solid rgba(26,26,24,0.10)',
            boxShadow: '0 28px 60px rgba(26,26,24,0.05)',
            display: 'grid',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>AI STRATEGY SNAPSHOT</div>
                <div style={{ fontSize: '18px', lineHeight: 1.6, color: '#433d35' }}>
                  填一份 brief，先睇到最適合你嘅 budget shape、題材角度同 deliverable 建議。
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                borderRadius: '999px',
                background: '#eef5e8',
                color: '#2d6a4f',
                fontSize: '13px',
              }}>
                + AI 配對
              </div>
            </div>

            {numberPill('預算打法', '3', 'AI 先建議 3 種可行預算打法，唔使你盲投。')}
            {numberPill('題材方向', '5', '按你目標拆出最值得先試嘅內容角度。')}
            {numberPill('交付組合', '2', '建議最適合你 campaign 嘅影片與內容 package。')}

            <div style={{
              padding: '16px',
              borderRadius: '20px',
              background: '#1d1d1b',
              color: '#f5efe5',
            }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '8px' }}>WHY IT MATTERS</div>
              <div style={{ fontSize: '15px', lineHeight: 1.7 }}>
                唔係求其出片，而係先知道邊種 budget、邊種訊息、邊種 creator 組合最值得你花錢。
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '18px' }}>
          {featureCard('第一步', '填寫品牌需求', '用一份簡單 brief 交代你想衝 sales、想多人睇，定係想建立品牌形象。')}
          {featureCard('第二步', 'AI 分析方向', '系統會幫你計最適合嘅預算打法、題材 angle 同內容組合，唔使再靠估。')}
          {featureCard('第三步', '配對 creator', '再根據 campaign 方向配對合適 creator，減少中介成本，直接進入內容生產。')}
        </section>

        <section
          id="how-it-works"
          style={{
            padding: '24px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.76)',
            border: '1px solid rgba(26,26,24,0.10)',
          }}
        >
          <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8a7e6f', marginBottom: '10px' }}>運作方式</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {[
              '1. 交 brief',
              '2. AI 計算最合適方向',
              '3. 提供預算與題材建議',
              '4. 配對 creator',
              '5. 開始內容製作',
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
