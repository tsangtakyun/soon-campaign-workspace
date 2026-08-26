'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const DASHBOARD_PREFIXES = ['/onboarding', '/scheduled-posts', '/ops']
const AUTH_ROUTES = ['/signup', '/login', '/select-workspace', '/forgot-password', '/reset-password']

export default function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? '關閉導覽選單' : '開啟導覽選單'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`}>
          <Link href="/#product">產品功能</Link>
          <Link href="/#features">品牌增長</Link>
          <Link href="/#workflow">內容流程</Link>
          <Link href="/#about">關於 SOON</Link>
          <Link href="/#pricing">定價</Link>
          <Link href="/login?google=1">登入</Link>
          <Link href="/contact" className="nav-secondary">
            聯絡我們
          </Link>
          <Link href="/signup" className="nav-primary">
            開始使用
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
              padding: 12px 5vw;
              border: 0;
              background: transparent;
              transition: background 220ms ease, padding 220ms ease;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
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
              height: 60px;
              width: auto;
            }

            .nav-toggle {
              display: none;
            }

            .nav-links {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: clamp(12px, 1.4vw, 20px);
              flex: 1;
              flex-wrap: wrap;
            }

            .nav-links a {
              color: #ffffff;
              text-decoration: none;
              font-size: 0.92rem;
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
              padding: 10px 15px;
              font-size: 0.92rem;
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
                padding: 12px 20px;
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(16px);
              }

              .brand-logo {
                height: 58px;
              }

              .nav-toggle {
                width: 46px;
                height: 46px;
                margin-left: auto;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 10px;
                background: rgba(255,255,255,0.06);
                display: grid;
                place-content: center;
                gap: 7px;
              }

              .nav-toggle span {
                display: block;
                width: 20px;
                height: 2px;
                border-radius: 999px;
                background: #ffffff;
              }

              .nav-links {
                position: absolute;
                top: calc(100% + 8px);
                left: 16px;
                right: 16px;
                padding: 14px;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                background: rgba(10,10,11,0.98);
                box-shadow: 0 24px 60px rgba(0,0,0,0.42);
                display: none;
                align-items: stretch;
                flex-direction: column;
                gap: 2px;
              }

              .nav-links--open {
                display: flex;
              }

              .nav-links a {
                padding: 12px 10px;
              }

              .nav-secondary,
              .nav-primary {
                text-align: center;
              }
            }

            @media (max-width: 640px) {
              .brand-logo {
                height: 48px;
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
