import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/contact', '/privacy', '/terms'],
      disallow: ['/api/', '/auth/', '/claim/', '/dashboard', '/dev/', '/invite/', '/onboarding/', '/ops/', '/paid-analysis', '/scheduled-posts', '/select-workspace', '/workspace/'],
    },
    sitemap: 'https://sooncreator.network/sitemap.xml',
  }
}
