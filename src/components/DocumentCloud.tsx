// src/components/DocumentCloud.tsx
'use client'

import * as React from 'react'
import { supabaseClient } from '@/lib/supabase-client'

type FileRow = {
  id: string
  name: string
  path: string
  signedUrl: string | null
  uploaded_at: string | null
  isOwner: boolean
  category?: string | null // z.B. "rechnung:erstellt|bezahlt|verzug"
}

type Props = {
  requestId: string
  currentUserId: string
}

const categories = [
  { key: 'allgemein', label: 'Allgemein' },
  { key: 'angebot',   label: 'Angebote' },
  { key: 'auftrag',   label: 'Aufträge' },
  { key: 'rechnung',  label: 'Abrechnung' },
] as const

const INVOICE_STATUS: Array<{ key: 'erstellt' | 'bezahlt' | 'verzug'; label: string }> = [
  { key: 'erstellt', label: 'Erstellt' },
  { key: 'bezahlt',  label: 'Bezahlt' },
  { key: 'verzug',   label: 'Zahlungsverzug' },
]

function getInvoiceStatusFromCategory(cat?: string | null): 'erstellt' | 'bezahlt' | 'verzug' {
  const c = String(cat || '')
  if (c.startsWith('rechnung:')) {
    const s = c.split(':')[1]
    if (s === 'bezahlt' || s === 'verzug') return s
  }
  return 'erstellt'
}

