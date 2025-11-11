// src/app/(public)/features/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  UserGroupIcon,
  DocumentTextIcon,
  EnvelopeOpenIcon,
  CalendarIcon,
  TruckIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CameraIcon,
  ArrowUpOnSquareStackIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  BellAlertIcon,
  CloudArrowUpIcon,
  CubeTransparentIcon,
  ClockIcon,
  UserCircleIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'

/* ----------------------------- Site/SEO constants ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#111827' // dunkles Anthrazit als CTA-/Brand-Akzent

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GLENO - Funktionen',
    template: '%s | GLENO',
  },
  description:
    'GLENO vereint B2B-Marktplatz, CRM, Buchhaltung, Projektführung, Logistik, Personal-Management und Onepager-Website in einer Plattform. KI-optimierte Anfragen, Bewerbungsverfahren, Chat, Dokumente, Angebote, Aufträge, Rechnungen, Zeiterfassung, Fuhrpark, Materialbestand und KI-Rechtstexte – alles an einem Ort.',
  keywords: [
    'GLENO',
    'B2B Marktplatz',
    'CRM',
    'Agentursoftware',
    'Dienstleister Software',
    'Projektmanagement',
    'Zeiterfassung',
    'Fuhrparkverwaltung',
    'Materialverwaltung',
    'Onepager Website',
    'KI Angebote',
    'Bewertungssystem',
    'Angebote Rechnungen Auftragsbestaetigungen',
  ],
  alternates: { canonical: `${SITE_URL}/features` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/features`,
    siteName: SITE_NAME,
    title: 'Features – GLENO',
    description:
      'Marktplatz, CRM & Website in einem System: KI-optimierte Anfragen, Bewerbungsverfahren, Bewertungen, Chat, Dokumente, Angebot, Auftrag & Rechnung, Projektführung, Logistik, Personal & Onepager-Website.',
    images: [
      {
        url: `${SITE_URL}/og/og-features.jpg`,
        width: 1200,
        height: 630,
        alt: 'Features – GLENO',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features – GLENO',
    description:
      'GLENO bündelt Marktplatz, CRM, Buchhaltung, Logistik, Personal, Projektführung & Onepager-Website – inklusive KI-Features und Bewertungssystem.',
    images: [`${SITE_URL}/og/og-features.jpg`],
  },
  robots: { index: true, follow: true },
}

/* -------------------------------- JSON-LD --------------------------------- */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'GLENO',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: `${SITE_URL}/features`,
        image: `${SITE_URL}/og/og-features.jpg`,
        description:
          'GLENO kombiniert B2B-Marktplatz, CRM, Buchhaltung, Projektführung, Logistik, Personal-Management und Website-Builder für Agenturen & Dienstleister in einer Plattform.',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'EUR',
          description:
            'Jetzt kostenlos starten und GLENO testen. Flexible Pakete für Agenturen & Dienstleister.',
          url: `${SITE_URL}/signup`,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Startseite', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Features',
            item: `${SITE_URL}/features`,
          },
        ],
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ---------------------------------- Page ---------------------------------- */
export default function FeaturesPage() {
  return (
    <>
      <JsonLd />

      {/* Keyframes für weichen Glow */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes floatGlow {
            0%   { transform: translate3d(0,0,0); opacity:.45 }
            50%  { transform: translate3d(10px,10px,0); opacity:.7 }
            100% { transform: translate3d(0,0,0); opacity:.45 }
          }`,
        }}
      />

      <div className="space-y-20">
        {/* HERO */}
        <section className="relative overflow-visible">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-30vh] -z-10 h-[120vh] w-[180vw] -translate-x-1/2"
            style={{
              background:
                'radial-gradient(1200px 480px at 50% 0%, rgba(15,23,42,0.06), transparent),' +
                'radial-gradient(900px 420px at 12% 10%, rgba(15,23,42,0.04), transparent),' +
                'radial-gradient(900px 420px at 88% 8%, rgba(15,23,42,0.04), transparent)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-14 -top-10 -z-10 h-[26rem] w-[26rem] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(17,24,39,.18), rgba(17,24,39,0))',
              filter: 'blur(22px)',
              animation: 'floatGlow 18s ease-in-out infinite',
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-12 sm:pt-16">
            <div className="rounded-3xl border border-white/60 bg-white/75 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl ring-1 ring-white/60 sm:p-12">
              <div className="mx-auto mb-3 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur">
                <span
                  className="rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Marktplatz • CRM • Buchhaltung • Website
                </span>
                <span className="text-slate-400">•</span>
                <span>eine Plattform – kein Tool-Chaos</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Alle Funktionen von <span className="whitespace-nowrap">GLENO</span> im Überblick
              </h1>
              <p className="mx-auto mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-700">
                GLENO strukturiert Ihren kompletten Ablauf: KI-optimierte Anfragen im Marktplatz,
                Bewerbungsverfahren & Bewertungen, CRM mit Angeboten, Auftragsbestätigungen,
                Rechnungen, Projektführung, Zeiterfassung, Logistik & Personal – plus ein
                angebundener Onepager mit Formularen direkt im System. Jede Information nur einmal,
                immer am richtigen Vorgang.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow transition sm:w-auto"
                  style={{
                    backgroundColor: PRIMARY,
                    boxShadow:
                      '0 6px 22px rgba(17,24,39,.25), inset 0 1px 0 rgba(255,255,255,.16)',
                  }}
                >
                  Kostenlos testen
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    className="opacity-90"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
                  </svg>
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/60 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white sm:w-auto"
                >
                  Live-Demo buchen
                </Link>
              </div>

              <p className="mt-3 text-[10px] text-slate-500">
                DSGVO-orientiert • EU-Hosting • Für Agenturen & Dienstleister entwickelt
              </p>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-10 h-16 -z-10"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
            }}
          />
        </section>

        {/* 3-SÄULEN-ÜBERSICHT */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* MARKT */}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur-xl shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Säule 1
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                Marktplatz & Anfragen
              </h3>
              <p className="mt-1 text-xs text-slate-700">
                KI-optimierte Anfragen, Bewerbungsverfahren, Konsument entscheidet,
                Register & Bewertungen – alles im gleichen Vorgang.
              </p>
            </div>
            {/* CRM */}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur-xl shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Säule 2
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                CRM, Buchhaltung & Operations
              </h3>
              <p className="mt-1 text-xs text-slate-700">
                Angebote, Auftragsbestätigungen, Rechnungen, Projekte, Kalender,
                Zeiterfassung, Personal, Logistik & Dokumentation in einem System.
              </p>
            </div>
            {/* WEBSITE */}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur-xl shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Säule 3
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                Onepager-Website & Rechtstexte
              </h3>
              <p className="mt-1 text-xs text-slate-700">
                Onepager mit Formularen direkt ins CRM, eigenem Branding sowie
                KI-gestütztem Impressum & Datenschutz.
              </p>
            </div>
          </div>
        </section>

        {/* 1) MARKTPLATZ & ANFRAGEN */}
        <section id="market" className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <PuzzlePieceIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                Marktplatz & KI-optimierte Anfragen
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              GLENO verbindet Nachfrage und Angebot in einem klar strukturierten Prozess:
              Anfragen werden per KI aufbereitet, Dienstleister bewerben sich sauber,
              Konsumenten wählen fundiert – und alles bleibt an einem Vorgang.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>KI-optimierte Anfragen mit klaren Datenfeldern statt Freitext-Chaos.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Strukturiertes Bewerbungsverfahren für Dienstleister je Anfrage.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Konsument entscheidet transparent auf Basis vergleichbarer Angebote.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Chat, Dokumente, Angebot, Auftrag & Rechnung direkt an der Anfrage.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Öffentliches Register mit Profilen und Leistungsdarstellung.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Bewertungssystem nach Abschluss für echte Qualitätssignale.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 2) CRM, BUCHHALTUNG, TEAM, LOGISTIK */}
        <section id="crm" className="mx-auto max-w-6xl px-6 space-y-6">
          {/* CRM & Doku */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <UserGroupIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                CRM & zentrale Vorgangsorganisation
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Alle Anfragen, Projekte und Beziehungen laufen in einem CRM zusammen.
              Kein Springen zwischen Tools – jeder Vorgang ist vollständig dokumentiert.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Zentrales CRM für Kunden & Organisationen inkl. Historie.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Vorgänge mit Chat, Dateien, Notizen, Status & Verantwortlichen.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Projektführung inkl. Dokumentation direkt am Vorgang.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Terminkalender-Anbindung pro Vorgang (z. B. Start, Abgaben, Meetings).</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Template-Bibliothek für wiederkehrende Positionen & Texte.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Vorlagenorganisation für einheitliche Angebote & Dokumente.</span>
              </li>
            </ul>
          </div>

          {/* Buchhaltung */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <DocumentTextIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Angebot, Auftragsbestätigung & Rechnung – entlang eines Vorgangs
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Dokumente entstehen direkt aus den vorhandenen Daten. Aus einer Anfrage
              wird ein Angebot, daraus die Auftragsbestätigung und schließlich die Rechnung –
              ohne Medienbruch.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Strukturierte Angebote mit Positionen & hinterlegten Templates.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Auftragsbestätigung per Klick aus dem Angebot.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Rechnung aus Auftrag/Angebot – mit sauberer Verknüpfung.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>PDF-Erzeugung & Versand per E-Mail mit vorbereiteten Texten.</span>
              </li>
            </ul>
          </div>

          {/* Team & Zeit */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <UserCircleIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Personal, Mitarbeiterzugänge & Zeiterfassung
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Mitarbeitende arbeiten in fokussierten Oberflächen. Zeiten landen direkt an
              Projekten und Vorgängen – nachvollziehbar und mobilfähig.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Mitarbeiterzugänge mit klar definierten Berechtigungen.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Zeiterfassung pro Projekt, Vorgang oder Tätigkeit.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Mobile Nutzung auf Smartphone & Tablet für das operative Team.</span>
              </li>
            </ul>
          </div>

          {/* Logistik */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <TruckIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Logistik: Fuhrpark, Werkzeuge & Materialbestand
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Logistik wird Teil der Organisation: Fahrzeuge, Werkzeuge und Materialien
              lassen sich Vorgängen zuordnen und strukturiert überblicken.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Fuhrparkübersicht mit Zuordnung zu Projekten.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Werkzeuge & Geräte je Vorgang nachvollziehbar hinterlegt.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Materialbestände sichtbar – Basis für geordnete Abwicklung.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 3) WEBSITE & RECHTTEXTE */}
        <section id="website" className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_12px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl ring-1 ring-white/60">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-white/60 bg-white/95 p-2 ring-1 ring-white/60">
                <CloudArrowUpIcon className="h-5 w-5 text-slate-900" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                Onepager-Website direkt mit GLENO verbunden
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Die Website ist kein Fremdkörper, sondern Teil Ihres Systems: Anfragen
              aus Formularen landen automatisch dort, wo sie hingehören – im CRM.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Schlanker Onepager speziell für Dienstleister & Agenturen.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Kontakt- und Projektformulare schreiben direkt ins CRM.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>Eigenes Logo, Farben & Inhalte für konsistentes Branding.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                <span>KI-gestützte Erstellung von Impressum & Datenschutzerklärung.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* SEO / WHY BLOCK – ABSCHLUSS */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Warum GLENO die logische Mitte zwischen Marktplatz, CRM & Website ist.
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Normalerweise existieren Anfragen, Angebote, Projekte, Zeiten, Material,
              Personal und Website völlig getrennt. GLENO führt diese Bereiche zusammen:
              Marktplatz, CRM, Buchhaltung, Logistik, Personal und Onepager-Website greifen
              ineinander – jede Information hängt an einem Vorgang.
            </p>
            <p>
              Die drei Säulen sind klar abgegrenzt und technisch verbunden: Der
              <strong> Marktplatz</strong> liefert strukturierte, KI-optimierte Anfragen
              mit fairem Bewerbungsverfahren und Bewertungen. Das
              <strong> CRM & Operations</strong>-Modul bildet Angebote, Auftragsbestätigungen,
              Rechnungen, Projektführung, Zeiterfassung sowie Fuhrpark-, Werkzeug- und
              Materialorganisation ab. Die <strong>Onepager-Website</strong> sendet
              Anfragen direkt ins System und lässt sich mit KI bei Rechtstexten unterstützen.
            </p>
            <p>
              So entsteht eine durchgehende Prozesskette für Agenturen & Dienstleister,
              die Wert auf Struktur, Nachvollziehbarkeit und professionelle Außenwirkung
              legen – ohne Spielerei, ohne Tool-Wirrwarr.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
