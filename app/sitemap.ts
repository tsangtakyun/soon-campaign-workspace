import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-09-04')
  return [
    { url: 'https://sooncreator.network/', lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: 'https://sooncreator.network/contact', lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://sooncreator.network/privacy', lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://sooncreator.network/terms', lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
