// src/app/funktionen/auftragsmanagement/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

const primaryCtaHref = '/registrierung'
const secondaryCtaHref = '/demo-termin'

const reviews = [
  {
    quote:
      'Wir haben GLENO als Auftragsmanagement-Software eingeführt und nach zwei Wochen wollte keiner mehr zurück zu Excel.',
    name: 'Thomas R.',
    role: 'Inhaber Dienstleistungsbetrieb, 9 Mitarbeitende',
  },
  {
    quote:
      'Angebote, Aufträge, Zeiten, Rechnungen – alles in einem System. Für uns als Dienstleister ist das genau die Art Software, die wir gesucht haben.',
    name: 'Jessica M.',
    role: 'Geschäftsführerin Dienstleistungsunternehmen',
  },
  {
    quote:
      'Wir sehen sofort, welche Projekte offen sind, welche Rechnungen fällig sind und welche Kunden nachfassen müssen. Das spart uns jeden Monat viele Stunden.',
    name: 'Daniel K.',
    role: 'Projektleiter Handwerksbetrieb',
  },
  {
    quote:
      'Wir haben GLENO zuerst nur für Angebote und Rechnungen genutzt und dann Schritt für Schritt weitere Bereiche ergänzt. Heute laufen unsere Aufträge von der Anfrage bis zum Zahlungseingang durch ein System.',
    name: 'Martin S.',
    role: 'Geschäftsführer Dienstleistungsbetrieb',
  },
  {
    quote:
      'Für uns war wichtig, dass die Software verständlich ist und nicht nach Konzern-ERP aussieht. GLENO passt von der Oberfläche und vom Funktionsumfang genau zu einem mittelständischen Betrieb.',
    name: 'Katrin H.',
    role: 'Geschäftsführerin Handwerksbetrieb',
  },
  {
    quote:
      'Die Übersicht über offene Angebote, geplante Projekte und fällige Rechnungen hat unser wöchentliches Team-Meeting massiv vereinfacht.',
    name: 'Lars P.',
    role: 'Inhaber Serviceunternehmen',
  },
]

const featureCards = [
  {
    icon: ClipboardDocumentListIcon,
    title: 'Alle Aufträge im Blick',
    text: 'Vom Angebot bis zur Rechnung: Status, Verantwortliche, Fristen und Notizen in einer digitalen Auftragsakte.',
  },
  {
    icon: WrenchScrewdriverIcon,
    title: 'Gemacht für Dienstleister & Handwerk',
    text: 'Strukturierte Abläufe statt Konzern-ERP – ideal für dienstleistungs- und handwerksorientierte Betriebe.',
  },
  {
    icon: BanknotesIcon,
    title: 'Rechnungen ohne Medienbruch',
    text: 'Aus Projekten und Aufträgen werden mit wenigen Klicks saubere Rechnungen – offene Posten immer transparent.',
  },
]

const situations = [
  {
    title: 'Aufträge überall verteilt',
    before:
      'Aufträge liegen in E-Mails, Excel und Notizblöcken. Nichts ist wirklich aktuell, jeder hat seinen eigenen Stand.',
    after:
      'Alle Aufträge laufen in GLENO zusammen – mit einheitlichem Status, Verantwortlichen und Historie.',
  },
  {
    title: 'Tool-Chaos im Alltag',
    before:
      'Ein Tool für Projekte, eins für Rechnungen, eins für Zeiterfassung. Niemand hat den kompletten Überblick.',
    after:
      'GLENO bündelt Auftragsmanagement, Projekte, Zeiten und Rechnungen in einer Oberfläche.',
  },
  {
    title: 'Keine Klarheit bei offenen Posten',
    before:
      'Welche Angebote sind offen? Welche Rechnungen sind überfällig? Oft merken Sie es erst, wenn der Kunde sich meldet.',
    after:
      'Offene Angebote und fällige Rechnungen werden klar hervorgehoben – inklusive Zahlungsstatus und Wiedervorlagen.',
  },
]

