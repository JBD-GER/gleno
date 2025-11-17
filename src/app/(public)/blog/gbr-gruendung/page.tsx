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
    // Fokus-Keywords
    'GbR gründen',
    'Gründung einer GbR',
    'Kosten Gründung GmbH',
    'GbR gründen Kosten',
    'Gründung GbR Kosten',
    'Kosten GbR Gründung',
    'Gründung einer GbR Kosten',
    'Kosten für GbR Gründung',
    'Kosten Gründung GbR',
    'Gründung GbR',
    'Gründung einer GbR',
    'GbR gründen Voraussetzungen',
    'GbR gründen wie',
    'Gründung GbR Voraussetzungen',
    'GbR gründen Checkliste',
    'Gründung GbR Checkliste',
    'eine GbR gründen',
    'GbR gründen Schritte',
    'Familien GbR gründen',
    'Gründungskosten GbR',
    'Vertrag GbR Gründung',
    'GbR gründen Vertrag',
    'GbR Gründung Ablauf',
    'GbR Gründungskosten',
    'Gründung einer GbR Schritte',
    'GbR gründen Dauer',
    'GbR Gründungsvoraussetzungen',
    'GbR Kosten Gründung',
    // Zusätzliche Longtails für das Paket
    'GbR Mustervertrag',
    'GbR Gründung Excel',
    'GbR gründen Leitfaden',
    'GbR gründen Unterlagen',
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
      {/* HERO mit Formular & Logik (Conversion-Fokus) */}
      <GbrHeroSection />

      {/* SECTION: Welche Fragen das Paket klärt */}
      <section className="bg-slate-50 px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welche Fragen das Starterpaket zur GbR-Gründung für Sie klärt.
          </h2>
          <p className="mt-2 max-w-3xl text-sm sm:text-[15px] text-slate-600">
            Wenn Sie eine <strong>GbR gründen</strong> möchten, tauchen meist
            dieselben Fragen auf: Wie läuft die <strong>Gründung einer GbR</strong> ab? 
            Welche <strong>Voraussetzungen</strong> müssen erfüllt sein? Mit welchen{' '}
            <strong>Gründungskosten der GbR</strong> sollten Sie rechnen? Und wie
            erstellen Sie einen passenden <strong>GbR-Vertrag</strong>, ohne direkt
            ein Vermögen für Beratung auszugeben?
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 text-[13px] md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              1. Grundlagen &amp; Voraussetzungen einer GbR
            </h3>
            <p className="mt-2 text-slate-600">
              Sie verstehen, wann eine GbR sinnvoll ist, welche rechtlichen
              Rahmenbedingungen gelten und welche{' '}
              <strong>GbR Gründungsvoraussetzungen</strong> Sie als
              Gesellschafterinnen und Gesellschafter erfüllen sollten.
            </p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• Wann ist eine GbR die passende Rechtsform?</li>
              <li>• Wie viele Personen werden für eine GbR benötigt?</li>
              <li>• Welche Haftung besteht bei der Gründung einer GbR?</li>
              <li>• Was ist bei einer <strong>Familien-GbR</strong> zu beachten?</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Ablauf, Schritte &amp; Dauer der Gründung
            </h3>
            <p className="mt-2 text-slate-600">
              Sie erhalten eine praxisnahe Übersicht über den{' '}
              <strong>Ablauf der GbR-Gründung</strong>: von den ersten Gesprächen
              im Gründerteam bis zu den Meldungen bei Finanzamt und ggf.
              Gewerbeamt – inklusive Checkliste.
            </p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• <strong>GbR gründen – Schritte</strong> in der richtigen Reihenfolge</li>
              <li>• Typische Fehler, die die <strong>GbR Gründung Dauer</strong> verlängern</li>
              <li>• Welche Unterlagen sollten Sie bereithalten?</li>
              <li>• Was ändert sich nach der Anmeldung der GbR im Alltag?</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Kosten, Steuern &amp; Vertrag der GbR
            </h3>
            <p className="mt-2 text-slate-600">
              Sie bekommen ein Gefühl dafür, welche <strong>Gründungskosten der GbR</strong>{' '}
              realistisch sind und wie sich die <strong>laufenden Kosten</strong> entwickeln. 
              Außerdem sehen Sie, wie ein <strong>Vertrag zur GbR Gründung</strong> aufgebaut
              sein kann.
            </p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li>• Einordnung: <strong>GbR Kosten Gründung</strong> vs. andere Rechtsformen</li>
              <li>• Welche Punkte gehören in einen <strong>GbR-Vertrag</strong>?</li>
              <li>• Wie Sie Ihre <strong>GbR Gründungskosten</strong> strukturiert planen</li>
              <li>• Erste Orientierung zu Steuern, Konto &amp; Versicherungen</li>
            </ul>
          </div>
        </div>
      </section>

      {/* MID CTA – zweiter starker Einstieg (Conversion) */}
      <section className="bg-slate-900 px-5 py-14 text-slate-50">
        <div className="mx-auto max-w-5xl rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.95)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Starten Sie Ihre GbR mit Klarheit statt Bauchgefühl.
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
                Das Starterpaket gibt Ihnen einen roten Faden – von der ersten
                Idee über die Anmeldung beim Finanzamt bis hin zu den ersten 30
                Tagen nach der Gründung. Ohne teure Seminare, ohne
                Juristensprache und ohne stundenlanges Recherchieren.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-slate-200">
                <li>• Ideal, wenn Sie gerade „GbR gründen“ suchen</li>
                <li>• Perfekt, wenn Sie mit einem Partner professionell starten wollen</li>
                <li>• Praxisnah, wenn Sie später mit GLENO arbeiten möchten</li>
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
                Sie bei der Gründung Ihrer GbR wirklich weiterbringen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Inhalt des Starterpakets – Datei für Datei */}
      <section className="bg-white px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Das erhalten Sie konkret – Datei für Datei.
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-[15px]">
            Sie müssen nicht mehr jede Information einzeln zusammensuchen. Das
            Starterpaket bündelt alle wichtigen Unterlagen, wenn Sie eine{' '}
            <strong>GbR gründen</strong> möchten – vom{" "}
            <strong>GbR Mustervertrag</strong> über die{' '}
            <strong>GbR Gründungs-Checkliste</strong> bis hin zur Excel-Vorlage
            für Ihre <strong>GbR Gründungskosten</strong>.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 text-[13px] md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                1. PDF-Leitfaden „GbR gründen 2025“
              </h3>
              <p className="mt-2 text-slate-700">
                Ein kompakter, aber ausführlicher Leitfaden, der die wichtigsten
                Fragen zur <strong>Gründung einer GbR</strong> beantwortet:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Rechtsform verstehen: GbR vs. GmbH vs. UG</li>
                <li>• Typischer <strong>Ablauf der GbR-Gründung</strong></li>
                <li>• Welche Unterlagen Sie für das Finanzamt bereithalten sollten</li>
                <li>• Wie Sie Haftung, Verantwortung &amp; Zusammenarbeit regeln können</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                2. Checkliste &amp; 30-Tage-Plan als PDF
              </h3>
              <p className="mt-2 text-slate-700">
                Zwei Dokumente, die Ihnen Schritt für Schritt zeigen,{' '}
                <strong>wie Sie eine GbR gründen</strong> und was direkt nach der
                Gründung wichtig ist:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Reine <strong>GbR Gründung Checkliste</strong> in logischer Reihenfolge</li>
                <li>• Konkrete <strong>Schritte der GbR Gründung</strong> mit Platz zum Abhaken</li>
                <li>• 30-Tage-Plan für Ihre ersten vier Wochen als GbR</li>
                <li>• Ideal für Gründer-Teams, um Aufgaben zu verteilen</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                3. Muster-Gesellschaftsvertrag (Word)
              </h3>
              <p className="mt-2 text-slate-700">
                Ein ausführlicher, editierbarer <strong>Vertrag zur GbR Gründung</strong>,
                den Sie mit Ihren eigenen Daten füllen können:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Einlagen, Gewinnverteilung &amp; Entnahmen klar geregelt</li>
                <li>• Geschäftsführung, Vertretung &amp; Stimmrechte</li>
                <li>• Wettbewerbsverbot, Vertraulichkeit &amp; Haftung</li>
                <li>• Ausscheiden von Gesellschaftern &amp; Auflösung der GbR</li>
              </ul>
              <p className="mt-2 text-[12px] text-slate-500">
                Hinweis: Der Mustervertrag ersetzt keine individuelle
                Rechtsberatung, bietet aber eine solide Grundlage für eine
                rechtssichere <strong>GbR Gründung</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                4. Excel-Vorlage für Gründungs- &amp; laufende Kosten
              </h3>
              <p className="mt-2 text-slate-700">
                Eine fertige Excel-Datei, mit der Sie alle{' '}
                <strong>GbR Gründungskosten</strong> und später laufende Kosten
                überblicken:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Einmalige <strong>GbR Kosten der Gründung</strong> (z. B. Beratung, Anmeldung)</li>
                <li>• Monatliche Fixkosten für Ihre GbR (Miete, Software, Versicherungen)</li>
                <li>• Einfache Hochrechnung des ersten Geschäftsjahres</li>
                <li>• Grundlage für Ihre Liquiditätsplanung</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

     {/* SEO SECTION: Schritt-für-Schritt – GbR gründen Checkliste */}