/** Badge für Rechnungsstatus (readonly für Nicht-Owner) */
function InvoiceStatusBadge({ status }: { status: 'erstellt' | 'bezahlt' | 'verzug' }) {
  const txt =
    status === 'bezahlt'
      ? 'Bezahlt'
      : status === 'verzug'
      ? 'Zahlungsverzug'
      : 'Erstellt'

  const cls =
    status === 'bezahlt'
      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
      : status === 'verzug'
      ? 'bg-rose-50/90 border-rose-200 text-rose-900'
      : 'bg-amber-50/90 border-amber-200 text-amber-900'

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] border ring-1 ring-white/60 ${cls}`}
      title={`Rechnungsstatus: ${txt}`}
      aria-label={`Rechnungsstatus: ${txt}`}
    >
      {txt}
    </span>
  )
}

export default function DocumentCloud({ requestId }: Props) {
  const sb = supabaseClient()
  const [active, setActive] = React.useState<(typeof categories)[number]['key']>('allgemein')
  const [loading, setLoading] = React.useState(false)
  const [files, setFiles] = React.useState<FileRow[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState<string | null>(null)
  const [conversationId, setConversationId] = React.useState<string | null>(null)

  const reqSeqRef = React.useRef(0)
  const unmountedRef = React.useRef(false)

  /* -------- Conversation-ID holen (für Realtime) -------- */
  React.useEffect(() => {
    unmountedRef.current = false
    let alive = true

    ;(async () => {
      const { data, error } = await sb
        .from('market_conversations')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle()
      if (!alive) return
      if (!error) setConversationId(data?.id ?? null)
      else setConversationId(null)
    })()

    return () => {
      alive = false
      unmountedRef.current = true
    }
  }, [sb, requestId])

  /* -------- Dateien laden -------- */
  const fetchList = React.useCallback(async () => {
    if (!requestId) return
    const mySeq = ++reqSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/chat/${requestId}/documents?category=${active}`,
        { credentials: 'include' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)
      if (!unmountedRef.current && mySeq === reqSeqRef.current) {
        setFiles(j.files || [])
      }
    } catch (e: any) {
      if (!unmountedRef.current && mySeq === reqSeqRef.current) {
        setError(e?.message || 'Fehler beim Laden')
      }
    } finally {
      if (!unmountedRef.current && mySeq === reqSeqRef.current) {
        setLoading(false)
      }
    }
  }, [requestId, active])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  /* -------- Realtime: Änderungen an Dokumenten -------- */
  React.useEffect(() => {
    if (!conversationId) return
    const ch = sb.channel(`docs:${conversationId}`)

    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'market_documents',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => fetchList()
    ).subscribe()

    const onBump = (e: any) => {
      if (e?.detail?.requestId === requestId) fetchList()
    }
    window.addEventListener('documents:updated', onBump)

    return () => {
      sb.removeChannel(ch)
      window.removeEventListener('documents:updated', onBump)
    }
  }, [sb, conversationId, requestId, fetchList])

  /* -------- Aktionen -------- */

  const onDelete = async (id: string) => {
    if (!id || deleting) return
    if (!confirm('Dokument wirklich löschen?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/chat/documents/${id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'cloud' }),
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)
      await fetchList()
    } catch (e: any) {
      alert(e.message || 'Löschen fehlgeschlagen')
    } finally {
      setDeleting(null)
    }
  }

  const onInvoiceStatusChange = async (
    file: FileRow,
    val: 'erstellt' | 'bezahlt' | 'verzug'
  ) => {
    if (updating) return
    setUpdating(file.id)
    try {
      const res = await fetch(
        `/api/chat/documents/${file.id}/invoice-status`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: val }),
          credentials: 'include',
        }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      // UI aktualisieren
      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, category: `rechnung:${val}` }
            : f
        )
      )
    } catch (e: any) {
      alert(e?.message || 'Status-Update fehlgeschlagen')
    } finally {
      setUpdating(null)
    }
  }

  /* -------- UI -------- */

  const activeLabel =
    categories.find(c => c.key === active)?.label || 'Dokumente'

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl p-3 sm:p-4 shadow-[0_14px_40px_rgba(15,23,42,0.12)]">
      {/* Tabs + Status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Scrollbare Tabs für Mobile */}
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-none">
          {categories.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={`whitespace-nowrap rounded-2xl px-3 py-1.5 text-[11px] sm:text-xs border transition-all ${
                active === c.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white/90 text-slate-700 border-white/70 hover:bg-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Info rechts (auf Mobile unter Tabs) */}
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          {loading && <span>Lade Dokumente…</span>}
          {!loading && error && (
            <span className="text-rose-600 truncate max-w-[200px] sm:max-w-xs">
              {error}
            </span>
          )}
          {!loading && !error && (
            <span className="ml-auto">
              {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} in{' '}
              <span className="font-medium text-slate-700">
                {activeLabel}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="mt-3">
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/90 px-3 py-3 text-[11px] text-slate-500">
            Noch keine Dateien in <span className="font-medium">{activeLabel}</span> vorhanden.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map(f => {
              const isInvoiceTab = active === 'rechnung'
              const currentStatus = getInvoiceStatusFromCategory(f.category)

              const editableStatus = (
                <select
                  value={currentStatus}
                  disabled={updating === f.id}
                  onChange={e =>
                    onInvoiceStatusChange(
                      f,
                      e.currentTarget.value as 'erstellt' | 'bezahlt' | 'verzug'
                    )
                  }
                  className="rounded-xl border border-white/70 bg-white/95 px-2 py-1 text-[10px] text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-100"
                  title="Rechnungsstatus"
                >
                  {INVOICE_STATUS.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )

              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-1.5 rounded-2xl border border-white/70 bg-white/96 px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Link + Meta */}
                  <div className="min-w-0">
                    {f.signedUrl ? (
                      <a
                        href={f.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-[12px] font-medium text-slate-900 hover:underline"
                      >
                        {f.name}
                      </a>
                    ) : (
                      <span className="block truncate text-[12px] font-medium text-slate-900">
                        {f.name}
                      </span>
                    )}

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
                      {f.uploaded_at && (
                        <span>
                          Hochgeladen am{' '}
                          {new Date(f.uploaded_at).toLocaleString('de-DE')}
                        </span>
                      )}
                      {isInvoiceTab && !f.isOwner && (
                        <InvoiceStatusBadge status={currentStatus} />
                      )}
                    </div>
                  </div>

                  {/* Actions / Status */}
                  <div className="mt-0.5 flex items-center justify-end gap-2 sm:mt-0 sm:ml-3">
                    {/* Rechnungsstatus: Owner → Select, sonst oben Badge */}
                    {isInvoiceTab && f.isOwner && editableStatus}

                    {/* Löschen (dezent) nur für Owner */}
                    {f.isOwner && (
                      <button
                        type="button"
                        disabled={deleting === f.id}
                        onClick={() => onDelete(f.id)}
                        className="rounded-2xl border border-slate-200/80 bg-white/95 px-2 py-1 text-[9px] text-slate-500 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/60 disabled:opacity-50"
                      >
                        {deleting === f.id ? '…' : 'Entfernen'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
