// src/app/(app)/konsument/anfragen/page.tsx

import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import DeleteLeadToggle from './DeleteLeadToggle'

export const dynamic = 'force-dynamic'

type DbReq = {
  id: string
  summary: string | null
  request_text: string | null
  status: string
  created_at: string
  branch: string | null
  city: string | null
}

type AppRow = {
  id: string
  request_id: string
}

/* ---------- Helpers ---------- */

function normalizeStatus(s?: string | null) {
  const v = (s || '').trim().toLowerCase()
  switch (v) {
    case 'geloescht':
    case 'gelöscht':
      return 'Gelöscht'
    case 'aktiv':
      return 'Aktiv'
    case 'termin_angelegt':
      return 'Termin angelegt'
    case 'termin_bestaetigt':
      return 'Termin bestätigt'
    case 'auftrag_erstellt':
    case 'auftrag_angelegt':
      return 'Auftrag erstellt'
    case 'auftrag_bestaetigt':
      return 'Auftrag bestätigt'
    case 'rechnungsphase':
      return 'Rechnungsphase'
    case 'abgeschlossen':
      return 'Abgeschlossen'
    case 'feedback':
      return 'Feedback'
    case 'problem':
      return 'Problem'
    case 'anfrage':
    default:
      return 'Anfrage'
  }
}

function statusBadgeCls(raw: string) {
  const v = (raw || '').toLowerCase()
  const base =
    'inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[10px] font-semibold text-white'
  if (v === 'geloescht' || v === 'gelöscht') return `${base} bg-slate-400`
  if (v === 'problem') return `${base} bg-rose-600`
  if (v === 'aktiv') return `${base} bg-emerald-600`
  if (v === 'termin_angelegt') return `${base} bg-amber-500`
  if (v === 'termin_bestaetigt') return `${base} bg-indigo-600`
  if (v === 'auftrag_erstellt' || v === 'auftrag_angelegt') return `${base} bg-sky-600`
  if (v === 'auftrag_bestaetigt') return `${base} bg-emerald-700`
  if (v === 'rechnungsphase') return `${base} bg-violet-600`
  if (v === 'abgeschlossen') return `${base} bg-slate-900`
  if (v === 'feedback') return `${base} bg-fuchsia-600`
  return `${base} bg-[#0a1b40]`
}

function titleOf(r: DbReq) {
  if (r.summary && r.summary.trim()) return r.summary.trim()
  const t = (r.request_text || '')
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean)
  return t || 'Anfrage'
}

