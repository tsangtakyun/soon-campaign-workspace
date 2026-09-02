export default function OnboardingLoading() {
  return (
    <main className="onboarding-loading" aria-live="polite" aria-label="頁面載入中">
      <div className="onboarding-loading-mark" aria-hidden="true">
        <span>S</span>
      </div>
      <p>正在載入…</p>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .onboarding-loading {
              min-height: 100dvh;
              display: grid;
              place-content: center;
              justify-items: center;
              gap: 14px;
              background: #ffffff;
              color: #202126;
            }

            .onboarding-loading-mark {
              width: 44px;
              height: 44px;
              display: grid;
              place-items: center;
              border-radius: 12px;
              background: #f2b705;
              color: #171717;
              font-size: 18px;
              font-weight: 850;
              box-shadow: 0 10px 28px rgba(242, 183, 5, 0.2);
              animation: onboarding-loading-pulse 900ms ease-in-out infinite alternate;
            }

            .onboarding-loading p {
              margin: 0;
              color: #777b84;
              font-size: 13px;
              font-weight: 650;
            }

            @keyframes onboarding-loading-pulse {
              from { transform: scale(0.94); opacity: 0.68; }
              to { transform: scale(1); opacity: 1; }
            }

            @media (prefers-reduced-motion: reduce) {
              .onboarding-loading-mark { animation: none; }
            }
          `,
        }}
      />
    </main>
  )
}
