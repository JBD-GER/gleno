'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Status = 'Aktiv' | 'Deaktiviert' | 'Gelöscht' | 'alle'

export default function EmployeeFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(sp.get('q') ?? '')
  const [status, setStatus] = useState<Status>((sp.get('status') as Status) || 'alle')
  const [sort, setSort] = useState<'desc' | 'asc'>((sp.get('sort') as 'desc' | 'asc') || 'desc')

  useEffect(() => {
    const t = setTimeout(() => apply({ q }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const apply = (patch: Partial<{ q: string; status: Status; sort: 'desc' | 'asc' }>) => {
    const params = new URLSearchParams(sp.toString())
    if (patch.q      !== undefined) { patch.q ? params.set('q', patch.q) : params.delete('q') }
    if (patch.status !== undefined) { patch.status === 'alle' ? params.delete('status') : params.set('status', patch.status) }
    if (patch.sort   !== undefined) params.set('sort', patch.sort)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const reset = () => {
    setQ(''); setStatus('alle'); setSort('desc')
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="sr-only" htmlFor="search">Suche</label>
          <div className="relative">
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche in Name, E-Mail, Telefon, Rolle, Spezialisierung, Ort…"
              className="w-full rounded-lg border border-white/60 bg-white/80 px-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 text-sm text-slate-600 hover:bg-white">
                ×
              </button>
            )}
          </div>
        </div>

<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
  <select
    value={status}
    onChange={(e) => { const v = e.target.value as Status; setStatus(v); apply({ status: v }) }}
    className="w-full sm:w-auto rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
    aria-label="Status"
  >
    <option value="alle">Alle Status</option>
    <option value="Aktiv">Aktiv</option>
    <option value="Deaktiviert">Deaktiviert</option>
    <option value="Gelöscht">Gelöscht</option>
  </select>

  <select
    value={sort}
    onChange={(e) => { const v = e.target.value as 'desc'|'asc'; setSort(v); apply({ sort: v }) }}
    className="w-full sm:w-auto rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
    aria-label="Sortierung"
  >
    <option value="desc">Neueste zuerst</option>
    <option value="asc">Älteste zuerst</option>
  </select>

  <button
    onClick={reset}
    className="w-full sm:w-auto rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow hover:bg-white whitespace-nowrap"
  >
    Zurücksetzen
  </button>
</div>

      </div>

      {isPending && <div className="mt-2 text-xs text-slate-500">Aktualisiere…</div>}
    </div>
  )
}
