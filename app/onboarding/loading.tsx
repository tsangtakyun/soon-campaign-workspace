export default function OnboardingLoading() {
  return (
    <main className="onboarding-loading" aria-live="polite" aria-label="頁面載入中">
      <div className="loading-glow loading-glow-one" aria-hidden="true" />
      <div className="loading-glow loading-glow-two" aria-hidden="true" />
      <section className="loading-card">
        <img src="/icon.png" alt="SOON" />
        <div className="loading-copy">
          <strong>正在準備工作空間</strong>
          <span>即將完成，請稍候。</span>
        </div>
        <div className="loading-track" aria-hidden="true"><i /></div>
      </section>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .onboarding-loading {
              position: relative;
              min-height: 100dvh;
              display: grid;
              place-items: center;
              overflow: hidden;
              padding: 24px;
              background: #f6f2eb;
              color: #202126;
            }
            .loading-glow { position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(100px);opacity:.28;pointer-events:none }
            .loading-glow-one { top:-260px;left:-120px;background:#d9bbb5 }
            .loading-glow-two { right:-180px;bottom:-280px;background:#c7e63a }
            .loading-card {
              position: relative;
              z-index: 1;
              width: min(360px, 100%);
              display: grid;
              justify-items: center;
              gap: 18px;
              border: 1px solid #ded5cd;
              border-radius: 20px;
              background: rgba(255,255,255,.92);
              padding: 34px 30px 30px;
              box-shadow: 0 22px 60px rgba(77,32,35,.08);
              text-align: center;
            }
            .loading-card img { width:104px;height:58px;display:block;object-fit:contain }
            .loading-copy { display:grid;gap:6px }
            .loading-copy strong { font-size:16px;line-height:1.35 }
            .loading-copy span { color:#777b84;font-size:12px;line-height:1.5 }
            .loading-track { width:100%;height:4px;overflow:hidden;border-radius:999px;background:#eee8e2 }
            .loading-track i { display:block;width:42%;height:100%;border-radius:inherit;background:#6b2c30;animation:soon-loading-slide 1.1s ease-in-out infinite }
            @keyframes soon-loading-slide { 0%{transform:translateX(-110%)} 100%{transform:translateX(345%)} }
            @media (prefers-reduced-motion: reduce) { .loading-track i { animation:none;transform:none;width:100%;opacity:.65 } }
          `,
        }}
      />
    </main>
  )
}
