// src/app/(public)/status/page.tsx
import type { Metadata } from 'next'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  CloudIcon,
  ServerIcon,
  BoltIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

/* ----------------------- Site/SEO ----------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0a1b40'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Systemstatus – GLENO',
    template: '%s | GLENO',
  },
  description:
    'Live Systemstatus von GLENO: Hosting, Web-App, Datenbank, API, Marktplatz, Website-Modul, E-Mail & Benachrichtigungen. Patchnotes, Roadmap & Incident-Chronik.',
  alternates: { canonical: `${SITE_URL}/status` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/status`,
    siteName: SITE_NAME,
    title: 'Systemstatus – GLENO',
    description:
      'Alle GLENO-Systeme im Überblick: Marktplatz, CRM, Website-Modul & Logistik. Transparente Incidents, Patchnotes und Roadmap.',
    images: [{ url: `${SITE_URL}/og/og-status.jpg`, width: 1200, height: 630 }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Systemstatus – GLENO',
    description:
      'Status von Marktplatz, CRM, Website-Modul, API & Benachrichtigungen. Mit Patchnotes und Roadmap.',
    images: [`${SITE_URL}/og/og-status.jpg`],
  },
  robots: { index: true, follow: true },
}

/* ----------------------- JSON-LD ------------------------ */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/status`,
    description:
      'Statusseite von GLENO: Betriebszustand von Marktplatz, CRM, Website-Modul, Incidents, Patchnotes und Roadmap.',
    inLanguage: 'de-DE',
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* --------------------- Hilfskomponenten --------------------- */
type State = 'operational' | 'degraded' | 'outage'

function Dot({ state }: { state: State }) {
  const bg =
    state === 'operational'
      ? 'bg-emerald-500'
      : state === 'degraded'
      ? 'bg-amber-500'
      : 'bg-rose-500'
  return (
    <span
      className={`relative inline-block h-2.5 w-2.5 rounded-full ${bg}`}
      aria-hidden
    >
      {state === 'operational' && (
        <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
      )}
    </span>
  )
}

function Pill({
  state,
  label,
  icon: Icon,
  note,
}: {
  state: State
  label: string
  icon: any
  note?: string
}) {
  const iconColor =
    state === 'operational'
      ? 'text-emerald-600'
      : state === 'degraded'
      ? 'text-amber-600'
      : 'text-rose-600'

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_10px_30px_rgba(2,6,23,0.06)]">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-xl border border-white/60 bg-white/80 p-2 ring-1 ring-white/60 ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Dot state={state} />
            <span className="text-sm font-medium text-slate-900">
              {label}
            </span>
          </div>
          {note && (
            <p className="mt-0.5 text-xs text-slate-600">
              {note}
            </p>
          )}
        </div>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          state === 'operational'
            ? 'bg-emerald-50 text-emerald-700'
            : state === 'degraded'
            ? 'bg-amber-50 text-amber-800'
            : 'bg-rose-50 text-rose-700'
        }`}
      >
        {state === 'operational'
          ? 'Betriebsbereit'
          : state === 'degraded'
          ? 'Eingeschränkt'
          : 'Störung'}
      </span>
    </div>
  )
}

