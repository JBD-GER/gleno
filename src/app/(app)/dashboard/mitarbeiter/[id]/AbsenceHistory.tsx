'use client'
import { useEffect, useState } from 'react'

type Absence = {
  id: string
  start_date: string
  end_date: string
  days: number
  type: 'Urlaub'|'Krankheit'|'Unfall'|'Fortbildung'|'Sonstiges'
  reason: string | null
  document_path: string | null
  created_at: string
}

export default function AbsenceHistory({ employeeId }: { employeeId: string }) {
  const [items, setItems] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/employees/${employeeId}/absences`, { cache: 'no-store' })
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { employeeId?: string } | undefined
      if (!detail || !detail.employeeId || detail.employeeId === employeeId) load()
    }
    window.addEventListener('absences:updated', handler as EventListener)
    return () => window.removeEventListener('absences:updated', handler as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const download = async (path: string) => {
    const res = await fetch(`/api/employees/${employeeId}/documents/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) return alert(await res.text() || 'Konnte signierte URL nicht erstellen.')
    const { signed_url } = await res.json()
    if (!signed_url) return alert('Keine signierte URL erhalten.')
    window.open(signed_url, '_blank')
  }

  const remove = async (absenceId: string) => {
    if (!confirm('Abwesenheit wirklich löschen (inkl. evtl. Dokument)?')) return
    const res = await fetch(`/api/employees/${employeeId}/absences/${absenceId}`, { method: 'DELETE' })
    if (!res.ok) return alert((await res.text()) || 'Fehler beim Löschen')
    window.dispatchEvent(new CustomEvent('absences:updated', { detail: { employeeId } }))
    await load()
  }

  if (loading) return <p className="text-sm text-slate-500">Lade…</p>
  if (!items.length) return <p className="text-sm text-slate-500">Noch keine Abwesenheiten erfasst.</p>

  return (
    <div className="space-y-3">
      {items.map(a => {
        const badgeTone =
          a.type === 'Urlaub'      ? 'bg-emerald-100 text-emerald-800' :
          a.type === 'Krankheit'   ? 'bg-rose-100 text-rose-800' :
          a.type === 'Fortbildung' ? 'bg-indigo-100 text-indigo-800' :
          a.type === 'Unfall'      ? 'bg-orange-100 text-orange-800' :
                                     'bg-gray-100 text-gray-800'

        const hasDoc = Boolean(a.document_path)

        return (
          <div
            key={a.id}
            className="
              rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl
              sm:flex sm:items-center sm:justify-between
            "
          >
            {/* Mobile: Grid für klare Reihen; Desktop: normaler Flow */}
            <div className="grid grid-cols-1 gap-1 sm:block sm:min-w-0">
              {/* Zeile 1: Badge links, Tage rechts */}
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeTone}`}>
                  {a.type}
                </span>
                <span className="text-xs text-slate-500">({a.days} Tage)</span>
              </div>

              {/* Zeile 2: Datum */}
              <div className="text-sm font-medium text-slate-900">
                {new Date(a.start_date).toLocaleDateString()} – {new Date(a.end_date).toLocaleDateString()}
              </div>

              {/* Zeile 3: Reason */}
              {a.reason && (
                <p className="text-sm text-slate-600 break-words">
                  {a.reason}
                </p>
              )}
            </div>

            {/* Actions: Mobile = 2-Spalten-Grid; 1 Button => volle Breite */}
            <div
              className="
                mt-3 sm:mt-0
                grid gap-2 w-full sm:w-auto
                grid-cols-2
              "
            >
              {hasDoc && (
                <button
                  onClick={() => download(a.document_path!)}
                  className="
                    inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/80 px-3 py-1.5
                    text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur
                  "
                >
                  Dokument
                </button>
              )}

              <button
                onClick={() => remove(a.id)}
                className={`
                  inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/80 px-3 py-1.5
                  text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur
                  ${hasDoc ? '' : 'col-span-2'}   /* wenn allein, über beide Spalten */
                `}
              >
                Löschen
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
