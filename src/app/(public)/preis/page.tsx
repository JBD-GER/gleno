import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'

/* ----------------------------- Site/SEO ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Preis – GLENO Unternehmenssoftware',
    template: '%s | GLENO',
  },
  description:
    'GLENO ist die cloudbasierte All-in-One Unternehmenssoftware für Dienstleister & KMU. 7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Ein Preis für alle Funktionen – ohne Paketlogik und ohne Nutzer-Limits.',
  alternates: { canonical: `${SITE_URL}/preis` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/preis`,
    siteName: SITE_NAME,
    title: 'Preis – GLENO Unternehmenssoftware',
    description:
      'Ein Preis. Alle Funktionen. GLENO bündelt Aufträge, Projekte, Rechnungen, Zeiten, Termine, Team, Dokumente, Logistik, Marktplatz & Website-Builder in einer cloudbasierten Unternehmenssoftware.',
    images: [
      {
        url: `${SITE_URL}/og/og-price.jpg`,
        width: 1200,
        height: 630,
        alt: 'Preis – GLENO Unternehmenssoftware',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preis – GLENO Unternehmenssoftware',
    description:
      'GLENO: All-in-One Unternehmenssoftware für Dienstleister & KMU. 7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Ein Preis für alle Funktionen, ohne Nutzer-Limits und Modul-Chaos.',
    images: [`${SITE_URL}/og/og-price.jpg`],
  },
  robots: { index: true, follow: true },
}

/* ----------------------------- JSON-LD ------------------------------ */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GLENO',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/preis`,
    image: `${SITE_URL}/og/og-price.jpg`,
    description:
      'GLENO ist eine cloudbasierte All-in-One Unternehmenssoftware, die Auftragsmanagement, Projektmanagement, Rechnungen, Zeiterfassung, Termine, Team, Dokumente, Logistik, Marktplatz & Website-Builder in einer Plattform bündelt. Ein Preis für alle Funktionen – ohne Modul-Chaos und ohne Nutzer-Gebühren.',
    offers: {
      '@type': 'Offer',
      price: '59.00',
      priceCurrency: 'EUR',
      description:
        '7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Ein Preis für alle Funktionen der GLENO Unternehmenssoftware, ohne Zusatzkosten pro Nutzer oder Modul.',
      url: `${SITE_URL}/registrieren`,
    },
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

/* ----------------------------- Inhalte ------------------------------ */

const inklusive = [
  'Alle Module der GLENO-Unternehmenssoftware inklusive – keine Modul-Pakete',
  'Auftragsmanagement: vom Erstkontakt bis zum abgeschlossenen Auftrag',
  'Projektmanagement mit Phasen, Aufgaben, Status & Deadlines',
  'Rechnungsmanagement inkl. Angeboten, Auftragsbestätigungen & offenen Posten',
  'Zeiterfassung & Einsatzplanung mit Kalender- und Listenansicht',
  'Kundenmanagement (CRM) für Organisationen, Ansprechpartner & Historie',
  'Mitarbeitermanagement mit Rollen, Rechten & Verantwortlichkeiten',
  'Dokumenten-Cloud & Vault für Verträge, Nachweise, Zugänge & Lizenzen',
  'Logistik & Ressourcen: Fahrzeuge, Material, Werkzeuge & Equipment im Blick',
  'Aufgaben, To-dos & Aktivitäten-Timeline über alle Vorgänge hinweg',
  'Kennzahlen-Dashboards zu Umsatz, Auslastung & offenen Posten',
  'Website- & Landingpage-Builder – Formulare schreiben direkt ins System',
  'GLENO-Marktplatz-Zugang für neue Aufträge – ohne Gebühren pro Lead',
  'Unbegrenzte Projekte, Kunden & Team-Mitglieder – kein Aufpreis pro User',
  'EU-Hosting, TLS-Verschlüsselung & regelmäßige Backups inklusive',
]

