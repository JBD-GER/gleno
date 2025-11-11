'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useThree, ThreeEvent } from '@react-three/fiber'
import { Edges, Html } from '@react-three/drei'
import TileSelector, { Bounds } from './TileSelector'
import polygonClipping from 'polygon-clipping'     // npm install polygon-clipping
import type { Segment } from './types'

const STORAGE_KEY = 'tileSize'

export interface TileSize {
  width:  number  // Meter
  height: number  // Meter
}

interface Tile {
  x: number
  z: number
  width: number
  height: number
}

interface Region {
  id: number
  bounds: Bounds
  count: number
}

interface Props {
  /** Polygon des Bodens in XZ */
  pts: { x: number; z: number }[]
  segments: Segment[]
  /** OrbitControls an/aus */
  onDrawModeChange?: (mode: boolean) => void
  /** Fliesengröße zurückmelden */
  onTileSizeChange?: (size: TileSize | null) => void
  /** Wand-Markierung fertig */
  onWallMarkComplete?: (bounds: Bounds) => void
}

export default function TileLayer({
  pts,
  segments,
  onDrawModeChange,
  onTileSizeChange,
  onWallMarkComplete,
}: Props) {
  const { gl } = useThree()

  // 1) Fliesengröße aus LocalStorage
  const [tileSize, setTileSize] = useState<TileSize | null>(null)
  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      try { setTileSize(JSON.parse(s)) }
      catch {}
    }
  }, [])

  // 2) Tile-State
  const [tiles, setTiles] = useState<Tile[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [previewBounds, setPreviewBounds] = useState<Bounds | null>(null)
  const [previewCount, setPreviewCount] = useState(0)

  // 3) Markiermodus: 'none' | 'floor' | 'wall'
  const [markMode, setMarkMode] = useState<'none'|'floor'|'wall'>('none')

  // 4) Raum-Polygon fürs Clipping
  const roomPoly = useMemo(() => {
    const ring0 = pts.map(p => [p.x, p.z] as [number, number])
    const area2 = ring0.reduce((sum, [x, z], i) => {
      const [x2, z2] = ring0[(i + 1) % ring0.length]
      return sum + (x * z2 - x2 * z)
    }, 0)
    const ringCCW = area2 < 0 ? [...ring0].reverse() : ring0.slice()
    if (
      ringCCW[0][0] !== ringCCW[ringCCW.length - 1][0] ||
      ringCCW[0][1] !== ringCCW[ringCCW.length - 1][1]
    ) {
      ringCCW.push([ringCCW[0][0], ringCCW[0][1]])
    }
    return [ringCCW]
  }, [pts])

  // 5) Raster-Grid fürs Boden
  const grid = useMemo(() => {
    if (!tileSize) return null
    const xs = pts.map(p => p.x), zs = pts.map(p => p.z)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minZ = Math.min(...zs), maxZ = Math.max(...zs)

    const widths: number[] = [], xCenters: number[] = []
    for (let x = minX; x < maxX - 1e-6;) {
      const rem = maxX - x
      const w = rem < tileSize.width ? rem : tileSize.width
      widths.push(w)
      xCenters.push(x + w / 2)
      x += w
    }

    const heights: number[] = [], zCenters: number[] = []
    for (let z = minZ; z < maxZ - 1e-6;) {
      const rem = maxZ - z
      const h = rem < tileSize.height ? rem : tileSize.height
      heights.push(h)
      zCenters.push(z + h / 2)
      z += h
    }

    return { minX, maxX, minZ, maxZ, widths, heights, xCenters, zCenters }
  }, [pts, tileSize])

  // 6) Helfer: Tiles in Bounds zählen
  const countInBounds = useCallback((b: Bounds) => {
    if (!grid) return 0
    let cnt = 0
    const selRect: [number, number][] = [
      [b.minX, b.minZ],
      [b.maxX, b.minZ],
      [b.maxX, b.maxZ],
      [b.minX, b.maxZ],
      [b.minX, b.minZ],
    ]
    const { widths, heights, xCenters, zCenters } = grid
    for (let i = 0; i < xCenters.length; i++) {
      for (let j = 0; j < zCenters.length; j++) {
        const cx = xCenters[i], cz = zCenters[j]
        const w = widths[i], h = heights[j]
        const w2 = w / 2, h2 = h / 2
        const tileRect: [number, number][] = [
          [cx - w2, cz - h2],
          [cx + w2, cz - h2],
          [cx + w2, cz + h2],
          [cx - w2, cz + h2],
          [cx - w2, cz - h2],
        ]
        if (polygonClipping.intersection([tileRect], roomPoly, [selRect]).length > 0) {
          cnt++
        }
      }
    }
    return cnt
  }, [grid, roomPoly])

  // 7) Boden komplett ausfüllen
  const fillAll = () => {
    if (!tileSize || !grid) return
    const { widths, heights, xCenters, zCenters } = grid
    const out: Tile[] = []
    for (let i = 0; i < xCenters.length; i++) {
      for (let j = 0; j < zCenters.length; j++) {
        const cx = xCenters[i], cz = zCenters[j]
        const w = widths[i], h = heights[j]
        const w2 = w / 2, h2 = h / 2
        const tileRect: [number, number][] = [
          [cx - w2, cz - h2],
          [cx + w2, cz - h2],
          [cx + w2, cz + h2],
          [cx - w2, cz + h2],
          [cx - w2, cz - h2],
        ]
        if (polygonClipping.intersection([tileRect], roomPoly).length > 0) {
          out.push({ x: cx, z: cz, width: w, height: h })
        }
      }
    }
    setTiles(out)
    setMarkMode('none')
    onDrawModeChange?.(false)
    setRegions([]); setPreviewBounds(null); setPreviewCount(0)
  }

  // 8) Live-Vorschau Boden
  const handleRectChange = useCallback((bounds: Bounds) => {
    setPreviewBounds(bounds)
    setPreviewCount(countInBounds(bounds))
  }, [countInBounds])

  // 9) Abschluss Boden
  const handleComplete = useCallback((_: any, bounds: Bounds) => {
    if (!tileSize || !grid) return
    const id = regions.length + 1
    const count = countInBounds(bounds)
    setTiles(prev => {
      const merged = [...prev]
      const selRect: [number, number][] = [
        [bounds.minX, bounds.minZ],
        [bounds.maxX, bounds.minZ],
        [bounds.maxX, bounds.maxZ],
        [bounds.minX, bounds.maxZ],
        [bounds.minX, bounds.minZ],
      ]
      const { widths, heights, xCenters, zCenters } = grid
      for (let i = 0; i < xCenters.length; i++) {
        for (let j = 0; j < zCenters.length; j++) {
          const cx = xCenters[i], cz = zCenters[j]
          const w = widths[i], h = heights[j]
          const w2 = w / 2, h2 = h / 2
          const tileRect: [number, number][] = [
            [cx - w2, cz - h2],
            [cx + w2, cz - h2],
            [cx + w2, cz + h2],
            [cx - w2, cz + h2],
            [cx - w2, cz - h2],
          ]
          if (polygonClipping.intersection([tileRect], roomPoly, [selRect]).length === 0) continue
          if (!merged.some(t => Math.abs(t.x - cx) < 1e-6 && Math.abs(t.z - cz) < 1e-6)) {
            merged.push({ x: cx, z: cz, width: w, height: h })
          }
        }
      }
      return merged
    })
    setRegions(rs => [...rs, { id, bounds, count }])
    setMarkMode('none')
    onDrawModeChange?.(false)
    setPreviewBounds(null); setPreviewCount(0)
  }, [grid, roomPoly, tileSize, countInBounds, regions.length])

  // 10) Fliesengröße UI
  const onAdd = () => {
    const w = parseFloat(prompt('Fliesen-Breite in cm', '30') || '0') / 100
    const h = parseFloat(prompt('Fliesen-Höhe in cm', '30') || '0') / 100
    if (w > 0 && h > 0) {
      const ts = { width: w, height: h }
      setTileSize(ts)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ts))
      onTileSizeChange?.(ts)
      setTiles([]); setRegions([]); setPreviewBounds(null); setPreviewCount(0)
    }
  }
  const onClearAll = () => {
    localStorage.removeItem(STORAGE_KEY)
    setTileSize(null)
    onTileSizeChange?.(null)
    setTiles([]); setRegions([]); setPreviewBounds(null); setPreviewCount(0)
  }

  const fmt = (m: number) => `${Math.round(m * 100)} cm`

  return (
    <>
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }} className="absolute top-2 left-2 z-10 bg-white p-3 rounded shadow space-y-2">
          <div className="flex space-x-2 items-center">
            <button onClick={onAdd} className="px-2 py-1 bg-blue-600 text-white rounded">Fliesen</button>
            {tileSize && <span className="font-mono">{fmt(tileSize.width)} × {fmt(tileSize.height)}</span>}
            <button onClick={fillAll} className="px-2 py-1 bg-indigo-600 text-white rounded">Boden ausfüllen</button>
            <button onClick={onClearAll} className="px-2 py-1 bg-red-500 text-white rounded">Alle Fliesen löschen</button>
            <button onClick={() => {
              const nm = markMode === 'floor' ? 'none' : 'floor'
              setMarkMode(nm)
              onDrawModeChange?.(nm !== 'none')
              if (nm === 'none') { setPreviewBounds(null); setPreviewCount(0) }
            }} className={`px-2 py-1 rounded ${markMode === 'floor' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              Markierung Boden
            </button>
            <button onClick={() => {
              const nm = markMode === 'wall' ? 'none' : 'wall'
              setMarkMode(nm)
              onDrawModeChange?.(nm !== 'none')
            }} className={`px-2 py-1 rounded ${markMode === 'wall' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              Markierung Wand
            </button>
          </div>

          {markMode === 'floor' && previewBounds && (
            <div className="p-2 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
              Region {regions.length + 1}<br/>
              {fmt(previewBounds.maxX - previewBounds.minX)} × {fmt(previewBounds.maxZ - previewBounds.minZ)}<br/>
              Vorab Fliesen: {previewCount}
            </div>
          )}
          {!previewBounds && tiles.length > 0 && (
            <div className="pt-2 border-t text-sm font-mono">
              Gesamt-Fliesen: <strong>{tiles.length}</strong>
            </div>
          )}
          {!previewBounds && regions.map(r => (
            <div key={r.id} className="text-sm font-mono">
              Region {r.id}: {fmt(r.bounds.maxX - r.bounds.minX)} × {fmt(r.bounds.maxZ - r.bounds.minZ)} → {r.count} Fliesen
            </div>
          ))}
        </div>
      </Html>

      {/* TileSelector Boden */}
      {markMode === 'floor' && tileSize && (
        <TileSelector
          tileSize={tileSize}
          segments={segments}
          openings={[]}
          drawMode
          onRectChange={handleRectChange}
          onComplete={handleComplete}
          onCancel={() => {
            setMarkMode('none')
            onDrawModeChange?.(false)
            setPreviewBounds(null); setPreviewCount(0)
          }}
        />
      )}

      {/* TileSelector Wand */}
      {markMode === 'wall' && tileSize && (
        <TileSelector
          tileSize={tileSize}
          segments={segments}
          openings={[]}
          drawMode
          wallMode
          onRectChange={() => {}}
          onComplete={(_tiles, bounds) => {
            onWallMarkComplete?.(bounds)
            setMarkMode('none')
            onDrawModeChange?.(false)
          }}
          onCancel={() => {
            setMarkMode('none')
            onDrawModeChange?.(false)
          }}
        />
      )}

      {/* Unsichtbare Wand-Planes */}
      {markMode === 'wall' && tileSize && pts.slice(0, -1).map((A, i) => {
        const B = pts[i + 1]
        const dx = B.x - A.x, dz = B.z - A.z
        const segLen = Math.hypot(dx, dz)
        const yaw = -Math.atan2(dz, dx)
        const midX = (A.x + B.x) / 2, midZ = (A.z + B.z) / 2
        return (
          <mesh
            key={`wall-plane-${i}`}
            userData={{ wallIndex: i }}
            position={[midX, tileSize.height / 2, midZ]}
            rotation={[0, yaw, 0]}
          >
            <planeGeometry args={[segLen, tileSize.height]} />
            <meshStandardMaterial visible={false} />
          </mesh>
        )
      })}

      {/* 3D-Fliesen (Boden) */}
      <group>
        {tiles.flatMap((t, i) => {
          const w2 = t.width / 2, h2 = t.height / 2
          const rect: [number, number][] = [
            [t.x - w2, t.z - h2],
            [t.x + w2, t.z - h2],
            [t.x + w2, t.z + h2],
            [t.x - w2, t.z + h2],
            [t.x - w2, t.z - h2],
          ]
          return polygonClipping.intersection([rect], roomPoly).flatMap((poly, pi) =>
            poly.map((ring, ri) => {
              const shape = new THREE.Shape()
              ring.forEach(([x, z], idx) => {
                idx === 0 ? shape.moveTo(x - t.x, z - t.z) : shape.lineTo(x - t.x, z - t.z)
              })
              shape.closePath()
              return (
                <mesh
                  key={`${i}-${pi}-${ri}`}
                  geometry={new THREE.ShapeGeometry(shape)}
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[t.x, 0.001, t.z]}
                  onPointerDown={ev => {
                    if ((ev.nativeEvent as PointerEvent).button === 2) {
                      ev.stopPropagation()
                      setTiles(prev => prev.filter((_, j) => j !== i))
                    }
                  }}
                >
                  <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
                  <Edges color="#000000" />
                </mesh>
              )
            })
          )
        })}
      </group>
    </>
  )
}
