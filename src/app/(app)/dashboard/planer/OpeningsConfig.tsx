// File: src/app/(app)/dashboard/planer/OpeningsConfig.tsx
'use client'

import React from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Opening } from './types'    // ← hier den Typ importieren

interface Props {
  openings: Opening[]
  setOpenings: Dispatch<SetStateAction<Opening[]>>
}

export default function OpeningsConfig({ openings, setOpenings }: Props) {
  const update = (i: number, field: keyof Opening, value: number) => {
    setOpenings(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const add = (type: Opening['type']) => {
    setOpenings(prev => [
      ...prev,
      {
        type,
        wallIndex: 0,
        position:  50,
        width:     type === 'door' ? 88 : 120,
        height:    type === 'door' ? 200 : 100
      }
    ])
  }

  return (
    <div className="space-y-6 mb-4">
      <h2 className="text-2xl font-bold">Fenster & Türen</h2>
      <div className="flex space-x-2">
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => add('window')}
        >
          + Fenster
        </button>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => add('door')}
        >
          + Tür
        </button>
      </div>
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-1">Typ</th>
            <th className="border px-3 py-1">Wand #</th>
            <th className="border px-3 py-1">Position (cm)</th>
            <th className="border px-3 py-1">Breite (cm)</th>
            <th className="border px-3 py-1">Höhe (cm)</th>
          </tr>
        </thead>
        <tbody>
          {openings.map((o, i) => (
            <tr key={i}>
              <td className="border px-3 py-1 text-center">{o.type}</td>
              <td className="border px-3 py-1 text-center">
                <input
                  type="number"
                  min={0}
                  value={o.wallIndex}
                  onChange={e => update(i, 'wallIndex', +e.target.value)}
                  className="w-16 border rounded px-1 py-0.5 text-right"
                />
              </td>
              <td className="border px-3 py-1 text-center">
                <input
                  type="number"
                  min={0}
                  value={o.position}
                  onChange={e => update(i, 'position', +e.target.value)}
                  className="w-20 border rounded px-1 py-0.5 text-right"
                />
              </td>
              <td className="border px-3 py-1 text-center">
                <input
                  type="number"
                  min={1}
                  value={o.width}
                  onChange={e => update(i, 'width', +e.target.value)}
                  className="w-20 border rounded px-1 py-0.5 text-right"
                />
              </td>
              <td className="border px-3 py-1 text-center">
                <input
                  type="number"
                  min={1}
                  value={o.height}
                  onChange={e => update(i, 'height', +e.target.value)}
                  className="w-20 border rounded px-1 py-0.5 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