export default function PricePage() {
  return (
    <>
      <JsonLd />

      <main className="min-h-[100dvh] ">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6">
          {/* HERO / VALUE CARD -------------------------------------------- */}
          <section className="mb-10">
            {/* kleine Intro-Zeile */}
            <div className="mb-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Ein Preis für Ihre gesamte Unternehmenssoftware</span>
              </div>
            </div>

            {/* Haupt-Card – 2 Spalten: Text + Preispsychologie */}
            <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              {/* Linke Seite: Story & CTA */}
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Schluss mit Tarif-Tabellen. Ein klarer Betrag im Monat.
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                    GLENO ersetzt die typische Landschaft aus CRM, Projekt-Tool,
                    Zeiterfassung, Rechnungsprogramm, Dokumenten-Cloud, Logistik-Excel
                    und Website-Baukasten. Statt 5–7 Einzel-Tools haben Sie{' '}
                    <strong>eine Unternehmenssoftware</strong> – und zahlen{' '}
                    <strong>einen Preis</strong>.
                  </p>

                  {/* „Ohne GLENO“ vs „Mit GLENO“ in Kurzform */}
                  <div className="mt-5 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        OHNE GLENO
                      </div>
                      <ul className="mt-1 space-y-1.5">
                        <li>• 5–7 verschiedene Tools im Einsatz</li>
                        <li>• Nutzer-Preise & Paketlogik pro Anbieter</li>
                        <li>• Daten liegen verteilt in Insel-Systemen</li>
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        MIT GLENO
                      </div>
                      <ul className="mt-1 space-y-1.5 text-emerald-900">
                        <li>• Alle Kernbereiche in einer Software</li>
                        <li>• Keine Nutzer-Limits, keine Modul-Aufpreise</li>
                        <li>• Ein Preis, klare Kosten, weniger Koordination</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link
                      href="/registrieren"
                      aria-label="Jetzt GLENO 7 Tage kostenlos testen"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-50 shadow-[0_16px_40px_rgba(15,23,42,0.55)] transition hover:bg-black hover:shadow-[0_20px_55px_rgba(15,23,42,0.8)] sm:w-auto"
                    >
                      Jetzt 7 Tage testen
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
                      href="/beratung"
                      className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 sm:w-auto"
                    >
                      Oder kurz persönlich sprechen
                    </Link>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    7 Tage kostenlos · Keine Kreditkarte erforderlich · Danach 59 € zzgl.
                    MwSt./Monat · Monatlich kündbar.
                  </p>
                </div>
              </div>

              {/* Rechte Seite: Preis & „rechnerischer“ Vergleich */}
              <div className="flex flex-col justify-between rounded-2xl bg-slate-50/80 p-5 ring-1 ring-slate-100 sm:p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    GLENO UNTERNEHMENSSOFTWARE
                  </p>

                  {/* Preis */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                        59 €
                      </span>
                      <span className="text-xs text-slate-600 sm:text-sm">
                        zzgl. MwSt. / Monat
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Monatlich kündbar · Alle Funktionen · Unbegrenzte Nutzer
                    </p>
                  </div>

                  {/* „Was Sie typischerweise heute zahlen“ */}
                  <div className="mt-6 rounded-2xl bg-white p-4 text-[12px] text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Typische Tool-Landschaft ohne GLENO
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      <li className="flex justify-between">
                        <span>CRM / Kontaktverwaltung</span>
                        <span className="font-medium">30–60 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Projekt- & Aufgaben-Tool</span>
                        <span className="font-medium">30–80 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Rechnungsprogramm</span>
                        <span className="font-medium">15–40 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Zeiterfassung</span>
                        <span className="font-medium">20–60 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Dokumenten-Cloud & Logistik-Excel</span>
                        <span className="font-medium">10–40 €</span>
                      </li>
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="text-slate-500">Summe pro Monat</span>
                      <span className="font-semibold text-slate-900">
                        oft 100–250 €+
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-[12px] text-emerald-900 ring-1 ring-emerald-100">
                  <p className="font-semibold">
                    „Rechnerisch haben wir mit GLENO nicht nur Tools, sondern auch
                    Abstimmung gespart.“
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800/90">
                    – Rückmeldung eines Beta-Teams aus einem Dienstleistungsunternehmen
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* BEWERTUNGEN / SOCIAL PROOF ----------------------------------- */}
          <section className="mb-12">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
                    <span className="text-amber-400">★ ★ ★ ★ ★</span>
                    <span>4,8 von 5 Punkten</span>
                  </div>
                  <p className="max-w-xs text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                    Basierend auf Rückmeldungen von Dienstleistern, Agenturen &amp;
                    Handwerksbetrieben, die GLENO als zentrale Unternehmenssoftware mit
                    einem Preis nutzen.
                  </p>
                </div>

                <div className="grid gap-3 text-[13px] text-slate-700 sm:max-w-xl sm:grid-cols-2">
                  <figure className="rounded-2xl bg-slate-50/90 p-4">
                    <p className="leading-relaxed">
                      „Wir mussten nicht mehr überlegen, welches Paket wir brauchen.
                      Einmal GLENO – und alle Bereiche unseres Unternehmens sind
                      abgedeckt.“
                    </p>
                    <figcaption className="mt-2 text-[11px] text-slate-500">
                      – Geschäftsführerin eines Dienstleistungsunternehmens (12 Mitarbeitende)
                    </figcaption>
                  </figure>
                  <figure className="rounded-2xl bg-slate-50/90 p-4">
                    <p className="leading-relaxed">
                      „Preislich genau das, was wir gesucht haben: keine Nutzerpreise,
                      keine Modul-Überraschungen – einfach ein klarer Betrag im Monat.“
                    </p>
                    <figcaption className="mt-2 text-[11px] text-slate-500">
                      – Inhaber eines Handwerksbetriebs (7 Mitarbeitende)
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </section>

          {/* ALLES INKLUSIVE ---------------------------------------------- */}
          <section className="mb-12">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Ein Lizenzpreis – alle Bereiche Ihrer Unternehmenssoftware.
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Sie müssen nicht mehr entscheiden, welches Modul in welches Paket passt.
              Mit GLENO erhalten Sie <strong>alle Bereiche</strong> in einer Lizenz – egal,
              ob Sie heute mit Aufträgen &amp; Rechnungen starten oder morgen Logistik,
              Kennzahlen und Marktplatz dazunehmen.
            </p>

            <ul className="mx-auto mt-7 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2">
              {inklusive.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                >
                  <span
                    className="mt-0.5 grid h-6 w-6 place-content-center rounded-full text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* WARUM EIN PREIS ---------------------------------------------- */}
          <section className="mb-12">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Warum nur ein Preis für die gesamte Unternehmenssoftware?
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-5 text-sm leading-relaxed text-slate-700 sm:grid-cols-3">
                <p>
                  <strong>Radikal einfach:</strong>
                  <br />
                  Kein Tarif-Baukasten, keine „Module hinzufügen“-Logik. GLENO ist bewusst
                  als vollständige Unternehmenssoftware gedacht – Sie aktivieren einfach
                  die Bereiche, die Sie nutzen möchten.
                </p>
                <p>
                  <strong>Planbare Kosten:</strong>
                  <br />
                  59 € zzgl. MwSt./Monat – unabhängig davon, wie viele Personen im Team
                  sind, wie viele Projekte laufen oder wie viele Leads über den
                  Marktplatz reinkommen.
                </p>
                <p>
                  <strong>Fair &amp; transparent:</strong>
                  <br />
                  Keine Provisionen, keine Pay-per-User-Gebühren, keine versteckten
                  Upgrades. Sie wissen von Anfang an, was GLENO kostet – und welche
                  Funktionen Sie dafür erhalten.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ ----------------------------------------------------------- */}
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Häufige Fragen zum GLENO-Preis
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Kurz beantwortet – damit Sie schnell entscheiden können, ob das Preismodell
              zu Ihrer Unternehmensrealität passt.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  q: 'Wie funktioniert die 7-Tage-Testphase?',
                  a: 'Sie registrieren sich in wenigen Sekunden und nutzen GLENO 7 Tage mit allen Funktionen der Unternehmenssoftware. Kündigen Sie in dieser Zeit, zahlen Sie nichts. Danach 59 € zzgl. MwSt./Monat.',
                },
                {
                  q: 'Gibt es mehrere Pakete oder Tarife?',
                  a: 'Nein. GLENO verfolgt bewusst das Prinzip „Ein Plan, ein Preis, alle Funktionen“. Keine Staffelung, kein Upselling – nur eine klare Unternehmenssoftware-Lizenz.',
                },
                {
                  q: 'Zahle ich pro Nutzer oder Mitarbeiter?',
                  a: 'Nein. Sie können Ihr gesamtes Team in GLENO nutzen lassen, ohne Aufpreis pro User. Der Preis bleibt gleich – egal, ob 3 oder 25 Personen damit arbeiten.',
                },
                {
                  q: 'Kostet der Marktplatz oder der Website-Builder extra?',
                  a: 'Nein. Marktplatz-Zugang und Website-/Landingpage-Builder sind Teil der GLENO-Unternehmenssoftware und im Preis enthalten. Es fallen keine Gebühren pro Lead an.',
                },
                {
                  q: 'Gibt es eine Mindestlaufzeit oder Einrichtungsgebühren?',
                  a: 'Es gibt keine Einrichtungsgebühr und keine feste Mindestlaufzeit. GLENO kann monatlich gekündigt werden, falls es nicht (mehr) zu Ihrer Situation passt.',
                },
                {
                  q: 'Was passiert mit meinen Daten, wenn ich GLENO nicht mehr nutze?',
                  a: 'Relevante Daten wie Kunden, Projekte, Aufträge oder Zeiterfassungen lassen sich als CSV/PDF exportieren. Sie behalten die Kontrolle über Ihre Unternehmensdaten.',
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-slate-200 bg-white/95 open:shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                >
                  <summary className="cursor-pointer list-none rounded-2xl p-5 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-medium text-slate-900">
                        {f.q}
                      </div>
                      <span className="text-xs text-slate-400 transition-transform group-open:rotate-90">
                        ▸
                      </span>
                    </div>
                    <div className="mt-1 hidden text-sm text-slate-700 group-open:block">
                      {f.a}
                    </div>
                  </summary>
                  <div className="px-5 pb-5 pt-0 text-sm text-slate-700 sm:hidden">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>

            {/* Abschluss-CTA */}
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Wenn Sie keine Lust mehr auf Tarif-Tabellen, Modul-Aufpreise und
                Preisüberraschungen haben, ist GLENO eine Einladung, Ihre
                Unternehmenssoftware <strong>radikal zu vereinfachen</strong>: ein Login,
                ein Preis, alles drin.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/registrieren"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-slate-50 shadow-sm hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Jetzt 7 Tage kostenlos testen
                </Link>
                <Link
                  href="/beratung"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Oder zuerst eine kurze Beratung buchen ↗
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
