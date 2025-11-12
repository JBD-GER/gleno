// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

// immer ohne Slash am Ende
const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) || 'https://www.gleno.de'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 👇 Liste NUR öffentlich erreichbarer Seiten (Login/Registrierung etc. auslassen)
  const pages: Array<{
    path: string
    changefreq: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
    priority: number
  }> = [
    { path: '/',                                    changefreq: 'weekly',  priority: 1.0 },
    { path: '/funktionen',                          changefreq: 'monthly', priority: 0.9 },
    { path: '/preis',                               changefreq: 'monthly', priority: 0.8 },
    { path: '/markt',                               changefreq: 'weekly',  priority: 0.8 },
    { path: '/markt/branchen',                      changefreq: 'monthly', priority: 0.6 },
    { path: '/support',                             changefreq: 'monthly', priority: 0.5 },
    { path: '/impressum',                           changefreq: 'yearly',  priority: 0.3 },
    { path: '/datenschutz',                         changefreq: 'yearly',  priority: 0.3 },
    { path: '/agb',                                 changefreq: 'yearly',  priority: 0.3 },
    { path: '/status',                              changefreq: 'weekly',  priority: 0.2 },

    // Branchen – Handwerk
    { path: '/branchen/handwerk/gebaeudereinigung', changefreq: 'monthly', priority: 0.6 },
    // 👉 weitere Branchenseiten hier einfach ergänzen
  ]

  return pages.map(({ path, changefreq, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: changefreq,
    priority,
  }))
}
