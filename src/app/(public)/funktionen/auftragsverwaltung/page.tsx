// src/app/(public)/auftragsverwaltung/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'Auftragsverwaltung Software – GLENO: Angebote, Aufträge, Rechnungen & Marktplatz',
  description:
    'GLENO ist die moderne Auftragsverwaltung: Angebote erstellen, Aufträge steuern, Aufgaben & Termine planen, Zeiten & Dateien dokumentieren, Rechnungen schreiben – plus integrierter Marktplatz, um neue Aufträge zu erhalten.',
  keywords: [
    'auftragsverwaltung',
    'auftragsverwaltung software',
    'software auftragsverwaltung',
    'software für auftragsverwaltung',
    'auftragsmanagement',
    'angebot & rechnung software',
    'crm auftragsverwaltung',
  ],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/auftragsverwaltung`,
    siteName: SITE_NAME,
    title:
      'Auftragsverwaltung Software – GLENO: Angebote, Aufträge, Rechnungen & Marktplatz',
    description:
      'GLENO bündelt Angebotssoftware, Auftragssteuerung, Aufgaben, Termine, Zeiterfassung, Dokumente und Rechnungen – plus Marktplatz für neue Aufträge.',
    images: [
      {
        url: `${SITE_URL}/og/og-auftragsverwaltung.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – Auftragsverwaltung Software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auftragsverwaltung Software – GLENO',
    description:
      'Angebote, Aufträge, Aufgaben, Termine, Zeiten, Dokumente & Rechnungen – plus Marktplatz für neue Aufträge.',
    images: [`${SITE_URL}/og/og-auftragsverwaltung.jpg`],
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
export default function AuftragsverwaltungPage() {
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
              <span>Auftragsverwaltung</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline">Angebote & Rechnungen</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline">Aufgaben & Termine</span>
            </div>

            <h1 className="font-semibold tracking-tight text-white">
              <span className="block text-[11px] sm:text-[12px] lg:text-[13px] text-sky-300 mb-1">
                Von Chaos zu Klarheit – in einer Woche.
              </span>
              <span className="block text-[26px] leading-tight sm:text-4xl lg:text-[40px]">
                Auftragsverwaltung Software – Angebote, Aufträge, Rechnungen & mehr.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
              GLENO bündelt alles, was du für<strong> Angebot bis Zahlung</strong> brauchst:
              Angebotsvorlagen, Auftragspipeline, Aufgaben & Termine, Zeiterfassung, Dateien,
              <strong> Rechnungen</strong> & Status – plus integrierter <strong>Marktplatz</strong>, um neue Aufträge zu erhalten.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/registrieren"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_70px_rgba(15,23,42,0.98)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_90px_rgba(15,23,42,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                style={{ backgroundColor: PRIMARY }}
              >
                Jetzt kostenlos testen <span className="ml-1.5 text-xs">↗</span>
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
                Neue Aufträge erhalten (Marktplatz)
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                DSGVO-konform & Hosting in der EU
              </span>
              <span>Keine Einrichtungsgebühr</span>
              <span>Monatlich kündbar</span>
              <span>Browserbasiert – Desktop & mobil</span>
            </div>
          </div>

          {/* RIGHT – Outcome Card */}
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700/70 bg-slate-900/90 p-4 text-[9px] shadow-[0_26px_90px_rgba(0,0,0,0.98)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-100">Heute noch Excel & Chat-Wildwuchs?</span>
                <span className="text-[8px] text-slate-500">Doppelte Arbeit • Unklare Zuständigkeiten</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-900/40">
                <div className="h-1.5 w-2/3 rounded-full bg-rose-500" />
              </div>
              <div className="mt-2 flex items-center justify-between text-slate-300">
                <span className="font-semibold text-sky-300">Mit GLENO in 7 Tagen:</span>
                <span className="text-[8px] text-sky-300">Klare Pipeline • Saubere Abrechnung</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-900/40">
                <div className="h-1.5 w-full rounded-full bg-sky-400" />
              </div>
              <p className="mt-2 text-[9px] text-slate-400">
                Angebote, Aufträge, Aufgaben, Zeiten & Rechnungen greifen ineinander. Du siehst sofort,
                was vereinbart ist, wer dran ist und was fakturiert wurde.
              </p>
              <div className="mt-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-[8px] text-slate-300">
                „Wir verschwenden keine Zeit mehr mit Suchen. Alles ist da, wo es hingehört.“
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EFFIZIENZ – Glass */}
      <section
        id="effizienz"
        className="relative overflow-hidden px-5 py-16 text-slate-900 bg-gradient-to-b from-slate-50 via-white to-slate-50"
      >

        <div className="mx-auto max-w-6xl">
          <header className="mx-auto mb-8 max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Effizienz & Wirkung
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[34px]">
              Effiziente Auftragsverwaltung –{' '}
              <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                klare Vorteile, weniger Risiken
              </span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Bündle Angebote, Aufträge, Aufgaben, Zeiten, Dokumente und Rechnungen an einem Ort.
              Weniger Reibung, mehr Tempo – und ein durchgängiger Flow bis zur Zahlung.
            </p>
          </header>

          {/* 3 Glass Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-slate-900/5 px-2.5 py-1 text-[11px] text-slate-700">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Einordnung
              </div>
              <h3 className="text-base font-semibold text-slate-900">Warum strukturieren?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                Auftragsverwaltung ist der rote Faden vom <em>Erstkontakt</em> bis zur <em>Zahlung</em>.
                Je weniger Medienbrüche, desto klarer Zuständigkeiten, Termine und Cashflow.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                Mit GLENO greifen Pipeline, Aufgaben, Dateien, Zeiten und Rechnungen ineinander – ohne ERP-Überladung.
              </p>
            </article>

            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Vorteile
              </div>
              <h3 className="text-base font-semibold text-slate-900">Was du sofort merkst</h3>
              <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700">
                <li>✔ <strong>Schnellere Durchlaufzeiten</strong> – Angebot → Auftrag → Rechnung ohne Reibung.</li>
                <li>✔ <strong>Weniger Fehler</strong> – Vorlagen, Nummernkreise, klare Übergaben.</li>
                <li>✔ <strong>Transparenz im Team</strong> – wer macht was bis wann inkl. Erinnerungen.</li>
                <li>✔ <strong>Bessere Kundenerfahrung</strong> – professioneller Auftritt, Nachweise.</li>
                <li>✔ <strong>Höhere Marge</strong> – Zeiten/Leistungen am Auftrag, Auswertungen & OP-Liste.</li>
                <li>✔ <strong>Mehr Pipeline-Fokus</strong> – Marktplatz liefert passende Anfragen direkt ins System.</li>
              </ul>
            </article>

            <article className="group rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Risiken ohne Struktur
              </div>
              <h3 className="text-base font-semibold text-slate-900">Was dich sonst bremst</h3>
              <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700">
                <li>– <strong>Medienbrüche</strong> (Excel, Mails, Chats) → Doppelarbeit & Zeitverlust.</li>
                <li>– <strong>Versionschaos</strong> bei Angeboten/Verträgen → falsche Abrechnung.</li>
                <li>– <strong>Unklare Zuständigkeiten</strong> → verpasste Deadlines & Nachfragen-Marathon.</li>
                <li>– <strong>Schwacher Cashflow</strong> → fehlende OP-Übersicht & Mahnlogik.</li>
                <li>– <strong>Streuverluste in der Akquise</strong> → viel Aufwand, wenig passende Leads.</li>
              </ul>
            </article>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'ZEITERSPARNIS', value: '30–50 %', sub: 'durch Vorlagen & klare Übergaben' },
              { label: 'WIN-RATE', value: '+15–25 %', sub: 'konsistente Angebote & eSign' },
              { label: 'FEHLERQUOTE', value: '−60–90 %', sub: 'Nummernkreise & OP-Kontrolle' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40"
              >
                <span className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-slate-950/20 blur-2xl" />
                <div className="text-[11px] tracking-wide text-slate-500">{kpi.label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</div>
                <div className="text-[12px] text-slate-600">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Fazit */}
          <div className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-5 text-[13px] leading-relaxed text-slate-700 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40">
            <p>
              Fazit: Effiziente <strong>Auftragsverwaltung</strong> ist die Basis für planbare Umsätze.
              GLENO bietet einen schlanken, durchgängigen Flow – und über den integrierten Marktplatz
              bekommst du zusätzlich passende Anfragen direkt in deine Pipeline.{' '}
              <a href="#markt" className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
                Marktplatz ansehen
              </a>{' '}
              oder{' '}
              <Link href="/registrieren" className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
                kostenlos testen
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="warum" className="px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Wenn du dich hier wiederfindest, passt GLENO.</h2>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Für alle, die wachsen wollen – ohne im Verwaltungschaos zu versinken.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
            {[
              {
                h: '„Zu viele Tools, zu wenig Überblick.“',
                p1: 'Excel, Mails, Chats, PDF-Mappen – niemand hat die Gesamtübersicht.',
                p2: 'GLENO: Eine Oberfläche von Angebot bis Zahlung.',
              },
              {
                h: '„Angebote/Rechnungen sind fehleranfällig.“',
                p1: 'Alte Vorlagen, manuelle Abschriften, Versionschaos.',
                p2: 'GLENO: Vorlagen, Nummernkreise, saubere Übergaben.',
              },
              {
                h: '„Wir brauchen mehr qualifizierte Aufträge.“',
                p1: 'Kaltakquise nervt, Streuverluste sind teuer.',
                p2: 'GLENO: Integrierter Marktplatz – passende Anfragen im System.',
              },
            ].map((b, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60"
              >
                <h3 className="text-sm font-semibold text-slate-900">{b.h}</h3>
                <p className="mt-1 text-slate-600">{b.p1}</p>
                <p className="mt-2 text-sky-800 font-semibold">{b.p2}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKTPLATZ */}
      <section id="markt" className="px-5 py-14 bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-sky-500/15 bg-slate-900/60 px-6 py-6 shadow-[0_26px_80px_rgba(2,6,23,0.9)] backdrop-blur-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-sky-300 border border-sky-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Integrierter Marktplatz
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Nicht nur verwalten – <span className="underline decoration-sky-500/60 underline-offset-4">Aufträge erhalten</span>.
                </h2>
                <p className="text-[13px] sm:text-[14px] text-slate-200/90">
                  Auftraggeber stellen Anfragen ein. Du siehst passende Anfragen direkt in GLENO – ohne Streuverlust,
                  ohne Kaltakquise. Von der Anfrage geht’s mit einem Klick in Angebot, Auftrag und Rechnung.
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-slate-200/90">
                  <li>✔ Qualifizierte Anfragen – passend zu deinen Leistungen</li>
                  <li>✔ Direkte Übergabe in deine Auftrags-Pipeline</li>
                  <li>✔ Faire, transparente Konditionen</li>
                </ul>
                <p className="text-[10px] text-slate-400/90">Ziel: Ein verlässlicher Kanal, der wirklich zu dir passt.</p>
              </div>

              {/* Mini UI Preview */}
              <div className="mt-5 md:mt-0 w-full md:w-64">
                <div className="relative rounded-2xl border border-sky-500/20 bg-slate-950/80 px-3 py-3 text-[9px] text-slate-200/90 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-[8px] text-sky-300">
                      Vorschau: Anfragen in GLENO
                    </span>
                    <span className="text-[8px] text-slate-500">deine Kategorien</span>
                  </div>
                  {[
                    { t: 'Projekt A · Umsetzung in 14 Tagen', badge: 'passend', badgeClass: 'bg-sky-500/15 text-sky-300' },
                    { t: 'Projekt B · Angebot erbeten', badge: 'geprüft', badgeClass: 'bg-emerald-500/10 text-emerald-300' },
                    { t: 'Projekt C · Angebot gesendet', badge: 'im System', badgeClass: 'bg-slate-800 text-slate-300' },
                  ].map((r, i) => (
                    <div
                      key={i}
                      className="mb-1.5 flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/80 px-2 py-1.5 last:mb-0"
                    >
                      <div>
                        <div className="text-[8px] text-slate-400">{i === 2 ? 'Pipeline' : 'Neue Anfrage'}</div>
                        <div className="text-[9px] text-slate-50">{r.t}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] ${r.badgeClass}`}>{r.badge}</span>
                    </div>
                  ))}
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
              {/* /Mini UI Preview */}
            </div>
          </div>
        </div>
      </section>

{/* FEATURES */}
<section id="funktionen" className="bg-slate-50 px-5 py-14 text-slate-900">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
      Aufträge, Kunden & Team – alles in einem Flow.
    </h2>
    <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
      Keine ERP-Überladung, kein Gebastel. GLENO bündelt Auftragssteuerung, CRM, KI-Angebote,
      Projektplanung, Zeiterfassung, Kalender und Rechnungen in einer Oberfläche.
    </p>

    {/* Row 1 */}
    <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
      {/* CRM & Kundenmanagement */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">Kunden- & Auftragsmanagement</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ Zentrale Kundenakte mit Kontakten, Historie & Dokumenten</li>
          <li>✔ Angebote, Aufträge, Aufgaben & Termine je Kunde im Überblick</li>
          <li>✔ Klare Zuständigkeiten & Status – vom Lead bis zur Zahlung</li>
        </ul>
      </div>

      {/* KI-Angebote & Pipeline */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">KI-Angebote & Auftrags-Pipeline</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ KI erstellt automatisch Angebotsentwürfe auf Basis deiner Vorlagen</li>
          <li>✔ Versionshistorie & 1-Klick-Umwandlung in Aufträge</li>
          <li>✔ Pipeline: Anfrage → Angebot → Beauftragt → Abgeschlossen</li>
        </ul>
      </div>

      {/* Projektplanung */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">Projektplanung & Aufgaben</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ Checklisten, Meilensteine & Verantwortlichkeiten pro Auftrag</li>
          <li>✔ Prioritäten, Fälligkeiten & Erinnerungen</li>
          <li>✔ Dateien & Notizen direkt am Schritt</li>
        </ul>
      </div>
    </div>

    {/* Row 2 */}
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 text-[13px]">
      {/* Mitarbeitermanagement & Kalender */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">Mitarbeitermanagement & Kalender</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ Team-Profile, Rollen & Verfügbarkeit</li>
          <li>✔ Termin- & Teamkalender (vor Ort, Telefon, Video)</li>
          <li>✔ Zuteilung von Aufgaben/Terminen an Mitarbeitende</li>
        </ul>
      </div>

      {/* Zeiterfassung */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">Zeiterfassung & Leistungen</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ Zeiten je Auftrag/Position – mobil & im Büro</li>
          <li>✔ Auswertungen, Kosten-/Leistungs-Transparenz</li>
          <li>✔ Grundlage für Abrechnung & Nachkalkulation</li>
        </ul>
      </div>

      {/* Rechnungen */}
      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl ring-1 ring-white/60">
        <h3 className="text-sm font-semibold text-slate-900">Rechnungen & OP-Liste</h3>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>✔ Nummernkreise, Skonto, Teil-/Abschlags- & Schlussrechnungen</li>
          <li>✔ PDF-Export, Zahlungseingänge, Mahnstufen & Status</li>
          <li>✔ Optional: E-Rechnung/XRechnung (vorbereitet)</li>
        </ul>
      </div>
    </div>
  </div>
</section>


{/* SCREENS – identische Bilder wie auf den anderen Landingpages */}
<section id="screens" className="px-5 py-14 text-slate-900">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ein Blick in GLENO.</h2>
    <p className="mt-2 text-sm sm:text-[15px] text-slate-600">Klick auf einen Screenshot, um ihn groß zu sehen.</p>

    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Shot
        id="shot-dashboard"
        src="/app-dashboard-gesamtueberblick.png"
        alt="GLENO Dashboard – Gesamtüberblick"
        caption="Alle Aufträge/Kunden & offene Vorgänge im Blick"
      />
      <Shot
        id="shot-angebote-ki"
        src="/app-angebote-ki-assistent.png"
        alt="GLENO – Angebote mit KI-Assistent"
        caption="Standardisierte Angebote in Minuten statt Stunden"
      />
      <Shot
        id="shot-rechnungen"
        src="/app-rechnungen-offene-posten.png"
        alt="GLENO – Rechnungen & offene Posten"
        caption="Wiederkehrende Rechnungen & OP-Liste sauber im System"
      />
      <Shot
        id="shot-kundenakte"
        src="/app-kundenakte-projektverlauf.png"
        alt="GLENO – Kundenakte & Projektverlauf"
        caption="Verträge, Dokumente & Historie je Kunde/Objekt"
      />
      <Shot
        id="shot-zeiten"
        src="/app-zeiterfassung-einsaetze.png"
        alt="GLENO – Zeiterfassung & Einsätze"
        caption="Zeiten & Leistungen nachvollziehbar dokumentieren"
      />
      <Shot
        id="shot-anfragen"
        src="/app-anfragen-uebersicht.png"
        alt="GLENO – Anfragen & Marktplatz-Integration"
        caption="Anfragen & Leads direkt in GLENO bearbeiten"
      />
    </div>
  </div>
</section>

      {/* BEWERTUNGEN (unten) – mit Top-Abstand und Glass-Look */}
<section id="bewertungen" className="bg-slate-50 px-5 pt-16 pb-16 text-slate-900">
  <div className="mx-auto max-w-6xl">
    <div className="mb-6 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] text-slate-600 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Bewertungen
      </span>
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">So wirkt GLENO bei Teams im Alltag.</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-[15px] text-slate-600">
        Auszüge aus Pilotprojekten. Fokus: weniger Reibung, mehr Abschlussquote und saubere Abrechnung.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[
        {
          stars: 5,
          quote:
            '„Wir haben unsere Angebotszeiten halbiert und gewinnen spürbar mehr Deals. Templates und Vorlagen zahlen sich aus.“',
          meta: 'Projektservices · 18 Mitarbeitende',
        },
        {
          stars: 5,
          quote:
            '„Der Überblick über Aufgaben & Fälligkeiten ist Gold wert. Keine vergessenen To-dos, keine Doppelarbeit mehr.“',
          meta: 'Dienstleister · 9 Mitarbeitende',
        },
        {
          stars: 5,
          quote:
            '„Rechnungen & OP-Liste sind endlich konsistent. Cashflow ist planbar, Mahnstufen klar.“',
          meta: 'Agentur · 12 Mitarbeitende',
        },
      ].map((t, i) => (
        <figure
          key={i}
          className="relative flex h-full flex-col justify-between rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-lg shadow-slate-200/40"
        >
          <div className="mb-2 text-[12px] text-amber-500">{'★★★★★'.slice(0, t.stars)}</div>
          <blockquote className="text-[14px] text-slate-900">{t.quote}</blockquote>
          <figcaption className="mt-3 text-[12px] text-slate-500">{t.meta}</figcaption>
        </figure>
      ))}
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
