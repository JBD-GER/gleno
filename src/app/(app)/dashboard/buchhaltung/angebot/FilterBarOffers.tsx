'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function FilterBarOffers() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(sp.get('q') ?? '')
  const [sort, setSort] = useState<'desc'|'asc'>((sp.get('sort') as 'desc'|'asc') || 'desc')

  // debounce Suche
  useEffect(() => {
    const t = setTimeout(() => apply({ q }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const apply = (patch: Partial<{ q: string; sort: 'desc'|'asc' }>) => {
    const params = new URLSearchParams(sp.toString())
    if (patch.q    !== undefined) { patch.q ? params.set('q', patch.q) : params.delete('q') }
    if (patch.sort !== undefined) params.set('sort', patch.sort)
    params.delete('page') // zurück auf Seite 1
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const reset = () => {
    setQ(''); setSort('desc')
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="offer-search" className="sr-only">Suche</label>
          <div className="relative">
            <input
              id="offer-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche in Angebotsnummer, Titel, Intro, Datum, Kunde…"
              className="w-full rounded-lg border border-white/60 bg-white/80 px-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 text-sm text-slate-600 hover:bg-white">
                ×
              </button>
            )}
          </div>
          {q && (
            <div className="mt-1 text-[11px] text-slate-500">
              Suche aktiv für: <span className="font-medium">„{q}“</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:w-auto">
          <select
            value={sort}
            onChange={(e) => { const v = e.target.value as 'desc'|'asc'; setSort(v); apply({ sort: v }) }}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            aria-label="Sortierung"
          >
            <option value="desc">Neueste zuerst</option>
            <option value="asc">Älteste zuerst</option>
          </select>

          <button
            onClick={reset}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow hover:bg-white"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {isPending && <div className="mt-2 text-xs text-slate-500">Aktualisiere…</div>}
    </div>
  )
}