<section className="bg-slate-50 px-5 py-16 text-slate-900">
  <div className="mx-auto max-w-6xl">
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-start">
      {/* Text-Intro + Erklärung */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          GbR gründen Schritt für Schritt – praktische Checkliste
        </h2>
        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-600">
          Wenn Sie zum ersten Mal eine <strong>GbR gründen</strong>, fühlt sich der Weg
          oft unübersichtlich an: Formulare, Verträge, Haftung, Steuern. Die gute
          Nachricht: Die <strong>Gründung einer GbR</strong> ist in vielen Fällen deutlich
          einfacher und günstiger als die Gründung einer GmbH – vorausgesetzt, Sie
          gehen in einer sinnvollen Reihenfolge vor.
        </p>
        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-600">
          Die folgende <strong>GbR Gründung Checkliste</strong> zeigt Ihnen die wichtigsten
          Schritte – von der Idee bis zur aktiven Geschäftstätigkeit. Genau diesen
          Prozess bildet auch das Starterpaket ab: mit Leitfaden, Checkliste,
          Mustervertrag und Excel-Übersicht der <strong>GbR Gründungskosten</strong>.
        </p>

        <div className="mt-4 inline-flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            • GbR gründen Voraussetzungen
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            • GbR gründen Schritte &amp; Ablauf
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            • Kosten Gründung einer GbR
          </span>
        </div>
      </div>

      {/* Hinweis-Störer (Soft-Box) */}
      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Praktische Umsetzung mit dem Starterpaket
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          Die Checkliste unten ist ideal, um sich zu orientieren. Im kostenlosen
          Starterpaket finden Sie zusätzlich:
        </p>
        <ul className="mt-2 space-y-1 text-[13px] text-slate-700">
          <li>• Ausformulierte <strong>GbR Gründung Checkliste</strong> als PDF</li>
          <li>• Mustervertrag für die <strong>Gründung einer GbR</strong> (Word)</li>
          <li>• Excel-Vorlage für <strong>GbR Kosten der Gründung</strong> &amp; laufende Ausgaben</li>
          <li>• 30-Tage-Plan für die ersten Schritte nach der Gründung</li>
        </ul>
        <a
          href="#lead-form"
          className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ backgroundColor: '#0F172A' }}
        >
          Starterpaket „GbR gründen 2025“ ansehen
        </a>
      </div>
    </div>

    {/* Timeline / Checkliste */}
    <div className="mt-10 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <ol className="relative space-y-6 border-l border-slate-200 pl-5 text-[13px] sm:text-[14px]">
        {/* Step 1 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            1
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Geschäftsidee &amp; Partner – Grundlage der GbR
          </h3>
          <p className="mt-1 text-slate-700">
            Am Anfang steht immer die Frage: <strong>Warum möchten Sie eine GbR gründen?</strong>{' '}
            Klären Sie mit Ihren zukünftigen Gesellschaftern, welches gemeinsame Ziel
            Sie verfolgen, welche Rollen jeder übernimmt und wie Sie sich die
            Zusammenarbeit vorstellen. Dieser Schritt ist besonders wichtig, wenn
            Sie eine <strong>Familien-GbR</strong> planen.
          </p>
        </li>

        {/* Step 2 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            2
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Voraussetzungen prüfen – passt die Rechtsform GbR?
          </h3>
          <p className="mt-1 text-slate-700">
            Prüfen Sie die <strong>GbR Gründungsvoraussetzungen</strong>: Es benötigen
            mindestens zwei Personen, die gemeinsam ein Ziel verfolgen. Alle
            Gesellschafter haften grundsätzlich persönlich und unbeschränkt. 
            Fragen Sie sich: Ist Ihnen diese Haftung bewusst, oder kommt in Ihrem
            Fall eher eine haftungsbeschränkte Form wie die GmbH in Betracht?
          </p>
        </li>

        {/* Step 3 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            3
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Vertrag zur GbR Gründung entwerfen
          </h3>
          <p className="mt-1 text-slate-700">
            Rechtlich können Sie eine <strong>GbR gründen</strong>, ohne einen
            schriftlichen Vertrag abzuschließen – empfehlenswert ist das aber
            keinesfalls. Ein sauber formulierter <strong>GbR-Vertrag</strong> regelt:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
            <li>Einlagen, Beteiligungsquoten &amp; Gewinnverteilung</li>
            <li>Geschäftsführung, Vertretung und Entscheidungsprozesse</li>
            <li>Haftung, Wettbewerbsverbote und Vertraulichkeit</li>
            <li>Ausscheiden von Gesellschaftern &amp; Auflösung der GbR</li>
          </ul>
          <p className="mt-1 text-[12px] text-slate-500">
            Im Starterpaket finden Sie einen editierbaren Mustervertrag für die{' '}
            <strong>Gründung einer GbR</strong>, den Sie gemeinsam mit Beratern anpassen können.
          </p>
        </li>

        {/* Step 4 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            4
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Name, Außenauftritt &amp; erste Struktur
          </h3>
          <p className="mt-1 text-slate-700">
            Legen Sie fest, unter welchem Namen Sie die <strong>GbR gründen</strong> und wie
            Sie nach außen auftreten möchten: Firmenname, Domain, E-Mail-Adressen
            und erste Website. Auch wenn die formale <strong>Gründung einer GbR</strong> relativ
            schlank ist – Ihr Auftritt sollte professionell wirken.
          </p>
        </li>

        {/* Step 5 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            5
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Kosten der GbR Gründung &amp; laufende Ausgaben planen
          </h3>
          <p className="mt-1 text-slate-700">
            Viele unterschätzen die <strong>Gründungskosten der GbR</strong> und vor allem
            die laufenden Ausgaben. Erfassen Sie:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
            <li>Beratungskosten (Steuerberater, Gründungscoaching)</li>
            <li>Gewerbeanmeldung, Kammerbeiträge (falls relevant)</li>
            <li>Versicherungen, Software, Marketing &amp; Website</li>
          </ul>
          <p className="mt-1 text-[12px] text-slate-500">
            In der Excel-Vorlage des Starterpakets können Sie alle{' '}
            <strong>Kosten der Gründung einer GbR</strong> und die monatlichen Fixkosten
            strukturiert erfassen.
          </p>
        </li>

        {/* Step 6 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            6
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Anmeldung der GbR beim Finanzamt (&amp; ggf. Gewerbeanmeldung)
          </h3>
          <p className="mt-1 text-slate-700">
            Im nächsten Schritt melden Sie die <strong>GbR Gründung</strong> beim
            Finanzamt an. Je nach Tätigkeit ist zusätzlich eine{' '}
            <strong>Gewerbeanmeldung</strong> erforderlich. Die Reihenfolge und
            die richtigen Formulare sind Teil des Starterpakets und der dortigen
            Checkliste.
          </p>
        </li>

        {/* Step 7 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            7
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Geschäftskonto, Buchhaltung &amp; Versicherungen
          </h3>
          <p className="mt-1 text-slate-700">
            Richten Sie ein separates Konto für Ihre GbR ein, definieren Sie
            eine einfache Struktur für Buchhaltung und Belege und prüfen Sie
            notwendige Versicherungen. So vermeiden Sie, dass private und
            geschäftliche Ausgaben verschwimmen.
          </p>
        </li>

        {/* Step 8 */}
        <li className="relative">
          <span className="absolute -left-[30px] mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">
            8
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            Operativer Start – Angebote, Rechnungen, Kunden
          </h3>
          <p className="mt-1 text-slate-700">
            Nach der formalen <strong>Gründung einer GbR</strong> beginnt die eigentliche
            Arbeit: Kundenanfragen, Angebote, Rechnungen und Projekte. Genau
            hier setzt GLENO an – als System für Angebote, Rechnungen und
            CRM, das speziell für kleine Unternehmen und Gründerteams gedacht ist.
          </p>
        </li>
      </ol>
    </div>
  </div>
