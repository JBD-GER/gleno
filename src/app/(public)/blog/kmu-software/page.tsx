// src/app/(public)/kmu-software/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'KMU Software – GLENO: Unternehmenssoftware für kleine und mittlere Unternehmen',
  description:
    'GLENO ist die moderne KMU Software für kleine und mittlere Unternehmen: CRM, Angebote, Rechnungen, Prozesse, Dokumente & Kennzahlen in einer Lösung. Ideal für Dienstleister, Handwerk, Agenturen & lokale Unternehmen.',
  keywords: [
    'kmu software',
    'unternehmenssoftware kmu',
    'crm kmu',
    'prozessoptimierung kmu',
    'digitalisierung kmu',
    'software kleine unternehmen',
    'software für dienstleister',
    'handwerkersoftware',
    'rechnungsprogramm kmu',
    'crm kleine unternehmen',
  ],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/kmu-software`,
    siteName: SITE_NAME,
    title:
      'KMU Software – GLENO: Unternehmenssoftware für kleine und mittlere Unternehmen',
    description:
      'GLENO hilft kleinen und mittleren Unternehmen, Prozesse zu digitalisieren, Kunden strukturiert zu betreuen und Wachstum ohne Chaos zu ermöglichen.',
    images: [
      {
        url: `${SITE_URL}/og/og-kmu-software.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – KMU Software & Unternehmenssoftware für kleine und mittlere Unternehmen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'KMU Software – GLENO: Unternehmenssoftware für kleine und mittlere Unternehmen',
    description:
      'GLENO vereint CRM, Angebots- & Rechnungsprogramm, Prozesse & Kennzahlen für kleine und mittlere Unternehmen in einer Lösung.',
    images: [`${SITE_URL}/og/og-kmu-software.jpg`],
  },
  robots: { index: true, follow: true },
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function KmuSoftwarePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-slate-50">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent), radial-gradient(circle at top right, rgba(15,23,42,1), #020817)',
          }}
        />
        <div className="pointer-events-none absolute -bottom-24 right-[-40px] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-18 pb-16 sm:pt-24 lg:flex-row lg:items-center lg:gap-14">
          {/* LEFT */}
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-sky-500/25 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>KMU Software</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline">Unternehmenssoftware für KMU</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline">CRM, Angebote &amp; Rechnungen</span>
            </div>

            <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[40px] text-white">
              Wachsen ohne Chaos.
              <span className="block text-white">
                GLENO ist die KMU Software für Unternehmen, die mehr wollen.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
              GLENO ist die{' '}
              <strong>All-in-One Unternehmenssoftware für kleine und mittlere Unternehmen</strong>:
              CRM, Angebote, Rechnungen, Projekte, Dokumente und Kennzahlen in einer Oberfläche.
              Für Dienstleister, Handwerk, Agenturen und lokale Unternehmen, die wachsen wollen –
              ohne in Prozessen und Tools zu ersticken.
            </p>

            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sky-300">
              Statt zehn verschiedener Insellösungen bietet GLENO eine zentrale{' '}
              <strong>KMU Software</strong>, die Vertrieb, Projekte und Abläufe verbindet. So wird
              aus Bauchgefühl ein planbarer Prozess – und aus Tagesgeschäft wieder unternehmerische
              Freiheit.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/registrieren"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_70px_rgba(15,23,42,0.98)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_90px_rgba(15,23,42,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                style={{ backgroundColor: PRIMARY }}
              >
                GLENO 14 Tage kostenlos testen
                <span className="ml-1.5 text-xs">↗</span>
              </Link>
              <Link
                href="#phasen"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-500/70 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-slate-900 hover:border-slate-200"
              >
                Mehr über GLENO für KMU
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Für Dienstleister, Handwerk, Agenturen &amp; lokale Unternehmen
              </span>
              <span>DSGVO-konform &amp; Hosting in der EU</span>
              <span>Monatlich kündbar</span>
            </div>
          </div>

          {/* RIGHT – Klarheitskarte */}
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700/70 bg-slate-900/90 p-4 text-[9px] shadow-[0_26px_90px_rgba(0,0,0,0.98)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-100">
                  Erkennen Sie Ihr Unternehmen hier wieder?
                </span>
                <span className="text-[8px] text-slate-500">
                  Viel Arbeit • wenig Struktur
                </span>
              </div>
              <div className="mt-1 space-y-1 text-[9px] text-slate-300">
                <p>– Informationen liegen in E-Mails, Excel, Köpfen und WhatsApp-Gruppen.</p>
                <p>– Angebote und Rechnungen dauern zu lange und bleiben teilweise liegen.</p>
                <p>– Keine klare Übersicht: Welche Kunden, Projekte und Beträge sind offen?</p>
              </div>
              <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-[9px] text-emerald-100">
                <span className="block font-semibold text-emerald-300">
                  GLENO als KMU Software:
                </span>
                <span className="block mt-0.5">
                  Ein System, in dem Kunden, Angebote, Rechnungen, Projekte und Dokumente zusammenkommen.
                  Mit klaren Prozessen und Kennzahlen – statt Bauchgefühl und Zettelwirtschaft.
                </span>
              </div>
              <div className="mt-2 text-[8px] text-slate-400">
                In einem <strong>kostenlosen 30-Minuten-Gespräch</strong> zeigt GLENO, wie Ihr Unternehmen
                strukturiert wachsen kann – mit einer Software, die zum Alltag von KMU passt.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASEN */}
      <section id="phasen" className="bg-white px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Die 4 Phasen, die jedes KMU durchläuft – und wie GLENO in jeder Phase hilft.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Ob Gründung, Wachstum, Professionalisierung oder Skalierung: GLENO unterstützt kleine
            und mittlere Unternehmen genau dort, wo Chaos, ineffiziente Prozesse und fehlende
            Transparenz Wachstum bremsen.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Phase 1 – Gründung &amp; Aufbau
              </h3>
              <p className="mt-1 text-slate-600">
                Kundenkontakte liegen im Posteingang, Angebote werden in Word erstellt, Rechnungen
                in Excel. In der Gründungsphase dominieren Improvisation, Bauchgefühl und
                Einzelaktionen.
              </p>
              <p className="mt-2 text-slate-700">
                GLENO hilft, früh ein strukturiertes <strong>CRM für kleine Unternehmen</strong>
                aufzubauen, Angebote und Rechnungen zu standardisieren und zentrale Stammdaten
                aufzubauen, ohne das Tagesgeschäft zu blockieren.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Phase 2 – Wachstum &amp; Chaos
              </h3>
              <p className="mt-1 text-slate-600">
                Das Unternehmen wächst, das Team wird größer – und plötzlich wachsen Chaos,
                Abstimmungsaufwand und Fehlerquoten schneller als der Umsatz. Viele KMU stecken
                genau hier fest.
              </p>
              <p className="mt-2 text-slate-700">
                GLENO bringt Ordnung in die Abläufe: zentrale{' '}
                <strong>KMU Software für Vertrieb, Projekte und Rechnungen</strong>, klare
                Zuständigkeiten, automatische Workflows und transparente Übersicht über offene
                Angebote, Aufträge und Zahlungen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Phase 3 – Professionalisierung
              </h3>
              <p className="mt-1 text-slate-600">
                Das Unternehmen ist etabliert, aber intern laufen viele Dinge schwerfällig. Wissen
                steckt in Köpfen, Onboarding dauert zu lange, Entscheidungen basieren auf
                Bauchgefühl statt auf Kennzahlen.
              </p>
              <p className="mt-2 text-slate-700">
                GLENO hilft, Prozesse zu standardisieren,{' '}
                <strong>Prozessoptimierung im KMU</strong> voranzutreiben und durch klare
                Dashboards und Auswertungen endlich Transparenz in die Unternehmenssteuerung zu
                bringen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Phase 4 – Skalierung &amp; Expansion
              </h3>
              <p className="mt-1 text-slate-600">
                Neue Standorte, mehr Projekte, mehr Mitarbeitende – in der Skalierungsphase steigt
                die Komplexität drastisch. Alte Strukturen stoßen an ihre Grenzen.
              </p>
              <p className="mt-2 text-slate-700">
                Als <strong>skalierbare Unternehmenssoftware für KMU</strong> bietet GLENO
                einheitliche Prozesse, verlässliche Daten und Automatisierungen, die Wachstum
                unterstützen, statt es zu blockieren.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEME */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Die 10 größten Engpässe, die kleine und mittlere Unternehmen jeden Tag bremsen.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            In Gesprächen mit zahlreichen KMU tauchen immer wieder die gleichen Muster auf. GLENO
            kennt diese Engpässe – und löst sie mit einer zentralen KMU Software.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 text-[13px]">
            {[
              {
                title: '1. Kein zentrales CRM',
                body: 'Kundendaten liegen in E-Mail-Postfächern, Excel-Listen oder in Köpfen. Es fehlt eine saubere Kundendatenbank mit Historie, Projekten und Umsätzen.',
              },
              {
                title: '2. Langsame Angebote & Rechnungen',
                body: 'Angebote werden mit Word, Rechnungen mit Excel erstellt. Das kostet Zeit, führt zu Fehlern und macht eine saubere Nachverfolgung schwierig.',
              },
              {
                title: '3. Prozesschaos im Alltag',
                body: 'Kein klarer Ablauf von Anfrage über Angebot und Auftrag bis zur Abrechnung. Jeder macht es ein wenig anders, Abläufe sind nicht dokumentiert.',
              },
              {
                title: '4. Fehlende Transparenz',
                body: 'Unklar ist, welche Angebote offen sind, welche Rechnungen überfällig sind, welche Projekte profitabel sind und wo Geld liegen bleibt.',
              },
              {
                title: '5. Doppelarbeit & Medienbrüche',
                body: 'Daten werden mehrfach erfasst, Informationen aus E-Mails manuell übertragen, Copy & Paste ist an der Tagesordnung – fehleranfällig und teuer.',
              },
              {
                title: '6. Onboarding ist mühsam',
                body: 'Neue Mitarbeitende brauchen lange, um Abläufe zu verstehen. Wissen steckt in Köpfen, nicht in Systemen – das bremst Wachstum und Qualität.',
              },
              {
                title: '7. Abhängigkeit von Einzelpersonen',
                body: 'Fallen Schlüsselpersonen aus, weiß niemand genau, was der aktuelle Stand bei Kunden, Projekten oder Angeboten ist.',
              },
              {
                title: '8. Kein Überblick über Kennzahlen',
                body: 'Wichtige KPIs wie Angebotserfolgsquote, Deckungsbeiträge oder Zahlungsziele sind nicht zentral sichtbar. Entscheidungen basieren auf Gefühl.',
              },
              {
                title: '9. Tool-Wildwuchs',
                body: 'CRM, Projektmanagement, Dokumente, Zeiterfassung, E-Mails – alles in verschiedenen Tools. Niemand hat das Gesamtbild.',
              },
              {
                title: '10. Geschäftsführung als Flaschenhals',
                body: 'Fast jede wichtige Entscheidung landet auf dem Schreibtisch der Geschäftsführung. Entlastung, Delegation und Struktur fehlen.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl p-5 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-slate-700">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

            {/* CTA STRATEGIEGESPRÄCH */}
      <section className="bg-slate-950 px-5 py-14 text-slate-50">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Der nächste Schritt: 30 Minuten Klarheit für Ihr Unternehmen.
          </h2>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-200">
            In einem unverbindlichen Strategiegespräch analysiert GLENO mit Ihnen, in welcher
            Phase sich Ihr Unternehmen befindet, welche Engpässe Sie am meisten bremsen und wie
            eine passende Lösung mit der GLENO KMU Software aussehen kann.
          </p>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-300">
            Sie erhalten konkrete Ansatzpunkte, die Sie direkt umsetzen können – mit GLENO oder
            mit Ihren bestehenden Systemen. Klar, ehrlich und ohne Verkaufsdruck.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3">
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-slate-100"
            >
              Kostenloses Strategiegespräch mit GLENO buchen
              <span className="ml-1.5 text-xs">↗</span>
            </Link>
            <span className="text-[11px] text-slate-400">
              Online-Termin, ca. 30 Minuten · Für Inhaber:innen &amp; Geschäftsführung von KMU
            </span>
          </div>
        </div>
      </section>

      {/* FUNKTIONEN / LÖSUNG */}
      <section className="bg-white px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Was GLENO als KMU Software konkret leistet.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            GLENO ist mehr als ein weiteres Tool. Es ist das digitale Betriebssystem für kleine
            und mittlere Unternehmen, in dem Kunden, Projekte, Finanzen und Abläufe zusammenlaufen.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                CRM für KMU &amp; Dienstleister
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Zentrale Kundenakte mit Historie &amp; Umsätzen</li>
                <li>✔ Verknüpfung von Projekten, Dokumenten &amp; Vorgängen</li>
                <li>✔ Saubere Segmentierung &amp; bessere Betreuung</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Angebots- &amp; Rechnungsprogramm
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Schnelle Angebotserstellung mit Vorlagen</li>
                <li>✔ Rechnungen, Abschläge, Skonti &amp; Mahnwesen</li>
                <li>✔ Voller Überblick über offene Posten</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Prozesse &amp; Aufgaben
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Standardisierte Abläufe von Anfrage bis Zahlung</li>
                <li>✔ Aufgaben &amp; Zuständigkeiten im Team</li>
                <li>✔ Mehr Verlässlichkeit im Tagesgeschäft</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Dokumente &amp; Dateien
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Dokumentenablage direkt am Kunden &amp; Projekt</li>
                <li>✔ Versionen, Notizen &amp; Nachvollziehbarkeit</li>
                <li>✔ Kein Suchen mehr in Ordnerstrukturen</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Kennzahlen &amp; Übersicht
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Überblick über Angebote, Aufträge &amp; Umsätze</li>
                <li>✔ Transparenz bei zahlenden und offenen Kunden</li>
                <li>✔ Bessere Entscheidungen auf Basis von Daten</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Einfach eingeführt, einfach genutzt
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>✔ Läuft im Browser – keine Installation nötig</li>
                <li>✔ Intuitive Bedienung statt kompliziertem ERP</li>
                <li>✔ Ideal für Teams ohne große IT-Abteilung</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FÜR WEN + SEO-TEXT */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Für welche kleinen und mittleren Unternehmen GLENO besonders geeignet ist.
          </h2>

          <div className="mt-5 grid grid-cols-1 items-start gap-6 text-[13px] md:grid-cols-2">
            <div>
              <ul className="space-y-1.5 text-slate-700">
                <li>✔ Dienstleister &amp; Beratungsunternehmen</li>
                <li>✔ Handwerksbetriebe &amp; ausführende Gewerke</li>
                <li>✔ Agenturen &amp; projektgetriebene Unternehmen</li>
                <li>✔ Technische Dienstleister &amp; Montagebetriebe</li>
                <li>✔ Lokale KMU mit wiederkehrenden Kunden</li>
              </ul>

              <p className="mt-3 text-slate-700">
                Viele Unternehmen wachsen in den ersten Jahren stark, stoßen dann jedoch an
                unsichtbare Grenzen: fehlende Prozesse, kein zentrales{' '}
                <strong>CRM für KMU</strong>, unklare Verantwortlichkeiten. GLENO ist genau für
                diese Situation entwickelt worden – als{' '}
                <strong>Unternehmenssoftware für kleine und mittlere Unternehmen</strong>, die
                übersichtlich, bezahlbar und praxisnah ist.
              </p>
            </div>

            <div>
              <p className="text-slate-700">
                Ob als <strong>Rechnungsprogramm für KMU</strong>, als{' '}
                <strong>CRM für Dienstleister</strong> oder als{' '}
                <strong>zentrale Lösung für Digitalisierung im KMU</strong>: GLENO ersetzt
                gewachsene Excel-Landschaften, verstreute Tools und E-Mail-Chaos durch eine
                integrierte Plattform, in der alle wichtigen Informationen trocken, klar und
                zuverlässig abgelegt sind.
              </p>
              <p className="mt-3 text-slate-700">
                So entsteht ein digitales Fundament, auf dem Ihr Unternehmen die nächsten
                Wachstumsstufen erreichen kann – ohne, dass Strukturen und Abläufe auseinanderfallen.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
