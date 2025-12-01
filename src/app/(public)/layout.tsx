import type { Metadata } from 'next'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import { MaybeChrome, MainWithOffset } from './components/RouteChrome' // <-- NEU

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gleno.de'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    // Neuer Fokus: Unternehmenssoftware statt „Marktplatz, CRM & Website“
    default:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    template: '%s | GLENO',
  },
  // Kurzbeschreibung mit Fokus auf Auftrags-/Projekt-/Rechnungsmanagement etc.
  description:
    'GLENO ist die cloudbasierte All-in-One Unternehmenssoftware für Dienstleister und KMU. Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Termine & Team – alles in einer Plattform statt Tool-Chaos.',
  // Canonical lieber auf die echte Domain legen
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'GLENO',
    // Neuer OG-Titel mit Unternehmenssoftware-Fokus
    title:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    // Neue OG-Description mit deinen Kernfunktionen
    description:
      'Weniger Aufwand, weniger Kosten, mehr Zeit: GLENO bündelt Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Termine & Team in einer cloudbasierten Unternehmenssoftware.',
    images: [
      {
        url: `${siteUrl}/og.png`, // absoluter Pfad, Bildname bleibt wie gehabt
        width: 1200,
        height: 630,
        alt: 'GLENO – All-in-One Unternehmenssoftware für Dienstleister & KMU',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    description:
      'Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung & Termine – mit GLENO arbeiten Dienstleister & KMU strukturierter und mit mehr Ruhe im Alltag.',
    images: [`${siteUrl}/og.png`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // globaler Wrapper verhindert horizontales Scrollen zuverlässig
    <div className="overflow-x-hidden max-w-[100vw]">
      {/* Header nur rendern, wenn NICHT /w/... */}
      <MaybeChrome>
        <Header />
      </MaybeChrome>

      {/* Der Offset (pt-14/md:pt-16) wird automatisch nur gesetzt,
          wenn NICHT /w/... */}
      <MainWithOffset>
        {children}
        {/* Cookie-Banner nur rendern, wenn NICHT /w/... */}
        <MaybeChrome>
          <CookieBanner />
        </MaybeChrome>
      </MainWithOffset>

      {/* Footer nur rendern, wenn NICHT /w/... */}
      <MaybeChrome>
        <Footer />
      </MaybeChrome>
    </div>
  )
}