</section>


      {/* SEO SECTION: Kosten – GbR Gründung vs. GmbH */}
      <section className="bg-white px-5 py-16 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Kosten der GbR-Gründung – und wie sie sich von der GmbH unterscheiden.
          </h2>
          <p className="mt-2 max-w-3xl text-sm sm:text-[15px] text-slate-600">
            Viele Gründerinnen und Gründer vergleichen die{' '}
            <strong>Kosten der Gründung einer GbR</strong> mit den{' '}
            <strong>Kosten der Gründung einer GmbH</strong>. Die GbR ist in der
            Regel deutlich günstiger, bringt aber eine andere Haftungssituation
            mit sich.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 text-[13px] sm:grid-cols-2 sm:text-[14px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Typische Gründungskosten einer GbR
              </h3>
              <p className="mt-2 text-slate-700">
                Die <strong>GbR Gründungskosten</strong> sind meist überschaubar,
                können aber je nach Beratungsaufwand variieren:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Formulierung oder Prüfung des GbR-Vertrags</li>
                <li>• Beratung durch Steuerberater oder Gründungscoaching</li>
                <li>• Gewerbeanmeldung (falls erforderlich)</li>
                <li>• Erste Marketing- &amp; Website-Kosten</li>
              </ul>
              <p className="mt-2 text-[12px] text-slate-500">
                In der Excel-Vorlage können Sie alle{' '}
                <strong>Kosten der GbR Gründung</strong> sowie laufende Kosten
                sauber erfassen und später mit Ihren tatsächlichen Werten
                abgleichen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Kosten der Gründung einer GmbH – kurzer Vergleich
              </h3>
              <p className="mt-2 text-slate-700">
                Im Vergleich zur GbR sind die <strong>Kosten der Gründung einer GmbH</strong>{' '}
                deutlich höher:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>• Stammkapital (mind. 25.000 €)</li>
                <li>• Notarkosten für den Gesellschaftsvertrag</li>
                <li>• Eintrag ins Handelsregister</li>
                <li>• Häufig umfangreichere Beratung &amp; Buchhaltungsstrukturen</li>
              </ul>
              <p className="mt-2 text-[12px] text-slate-500">
                Das Starterpaket hilft Ihnen, ein Gefühl zu bekommen, ob eine
                <strong>GbR Gründung</strong> zunächst sinnvoll ist – oder ob sich
                der direkte Schritt in die GmbH für Ihr Vorhaben eher lohnt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO SECTION: Familien-GbR gründen */}
