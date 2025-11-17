// src/app/(public)/gbr-gruendung/page.tsx
import type { Metadata } from 'next'
import { GbrHeroSection } from './GbrHeroSection'

const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'GbR gründen 2025 – Kosten, Checkliste & Mustervertrag (kostenloses Starterpaket)',
  description:
    'Sie möchten eine GbR gründen? Erhalten Sie kostenlos ein komplettes Starterpaket: Leitfaden, Checkliste, Mustervertrag (Word), Kosten-Excel & 30-Tage-Plan. 100 % unverbindlich.',
  keywords: [
    'gbr gründen',
    'gründung einer gbr',
    'gbr gründung kosten',
    'gbr gründen voraussetzungen',
    'gbr gründen checkliste',
    'vertrag gbr gründung',
    'gbr gründung ablauf',
    'gbr gründungsvoraussetzungen',
    'kosten gbr gründung',
    'gbr muster vertrag',
    'gbr gründung excel',
  ],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/gbr-gruendung`,
    siteName: SITE_NAME,
    title:
      'GbR gründen 2025 – Kosten, Checkliste & Mustervertrag (kostenloses Starterpaket)',
    description:
      'GbR gründen ohne Chaos: Holen Sie sich jetzt kostenlos den Leitfaden inkl. Checkliste, Mustervertrag, Kosten-Excel & 30-Tage-Plan.',
    images: [
      {
        url: `${SITE_URL}/og/og-gbr-gruendung.jpg`,
        width: 1200,
        height: 630,
        alt: 'GbR gründen – Kosten, Checkliste & Mustervertrag',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'GbR gründen 2025 – Kosten, Checkliste & Mustervertrag (kostenloses Starterpaket)',
    description:
      'Schritt-für-Schritt zur eigenen GbR: Starterpaket mit Leitfaden, Checkliste, Mustervertrag & Excel-Kostenplaner.',
    images: [`${SITE_URL}/og/og-gbr-gruendung.jpg`],
  },
  robots: { index: true, follow: true },
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function GbrLandingPage() {
  return (
    <>
      {/* HERO mit Formular & Logik */}
      <GbrHeroSection />

      {/* SECTION: Was wird alles beantwortet? */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welche Fragen das Starterpaket zur GbR-Gründung für Sie klärt.
          </h2>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 text-[13px] md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              1. Grundlagen &amp; Voraussetzungen
            </h3>
            <p className="mt-2 text-slate-600">
              Wann ist eine GbR sinnvoll? Wie viele Gesellschafter brauchen Sie?
              Was müssen Sie rechtlich beachten – gerade bei einer
              Familien-GbR?
            </p>
            <ul className="mt-3 space-y-1 text-slate-600" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Ablauf, Schritte &amp; Dauer
            </h3>
            <p className="mt-2 text-slate-600">
              Vom ersten Gespräch mit Ihrem Partner bis zur fertigen GbR:
              Schritt-für-Schritt in der richtigen Reihenfolge – inklusive
              Checkliste.
            </p>
            <ul className="mt-3 space-y-1 text-slate-600" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Kosten, Steuern &amp; Vertrag
            </h3>
            <p className="mt-2 text-slate-600">
              Was kostet die Gründung? Wie rechnen Sie Steuern grob durch? Und
              welche Punkte sollte ein GbR-Vertrag unbedingt enthalten?
            </p>
            <ul className="mt-3 space-y-1 text-slate-600" />
          </div>
        </div>
      </section>

      {/* MID CTA – zweiter starker Einstieg */}
      <section className="bg-slate-900 px-5 py-14 text-slate-50">
        <div className="mx-auto max-w-5xl rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.95)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Starten Sie Ihre GbR mit Klarheit statt Bauchgefühl.
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
                Das Starterpaket gibt Ihnen einen roten Faden – von der Idee
                über die Anmeldung beim Finanzamt bis hin zu den ersten 30
                Tagen nach der Gründung. Ohne teure Seminare, ohne
                Juristensprache.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-slate-200">
                <li>• Ideal, wenn Sie gerade „gbr gründen“ googeln</li>
                <li>
                  • Perfekt, wenn Sie mit einem Partner professionell starten
                  möchten
                </li>
                <li>• Praxisnah, wenn Sie später mit GLENO arbeiten wollen</li>
              </ul>
            </div>

            <div className="w-full max-w-sm lg:w-72">
              <a
                href="#lead-form"
                className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-[13px] font-semibold text-white shadow-[0_18px_70px_rgba(8,47,73,0.95)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_90px_rgba(8,47,73,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                style={{ backgroundColor: PRIMARY }}
              >
                Starterpaket jetzt kostenlos anfordern
              </a>
              <p className="mt-2 text-[10px] text-slate-400">
                Keine versteckten Kosten. Keine Verpflichtung. Nur Inhalte, die
                Sie bei Ihrer Gründung wirklich weiterbringen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Was ist in den einzelnen Dateien drin? */}
      <section className="bg-white px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Das erhalten Sie konkret – Datei für Datei.
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-[15px]">
            Damit Sie genau wissen, was in Ihrem Postfach landet.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 text-[13px] md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                1. PDF-Leitfaden „GbR gründen 2025“
              </h3>
              <p className="mt-2 text-slate-700">
                Schritt-für-Schritt-Erklärung von der Idee bis zur
                fertigen Gesellschaft. Inklusive:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Unterschiede GbR vs. GmbH / UG</li>
                <li>• Ablauf der Anmeldung &amp; typische Stolperfallen</li>
                <li>• Steuern, Konto, Versicherungen auf verständlichem Niveau</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                2. Checkliste &amp; 30-Tage-Plan als PDF
              </h3>
              <p className="mt-2 text-slate-700">
                Zwei übersichtliche Dokumente, die Sie ausdrucken und Schritt
                für Schritt abhaken können:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Reine Gründungs-Checkliste in korrekter Reihenfolge</li>
                <li>• Wochenplan für die ersten 4 Wochen nach der Gründung</li>
                <li>• Ideal für Gründer-Teams, um sich zu organisieren</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                3. Muster-Gesellschaftsvertrag (Word)
              </h3>
              <p className="mt-2 text-slate-700">
                Ein ausführlicher Mustervertrag, den Sie mit Ihren Daten
                befüllen und bei Bedarf mit einem Anwalt durchgehen können:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Regelungen zu Einlagen, Gewinnen, Entnahmen</li>
                <li>• Geschäftsführung, Haftung &amp; Wettbewerbsverbot</li>
                <li>• Ausscheiden, Auflösung, Schlussbestimmungen</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                4. Excel-Vorlage für Gründungs- &amp; laufende Kosten
              </h3>
              <p className="mt-2 text-slate-700">
                Eine fertige Excel-Datei, mit der Sie auf einen Blick sehen:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Was kostet die Gründung einmalig?</li>
                <li>• Welche Fixkosten laufen jeden Monat?</li>
                <li>• Wie sieht Ihr erstes Geschäfts­jahr finanziell aus?</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Sicherheit */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Häufige Fragen zur Anmeldung &amp; zum Starterpaket.
          </h2>

          <div className="mt-6 space-y-4 text-[13px]">
            <details className="group rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Kostet das Starterpaket wirklich nichts?
                <span className="text-slate-500 group-open:rotate-90">
                  ›
                </span>
              </summary>
              <p className="mt-2 text-slate-700">
                Ja. Das Starterpaket ist zu 100 % kostenlos und unverbindlich.
                Sie gehen keine Vertragsbeziehung ein. Sie erhalten zusätzlich
                gelegentlich E-Mails mit Tipps zur Selbstständigkeit und zur
                Arbeit mit GLENO – Sie können sich jederzeit mit einem Klick
                abmelden.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Muss ich schon sicher sein, dass ich eine GbR gründen möchte?
                <span className="text-slate-500 group-open:rotate-90">
                  ›
                </span>
              </summary>
              <p className="mt-2 text-slate-700">
                Nein. Das Paket ist gerade für Menschen gedacht, die noch in der
                Entscheidungsphase sind und verstehen möchten, welche Schritte
                und Kosten auf sie zukommen. Viele Empfänger nutzen die
                Unterlagen, um mit ihrem zukünftigen Geschäftspartner in Ruhe
                alles durchzugehen.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Brauche ich trotz Mustervertrag noch einen Anwalt?
                <span className="text-slate-500 group-open:rotate-90">
                  ›
                </span>
              </summary>
              <p className="mt-2 text-slate-700">
                Der Mustervertrag ist eine praxisnahe Grundlage mit allen
                wichtigen Bausteinen. Er ersetzt keine individuelle
                Rechtsberatung. Gerade bei größeren Vorhaben oder höheren
                Umsätzen ist es sinnvoll, den Vertrag einmal von einer
                Anwältin/einem Anwalt prüfen zu lassen.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Welche Rolle spielt GLENO bei der GbR?
                <span className="text-slate-500 group-open:rotate-90">
                  ›
                </span>
              </summary>
              <p className="mt-2 text-slate-700">
                GLENO ist nicht die Gründungsplattform, sondern das System für
                den Alltag danach: Angebote, Rechnungen, Kunden &amp;
                Projekte. Im Leitfaden sehen Sie, wie Sie Ihre GbR sauber
                gründen – und wie Sie sie anschließend mit GLENO organisiert
                führen können.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  )
}
