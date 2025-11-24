'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDownIcon,
  TrashIcon,
  UserMinusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'

interface Props {
  id: string
  status: 'Aktiv' | 'Deaktiviert' | 'Gelöscht'
}

export default function EmployeeRowActions({ id, status }: Props) {
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})

  const toggle = () => setOpen((v) => !v)

  // Positionierung wie bei Kunden-Aktionen (fix, reagiert auf Scroll/Resize)
  const place = () => {
    const btn = btnRef.current
    const panel = panelRef.current
    if (!btn || !panel) return

    const rect = btn.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = 240
    const pad = 8
    const panelH = panel.offsetHeight || 200

    let left = rect.right - width
    let top = rect.bottom + pad

    if (left + width > vw - pad) left = vw - width - pad
    if (left < pad) left = pad
    if (top + panelH > vh - pad) top = rect.top - panelH - pad

    setStyle({
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 1000,
    })
  }

  useEffect(() => {
    if (!open) return
    place()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !panelRef.current?.contains(t) &&
        !btnRef.current?.contains(t)
      ) {
        setOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
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

  const updateStatus = async (newStatus: 'Aktiv' | 'Deaktiviert') => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      const { message } = await res
        .json()
        .catch(() => ({ message: res.statusText }))
      alert(message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  const remove = async () => {
    if (!confirm('Mitarbeiter endgültig löschen?')) return
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const { message } = await res
        .json()
        .catch(() => ({ message: res.statusText }))
      alert(message)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="group inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-900 shadow hover:bg-white"
        title="Aktionen"
      >
        <span className="pointer-events-none absolute -inset-0.5 -z-10 rounded-lg bg-white/10 opacity-0 blur transition-opacity group-hover:opacity-100" />
        Aktionen
        <ChevronDownIcon className="h-4 w-4 text-slate-500 transition-transform group-aria-expanded:rotate-180" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            role="menu"
            aria-label="Mitarbeiteraktionen"
            className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-[0_20px_50px_rgba(2,6,23,0.12)] backdrop-blur-xl"
          >
            <div className="border-b border-white/60 bg-white/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600">
              Aktionen
            </div>
            <ul className="py-1 text-sm text-slate-800">
              <li>
                <Link
                  href={`/dashboard/mitarbeiter/${id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm transition hover:bg-white"
                >
                  Mitarbeiter öffnen
                </Link>
              </li>

              <li className="my-1 border-t border-white/60" />

              {status === 'Aktiv' ? (
                <li>
                  <button
                    type="button"
                    onClick={() => updateStatus('Deaktiviert')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white"
                  >
                    <UserMinusIcon className="h-4 w-4 text-slate-500" />
                    Deaktivieren
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => updateStatus('Aktiv')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white"
                  >
                    <UserPlusIcon className="h-4 w-4 text-slate-500" />
                    Aktivieren
                  </button>
                </li>
              )}

              <li className="my-1 border-t border-white/60" />
              <li>
                <button
                  type="button"
                  onClick={remove}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Endgültig löschen
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
