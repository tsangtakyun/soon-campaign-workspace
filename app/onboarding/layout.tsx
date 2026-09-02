import type { ReactNode } from 'react'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="onboarding-route-shell">
      {children}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              color-scheme: light;
            }

            html,
            body {
              background: #ffffff !important;
              color: #202126;
            }

            body::before {
              display: none !important;
            }

            .onboarding-route-shell {
              position: relative;
              min-height: 100dvh;
              background: #ffffff;
              color: #202126;
              isolation: isolate;
            }
          `,
        }}
      />
    </div>
  )
}
