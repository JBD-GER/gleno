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
    default: 'GLENO – Marktplatz, CRM & Website in einem',
    template: '%s | GLENO',
  },
  description:
    'GLENO vereint Marktplatz, CRM und Website in einer Plattform.',
  alternates: { canonical: '/' },
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
    title: 'GLENO – Marktplatz, CRM & Website in einem',
    description:
      'Angebote, Aufträge, Rechnungen & Projekte – alles in einem Tool.',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'GLENO' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GLENO – Marktplatz, CRM & Website in einem',
    description:
      'Angebote, Aufträge, Rechnungen & Projekte – alles in einem Tool.',
    images: ['/og.png'],
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
    <>
      {/* Meta Pixel Code */}
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '24847308948271777');
            fbq('track', 'PageView');
          `,
        }}
      />

      {/* noscript Fallback für User ohne JS */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=24847308948271777&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>

      {/* eigentlicher Layout-Wrapper */}
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
    </>
  )
}
