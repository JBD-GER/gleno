import type { Metadata } from 'next'
import MarktClient from './MarktClient'

const SITE_NAME = 'Software Fliesenleger'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.software-fliesenleger.de'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Markt – Anfrage erfassen',
    template: '%s | Software Fliesenleger',
  },
  description:
    'Formuliere deine Anfrage – wir strukturieren sie automatisch (Branche, Kategorie, Ausführung) und erzeugen einen nutzbaren Nachrichtentext. Budget wird bei Bedarf empfohlen.',
  alternates: { canonical: `${SITE_URL}/markt` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/markt`,
    siteName: SITE_NAME,
    title: 'Markt – Anfrage erfassen',
    description:
      'Strukturierte Anfrage mit KI: Branche, Kategorie, Ausführung & Dringlichkeit – plus Nachrichtentext. Budget nur, wenn sinnvoll.',
    images: [
      { url: `${SITE_URL}/og/og-market.jpg`, width: 1200, height: 630, alt: 'Markt – Anfrage erfassen' },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Markt – Anfrage erfassen',
    description:
      'KI-normalisierte Anfrage: Branche, Kategorie, Ausführung & Dringlichkeit – inkl. fertigem Nachrichtentext.',
    images: [`${SITE_URL}/og/og-market.jpg`],
  },
  robots: { index: true, follow: true },
}

function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Markt – Anfrage erfassen',
    url: `${SITE_URL}/markt`,
    description:
      'KI-normalisierte Anfrage: Branche, Kategorie, Ausführung & Dringlichkeit – inkl. Nachrichtentext. Budget nur bei Bedarf.',
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default function Page() {
  return (
    <>
      <JsonLd />
      <MarktClient />
    </>
  )
}