<section className="bg-white px-5 py-16 text-slate-900">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
      Familien-GbR gründen – typische Einsatzbereiche &amp; Fallstricke.
    </h2>
    <p className="mt-3 max-w-3xl text-sm sm:text-[15px] leading-relaxed text-slate-600">
      Eine <strong>Familien-GbR</strong> wird häufig genutzt, um gemeinsames Vermögen
      zu verwalten – etwa Immobilien, Depots oder ein kleines Familienunternehmen.
      Die <strong>Gründung einer GbR innerhalb der Familie</strong> kann vieles
      vereinfachen, birgt aber auch Risiken, wenn zentrale Punkte nicht sauber
      geregelt sind. Genau hier hilft ein klarer <strong>Vertrag zur GbR Gründung</strong>.
    </p>

    <div className="mt-8 grid grid-cols-1 gap-6 text-[13px] sm:grid-cols-3 sm:text-[14px]">
      {/* Box 1 – Einsatzbereiche */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Typische Einsatzbereiche einer Familien-GbR
        </h3>
        <p className="mt-2 text-slate-700">
          Die Familien-GbR eignet sich immer dann, wenn mehrere Angehörige
          gemeinsam Verantwortung tragen und Vermögen strukturiert halten möchten:
        </p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>• Gemeinsame Verwaltung einer vermieteten Immobilie</li>
          <li>• Bündelung von Familienvermögen (z. B. Wertpapierdepots)</li>
          <li>• Halten einer Beteiligung an einem Familienunternehmen</li>
          <li>• Projektbezogene Zusammenarbeit in der Familie (z. B. Ferienhaus)</li>
          <li>• Strukturierung von Nachfolge- und Schenkungsmodellen</li>
        </ul>
      </div>

      {/* Box 2 – Vertrag & Regelungen */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Wichtige Regelungen im GbR-Vertrag
        </h3>
        <p className="mt-2 text-slate-700">
          Auch in der Familie gilt: Je klarer die Regeln, desto weniger Konflikte.
          Ein Vertrag zur <strong>Gründung einer Familien-GbR</strong> sollte u. a. regeln:
        </p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>• Einlagen und Beteiligungsquoten der Familienmitglieder</li>
          <li>• Gewinnverteilung und Entnahmeregelungen</li>
          <li>• Entscheidungswege &amp; Stimmrechte (Wer darf was entscheiden?)</li>
          <li>• Ausscheiden einzelner Gesellschafter &amp; Abfindung</li>
          <li>• Nachfolge, Erbfall &amp; Übergang von Anteilen</li>
        </ul>
        <p className="mt-2 text-[12px] text-slate-500">
          Der im Starterpaket enthaltene Mustervertrag bietet eine Struktur, die
          Sie gemeinsam mit Steuerberater oder Anwalt an Ihre Familiensituation
          anpassen können.
        </p>
      </div>

      {/* Box 3 – Typische Fallstricke */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Typische Fallstricke &amp; wie Sie sie vermeiden
        </h3>
        <p className="mt-2 text-slate-700">
          Die <strong>Gründung einer Familien-GbR</strong> scheitert selten an der
          Idee, sondern an unklaren Erwartungen. Häufige Fehler:
        </p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>• Mündliche Absprachen statt klarer schriftlicher Vereinbarungen</li>
          <li>• Unklare Regelung, wer welche Aufgaben übernimmt</li>
          <li>• Keine saubere Trennung zwischen Privat- und Gesellschaftsvermögen</li>
          <li>• Kein Plan, was bei Streit oder Ausstieg eines Angehörigen passiert</li>
          <li>• Fehlende Transparenz über Einnahmen, Ausgaben &amp; Steuern</li>
        </ul>
        <p className="mt-2 text-[12px] text-slate-500">
          Eine gut vorbereitete <strong>GbR Gründung</strong> mit Checkliste, Vertrag
          und Kostenübersicht hilft, diese Punkte früh zu adressieren – bevor
          Konflikte entstehen.
        </p>
      </div>
    </div>

    {/* kleiner Abschluss-Hinweis */}
    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[13px] sm:text-[14px]">
      <p className="text-slate-700">
        Wenn Sie überlegen, eine <strong>Familien-GbR zu gründen</strong>, lohnt es sich,
        die wirtschaftlichen und rechtlichen Folgen in Ruhe durchzugehen. Das
        Starterpaket unterstützt Sie dabei, die wichtigsten Fragen strukturiert zu
        beantworten – von den <strong>GbR Kosten der Gründung</strong> bis hin zu den
        zentralen Vertragsbausteinen.
      </p>
    </div>
  </div>
</section>


      {/* FAQ / Sicherheit */}
      <section className="bg-white px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Häufige Fragen zur GbR-Gründung &amp; zum Starterpaket.
          </h2>

          <div className="mt-6 space-y-4 text-[13px] sm:text-[14px]">
            <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Kostet das Starterpaket wirklich nichts?
                <span className="text-slate-500 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-slate-700">
                Ja. Das Starterpaket ist zu 100 % kostenlos und unverbindlich.
                Sie gehen keine Vertragsbeziehung ein. Sie erhalten zusätzlich
                gelegentlich E-Mails mit Tipps zur Selbstständigkeit und zur
                Arbeit mit GLENO – Sie können sich jederzeit mit einem Klick
                abmelden.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Muss ich schon sicher sein, dass ich eine GbR gründen möchte?
                <span className="text-slate-500 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-slate-700">
                Nein. Das Paket ist gerade für Menschen gedacht, die noch in der
                Entscheidungsphase sind und verstehen möchten, welche Schritte,
                Kosten und Verpflichtungen mit der Gründung einer GbR verbunden
                sind. Viele Empfänger nutzen die Unterlagen, um mit einem
                möglichen Geschäftspartner alles in Ruhe durchzugehen.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Brauche ich trotz Mustervertrag noch einen Anwalt?
                <span className="text-slate-500 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-slate-700">
                Der Mustervertrag ist eine praxisnahe Grundlage mit allen
                wichtigen Bausteinen einer GbR. Er ersetzt keine individuelle
                Rechtsberatung. Gerade bei größeren Vorhaben, höheren Umsätzen
                oder komplexen Familienstrukturen ist es sinnvoll, den Vertrag
                einmal von einer Anwältin oder einem Anwalt prüfen zu lassen.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                Welche Rolle spielt GLENO bei der GbR?
                <span className="text-slate-500 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-slate-700">
                GLENO ist nicht die eigentliche Gründungsplattform, sondern das
                System für den Alltag danach: Angebote, Rechnungen, Kunden und
                Projekte. Im Leitfaden sehen Sie, wie Sie Ihre GbR sauber
                gründen – und wie Sie sie anschließend mit GLENO organisiert und
                professionell führen können.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  )
}
