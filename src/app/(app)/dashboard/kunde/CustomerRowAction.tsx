'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WrenchScrewdriverIcon, ChevronDownIcon, TrashIcon, UserPlusIcon, ArrowUturnLeftIcon, UserMinusIcon } from '@heroicons/react/24/outline'

type Status = 'Lead' | 'Kunde' | 'Deaktiviert'

export default function CustomerRowActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})

  const place = () => {
    const btn = btnRef.current, panel = panelRef.current
    if (!btn || !panel) return
    const r = btn.getBoundingClientRect()
    const vw = innerWidth, vh = innerHeight, w = 260, h = panel.offsetHeight || 220, pad = 8
    let top = r.bottom + pad, left = r.right - w
    if (left + w > vw - pad) left = vw - w - pad
    if (left < pad) left = pad
    if (top + h > vh - pad) top = r.top - h - pad
    setStyle({ position: 'fixed', top, left, width: w, zIndex: 1000 })
  }

  useEffect(() => {
    if (!open) return
    place()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onScroll = () => place()
    const onResize = () => place()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const updateStatus = async (newStatus: Status) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) { setOpen(false); router.refresh() }
    else {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message)
    }
  }

  const remove = async () => {
    if (!confirm('Endgültig löschen?')) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (res.ok) { setOpen(false); router.refresh() }
    else {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-900 shadow hover:bg-white"
        title="Aktionen"
      >
        <span className="absolute -inset-0.5 -z-10 rounded-lg bg-white/10 opacity-0 blur transition-opacity group-hover:opacity-100" />
        Aktionen
        <ChevronDownIcon className="h-4 w-4 text-slate-500 transition-transform group-aria-expanded:rotate-180" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={style}
          role="menu"
          aria-label="Kundenaktionen"
          className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-[0_20px_50px_rgba(2,6,23,0.12)] backdrop-blur-xl"
        >
          <div className="border-b border-white/60 bg-white/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600">
            Aktionen
          </div>
          <ul className="py-1 text-sm text-slate-800">
            <li>
              <Link href={`/dashboard/kunde/${id}`} onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 transition hover:bg-white">
                <ArrowUturnLeftIcon className="h-4 w-4 text-slate-500" />
                Öffnen
              </Link>
            </li>

            <li className="my-1 border-t border-white/60" />

            {status !== 'Kunde' ? (
              <li>
                <button onClick={() => updateStatus('Kunde')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white">
                  <UserPlusIcon className="h-4 w-4 text-slate-500" />
                  Als Kunde markieren
                </button>
              </li>
            ) : (
              <li>
                <button onClick={() => updateStatus('Lead')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white">
                  <ArrowUturnLeftIcon className="h-4 w-4 text-slate-500" />
                  Als Lead zurücksetzen
                </button>
              </li>
            )}

            {status !== 'Deaktiviert' && (
              <li>
                <button onClick={() => updateStatus('Deaktiviert')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white">
                  <UserMinusIcon className="h-4 w-4 text-slate-500" />
                  Deaktivieren
                </button>
              </li>
            )}

            <li className="my-1 border-t border-white/60" />
            <li>
              <button onClick={remove}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-rose-600 transition hover:bg-rose-50">
                <TrashIcon className="h-4 w-4" />
                Endgültig löschen
              </button>
            </li>
          </ul>
        </div>,
        document.body
      )}
    </>
  )
}
