// src/app/(public)/beratung-danke/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'

export const metadata: Metadata = {
  title: 'Vielen Dank für Ihre Buchung | GLENO',
  description:
    'Vielen Dank für Ihr Vertrauen in GLENO. Ihre Beratung wurde erfolgreich gebucht – wir melden uns mit allen Details per E-Mail.',
  alternates: {
    canonical: `${SITE_URL}/beratung-danke`,
  },
}

export default function BeratungDankePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        {/* Back-Link oben */}
        <div className="mb-6 w-full max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-400 hover:text-slate-200"
          >
            <span className="grid h-5 w-5 place-content-center rounded-full bg-slate-800 text-[10px] text-slate-200">
              ←
            </span>
            <span>Zurück zur Startseite</span>
          </Link>
        </div>

        {/* Hauptkarte */}
        <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur sm:p-7">
          {/* Status-Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-[11px]">
              ✓
            </span>
            <span>Beratung erfolgreich gebucht</span>
          </div>

          {/* Headline */}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 sm:text-[26px]">
            Vielen Dank für Ihr Vertrauen in GLENO.
          </h1>

          {/* Intro-Text */}
          <p className="mt-3 text-sm leading-relaxed text-slate-200/90 sm:text-[15px]">
            Ihre Zoom-Beratung wurde erfolgreich gebucht. In Kürze erhalten Sie
            eine E-Mail mit:
          </p>

          <ul className="mt-3 space-y-1.5 text-sm text-slate-200/95">
            <li>• der Bestätigung Ihres Termins,</li>
            <li>• dem Link zum Zoom-Meeting und</li>
            <li>• einem Kalendereintrag für Ihr System.</li>
          </ul>

          <p className="mt-4 text-sm leading-relaxed text-slate-200/90">
            Schauen Sie bitte auch in Ihrem{' '}
            <span className="font-medium text-slate-50">
              Spam- oder Werbeordner
            </span>
            , falls innerhalb weniger Minuten nichts ankommt. Sollte etwas nicht
            passen, können wir den Termin jederzeit gemeinsam verschieben.
          </p>

          {/* Ablauf-Box */}
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-200 shadow-inner sm:px-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-300">
              Wie läuft die Beratung ab?
            </h2>
            <ol className="mt-2 space-y-1 text-[13px] text-slate-300/95">
              <li>
                1. Wir schauen uns kurz Ihre aktuelle Situation, Tools und
                Abläufe an.
              </li>
              <li>
                2. Gemeinsam identifizieren wir 2–3 Bereiche, in denen GLENO
                sofort entlasten kann.
              </li>
              <li>
                3. Sie erhalten einen klaren Vorschlag, wie ein möglicher Start
                mit GLENO in Ihrem Unternehmen aussehen könnte.
              </li>
            </ol>
          </div>

          {/* CTA unten */}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_16px_55px_rgba(0,0,0,0.95)] hover:shadow-[0_20px_75px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Zur GLENO Startseite
              <span className="ml-1.5 text-[11px]">↗</span>
            </Link>
            <p className="text-[11px] text-slate-400">
              Bis zum Gespräch können Sie GLENO schon einmal entdecken oder
              diese Seite an Kolleg:innen weiterleiten.
            </p>
          </div>
        </section>

        {/* kleiner Footer-Satz */}
        <p className="mt-6 text-center text-[11px] text-slate-500">
          Danke für Ihr Vertrauen – GLENO ist dafür da, Ihren
          Unternehmensalltag ruhiger und klarer zu machen.
        </p>
      </div>
    </main>
  )
}
