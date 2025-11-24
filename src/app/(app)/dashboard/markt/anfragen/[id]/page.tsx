'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import ApplyModal from '@/app/(app)/components/ApplyModal'

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
  'inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-3 py-2 ' +
  'text-xs sm:text-sm font-semibold shadow-[0_10px_30px_rgba(15,23,42,0.35)] ' +
  'hover:bg-slate-950 hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition ' +
  'disabled:opacity-50 disabled:shadow-none'

type Detail = {
  id: string
  status: string
  city: string | null
  zip: string | null
  category: string | null
  created_at: string
  applications_count: number
  budget_min: number | null
  budget_max: number | null
  urgency: string | null
  execution: 'vorOrt' | 'digital' | null
  summary: string | null
  intro_text: string | null
}

type MyPartner = {
  id: string
  status: string
  display_name: string | null
  company_name: string | null
  branch_id: string | null
  city: string | null
}

export default function PartnerRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const sp = useSearchParams()

  const partnerIdFromUrl = sp.get('partner_id') || ''

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string>('')

  const [partnersLoading, setPartnersLoading] = useState(true)
  const [myPartners, setMyPartners] = useState<MyPartner[]>([])

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [requestPartnerId, setRequestPartnerId] = useState<string>(
    partnerIdFromUrl || ''
  )

  const [expanded, setExpanded] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const introPreview = (t?: string | null) => {
    if (!t) return ''
    if (expanded) return t
    return t.length > 600 ? t.slice(0, 600) + ' …' : t
  }

  const selectedPartner = useMemo(
    () => myPartners.find((p) => p.id === selectedPartnerId) || null,
    [myPartners, selectedPartnerId]
  )

  const statusLabel =
    detail?.status === 'Aktiv'
      ? 'Aktiv'
      : detail?.status || 'Unbekannt'

  async function fetchDetail(opts?: { silent?: boolean; partnerIdOverride?: string }) {
    const { silent, partnerIdOverride } = opts || {}
    if (!params.id) return

    const pid = partnerIdOverride ?? requestPartnerId
    const query = pid ? `?partner_id=${encodeURIComponent(pid)}` : ''

    if (!silent) {
      setLoading(true)
      setError('')
    }

    try {
      const res = await fetch(
        `/api/partners/requests/${params.id}${query}`,
        { cache: 'no-store' }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'load_failed')
      setDetail(j as Detail)
    } catch (e: any) {
      setDetail(null)
      setError(e?.message || 'Fehler beim Laden')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  /* Partner laden */
  useEffect(() => {
    let canceled = false
    ;(async () => {
      setPartnersLoading(true)
      try {
        const res = await fetch('/api/partners/mine', { cache: 'no-store' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'load_failed')

        const list = (j.partners || []) as MyPartner[]
        if (canceled) return

        setMyPartners(list)

        let initialId = partnerIdFromUrl
        if (!initialId && list.length > 0) initialId = list[0].id

        setSelectedPartnerId(initialId || '')
        setRequestPartnerId(initialId || '')
      } catch {
        if (canceled) return
        setMyPartners([])
        setSelectedPartnerId(partnerIdFromUrl || '')
        setRequestPartnerId(partnerIdFromUrl || '')
      } finally {
        if (!canceled) setPartnersLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerIdFromUrl])

  /* Detail laden, wenn Partner-Kontext steht */
  useEffect(() => {
    if (!params.id) return
    if (partnersLoading) return
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, requestPartnerId, partnersLoading])

  /* Auto-Refresh alle 20s */
  useEffect(() => {
    const id = setInterval(() => {
      fetchDetail({ silent: true })
    }, 20000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestPartnerId, params.id])

  return (
    <div className={shellBg}>
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
            <span>GLENO Markt</span>
            <span className="text-slate-300">•</span>
            <span>Anfrage-Details</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Anfrage-Details
          </h1>
          {detail && (
            <p className="text-[11px] sm:text-xs text-slate-600">
              {detail.category || 'Anfrage'} ·{' '}
              {[detail.zip, detail.city].filter(Boolean).join(' ') ||
                'Ort unbekannt'}{' '}
              · Status:{' '}
              <span className="font-medium text-slate-900">
                {statusLabel}
              </span>{' '}
              · Bewerbungen:{' '}
              <span className="font-medium text-slate-900">
                {detail.applications_count}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchDetail()}
            className={btnGhost}
            title="Aktualisieren"
          >
            Aktualisieren
          </button>
          <Link href="/dashboard/markt/anfragen" className={btnGhost}>
            Zur Übersicht
          </Link>
        </div>
      </header>

      {/* Partner-Auswahl / Hinweis */}
      {!partnersLoading && myPartners.length > 1 && (
        <section
          className={`${cardBase} mb-4 px-4 py-3 flex flex-col gap-2`}
        >
          <label className="text-xs sm:text-sm text-slate-600">
            Als welcher Partner möchtest du dich bewerben?
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs sm:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={selectedPartnerId}
            onChange={(e) => {
              const newId = e.target.value
              setSelectedPartnerId(newId)
              setRequestPartnerId(newId)
            }}
          >
            {myPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.display_name || p.company_name || 'Partner') +
                  (p.city ? ` · ${p.city}` : '')}
              </option>
            ))}
          </select>
        </section>
      )}

      {!partnersLoading && myPartners.length === 0 && (
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-900 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Du hast noch <b>kein Partnerprofil</b>. Lege zuerst eines an, um
              dich auf Markt-Anfragen bewerben zu können.
            </div>
            <Link href="/dashboard/markt/partner-werden" className={btnPrimary}>
              Partner-Profil anlegen
            </Link>
          </div>
        </section>
      )}

      {/* DETAIL CARD */}
      <section className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5`}>
        {loading && (
          <div className="text-sm text-slate-700">Lade Anfrage …</div>
        )}

        {error && !loading && (
          <div className="text-sm text-rose-700">
            {error === 'request_inactive'
              ? 'Diese Anfrage ist nicht mehr aktiv.'
              : error === 'forbidden_branch'
              ? 'Kein Zugriff: Mit dem aktuell gewählten Partner passt die Branche nicht zu dieser Anfrage. Wähle oben ein anderes Profil.'
              : error === 'not_found'
              ? 'Anfrage nicht gefunden.'
              : `Fehler: ${error}`}
          </div>
        )}

        {!loading && !error && detail && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="text-sm sm:text-base font-semibold text-slate-900">
              {detail.summary ||
                `${detail.category || 'Anfrage'} in ${
                  detail.city || 'unbekannter Ort'
                }`}
            </div>

            {/* Intro */}
            {detail.intro_text && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-3 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                <div className="mb-1.5 font-medium text-slate-900/90">
                  Einleitungstext der Anfrage
                </div>
                <div>{introPreview(detail.intro_text)}</div>
                {detail.intro_text.length > 600 && (
                  <button
                    className="mt-2 text-[11px] sm:text-xs text-slate-900 underline decoration-slate-300 underline-offset-4 hover:opacity-80"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  </button>
                )}
              </div>
            )}

            {/* Meta-Felder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
              <Field label="Status" value={statusLabel} />
              <Field label="Kategorie" value={detail.category || '—'} />
              <Field label="Ort" value={detail.city || '—'} />
              <Field label="PLZ" value={detail.zip || '—'} />
              <Field
                label="Bewerbungen"
                value={String(detail.applications_count)}
              />
              <Field
                label="Erstellt am"
                value={new Date(
                  detail.created_at
                ).toLocaleString('de-DE')}
              />
              <Field label="Dringlichkeit" value={detail.urgency || '—'} />
              <Field
                label="Ausführung"
                value={
                  detail.execution === 'vorOrt'
                    ? 'Vor Ort'
                    : detail.execution === 'digital'
                    ? 'Digital'
                    : '—'
                }
              />
              <Field
                label="Budget (min)"
                value={
                  detail.budget_min != null
                    ? `${detail.budget_min} €`
                    : '—'
                }
              />
              <Field
                label="Budget (max)"
                value={
                  detail.budget_max != null
                    ? `${detail.budget_max} €`
                    : '—'
                }
              />
            </div>

            {/* Aktionen */}
            {!partnersLoading && myPartners.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  className={btnPrimary}
                  onClick={() => setApplyOpen(true)}
                  disabled={!selectedPartnerId}
                  title={
                    !selectedPartnerId
                      ? 'Bitte zuerst Partner wählen'
                      : 'Bewerbung erstellen'
                  }
                >
                  Bewerben
                </button>
                <Link
                  href="/dashboard/markt/anfragen"
                  className={btnGhost}
                >
                  Zur Übersicht
                </Link>
              </div>
            )}

            <p className="text-[10px] sm:text-xs text-slate-500">
              Hinweis: In der Partneransicht werden keine personenbezogenen
              Kundendaten angezeigt.
            </p>
          </div>
        )}
      </section>

      {/* Apply Modal */}
      {detail && (
        <ApplyModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          requestId={detail.id}
          partnerId={selectedPartnerId || ''}
          onSuccess={() => {
            fetchDetail({ silent: true })
            setApplyOpen(false)
          }}
        />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-2">
      <span className="text-[10px] sm:text-xs text-slate-500">
        {label}
      </span>
      <span className="text-xs sm:text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  )
}
