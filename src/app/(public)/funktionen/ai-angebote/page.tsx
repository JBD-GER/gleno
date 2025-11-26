// src/app/(public)/ai-angebote/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AI-Angebote – Wie GLENO KI in der Angebotserstellung einsetzt',
  description:
    'Auf dieser Seite erfahren Sie, wie AI-Angebote in GLENO funktionieren: Welche Daten genutzt werden, wie der KI-Assistent Angebote vorbereitet und welche Rolle der Mensch im Freigabeprozess behält.',
  keywords: [
    'ai angebote',
    'ai angebote software',
    'ki angebote',
    'angebote mit ki erstellen',
    'angebotserstellung mit künstlicher intelligenz',
    'ai assistent angebote',
    'gleno ai angebote',
  ],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/ai-angebote`,
    siteName: SITE_NAME,
    title: 'AI-Angebote – Wie GLENO KI in der Angebotserstellung einsetzt',
    description:
      'Wie der KI-Assistent in GLENO Angebote vorbereitet, Daten nutzt und in Ihren bestehenden Angebotsprozess eingebunden ist – verständlich erklärt.',
    images: [
      {
        url: `${SITE_URL}/og/og-ai-angebote.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – AI-Angebote & KI-Assistent in der Angebotserstellung',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-Angebote – Wie GLENO KI in der Angebotserstellung einsetzt',
    description:
      'Schritt für Schritt erklärt: So unterstützt der KI-Assistent in GLENO die Angebotserstellung – von Stammdaten über Vorlagen bis zur Freigabe.',
    images: [`${SITE_URL}/og/og-ai-angebote.jpg`],
  },
  robots: { index: true, follow: true },
}

/* ------------------------------- Shot Component ------------------------------- */
type ShotProps = { id: string; src: string; alt: string; caption: string }

function Shot({ id, src, alt, caption }: ShotProps) {
  return (
    <>
      {/* Thumbnail */}
      <a
        href={`#${id}`}
        className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm ring-1 ring-white/60"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute inset-0 bg-slate-900/0 transition-colors duration-200 group-hover:bg-slate-900/5" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[8px] font-medium text-white">
          {caption}
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[8px] text-slate-700 shadow-sm">
          Zum Vergrößern klicken
        </span>
      </a>

      {/* Modal via :target */}
      <div id={id} className="shot-modal fixed inset-0 z-[90] flex items-center justify-center">
        <a
          href="#screens"
          aria-label="Vorschau schließen"
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        <div className="relative z-[91] mx-3 max-h-[92vh] w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-950/95 p-3 sm:p-4 shadow-2xl">
          <a
            href="#screens"
            aria-label="Vorschau schließen"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/95 text-[16px] text-white shadow-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 z-[92]"
          >
            ×
          </a>
          <div className="relative mt-4 h-[60vh] w-full overflow-hidden rounded-2xl bg-slate-900">
            <Image src={src} alt={alt} fill className="object-contain" />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
            <span>{caption}</span>
            <span className="text-slate-500">Zum Schließen außerhalb klicken oder „×“ nutzen.</span>
          </div>
        </div>
      </div>
    </>
  )
}

