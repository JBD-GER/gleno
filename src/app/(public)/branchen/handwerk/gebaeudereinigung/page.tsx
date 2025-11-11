// src/app/(public)/gebaeudereinigung/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'Software Gebäudereinigung – GLENO: Angebote, Objekte, Verträge, Rechnungen & CRM',
  description:
    'GLENO ist die spezialisierte Software für Gebäudereinigung: Angebote, Objekte, Verträge, wiederkehrende Rechnungen, Zeiterfassung, Qualitätsdokumentation, CRM & integrierter Marktplatz für neue Aufträge.',
  keywords: [
    'software gebäudereinigung',
    'branchenlösung gebäudereinigung',
    'reinigungssoftware',
    'gebäudereinigung cloud software',
    'crm gebäudereinigung',
    'erp gebäudereinigung',
  ],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/gebaeudereinigung`,
    siteName: SITE_NAME,
    title:
      'Software Gebäudereinigung – GLENO: Angebote, Objekte, Verträge, Rechnungen & CRM',
    description:
      'Reinigungssoftware für moderne Gebäudereinigung: GLENO bündelt Angebote, Objekte, Verträge, Rechnungen, Zeiterfassung, Qualitätsmanagement & Leads in einer Oberfläche.',
    images: [
      {
        url: `${SITE_URL}/og/og-gebaeudereinigung.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – Software für Gebäudereinigung',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Software Gebäudereinigung – GLENO: Angebote, Objekte, Verträge, Rechnungen & CRM',
    description:
      'GLENO vereint Angebotssoftware, Rechnungsprogramm, CRM, Zeiterfassung & Marktplatz speziell für Gebäudereinigung.',
    images: [`${SITE_URL}/og/og-gebaeudereinigung.jpg`],
  },
  robots: { index: true, follow: true },
}

/* -------------------------------------------------------------------------- */
/* Shot Component: Thumbnail + Preview via :target                            */
/* -------------------------------------------------------------------------- */

type ShotProps = {
  id: string
  src: string
  alt: string
  caption: string
}

