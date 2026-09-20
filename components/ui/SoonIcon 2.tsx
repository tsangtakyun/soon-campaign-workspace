import type { ReactNode, SVGProps } from 'react'

export const soonIconNames = [
  'home', 'calendar', 'ideas', 'campaign', 'create', 'integrations', 'brand', 'preferences', 'insights',
  'image', 'carousel', 'video', 'caption', 'hook', 'target', 'market', 'creator', 'publish', 'performance',
  'check', 'clock', 'warning', 'close', 'plus', 'edit', 'download', 'upload', 'save', 'refresh', 'search',
  'arrow-right', 'chevron-down', 'external-link', 'spark', 'lock', 'team', 'settings', 'more',
] as const

export type SoonIconName = typeof soonIconNames[number]

type SoonIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: SoonIconName
  size?: number
}

const paths: Record<SoonIconName, ReactNode> = {
  home: <><path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6"/></>,
  calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"/></>,
  ideas: <><path d="M8.2 15.8c-1.4-1.1-2.2-2.8-2.2-4.6a6 6 0 1 1 9.8 4.6c-.9.7-1.3 1.5-1.3 2.2h-5c0-.7-.4-1.5-1.3-2.2Z"/><path d="M9.5 21h5M10 13h4"/></>,
  campaign: <><path d="m4 13 10-5v10L4 15.5V13Z"/><path d="M14 11.2c3 0 5-1.4 6-3.2v10c-1-1.8-3-3.2-6-3.2M6.2 16l1 4h3l-1-3.3"/></>,
  create: <><path d="M12 3.5v17M3.5 12h17"/><path d="M5 5l1.2 1.2M17.8 17.8 19 19M19 5l-1.2 1.2M6.2 17.8 5 19"/></>,
  integrations: <><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="m9.2 9.2 5.6 5.6M14.8 6.2l3-3M6.2 14.8l-3 3"/></>,
  brand: <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v5M20.5 12h-5M12 20.5v-5M3.5 12h5"/></>,
  preferences: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></>,
  insights: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8" cy="9" r="1.5"/><path d="m5 17 4.5-4 3.2 2.7 2.8-2.4L19 17"/></>,
  carousel: <><rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M2.5 7v10M21.5 7v10M8 16l3-3 2.2 2 2-1.8L17 15"/></>,
  video: <><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9 5 3-5 3V9Z"/></>,
  caption: <><path d="M4 5h16v11H9l-4 3v-3H4V5Z"/><path d="M8 9h8M8 12h5"/></>,
  hook: <><path d="M8 5.5a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0V9"/><path d="M8 9H4.5a2.5 2.5 0 0 0 0 5H8"/></>,
  target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></>,
  market: <><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.3 3.5 5.1 3.5 8.5S14.3 18.2 12 20.5C9.7 18.2 8.5 15.4 8.5 12S9.7 5.8 12 3.5Z"/></>,
  creator: <><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></>,
  publish: <><path d="m4 12 16-8-6 16-2.5-6.5L4 12Z"/><path d="M11.5 13.5 20 4"/></>,
  performance: <><path d="M4 19h16M5 16l4-5 3 2 6-7"/><path d="M15 6h3v3"/></>,
  check: <path d="m5 12.5 4.3 4.2L19 7"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  warning: <><path d="M10.2 4.5 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.8 4.5a2 2 0 0 0-3.6 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>, plus: <path d="M12 5v14M5 12h14"/>,
  edit: <><path d="m14.5 5.5 4 4M4 20l4.2-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z"/></>,
  download: <><path d="M12 3v12M7.5 11l4.5 4.5 4.5-4.5M4 20h16"/></>,
  upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"/></>,
  save: <><path d="M5 3.5h12l2 2v15H5v-17Z"/><path d="M8 3.5v6h8v-6M8 20.5v-7h8v7"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
  'arrow-right': <><path d="M4 12h16M14 6l6 6-6 6"/></>,
  'chevron-down': <path d="m6 9 6 6 6-6"/>,
  'external-link': <><path d="M13 5h6v6M19 5l-9 9"/><path d="M18 14v5H5V6h5"/></>,
  spark: <><path d="M12 3c.6 4.8 2.2 6.4 7 7-4.8.6-6.4 2.2-7 7-.6-4.8-2.2-6.4-7-7 4.8-.6 6.4-2.2 7-7Z"/><path d="M19 16c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5Z"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  team: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.4 2.3-5 5.5-5s5 1.6 5.5 5"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 15c3.1-.3 4.8 1 5 4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
}

export function SoonIcon({ name, size = 20, ...props }: SoonIconProps) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>
}
