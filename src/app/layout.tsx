import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { ReactNode, Suspense } from 'react'
import GtmProvider from '@/app/(public)/components/GtmProvider'
import CookieBanner from '@/app/(public)/components/CookieBanner'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gleno.de'
const gtmId = process.env.NEXT_PUBLIC_GTM_ID

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, 'max-image-preview': 'none', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

type RootLayoutProps = { children: ReactNode }

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de">
      <head>
        {/* 1) Consent Mode v2 – Default: DENIED (rechtssicher) */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent','default',{
              ad_storage:'denied',
              analytics_storage:'denied',
              ad_user_data:'denied',
              ad_personalization:'denied',
              functionality_storage:'granted',
              security_storage:'granted'
            });
          `}
        </Script>

        {/* 2) BOOTSTRAP: Vorliegende Entscheidung aus localStorage anwenden */}
        <Script id="consent-bootstrap" strategy="beforeInteractive">
          {`
            try {
              var raw = localStorage.getItem('sf_consent_v1');
              if (raw) {
                var c = JSON.parse(raw);
                var granted = !!(c && (c.analytics || c.functional || c.marketing)); // deine Struktur
                // explizit nach deinen Flags mappen:
                var analyticsGranted = !!(c && c.analytics);
                var marketingGranted = !!(c && c.marketing);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent','update',{
                  analytics_storage: analyticsGranted ? 'granted' : 'denied',
                  functionality_storage: 'granted',
                  security_storage: 'granted',
                  ad_storage: marketingGranted ? 'granted' : 'denied',
                  ad_user_data: marketingGranted ? 'granted' : 'denied',
                  ad_personalization: marketingGranted ? 'granted' : 'denied'
                });
              }
            } catch(e) {}
          `}
        </Script>

        {/* 3) BRIDGE: auf dein CustomEvent hören und Consent updaten */}
        <Script id="consent-bridge" strategy="afterInteractive">
          {`
            window.addEventListener('sf:consent-updated', function(ev){
              try {
                var c = ev && ev.detail ? ev.detail : {};
                var analyticsGranted = !!c.analytics;
                var marketingGranted = !!c.marketing;
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent','update',{
                  analytics_storage: analyticsGranted ? 'granted' : 'denied',
                  functionality_storage: c.functional ? 'granted' : 'granted',
                  security_storage: 'granted',
                  ad_storage: marketingGranted ? 'granted' : 'denied',
                  ad_user_data: marketingGranted ? 'granted' : 'denied',
                  ad_personalization: marketingGranted ? 'granted' : 'denied'
                });
              } catch(e) {}
            });
          `}
        </Script>

        {/* Google Tag Manager laden */}
        {gtmId && (
          <Script id="gtm-base" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
        )}
      </head>

      <body className="min-h-screen bg-bg-200">
        {/* NoScript Fallback */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}

        {/* SPA-Pageviews (usePathname/useSearchParams → Suspense nötig) */}
        <Suspense fallback={null}>
          <GtmProvider />
        </Suspense>

        {/* Dein unveränderter Banner */}
        <CookieBanner />

        {children}
      </body>
    </html>
  )
}
