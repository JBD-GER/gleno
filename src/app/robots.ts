// src/app/robots.ts
import type { MetadataRoute } from 'next'

const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) || 'https://www.gleno.de'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'], // grundsätzlich alles erlaubt
        // Private/technische Bereiche sperren
        disallow: [
          '/dashboard',        // deckt auch /dashboard/... ab
          '/api',              // deckt auch /api/... ab
          '/login',
          '/registrieren',
          '/neues-passwort',
          '/konsument',
          '/preview',
          '/draft',
          // KEIN '/_next' und '/static' hier – CSS/JS sollen crawlbar bleiben
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL, // von Google ignoriert, aber ok
  }
}