/** Erster Satz als kurzer Teaser */
function snippetOf(r: DbReq, maxLen = 150): string {
  const base =
    (r.request_text && r.request_text.trim()) ||
    (r.summary && r.summary.trim()) ||
    ''

  if (!base) return ''

  const firstSentence = base
    .split(/(?<=[.!?])\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim()

  if (!firstSentence) return ''

  if (firstSentence.length <= maxLen) return firstSentence
  return firstSentence.slice(0, maxLen - 1).trimEnd() + '…'
}

/* ---------- UI Base ---------- */

const pageBg =
  'min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.05),transparent_70%)] px-4 py-6 md:px-8'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/82 backdrop-blur-xl px-5 py-4 shadow-[0_16px_55px_rgba(15,23,42,0.08)] ring-1 ring-white/40 transition-colors hover:shadow-[0_20px_70px_rgba(15,23,42,0.12)]'

/* ---------- Page ---------- */

export default async function AnfragenPage() {
  const supabase = await supabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-slate-600">
        Bitte melden Sie sich an, um Ihre Anfragen zu sehen.
      </div>
    )
  }

  // 1) Anfragen laden (ohne applications_count)
  const { data, error } = await supabase
    .from('market_requests')
    .select(
      'id, summary, request_text, status, created_at, branch, city'
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    const hint = /relation .*market_requests.* does not exist/i.test(error.message)
      ? 'Hinweis: Die Tabelle "market_requests" existiert (noch) nicht oder Migration/RLS fehlen.'
      : undefined

    return (
      <div className={pageBg}>
        <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50/95 px-6 py-5 shadow-md">
          <h1 className="text-xl font-semibold text-slate-900">Meine Anfragen</h1>
          <p className="mt-3 text-sm text-rose-600">Fehler: {error.message}</p>
          {hint && (
            <p className="mt-1 text-xs text-slate-600">
              {hint}
            </p>
          )}
          <div className="mt-4">
            <Link
              href="/konsument/anfragen/anfrage-erstellen"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Neue Anfrage stellen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as DbReq[]
  const total = rows.length
  const openCount = rows.filter((r) => {
    const s = (r.status || '').toLowerCase()
    return s !== 'geloescht' && s !== 'gelöscht'
  }).length

  // 2) Aktuelle Bewerber-Zahlen aus market_applications holen
  let countsByRequest = new Map<string, number>()

  if (rows.length > 0) {
    const requestIds = rows.map((r) => r.id)

    const { data: appsData, error: appsError } = await supabase
      .from('market_applications')
      .select('id, request_id')
      .in('request_id', requestIds)

    if (!appsError && appsData) {
      countsByRequest = appsData.reduce((map, row) => {
        const rId = (row as AppRow).request_id
        map.set(rId, (map.get(rId) ?? 0) + 1)
        return map
      }, new Map<string, number>())
    }
  }

  return (
    <div className={pageBg}>
      {/* Top Glass Header */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/90 px-6 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.14)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50/95 px-3 py-1 text-[10px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Übersicht Ihrer Anfragen
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Meine Anfragen
          </h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Behalten Sie alle Anfragen im Blick, prüfen Sie Bewerbungen und springen Sie direkt in die Details.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-3 text-[10px] text-slate-500">
            <span>
              Insgesamt:{' '}
              <span className="font-semibold text-slate-800">{total}</span>
            </span>
            <span>
              Aktiv/Gelistet:{' '}
              <span className="font-semibold text-emerald-600">{openCount}</span>
            </span>
          </div>
          <Link
            href="/konsument/anfragen/anfrage-erstellen"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs md:text-sm text-white shadow-sm hover:opacity-90"
          >
            Neue Anfrage stellen
          </Link>
        </div>
      </div>

      {/* Keine Anfragen */}
      {rows.length === 0 && (
        <div className={cardBase}>
          <div className="text-sm text-slate-700">
            Sie haben noch keine Anfragen erstellt.
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Stellen Sie eine Anfrage ein, um passende Handwerker-Angebote zu erhalten.
          </p>
          <div className="mt-4">
            <Link
              href="/konsument/anfragen/anfrage-erstellen"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs md:text-sm text-white hover:opacity-90"
            >
              Erste Anfrage stellen
            </Link>
          </div>
        </div>
      )}

      {/* Karten-Grid */}
      {rows.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map((a) => {
            const statusLabel = normalizeStatus(a.status)
            const statusClass = statusBadgeCls(a.status)
            const isDeleted =
              (a.status || '').toLowerCase() === 'geloescht' ||
              (a.status || '').toLowerCase() === 'gelöscht'
            const snippet = snippetOf(a)

            const applicantsCount = countsByRequest.get(a.id) ?? 0

            return (
              <div
                key={a.id}
                className={`${cardBase} flex flex-col gap-3 ${
                  isDeleted ? 'opacity-55 grayscale' : ''
                }`}
              >
                {/* Top Row: Titel + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {titleOf(a)}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500">
                      {a.branch && (
                        <span className="font-medium text-slate-700">
                          {a.branch}
                          {a.city ? ` · ${a.city}` : ''}
                        </span>
                      )}
                      <span>
                        Erstellt am{' '}
                        {new Date(a.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={statusClass}>{statusLabel}</span>
                    {/* Delete klein & dezent */}
                    <div className="mt-0.5 scale-90 opacity-60 hover:opacity-100 transition">
                      <DeleteLeadToggle id={a.id} isDeleted={isDeleted} />
                    </div>
                  </div>
                </div>

                {/* Snippet */}
                {snippet && (
                  <p className="text-[11px] leading-snug text-slate-500 line-clamp-3">
                    {snippet}
                  </p>
                )}

                {/* Bottom Row: Bewerber + Actions */}
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="text-[10px] text-slate-500">
                    <span className="font-medium text-slate-700">
                      Bewerber:
                    </span>{' '}
                    <span className="text-slate-900">
                      {applicantsCount}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/konsument/anfragen/${a.id}`}
                      className={`inline-flex items-center justify-center rounded-2xl border border-slate-900/12 bg-white px-3 py-1.5 text-[10px] md:text-xs text-slate-900 hover:border-slate-900/30 hover:shadow-sm ${
                        isDeleted ? 'pointer-events-none opacity-50' : ''
                      }`}
                    >
                      Details ansehen
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
