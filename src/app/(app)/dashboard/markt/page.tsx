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
  const firstPartnerId = useMemo(
    () => myPartners[0]?.id || '',
    [myPartners]
  )
  const publicPartnerHref = hasPartner
    ? `/markt/partner/${firstPartnerId}`
    : ''

  return (
    <div className={shellBg}>
      {/* HERO */}
      <section
        className={`${cardBase} relative mb-6 overflow-hidden px-5 py-5 sm:px-6 sm:py-6`}
      >
        {/* Soft Glow im Hintergrund */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl
          bg-[radial-gradient(900px_260px_at_-10%_-40%,rgba(15,23,42,0.07),transparent_70%),radial-gradient(900px_260px_at_110%_140%,rgba(15,23,42,0.09),transparent_70%)]"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
              <Squares2X2Icon className="h-3.5 w-3.5 text-slate-900" />
              <span>GLENO Markt</span>
              <span className="hidden text-slate-400 sm:inline">•</span>
              <span className="hidden text-slate-500 sm:inline">
                Anfragen finden, bewerben, abschließen – alles an einem Ort.
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Dein Einstieg in Anfragen, Bewerbungen & Chats.
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Sie sehen hier alle Einstiegspunkte in den GLENO Markt:
              öffentliche Anfragen, aktive Matches, Bewerbungen und
              Konversationen – klar strukturiert in einem ruhigen Interface.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
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
      </section>

      {/* Hinweis: Partnerprofil fehlt */}
      {!partnersLoading && !hasPartner && (
        <section className="mb-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-[0_6px_22px_rgba(251,191,36,0.22)]">
            <div className="flex items-start gap-2">
              <UserCircleIcon className="mt-0.5 h-5 w-5 text-amber-500" />
              <p>
                Sie haben noch <b>kein Partnerprofil</b>. Legen Sie zuerst Ihr
                Profil an, um sich auf Markt-Anfragen bewerben zu können.
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
      <section className={`${cardBase} px-5 py-5 sm:px-6 sm:py-6`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Schnellzugriff
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Wählen Sie direkt den passenden Bereich: Anfragen prüfen,
              Bewerbungen verwalten, Chats fortsetzen oder Ihr Partnerprofil
              öffnen.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            title="Aktive Anfragen"
            desc="Ihre laufenden Matches & Vorgänge im Überblick."
            href="/dashboard/markt/aktive-anfragen"
          />
          <QuickLink
            title="Alle Anfragen"
            desc="Offene Markt-Anfragen entdecken und filtern."
            href="/dashboard/markt/anfragen"
          />
          <QuickLink
            title="Bewerbungen"
            desc="Gesendete & erhaltene Bewerbungen übersichtlich verwalten."
            href="/dashboard/markt/bewerbungen"
          />
          <QuickLink
            title="Chats"
            desc="Konversationen zu Anfragen, Angeboten & Aufträgen."
            href="/dashboard/markt/chat"
          />
          <QuickLink
            title="Nachrichten"
            desc="Systemnachrichten & Updates von GLENO Markt."
            href="/dashboard/markt/nachrichten"
          />

          {hasPartner ? (
            <>
              <QuickLink
                title="Partnerprofil (öffentlich)"
                desc="So sehen Interessenten Ihr Profil im Markt."
                href={publicPartnerHref}
              />
              <QuickLink
                title="Partnerprofil bearbeiten"
                desc="Firmendaten, Leistungen & Regionen anpassen."
                href="/dashboard/markt/partner-bearbeiten"
              />
            </>
          ) : (
            <QuickLink
              title="Partner werden"
              desc="Profil anlegen & qualifizierte Anfragen erhalten."
              href="/dashboard/markt/partner-werden"
            />
          )}
        </div>
      </section>
    </div>
  )
}

function QuickLink({
  title,
  desc,
  href,
}: {
  title: string
  desc: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="
        group relative flex flex-col justify-between
        rounded-2xl border border-white/70 bg-white/82
        px-4 py-4
        text-sm text-slate-800
        ring-1 ring-white/70 backdrop-blur-xl
        shadow-[0_4px_18px_rgba(15,23,42,0.06)]
        hover:bg-white hover:shadow-[0_8px_28px_rgba(15,23,42,0.10)]
        hover:ring-slate-200 transition
      "
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-slate-900">{title}</div>
          <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition" />
        </div>
        <div className="mt-1 text-xs sm:text-[13px] text-slate-600">
          {desc}
        </div>
      </div>
      <div className="mt-3 text-[11px] font-medium text-slate-500 group-hover:text-slate-800 group-hover:underline underline-offset-4">
        Öffnen
      </div>
    </Link>
  )
}
