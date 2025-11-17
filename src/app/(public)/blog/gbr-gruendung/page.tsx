// src/app/(public)/gbr-gruendung/page.tsx
import type { Metadata } from 'next'

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
{/* HERO – ultra starker erster Eindruck + Formular */}
<section
  id="hero"
  className="relative flex min-h-screen items-center overflow-hidden bg-slate-950 text-slate-50"
>
  {/* Background-Glow */}
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      background:
        'radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 55%), radial-gradient(circle at bottom, rgba(15,23,42,1), #020617)',
    }}
  />
  <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
  <div className="pointer-events-none absolute -right-10 bottom-[-80px] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

  {/* Content-Grid */}
  <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pt-28 pb-24 lg:flex-row lg:items-center lg:gap-14 lg:pt-32 lg:pb-28">
    {/* LEFT: Copy */}
    <div className="max-w-3xl">
      {/* Tagline / Credibility */}
      <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-sky-500/30 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span>GbR gründen 2025</span>
        <span className="hidden text-slate-500 sm:inline">•</span>
        <span className="hidden sm:inline">
          Kosten, Vertrag &amp; Ablauf verstehen
        </span>
        <span className="hidden text-slate-500 md:inline">•</span>
        <span className="hidden md:inline">
          Starterpaket aus der Praxis – 100 % kostenlos
        </span>
      </div>

      <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[40px]">
        GbR gründen ohne Anwaltspanik
        <span className="block text-sky-100">
          Holen Sie sich das komplette Starterpaket in Ihr Postfach.
        </span>
      </h1>

      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-200 sm:text-[15px]">
        Statt zehn Tabs offen zu haben, bekommen Sie alles an einem Ort: Ein{' '}
        <strong>Leitfaden zur GbR-Gründung</strong>, eine{' '}
        <strong>Checkliste zum Abhaken</strong>, ein{' '}
        <strong>Mustervertrag (Word)</strong>, eine{' '}
        <strong>Excel-Kostenübersicht</strong> und ein{' '}
        <strong>30-Tage-Startplan</strong> – direkt nutzbar für Ihre eigene GbR.
      </p>

      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sky-300">
        Klar, praxisnah und ohne Juristendeutsch – erstellt von Unternehmern,
        die selbst gegründet haben. Ideal, wenn Sie sich gerade fragen:
        „Wo fange ich an? Was kostet das? Und was darf ich auf keinen Fall
        vergessen?“
      </p>

      {/* Trust badges */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 ring-1 ring-slate-700/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          100 % kostenlos &amp; unverbindlich
        </span>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-800/80">
          Sofortiger Download per E-Mail
        </span>
        <span className="rounded-full bg-slate-900/70 px-3 py-1 ring-1 ring-slate-800/70">
          Sie können sich jederzeit mit einem Klick abmelden
        </span>
      </div>
    </div>

    {/* RIGHT: Lead-Form */}
    <div className="w-full max-w-md lg:max-w-sm" id="lead-form">
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.98)] backdrop-blur-xl">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-16 right-[-40px] h-32 w-32 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-[-40px] h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative">
          <h2 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">
            Starterpaket „GbR gründen 2025“ sichern
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Tragen Sie Ihre E-Mail ein – wir senden Ihnen alle Unterlagen
            direkt zu. Die Telefonnummer hilft uns nur, falls wir Rückfragen
            haben. Kein Telefonverkauf, kein Spam.
          </p>

          {/* WHAT YOU GET LIST */}
          <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3 text-[11px] text-slate-200">
            <p className="font-semibold text-sky-200">
              Sie erhalten per E-Mail:
            </p>
            <ul className="mt-1 space-y-1">
              <li>
                • PDF-Leitfaden „GbR gründen 2025 – Der komplette Überblick“
              </li>
              <li>• Einfache GbR-Gründungs-Checkliste zum Ausdrucken</li>
              <li>• Muster-Gesellschaftsvertrag als Word-Datei (editierbar)</li>
              <li>
                • Excel-Vorlage zur Planung aller Gründungs- &amp; laufenden
                Kosten
              </li>
              <li>
                • 30-Tage-Startplan mit Wochenaufgaben nach der Gründung
              </li>
            </ul>
          </div>

          {/* FORM – action an dein Backend anpassen */}
          <form
            className="mt-4 space-y-3"
            method="post"
            action="/api/leads/gbr-gruendung" // TODO: Endpoint anpassen
          >
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-[11px] font-medium text-slate-100"
              >
                E-Mail-Adresse *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="z. B. name@unternehmen.de"
                className="w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="block text-[11px] font-medium text-slate-100"
              >
                Telefonnummer (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Für Rückfragen – kein Telefonverkauf"
                className="w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-start gap-2 text-[10px] text-slate-400">
                <input
                  type="checkbox"
                  name="privacy"
                  required
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
                <span>
                  Ich bin damit einverstanden, dass mir die Unterlagen per
                  E-Mail zugesendet werden. Weitere Informationen in der
                  Datenschutzerklärung.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_18px_60px_rgba(8,47,73,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_80px_rgba(8,47,73,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              style={{ backgroundColor: '#0F172A' }}
            >
              Starterpaket jetzt kostenlos anfordern
            </button>

            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              100 % kostenlos &amp; unverbindlich. Sie erhalten gelegentlich
              ergänzende Tipps zur GbR-Gründung und zum Arbeiten mit GLENO.
              Abmeldung ist jederzeit mit einem Klick möglich.
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>

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
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• GbR gründen voraussetzungen</li>
              <li>• GbR gründungsvoraussetzungen</li>
              <li>• familien GbR gründen</li>
            </ul>
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
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• GbR gründen schritte</li>
              <li>• GbR gründung ablauf</li>
              <li>• GbR gründen wie &amp; GbR gründen checkliste</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Kosten, Steuern &amp; Vertrag
            </h3>
            <p className="mt-2 text-slate-600">
              Was kostet die Gründung? Wie rechnen Sie Steuern grob durch? Und
              welche Punkte sollte ein GbR-Vertrag unbedingt enthalten?
            </p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• GbR gründen kosten &amp; GbR gründungskosten</li>
              <li>• kosten GbR gründung vs. GmbH</li>
              <li>• vertrag GbR gründung (inkl. Mustervertrag)</li>
            </ul>
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