const steps = [
  {
    title: 'Testzugang anlegen',
    text: 'In wenigen Minuten kostenlos registrieren – ohne Kreditkarte, ohne Risiko.',
  },
  {
    title: 'Aufträge & Kunden übernehmen',
    text: 'Kundendaten importieren oder direkt mit neuen Aufträgen starten – alleine oder mit Ihrem Team.',
  },
  {
    title: 'Strukturiert arbeiten',
    text: 'Aufträge, Projekte und Rechnungen laufen durchgängig in GLENO. Sie sehen sofort, was als Nächstes dran ist.',
  },
]

const screenshots = [
  {
    id: 'cloud',
    src: '/bilder/startseite/cloud_uebersicht.png',
    alt: 'GLENO – Cloud-Übersicht mit Kennzahlen und offenen Vorgängen',
    caption:
      'Cloud-Übersicht mit Kennzahlen und offenen Vorgängen – Ihr Cockpit für den Auftragsalltag.',
  },
  {
    id: 'calendar',
    src: '/bilder/startseite/terminkalender_uebersicht.png',
    alt: 'GLENO – Terminkalender und Einsatzplanung',
    caption:
      'Termin- & Einsatzplanung – ideal für Serviceeinsätze, Baustellen und Außendienst.',
  },
  {
    id: 'accounting',
    src: '/bilder/startseite/buchhaltung_uebersicht.png',
    alt: 'GLENO – Rechnungs- und Buchhaltungsübersicht',
    caption:
      'Rechnungs- & Buchhaltungsübersicht – offene Posten und Zahlungen im Blick, ohne Excel-Listen.',
  },
]

const heroImage = {
  id: 'hero',
  src: '/bilder/startseite/Uebersicht-Auftraege_Projekte.png',
  alt: 'GLENO Auftragsmanagement Software – Übersicht über Aufträge & Projekte',
}

const lightboxImages = [
  heroImage,
  ...screenshots.map((s) => ({ id: s.id, src: s.src, alt: s.alt })),
]

const useCases = [
  {
    title: 'Dienstleister & Servicebetriebe',
    text: 'Für Unternehmen, die regelmäßig Kundenaufträge, Serviceeinsätze und wiederkehrende Leistungen organisieren.',
    keywords: [
      'Software für Dienstleister',
      'Unternehmenssoftware Dienstleister',
      'Auftragsverwaltung für Dienstleister',
    ],
  },
  {
    title: 'Handwerksbetriebe mit Aufträgen & Projekten',
    text: 'Für Betriebe, die Angebote schreiben, Aufträge planen und Projekte abwickeln.',
    keywords: [
      'Auftragsmanagement Handwerk',
      'Handwerkersoftware Auftragsverwaltung',
      'Projektmanagement Software Handwerk',
    ],
  },
  {
    title: 'Projektorientierte Unternehmen mit Angeboten & Rechnungen',
    text: 'Für Unternehmen, die Projekte mit Angeboten, Budgets und Rechnungen steuern.',
    keywords: [
      'Software Angebote und Rechnungen',
      'Software Angebote Rechnungen Projekt',
      'Projektsoftware Dienstleister',
    ],
  },
]

const faqs = [
  {
    q: 'Für welche Unternehmen eignet sich GLENO als Auftragsmanagement?',
    a: 'GLENO richtet sich an Dienstleister, serviceorientierte Unternehmen und Handwerksbetriebe, die Aufträge, Projekte, Zeiten und Rechnungen in einer klaren Oberfläche bündeln möchten – ohne Konzern-ERP und ohne Tool-Wildwuchs.',
  },
  {
    q: 'Müssen wir alle bisherigen Tools sofort ersetzen?',
    a: 'Nein. In vielen Fällen starten Unternehmen mit 1–2 Bereichen, zum Beispiel Auftragsverwaltung und Rechnungen. Weitere Module wie Zeiterfassung oder Terminplanung können Schritt für Schritt ergänzt werden.',
  },
  {
    q: 'Wie schnell können wir mit GLENO produktiv arbeiten?',
    a: 'Die Basis ist in der Regel in unter 60 Minuten einsatzbereit. Danach bauen Sie Stammdaten, Aufträge und Projekte auf – auf Wunsch mit persönlicher Unterstützung beim Start.',
  },
  {
    q: 'Ist GLENO DSGVO-konform und in der EU gehostet?',
    a: 'Ja. GLENO wird auf Servern in der EU betrieben, nutzt verschlüsselte Verbindungen und ist für den Einsatz in B2B-Unternehmen mit DSGVO-Anforderungen ausgelegt.',
  },
]

