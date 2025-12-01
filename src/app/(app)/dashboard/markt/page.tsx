'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Squares2X2Icon,
  ArrowRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  InboxArrowDownIcon,
  UserPlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#e8edf5]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/80 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(2,6,23,0.07)] ring-1 ring-white/70'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 ' +
  'backdrop-blur-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 ' +
  'shadow-sm hover:bg-white hover:shadow-md transition'

const btnPrimary =
  'inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3.5 py-2 ' +
  'text-xs sm:text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] ' +
  'hover:bg-slate-950 hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition ' +
  'disabled:opacity-50 disabled:shadow-none'

type MyPartner = {
  id: string
  status: string
  display_name: string | null
  company_name: string | null
  branch_id: string | null
  city: string | null
}

export default function MarktUebersichtPage() {
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [myPartners, setMyPartners] = useState<MyPartner[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      setPartnersLoading(true)
      try {
        const res = await fetch('/api/partners/mine', { cache: 'no-store' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'load_failed')
        if (!canceled) setMyPartners((j?.partners || []) as MyPartner[])
      } catch {
        if (!canceled) setMyPartners([])
      } finally {
        if (!canceled) setPartnersLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const hasPartner = useMemo(() => myPartners.length > 0, [myPartners])
  const firstPartnerId = useMemo(() => myPartners[0]?.id || '', [myPartners])
  const publicPartnerHref = hasPartner ? `/markt/partner/${firstPartnerId}` : ''

  return (
    <main className={shellBg}>
      {/* alles volle Breite, kein max-w / mx-auto */}
      <div className="flex flex-col gap-6 w-full">
        {/* HERO / Orientierung */}
        <section className={`${cardBase} relative overflow-hidden w-full`}>
          {/* Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_260px_at_-10%_-40%,rgba(15,23,42,0.07),transparent_70%),radial-gradient(900px_260px_at_110%_140%,rgba(15,23,42,0.09),transparent_70%)]"
          />

          <div className="relative flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 ring-1 ring-white/80 backdrop-blur">
                  <Squares2X2Icon className="h-3.5 w-3.5 text-slate-900" />
                  <span>Dashboard</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-900">GLENO Markt</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/markt/anfragen" className={btnGhost}>
                  <InboxArrowDownIcon className="h-4 w-4" />
                  <span>Alle Anfragen</span>
                </Link>
                <Link
                  href="/dashboard/markt/aktive-anfragen"
                  className={btnPrimary}
                >
                  <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
                  <span>Aktive Anfragen</span>
                </Link>
              </div>
            </div>

            {/* Titel + Erklärung */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between w-full">
              {/* Textblock – volle Breite, keine max-w */}
              <div className="space-y-2 w-full sm:w-2/3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  GLENO Markt – hier landen Ihre neuen Aufträge.
                </h1>
                <p className="text-sm text-slate-600 sm:text-[15px]">
                  In diesem Bereich steuern Sie alles rund um eingehende Anfragen:
                  Sie finden neue Aufträge, bewerben sich als Partner, führen Chats und
                  behalten laufende Vorgänge im Blick. Denken Sie an den GLENO Markt
                  als Ihren zentralen Lead- & Auftrags-Hub.
                </p>
              </div>

              {/* Schritte – auch volle Breite, aber im Flex rechts angeordnet */}
              <div className="mt-1 w-full sm:w-1/3 rounded-2xl bg-white/90 p-3 text-xs text-slate-700 ring-1 ring-white/80 backdrop-blur sm:mt-0">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  In 3 Schritten zum Auftrag
                </p>
                <ol className="space-y-1.5">
                  <li className="flex gap-2">
                    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      1
                    </span>
                    <span>
                      <span className="font-medium">Partnerprofil anlegen</span>{' '}
                      (Leistungen, Regionen & Firma hinterlegen).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      2
                    </span>
                    <span>
                      <span className="font-medium">
                        Auf passende Anfragen bewerben
                      </span>{' '}
                      und Konditionen anbieten.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      3
                    </span>
                    <span>
                      <span className="font-medium">
                        Im Chat abstimmen & Auftrag abschließen
                      </span>{' '}
                      – alles direkt in GLENO.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Markt-Status Hinweis (rote Box) */}
        <section className="w-full">
          <div className="flex flex-col gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/95 px-4 py-3 text-sm text-rose-900 shadow-[0_6px_22px_rgba(244,63,94,0.28)]">
            <p className="text-xs font-semibold tracking-wide uppercase text-rose-700">
              Hinweis: GLENO Markt im Aufbau
            </p>
            <p>
              Der GLENO Markt ist aktuell noch nicht zu{' '}
              <span className="font-semibold">100&nbsp;% aktiv</span>. Wir befinden
              uns in der Aufbauphase und gewinnen derzeit weitere{' '}
              <span className="font-semibold">Betriebe und Unternehmen</span> für den Marktplatz.
            </p>
            <p>
              Sobald in einer Branche mindestens{' '}
              <span className="font-semibold">10 aktive Partner</span> registriert sind,
              starten wir gezielte <span className="font-semibold">Werbekampagnen</span>,
              um neue Anfragen in den jeweiligen Regionen zu generieren.
            </p>
            <p className="text-xs text-rose-800">
              Tipp: Legen Sie Ihr Partnerprofil frühzeitig an – so sind Sie von Anfang an sichtbar,
              sobald die ersten Kampagnen starten.
            </p>
          </div>
        </section>

        {/* Hinweis: Partnerprofil fehlt */}
        {!partnersLoading && !hasPartner && (
          <section className="w-full">
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-[0_6px_22px_rgba(251,191,36,0.22)]">
              <div className="flex items-start gap-2">
                <UserCircleIcon className="mt-0.5 h-5 w-5 text-amber-500" />
                <p>
                  Sie haben noch <b>kein Partnerprofil</b>. Legen Sie zuerst Ihr Profil an,
                  um sich auf Markt-Anfragen bewerben und als offizieller GLENO Partner
                  gelistet werden zu können.
                </p>
              </div>
              <div>
                <Link
                  href="/dashboard/markt/partner-werden"
                  className={`${btnPrimary} inline-flex`}
                >
                  <UserPlusIcon className="h-4 w-4" />
                  <span>Partnerprofil anlegen</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Schnellzugriff */}
        <section className={`${cardBase} px-5 py-5 sm:px-6 sm:py-6 w-full`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full">
              <h2 className="text-base font-semibold text-slate-900">
                Wohin möchten Sie jetzt?
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Alle wichtigen Markt-Bereiche auf einen Blick. Ideal, wenn Sie
                schnell wissen wollen: <span className="font-medium">Wo finde ich was?</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 w-full">
            <QuickLink
              title="Aktive Anfragen"
              desc="Ihre laufenden Matches & Vorgänge im Überblick."
              href="/dashboard/markt/aktive-anfragen"
              tag="Tägliche Arbeit"
            />
            <QuickLink
              title="Alle Anfragen"
              desc="Offene Markt-Anfragen entdecken und mit Filtern eingrenzen."
              href="/dashboard/markt/anfragen"
            />
            <QuickLink
              title="Bewerbungen"
              desc="Gesendete & erhaltene Bewerbungen strukturiert verwalten."
              href="/dashboard/markt/bewerbungen"
            />
            <QuickLink
              title="Chats"
              desc="Konversationen zu Anfragen, Angeboten & Aufträgen fortsetzen."
              href="/dashboard/markt/chat"
            />

            {hasPartner ? (
              <>
                <QuickLink
                  title="Partnerprofil (öffentlich)"
                  desc="So wird Ihr Unternehmen im Markt für Interessenten dargestellt."
                  href={publicPartnerHref}
                />
                <QuickLink
                  title="Partnerprofil bearbeiten"
                  desc="Firmendaten, Leistungen & Regionen jederzeit anpassen."
                  href="/dashboard/markt/partner-bearbeiten"
                  tag="Verwaltung"
                />
              </>
            ) : (
              <QuickLink
                title="Partner werden"
                desc="Profil anlegen und automatisch für passende Anfragen vorgeschlagen werden."
                href="/dashboard/markt/partner-werden"
                tag="Startpunkt"
              />
            )}
          </div>
        </section>

        {/* Erklär-Section: Markt verstehen */}
        <section className={`${cardBase} px-5 py-5 sm:px-6 sm:py-6 w-full`}>
          <h2 className="text-base font-semibold text-slate-900">
            Wie ordnet sich der GLENO Markt in Ihr Tagesgeschäft ein?
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Wenn Sie sich fragen <i>„Wo bin ich hier und was soll ich tun?“</i>, hilft
            dieser kurze Überblick. Die Bereiche in der Seitenleiste gehören immer zu
            einem der folgenden drei Schritte:
          </p>

          <ol className="mt-4 grid gap-4 text-sm sm:grid-cols-3 w-full">
            <li className="rounded-2xl bg-white/90 p-3 ring-1 ring-white/80 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Schritt 1 · Sichtbar werden
              </p>
              <p className="mt-1 text-sm text-slate-800">
                <span className="font-medium">Partnerprofil anlegen & pflegen.</span>{' '}
                Unter <b>„Partner werden / Partnerprofil bearbeiten“</b> definieren Sie,
                welche Leistungen Sie anbieten und in welchen Regionen Sie Anfragen
                wünschen.
              </p>
            </li>
            <li className="rounded-2xl bg-white/90 p-3 ring-1 ring-white/80 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Schritt 2 · Aufträge finden
              </p>
              <p className="mt-1 text-sm text-slate-800">
                In <b>„Alle Anfragen“</b> entdecken Sie offene Markt-Anfragen.
                Über <b>„Bewerbungen“</b> sehen Sie, wo Sie sich bereits gemeldet haben
                und wie der Status ist.
              </p>
            </li>
            <li className="rounded-2xl bg-white/90 p-3 ring-1 ring-white/80 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Schritt 3 · Abwickeln & nachhalten
              </p>
              <p className="mt-1 text-sm text-slate-800">
                Unter <b>„Aktive Anfragen“</b> und im Bereich <b>„Chats“</b> klären Sie
                Details, stimmen sich mit Interessenten ab und bringen Anfragen zum
                Abschluss – später fließen diese Vorgänge in Angebote, Aufträge &amp;
                Rechnungen über.
              </p>
            </li>
          </ol>
        </section>
      </div>
    </main>
  )
}

/* ----------------- QuickLink-Kachel ----------------- */

function QuickLink({
  title,
  desc,
  href,
  tag,
}: {
  title: string
  desc: string
  href: string
  tag?: string
}) {
  return (
    <Link
      href={href}
      className="
        group relative flex flex-col justify-between
        rounded-2xl border border-white/70 bg-white/82
        px-4 py-4
        text-sm text-slate-8
        ring-1 ring-white/70 backdrop-blur-xl
        shadow-[0_4px_18px_rgba(15,23,42,0.06)]
        hover:bg-white hover:shadow-[0_8px_28px_rgba(15,23,42,0.10)]
        hover:ring-slate-200 transition
        w-full
      "
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 font-medium text-slate-900">
            <span className="truncate">{title}</span>
          </div>
          <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-slate-400 transition group-hover:text-slate-700" />
        </div>
        {tag && (
          <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {tag}
          </div>
        )}
        <div className="mt-2 text-xs sm:text-[13px] text-slate-600">
          {desc}
        </div>
      </div>
      <div className="mt-3 text-[11px] font-medium text-slate-500 group-hover:text-slate-800 group-hover:underline underline-offset-4">
        Bereich öffnen
      </div>
    </Link>
  )
}
