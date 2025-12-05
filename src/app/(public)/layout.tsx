import type { Metadata } from 'next'
import Script from 'next/script'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import { MaybeChrome, MainWithOffset } from './components/RouteChrome' // <-- NEU

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gleno.de'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    template: '%s | GLENO',
  },
  description:
    'GLENO ist die cloudbasierte All-in-One Unternehmenssoftware für Dienstleister und KMU. Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Termine & Team – alles in einer Plattform statt Tool-Chaos.',
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
    title:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    description:
      'Weniger Aufwand, weniger Kosten, mehr Zeit: GLENO bündelt Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Termine & Team in einer cloudbasierten Unternehmenssoftware.',
    images: [
      {
        url: `${siteUrl}/og.png`,
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

      {/* Chatwoot Live Chat Widget – nicht auf /dashboard */}
      <Script id="chatwoot-widget" strategy="afterInteractive">
        {`
          (function(d,t) {
            // nicht im Dashboard anzeigen
            if (window.location.pathname.startsWith('/dashboard')) {
              return;
            }

            var BASE_URL="https://app.chatwoot.com";
            var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
            g.src=BASE_URL+"/packs/js/sdk.js";
            g.async = true;
            s.parentNode.insertBefore(g,s);
            g.onload=function(){
              window.chatwootSDK.run({
                websiteToken: 'BnoGKe44ekNKvigmJFCE6CSX',
                baseUrl: BASE_URL
              })
            }
          })(document,"script");
        `}
      </Script>
    </div>
  )
}