/* ------------------------- Page ------------------------- */
export default function StatusPage() {
  const today = '18.09.2025' // bei Bedarf automatisieren

  return (
    <>
      <JsonLd />

      {/* Keyframes für dezenten Glow */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes floatGlow {
            0%   { transform: translate3d(0,0,0); opacity:.6 }
            50%  { transform: translate3d(12px,10px,0); opacity:.75 }
            100% { transform: translate3d(0,0,0); opacity:.6 }
          }`,
        }}
      />

      <div className="space-y-20">
        {/* HERO / Summary */}
        <section className="relative overflow-visible">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-28vh] -z-10 h-[120vh] w-[170vw] -translate-x-1/2"
            style={{
              background:
                'radial-gradient(1200px 480px at 50% 0%, rgba(10,27,64,0.06), transparent),' +
                'radial-gradient(900px 420px at 20% 8%, rgba(10,27,64,0.05), transparent),' +
                'radial-gradient(900px 420px at 80% 6%, rgba(10,27,64,0.05), transparent)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-10 -z-10 h-[30rem] w-[30rem] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(10,27,64,.12), rgba(10,27,64,0))',
              filter: 'blur(26px)',
              animation: 'floatGlow 16s ease-in-out infinite',
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-10 sm:pt-14">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-8 text-center shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur-xl ring-1 ring-white/60 sm:p-12">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60">
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">
                  Live
                </span>
                <span>Systemstatus</span>
                <span className="text-slate-400">•</span>
                <span>Stand: {today}</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                <span className="inline-flex items-center gap-2 align-middle">
                  <span className="relative inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
                  </span>
                  Alle Kerndienste von GLENO sind betriebsbereit
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
                Marktplatz, CRM, Website-Modul & Logistik laufen stabil. Alle
                bekannten Themen und Verbesserungen findest du in Incident-Chronik,
                Patchnotes und Roadmap.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/preis"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/85 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
                >
                  Preis & Paket
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                  style={{
                    backgroundColor: PRIMARY,
                    boxShadow:
                      '0 6px 22px rgba(10,27,64,.25), inset 0 1px 0 rgba(255,255,255,.25)',
                  }}
                >
                  Support kontaktieren
                </Link>
              </div>
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

        {/* Komponentenstatus */}
        <section className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Komponenten
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Pill
              state="operational"
              label="Hosting (EU)"
              icon={CloudIcon}
              note="Uptime (30 Tage): 100 %"
            />
            <Pill
              state="operational"
              label="Web-App (GLENO)"
              icon={GlobeAltIcon}
              note="Median TTFB: 130 ms"
            />
            <Pill
              state="operational"
              label="Datenbank"
              icon={ServerIcon}
              note="Replikation & Backups aktiv"
            />
            <Pill
              state="operational"
              label="API & Integrationen"
              icon={BoltIcon}
              note="Stabiler Betrieb"
            />
            <Pill
              state="operational"
              label="Marktplatz"
              icon={ArrowPathIcon}
              note="Anfragen, Matching & Chat"
            />
            <Pill
              state="operational"
              label="Website & Formulare"
              icon={GlobeAltIcon}
              note="Onepager & Lead-Formulare"
            />
            <Pill
              state="operational"
              label="CRM & Angebote"
              icon={CheckCircleIcon}
              note="Pipelines, Angebote, Rechnungen"
            />
            <Pill
              state="operational"
              label="E-Mail & Benachrichtigungen"
              icon={EnvelopeIcon}
              note="Transaktionsmails & Reminder"
            />
            <Pill
              state="operational"
              label="Logistik & Ressourcen"
              icon={BellAlertIcon}
              note="Fuhrpark-, Material- & Fälligkeitshinweise"
            />
          </div>
        </section>

        {/* Incident-Chronik (letzte 30 Tage) */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_15px_50px_rgba(2,6,23,0.08)]">
            <h3 className="text-xl font-semibold text-slate-900">
              Incident-Chronik (letzte 30 Tage)
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 ring-1 ring-white/60">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-medium text-slate-900">
                    15.09.2025 – Verzögerte Lead-Synchronisierung Marktplatz → CRM
                  </div>
                  <p>
                    Ursache: Queue-Konfiguration nach Deployment. Verzögerung bis
                    zu 6 Minuten. Hotfix ausgerollt, Monitoring-Regeln
                    nachgeschärft.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 ring-1 ring-white/60">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-medium text-slate-900">
                    05.09.2025 – Verzögerte E-Mails bei großen Anhängen
                  </div>
                  <p>
                    Mail-Worker skaliert & Attachment-Handling optimiert. Seitdem
                    keine Auffälligkeiten.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 ring-1 ring-white/60">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-medium text-slate-900">
                    28.08.2025 – Kurzzeitige Ladezeiten-Erhöhung im Marktplatz
                  </div>
                  <p>
                    Peaks durch Such-Index-Rebuild. Künftig separate Wartungsfenster
                    und gestaffelte Reindizierung.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Patchnotes */}
        <section className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Patchnotes
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 backdrop-blur-xl ring-1 ring-white/60">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">
                  v1.4.2 <span className="text-slate-500">– 18.09.2025</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Stable
                </span>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>
                  Marktplatz: Matching-Engine optimiert – bessere Relevanz bei
                  Nischen-Services.
                </li>
                <li>
                  Website-Modul: Lead-Formulare senden jetzt Kontext direkt in die
                  Pipeline (Quelle, Kampagne, UTM).
                </li>
                <li>
                  CRM: Angebots-PDFs mit konsistenter Branding-Konfiguration pro
                  Mandant.
                </li>
                <li>
                  Performance: Schnellere Ladezeiten im Deal-Detail (Lazy Loading von
                  Dateien & Aktivitäten).
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 backdrop-blur-xl ring-1 ring-white/60">
              <div className="text-lg font-semibold text-slate-900">
                v1.4.1 <span className="text-slate-500">– 06.09.2025</span>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>
                  Benachrichtigungen: Deduplizierung verbessert, weniger doppelte
                  Reminder.
                </li>
                <li>
                  Import: CSV-Validierung mit klareren Fehlermeldungen &
                  Vorschau-Funktion.
                </li>
                <li>
                  Dashboard: neue Kacheln für Marktplatz-Leads & Website-Leads.
                </li>
                <li>
                  Diverse UI-Verbesserungen in Angebot & Rechnungsstellung.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_15px_50px_rgba(2,6,23,0.08)]">
            <h3 className="text-xl font-semibold text-slate-900">
              Roadmap
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Kurzfristig */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Kurzfristig (1–4 Wochen)
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>
                    Verbesserte Filter & Tags im Marktplatz für Agentur-Spezialisierungen.
                  </li>
                  <li>
                    Website-Modul: zusätzliche Form-Felder & Double-Opt-in-Option.
                  </li>
                  <li>
                    CRM: Massenaktionen für Statuswechsel & Zuweisungen.
                  </li>
                  <li>
                    Logistik: klarere Übersicht für Fälligkeiten & Prüfungen.
                  </li>
                </ul>
              </div>

              {/* Mittelfristig */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Mittelfristig (4–12 Wochen)
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>
                    Analytics: Funnel-Reporting von Marktplatz/Website bis Abschluss.
                  </li>
                  <li>
                    Integrationen: Export/Sync zu Buchhaltungs-Tools (z. B. DATEV-ready
                    CSV).
                  </li>
                  <li>
                    Rollen & Rechte für größere Teams (Sales, Projekt, Finance).
                  </li>
                  <li>
                    Erweiterte Logistik-Ansicht für Fahrzeuge, Lager & Equipment.
                  </li>
                </ul>
              </div>

              {/* Langfristig */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Langfristige Ziele
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>
                    GLENO Mobile App (iOS & Android) für Leads, Tasks & Zeiten.
                  </li>
                  <li>
                    KI-Co-Pilot für Angebotserstellung & Antwortvorschläge auf
                    Marktplatz-Anfragen.
                  </li>
                  <li>
                    Multi-Workspace & Mandantenfähigkeit für Gruppen/Netzwerke.
                  </li>
                  <li>
                    Vertiefte Logistik-Features: Routenplanung & Ressourcenplanung.
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Roadmap ohne Garantie; Prioritäten können sich basierend auf Feedback
              unserer GLENO-Partner verschieben.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
