import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOON 題材庫',
    short_name: 'SOON',
    description: '將 Instagram 及網頁內容快速加入品牌 workspace 題材庫。',
    start_url: '/onboarding/topic-library',
    display: 'standalone',
    background_color: '#f7f7f8',
    theme_color: '#111111',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    share_target: {
      action: '/add',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
  } as MetadataRoute.Manifest
}
