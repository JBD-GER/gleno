// src/app/(public)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.io'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'Rechnungsprogramm Handwerk – GLENO: Angebote, Rechnungen, CRM & Zeiterfassung',
  description:
    'GLENO ist die moderne Handwerkersoftware für Angebote, Rechnungen, CRM, Zeiterfassung und Kundenanfragen. Ideal für PV-, SHK-, Elektro-, Ausbau- und Servicebetriebe.',
  keywords: [
    'rechnungsprogramm handwerk',
    'handwerkersoftware angebot rechnung',
    'handwerker software rechnung',
    'handwerker crm software',
    'handwerkersoftware',
    'zeiterfassung handwerk',
  ],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title:
      'Rechnungsprogramm Handwerk – GLENO: Angebote, Rechnungen, CRM & Zeiterfassung',
    description:
      'All-in-One Handwerkersoftware: Angebote mit KI, Rechnungen, CRM, Zeiterfassung & Anfragen in einer Oberfläche.',
    images: [
      {
        url: `${SITE_URL}/og/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – Handwerkersoftware mit Rechnungsprogramm & CRM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Rechnungsprogramm Handwerk – GLENO: Angebote, Rechnungen, CRM & Zeiterfassung',
    description:
      'GLENO vereint Rechnungsprogramm, Angebotssoftware, CRM, Zeiterfassung & Anfragen für moderne Handwerksbetriebe.',
    images: [`${SITE_URL}/og/og-home.jpg`],
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
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
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
              <span>Für moderne Handwerksbetriebe</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline">
                Rechnungsprogramm Handwerk
              </span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline">
                Handwerkersoftware Angebot &amp; Rechnung
              </span>
              <span className="hidden lg:inline text-slate-400">•</span>
              <span className="hidden lg:inline">
                Handwerker CRM Software &amp; Zeiterfassung
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[40px] text-white">
              Weniger Chaos. Mehr Aufträge.
              <span className="block text-white">
                Eine Software für deinen Betrieb.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
              GLENO ist die Handwerkersoftware für Betriebe, die jeden Tag auf
              Baustellen liefern und im Büro nichts mehr liegen lassen wollen:
              <strong> Angebote</strong>, <strong>Rechnungen</strong>,{' '}
              <strong>CRM</strong>, <strong>Zeiterfassung</strong> und auf Wunsch
              qualifizierte Anfragen – in einer klaren Oberfläche.
            </p>

            {/* KI-Angebote Highlight */}
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sky-300">
              Neu: <strong>KI-Angebotsassistent</strong> – du gibst kurz Projekt,
              Umfang &amp; Preise an, GLENO erstellt in wenigen Sekunden ein
              vollständiges, strukturiertes Angebot im Layout deines Betriebs.
              Kein Copy &amp; Paste, keine vergessenen Positionen.
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
            </div>

            {/* Trust */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Für Handwerk, PV, SHK, Elektro, Ausbau &amp; Service
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
                  Heute noch Zettel &amp; Excel?
                </span>
                <span className="text-[8px] text-slate-500">
                  Unklare Projekte • Offene Beträge
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-900/40">
                <div className="h-1.5 w-2/3 rounded-full bg-rose-500" />
              </div>

              <div className="mt-2 flex items-center justify-between text-slate-300">
                <span className="font-semibold text-emerald-300">
                  Mit GLENO in 7 Tagen:
                </span>
                <span className="text-[8px] text-emerald-300">
                  Klarer Überblick • Saubere Abläufe
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-900/30">
                <div className="h-1.5 w-full rounded-full bg-emerald-400" />
              </div>

              <p className="mt-2 text-[9px] text-slate-400">
                Ein System für Angebote, Rechnungen, Zeiten &amp; Kunden. Du
                siehst, was offen ist, was läuft und was verdient – ohne suchen zu
                müssen.
              </p>
              <div className="mt-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-[8px] text-slate-300">
                „Endlich ein System, bei dem ich nicht überlegen muss, wo was
                liegt. Ich sehe auf einen Blick, was noch zu tun ist und wo Geld
                feststeckt.“ – Genau so soll sich GLENO für deinen Betrieb
                anfühlen.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERKENNUNG */}
      <section id="warum" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Wenn du dich hier wiederfindest, ist GLENO für dich gebaut.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Für Betriebe, die tagsüber auf Baustellen stehen und abends im Büro
            nicht untergehen wollen – nicht für Konzern-Software-Zirkus.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Wir verlieren Überblick.“
              </h3>
              <p className="mt-1 text-slate-600">
                Angebote, Rechnungen, Notizen und Fotos liegen verteilt. Am Ende
                bleibt Geld liegen.
              </p>
              <p className="mt-2 text-emerald-700 font-semibold">
                GLENO: Zentrales Rechnungsprogramm fürs Handwerk – alles verknüpft.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Ich mache Angebote nachts.“
              </h3>
              <p className="mt-1 text-slate-600">
                Du tippst Positionen neu, suchst alte Kalkulationen, kopierst
                Texte.
              </p>
              <p className="mt-2 text-emerald-700 font-semibold">
                GLENO: KI baut dir komplette Angebote in Sekunden.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                „Ich will professioneller wirken.“
              </h3>
              <p className="mt-1 text-slate-600">
                Klare Unterlagen, schnelle Reaktion, saubere Abwicklung – das
                entscheidet über gute Aufträge.
              </p>
              <p className="mt-2 text-emerald-700 font-semibold">
                GLENO: Einheitliche Dokumente &amp; Prozesse, die wie „großer
                Betrieb“ wirken.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FUNKTIONEN */}
      <section id="funktionen" className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Was GLENO dir im Alltag wirklich abnimmt.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Alles an einem Ort, damit du weniger suchst, weniger doppelt machst
            und schneller zu deinem Geld kommst.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Rechnungsprogramm Handwerk
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Angebote, Abschläge, Teil- &amp; Schlussrechnungen</li>
                <li>✔ Eigene Nummernkreise, Steuer &amp; Layout</li>
                <li>✔ Offene Posten &amp; Zahlungseingänge im Blick</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                KI-Angebote &amp; Angebotsworkflow
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ KI schlägt dir komplette Angebote vor</li>
                <li>✔ Leistungen &amp; Preise aus deiner Bibliothek</li>
                <li>✔ Ein Klick: Angebot → Auftrag → Rechnung</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Handwerker CRM Software
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Kunden &amp; Objekte sauber angelegt</li>
                <li>✔ Dokumente, Fotos &amp; Notizen am Projekt</li>
                <li>✔ Klarer Verlauf statt „Wer hatte was gesagt?“</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Zeiterfassung &amp; Einsätze
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Zeiten pro Projekt &amp; Mitarbeiter erfassen</li>
                <li>✔ Besser kalkulieren, Nachträge belegen</li>
                <li>✔ Keine Zettelzeiten mehr, die verschwinden</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Anfragen &amp; Kanäle bündeln
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ Website-Formulare direkt im CRM</li>
                <li>✔ Telefon / Mail / Empfehlung sauber erfasst</li>
                <li>✔ Optional: GLENO-Marktplatz-Anfragen</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Einfach eingeführt, einfach genutzt
              </h3>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>✔ In wenigen Minuten startklar</li>
                <li>✔ Kein IT-Blabla, klare Masken</li>
                <li>✔ Läuft im Browser – Büro &amp; mobil</li>
              </ul>
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
            Klick auf einen Screenshot, um ihn groß zu sehen. So klar soll sich
            deine Software anfühlen.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Shot
              id="shot-dashboard"
              src="/app-dashboard-gesamtueberblick.png"
              alt="GLENO Dashboard – Gesamtüberblick"
              caption="Dashboard mit allen wichtigen Kennzahlen & offenen Vorgängen"
            />
            <Shot
              id="shot-angebote-ki"
              src="/app-angebote-ki-assistent.png"
              alt="GLENO – Angebote mit KI-Assistent"
              caption="Angebote in Sekunden mit KI-Unterstützung erstellen"
            />
            <Shot
              id="shot-rechnungen"
              src="/app-rechnungen-offene-posten.png"
              alt="GLENO – Rechnungen & offene Posten"
              caption="Rechnungen & offene Posten immer im Blick"
            />
            <Shot
              id="shot-kundenakte"
              src="/app-kundenakte-projektverlauf.png"
              alt="GLENO – Kundenakte & Projektverlauf"
              caption="Komplette Kundenakte mit Projektverlauf & Dokumenten"
            />
            <Shot
              id="shot-zeiten"
              src="/app-zeiterfassung-einsaetze.png"
              alt="GLENO – Zeiterfassung & Einsätze"
              caption="Zeiterfassung und Einsätze direkt am Projekt"
            />
            <Shot
              id="shot-anfragen"
              src="/app-anfragen-uebersicht.png"
              alt="GLENO – Anfragenübersicht"
              caption="Anfragen aus allen Kanälen zentral gesammelt"
            />
          </div>
        </div>
      </section>

      {/* BEISPIEL-WEBSITE CALL-TO-ACTION */}
      <section
        id="beispiel"
        className="bg-slate-950 px-5 py-12 text-slate-50"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_26px_80px_rgba(2,6,23,0.9)] backdrop-blur-2xl md:flex-row md:items-center">
            {/* Text links */}
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Schau dir eine fertige GLENO-Webseite in Aktion an.
              </h2>
              <p className="mt-2 text-sm sm:text-[15px] text-slate-200">
                Auf unserer Beispielseite siehst du, wie dein Betrieb mit GLENO
                als Website- &amp; Anfrage-Lösung auftreten kann – modern,
                klar strukturiert und direkt mit deinem CRM verbunden.
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

            {/* Preview rechts – etwas schmaler */}
            <div className="w-full md:flex-1 md:max-w-xs lg:max-w-sm md:ml-4">
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/95">
                {/* Overlay-Glow */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-sky-500/35 blur-3xl" />
                  <div className="absolute right-0 bottom-0 h-20 w-20 rounded-full bg-emerald-400/18 blur-3xl" />
                </div>

                {/* Label-Zeile */}
                <div className="relative flex items-center justify-between px-4 pt-3 text-[9px]">
                  <span className="rounded-full bg-slate-950/95 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-sky-300">
                    Live-Demo
                  </span>
                  <span className="text-[8px] text-slate-400">
                    Beispielauftritt mit GLENO
                  </span>
                </div>

                {/* Bild */}
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



      {/* FÜR WELCHE BETRIEBE + SEO-Text */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Für welche Betriebe GLENO sich besonders lohnt.
          </h2>

          <div className="mt-5 grid grid-cols-1 items-start gap-6 text-[13px] md:grid-cols-2">
            {/* Linke Spalte */}
            <div>
              <ul className="space-y-1.5 text-slate-700">
                <li>✔ Photovoltaik- &amp; Solar-Betriebe</li>
                <li>✔ Wärmepumpen-, SHK- &amp; Heizungsfachbetriebe</li>
                <li>✔ Elektro- &amp; Smart-Home-Betriebe</li>
                <li>✔ Fenster-, Türen- &amp; Fassadenbauer</li>
                <li>✔ Innenausbau, Trockenbau, Bodenleger</li>
                <li>✔ Badsanierung &amp; Ausbaugewerke</li>
                <li>✔ Service-, Wartungs- &amp; Montagebetriebe</li>
              </ul>

              <p className="mt-3 text-slate-600">
                GLENO ist als spezialisierte{' '}
                <strong>Rechnungssoftware für Handwerker</strong> und moderne{' '}
                <strong>Handwerkersoftware für Angebote und Rechnungen</strong>{' '}
                entwickelt. Besonders in Branchen mit hohem Angebotsvolumen,
                wiederkehrenden Projekten und klaren Qualitätsansprüchen sorgt
                GLENO für strukturierte Abläufe, schnellere
                Angebotserstellung, vollständige Rechnungsstellung und eine
                zentrale Ablage im <strong>Handwerker CRM</strong>. Das
                reduziert Fehler, verhindert Umsatzverluste und stärkt den
                professionellen Auftritt deines Betriebs im Wettbewerb.
              </p>
            </div>

            {/* Rechte Spalte – nur Ecken abgerundet */}
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
                  src="/handwerker_portrait.jpg"
                  alt="Handwerkerbetrieb mit Team – GLENO im Einsatz"
                  fill
                  className="object-cover"
                />
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
