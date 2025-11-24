'use client'

import React, { Dispatch, useState, useRef, useEffect } from 'react'
import { Position } from './AngebotContext'
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export interface AddMenuProps {
  positions: Position[]
  setPositions: Dispatch<React.SetStateAction<Position[]>>
}

/* ------- Helper zum Hinzufügen von Positionen (Logik unverändert) ------- */
export function addHeading(
  positions: Position[],
  set: Dispatch<React.SetStateAction<Position[]>>
) {
  set([...positions, { type: 'heading', description: 'Neue Überschrift' }])
}

export function addDescription(
  positions: Position[],
  set: Dispatch<React.SetStateAction<Position[]>>
) {
  set([...positions, { type: 'description', description: '' }])
}

export function addItem(
  positions: Position[],
  set: Dispatch<React.SetStateAction<Position[]>>
) {
  set([
    ...positions,
    { type: 'item', description: '', quantity: 1, unit: 'Stück', unitPrice: 0 },
  ])
}

export function addSubtotal(
  positions: Position[],
  set: Dispatch<React.SetStateAction<Position[]>>
) {
  set([...positions, { type: 'subtotal', description: 'Zwischensumme' }])
}

export function addSeparator(
  positions: Position[],
  set: Dispatch<React.SetStateAction<Position[]>>
) {
  set([...positions, { type: 'separator', description: '' }])
}

/* ------- Neues Add-Menü analog zur Rechnung (glass, mobile-friendly) ------- */
export default function AddMenu({ positions, setPositions }: AddMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Outside-Click + ESC schließen
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleSelect = (fn: (p: Position[], s: typeof setPositions) => void) => {
    fn(positions, setPositions)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-flex">
      {/* Hauptbutton */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm backdrop-blur-xl hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
          <PlusIcon className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Position hinzufügen</span>
        <span className="sm:hidden">Hinzufügen</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Dropdown – mobil links, ab md nach rechts ausgerichtet */}
      {open && (
        <div
          className="
            absolute left-0 top-full z-20 mt-2 w-[260px]
            rounded-2xl border border-white/70 bg-white/95 p-2 text-sm
            shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur-xl
            md:left-auto md:right-0
          "
        >
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Art der Position
          </p>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => handleSelect(addHeading)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-[13px] text-slate-900 hover:bg-slate-50"
              >
                <span className="font-medium">Zwischenüberschrift</span>
                <span className="text-[11px] text-slate-500">
                  Struktur für größere Abschnitte im Dokument
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleSelect(addDescription)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-[13px] text-slate-900 hover:bg-slate-50"
              >
                <span className="font-medium">Beschreibung</span>
                <span className="text-[11px] text-slate-500">
                  Freitext unter einer Überschrift oder Position
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleSelect(addItem)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-[13px] text-slate-900 hover:bg-slate-50"
              >
                <span className="font-medium">Detailposition</span>
                <span className="text-[11px] text-slate-500">
                  Menge, Einheit und Einzelpreis mit Zwischensumme
                </span>
              </button>
            </li>
            <li className="pt-1">
              <button
                type="button"
                onClick={() => handleSelect(addSubtotal)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-[13px] text-slate-900 hover:bg-slate-50"
              >
                <span className="font-medium">Zwischensumme</span>
                <span className="text-[11px] text-slate-500">
                  Summe aller Positionen bis hierher
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleSelect(addSeparator)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-[13px] text-slate-900 hover:bg-slate-50"
              >
                <span className="font-medium">Trennlinie</span>
                <span className="text-[11px] text-slate-500">
                  Optische Trennung zwischen Blöcken
                </span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
