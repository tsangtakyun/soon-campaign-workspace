import Link from 'next/link'

export default function CreatorMatchingPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5efe5 0%, #e9dfcf 100%)',
      color: '#1a1a18',
      fontFamily: 'Georgia, Times New Roman, serif',
      padding: '42px 24px 90px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px' }}>
        <section style={{
          padding: '30px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(26,26,24,0.10)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.18em', color: '#8b7c69' }}>STEP 3</p>
          <h1 style={{ margin: '0 0 12px', fontSize: '52px', lineHeight: 1.02, fontWeight: 500 }}>
            系統配對合適 creator
          </h1>
          <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#5b5348', maxWidth: '780px' }}>
            你已經確認咗 campaign 方向。下一步，SOON 會根據你嘅目標、budget、內容角度同品牌氣質，開始配對最合適嘅 creator 組合。
          </p>
        </section>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) 320px',
          gap: '22px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: '#1d1d1b', color: '#f5efe5' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#c7bdaf', marginBottom: '10px' }}>MATCHING STATUS</div>
              <div style={{ fontSize: '34px', lineHeight: 1.12, marginBottom: '10px' }}>SOON 已收到你嘅確認，正準備進入 creator matching。</div>
              <div style={{ fontSize: '17px', lineHeight: 1.7, color: '#e8ddcf' }}>
                我哋會由 creator 類型、語氣風格、內容表現方式同 audience fit 開始篩選，而唔係只睇 follower 數字。
              </div>
            </section>

            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '8px' }}>WHAT HAPPENS NEXT</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  '系統先按 campaign angle、budget 同 vertical 篩走唔 fit 嘅 creator。',
                  '之後會整理出第一輪建議 creator pool，同埋每位 creator 可以點樣切入內容。',
                  '再下一步會接住生成題材方向、腳本建議同拍攝分鏡。',
                ].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '16px', background: '#fbf8f1', border: '1px solid rgba(26,26,24,0.08)', lineHeight: 1.7 }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside style={{ position: 'sticky', top: '24px' }}>
            <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(26,26,24,0.10)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.16em', color: '#8b7c69', marginBottom: '10px' }}>CAMPAIGN FLOW</div>
              <div style={{ fontSize: '34px', lineHeight: 1.05, color: '#1a1a18', marginBottom: '16px' }}>運作流程</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: '1. 填寫品牌 brief', status: '完成' },
                  { label: '2. AI 分析宣傳方向', status: '完成' },
                  { label: '3. 系統配對合適 creator', status: '進行中' },
                  { label: '4. 生成題材與腳本建議', status: '下一步' },
                  { label: '5. 整理拍攝方向與分鏡', status: '下一步' },
                  { label: '6. 跟進內容交付', status: '下一步' },
                ].map((step) => {
                  const isCurrent = step.status === '進行中'
                  const isDone = step.status === '完成'

                  return (
                    <div
                      key={step.label}
                      style={{
                        padding: '18px',
                        borderRadius: '20px',
                        border: isCurrent ? '1px solid #1a1a18' : '1px solid rgba(26,26,24,0.08)',
                        background: isCurrent ? '#f7f1e1' : isDone ? '#f1f5eb' : '#fbf8f1',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '16px', lineHeight: 1.55 }}>{step.label}</div>
                        <div style={{
                          minWidth: '64px',
                          textAlign: 'center',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background: isCurrent ? '#1a1a18' : isDone ? '#dbe7d0' : 'rgba(26,26,24,0.06)',
                          color: isCurrent ? '#f5efe5' : '#4f5b41',
                          fontSize: '11px',
                          letterSpacing: '0.06em',
                        }}>
                          {step.status}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>
        </section>

        <div>
          <Link href="/paid-analysis" style={{ color: '#1a1a18' }}>返回完整分析</Link>
        </div>
      </div>
    </main>
  )
}
