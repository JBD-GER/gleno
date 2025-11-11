'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const PRIMARY = '#0a1b40'

export default function GlobalCTA() {
  return (
    <section className="relative mx-auto mt-16 mb-20 max-w-6xl px-4 sm:px-6">
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/96 p-8 text-center shadow-[0_22px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-12"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Pulsierender Kreis zentriert IN der Box */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.09),transparent_70%)]"
          animate={{ opacity: [0.25, 0.8, 0.25], scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Feiner Lichtstreifen oben (bleibt in der Card) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/90 to-transparent"
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative space-y-4">
          {/* Label */}
          <div className="mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/98 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/90">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
              GLENO
            </span>
            <span>CRM</span>
            <span className="text-slate-300">•</span>
            <span>Website</span>
            <span className="text-slate-300">•</span>
            <span>Marktplatz</span>
            <span className="hidden text-slate-500 sm:inline">
              | Ein Login. Deine komplette Wertschöpfung.
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Du willst weniger Chaos
            <span className="block text-slate-900">
              und mehr Klarheit im Alltag?
            </span>
          </h2>

          {/* Subline */}
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
            GLENO bündelt Anfragen, Angebote, Projekte, Mitarbeiter, Dokumente und deine Website
            in einem ruhigen, aufgeräumten System. Kein Tool-Hopping, keine Zettel, kein Stress.
          </p>

          {/* Key-Punkte */}
          <div className="mx-auto mt-3 flex flex-wrap justify-center gap-3 text-[10px] font-medium text-slate-600 sm:text-[11px]">
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              In Minuten startklar
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              7 Tage kostenlos testen
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              Keine Kreditkarte nötig
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              Server &amp; Hosting in der EU
            </span>
          </div>

          {/* CTA */}
          <div className="pt-5">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.18 }}
            >
              <Link
                href="/registrieren"
                aria-label="Starte kostenlos mit GLENO"
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition hover:shadow-[0_18px_55px_rgba(15,23,42,0.6)] sm:text-sm"
                style={{
                  backgroundImage: 'linear-gradient(to right, #020817, #0f172a)',
                }}
              >
                <span>Starte kostenlos</span>
              </Link>
            </motion.div>
          </div>

          <p className="text-[9px] text-slate-500 sm:text-[10px]">
            Monatlich kündbar. Keine Einrichtungsgebühr. Volle Kontrolle ab Tag eins.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
