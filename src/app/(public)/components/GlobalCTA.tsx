'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const PRIMARY = '#0a1b40'

export default function GlobalCTA() {
  return (
    <section className="relative mx-auto mt-16 mb-20 max-w-6xl px-4 sm:px-6">
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/96 p-6 text-center shadow-[0_22px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-10 lg:p-12"
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

        <div className="relative space-y-5 lg:space-y-6">
          {/* Label */}
          <div className="mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/98 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/90 sm:text-[11px]">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
              GLENO
            </span>
            <span>Unternehmenssoftware &amp; Marktplatz</span>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <span className="hidden text-slate-500 sm:inline">
              Online-Beratung &amp; direkter Start möglich
            </span>
          </div>

          {/* Headline – mit Fokus Online-Beratung / Demo */}
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            GLENO in der Online-Beratung kennenlernen
            <span className="mt-1 block text-slate-900">
              – oder direkt ohne Termin starten.
            </span>
          </h2>

          {/* Subline – SEO: Online-Beratung, Demo, CRM, Auftragsverwaltung */}
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
            In einer{" "}
            <strong className="font-semibold text-slate-900">
              persönlichen Online-Beratung
            </strong>{" "}
            schauen wir gemeinsam auf deinen Alltag: Anfragen, Auftragsverwaltung,
            Projekte, Team und Dokumente – alles in GLENO. Wenn du möchtest,
            kannst du GLENO auch{" "}
            <strong className="font-semibold text-slate-900">
              direkt selbst im Browser testen
            </strong>{" "}
            – ohne Wartezeit und ohne Installationen.
          </p>

          {/* Key-Punkte – leicht SEO-getunt */}
          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2.5 text-[10px] font-medium text-slate-600 sm:text-[11px]">
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              Individuelle Online-Beratung &amp; Live-Demo
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              Konkrete Verbesserungsideen für deinen Alltag
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              Start ohne Technik-Setup &amp; ohne IT-Abteilung
            </span>
            <span className="rounded-full bg-white/98 px-3 py-1 ring-1 ring-slate-100">
              DSGVO-konform, Server &amp; Hosting in der EU
            </span>
          </div>

          {/* CTA-Bereich – zwei Optionen, mobil untereinander */}
          <div className="pt-5">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              {/* Primäre Aktion: Online-Beratung buchen */}
              <motion.div
                className="flex-1 sm:flex-none sm:min-w-[220px]"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.18 }}
              >
                <Link
                  href="/beratung"
                  aria-label="Online-Beratung für GLENO buchen"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition hover:shadow-[0_18px_55px_rgba(15,23,42,0.6)] sm:text-sm"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #020817, #0f172a)',
                  }}
                >
                  <span>Online-Beratung buchen</span>
                </Link>
              </motion.div>

              {/* Sekundäre Aktion: Direkt starten (ohne Beratung) */}
              <motion.div
                className="flex-1 sm:flex-none sm:min-w-[220px]"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.18 }}
              >
                <Link
                  href="/registrieren"
                  aria-label="GLENO ohne Beratung direkt starten"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-900 shadow-sm transition hover:bg-white sm:text-sm"
                >
                  <span>Ohne Beratung direkt starten</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Fußnote – optionaler Test, aber nicht mehr im Fokus */}
          <p className="mx-auto max-w-xl text-[9px] leading-relaxed text-slate-500 sm:text-[10px]">
            Du kannst GLENO nach der Online-Beratung oder direkt nach der
            Registrierung in Ruhe testen. Monatlich kündbar, keine
            Installationen, volle Kontrolle über deine Daten.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