/* ----------------------------------- Page ----------------------------------- */
export default function AiAngebotePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-slate-50">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px 520px at 50% -10%, rgba(56,189,248,0.10), transparent), radial-gradient(900px 420px at 10% 0%, rgba(15,23,42,1), #020817)',
          }}
        />
        <div className="pointer-events-none absolute -bottom-24 right-[-40px] h-72 w-72 rounded-full bg-sky-500/8 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-16 pb-14 lg:flex-row lg:items-center lg:gap-14 lg:pt-20">
          {/* LEFT */}
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-sky-500/25 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>AI-Angebote in GLENO</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline">KI-Unterstützung statt Formularwüste</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline">Mensch behält die Kontrolle</span>
            </div>

            <h1 className="font-semibold tracking-tight text-white">
              <span className="block text-[11px] sm:text-[12px] lg:text-[13px] text-sky-300 mb-1">
                Was „AI-Angebote“ im Alltag wirklich bedeuten.
              </span>
              <span className="block text-[26px] leading-tight sm:text-4xl lg:text-[40px]">
                AI-Angebote in GLENO – wie der KI-Assistent Ihre Angebotserstellung unterstützt.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
              Auf dieser Seite geht es nicht ums Verkaufen, sondern ums Verstehen:{' '}
              <strong>Wie funktionieren AI-Angebote in GLENO konkret?</strong> Welche Daten nutzt die
              KI, wie entsteht ein Angebotsentwurf und an welchen Stellen bleibt bewusst der Mensch am
              Steuer?
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#ablauf"
                className="inline-flex items-center justify-center rounded-2xl border border-sky-400/70 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-sky-100 backdrop-blur transition hover:bg-slate-900 hover:border-sky-300"
              >
                Ablauf der AI-Angebote ansehen
              </a>
              <a
                href="#daten"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-500/70 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-slate-900 hover:border-slate-200"
              >
                Genutzte Daten & Datenschutz
              </a>
              <Link
                href="/funktionen"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-[11px] font-semibold text-slate-200 backdrop-blur hover:bg-slate-900/80 hover:border-slate-300"
              >
                GLENO im Überblick
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                KI unterstützt – Mensch entscheidet
              </span>
              <span>Transparente Funktionsweise</span>
              <span>Keine „Black Box“-Magie</span>
              <span>Fokus auf Alltagstauglichkeit</span>
            </div>
          </div>

          {/* RIGHT – Info Card */}
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700/70 bg-slate-900/90 p-4 text-[9px] shadow-[0_26px_90px_rgba(0,0,0,0.98)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-100">Was AI-Angebote NICHT sind</span>
              </div>
              <ul className="mt-1 space-y-1.5 text-[9px] text-slate-300">
                <li>– Die KI schickt keine Angebote ohne Ihr Wissen an Kunden.</li>
                <li>– Es werden keine „geheimen“ Preisentscheidungen getroffen.</li>
                <li>– Ihre Daten werden nicht öffentlich als Trainingsdaten genutzt.</li>
              </ul>
              <div className="mt-3 flex items-center justify-between text-slate-300">
                <span className="font-semibold text-sky-300">Was AI-Angebote stattdessen tun</span>
              </div>
              <ul className="mt-1 space-y-1.5 text-[9px] text-slate-300">
                <li>✔ Strukturen, Texte und Positionen vorbereiten.</li>
                <li>✔ Vorschläge aus Ihren Vorlagen & Stammdaten ableiten.</li>
                <li>✔ Ihnen Zeit bei wiederkehrenden Formulierungen sparen.</li>
              </ul>
              <p className="mt-2 text-[9px] text-slate-400">
                Das Ziel: <strong>Entlastung bei Routinearbeit</strong>, damit Sie mehr Zeit für
                Beratung, Planung und Kundenkontakt haben.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EINORDNUNG */}
      <section
        id="einordnung"
        className="relative overflow-hidden px-5 py-16 text-slate-900 bg-gradient-to-b from-slate-50 via-white to-slate-50"
      >
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto mb-8 max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Einordnung
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[34px]">
              Was meint GLENO mit{' '}
              <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                „AI-Angeboten“?
              </span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Unter <strong>AI-Angeboten</strong> verstehen wir Angebote, die durch einen
              KI-Assistenten vorbereitet werden: Positionen, Texte und Struktur werden
              vorgeschlagen, Sie prüfen, ergänzen und geben frei.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-slate-900/5 px-2.5 py-1 text-[11px] text-slate-700">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Grundidee
              </div>
              <h3 className="text-base font-semibold text-slate-900">Assistenz statt Automatik</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                AI-Angebote in GLENO sind bewusst als <strong>Assistenzfunktion</strong> gedacht: Die
                KI schlägt Texte, Positionen und Strukturen vor – die Entscheidung, was zum Kunden
                geschickt wird, liegt immer bei Ihnen.
              </p>
            </article>

            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ziel
              </div>
              <h3 className="text-base font-semibold text-slate-900">Weniger Routine, mehr Facharbeit</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                Viele Angebote ähneln sich: gleiche Leistungen, andere Mengen oder Objekte. Genau hier
                setzt der KI-Assistent an und nimmt Ihnen <strong>wiederkehrende Schreibarbeit</strong>
                ab – ohne Ihre Expertise zu ersetzen.
              </p>
            </article>

            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Einbettung
              </div>
              <h3 className="text-base font-semibold text-slate-900">Teil des Gesamt-Workflows</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                AI-Angebote sind in GLENO kein isoliertes „KI-Feature“, sondern eingebettet in
                Kundenakte, Projektverlauf, Zeiterfassung und Rechnungsstellung. So bleibt der
                Zusammenhang vom Erstkontakt bis zur Zahlung erhalten.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ABLAUF */}
      <section id="ablauf" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Wie AI-Angebote in GLENO Schritt für Schritt funktionieren.
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
              Die folgende Übersicht zeigt, welche Schritte der KI-Assistent übernimmt – und an
              welchen Stellen Sie bewusst entscheiden.
            </p>
          </header>

          <ol className="space-y-4 text-[13px]">
            <li className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">Schritt 1</div>
              <h3 className="text-sm font-semibold text-slate-900">
                Stammdaten, Vorlagen & bisherige Angebote als Grundlage
              </h3>
              <p className="mt-1 text-slate-700">
                Der KI-Assistent nutzt Informationen, die ohnehin in GLENO vorhanden sind:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Kundenstammdaten (Ansprechpartner, Objekt, Rahmenbedingungen)</li>
                <li>• Ihre Leistungs- und Artikelvorlagen</li>
                <li>• Standardtexte wie Zahlungsbedingungen, Ausführungsfristen, Hinweise</li>
                <li>• Struktur und Inhalte Ihrer bisherigen Angebote</li>
              </ul>
              <p className="mt-1 text-slate-700">
                Daraus kann die KI ableiten, wie ein typisches Angebot in Ihrem Unternehmen
                aufgebaut ist.
              </p>
            </li>

            <li className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">Schritt 2</div>
              <h3 className="text-sm font-semibold text-slate-900">
                Kontext zum Projekt oder zur Anfrage erfassen
              </h3>
              <p className="mt-1 text-slate-700">
                Für ein neues Angebot geben Sie – wie bisher – die wichtigsten Eckdaten ein, z. B.:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Art des Projekts (z. B. Installation, Wartung, Dienstleistungspaket)</li>
                <li>• Besondere Anforderungen oder Ausschreibungs-Bezug</li>
                <li>• Umfang, Mengen oder gewünschte Leistungen</li>
              </ul>
              <p className="mt-1 text-slate-700">
                Diese Angaben bilden den Kontext, den der KI-Assistent benötigt, um passende Texte
                und Positionen vorzuschlagen.
              </p>
            </li>

            <li className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">Schritt 3</div>
              <h3 className="text-sm font-semibold text-slate-900">
                KI erstellt einen Angebotsentwurf – inklusive Textvorschlägen
              </h3>
              <p className="mt-1 text-slate-700">
                Auf Knopfdruck erzeugt der KI-Assistent einen <strong>Entwurf</strong>. Typisch sind:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Vorschlag für die Angebotsstruktur (Positionen, Unterpunkte, Überschriften)</li>
                <li>• Formulierungsvorschläge für Leistungsbeschreibungen</li>
                <li>• Ergänzende Hinweise (z. B. zu Ausführungsfristen, Haftungsausschlüssen)</li>
              </ul>
              <p className="mt-1 text-slate-700">
                Preise werden dabei <strong>nicht „erfunden“</strong>, sondern basieren auf Ihren
                hinterlegten Sätzen und Vorlagen.
              </p>
            </li>

            <li className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">Schritt 4</div>
              <h3 className="text-sm font-semibold text-slate-900">
                Menschliche Prüfung, Anpassung & Freigabe
              </h3>
              <p className="mt-1 text-slate-700">
                Der Entwurf wird <strong>immer</strong> von einer verantwortlichen Person geprüft:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Texte anpassen, vereinfachen oder ergänzen</li>
                <li>• Mengen, Rabatte oder Besonderheiten prüfen</li>
                <li>• interne Kalkulation gegenprüfen</li>
              </ul>
              <p className="mt-1 text-slate-700">
                Erst nach Ihrer bewussten Freigabe wird das Angebot an den Kunden gesendet. Die KI
                versendet nichts eigenständig.
              </p>
            </li>

            <li className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">Schritt 5</div>
              <h3 className="text-sm font-semibold text-slate-900">
                Übergabe in Auftrag, Projektverlauf & Abrechnung
              </h3>
              <p className="mt-1 text-slate-700">
                Wird ein Angebot angenommen, kann es – wie gewohnt in GLENO – mit einem Klick in
                einen Auftrag überführt werden. Dabei bleiben die vom KI-Assistenten vorbereiteten
                Texte und Positionen Teil der Dokumentation:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Projektverlauf & Kundenakte</li>
                <li>• Zeiterfassung & Leistungsnachweise</li>
                <li>• Rechnungsstellung & spätere Auswertungen</li>
              </ul>
            </li>
          </ol>
        </div>
      </section>

      {/* DATEN & DATENSCHUTZ */}
      <section id="daten" className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Welche Daten nutzt die KI – und wie ist das abgesichert?
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Ein zentraler Punkt bei AI-Funktionen ist Transparenz: Welche Daten werden verwendet, wie
            werden sie verarbeitet und wo bleiben Sie als Unternehmen in der Verantwortung?
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">1. Datenbasis</h3>
              <p className="mt-1 text-slate-700">
                Die KI nutzt ausschließlich Informationen aus Ihrem GLENO-Account:
              </p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>• Stammdaten (Kunden, Objekte, Kontaktinfos)</li>
                <li>• Leistungs- und Artikelvorlagen</li>
                <li>• Struktur und Inhalte vorhandener Angebote</li>
              </ul>
              <p className="mt-1 text-slate-700">
                Es werden keine fremden Kundendaten aus anderen Accounts gemischt.
              </p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">2. Verarbeitung</h3>
              <p className="mt-1 text-slate-700">
                Die Verarbeitung erfolgt im Rahmen der GLENO-Infrastruktur. Ziel ist es, aus Ihren
                bestehenden Informationen <strong>Vorschläge</strong> abzuleiten – nicht, eigene
                Entscheidungen zu treffen.
              </p>
              <p className="mt-1 text-slate-700">
                Sie können jederzeit nachvollziehen, welche Texte von der KI vorgeschlagen und welche
                von Ihnen geändert wurden.
              </p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">3. Verantwortung</h3>
              <p className="mt-1 text-slate-700">
                Die inhaltliche Verantwortung für Angebote bleibt bei Ihrem Unternehmen. AI-Angebote
                sind ein Werkzeug – ähnlich wie Vorlagen oder Textbausteine – nur deutlich flexibler.
              </p>
              <p className="mt-1 text-slate-700">
                Gute Praxis ist: interne Freigabeprozesse beibehalten und die KI dort einsetzen, wo
                sie Routinearbeit reduziert.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-5 text-[13px] leading-relaxed text-slate-700 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
            <p>
              Kurz gesagt:{' '}
              <strong>AI-Angebote in GLENO bauen auf Ihren Daten auf und bleiben ein Werkzeug in Ihrer Hand.</strong>{' '}
              Die KI entscheidet nicht über Ihr Geschäft, sondern unterstützt Sie dabei, fachlich
              fundierte Angebote schneller und konsistent zu formulieren.
            </p>
          </div>
        </div>
      </section>

      {/* SCREENS */}
      <section id="screens" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Ein Blick in den KI-Assistenten für Angebote.
          </h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Die Screenshots zeigen beispielhaft, wie AI-Angebote in GLENO eingebettet sind – von der
            Kundenakte über den Angebotsentwurf bis zur Übergabe in den Auftrag.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Shot
              id="shot-angebote-ki"
              src="/app-angebote-ki-assistent.png"
              alt="GLENO – Angebote mit KI-Assistent"
              caption="KI-Assistent schlägt Struktur und Texte für ein Angebot vor"
            />
            <Shot
              id="shot-angebot-entwurf"
              src="/app-angebote-entwurf.png"
              alt="GLENO – Angebotsentwurf mit KI-Text"
              caption="Entwurf mit KI-Texten – von Ihnen geprüfte finale Version"
            />
            <Shot
              id="shot-kundenakte"
              src="/app-kundenakte-projektverlauf.png"
              alt="GLENO – Kundenakte & Projektverlauf"
              caption="Angebote, Aufträge & Dokumente in einer Kundenakte"
            />
            <Shot
              id="shot-rechnungen"
              src="/app-rechnungen-offene-posten.png"
              alt="GLENO – Rechnungen & offene Posten"
              caption="Vom freigegebenen Angebot zur Rechnung und OP-Liste"
            />
            <Shot
              id="shot-dashboard"
              src="/app-dashboard-gesamtueberblick.png"
              alt="GLENO Dashboard – Gesamtüberblick"
              caption="Offene Angebote, Aufgaben & Projekte im Überblick"
            />
            <Shot
              id="shot-anfragen"
              src="/app-anfragen-uebersicht.png"
              alt="GLENO – Anfragenübersicht"
              caption="Anfragen, die später zu AI-Angeboten werden können"
            />
          </div>
        </div>
      </section>

      {/* FAQ / ZUSAMMENFASSUNG */}
      <section id="faq" className="bg-slate-50 px-5 pt-16 pb-16 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] text-slate-600 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Fragen zu AI-Angeboten
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Häufige Fragen – kurz beantwortet.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Ersetzt die KI meine Angebotsverantwortlichen?
              </h3>
              <p className="mt-1 text-slate-700">
                Nein. AI-Angebote sind so ausgelegt, dass <strong>immer</strong> ein Mensch prüft
                und freigibt. Die KI ist ein Werkzeug, kein Entscheider.
              </p>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Kann ich AI-Angebote auch einfach ignorieren?
              </h3>
              <p className="mt-1 text-slate-700">
                Ja. Sie können Angebote weiterhin komplett manuell erstellen. Der KI-Assistent ist
                eine Ergänzung – kein Muss.
              </p>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Wo erfahre ich mehr über GLENO insgesamt?
              </h3>
              <p className="mt-1 text-slate-700">
                Diese Seite konzentriert sich bewusst nur auf AI-Angebote. Einen Gesamtüberblick zu
                Funktionen wie Projektplanung, Zeiterfassung und Rechnungen finden Sie auf der
                Übersichtsseite.
              </p>
              <p className="mt-2 text-slate-700">
                <Link
                  href="/funktionen"
                  className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                >
                  Zur Funktionsübersicht
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Behavior */}
      <style>{`
        .shot-modal { opacity: 0; pointer-events: none; transition: opacity .2s ease-out; }
        .shot-modal:target { opacity: 1; pointer-events: auto; }
      `}</style>
    </>
  )
}