function Shot({ id, src, alt, caption }: ShotProps) {
  return (
    <>
      {/* Thumbnail */}
      <a
        href={`#${id}`}
        className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-sm"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-slate-900/0 transition-colors duration-200 group-hover:bg-slate-900/8" />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[8px] font-medium text-slate-100">
          {caption}
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[8px] text-slate-700 shadow-sm">
          Zum Vergrößern klicken
        </div>
      </a>

      {/* Preview Modal via :target */}
      <div
        id={id}
        className="shot-modal fixed inset-0 z-[90] flex items-center justify-center"
      >
        {/* Klick auf Overlay schließt */}
        <a
          href="#screens"
          aria-label="Vorschau schließen"
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal-Content */}
        <div className="relative z-[91] mx-3 max-h-[92vh] w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-950/95 p-3 sm:p-4 shadow-2xl">
          {/* Close-Button oben rechts */}
          <a
            href="#screens"
            aria-label="Vorschau schließen"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/95 text-[16px] text-white shadow-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 z-[92]"
          >
            ×
          </a>

          {/* Bild */}
          <div className="relative mt-4 h-[60vh] w-full overflow-hidden rounded-2xl bg-slate-900">
            <Image src={src} alt={alt} fill className="object-contain" />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
            <span>{caption}</span>
            <span className="text-slate-500">
              Zum Schließen außerhalb klicken oder „×“ nutzen.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Page: GLENO für Gebäudereinigung                                           */
/* -------------------------------------------------------------------------- */

export default function GebaeudereinigungPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-slate-50">
        {/* Background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent), radial-gradient(circle at top right, rgba(15,23,42,1), #020817)',
          }}
        />
        <div className="pointer-events-none absolute -bottom-24 right-[-40px] h-72 w-72 rounded-full bg-sky-500/8 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-16 pb-14 lg:flex-row lg:items-center lg:gap-14 lg:pt-20">
          {/* LEFT */}
          <div className="max-w-3xl">
            {/* Keyword-Bar */}
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-sky-500/25 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Software Gebäudereinigung</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline">Reinigungssoftware Cloud</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline">CRM &amp; ERP Gebäudereinigung</span>
            </div>

            {/* Headline */}
            <h1 className="font-semibold tracking-tight text-white">
              <span className="block text-[11px] sm:text-[12px] lg:text-[13px] text-sky-300 mb-1">
                Weniger Zettel. Mehr saubere Aufträge.
              </span>
              <span className="block text-[26px] leading-tight sm:text-4xl lg:text-[40px]">
                Software für Gebäudereinigung &amp; Reinigungsfirmen.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
              GLENO ist die spezialisierte{' '}
              <strong>Software für Gebäudereinigung</strong>: Angebote,
              Objekt- &amp; Vertragsverwaltung, <strong>Rechnungen</strong> und
              wiederkehrende Abrechnung, <strong>CRM</strong>,
              <strong> Zeiterfassung</strong> und nachvollziehbare
              Qualitätsdokumentation – alles in einer Oberfläche statt fünf
              Baustellen.
            </p>

            {/* KI + Marktplatz */}
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sky-300">
              Neu: <strong>KI-Angebotsassistent</strong> für
              Gebäudereinigungsbetriebe – Flächen, Intervalle &amp; Pakete
              eingeben, in Sekunden ein strukturiertes Angebot erhalten.
              <br />
              Zusätzlich: In GLENO integrierter{' '}
              <strong>Marktplatz für Gebäudereinigung</strong>, über den du
              langfristig ausgewählte Anfragen direkt ins System bekommst.
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/registrieren"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_70px_rgba(15,23,42,0.98)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_90px_rgba(15,23,42,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                style={{ backgroundColor: PRIMARY }}
              >
                Jetzt kostenlos testen
                <span className="ml-1.5 text-xs">↗</span>
              </Link>
              <Link
                href="#funktionen"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-500/70 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-slate-900 hover:border-slate-200"
              >
                Funktionen ansehen
              </Link>
              <Link
                href="#markt"
                className="inline-flex items-center justify-center rounded-2xl border border-sky-400/40 bg-slate-900/40 px-4 py-2.5 text-[11px] font-semibold text-sky-200 backdrop-blur hover:bg-slate-900/70 hover:border-sky-300/70"
              >
                Integrierten Marktplatz entdecken
              </Link>
            </div>

            {/* Trust */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Für Unterhalts-, Glas-, Büro-, Hotel- &amp; Sonderreinigung
              </span>
              <span>DSGVO-konform &amp; Hosting in der EU</span>
              <span>Keine Einrichtungsgebühr</span>
              <span>Monatlich kündbar</span>
            </div>
          </div>

          {/* RIGHT – 7-Tage Klarheit */}
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700/70 bg-slate-900/90 p-4 text-[9px] shadow-[0_26px_90px_rgba(0,0,0,0.98)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-100">
                  Heute noch Excel, Mappen &amp; Chat-Wildwuchs?
                </span>
                <span className="text-[8px] text-slate-500">
                  Unklare Verträge • doppelte Arbeit
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-900/40">
                <div className="h-1.5 w-2/3 rounded-full bg-rose-500" />
              </div>

              <div className="mt-2 flex items-center justify-between text-slate-300">
                <span className="font-semibold text-sky-300">
                  Mit GLENO in 7 Tagen:
                </span>
                <span className="text-[8px] text-sky-300">
                  Klare Objekte • Saubere Abrechnung
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-900/40">
                <div className="h-1.5 w-full rounded-full bg-sky-400" />
              </div>

              <p className="mt-2 text-[9px] text-slate-400">
                Angebote, Verträge, Objekte, Leistungen, Zeiten und Rechnungen
                greifen ineinander. Du siehst auf einen Blick, was vereinbart
                ist, was geleistet wurde und was schon abgerechnet ist.
              </p>
              <div className="mt-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-[8px] text-slate-300">
                „Wir hatten vorher keinen Überblick, welche Objekte wirklich
                profitabel sind. Mit GLENO sehen wir das sofort.“ – Genau diesen
                Effekt zielen wir für Gebäudereinigungsbetriebe an.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERKENNUNG */}
      <section id="warum" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Wenn du dich hier wiederfindest, ist GLENO für deine Gebäudereinigung gebaut.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Für Inhaber, die wachsen wollen, ohne in Verwaltung zu ertrinken.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Wir haben zu viele Medienbrüche.“
              </h3>
              <p className="mt-1 text-slate-600">
                Excel, Word, Papier, Messenger &amp; separate Tools – niemand
                hat die Gesamtübersicht.
              </p>
              <p className="mt-2 text-sky-800 font-semibold">
                GLENO: Eine Plattform für Objekte, Leistungen, Verträge &amp;
                Rechnungen.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Rechnungen &amp; Vereinbarungen sind fehleranfällig.“
              </h3>
              <p className="mt-1 text-slate-600">
                Manuelle Abschriften, alte Vorlagen, kein klares Controlling.
              </p>
              <p className="mt-2 text-sky-800 font-semibold">
                GLENO: Leistungen &amp; Preise hinterlegt, korrekte
                wiederkehrende Rechnungen.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Wir wollen professioneller auftreten &amp; bessere Aufträge.“
              </h3>
              <p className="mt-1 text-slate-600">
                Auftraggeber erwarten digitale Transparenz statt Zettelwirtschaft.
              </p>
              <p className="mt-2 text-sky-800 font-semibold">
                GLENO: Moderne Dokumente, klare Reports &amp; Zugang zum Marktplatz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FUNKTIONEN */}
      <section id="funktionen" className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Was GLENO deiner Gebäudereinigung wirklich bringt.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Fokus: wiederkehrende Verträge, klare Leistungen, sichere Abrechnung,
            weniger Diskussionen mit Auftraggebern.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            {/* Rechnungen */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Rechnungsprogramm Gebäudereinigung
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Angebote &amp; Rahmenvereinbarungen digital abbilden</li>
                <li>✔ Wiederkehrende Rechnungen aus Verträgen erzeugen</li>
                <li>✔ Offene Posten &amp; Zahlstatus im Blick</li>
              </ul>
            </div>

            {/* Objekte & Verträge */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Objekte &amp; Verträge im Griff
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Für jedes Objekt: Adresse, Kontakt, Leistungen, Intervalle</li>
                <li>✔ Vertragsunterlagen &amp; Nachträge sauber abgelegt</li>
                <li>✔ Klar erkennbar: Was ist vereinbart &amp; berechnet?</li>
              </ul>
            </div>

            {/* CRM */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                CRM für Gebäudereinigung
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Alle Kunden &amp; Ansprechpartner an einem Ort</li>
                <li>✔ Historie von Angeboten, Reklamationen &amp; Terminen</li>
                <li>✔ Weniger Rückfragen im Team</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            {/* Zeiterfassung & Nachweise */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Zeiterfassung &amp; Leistungsnachweise
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Zeiten pro Objekt &amp; Auftrag dokumentieren</li>
                <li>✔ Nachweise für Auftraggeber schnell vorlegbar</li>
                <li>✔ Basis für Lohn &amp; Kalkulation</li>
              </ul>
            </div>

            {/* Qualität & Reklamationen */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Qualität &amp; Reklamationen steuern
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Reklamationen direkt am Objekt erfassen</li>
                <li>✔ Fotos, Notizen &amp; Maßnahmen dokumentieren</li>
                <li>✔ Zeigen, dass du Qualität ernst nimmst</li>
              </ul>
            </div>

            {/* Einfache Einführung */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Einfach eingeführt, einfach genutzt
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Klarer Aufbau statt überladenem ERP</li>
                <li>✔ Läuft im Browser – Büro &amp; mobil</li>
                <li>✔ Schnell startklar ohne IT-Projekt</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MARKTPLATZ – SMART & GLASS */}
      <section
        id="markt"
        className="px-5 py-14 bg-slate-950 text-slate-50"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-sky-500/15 bg-slate-900/60 px-6 py-6 shadow-[0_26px_80px_rgba(2,6,23,0.9)] backdrop-blur-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-sky-300 border border-sky-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  GLENO Marktplatz für Gebäudereinigung
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Nicht nur Software. Ein eigener Kanal für passende Anfragen.
                </h2>
                <p className="text-[13px] sm:text-[14px] text-slate-200/90">
                  Wir bauen parallel einen Marktplatz ausschließlich für
                  Gebäudereinigung auf. Auftraggeber stellen ihre Anfrage ein,
                  du siehst passende Anfragen direkt in GLENO – ohne fachfremde
                  Jobs.
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-slate-200/90">
                  <li>✔ Fokus auf professionelle Reinigungsleistungen</li>
                  <li>✔ Anfragen laufen direkt in dein GLENO-CRM</li>
                  <li>✔ Langfristig als faire, transparente Lead-Quelle geplant</li>
                </ul>
                <p className="text-[10px] text-slate-400/90">
                  Unser Ziel: Weg von anonymen Massenportalen – hin zu einem
                  spezialisierten Kanal, der für beide Seiten funktioniert.
                </p>
              </div>

              {/* Mini-UI Preview (ohne Bild) */}
              <div className="mt-5 md:mt-0 w-full md:w-64">
                <div className="relative rounded-2xl border border-sky-500/20 bg-slate-950/80 px-3 py-3 text-[9px] text-slate-200/90 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-[8px] text-sky-300">
                      Vorschau: Anfragen in GLENO
                    </span>
                    <span className="text-[8px] text-slate-500">
                      nur Gebäudereinigung
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-900/90 px-2 py-1.5 border border-slate-800/80">
                      <div>
                        <div className="text-[8px] text-slate-400">
                          Neue Anfrage
                        </div>
                        <div className="text-[9px] text-slate-50">
                          Büroreinigung · 3 Etagen
                        </div>
                      </div>
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[8px] text-sky-300">
                        passend
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-900/70 px-2 py-1.5 border border-slate-800/60">
                      <div>
                        <div className="text-[8px] text-slate-400">
                          Neue Anfrage
                        </div>
                        <div className="text-[9px] text-slate-50">
                          Glasreinigung · Schaufenster
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] text-emerald-300">
                        geprüft
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-2 py-1.5 border border-slate-800/40">
                      <div>
                        <div className="text-[8px] text-slate-400">
                          Pipeline
                        </div>
                        <div className="text-[9px] text-slate-200">
                          Praxisreinigung · Angebot gesendet
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[8px] text-slate-300">
                        im System
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Link
                      href="/registrieren"
                      className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-3 py-1 text-[8px] font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Platz auf dem Marktplatz sichern ↗
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="stimmen" className="bg-slate-950 px-5 py-14 text-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Wie GLENO wirken soll – Stimmen aus der Gebäudereinigung.
            </h2>
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[10px] text-slate-300">
              Hinweis: Beispielstimmen aus der Betaphase.
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 text-[12px]">
            <div className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.9)] backdrop-blur-xl">
              <div>
                <div className="mb-1 text-[11px] text-amber-400">★★★★★</div>
                <p className="text-slate-100">
                  „Alle Verträge &amp; Objekte sind sauber hinterlegt. Die
                  Monatsrechnungen gehen jetzt ohne Stress raus.“
                </p>
              </div>
              <div className="mt-3 text-[10px] text-slate-400">
                <div className="font-semibold text-slate-200">
                  Unterhaltsreinigung · 40+ Objekte
                </div>
                <div>Wiederkehrende Abrechnung im System</div>
              </div>
            </div>

            <div className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.9)] backdrop-blur-xl">
              <div>
                <div className="mb-1 text-[11px] text-amber-400">★★★★★</div>
                <p className="text-slate-100">
                  „Wir wirken gegenüber Kunden deutlich professioneller. Und
                  intern weiß jeder, was vereinbart wurde.“
                </p>
              </div>
              <div className="mt-3 text-[10px] text-slate-400">
                <div className="font-semibold text-slate-200">
                  Glas- &amp; Sonderreinigung
                </div>
                <div>Digitale Angebote &amp; Nachweise</div>
              </div>
            </div>

            <div className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.9)] backdrop-blur-xl">
              <div>
                <div className="mb-1 text-[11px] text-amber-400">★★★★★</div>
                <p className="text-slate-100">
                  „Früher haben wir Leistung verschenkt. Heute sehen wir genau,
                  welche Objekte profitabel sind.“
                </p>
              </div>
              <div className="mt-3 text-[10px] text-slate-400">
                <div className="font-semibold text-slate-200">
                  Büro- &amp; Praxisreinigung
                </div>
                <div>Mehr Transparenz, bessere Marge</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPRESSIONS – mit Preview */}
      <section id="screens" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Ein Blick in GLENO.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Klick auf einen Screenshot, um ihn groß zu sehen. So übersichtlich
            kann deine Reinigungssoftware sein.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Shot
              id="shot-dashboard"
              src="/app-dashboard-gesamtueberblick.png"
              alt="GLENO Dashboard – Übersicht für Gebäudereinigung"
              caption="Alle Objekte, Kunden & offene Vorgänge im Blick"
            />
            <Shot
              id="shot-angebote-ki"
              src="/app-angebote-ki-assistent.png"
              alt="GLENO – Angebote mit KI-Assistent für Gebäudereinigung"
              caption="Standardisierte Angebote in Minuten statt Stunden"
            />
            <Shot
              id="shot-rechnungen"
              src="/app-rechnungen-offene-posten.png"
              alt="GLENO – Rechnungen & offene Posten"
              caption="Wiederkehrende Rechnungen & offene Posten sauber im System"
            />
            <Shot
              id="shot-kundenakte"
              src="/app-kundenakte-projektverlauf.png"
              alt="GLENO – Kundenakte & Objektübersicht"
              caption="Verträge, Dokumente & Historie je Objekt und Kunde"
            />
            <Shot
              id="shot-zeiten"
              src="/app-zeiterfassung-einsaetze.png"
              alt="GLENO – Zeiterfassung & Leistungsnachweise"
              caption="Zeiten & Leistungen nachvollziehbar dokumentieren"
            />
            <Shot
              id="shot-anfragen"
              src="/app-anfragen-uebersicht.png"
              alt="GLENO – Anfragen & Marktplatz-Integration"
              caption="Anfragen & Leads direkt in GLENO sehen und bearbeiten"
            />
          </div>
        </div>
      </section>

      {/* FÜR WELCHE BETRIEBE + SEO-Text */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Für welche Gebäudereinigungsbetriebe GLENO sich besonders lohnt.
          </h2>

          <div className="mt-5 grid grid-cols-1 items-start gap-6 text-[13px] md:grid-cols-2">
            {/* Linke Spalte */}
            <div>
              <ul className="space-y-1.5 text-slate-700">
                <li>✔ Unterhaltsreinigung von Büros &amp; Praxen</li>
                <li>✔ Glas- &amp; Fassadenreinigung</li>
                <li>✔ Hotel-, Gastro- &amp; Objektreinigung</li>
                <li>✔ Treppenhausreinigung &amp; Wohnungswirtschaft</li>
                <li>✔ Bauend- &amp; Sonderreinigung</li>
                <li>✔ Spezialisierte Premium- &amp; Facility-Services</li>
              </ul>

              <p className="mt-3 text-slate-600">
                GLENO ist als{' '}
                <strong>Reinigungssoftware für Gebäudereinigung</strong> und
                <strong> Branchenlösung für Gebäudereinigungsbetriebe</strong>{' '}
                entwickelt. Besonders bei vielen Objekten, wiederkehrenden
                Leistungen und anspruchsvollen Auftraggebern sorgt GLENO für
                klare Struktur, sichere Abrechnung und einen professionellen
                Auftritt.
              </p>
            </div>

            {/* Rechte Spalte */}
            <div className="mt-6 flex justify-center md:mt-0 md:justify-end">
              <div
                className="
                  relative
                  h-64 w-full max-w-md
                  sm:h-72
                  md:h-64 md:max-w-none
                  lg:h-80 lg:w-80
                  rounded-3xl overflow-hidden
                  border border-slate-200 bg-white shadow-sm
                "
              >
                <Image
                  src="/gebaeudereinigung_portrait.jpg"
                  alt="Team einer Gebäudereinigung mit GLENO im Einsatz"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEISPIEL-WEBSITE CALL-TO-ACTION */}
      <section id="beispiel" className="bg-slate-950 px-5 py-12 text-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_26px_80px_rgba(2,6,23,0.9)] backdrop-blur-2xl md:flex-row md:items-center">
            {/* Text links */}
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Zeig Auftraggebern schon online, wie professionell du arbeitest.
              </h2>
              <p className="mt-2 text-sm sm:text-[15px] text-slate-200">
                Mit GLENO kannst du eine moderne Web-Präsenz aufbauen, die
                direkt mit deinem CRM &amp; deinen Angeboten zusammenspielt. Kein
                Baukasten-Look, sondern ein klarer, vertrauenswürdiger Auftritt.
              </p>
              <div className="mt-4">
                <Link
                  href="https://www.gleno.de/w/beispiel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/95 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-white"
                >
                  Beispiel-Webseite im neuen Tab öffnen
                  <span className="ml-1.5 text-xs">↗</span>
                </Link>
              </div>
            </div>

            {/* Preview rechts */}
            <div className="w-full md:flex-1 md:max-w-xs lg:max-w-sm md:ml-4">
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/95">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-sky-500/35 blur-3xl" />
                  <div className="absolute right-0 bottom-0 h-20 w-20 rounded-full bg-emerald-400/18 blur-3xl" />
                </div>
                <div className="relative flex items-center justify-between px-4 pt-3 text-[9px]">
                  <span className="rounded-full bg-slate-950/95 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-sky-300">
                    Live-Demo
                  </span>
                  <span className="text-[8px] text-slate-400">
                    Beispielauftritt mit GLENO
                  </span>
                </div>
                <div className="relative mx-3 mb-3 mt-1 h-[70%] overflow-hidden rounded-xl bg-slate-950">
                  <Image
                    src="/beispiel_website.png"
                    alt="GLENO Beispiel-Webseite"
                    fill
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950/25 via-transparent to-sky-500/8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Only for modal behaviour */}
      <style>
        {`
          .shot-modal {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease-out;
          }
          .shot-modal:target {
            opacity: 1;
            pointer-events: auto;
          }
        `}
      </style>
    </>
  )
}
