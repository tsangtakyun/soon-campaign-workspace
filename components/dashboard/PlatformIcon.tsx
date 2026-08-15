'use client'

type PlatformIconProps = {
  id: string
  size?: number
}

export function PlatformIcon({ id, size = 22 }: PlatformIconProps) {
  const dimensions = { height: size, width: size }

  if (id === 'google-analytics') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" {...dimensions} fill="none">
        <rect x="4" y="11" width="4.5" height="8" rx="2.25" fill="#F9AB00" />
        <rect x="9.75" y="7" width="4.5" height="12" rx="2.25" fill="#E37400" />
        <rect x="15.5" y="4" width="4.5" height="15" rx="2.25" fill="#F9AB00" />
      </svg>
    )
  }

  if (id === 'instagram') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" {...dimensions} fill="none">
        <defs>
          <radialGradient id={`ig-platform-grad-${size}`} cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="5%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#ig-platform-grad-${size})`} />
        <circle cx="12" cy="12" r="4.4" stroke="white" strokeWidth="1.7" />
        <circle cx="17.4" cy="6.7" r="1.25" fill="white" />
      </svg>
    )
  }

  if (id === 'facebook') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" {...dimensions} fill="none">
        <circle cx="12" cy="12" r="10" fill="#1877F2" />
        <path
          d="M13.2 18v-5.3h1.8l.3-2.1h-2.1V9.2c0-.6.2-1 1.1-1h1.1V6.3c-.2 0-.9-.1-1.7-.1-1.7 0-2.8 1-2.8 2.8v1.6H9v2.1h1.9V18h2.3Z"
          fill="#fff"
        />
      </svg>
    )
  }

  if (id === 'threads') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" {...dimensions} fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#111111" />
        <path
          d="M12.1 18.3c-3.1 0-5.2-1.8-5.2-4.4 0-2.4 1.8-4.1 4.5-4.1 1.2 0 2.2.3 3 .8-.3-1.5-1.2-2.3-2.7-2.3-1.1 0-2 .4-2.8 1.1L7.8 8.1c1-.9 2.3-1.4 3.9-1.4 2.9 0 4.5 1.8 4.8 5.2 1 .5 1.5 1.3 1.5 2.3 0 1.5-1.1 2.5-2.8 2.5-.7 1-1.8 1.6-3.1 1.6Zm-.6-6.9c-1.6 0-2.7 1-2.7 2.4 0 1.6 1.3 2.8 3.3 2.8.6 0 1.1-.1 1.6-.4-1.8-.3-2.9-1.2-2.9-2.3 0-1.2 1-2 2.5-2 .5 0 1 .1 1.5.2-.6-.5-1.7-.7-3.3-.7Zm1.9 2c-.7 0-1 .2-1 .6s.6.8 1.8.8h.4c.1-.2.1-.5.1-.7v-.3c-.4-.3-.8-.4-1.3-.4Z"
          fill="#fff"
        />
      </svg>
    )
  }

  if (id === 'youtube') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" {...dimensions} fill="none">
        <rect x="3" y="6" width="18" height="12" rx="4" fill="#FF0000" />
        <path d="M10.4 9.3v5.4l4.8-2.7-4.8-2.7Z" fill="#fff" />
      </svg>
    )
  }

  return null
}
