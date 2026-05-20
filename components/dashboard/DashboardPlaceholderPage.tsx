'use client'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type DashboardPlaceholderPageProps = {
  activeItem: string
  title: string
  description: string
}

export function DashboardPlaceholderPage({
  activeItem,
  description,
  title,
}: DashboardPlaceholderPageProps) {
  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem={activeItem} />

      <section className="placeholder-shell">
        <header className="placeholder-topbar">
          <h1>{title}</h1>
        </header>

        <div className="placeholder-body">
          <section className="placeholder-card">
            <span>即將推出</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </section>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${placeholderStyles}` }} />
    </main>
  )
}

const placeholderStyles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .placeholder-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .placeholder-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    padding: 0 20px;
  }

  .placeholder-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .placeholder-body {
    min-height: calc(100vh - 58px);
    display: grid;
    place-items: center;
    padding: 32px;
  }

  .placeholder-card {
    width: min(480px, 100%);
    border: 1px solid #e8e9ec;
    border-radius: 14px;
    background: #ffffff;
    padding: 28px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(32, 33, 38, 0.06);
  }

  .placeholder-card span {
    display: inline-flex;
    margin-bottom: 10px;
    border-radius: 999px;
    background: #f2f3f5;
    color: #6f7278;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .placeholder-card h2 {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 700;
  }

  .placeholder-card p {
    margin: 0;
    color: #6f7278;
    font-size: 14px;
    line-height: 1.6;
  }
`
