// src/app/(public)/beratung/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import BookingForm from './BookingForm'

const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'
const PRIMARY = '#0a1b40'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kostenlose Zoom-Beratung – GLENO',
    template: '%s | GLENO',
  },
  description:
    'Buchen Sie einen kostenlosen Zoom-Beratungstermin mit GLENO. Persönliche Live-Demo der Software für Angebote, Rechnungen, CRM und Zeiterfassung für KMU, Dienstleister & Handwerksbetriebe.',
  alternates: { canonical: `${SITE_URL}/beratung` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/beratung`,
    siteName: SITE_NAME,
    title: 'Kostenlose Zoom-Beratung – GLENO',
    description:
      'In 30 Minuten zeigen wir Ihnen, wie GLENO den Arbeitsalltag in KMU, Dienstleistungs- und Handwerksbetrieben spürbar vereinfachen kann.',
    images: [
      {
        url: `${SITE_URL}/og/og-beratung.jpg`,
        width: 1200,
        height: 630,
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kostenlose Zoom-Beratung – GLENO',
    description:
      'Jetzt persönlichen GLENO-Zoom-Termin buchen: Angebote, Rechnungen, CRM & Zeiterfassung in einer Live-Demo.',
    images: [`${SITE_URL}/og/og-beratung.jpg`],
  },
  robots: { index: true, follow: true },
}

function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: `${SITE_URL}/beratung`,
    description:
      'Kostenlose Online-Beratung und Live-Demo der GLENO-Software über Zoom.',
    areaServed: 'DE',
    inLanguage: 'de-DE',
  }
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export default function BeratungPage() {
  return (
    <>
      <JsonLd />

      {/* Keyframes für Glow-Hintergrund */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes floatGlow {
            0%   { transform: translate3d(0,0,0); opacity:.55 }
            50%  { transform: translate3d(16px,10px,0); opacity:.8 }
            100% { transform: translate3d(0,0,0); opacity:.55 }
          }`,
        }}
      />

      <div className="relative mx-auto max-w-6xl space-y-14 px-6 py-12 sm:py-16 lg:py-20">
        {/* Radial-Hintergrund */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-32vh] -z-10 h-[120vh] w-[170vw] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(1200px 480px at 50% 0%, rgba(10,27,64,0.06), transparent),' +
              'radial-gradient(900px 420px at 18% 6%, rgba(10,27,64,0.05), transparent),' +
              'radial-gradient(900px 420px at 82% 4%, rgba(10,27,64,0.05), transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-6 -top-10 -z-10 h-[28rem] w-[28rem] rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(10,27,64,.14), rgba(10,27,64,0))',
            filter: 'blur(28px)',
            animation: 'floatGlow 18s ease-in-out infinite',
          }}
        />

        {/* HERO + rechter Bereich */}
        <section className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Linke Spalte (breiter) */}
          <div className="lg:w-7/12 space-y-6">
            {/* Haupttext */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                <span>Kostenlose Online-Beratung</span>
                <span className="text-slate-400">•</span>
                <span>30 Minuten per Zoom</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                GLENO in 30&nbsp;Minuten verstehen –{' '}
                <span className="block text-slate-800">
                  für alle KMU, Dienstleister &amp; Handwerksbetriebe
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-700">
                Wir schauen uns Ihre aktuelle Situation an, zeigen Ihnen die
                wichtigsten Funktionen von GLENO und beantworten Ihre Fragen –
                persönlich, klar und ohne Verkaufsshow.
              </p>

              {/* Ansprechpartner-Box volle Breite oben */}
              <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl ring-1 ring-white/60">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-100">
                    <Image
                      src="/kundenberater_pfad.jpeg"
                      alt="Christoph Pfad – Ihr Ansprechpartner bei GLENO"
                      fill
                      sizes="96px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Ihr persönlicher Ansprechpartner
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      Christoph Pfad
                    </div>
                    <div className="text-xs text-slate-500">
                      Geschäftsführer &amp; Gründer von GLENO
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Fokus: KMU, Dienstleister &amp; Handwerk. Im Termin geht es um
                  Ihre Prozesse – nicht um ein Skript.
                </p>
              </div>

              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {[
                  'Ideal für KMU, Dienstleister & Handwerk, die Angebote, Rechnungen & Projekte strukturierter abwickeln möchten.',
                  'Live-Demo: Angebote, Rechnungen, CRM, Zeiterfassung & Teamorganisation in einer Plattform.',
                  'Konkrete Empfehlungen, wie GLENO in Ihrem Betrieb am meisten bringt – unabhängig davon, ob Sie direkt starten.',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

{/* Hier dezent der 30-Tage-Hinweis */}
<div className="pt-2 text-sm text-slate-500">
  <span className="font-medium text-slate-700">
    Keine Kreditkarte, kein Abo –
  </span>{' '}
  das Gespräch ist für Sie komplett unverbindlich. Im Anschluss erhalten Sie
  die wichtigsten Infos und Links bequem per E-Mail.
  <span className="mt-1 block">
    Wenn GLENO zu Ihrem Unternehmen passt, können Sie sich nach dem Zoom-Call
    eine{' '}
    <span className="font-medium text-slate-700">
      30-tägige kostenlose Testphase
    </span>{' '}
    sichern.
  </span>
</div>


              <div className="pt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <div className="rounded-full border border-white/60 bg-white/70 px-3 py-1 backdrop-blur">
                  DSGVO-konformer Zoom-Call
                </div>
                <div className="rounded-full border border-white/60 bg-white/70 px-3 py-1 backdrop-blur">
                  Server in der EU
                </div>
                <div className="rounded-full border border-white/60 bg-white/70 px-3 py-1 backdrop-blur">
                  100% unverbindlich
                </div>
              </div>

              <div className="pt-4 text-xs text-slate-500">
                Schon entschieden?{' '}
                <Link
                  href="/preis"
                  className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-2"
                >
                  Direkt zu Preisen &amp; Paketen
                </Link>
              </div>
            </div>
          </div>

          {/* Rechte Spalte (schmaler) */}
          <div className="w-full lg:w-5/12">
            <BookingForm />
          </div>
        </section>
      </div>
    </>
  )
}
