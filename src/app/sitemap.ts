// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

// immer ohne Slash am Ende
const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) ||
  'https://www.gleno.de'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // NUR öffentlich erreichbare Seiten
  const pages: Array<{
    path: string
    changefreq: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
    priority: number
  }> = [
    { path: '/',                                      changefreq: 'weekly',  priority: 1.0 },

    // Hauptseiten
    { path: '/funktionen',                            changefreq: 'monthly', priority: 0.9 },
    { path: '/preis',                                 changefreq: 'monthly', priority: 0.8 },
    { path: '/markt',                                 changefreq: 'weekly',  priority: 0.8 },

    // Beratung / Registrierung
    { path: '/beratung',                              changefreq: 'weekly',  priority: 0.7 },
    { path: '/registrieren',                          changefreq: 'monthly', priority: 0.6 },

    // Blog
    { path: '/blog',                                  changefreq: 'weekly',  priority: 0.7 },
    { path: '/blog/gbr-gruendung',                    changefreq: 'monthly', priority: 0.7 },
    { path: '/blog/kmu-software',                     changefreq: 'monthly', priority: 0.7 },

    // Doku / Support
    { path: '/docs',                                  changefreq: 'monthly', priority: 0.5 },
    { path: '/support',                               changefreq: 'monthly', priority: 0.5 },

    // Rechtliches
    { path: '/impressum',                             changefreq: 'yearly',  priority: 0.3 },
    { path: '/datenschutz',                           changefreq: 'yearly',  priority: 0.3 },
    { path: '/agb',                                   changefreq: 'yearly',  priority: 0.3 },

    // Statusseite
    { path: '/status',                                changefreq: 'weekly',  priority: 0.2 },
  ]

  return pages.map(({ path, changefreq, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: changefreq,
    priority,
  }))
}
