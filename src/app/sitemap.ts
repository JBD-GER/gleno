// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gleno.de'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  // Öffentliche Seiten – nach Bedarf erweitern
  const routes = [
    { url: '/',            changefreq: 'weekly'  as const,  priority: 1.0 },
    { url: '/funktionen',  changefreq: 'monthly' as const,  priority: 0.9 },
    { url: '/preis',       changefreq: 'monthly' as const,  priority: 0.8 },
    { url: '/support',     changefreq: 'monthly' as const,  priority: 0.6 },
    { url: '/markt',       changefreq: 'monthly' as const,  priority: 0.7 },
      { url: '/markt/branchen',     changefreq: 'monthly' as const,  priority: 0.5 },
  ]

  return routes.map(r => ({
    url: `${base}${r.url}`,
    lastModified: now,
    changeFrequency: r.changefreq,
    priority: r.priority,
  }))
}
