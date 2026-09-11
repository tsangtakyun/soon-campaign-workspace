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
              --soon-ivory: #f6f2eb;
              --soon-paper: #ffffff;
              --soon-oxblood: #6b2c30;
              --soon-oxblood-dark: #42191c;
              --soon-clay: #b46a61;
              --soon-ink: #1a1a1a;
              --soon-copy: #57514e;
              --soon-muted: #77706d;
              --soon-line: #ded5cd;
              --soon-chartreuse: #c7e63a;
              --soon-data-blue: #dde7f6;
              --soon-danger: #d94b4b;
              --soon-success: #4d6417;
              --soon-radius-sm: 10px;
              --soon-radius-md: 14px;
              --soon-radius-lg: 20px;
              --soon-shadow-sm: 0 6px 18px rgba(66, 25, 28, .07);
              --soon-shadow-md: 0 18px 48px rgba(66, 25, 28, .11);
              --soon-focus: 0 0 0 4px rgba(107, 44, 48, .13);
            }

            html,
            body {
              background: var(--soon-ivory) !important;
              color: var(--soon-ink);
            }

            body::before {
              display: none !important;
            }

            .onboarding-route-shell {
              position: relative;
              min-height: 100dvh;
              background: var(--soon-ivory);
              color: var(--soon-ink);
              isolation: isolate;
            }
          `,
        }}
      />
    </div>
  )
}
