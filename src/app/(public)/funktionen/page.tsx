// src/app/(public)/features/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

/* ----------------------------- Site/SEO constants ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Funktionen – GLENO Unternehmenssoftware',
    template: '%s | GLENO',
  },
  description:
    'GLENO bündelt Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Terminplanung, Kundenmanagement, Mitarbeitermanagement, Dokumenten-Cloud, Logistik, Vault, Aufgaben, Aktivitätsübersicht, Website-Builder, Marktplatz und Kennzahlen in einer cloudbasierten Unternehmenssoftware für Dienstleister & KMU.',
  keywords: [
    'GLENO',
    'Unternehmenssoftware',
    'Auftragsmanagement',
    'Projektmanagement',
    'Rechnungssoftware',
    'Zeiterfassung',
    'Terminplanung',
    'CRM',
    'Dokumentenmanagement',
    'Marktplatz für Aufträge',
    'Kennzahlen Dashboard',
    'Logistik Software',
    'Fuhrparkverwaltung',
    'Vertragsmanagement',
    'Passwort Vault',
    'Website Builder',
    'Landingpage Lead Magnet',
    'Dienstleister Software',
    'KMU Software',
  ],
  alternates: { canonical: `${SITE_URL}/features` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/features`,
    siteName: SITE_NAME,
    title: 'Funktionen – GLENO Unternehmenssoftware',
    description:
      'GLENO bündelt Aufträge, Projekte, Rechnungen, Zeiten, Termine, Kunden, Team, Dokumente, Logistik, Vault, Aufgaben, Aktivitäten, Website-Builder, Marktplatz & Kennzahlen in einer Plattform – statt Tool-Chaos.',
    images: [
      {
        url: `${SITE_URL}/og/og-features.jpg`,
        width: 1200,
        height: 630,
        alt: 'Funktionen – GLENO',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Funktionen – GLENO Unternehmenssoftware',
    description:
      'Cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU mit Aufträgen, Projekten, Rechnungen, Zeiten, Terminen, Logistik, Vault, Aufgaben, Aktivitäten & Team.',
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
          'GLENO bündelt Auftragsmanagement, Projektmanagement, Rechnungsmanagement, Zeiterfassung, Terminplanung, Kundenmanagement, Mitarbeitermanagement, Dokumenten-Cloud, Logistik, Vault, Aufgaben, Aktivitätsübersicht, Website-Builder, Marktplatz und Kennzahlen in einer cloudbasierten Lösung.',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'EUR',
          description:
            'Kostenloses Beratungsgespräch vereinbaren und prüfen, wie GLENO in Ihren Alltag passt.',
          url: `${SITE_URL}/beratung`,
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
            name: 'Funktionen',
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

      {/* cleaner, weißer Hintergrund */}
      <main className="min-h-[100dvh]">
        {/* Breite analog Startseite: max-w-7xl + px-6 */}
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-20">
          {/* HERO – jetzt zentrierte Box */}
          <section className="mb-10">
            <div className="mx-auto max-w-7xl rounded-3xl border border-white/80 bg-white/95 px-6 py-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 sm:px-10 sm:py-10">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Funktionen im Überblick
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Alle Funktionen der GLENO Unternehmenssoftware.
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                GLENO bündelt die zentralen Bereiche Ihres Unternehmens:
                Auftragsmanagement, Projektmanagement, Rechnungen, Zeiten, Termine,
                Kunden, Team, Dokumente, Logistik, Kennzahlen – und sogar
                Marktplatz, Vault und Website-Builder. Klar strukturiert, ohne
                überladene ERP-Oberfläche.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/registrieren"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-50 shadow-sm hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  GLENO 30 Tage testen
                  <span className="text-xs">↗</span>
                </Link>
                <Link
                  href="/beratung"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  Unverbindliche Beratung buchen
                </Link>
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Alle Module inklusive · Monatlich kündbar nach der Testphase · Server in der EU
              </p>
            </div>
          </section>

          {/* FUNKTIONS-GRID – Emojis wie auf der Startseite */}
          <section className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              GLENO bündelt die zentralen Bereiche Ihres Unternehmens.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Statt fünf verschiedenen Tools arbeiten Sie mit einer Oberfläche für
              Auftragsmanagement, Projektmanagement, Rechnungen, Zeiterfassung,
              Terminplanung, Kunden- und Mitarbeitermanagement, Dokumentation, Logistik,
              Vault, Aufgaben und Website – plus Marktplatz für neue Aufträge.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CARDS.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} text={f.text} />
              ))}
            </div>
          </section>

          {/* BEWERTUNGS-STREIFEN – dezent & unaufdringlich */}
          <section className="mb-12 border-y border-slate-100 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1 text-amber-500">
                  <span className="text-xs">★</span>
                  <span className="text-xs">★</span>
                  <span className="text-xs">★</span>
                  <span className="text-xs">★</span>
                  <span className="text-xs text-amber-400/80">★</span>
                </div>
                <span className="font-semibold text-slate-800">
                  4,8 von 5 Punkten
                </span>
                <span className="hidden text-slate-400 md:inline">·</span>
                <span className="text-slate-500">
                  basierend auf Rückmeldungen aus Pilotprojekten &amp; Beta-Teams
                </span>
              </div>

              <div className="grid gap-2 text-[11px] text-slate-500 md:max-w-xl md:grid-cols-2">
                <p className="italic leading-relaxed">
                  „Wir haben GLENO zuerst nur für Angebote getestet – inzwischen laufen
                  Aufträge, Zeiten und Rechnungen komplett darüber.“
                  <span className="not-italic text-slate-400">
                    {' '}
                    – Agentur mit 7 Personen
                  </span>
                </p>
                <p className="italic leading-relaxed">
                  „Die Kombination aus Aufträgen, Projekten und To-dos nimmt viel
                  Kleinkram aus meinem Kopf.“
                  <span className="not-italic text-slate-400">
                    {' '}
                    – Inhaber eines technischen Dienstleisters
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* DETAIL-CLUSTER – jeweils thematisch sortiert */}

          {/* 1. Aufträge & Projekte / Angebote & Rechnungen */}
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCluster
              label="Aufträge & Projekte"
              title="Vom Erstkontakt bis zum abgeschlossenen Projekt."
              icon="📋"
              bullets={[
                'Aufträge mit Status, Verantwortlichen, Fristen und Dokumenten an einem Ort.',
                'Projektstruktur mit Phasen, Arbeitspaketen und Deadlines.',
                'Automatische To-dos mit Mitarbeiterzuweisung, Prioritäten & Fälligkeiten.',
                'Soll-/Ist-Budgetierung pro Projekt mit verknüpfter Zeiterfassung.',
              ]}
            />
            <DetailCluster
              label="Angebote & Rechnungen"
              title="Rechnungsmanagement mit KI & wiederkehrenden Intervallen."
              icon="🧾"
              bullets={[
                'KI-unterstützte Angebotserstellung – spart 20–30 Minuten pro Angebot.',
                'Template-Bibliothek für wiederkehrende Positionen & Texte.',
                'Auftragsbestätigung & Rechnung aus dem Angebot per Klick – ohne Doppelpflege.',
                'Wiederkehrende Rechnungsintervalle inkl. automatischer Erinnerung an Kunden.',
              ]}
            />
          </section>

          {/* 2. Zeit & Planung / Logistik */}
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCluster
              label="Zeit & Planung"
              title="Zeiterfassung und Termine, die zusammengehören."
              icon="⏱️"
              bullets={[
                'Projektscharfe Zeiterfassung – Mitarbeitende erfassen Zeiten selbstständig.',
                'Manuelle Einträge & Korrekturen möglich und nachvollziehbar.',
                'Auswertung nach Projekt, Kunde, Mitarbeiter oder Zeitraum (inkl. CSV-Export).',
                'Terminplanung als Liste oder Kalender – inkl. Kunden- & Projektzuordnung.',
              ]}
            />
            <DetailCluster
              label="Logistik & Ressourcen"
              title="Fuhrpark, Material & Equipment im Griff."
              icon="🚚"
              bullets={[
                'Übersicht über Fahrzeuge, Maschinen und Werkzeuge – inkl. Zuordnung zu Projekten.',
                'Materialbestände pro Projekt oder Lager erfassen und nachvollziehen.',
                'Optionale Laufleistungen, Prüfintervalle & Wartungstermine für Fahrzeuge/Geräte.',
                'Geplante Einsätze besser koordinieren, statt Überraschungen vor Ort.',
              ]}
            />
          </section>

          {/* 3. Kundenmanagement / Mitarbeitermanagement */}
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCluster
              label="Kundenmanagement (CRM)"
              title="Alle Kundenbeziehungen strukturiert an einem Ort."
              icon="🧑‍💼"
              bullets={[
                'Stammdaten für Kunden, Organisationen & Ansprechpartner mit Kontaktwegen.',
                'Chronologische Historie von Angeboten, Aufträgen, Projekten & Rechnungen pro Kunde.',
                'Schneller Überblick: Zu welchen Themen gab es zuletzt Kontakt – und was ist offen?',
                'Segmentierung nach Branche, Größe, Region oder individuellen Labels.',
              ]}
            />
            <DetailCluster
              label="Mitarbeitermanagement"
              title="Zugänge, Rollen & Verantwortlichkeiten im Team."
              icon="👤"
              bullets={[
                'Mitarbeiterprofile mit Rollen, Zuständigkeiten und Kontaktdaten.',
                'Rollenbasierte Rechte: Wer darf Angebote schreiben, Zeiten sehen oder Kennzahlen auswerten?',
                'Verknüpfung von Mitarbeitenden mit Projekten, Terminen, Aufgaben & Ressourcen.',
                'Transparente Auslastung auf Basis von Zeiterfassung und Terminplanung.',
              ]}
            />
          </section>

          {/* 4. Dokumenten Cloud & Vault / Website & Marktplatz */}
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCluster
              label="Dokumenten Cloud & Vault"
              title="Dokumente, Verträge, Zugänge & Lizenzen sicher verwalten."
              icon="📂"
              bullets={[
                'Dokumenten Cloud mit eigenen Ordnerstrukturen und versionierten Dateien.',
                'Digitaler Vault für Verträge, Zugangsdaten & Lizenzen – zentral statt über Excel & Notizzettel verteilt.',
                'Rollen- und projektbasierte Zugriffsrechte – sensible Unterlagen bleiben geschützt.',
                'Optionale revisionssichere Ablage & Nachvollziehbarkeit, wer was wann geändert oder hochgeladen hat.',
              ]}
            />
            <DetailCluster
              label="Website, Landingpages & Marktplatz"
              title="Neue Leads & Aufträge direkt in Ihrem GLENO-Flow."
              icon="🌐"
              bullets={[
                'Website & Landingpage in 2–3 Minuten: Onepager mit Formular, Branding & Textbausteinen.',
                'Lead-Magnet-Formulare schreiben direkt ins System – inklusive Zuordnung zu Kunde & Projekt.',
                'Marktplatz-Anfragen werden als Vorgänge in GLENO angelegt – kein Copy & Paste aus E-Mails.',
                'Chat, Dokumente, Angebote, Aufträge & Rechnungen pro Anfrage gebündelt in einem Vorgang.',
              ]}
            />
          </section>

          {/* 5. Aufgaben & Aktivitäten / Kennzahlen */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCluster
              label="Aufgaben & Aktivitäten"
              title="Einheitliche To-dos und Aktivitätsübersicht."
              icon="✅"
              bullets={[
                'Zentrale To-do-Liste über alle Aufträge, Projekte und Kunden – filterbar nach Person & Bereich.',
                'Automatische Aktivitäten-Historie: Angebote, Statuswechsel, Kommentare, Dokument-Uploads u. v. m.',
                'Zeitliche Timeline je Vorgang, damit klar ist, was wann passiert ist und was als Nächstes ansteht.',
                'Persönliche Arbeitsliste für Mitarbeitende: „Heute“, „Diese Woche“ und „Überfällig“ auf einen Blick.',
              ]}
            />
            <DetailCluster
              label="Übersicht & Kennzahlen"
              title="Tagesaktuelle betriebswirtschaftliche Auswertungen."
              icon="📊"
              bullets={[
                'Umsatzentwicklung nach Zeitraum, Kunde, Projekt oder Leistungsart.',
                'Offene Posten & Zahlungseingänge im Blick – inklusive Fälligkeiten.',
                'Auslastung des Teams und Projektfortschritt auf einen Blick.',
                'Individuelle Kennzahlenansichten als ruhiges Dashboard statt Zahlen-Wirrwarr.',
              ]}
            />
          </section>

          {/* kein zusätzlicher CTA-Block unten – bewusst clean gehalten */}
        </div>
      </main>
    </>
  )
}

