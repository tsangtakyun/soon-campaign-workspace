'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Channel = {
  id: string
  label: string
  icon: string
  color: string
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
      { id: 'instagram-feed', label: 'Instagram', icon: '◎', color: '#e84393' },
      { id: 'facebook-feed', label: 'Facebook', icon: 'f', color: '#3178e8' },
      { id: 'linkedin-feed', label: 'LinkedIn', icon: 'in', color: '#1d72b8' },
      { id: 'x-feed', label: 'X (Twitter)', icon: 'X', color: '#111111' },
      { id: 'google-business', label: 'Google Business Profile', icon: 'G', color: '#4285f4', disabled: true },
    ],
  },
  {
    id: 'stories',
    title: 'Stories',
    channels: [
      { id: 'instagram-stories', label: 'Instagram', icon: '◎', color: '#e84393' },
      { id: 'facebook-stories', label: 'Facebook', icon: 'f', color: '#3178e8' },
    ],
  },
  {
    id: 'short-video',
    title: 'Short-form Video',
    channels: [
      { id: 'instagram-reels', label: 'Instagram Reels', icon: '◎', color: '#e84393' },
      { id: 'tiktok', label: 'TikTok', icon: '♪', color: '#111111' },
      { id: 'youtube-shorts', label: 'YouTube', icon: '▶', color: '#ff2a21' },
    ],
  },
  {
    id: 'long-email',
    title: 'Long-form & Email',
    channels: [
      { id: 'blog', label: 'Blog', icon: '▤', color: '#111111' },
      { id: 'newsletter', label: 'Newsletter', icon: '✉', color: '#111111' },
    ],
  },
]

const defaultSelected = new Set([
  'instagram-feed',
  'facebook-feed',
  'linkedin-feed',
  'x-feed',
  'blog',
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
                        <span className="channel-icon" style={{ color: channel.color }}>{channel.icon}</span>
                        <span>{channel.label}</span>
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
  }

  .channel-pill b {
    width: 19px;
    height: 19px;
    border-radius: 50%;
    margin-left: 2px;
    display: inline-grid;
    place-items: center;
    background: #191919;
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
