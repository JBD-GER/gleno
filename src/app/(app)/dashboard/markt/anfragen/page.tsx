'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  UserCircleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(2,6,23,0.06)] ring-1 ring-white/70'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-xl px-3 py-2 text-xs sm:text-sm text-slate-900 ' +
  'shadow-sm hover:bg-white hover:shadow-md transition'

const btnPrimary =
  'inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3.5 py-2 ' +
  'text-xs sm:text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] ' +
  'hover:bg-slate-950 hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition ' +
  'disabled:opacity-50 disabled:shadow-none'

const filterChipBase =
  'px-3 py-1 rounded-full text-[10px] sm:text-xs border transition'
const filterChipActive =
  `${filterChipBase} bg-slate-900 text-white border-slate-900 shadow-sm`
const filterChipInactive =
  `${filterChipBase} bg-white/90 text-slate-800 border-white/70 hover:bg-white`

type Item = {
  id: string
  title: string
  status: string
  city: string | null
  zip: string | null
  applications_count: number
  created_at: string
  is_active: boolean
}

type Branch = {
  id: string
  name: string
  slug: string
}

type ApiResponse = {
  partner_id: string
  branches: Branch[]
  selected_branch: string | 'all'
  items: Item[]
  error?: string
}

export default function PartnerRequestsPage() {
  const sp = useSearchParams()
  const partnerId = sp.get('partner_id') || ''

  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string | 'all'>('all')
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string>('')

  const mountedRef = useRef(true)
  const reqSeqRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function fetchList(nextBranch?: string | 'all') {
    const seq = ++reqSeqRef.current
    const branch = (nextBranch ?? selectedBranch) || 'all'

    if (mountedRef.current) {
      setLoading(true)
      setError('')
      setSelectedBranch(branch)
    }

    try {
      const params = new URLSearchParams()
      if (partnerId) params.set('partner_id', partnerId)
      if (branch && branch !== 'all') params.set('branch', branch)

      const url = `/api/partners/requests${
        params.toString() ? `?${params.toString()}` : ''
      }`

      const res = await fetch(url, { cache: 'no-store' })
      const j: ApiResponse = await res.json()

      if (!res.ok) throw new Error(j?.error || 'load_failed')

      if (mountedRef.current && seq === reqSeqRef.current) {
        setBranches(Array.isArray(j.branches) ? j.branches : [])
        setSelectedBranch(j.selected_branch || branch || 'all')
        setItems(Array.isArray(j.items) ? j.items : [])
      }
    } catch (e: any) {
      if (mountedRef.current && seq === reqSeqRef.current) {
        setError(e?.message || 'Fehler beim Laden')
      }
    } finally {
      if (mountedRef.current && seq === reqSeqRef.current) {
        setLoading(false)
      }
    }
  }

  // Initial + bei partnerId-Wechsel
  useEffect(() => {
    fetchList('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId])

  const currentBranchLabel = (() => {
    if (!branches.length) return ''
    if (selectedBranch === 'all') {
      return branches.length > 1 ? 'alle deine Branchen' : branches[0]?.name
    }
    return branches.find((b) => b.slug === selectedBranch)?.name || ''
  })()

  const isNoPartnerError = error === 'no_partner_found'

  return (
    <div className={shellBg}>
      {/* HERO */}
      <section
        className={`${cardBase} relative mb-6 overflow-hidden px-4 sm:px-5 py-4 sm:py-5`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl
          bg-[radial-gradient(900px_260px_at_-10%_-40%,rgba(15,23,42,0.05),transparent_70%),radial-gradient(900px_260px_at_110%_140%,rgba(15,23,42,0.07),transparent_70%)]"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
              <span>GLENO Markt</span>
              <span className="text-slate-300">•</span>
              <span>Eingehende Anfragen</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Eingehende Anfragen für deine Partnerprofile.
            </h1>
            <p className="max-w-3xl text-xs sm:text-sm text-slate-600">
              Es werden nur aktive, passende Markt-Anfragen angezeigt.
              Deaktivierte oder gelöschte Anfragen können nicht mehr geöffnet
              werden.
            </p>
            <p className="text-[10px] text-slate-500">
              Gefiltert nach{' '}
              <span className="font-medium">
                {currentBranchLabel || 'deinen Branchen'}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <button onClick={() => fetchList()} className={btnGhost}>
              Aktualisieren
            </button>
          </div>
        </div>
      </section>

      {/* Hinweis: Kein Partnerprofil vorhanden */}
      {!loading && isNoPartnerError && (
        <section className="mb-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-[0_6px_22px_rgba(251,191,36,0.22)]">
            <div className="flex items-start gap-2">
              <UserCircleIcon className="mt-0.5 h-5 w-5 text-amber-500" />
              <p>
                Du hast noch <b>kein Partnerprofil</b>. Lege zuerst dein Profil
                an, um passende Markt-Anfragen zu erhalten und dich darauf
                bewerben zu können.
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

      {/* FILTER + LISTE – nur anzeigen, wenn ein Partnerprofil existiert
          (also NICHT bei no_partner_found) */}
      {!isNoPartnerError && (
        <section className={`${cardBase} pt-4 pb-5 px-4 sm:px-5`}>
          {/* Branchen-Filter */}
          {branches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => fetchList('all')}
                className={
                  selectedBranch === 'all'
                    ? filterChipActive
                    : filterChipInactive
                }
              >
                Alle
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => fetchList(b.slug)}
                  className={
                    selectedBranch === b.slug
                      ? filterChipActive
                      : filterChipInactive
                  }
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* States */}
          {loading && (
            <div className="mt-4 text-sm text-slate-700">
              Lade Anfragen …
            </div>
          )}

          {/* andere Fehler (nicht no_partner_found) */}
          {error && !loading && !isNoPartnerError && (
            <div className="mt-4 text-sm text-rose-700">
              Fehler: {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="mt-4 text-sm text-slate-600">
              Keine passenden Anfragen gefunden.
            </div>
          )}

          {/* Liste */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {items.map((it) => {
              const inactive =
                !it.is_active ||
                ['Gelöscht', 'Deaktiviert'].includes(it.status)

              return (
                <article
                  key={it.id}
                  className={
                    'group rounded-2xl border border-white/70 bg-white/95 px-4 py-3 ' +
                    'ring-1 ring-white/70 backdrop-blur-xl shadow-[0_4px_18px_rgba(15,23,42,0.06)] ' +
                    'hover:shadow-[0_10px_26px_rgba(15,23,42,0.10)] hover:bg-white transition'
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {it.title}
                        </h2>
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ' +
                            (inactive
                              ? 'bg-slate-100 text-slate-500 line-through'
                              : 'bg-emerald-50 text-emerald-700')
                          }
                        >
                          {it.status}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-900 text-white text-[9px] px-2 py-0.5">
                          {it.applications_count} Bewerbungen
                        </span>
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-slate-600">
                        {(it.city || it.zip) && (
                          <span>
                            {it.city || '—'}
                            {it.zip ? ` (${it.zip})` : ''}
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>
                          Erstellt am{' '}
                          {new Date(
                            it.created_at
                          ).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                      <Link
                        href={`/dashboard/markt/anfragen/${it.id}${
                          partnerId
                            ? `?partner_id=${encodeURIComponent(partnerId)}`
                            : ''
                        }`}
                        className={`${btnGhost} ${
                          inactive
                            ? 'opacity-40 pointer-events-none'
                            : ''
                        }`}
                        aria-disabled={inactive}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
