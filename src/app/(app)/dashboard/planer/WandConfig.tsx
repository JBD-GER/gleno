// File: src/app/(app)/dashboard/planer/WandConfig.tsx
'use client'

import React from 'react'
import type { Segment, WallConfig } from './types'
import type { Dispatch, SetStateAction } from 'react'

interface Props {
  segments: Segment[]
  configs:  WallConfig[]
  setConfigs: Dispatch<SetStateAction<WallConfig[]>>
}

export default function WandConfig({ segments, configs, setConfigs }: Props) {
  const update = (i: number, field: keyof WallConfig, value: number) => {
    setConfigs(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const totalArea = configs.reduce((sum, cfg, i) => {
    const lenM = (segments[i]?.length ?? 0) / 100
    const hM   = cfg.height / 100
    return sum + lenM * hM
  }, 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Wand konfigurieren</h2>
      {segments.length === 0 ? (
        <p className="text-gray-600">
          Bitte zuerst im Boden-Tab Segmente definieren.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-1">#</th>
                <th className="border px-3 py-1">Länge (cm)</th>
                <th className="border px-3 py-1">Höhe (cm)</th>
                <th className="border px-3 py-1">Neigung (°)</th>
                <th className="border px-3 py-1">Start (cm)</th>
                <th className="border px-3 py-1">Fläche (m²)</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s, i) => {
                const cfg  = configs[i] || { height: 0, pitch: 0, pitchStart: 0 }
                const area = ((s.length / 100) * (cfg.height / 100)).toFixed(2)
                return (
                  <tr key={i}>
                    <td className="border px-3 py-1 text-center">{i+1}</td>
                    <td className="border px-3 py-1 text-right">{s.length}</td>
                    <td className="border px-3 py-1">
                      <input
                        type="number"
                        min={0}
                        value={cfg.height}
                        onChange={e => update(i, 'height', +e.target.value)}
                        className="w-20 border rounded px-1 py-0.5 text-right"
                      />
                    </td>
                    <td className="border px-3 py-1">
                      <input
                        type="number"
                        min={0} max={90}
                        value={cfg.pitch}
                        onChange={e => update(i, 'pitch', +e.target.value)}
                        className="w-16 border rounded px-1 py-0.5 text-right"
                      />
                    </td>
                    <td className="border px-3 py-1">
                      <input
                        type="number"
                        min={0}
                        value={cfg.pitchStart}
                        onChange={e => update(i, 'pitchStart', +e.target.value)}
                        className="w-20 border rounded px-1 py-0.5 text-right"
                      />
                    </td>
                    <td className="border px-3 py-1 text-right">{area}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100">
                <td colSpan={5} className="border px-3 py-1 text-right font-semibold">
                  Gesamt:
                </td>
                <td className="border px-3 py-1 text-right font-semibold">
                  {totalArea.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
