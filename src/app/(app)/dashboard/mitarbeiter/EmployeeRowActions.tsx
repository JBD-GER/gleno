'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface Props {
  id: string
  status: 'Aktiv' | 'Deaktiviert' | 'Gelöscht'
}

export default function EmployeeRowActions({ id, status }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const toggle = () => setOpen(v => !v)

  // Position unter dem Button – mit kleinem Clamp, damit nix aus dem Viewport ragt
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuW = 220
      const padding = 12
      let left = rect.left + window.scrollX
      if (left + menuW + padding > window.innerWidth) {
        left = window.innerWidth - menuW - padding
      }
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left,
      })
    }
  }, [open])

  // Outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const setStatus = async (newStatus: 'Aktiv' | 'Deaktiviert') => {
    await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setOpen(false)
    // Soft refresh
    if (typeof window !== 'undefined') location.reload()
  }

  const remove = async () => {
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    setOpen(false)
    if (typeof window !== 'undefined') location.reload()
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow hover:bg-white backdrop-blur"
      >
        Aktionen <ChevronDownIcon className="h-4 w-4 text-slate-500" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 10000, width: 220 }}
            className="overflow-hidden rounded-xl border border-white/60 bg-white/85 p-1 shadow-[0_10px_35px_rgba(2,6,23,0.18)] backdrop-blur-xl"
          >
            <Link
              href={`/dashboard/mitarbeiter/${id}`}
              className="block rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-white"
              onClick={() => setOpen(false)}
            >
              Aufrufen
            </Link>

            {status === 'Aktiv' ? (
              <button
                onClick={() => setStatus('Deaktiviert')}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-white"
              >
                Deaktivieren
              </button>
            ) : (
              <button
                onClick={() => setStatus('Aktiv')}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-white"
              >
                Aktivieren
              </button>
            )}

            <button
              onClick={remove}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-white"
            >
              Löschen
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