/* --------------------------- Daten & Komponenten --------------------------- */

const FEATURE_CARDS = [
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
      'Projektscharfe Zeiterfassung – Mitarbeitende erfassen Zeiten selbstständig, manuell editierbar und auswertbar.',
  },
  {
    icon: '📅',
    title: 'Termine & Planung',
    text:
      'Einsätze, Kundentermine und interne Meetings so planen, dass Ihr Team weiß, was wann ansteht – als Liste oder Kalender.',
  },
  {
    icon: '🧑‍💼',
    title: 'Kundenmanagement (CRM)',
    text:
      'Alle Kunden, Organisationen & Ansprechpartner mit Historie von Angeboten, Aufträgen, Projekten und Rechnungen.',
  },
  {
    icon: '👤',
    title: 'Mitarbeitermanagement',
    text:
      'Mitarbeiterprofile, Rollen, Berechtigungen und Verantwortlichkeiten mit direkter Verknüpfung zu Projekten & Aufgaben.',
  },
  {
    icon: '📂',
    title: 'Dokumenten Cloud',
    text:
      'Wichtige Dateien und Dokumente strukturiert ablegen, versionieren und mit dem Team teilen – direkt am Vorgang.',
  },
  {
    icon: '🔐',
    title: 'Vault: Zugänge, Lizenzen & Verträge',
    text:
      'Zugänge, Lizenzen und Verträge zentral im Vault verwalten – mit Rollenrechten und sicherer Ablage statt Excel-Listen.',
  },
  {
    icon: '🌐',
    title: 'Marktplatz für neue Aufträge',
    text:
      'Zusätzliche Anfragen über den GLENO Marktplatz, die direkt in Ihren GLENO-Flow übergehen – inklusive Chat & Dokumenten.',
  },
  {
    icon: '💻',
    title: 'Website & Landingpages',
    text:
      'Onepager-Website und Lead-Magnet-Landingpages in 2–3 Minuten aufsetzen – Formulare schreiben direkt ins CRM.',
  },
  {
    icon: '🚚',
    title: 'Logistik & Ressourcen',
    text:
      'Fuhrpark, Werkzeuge und Materialbestände nachvollziehbar zu Projekten & Aufträgen zuordnen.',
  },
  {
    icon: '✅',
    title: 'Aufgaben & Aktivitäten',
    text:
      'Zentrale To-dos und Aktivitätsübersicht über alle Vorgänge, Projekte und Kunden hinweg.',
  },
  {
    icon: '📊',
    title: 'Übersicht & Kennzahlen',
    text:
      'Tagesaktuelle Kennzahlen zu Umsatz, Auslastung, offenen Posten und Projekten – als ruhiges Dashboard.',
  },
]

type FeatureCardProps = {
  icon: string
  title: string
  text: string
}

function FeatureCard({ icon, title, text }: FeatureCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-xl">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
        {text}
      </p>
    </div>
  )
}

type DetailClusterProps = {
  label: string
  title: string
  icon: string
  bullets: string[]
}

function DetailCluster({ label, title, icon, bullets }: DetailClusterProps) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-base">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-900 sm:text-[15px]">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-900" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
