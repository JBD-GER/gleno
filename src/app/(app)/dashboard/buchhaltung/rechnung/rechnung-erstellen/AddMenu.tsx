'use client'

// src/app/(app)/dashboard/buchhaltung/rechnung-erstellen/AddMenu.tsx
import React, { Dispatch, useState, useRef, useEffect } from 'react'
import { Position } from './RechnungContext'

export interface AddMenuProps {
  positions: Position[]
  setPositions: Dispatch<React.SetStateAction<Position[]>>
}

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

export default function AddMenu({
  positions,
  setPositions,
}: AddMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
      >
        Hinzufügen ▾
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <ul className="divide-y divide-gray-100">
            <li>
              <button
                onClick={() => { addHeading(positions, setPositions); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Zwischenüberschrift
              </button>
            </li>
            <li>
              <button
                onClick={() => { addDescription(positions, setPositions); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Beschreibung
              </button>
            </li>
            <li>
              <button
                onClick={() => { addItem(positions, setPositions); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Detailposition
              </button>
            </li>
            <li>
              <button
                onClick={() => { addSubtotal(positions, setPositions); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Zwischensumme
              </button>
            </li>
            <li>
              <button
                onClick={() => { addSeparator(positions, setPositions); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Trennlinie
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
