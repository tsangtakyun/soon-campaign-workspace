'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Channel = {
  id: string
  label: string
  icon: 'instagram' | 'facebook' | 'threads' | 'rednote' | 'wechat' | 'tiktok' | 'youtube' | 'newsletter'
  badge?: string
  disabled?: boolean
}

type ChannelGroup = {
  id: string
  title: string
  channels: Channel[]
}

const channelGroups: ChannelGroup[] = [
  {
    id: 'social-feed',
    title: '社交 Feed Posts',
    channels: [
      { id: 'instagram-feed', label: 'Instagram', icon: 'instagram' },
      { id: 'facebook-feed', label: 'Facebook', icon: 'facebook' },
      { id: 'threads-feed', label: 'Threads', icon: 'threads', badge: '即將推出' },
      { id: 'rednote-feed', label: '小紅書', icon: 'rednote', badge: '手動發佈' },
      { id: 'wechat-feed', label: 'WeChat', icon: 'wechat', badge: '手動發佈' },
    ],
  },
  {
    id: 'stories',
    title: 'Stories',
    channels: [
      { id: 'instagram-stories', label: 'Instagram', icon: 'instagram' },
      { id: 'facebook-stories', label: 'Facebook', icon: 'facebook' },
    ],
  },
  {
    id: 'short-video',
    title: 'Short-form Video',
    channels: [
      { id: 'instagram-reels', label: 'Instagram Reels', icon: 'instagram' },
      { id: 'tiktok', label: 'TikTok', icon: 'tiktok' },
      { id: 'youtube-shorts', label: 'YouTube', icon: 'youtube' },
    ],
  },
  {
    id: 'long-email',
    title: 'Long-form & Email',
    channels: [
      { id: 'newsletter', label: 'Newsletter', icon: 'newsletter' },
    ],
  },
]

const defaultSelected = new Set([
  'instagram-feed',
  'facebook-feed',
  'newsletter',
])

