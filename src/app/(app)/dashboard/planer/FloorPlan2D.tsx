'use client'

import React, { useState, useMemo } from 'react'
import type { Segment } from './types'

interface Props {
  segments: Segment[]
  setSegments: (segs: Segment[]) => void
  title: string
}

export default function FloorPlan2D({ segments, setSegments, title }: Props) {
  // Startwert 200 cm
  const [lengthInput, setLengthInput]       = useState(200)
  const [directionInput, setDirectionInput] = useState<'gerade'|'links'|'rechts'>('gerade')
  const [currentAngle, setCurrentAngle]     = useState(0)

  const addSegment = () => {
    if (lengthInput <= 0) return
    let newAngle = currentAngle
    if (directionInput === 'links')  newAngle += 90
    if (directionInput === 'rechts') newAngle -= 90
    newAngle = ((newAngle % 360) + 360) % 360
    setCurrentAngle(newAngle)
    setSegments([...segments, { length: lengthInput, angle: newAngle }])
    // nach Hinzufügen wieder 200 cm
    setLengthInput(200)
    setDirectionInput('gerade')
  }

  const resetPlan = () => {
    setSegments([])
    setCurrentAngle(0)
    setLengthInput(200)
    setDirectionInput('gerade')
  }

  const points = useMemo(() => {
    const pts = [{ x: 0, y: 0 }]
    segments.forEach(({ length, angle }) => {
      const rad  = angle * Math.PI / 180
      const last = pts[pts.length - 1]
      pts.push({
        x: last.x + length * Math.cos(rad),
        y: last.y - length * Math.sin(rad),
      })
    })
    return pts
  }, [segments])

  const { minX, minY, width, height } = useMemo(() => {
    const xs = points.map(p => p.x), ys = points.map(p => p.y)
    const mX = Math.min(...xs), MX = Math.max(...xs)
    const mY = Math.min(...ys), MY = Math.max(...ys)
    const mg = 20
    return {
      minX: mX - mg,
      minY: mY - mg,
      width:  (MX - mX) + mg * 2,
      height: (MY - mY) + mg * 2,
    }
  }, [points])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col">
          Länge (cm)
          <input
            type="number" min={1}
            value={lengthInput}
            onChange={e => setLengthInput(+e.target.value)}
            className="border rounded px-2 py-1 w-32"
          />
        </label>
        <label className="flex flex-col">
          Richtung
          <select
            value={directionInput}
            onChange={e => setDirectionInput(e.target.value as any)}
            className="border rounded px-2 py-1 w-32"
          >
            <option value="gerade">▶ Geradeaus</option>
            <option value="links">◀ Links abbiegen</option>
            <option value="rechts">▶ Rechts abbiegen</option>
          </select>
        </label>
        <button
          onClick={addSegment}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Segment hinzufügen
        </button>
        <button
          onClick={resetPlan}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset
        </button>
      </div>
      <div className="border rounded overflow-hidden">
        <svg
          viewBox={`${minX} ${minY} ${width} ${height}`}
          className="w-full h-64 bg-gray-50"
        >
          <polyline
            fill="none"
            stroke="#333"
            strokeWidth={3}
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#e63946" />
          ))}
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-semibold">Segmente</h3>
        {segments.length === 0 ? (
          <p className="text-gray-600">Keine Segmente.</p>
        ) : (
          <ul className="list-decimal list-inside space-y-1">
            {segments.map((s, i) => (
              <li key={i}>
                Länge <strong>{s.length} cm</strong>, Winkel <strong>{s.angle}°</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
