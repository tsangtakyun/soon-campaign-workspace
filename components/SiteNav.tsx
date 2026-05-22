'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const DASHBOARD_PREFIXES = ['/onboarding', '/scheduled-posts', '/ops']
const AUTH_ROUTES = ['/signup', '/login', '/forgot-password', '/reset-password']

export default function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const isDashboardRoute = DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 80)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  if (isDashboardRoute) return null

  if (isAuthRoute) return null

  return (
    <>
      <nav className={`site-nav ${scrolled ? 'site-nav--scrolled' : ''}`}>
        <Link href="/" className="brand-mark">
          <img
            src="https://wmpipimxqsnjwztuijbp.supabase.co/storage/v1/object/public/public-assets/Soon_logo.png"
            alt="SOON"
            className="brand-logo"
          />
        </Link>

        <div className="nav-links">
          <Link href="/soon-log">SOON LOG</Link>
          <Link href="/match-for-you">Match for You 創作者配對</Link>
          <Link href="/platform-stats">{'平台實況'}</Link>
          <Link href="/about">關於我們</Link>
          <Link href="/customers">客戶案例</Link>
          <Link href="/pricing">定價</Link>
          <Link href="/login">登入</Link>
          <Link href="/contact" className="nav-secondary">
            聯絡我們
          </Link>
          <Link href="/signup" className="nav-primary">
            開始試用
          </Link>
        </div>
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .site-nav {
              position: fixed;
              top: 0;
              left: 0;
              z-index: 1000;
              width: 100%;
              margin: 0;
              padding: 18px 7vw;
              border: 0;
              background: transparent;
              transition: background 220ms ease, padding 220ms ease;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            }

            .site-nav--scrolled {
              background: #000000;
            }

            .brand-mark {
              display: inline-flex;
              align-items: center;
              text-decoration: none;
            }

            .brand-logo {
              display: block;
              height: 108px;
              width: auto;
            }

            .nav-links {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 24px;
              flex: 1;
              flex-wrap: wrap;
            }

            .nav-links a {
              color: #ffffff;
              text-decoration: none;
              font-size: 1rem;
              font-weight: 650;
              letter-spacing: -0.02em;
              transition: color 160ms ease;
            }

            .nav-links a:hover {
              color: #ffffff;
            }

            .nav-secondary,
            .nav-primary {
              text-decoration: none;
              border-radius: 6px;
              padding: 12px 18px;
              font-size: 1rem;
              font-weight: 750;
              letter-spacing: -0.02em;
              white-space: nowrap;
            }

            .nav-secondary {
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.82);
              background: transparent;
            }

            .nav-primary {
              color: #ffffff;
              background: #ef4444;
              box-shadow: 0 14px 30px rgba(239, 68, 68, 0.28);
            }

            @media (max-width: 980px) {
              .site-nav {
                padding: 16px 20px;
                flex-direction: column;
                align-items: stretch;
                background: rgba(0, 0, 0, 0.72);
              }

              .brand-logo {
                height: 72px;
              }

              .nav-links {
                justify-content: flex-start;
              }

              .nav-secondary,
              .nav-primary {
                flex: 1;
                text-align: center;
              }
            }

            @media (max-width: 640px) {
              .brand-logo {
                height: 56px;
              }

              .nav-links {
                gap: 10px 14px;
              }

              .nav-links a {
                font-size: 0.88rem;
              }
            }
          `,
        }}
      />
    </>
  )
}