function DistributionContent() {
  const searchParams = useSearchParams()
  const [selectedChannels, setSelectedChannels] = useState(defaultSelected)
  const [schedule, setSchedule] = useState('weekdays')

  const selectedLabels = useMemo(() => {
    return channelGroups
      .flatMap((group) => group.channels)
      .filter((channel) => selectedChannels.has(channel.id))
      .map((channel) => channel.label)
  }, [selectedChannels])

  function toggleChannel(channel: Channel) {
    if (channel.disabled) return
    setSelectedChannels((current) => {
      const next = new Set(current)
      if (next.has(channel.id)) {
        next.delete(channel.id)
      } else {
        next.add(channel.id)
      }
      return next
    })
  }

  function handleContinue() {
    const payload = {
      channels: selectedLabels,
      channelIds: Array.from(selectedChannels),
      schedule,
      crossPosting: true,
    }
    sessionStorage.setItem('soon-distribution-preferences-v1', JSON.stringify(payload))

    const url = new URL('/onboarding/content-mix', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('autoAnalyze', '1')
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="distribution-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="distribution-layout">
        <div className="distribution-main">
          <header>
            <h1>你的內容應該在哪裡和何時發佈？</h1>
            <p>選擇發佈渠道和排程偏好。之後可以隨時修改。</p>
          </header>

          <div className="channel-sections">
            {channelGroups.map((group) => (
              <section className="channel-group" key={group.id}>
                <h2>{group.title}</h2>
                <div className="channel-grid">
                  {group.channels.map((channel) => {
                    const selected = selectedChannels.has(channel.id)
                    return (
                      <button
                        className={`channel-pill ${selected ? 'selected' : ''}`}
                        disabled={channel.disabled}
                        key={channel.id}
                        onClick={() => toggleChannel(channel)}
                        type="button"
                      >
                        <span className="channel-icon"><ChannelIcon icon={channel.icon} /></span>
                        <span>{channel.label}</span>
                        {channel.badge ? <em>{channel.badge}</em> : null}
                        {selected ? <b>✓</b> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="schedule-section">
            <h2>發佈排程設定</h2>
            <div className="schedule-options">
              {[
                { id: 'everyday', label: '每日' },
                { id: 'weekdays', label: '只限平日' },
                { id: 'custom', label: '讓我選擇日子 ▾' },
              ].map((option) => (
                <button
                  className={schedule === option.id ? 'selected' : ''}
                  key={option.id}
                  onClick={() => setSchedule(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="info-card">
          <p>分發方式</p>
          <h2>預設會開啟 Cross-posting。</h2>
          <span>同一組內容會同步發佈到已選擇的渠道，讓第一輪 Campaign 更快覆蓋不同觸點。</span>
          <hr />
          <span>之後可以按 campaign 關閉 cross-posting，為每個渠道做更細緻的內容調整。</span>
        </aside>
      </section>

      <footer className="distribution-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>Continue</button>
      </footer>

      <style jsx>{styles}</style>
    </main>
  )
}

function Steps() {
  return (
    <nav className="steps" aria-label="Onboarding progress">
      {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
        <span className={index === 2 ? 'active' : ''} key={step}>
          {step}
          {index < 4 ? <b>›</b> : null}
        </span>
      ))}
    </nav>
  )
}

function ChannelIcon({ icon }: { icon: Channel['icon'] }) {
  if (icon === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <radialGradient id="distribution-ig-gradient" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#distribution-ig-gradient)" />
        <circle cx="12" cy="12" r="4.3" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.6" r="1.25" fill="#fff" />
      </svg>
    )
  }

  if (icon === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#1877F2" />
        <path fill="#fff" d="M13.3 18.2v-5.6h1.9l.3-2.2h-2.2V9c0-.6.2-1.1 1.1-1.1h1.2V6a16 16 0 0 0-1.8-.1c-1.8 0-3 1.1-3 3v1.6H8.8v2.2h2.1v5.6h2.4Z" />
      </svg>
    )
  }

  if (icon === 'threads') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#111" />
        <path fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.7" d="M8.2 12.1c0-2.8 1.5-4.5 3.7-4.5 2.3 0 3.8 1.5 4 4.6m-7.2 3.3c.8 1 2 1.5 3.4 1.5 2.2 0 3.7-1.1 3.7-2.7 0-1.5-1.2-2.4-3.3-2.4h-1.1c-1.8 0-2.8.8-2.8 2 0 1.1.9 1.8 2.2 1.8 1.9 0 3.2-1.2 3.2-3.1" />
      </svg>
    )
  }

  if (icon === 'rednote') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#ff2442" />
        <text x="12" y="15.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800">书</text>
      </svg>
    )
  }

  if (icon === 'wechat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#07C160" />
        <path fill="#fff" d="M10 8.2c-3 0-5.3 1.8-5.3 4 0 1.2.7 2.3 1.8 3l-.4 1.5 1.7-.9c.7.3 1.4.4 2.2.4 3 0 5.3-1.8 5.3-4s-2.4-4-5.3-4Zm-1.8 3.3a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Zm3.4 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Z" />
        <path fill="#fff" opacity=".92" d="M14.8 11.6c2.5 0 4.5 1.5 4.5 3.4 0 1-.6 1.9-1.5 2.5l.3 1.2-1.4-.7c-.6.2-1.2.3-1.9.3-2.5 0-4.5-1.5-4.5-3.4s2-3.3 4.5-3.3Zm-1.5 2.8a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2Zm2.9 0a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2Z" />
      </svg>
    )
  }

  if (icon === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#111" />
        <path fill="#25F4EE" d="M13.2 6.3h2c.2 1.4 1 2.4 2.4 2.8v2a5.8 5.8 0 0 1-2.4-.8v4.3a3.7 3.7 0 1 1-3.8-3.7h.4v2.2h-.5a1.5 1.5 0 1 0 1.5 1.5V6.3h.4Z" />
        <path fill="#FE2C55" d="M12.6 6.1h2c.2 1.4 1 2.4 2.4 2.8v2a5.8 5.8 0 0 1-2.4-.8v4.3a3.7 3.7 0 1 1-3.8-3.7h.4v2.2h-.5a1.5 1.5 0 1 0 1.5 1.5V6.1h.4Z" />
      </svg>
    )
  }

  if (icon === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6.2" width="18" height="11.6" rx="3.2" fill="#FF0000" />
        <path fill="#fff" d="m10.4 9.3 5 2.7-5 2.7V9.3Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" fill="#111" />
      <path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="m5.8 8 6.2 5 6.2-5" />
    </svg>
  )
}

const styles = `
  .distribution-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #161719;
    position: relative;
    padding: 18px 22px 86px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto 38px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9a9a9a;
    font-size: 0.78rem;
    font-weight: 500;
  }

  .steps span {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }

  .steps .active {
    color: #1b1c1f;
  }

  .steps b {
    color: #b4b4b4;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .more-button {
    position: absolute;
    top: 18px;
    right: 30px;
    border: 0;
    background: transparent;
    color: #1b1c1f;
    font-size: 0.92rem;
    cursor: pointer;
  }

  .distribution-layout {
    width: min(100%, 1120px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 44px;
    align-items: start;
  }

  .distribution-main {
    min-width: 0;
  }

  header {
    margin-bottom: 30px;
  }

  h1 {
    margin: 0 0 9px;
    font-size: clamp(1.8rem, 3.2vw, 2.65rem);
    line-height: 1.05;
    letter-spacing: 0;
    font-weight: 520;
  }

  header p {
    margin: 0;
    color: #676a70;
    font-size: clamp(0.88rem, 1.1vw, 1rem);
    line-height: 1.45;
  }

  .channel-sections {
    display: grid;
    gap: 25px;
  }

  .channel-group,
  .schedule-section {
    display: grid;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1.12rem;
    line-height: 1.2;
    font-weight: 500;
    letter-spacing: 0;
  }

  .channel-grid,
  .schedule-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .channel-pill,
  .schedule-options button {
    min-height: 36px;
    border: 1px solid #dedfe3;
    border-radius: 8px;
    background: #ffffff;
    color: #202124;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 0 10px;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background 160ms ease;
  }

  .channel-pill:hover,
  .schedule-options button:hover {
    border-color: #1d1d1f;
    transform: translateY(-1px);
  }

  .channel-pill.selected,
  .schedule-options button.selected {
    border-color: #1d1d1f;
    box-shadow: inset 0 0 0 1px #1d1d1f;
  }

  .channel-pill:disabled {
    color: #a3a5aa;
    border-color: #ebecef;
    background: #fbfbfb;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .channel-icon {
    width: 18px;
    height: 18px;
    display: inline-grid;
    place-items: center;
    font-weight: 650;
    line-height: 1;
    flex-shrink: 0;
  }

  .channel-icon svg {
    width: 18px;
    height: 18px;
    display: block;
  }

  .channel-pill em {
    border-radius: 999px;
    background: #f0f1f3;
    color: #6c7078;
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 650;
    line-height: 1;
    padding: 4px 7px;
    white-space: nowrap;
  }

  .channel-pill b {
    width: 19px;
    height: 19px;
    border-radius: 50%;
    margin-left: 2px;
    display: inline-grid;
    place-items: center;
    background: #16a34a;
    color: #ffffff;
    font-size: 0.66rem;
  }

  .schedule-section {
    margin-top: 30px;
  }

  .schedule-options button {
    min-height: 34px;
    font-weight: 500;
    background: #fafafa;
  }

  .schedule-options button.selected {
    background: #ffffff;
    font-weight: 560;
  }

  .info-card {
    margin-top: 42px;
    border: 1px solid #e9e9e9;
    border-radius: 12px;
    padding: 25px 22px;
    display: grid;
    gap: 12px;
    color: #1c1d20;
  }

  .info-card p {
    margin: 0;
    color: #777a80;
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .info-card h2 {
    font-size: 1rem;
    font-weight: 560;
  }

  .info-card span {
    color: #2e3035;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .info-card hr {
    width: 100%;
    border: 0;
    border-top: 1px solid #ededed;
    margin: 2px 0;
  }

  .distribution-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 56px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 22px;
    z-index: 20;
  }

  .distribution-footer button {
    min-height: 34px;
    border-radius: 7px;
    border: 0;
    background: transparent;
    color: #191919;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0 14px;
  }

  .distribution-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  @media (max-width: 980px) {
    .distribution-layout {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .info-card {
      margin-top: 0;
    }
  }

  @media (max-width: 760px) {
    .distribution-page {
      padding: 18px 14px 86px;
    }

    .steps {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 24px;
      justify-content: flex-start;
    }

    header {
      margin-bottom: 24px;
    }

    .channel-sections {
      gap: 24px;
    }

    .channel-pill,
    .schedule-options button {
      min-height: 38px;
      font-size: 0.82rem;
    }

    .distribution-footer {
      padding: 10px 14px;
    }
  }
`

export default function DistributionPage() {
  return (
    <Suspense fallback={null}>
      <DistributionContent />
    </Suspense>
  )
}
