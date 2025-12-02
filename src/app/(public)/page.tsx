// src/app/(public)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

/* ----------------------------- Site Constants ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'
const ACCENT = PRIMARY

/* --------------------------------- SEO ----------------------------------- */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    template: '%s | GLENO',
  },
  description:
    'GLENO ist die cloudbasierte All-in-One Unternehmenssoftware für Dienstleister und KMU. Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Termine, Team & Dokumente – alles in einer Plattform statt Tool-Chaos.',
  keywords: [
    'Unternehmenssoftware',
    'Software Dienstleister',
    'Software KMU',
    'Auftragsmanagement Software',
    'Projektmanagement Software',
    'Rechnungsprogramm KMU',
    'Zeiterfassung Software',
    'Terminplanung',
    'All-in-One Unternehmenssoftware',
  ],
  category: 'software',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    description:
      'Weniger Aufwand, weniger Kosten, mehr Zeit. GLENO bündelt Aufträge, Projekte, Rechnungen, Zeiten, Termine & Team in einer cloudbasierten Unternehmenssoftware.',
    images: [
      {
        url: `${SITE_URL}/og/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – All-in-One Unternehmenssoftware für Dienstleister & KMU',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'GLENO – Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU',
    description:
      'Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung & Termine – mit GLENO arbeiten Dienstleister & KMU klarer und ruhiger.',
    images: [`${SITE_URL}/og/og-home.jpg`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

/* ----------------------------- JSON-LD Schema ----------------------------- */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favi.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}#organization` },
        inLanguage: 'de-DE',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Startseite',
            item: SITE_URL,
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}#app`,
        name: 'GLENO',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '59.00',
          priceCurrency: 'EUR',
          description:
            'Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU. Persönliche Beratung zum Einstieg.',
          url: `${SITE_URL}/beratung`,
        },
        description:
          'GLENO bündelt Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Terminplanung, Teamorganisation und Dokumentation in einer Unternehmenssoftware.',
        url: SITE_URL,
        image: `${SITE_URL}/og/og-home.jpg`,
        publisher: { '@id': `${SITE_URL}#organization` },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Für wen ist GLENO gemacht?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO richtet sich an Dienstleister, Handwerksbetriebe, Agenturen und andere kleine bis mittlere Unternehmen, die Aufträge, Projekte, Zeiten, Team und Rechnungen in einem System abbilden möchten.',
            },
          },
          {
            '@type': 'Question',
            name: 'Ist GLENO eine klassische ERP- oder CRM-Software?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO versteht sich als praxisnahe All-in-One Unternehmenssoftware. Im Fokus stehen Auftragsmanagement, Projektsteuerung, Rechnungen, Zeiten und Termine – ohne Konzern-Overhead.',
            },
          },
          {
            '@type': 'Question',
            name: 'Wie starte ich mit GLENO?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Über eine kostenlose Beratung klären wir, welche Bereiche Sie zuerst abbilden möchten und wie der Einstieg mit GLENO konkret aussieht.',
            },
          },
          {
            '@type': 'Question',
            name: 'Ist GLENO DSGVO-konform?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO wird auf Servern in der EU betrieben. Datensicherheit und DSGVO-konforme Prozesse sind fester Bestandteil der Plattform.',
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ---------------------------------- Page ---------------------------------- */
export default function HomePage() {
  return (
    <>
      <JsonLd />

      {/* HERO -------------------------------------------------------------- */}
      <section className="relative overflow-hidden text-slate-50">
        {/* Hintergrund */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(140% 140% at top, #020617 0, #020617 40%, #020617 70%, #020617 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-80 mix-blend-screen"
          style={{
            backgroundImage:
              'radial-gradient(circle at -10% -20%, rgba(37,99,235,0.35), transparent), radial-gradient(circle at 120% -10%, rgba(56,189,248,0.25), transparent)',
          }}
        />
        <div
          className="hero-blob hero-blob-left pointer-events-none absolute -left-32 bottom-[-120px] h-72 w-72 rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(56,189,248,0.45), transparent)',
          }}
        />
        <div
          className="hero-blob hero-blob-right pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(129,140,248,0.65), transparent)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-20">
                    {/* Pain-Badge oben */}
          <div className="mx-auto flex max-w-3xl items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-0.5 text-[9px] font-medium text-slate-200 ring-1 ring-slate-700/80 backdrop-blur">
              <span className="grid h-4 w-4 place-content-center rounded-full bg-slate-800 text-[9px] text-white">
                GL
              </span>
              <span>Zu viele Tools, zu wenig Überblick?</span>
              <span className="hidden text-slate-500 sm:inline">•</span>
              <span className="hidden sm:inline">
                GLENO bündelt Aufträge, Projekte &amp; Rechnungen in einer Oberfläche.
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mx-auto mt-6 max-w-4xl text-center">
            <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-slate-50 sm:text-[34px] lg:text-[40px]">
              <span className="block">
                Cloudbasierte All-in-One Unternehmenssoftware
              </span>
              <span className="mt-2 block text-[22px] text-slate-200 sm:text-[24px] lg:text-[26px]">
                für Dienstleister &amp; KMU mit Aufträgen, Projekten &amp; Rechnungen.
              </span>
            </h1>

            {/* Subline */}
            <p className="mt-4 text-[15px] leading-relaxed text-slate-200/90 sm:text-base">
              Weniger Tool-Chaos, weniger Kosten, mehr Zeit: GLENO verbindet
              Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung,
              Termine, Team &amp; Dokumente in einer klaren Oberfläche – statt fünf
              verschiedenen Systemen und endlosen Excel-Listen.
            </p>
          </div>

{/* CTA-Zeile */}
<div className="mt-7 flex flex-col items-center gap-2 sm:gap-3">
  <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
    <Link
      href="/beratung"
      className="hero-cta inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-white px-7 py-3 text-sm font-semibold text-slate-900 shadow-[0_20px_70px_rgba(0,0,0,0.9)] hover:shadow-[0_24px_90px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      Kostenlose Beratung buchen
      <span className="ml-1.5 text-xs">↗</span>
    </Link>

    <Link
      href="/login" // wenn du eine eigene Registrierungsseite hast, z.B. "/register" hier anpassen
      className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-white/70 bg-transparent px-7 py-3 text-sm font-semibold text-slate-50/95 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
    >
      Direkt kostenlos starten
    </Link>
  </div>

  <p className="text-[11px] text-slate-300 text-center">
    Kostenlos &amp; unverbindlich · Keine Kreditkarte · Made in Germany 🇩🇪
  </p>
</div>


          {/* Benefit-Pills */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 text-sm text-slate-100 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/70 px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="text-xs font-semibold text-emerald-300">
                Weniger Aufwand im Alltag
              </div>
              <p className="mt-1 text-[13px] text-slate-100">
                Keine doppelte Pflege von Kunden, Aufträgen und Zeiten – alles greift
                ineinander.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-400/40 bg-slate-950/70 px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="text-xs font-semibold text-sky-300">
                Weniger Software-Kosten
              </div>
              <p className="mt-1 text-[13px] text-slate-100">
                Ein System statt vieler Einzellösungen – mit klaren Prozessen statt
                versteckter Zeitfresser.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-400/40 bg-slate-950/70 px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="text-xs font-semibold text-indigo-300">
                Mehr Ruhe &amp; Planungssicherheit
              </div>
              <p className="mt-1 text-[13px] text-slate-100">
                Jeder weiß, was offen, geplant und erledigt ist – statt Suchen,
                Nachfassen und Hinterhertelefonieren.
              </p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-6 flex flex-col items-center gap-3 text-[11px] text-slate-200 sm:flex-row sm:justify-center">
            <div className="flex items-center gap-2">
              <div className="hero-stars flex items-center gap-0.5 text-base">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>
              <span className="text-[11px] text-slate-200 sm:text-xs">
                4,8 von 5 Punkten · basierend auf Nutzerfeedback
              </span>
            </div>
            <span className="hidden h-4 w-px bg-slate-700 sm:inline" />
            <span className="text-[11px] text-slate-300 sm:text-xs">
              Eingesetzt von Dienstleistern, Agenturen &amp; Handwerksbetrieben mit 3–25
              Mitarbeitenden
            </span>
          </div>

          {/* Branchen-Badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300/90">
            <span className="mr-1 text-slate-400">Typische Branchen:</span>
            <span className="rounded-full bg-slate-950/70 px-3 py-1 ring-1 ring-slate-700/80">
              IT- &amp; Kreativagenturen
            </span>
            <span className="rounded-full bg-slate-950/70 px-3 py-1 ring-1 ring-slate-700/80">
              Technische Dienstleister
            </span>
            <span className="rounded-full bg-slate-950/70 px-3 py-1 ring-1 ring-slate-700/80">
              Handwerksbetriebe
            </span>
          </div>

          {/* Screenshot + Siegel unten im Hero */}
          <div className="mt-12 flex flex-col items-center gap-4">
            {/* Haupt-Screenshot */}
            <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/70 shadow-[0_24px_90px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/10 via-sky-400/5 to-indigo-400/10 mix-blend-soft-light" />
              <Image
                src="/bilder/startseite/Uebersicht-Auftraege_Projekte.png"
                alt="GLENO – Übersicht über Aufträge & Projekte"
                width={1280}
                height={720}
                className="h-full w-full object-cover"
                priority
              />
            </div>

            {/* Siegel / Vertrauensmerkmale */}
            <div className="grid w-full max-w-5xl grid-cols-1 gap-3 text-left text-[11px] text-slate-100 sm:grid-cols-3">
              {/* DSGVO */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.7)] ring-1 ring-emerald-500/40">
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-emerald-400/30" />
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-400/40">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/70 bg-slate-950 text-[10px] font-semibold tracking-[0.14em]">
                    EU
                  </span>
                  <span>DSGVO-konform</span>
                </div>
                <h3 className="mt-3 text-[12px] font-semibold text-slate-50">
                  DSGVO-konforme Prozesse
                </h3>
                <p className="mt-1 text-[11px] text-slate-300/90">
                  Serverstandort EU, verschlüsselte Verbindungen und klare
                  Auftragsverarbeitung für Ihre Unternehmenssoftware.
                </p>
              </div>

              {/* Dienstleister & KMU */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.7)] ring-1 ring-sky-500/40">
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-sky-400/30" />
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-100 ring-1 ring-sky-400/40">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-sky-300/70 bg-slate-950 text-[10px] font-semibold tracking-[0.14em]">
                    DL
                  </span>
                  <span>Dienstleister &amp; KMU</span>
                </div>
                <h3 className="mt-3 text-[12px] font-semibold text-slate-50">
                  Entwickelt für Dienstleister &amp; KMU
                </h3>
                <p className="mt-1 text-[11px] text-slate-300/90">
                  Fokus auf Aufträge, Projekte, Zeiten &amp; Rechnungen – ohne
                  überladenes Konzern-ERP.
                </p>
              </div>

              {/* Standort Deutschland */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.7)] ring-1 ring-indigo-500/40">
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-indigo-400/30" />
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-100 ring-1 ring-indigo-400/40">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-indigo-300/70 bg-slate-950 text-[10px] font-semibold tracking-[0.14em]">
                    DE
                  </span>
                  <span>Standort Deutschland</span>
                </div>
                <h3 className="mt-3 text-[12px] font-semibold text-slate-50">
                  Standort Deutschland
                </h3>
                <p className="mt-1 text-[11px] text-slate-300/90">
                  Praxisnah entwickelt mit Unternehmen aus Dienstleistung,
                  Agentur &amp; Handwerk in Deutschland.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero- & Lightbox-Styles */}
        <style>{`
          .hero-blob {
            animation: heroFloat 18s ease-in-out infinite alternate;
          }
          .hero-blob-right {
            animation-delay: 4s;
          }
          @keyframes heroFloat {
            0%   { transform: translate3d(0, 10px, 0) scale(1);   opacity: 0.35; }
            50%  { transform: translate3d(8px, -10px, 0) scale(1.05); opacity: 0.5; }
            100% { transform: translate3d(-4px, 12px, 0) scale(1.02); opacity: 0.4; }
          }

          .hero-stars span {
            color: #facc15;
            display: inline-block;
            transform: scale(0.2);
            opacity: 0;
            animation: starPop 0.55s forwards;
          }
          .hero-stars span:nth-child(1) { animation-delay: 0.05s; }
          .hero-stars span:nth-child(2) { animation-delay: 0.15s; }
          .hero-stars span:nth-child(3) { animation-delay: 0.25s; }
          .hero-stars span:nth-child(4) { animation-delay: 0.35s; }
          .hero-stars span:nth-child(5) { animation-delay: 0.45s; }

          @keyframes starPop {
            0%   { transform: scale(0.2) translateY(6px); opacity: 0; }
            60%  { transform: scale(1.1) translateY(0);   opacity: 1; }
            100% { transform: scale(1)   translateY(0);   opacity: 1; }
          }

          .hero-cta {
            position: relative;
            overflow: hidden;
          }
          .hero-cta::before {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: radial-gradient(circle at 0% 0%, rgba(251,191,36,0.45), transparent 55%),
                        radial-gradient(circle at 100% 100%, rgba(56,189,248,0.35), transparent 55%);
            opacity: 0.9;
            z-index: -1;
            filter: blur(12px);
          }

          /* Lightbox (für Screenshot-Section) */
          .gleno-lightbox {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
          }
          .gleno-lightbox:target {
            opacity: 1;
            pointer-events: auto;
          }
          .gleno-lightbox-inner {
            animation: glenoZoomIn 0.25s ease-out;
          }
          @keyframes glenoZoomIn {
            from { transform: scale(.96) translateY(4px); opacity: 0; }
            to   { transform: scale(1)   translateY(0);   opacity: 1; }
          }
        `}</style>
      </section>

      {/* MAIN-BEREICH ------------------------------------------------------ */}
      <div className=" from-slate-50 via-slate-50 to-sky-50/40 text-slate-900">
        {/* PAIN POINTS ------------------------------------------------------ */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Erkennen Sie sich in diesen Situationen wieder?
          </h2>
          <p className="mx-auto mt-3 max-w-4xl text-center text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Viele Dienstleister und KMU verlieren jeden Tag Zeit und Nerven, weil
            Informationen über mehrere Systeme, Dateien und Köpfe verteilt sind.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                emoji: '🧩',
                title: 'Tool-Chaos & doppelte Eingaben',
                text:
                  'Aufträge im einen Tool, Zeiten im anderen, Dokumente in der Ablage – und am Ende wird doch wieder in Excel nachgepflegt.',
              },
              {
                emoji: '🚦',
                title: 'Keine klare Übersicht über Aufträge & Projekte',
                text:
                  'Es ist unklar, wer woran arbeitet, was als Nächstes fällig ist und welche Aufträge kurz vor dem Abschluss stehen.',
              },
              {
                emoji: '⏱️',
                title: 'Zeiten & Termine überall verteilt',
                text:
                  'Termine im Kalender, Zeiten auf Zetteln oder Apps – eine saubere Auswertung ist mühsam oder fehlt komplett.',
              },
              {
                emoji: '💸',
                title: 'Rechnungen & Zahlungseingänge unübersichtlich',
                text:
                  'Unklar, welche Rechnungen gestellt sind, was noch offen ist und wo Geld liegen bleibt.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm"
              >
                <div className="mb-2 text-2xl">{card.emoji}</div>
                <h3 className="text-base font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HAUPTFUNKTIONEN -------------------------------------------------- */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Alles Wichtige an einem Ort
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            GLENO bündelt die zentralen Bereiche Ihres Unternehmens.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Statt fünf verschiedenen Tools arbeiten Sie mit einer klaren Oberfläche
            für Auftragsmanagement, Projektmanagement, Rechnungsmanagement,
            Zeiterfassung, Terminplanung, Teamorganisation und Dokumentation.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                icon: '📋',
                title: 'Auftragsmanagement',
                text:
                  'Vom Erstkontakt bis zum fertigen Auftrag: Status, Verantwortliche, Fristen und Dokumente an einem Ort.',
              },
              {
                icon: '📁',
                title: 'Projektmanagement',
                text:
                  'Projekte strukturieren, Arbeitspakete definieren, Fortschritt verfolgen und Engpässe früh erkennen.',
              },
              {
                icon: '🧾',
                title: 'Rechnungsmanagement',
                text:
                  'Rechnungen erstellen, offene Posten im Blick behalten und nachvollziehen, welchen Umsatz welche Aufträge bringen.',
              },
              {
                icon: '⏱️',
                title: 'Zeiterfassung',
                text:
                  'Arbeitszeiten erfassen, Aufträgen zuordnen und auswerten – ohne Zettelchaos oder Insellösung.',
              },
              {
                icon: '📅',
                title: 'Termine & Planung',
                text:
                  'Einsätze, Kundentermine und interne Meetings so planen, dass Ihr Team weiß, was wann ansteht.',
              },
              {
                icon: '👥',
                title: 'Mitarbeiter- & Kundenrmanagement',
                text:
                  'Mitarbeiter & Kundendaten zentral verwalten & Interaktionen dokumentieren.',
              },
              {
                icon: '📂',
                title: 'Dokumenten Cloud',
                text:
                  'Wichtige Dateien und Dokumente strukturiert ablegen, versionieren und mit dem Team teilen.',
              },
              {
                icon: '🌐',
                title: 'Marktplatz für neue Aufträge',
                text:
                  'Zusätzliche Anfragen über einen Marktplatz, die direkt in Ihren GLENO-Flow übergehen können.',
              },
              {
                icon: '📊',
                title: 'Übersicht & Kennzahlen',
                text:
                  'Verstehen, welche Aufträge laufen, wie die Auslastung ist und wo Potenzial verschenkt wird.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/95 p-5 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm"
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SIEGEL + BEWERTUNGEN -------------------------------------------- */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-stretch">
            {/* Bewertungen */}
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                „Die Software fühlt sich an wie eine ruhige Schaltzentrale.“
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Unternehmen, die GLENO nutzen, berichten von weniger
                Abstimmungsaufwand, weniger Sucherei und mehr Zeit für Kunden
                und Projekte.
              </p>

              <div className="mt-6 flex-1 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/95 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <span>★ ★ ★ ★ ★</span>
                    <span className="text-[11px] text-slate-500">
                      5/5 – Dienstleistungsagentur
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    „Vor GLENO hatten wir Aufträge im Mailpostfach, Zeiten in
                    einer App und Rechnungen in einem anderen Tool. Heute
                    schauen wir ins System und sehen auf einen Blick, was offen,
                    geplant und erledigt ist.“
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">
                    – Sandra K., Inhaberin einer Agentur mit 8 Mitarbeitenden
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/95 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <span>★ ★ ★ ★ ☆</span>
                    <span className="text-[11px] text-slate-500">
                      4,5/5 – Technischer Dienstleister
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    „Wir haben intern gemerkt, wie viel Zeit uns allein die
                    klare Auftragsübersicht spart. Rückfragen sind weniger
                    geworden, weil jede Person sehen kann, was schon erledigt
                    ist und was noch fehlt.“
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">
                    – Markus H., Geschäftsführer eines Technik-Services mit 12 Personen
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/95 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <span>★ ★ ★ ★ ★</span>
                    <span className="text-[11px] text-slate-500">
                      5/5 – Handwerksbetrieb
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    „Für uns war wichtig, dass die Software nicht überladen ist.
                    GLENO deckt unsere Praxis ab: Aufträge, Projekte, Zeiten,
                    Termine und Rechnungen – verständlich für das ganze Team.“
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">
                    – Petra L., Inhaberin eines Handwerksbetriebs mit 6 Mitarbeitenden
                  </p>
                </div>
              </div>
            </div>

            {/* Bild rechts: Kunde am Computer – volle Abschnittshöhe */}
            <div className="flex items-stretch justify-center">
              <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg sm:max-w-sm lg:h-full lg:max-w-md">
                <Image
                  src="/bilder/startseite/kunde_am_computer.jpg"
                  alt="Kundin arbeitet mit GLENO am Computer"
                  width={940}
                  height={1200}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 ring-1 ring-slate-700/70 backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                      <span className="grid h-4 w-4 place-content-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 ring-1 ring-emerald-400/60">
                        ✓
                      </span>
                      Alltag im Blick
                    </span>
                    <span className="text-[10px] text-emerald-200">
                      Aufträge · Projekte · Zeiten
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

{/* SCREENSHOTS / BILDER -------------------------------------------- */}
<section id="screenshots" className="mx-auto max-w-7xl px-6 pb-16">
  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
    Ein Blick hinter die Oberfläche.
  </h2>
  <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
    So könnte Ihre All-in-One Unternehmenssoftware im Alltag aussehen: zentrale
    Übersicht, Cloud-Dokumente, Termine, Buchhaltung und To-dos – jeweils als
    klar strukturierte Maske.
  </p>

  {/* Obere Reihe – klickbar mit Lightbox */}
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
    <a
      href="#preview-cloud"
      className="group relative block h-56 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm outline-none transition md:h-72 focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label="Screenshot vergrößern: Cloud-Übersicht"
    >
      <Image
        src="/bilder/startseite/cloud_uebersicht.png"
        alt="GLENO – Cloud-Übersicht mit Kennzahlen"
        width={1200}
        height={850}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
        Klicken zum Vergrößern
      </span>
    </a>

    <a
      href="#preview-calendar"
      className="group relative block h-56 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm outline-none transition md:h-72 focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label="Screenshot vergrößern: Terminkalender"
    >
      <Image
        src="/bilder/startseite/terminkalender_uebersicht.png"
        alt="GLENO – Terminkalender und Einsatzplanung"
        width={1200}
        height={850}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
        Klicken zum Vergrößern
      </span>
    </a>
  </div>

  {/* Untere Reihe */}
  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    <a
      href="#preview-accounting"
      className="group relative block h-56 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm outline-none transition md:h-72 focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label="Screenshot vergrößern: Buchhaltung"
    >
      <Image
        src="/bilder/startseite/buchhaltung_uebersicht.png"
        alt="GLENO – Buchhaltungs- und Rechnungsübersicht"
        width={1000}
        height={850}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
        Klicken zum Vergrößern
      </span>
    </a>

    <a
      href="#preview-todo"
      className="group relative block h-56 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm outline-none transition md:h-72 focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label="Screenshot vergrößern: To-do-Liste"
    >
      <Image
        src="/bilder/startseite/todo_uebersicht.png"
        alt="GLENO – To-do-Liste und Aufgabenbereich"
        width={1000}
        height={850}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
        Klicken zum Vergrößern
      </span>
    </a>
  </div>

  {/* LIGHTBOX-OVERLAYS – rein CSS mit :target */}
  {/* CLOUD */}
  <div
    id="preview-cloud"
    className="gleno-lightbox fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-sm"
  >
    <a
      href="#screenshots"
      aria-label="Vorschau schließen"
      className="absolute inset-0 cursor-zoom-out"
    />
    <div className="gleno-lightbox-inner relative z-10 w-full max-w-5xl">
      <a
        href="#screenshots"
        aria-label="Vorschau schließen"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-200 shadow-md ring-1 ring-slate-700 hover:bg-slate-800"
      >
        ✕
      </a>
      <div className="overflow-hidden rounded-3xl bg-slate-900/90 p-2 md:p-3">
        <Image
          src="/bilder/startseite/cloud_uebersicht.png"
          alt="GLENO – Cloud-Übersicht mit Kennzahlen (vergrößert)"
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  </div>

  {/* CALENDAR */}
  <div
    id="preview-calendar"
    className="gleno-lightbox fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-sm"
  >
    <a
      href="#screenshots"
      aria-label="Vorschau schließen"
      className="absolute inset-0 cursor-zoom-out"
    />
    <div className="gleno-lightbox-inner relative z-10 w-full max-w-5xl">
      <a
        href="#screenshots"
        aria-label="Vorschau schließen"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-200 shadow-md ring-1 ring-slate-700 hover:bg-slate-800"
      >
        ✕
      </a>
      <div className="overflow-hidden rounded-3xl bg-slate-900/90 p-2 md:p-3">
        <Image
          src="/bilder/startseite/terminkalender_uebersicht.png"
          alt="GLENO – Terminkalender und Einsatzplanung (vergrößert)"
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  </div>

  {/* ACCOUNTING */}
  <div
    id="preview-accounting"
    className="gleno-lightbox fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-sm"
  >
    <a
      href="#screenshots"
      aria-label="Vorschau schließen"
      className="absolute inset-0 cursor-zoom-out"
    />
    <div className="gleno-lightbox-inner relative z-10 w-full max-w-5xl">
      <a
        href="#screenshots"
        aria-label="Vorschau schließen"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-200 shadow-md ring-1 ring-slate-700 hover:bg-slate-800"
      >
        ✕
      </a>
      <div className="overflow-hidden rounded-3xl bg-slate-900/90 p-2 md:p-3">
        <Image
          src="/bilder/startseite/buchhaltung_uebersicht.png"
          alt="GLENO – Buchhaltungsübersicht (vergrößert)"
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  </div>

  {/* TODO */}
  <div
    id="preview-todo"
    className="gleno-lightbox fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-sm"
  >
    <a
      href="#screenshots"
      aria-label="Vorschau schließen"
      className="absolute inset-0 cursor-zoom-out"
    />
    <div className="gleno-lightbox-inner relative z-10 w-full max-w-5xl">
      <a
        href="#screenshots"
        aria-label="Vorschau schließen"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-200 shadow-md ring-1 ring-slate-700 hover:bg-slate-800"
      >
        ✕
      </a>
      <div className="overflow-hidden rounded-3xl bg-slate-900/90 p-2 md:p-3">
        <Image
          src="/bilder/startseite/todo_uebersicht.png"
          alt="GLENO – To-do-Liste (vergrößert)"
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  </div>
</section>


        {/* SEO-BEREICH: WAS IST UNTERNEHMENSSOFTWARE ------------------------ */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Was ist eine Unternehmenssoftware – und warum lohnt sich eine All-in-One Lösung?
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Linke Spalte */}
            <div>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Unter <strong>Unternehmenssoftware</strong> versteht man alle digitalen
                Werkzeuge, mit denen ein Unternehmen zentrale Geschäftsprozesse steuert:
                von der Auftragsannahme über Projekte und Zeiterfassung bis hin zu
                Rechnungsstellung und Auswertung. Häufig werden dafür einzelne Tools wie
                CRM, ERP, Zeiterfassung oder Buchhaltungssoftware kombiniert. Das sorgt
                zwar für viele Funktionen – aber auch für Brüche in den Prozessen.
              </p>

              <h3 className="mt-6 text-xl font-semibold text-slate-900">
                Typische Bereiche einer modernen Unternehmenssoftware
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>
                  <strong>CRM &amp; Kundenverwaltung:</strong> Stammdaten, Historie und
                  Kommunikation mit Kunden an einem Ort.
                </li>
                <li>
                  <strong>Auftrags- und Projektmanagement:</strong> Angebote,
                  Auftragsbestätigungen, Projektpläne, Checklisten und Fortschritt.
                </li>
                <li>
                  <strong>Rechnungswesen &amp; Zahlungskontrolle:</strong> Rechnungen,
                  offene Posten, Mahnungen und Umsatzstatistiken.
                </li>
                <li>
                  <strong>Zeiterfassung &amp; Einsatzplanung:</strong> Arbeitszeiten,
                  Auslastung im Team und Terminplanung für Einsätze beim Kunden.
                </li>
                <li>
                  <strong>Dokumentenmanagement:</strong> Verträge, Nachweise und
                  Projektdokumente, die direkt mit Aufträgen verknüpft sind.
                </li>
              </ul>
            </div>

            {/* Rechte Spalte */}
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Vorteile einer All-in-One Unternehmenssoftware wie GLENO
              </h3>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Viele Unternehmen starten mit einzelnen Insellösungen. Ein CRM hier, eine
                Zeiterfassung dort, eine Excel-Liste für offene Rechnungen. Mit wachsender
                Mitarbeiterzahl wird dieses System langsam – Daten müssen doppelt gepflegt
                werden und jede Änderung erfordert Abstimmung. Eine{' '}
                <strong>All-in-One Unternehmenssoftware</strong> wie GLENO bündelt diese
                Prozesse in einer Plattform. Änderungen an einem Auftrag werden direkt in
                Projekten, Zeiten und Rechnungen sichtbar. Das reduziert Fehler,
                Rückfragen und Medienbrüche.
              </p>

              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>Weniger doppelte Dateneingabe und weniger manuelle Excel-Listen.</li>
                <li>
                  Klare Abläufe: vom Erstkontakt über den Auftrag bis zur fertigen
                  Rechnung.
                </li>
                <li>
                  Bessere Entscheidungsgrundlage durch konsistente Kennzahlen und
                  Auswertungen.
                </li>
                <li>
                  Ein System, das das Team versteht – statt vieler unterschiedlicher
                  Oberflächen.
                </li>
              </ul>

              <h3 className="mt-6 text-xl font-semibold text-slate-900">
                Für wen lohnt sich GLENO als Unternehmenssoftware?
              </h3>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                GLENO richtet sich an <strong>Dienstleister, Agenturen, Handwerksbetriebe</strong>{' '}
                und andere <strong>KMU</strong>, die ihren Alltag mit Aufträgen,
                Projekten, Zeiten und Rechnungen in einer klaren Oberfläche organisieren
                möchten. Statt ein großes ERP aufzubauen, konzentriert sich GLENO auf die
                wirklichen Hebel im Tagesgeschäft – und bleibt dabei übersichtlich genug,
                damit das gesamte Team gerne damit arbeitet.
              </p>
            </div>
          </div>
        </section>

        {/* BERATUNG / CALL TO ACTION --------------------------------------- */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/95 p-8 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="md:max-w-3xl">
                <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Finden Sie heraus, wie viel Zeit &amp; Ruhe GLENO Ihnen bringen kann.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  In einer unverbindlichen Beratung sprechen wir über Ihren Alltag,
                  Ihre aktuelle Systemlandschaft und wo GLENO am meisten entlasten kann.
                  Gemeinsam legen wir fest, womit Sie starten.
                </p>
              </div>

              <div className="flex md:flex-none">
                <Link
                  href="/beratung"
                  className="inline-flex flex-shrink-0 items-center justify-center whitespace-nowrap rounded-2xl px-7 py-3 text-sm font-semibold text-slate-50 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  style={{ backgroundColor: ACCENT }}
                >
                  Kostenlose Beratung anfragen
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------------- */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Häufige Fragen zu GLENO
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Die wichtigsten Punkte rund um Einstieg, Funktionsumfang und Einführung –
            kurz beantwortet.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Linke Spalte */}
            <div className="space-y-3">
              {[
                {
                  q: 'Für wen ist GLENO gedacht?',
                  a:
                    'Für Dienstleister, Handwerksbetriebe, Agenturen und andere KMU, die Auftragsmanagement, Projektmanagement, Rechnungen, Zeiten und Termine in einer Software bündeln möchten.',
                },
                {
                  q: 'Ist GLENO eine klassische ERP- oder CRM-Software?',
                  a:
                    'GLENO ist bewusst schlanker als klassische ERP-Systeme und praxisnäher als viele CRM-Tools. Im Mittelpunkt steht Ihr Alltag mit Aufträgen, Projekten, Zeiten und Rechnungen – nicht komplexe Konzernstrukturen.',
                },
                {
                  q: 'Wie startet man am sinnvollsten mit GLENO?',
                  a:
                    'In der Regel beginnen wir mit den Bereichen, die bei Ihnen aktuell am meisten Zeit und Nerven kosten – oft Aufträge, Projekte oder Rechnungen – und erweitern dann schrittweise auf weitere Module.',
                },
                {
                  q: 'Wie lange dauert die Einführung?',
                  a:
                    'Das hängt von Ihrem Startumfang ab. Ziel ist, Sie zügig arbeitsfähig zu machen und nicht monatelang in Einführungsprojekten zu halten.',
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm transition hover:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        ?
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {f.q}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 transition-transform group-open:rotate-90">
                      ▸
                    </span>
                  </summary>
                  <p className="mt-2 pl-9 pr-1 text-sm leading-relaxed text-slate-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            {/* Rechte Spalte */}
            <div className="space-y-3">
              {[
                {
                  q: 'Ist GLENO DSGVO-konform?',
                  a:
                    'Ja. GLENO setzt auf Hosting in der EU und B2B-taugliche Datenschutz- und Sicherheitsprozesse.',
                },
                {
                  q: 'Können bestehende Daten übernommen werden?',
                  a:
                    'Kundendaten, Leistungen, Projekte oder Stammdaten können übernommen werden. Im Rahmen der Beratung klären wir, was sinnvoll ist.',
                },
                {
                  q: 'Braucht man eine eigene IT-Abteilung?',
                  a:
                    'Nein. GLENO ist für Unternehmen ausgelegt, die wenig Zeit und keine große IT-Abteilung haben. Die Oberfläche soll im Alltag verständlich bleiben.',
                },
                {
                  q: 'Welche Kosten kommen auf uns zu?',
                  a:
                    'GLENO ersetzt in vielen Fällen mehrere Einzellösungen. In der Beratung sprechen wir offen über Kosten und den möglichen Einsparungseffekt im Vergleich zu Ihrer aktuellen Landschaft.',
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm transition hover:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        ?
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {f.q}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 transition-transform group-open:rotate-90">
                      ▸
                    </span>
                  </summary>
                  <p className="mt-2 pl-9 pr-1 text-sm leading-relaxed text-slate-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <p className="mt-8 max-w-4xl text-sm leading-relaxed text-slate-600">
            Wenn Sie weniger Zeit mit Suchen, Nachfassen und Umtragen verbringen
            möchten und stattdessen Aufträge, Projekte und Rechnungen klar
            strukturiert sehen wollen, ist GLENO eine Einladung, Ihren Alltag ruhiger
            zu organisieren. Der erste Schritt ist eine kurze, unverbindliche Beratung.
          </p>
        </section>
      </div>
    </>
  )
}
