// src/app/(public)/docs/csv-vorlagen/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.software-fliesenleger.de'
const PRIMARY = '#0a1b40'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'CSV-Vorlage Kunden & Import – Software Fliesenleger', template: '%s | Software Fliesenleger' },
  description:
    'CSV-Vorlage für Kunden inkl. Anleitung für den fehlerfreien Import (E-Mail ODER Telefon erforderlich).',
  alternates: { canonical: `${SITE_URL}/docs/csv-vorlagen` },
  robots: { index: true, follow: true },
}

/* Data-URI-Download (ohne Client-APIs) */
const customersCsv = [
  'first_name,last_name,company,street,zip,city,email,phone,notes',
  'Marta,Meyer,Meyer Fliesen GmbH,Beispielstraße 12,10115,Berlin,marta.meyer@example.com,,VIP-Kundin',
  ',Schulz,,Hauptweg 3,28195,Bremen,,+49 170 1234567,telefonisch erreichbar',
].join('\n')
const customersHref = 'data:text/csv;charset=utf-8,' + encodeURIComponent(customersCsv)

export default function CsvDocsPage() {
  return (
    <div className="space-y-16">
      {/* HERO – großer Glass-Block inkl. Download */}
      <section className="relative">
        {/* Weiche, große Fläche – verhindert abgeschnittenen Schatten */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 -bottom-16"
          style={{
            background:
              'radial-gradient(1400px 520px at 50% -10%, rgba(10,27,64,0.06), transparent), radial-gradient(1200px 480px at 90% -20%, rgba(10,27,64,0.05), transparent), radial-gradient(1200px 480px at 10% -20%, rgba(10,27,64,0.05), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-12 sm:pt-16">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-10 text-center shadow-[0_18px_70px_rgba(2,6,23,0.12)] backdrop-blur-xl ring-1 ring-white/60 sm:p-14">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60">
              <span className="rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: PRIMARY }}>
                Import
              </span>
              <span>CSV-Vorlage & Anleitung</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              CSV-Vorlage: Kunden (Import)
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
              Vorlage laden, Daten eintragen und fehlerfrei importieren – exakt passend zum Import-Dialog.
              Mindestanforderung: <strong>E-Mail ODER Telefon</strong>.
            </p>

            {/* CTA-Zeile im Hero */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={customersHref}
                download="kunden-vorlage.csv"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: PRIMARY, boxShadow: '0 6px 22px rgba(10,27,64,.25), inset 0 1px 0 rgba(255,255,255,.25)' }}
                aria-label="CSV-Vorlage Kunden herunterladen"
              >
                CSV herunterladen
                <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90" fill="currentColor" aria-hidden>
                  <path d="M5 20h14v-2H5v2zm7-18l-5 5h3v6h4V7h3l-5-5z" />
                </svg>
              </a>

              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
              >
                Zur Docs-Übersicht
              </Link>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">UTF-8 • Komma-Trenner • Header nicht ändern</p>
          </div>
        </div>
      </section>

      {/* Anleitung – abgestimmt auf deinen Papa.parse-Flow */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_15px_60px_rgba(2,6,23,0.10)] backdrop-blur-xl ring-1 ring-white/60 sm:p-10">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Schritt-für-Schritt: CSV importieren</h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <li>
              <strong>Vorlage laden</strong> und in Excel/Numbers/Google Sheets öffnen (Spaltennamen nicht ändern).
            </li>
            <li>
              <strong>Felder befüllen</strong> – bei Kunden gilt: <em>E-Mail ODER Telefon</em> muss vorhanden sein.
            </li>
            <li>
              <strong>CSV speichern</strong> (UTF-8, Komma-getrennt, keine Leerzeilen).
            </li>
            <li>
              <strong>In der App:</strong> Button „Importieren“ → Datei wählen. Der Dialog nutzt{' '}
              <code>Papa.parse</code> mit <code>header:true</code> und <code>skipEmptyLines:true</code>.
            </li>
            <li>
              <strong>Vorschau prüfen:</strong> Fehler erscheinen oben (z. B. „Zeile 7: E-Mail oder Telefon fehlt“). Korrigieren & erneut laden.
            </li>
            <li>
              <strong>Import starten:</strong> Es werden nur gültige Zeilen an <code>/api/customers/bulk</code> gesendet.
            </li>
          </ol>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">Kunden – Spaltenbeschreibung</h3>
              <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-700 sm:grid-cols-2">
                <li><code>first_name</code> – Vorname (optional)</li>
                <li><code>last_name</code> – Nachname (optional)</li>
                <li><code>company</code> – Firma (optional)</li>
                <li><code>street</code> – Straße</li>
                <li><code>zip</code> – PLZ</li>
                <li><code>city</code> – Ort</li>
                <li><code>email</code> – erforderlich, wenn kein Telefon</li>
                <li><code>phone</code> – erforderlich, wenn keine E-Mail</li>
                <li className="sm:col-span-2"><code>notes</code> – Notiz (frei nutzbar)</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/60 bg-white/80 p-5 ring-1 ring-white/60">
            <h3 className="text-sm font-semibold text-slate-900">Tipps</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>UTF-8 Export wählen (Excel: „CSV UTF-8“).</li>
              <li>Kein Semikolon-CSV – die App erwartet Kommas als Trenner.</li>
              <li>Große Daten bei Bedarf in mehrere Dateien aufteilen.</li>
              <li>Leere Zeilen entfernen – sie werden übersprungen, können aber Fehlermeldungs-Zeilennummern verschieben.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/funktionen"
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY, boxShadow: '0 6px 22px rgba(10,27,64,.25), inset 0 1px 0 rgba(255,255,255,.25)' }}
            >
              Funktionen ansehen
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/90 px-5 py-2 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
            >
              Zur Docs-Übersicht
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