export default function AuftragsmanagementLandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_360px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(1200px_360px_at_110%_120%,rgba(88,101,242,0.14),transparent_60%),#e8edf5] px-4 py-8 text-slate-800 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:gap-14">
        {/* HERO --------------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_22px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6 md:p-7 lg:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(900px_260px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_260px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-7 sm:gap-8">
  {/* Badge – mobile kompakt, Desktop ausführlich */}
<div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-900/10 bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-800 shadow-sm sm:text-[11px]">
  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />

  {/* Kurzfassung nur auf Handy */}
  <span className="sm:hidden">
    Auftragsmanagement · Dienstleister &amp; Handwerk
  </span>

  {/* Lange Variante ab Tablet */}
  <span className="hidden sm:inline">
    Auftragsmanagement Software für Dienstleister &amp; Handwerk
  </span>

  <span className="hidden text-slate-400 sm:inline">•</span>
  <span className="hidden text-slate-500 sm:inline">
    Auftragsverwaltung, Handwerkersoftware &amp; Projektsoftware für Dienstleister in einem System.
  </span>
</div>


                      {/* Headline + Text – kompakter & leichter lesbar */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem] md:text-[2.1rem] lg:text-[2.2rem] lg:leading-tight">
                Auftragsmanagement Software für Dienstleister &amp; Handwerk.
                <span className="mt-1 block text-base font-normal text-slate-700 sm:text-lg">
                  Auftragsverwaltung, Projektmanagement &amp; Rechnungen in einer Unternehmenssoftware –
                  statt Excel-Listen und Tool-Chaos.
                </span>
              </h1>

              <p className="max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                GLENO ist die schlanke <strong>Unternehmenssoftware für Dienstleister und Handwerksbetriebe </strong>
                mit Fokus auf <strong>Auftragsabwicklung</strong>, <strong>Projektmanagement</strong>,{' '}
                <strong>Zeiterfassung</strong> und <strong>Rechnungen</strong> – alles in einem System.
              </p>
            </div>

            {/* Keyword-Cluster – Karten statt langer Textblöcke */}
            <div className="grid gap-3 text-xs text-slate-800 sm:grid-cols-3 sm:text-[13px]">
              {/* Karte 1 */}
              <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/90 px-3.5 py-3 shadow-sm">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-slate-900">
                    Auftragsverwaltung Software
                  </p>
                  <p className="text-[12px] text-slate-600">
                    Angebote, Aufträge &amp; Auftragsabwicklung in Echtzeit.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    z. B. „Auftragsmanagement Software“, „Software für Auftragsmanagement“.
                  </p>
                </div>
              </div>

              {/* Karte 2 */}
              <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/90 px-3.5 py-3 shadow-sm">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-slate-900">
                    Handwerk- &amp; Dienstleister Software
                  </p>
                  <p className="text-[12px] text-slate-600">
                    Handwerkersoftware zur Auftragsverwaltung, Zeiterfassung &amp; Einsätzen.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    z. B. „Handwerkersoftware Auftragsverwaltung“, „Software für Dienstleister“.
                  </p>
                </div>
              </div>

              {/* Karte 3 */}
              <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/90 px-3.5 py-3 shadow-sm">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-slate-900">
                    Projektmanagement &amp; Rechnungen
                  </p>
                  <p className="text-[12px] text-slate-600">
                    Software für Angebote, Projekte &amp; Rechnungen in einem System.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    z. B. „Projektmanagement Software Handwerk“, „Software Angebote und Rechnungen“.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Häufige Suchbegriffe: „Auftragsverwaltung Software“, „Software Zeiterfassung Auftragsverwaltung“,
              „Unternehmenssoftware Dienstleister“.
            </p>


            {/* CTAs */}
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
              <Link
                href={primaryCtaHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.6)] transition hover:bg-black sm:w-auto"
              >
                Jetzt 7 Tage kostenlos testen
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryCtaHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-900/15 bg-white/80 px-4 py-2 text-xs font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white sm:w-auto sm:text-sm"
              >
                Live-Demo mit persönlicher Einführung
              </Link>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>Einrichtung in unter 60 Minuten möglich</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                <span>Server in der EU · DSGVO-konform</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1">
                <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                <span>Erprobt in Dienstleistungs- &amp; Handwerksbetrieben</span>
              </div>
            </div>

            {/* Hero-Screenshot (zoombar) */}
            <div>
              <div className="space-y-3 rounded-3xl border border-white/80 bg-white/95 p-3 shadow-[0_22px_80px_rgba(15,23,42,0.25)] sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs sm:max-w-md">
                    <p className="font-semibold text-slate-900">
                      Auftragsboard in GLENO
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Offene Angebote, laufende Projekte &amp; fällige Rechnungen auf einen Blick – in Echtzeit.
                    </p>
                  </div>
                  <div className="inline-flex flex-col items-end text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-100">
                      <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span>4,8 / 5,0</span>
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400">
                      Feedback aus Pilotbetrieben
                    </span>
                  </div>
                </div>

                <a
                  href="#preview-hero"
                  className="group block rounded-2xl border border-slate-200 bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  aria-label="Screenshot vergrößern"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    <Image
                      src={heroImage.src}
                      alt={heroImage.alt}
                      width={1200}
                      height={700}
                      className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
                      Klicken zum Vergrößern
                    </span>
                  </div>
                </a>

                <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-800">Auftragsmanagement</p>
                    <p>Von der Auftragsannahme bis zur Rechnung sauber dokumentiert.</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-800">Dienstleister &amp; Handwerk</p>
                    <p>Optimierte Abläufe für Betriebe mit Aufträgen, Projekten &amp; Einsätzen.</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-800">Angebote &amp; Rechnungen</p>
                    <p>Software für Angebote, Projekte und Rechnungen in einem System.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GEEIGNETE ANWENDUNGSBEREICHE ---------------------------------- */}
        <section className="space-y-5 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.16)] sm:p-6 md:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Geeignete Anwendungsbereiche &amp; typische Suchbegriffe.
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 sm:text-[15px]">
                GLENO wird vor allem als <strong>Auftragsmanagement Software</strong> und
                <strong> Handwerkersoftware</strong> eingesetzt. Wenn Sie nach diesen Begriffen gesucht haben,
                finden Sie sich hier in der Regel gut wieder.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-4 py-1.5 text-[10px] font-medium text-white shadow-md">
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span>Fokus: Aufträge, Projekte, Zeiterfassung &amp; Rechnungen</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <div
                key={u.title}
                className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-900">{u.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                  {u.text}
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                  {u.keywords.map((k) => (
                    <div
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WARUM GLENO --------------------------------------------------- */}
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Warum Betriebe von Excel &amp; Einzellösungen auf GLENO wechseln.
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-[15px]">
                Statt separater Tools für Auftragsverwaltung, Projektmanagement, Zeiterfassung
                und Rechnungen nutzen Sie eine klare Oberfläche – speziell für Dienstleister
                und Handwerksbetriebe.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/90 p-4 text-sm shadow-[0_10px_40px_rgba(15,23,42,0.12)]"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/5">
                  <card.icon className="h-5 w-5 text-slate-900" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SCREENSHOTS / GALERIE ---------------------------------------- */}
        <section id="screenshots" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Ein Blick in das Auftragsmanagement mit GLENO.
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-[15px]">
                Zentrale Übersicht für Aufträge, Termine, Zeiterfassung und Rechnungen – so
                sieht Ihr Alltag mit einer All-in-One Auftragsmanagement Software aus.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {screenshots.map((shot) => (
              <a
                key={shot.id}
                href={`#preview-${shot.id}`}
                className="group flex flex-col rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_8px_30px_rgba(15,23,42,0.1)] outline-none transition hover:shadow-[0_16px_45px_rgba(15,23,42,0.18)] focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Screenshot vergrößern"
              >
                <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-44 md:h-48">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={900}
                    height={540}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-slate-700/70">
                    Klicken zum Vergrößern
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {shot.caption}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* PAIN VS GLENO + REVIEWS --------------------------------------- */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/70 bg-white/95 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.12)] sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Von „Wir kommen gerade so hinterher“ zu „Wir haben alles im Griff“.
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-[15px]">
              Viele Dienstleister und Handwerksbetriebe wachsen schneller, als ihre
              Organisation mithalten kann. GLENO hilft, Strukturen zu schaffen, die im
              Alltag funktionieren – ohne Ihre Abläufe auf den Kopf zu stellen.
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {situations.map((situation) => (
                <div
                  key={situation.title}
                  className="rounded-xl border border-slate-100 bg-slate-50/90 px-3.5 py-3"
                >
                  <p className="text-[13px] font-semibold text-slate-900">
                    {situation.title}
                  </p>
                  <div className="mt-1 grid gap-2 text-[13px] md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Vor GLENO
                      </p>
                      <p className="mt-1 leading-relaxed text-slate-600">
                        {situation.before}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                        Mit GLENO
                      </p>
                      <p className="mt-1 leading-relaxed text-slate-700">
                        {situation.after}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-100">
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span>GLENO lässt sich Schritt für Schritt in Ihren Alltag integrieren.</span>
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-3 rounded-2xl border border-white/70 bg-white/95 p-5 text-sm shadow-[0_10px_40px_rgba(15,23,42,0.12)] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Erfahrungsberichte
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">
                  Was Betriebe über GLENO sagen.
                </h3>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div className="flex items-center justify-end gap-1">
                  <div className="flex">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <StarIcon key={i} className="h-3.5 w-3.5 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p>Rückmeldungen aus Beta-Phase &amp; Pilotkunden</p>
              </div>
            </div>

            <div className="mt-3 space-y-3 text-[13px] text-slate-700">
              {reviews.map((r) => (
                <figure
                  key={r.name}
                  className="rounded-xl bg-slate-50/95 px-3.5 py-3"
                >
                  <p className="leading-relaxed">„{r.quote}“</p>
                  <figcaption className="mt-1 text-[11px] text-slate-500">
                    {r.name} · {r.role}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* WIE SIE STARTEN ----------------------------------------------- */}
        <section className="rounded-2xl border border-white/70 bg-white/98 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.12)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:max-w-xl">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                In wenigen Schritten von der Suche zur passenden Lösung.
              </h2>
              <p className="mt-1 text-sm text-slate-600 sm:text-[15px]">
                Sie sind über Suchbegriffe wie „Auftragsmanagement Software“, „Handwerkersoftware
                Auftragsverwaltung“ oder „Software Angebote und Rechnungen“ hier gelandet.
                So geht es jetzt weiter:
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-[11px] font-medium text-white shadow-md">
              <ShieldCheckIcon className="h-4 w-4" />
              <span>Keine Mindestlaufzeit · transparente Konditionen</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map((s, idx) => (
              <div
                key={s.title}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/95 px-3.5 py-3.5 text-sm"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-[12px] font-semibold text-slate-900">
                  {idx + 1}
                </span>
                <p className="text-[13px] font-semibold text-slate-900">
                  {s.title}
                </p>
                <p className="text-[13px] text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-[12px] text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                Testphase endet automatisch – kein Risiko.
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                Persönliche Unterstützung beim Start möglich.
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.6)] transition hover:bg-black"
              >
                Jetzt Testzugang anlegen
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-900/15 bg-white/95 px-4 py-2 text-xs font-medium text-slate-900 shadow-sm hover:bg-white sm:text-sm"
              >
                Beratungs-Call vereinbaren
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ----------------------------------------------------------- */}
        <section className="rounded-2xl border border-white/70 bg-white/98 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.12)] sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            Häufige Fragen zur Auftragsmanagement Software GLENO.
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Die wichtigsten Punkte rund um Eignung, Einführung und Datenschutz – kurz beantwortet.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100/70 backdrop-blur-sm transition hover:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      ?
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.q}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 transition-transform group-open:rotate-90">
                    ▸
                  </span>
                </summary>
                <p className="mt-2 pl-9 pr-1 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* LIGHTBOX-OVERLAYS ---------------------------------------------- */}
      {lightboxImages.map((img) => (
        <div
          key={img.id}
          id={`preview-${img.id}`}
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
                src={img.src}
                alt={`${img.alt} (vergrößert)`}
                width={1600}
                height={1000}
                className="h-auto w-full rounded-2xl object-contain"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Lightbox-Styles */}
      <style>{`
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
    </div>
  )
}
