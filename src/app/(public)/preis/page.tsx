// src/app/(public)/preis/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'

/* ----------------------------- Site/SEO ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#0a1b40'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GLENO - Preis',
    template: '%s | GLENO',
  },
  description:
    'GLENO vereint Marktplatz, CRM und Website in einer Plattform. 7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Keine Zusatzkosten für Leads, Nutzer oder Funktionen – ein Preis für alles.',
  alternates: { canonical: `${SITE_URL}/preis` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/preis`,
    siteName: SITE_NAME,
    title: 'Preis – GLENO',
    description:
      'Ein Preis. Alle Funktionen. 7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Kein Paket-Chaos, keine Lead-Gebühren.',
    images: [
      {
        url: `${SITE_URL}/og/og-price.jpg`,
        width: 1200,
        height: 630,
        alt: 'Preis – GLENO',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preis – GLENO',
    description:
      'GLENO: Marktplatz, CRM & Website in einem. 7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Keine versteckten Kosten.',
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
      'GLENO bündelt Marktplatz, CRM und Website in einer Plattform. Ein Preis für alles – keine Zusatzgebühren pro Lead oder Nutzer.',
    offers: {
      '@type': 'Offer',
      price: '59.00',
      priceCurrency: 'EUR',
      description:
        '7 Tage kostenlos testen, danach 59 € zzgl. MwSt./Monat. Ein Preis für alle Funktionen, ohne Zusatzkosten.',
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
  'Zugang zum GLENO-Marktplatz – ohne Gebühren pro Lead',
  'Integriertes CRM für Anfragen, Deals, Kunden & Historie',
  'Eigene Website / Landingpage mit GLENO-Builder',
  'Angebot → Auftrag → Rechnung (PDF) & Dokumentation',
  'Unbegrenzte Projekte & Kunden inklusive',
  'Unbegrenzte Team-Mitglieder – kein Aufpreis pro User',
  'Aufgaben-, Termin- und Pipeline-Übersicht',
  'Zentrale Dokumentenablage für Verträge, Unterlagen & Dateien',
  'Benachrichtigungen & Erinnerungen für Follow-ups, Deadlines & Aufgaben',
  'EU-Hosting, TLS-Verschlüsselung & regelmäßige Backups',
]

export default function PricePage() {
  return (
    <>
      <JsonLd />

      {/* Animations-Utilities (Hintergrund-Glow) */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes floatSlow {
              0% { transform: translate3d(0,0,0) scale(1); opacity:.55 }
              50%{ transform: translate3d(10px,10px,0) scale(1.02); opacity:.7 }
              100%{ transform: translate3d(0,0,0) scale(1); opacity:.55 }
            }
            @keyframes floatSlow2 {
              0% { transform: translate3d(0,0,0) scale(1); opacity:.45 }
              50%{ transform: translate3d(-12px,6px,0) scale(1.03); opacity:.65 }
              100%{ transform: translate3d(0,0,0) scale(1); opacity:.45 }
            }
          `,
        }}
      />

      <div className="space-y-20">
        {/* HERO – kompakte Card, immer mittig ---------------------------- */}
        <section className="relative pt-10 pb-6 sm:pt-14 sm:pb-10">
          {/* softer Hintergrund, nicht zu dominant */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-30vh] -z-10 h-[130vh] w-[160vw] -translate-x-1/2"
            style={{
              background:
                'radial-gradient(1200px 520px at 50% 0%, rgba(10,27,64,0.08), transparent),' +
                'radial-gradient(820px 420px at 15% 10%, rgba(10,27,64,0.05), transparent),' +
                'radial-gradient(820px 420px at 85% 8%, rgba(10,27,64,0.05), transparent)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-[-8vw] top-[4vh] -z-10 h-[24rem] w-[24rem] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(10,27,64,.16), rgba(10,27,64,0))',
              filter: 'blur(26px)',
              animation: 'floatSlow 12s ease-in-out infinite',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-10vw] top-[10vh] -z-10 h-[26rem] w-[26rem] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(10,27,64,.14), rgba(10,27,64,0))',
              filter: 'blur(28px)',
              animation: 'floatSlow2 14s ease-in-out infinite',
            }}
          />

          {/* Card */}
          <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
            <div className="rounded-[32px] border border-white/80 bg-white/92 px-5 py-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl ring-1 ring-white/80 sm:px-8 sm:py-9">
              {/* Badge-Zeile – am Handy und Desktop zentriert */}
              <div className="mx-auto mb-4 inline-flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-900 sm:flex-row sm:justify-center sm:gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  7 Tage kostenlos testen
                </span>
                <span className="text-slate-700">
                  Danach 59 € zzgl. MwSt./Monat
                </span>
              </div>

              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Ein Preis für alles – GLENO.
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                GLENO vereint Marktplatz, CRM und Website in einer Plattform.
                Sie starten mit <strong>7 Tagen kostenlos</strong>. Danach
                zahlen Sie <strong>59 € zzgl. MwSt./Monat</strong> – ohne
                Paket-Chaos, ohne Gebühren pro Lead, ohne Aufpreis pro Nutzer.
              </p>

              {/* Preisblock */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="leading-none">
                  <span className="text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                    59 €
                  </span>
                  <span className="ml-2 align-top text-sm text-slate-600 sm:text-base">
                    zzgl. MwSt. / Monat
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Ein Plan. Monatlich kündbar. Keine Einrichtungsgebühr.
                </p>
              </div>

              {/* CTAs – Mobile untereinander, ab sm nebeneinander */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/registrieren"
                  aria-label="Jetzt GLENO 7 Tage kostenlos testen"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_16px_40px_rgba(15,23,42,0.45)] transition hover:shadow-[0_20px_55px_rgba(15,23,42,0.7)] sm:w-auto"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #020817, #0f172a)',
                  }}
                >
                  Jetzt kostenlos testen
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
                  href="/support"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/80 backdrop-blur hover:bg-slate-50 sm:w-auto"
                >
                  Fragen? Kurz sprechen
                </Link>
              </div>

              <p className="mt-5 text-[10px] text-slate-500 sm:text-[11px]">
                DSGVO-konform • Server in der EU • Alle Features inklusive •
                Keine Lead-Gebühren.
              </p>
            </div>
          </div>
        </section>

        {/* Inklusive ------------------------------------------------------ */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
            Alles inklusive – keine versteckten Upgrades
          </h2>
          <ul className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
            {inklusive.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/92 p-4 text-sm text-slate-800 shadow-[0_10px_34px_rgba(2,6,23,0.07)] backdrop-blur-xl ring-1 ring-white/70"
              >
                <span
                  className="grid h-6 w-6 place-content-center rounded-full text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Warum ein Preis ----------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-white/70 bg-white/92 p-7 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur-xl ring-1 ring-white/70 sm:p-9">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Warum nur ein Preis?
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 text-sm leading-relaxed text-slate-700 sm:grid-cols-3">
              <p>
                <strong>Radikal einfach:</strong> Kein Paket-Wirrwarr, keine
                Feature-Limits. GLENO ist immer in Vollausstattung.
              </p>
              <p>
                <strong>Planbare Kosten:</strong> 59 € zzgl. MwSt./Monat –
                unabhängig von Leads, Nutzern oder Projekten.
              </p>
              <p>
                <strong>Fair & transparent:</strong> Keine Provisionen, keine
                Pay-per-Lead-Gebühren, keine versteckten Upgrades.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ ----------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Häufige Fragen zum GLENO-Preis
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                q: 'Wie funktioniert der 7-Tage-Test?',
                a: 'Sie registrieren sich in wenigen Sekunden und nutzen GLENO 7 Tage mit allen Funktionen. Kündigen Sie in dieser Zeit, zahlen Sie nichts. Danach 59 € zzgl. MwSt./Monat.',
              },
              {
                q: 'Gibt es mehrere Pakete?',
                a: 'Nein. Ein Plan, ein Preis, alle Features. Kein Upselling.',
              },
              {
                q: 'Kostet der Marktplatz extra?',
                a: 'Nein. Der Zugang zum GLENO-Marktplatz ist inklusive. Es fallen keine Gebühren pro Lead an.',
              },
              {
                q: 'Zahle ich pro Nutzer?',
                a: 'Nein. Sie können Ihr gesamtes Team in GLENO nutzen lassen – ohne Aufpreis pro User.',
              },
              {
                q: 'Gibt es Einrichtungsgebühren oder Mindestlaufzeit?',
                a: 'Keine Einrichtungsgebühr, keine Mindestlaufzeit. Sie können monatlich kündigen.',
              },
              {
                q: 'Kann ich meine Daten exportieren?',
                a: 'Ja. Relevante Daten lassen sich als CSV/PDF exportieren, falls Sie GLENO irgendwann verlassen möchten.',
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-white/70 bg-white/92 backdrop-blur-xl ring-1 ring-white/70 open:shadow-[0_10px_34px_rgba(2,6,23,0.07)]"
              >
                <summary className="cursor-pointer list-none rounded-2xl p-5 text-left">
                  <div className="text-base font-medium text-slate-900">
                    {f.q}
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

          <p className="mt-8 text-sm leading-relaxed text-slate-600">
            Sie wollen es schwarz auf weiß? Testen Sie GLENO jetzt 7 Tage
            kostenlos – ohne Risiko, ohne versteckte Kosten. Ein Login. Ein
            Preis. Alles drin.
          </p>
        </section>
      </div>
    </>
  )
}
