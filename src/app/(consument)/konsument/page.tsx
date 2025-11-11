// src/app/konsument/page.tsx
import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default function KonsumentHome() {
  return (
    <section className="space-y-6">
      {/* Hero / Willkommen */}
      <div
        className="rounded-3xl border border-white/60 bg-white/90 px-4 py-5 shadow-[0_10px_34px_rgba(15,23,42,0.06)]
                   backdrop-blur-xl ring-1 ring-white/60 sm:px-6 sm:py-6"
      >
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Willkommen im Konsumentenbereich 👋
        </h1>
        <p className="mt-2 text-sm text-slate-700 sm:text-[15px]">
          Hier behältst du deine Anfragen, Antworten von Partnern, Chats, Termine und Aufträge im Blick.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {/* Primärer CTA: neue Anfrage */}
          <Link
            href="/konsument/anfragen/anfrage-erstellen"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium
                       text-white shadow hover:opacity-90"
          >
            Neue Anfrage stellen
            <ArrowRightIcon className="h-4 w-4" />
          </Link>

          {/* Sekundär: aktuelle Anfragen */}
          <Link
            href="/konsument/aktive-anfragen"
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white px-4 py-2
                       text-sm font-medium text-slate-900 shadow-sm hover:border-slate-900/25 hover:shadow"
          >
            Aktive Anfragen ansehen
          </Link>

          {/* Sekundär: alle Anfragen */}
          <Link
            href="/konsument/anfragen"
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white px-4 py-2
                       text-sm text-slate-800 shadow-sm hover:border-slate-900/25 hover:shadow"
          >
            Verlauf & Archiv
          </Link>
        </div>
      </div>

      {/* Info-Kacheln */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Schnellstart */}
        <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Schnellstart
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            In wenigen Schritten zur passenden Anfrage
          </div>
          <ul className="mt-2 space-y-1.5 pl-4 text-xs text-slate-700 sm:text-sm list-disc">
            <li>Beschreibe dein Anliegen kurz & klar.</li>
            <li>Erhalte passende Partnerangebote direkt im Chat.</li>
            <li>Verwalte Termine, Aufträge & Dokumente zentral.</li>
          </ul>
          <div className="mt-3">
            <Link
              href="/konsument/anfragen/anfrage-erstellen"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:underline"
            >
              Anfrage jetzt starten
              <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Wichtige Bereiche */}
        <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Deine Übersicht
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            Schnellzugriff auf die wichtigsten Funktionen
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-700 sm:text-sm">
            <Link
              href="/konsument/aktive-anfragen"
              className="rounded-xl bg-white/90 px-3 py-1.5 shadow-sm hover:bg-white"
            >
              Aktive Anfragen & laufende Fälle
            </Link>
            <Link
              href="/konsument/anfragen"
              className="rounded-xl bg-white/90 px-3 py-1.5 shadow-sm hover:bg-white"
            >
              Alle vergangenen Anfragen & Angebote
            </Link>
            <Link
              href="/konsument/profil"
              className="rounded-xl bg-white/90 px-3 py-1.5 shadow-sm hover:bg-white"
            >
              Profil & Kontaktdaten verwalten
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
