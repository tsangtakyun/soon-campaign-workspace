import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ginkgobeautyhk.com' },
      { protocol: 'https', hostname: 'ginkgobeautyhk.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  serverExternalPackages: ['stripe'],
}

export default nextConfig
