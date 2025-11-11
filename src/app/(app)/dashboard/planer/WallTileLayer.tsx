'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import type { Opening, WallConfig } from './types'
import type { TileSize } from './TileLayer'
import type { Bounds } from './TileSelector'

interface WallTile {
  seg: number      // Segment-Index
  u: number        // Meter entlang der Wand
  v: number        // Meter über dem Boden
  width: number    // Fliesen-Breite in m
  height: number   // Fliesen-Höhe in m
}

interface Props {
  pts: { x:number; z:number }[]    // Wand-Eckpunkte
  configs: WallConfig[]            // Höhen etc. pro Segment
  openings: Opening[]              // Türen/Fenster
  tileSize: TileSize               // gewählte Fliesenmaße
  /** Wenn gesetzt: nur in dieser XZ-Region auf der Wand fliesen */
  regionBounds?: Bounds
}

export default function WallTileLayer({
  pts, configs, openings, tileSize, regionBounds
}: Props) {
  // 1) Erzeuge alle möglichen Wand-Tiles
  const wallTiles = useMemo<WallTile[]>(() => {
    const out: WallTile[] = []
    const { width: wM, height: hM } = tileSize

    // pro Segment
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i+1]
      const dx = B.x - A.x, dz = B.z - A.z
      const segLen = Math.hypot(dx, dz)
      const cfg = configs[i]
      const wallH = cfg.height / 100

      // horizontale Aufteilung in Spalten
      const cols = Math.ceil(segLen / wM)
      const colW = Array.from({length: cols}, (_, c) => {
        const rem = segLen - c*wM
        return rem < wM ? rem : wM
      })

      // vertikale Aufteilung in Reihen
      const rows = Math.ceil(wallH / hM)
      const rowH = Array.from({length: rows}, (_, r) => {
        const rem = wallH - r*hM
        return rem < hM ? rem : hM
      })

      // Öffnungen in diesem Segment
      const segOpens = openings
        .filter(o => o.wallIndex === i)
        .map(o => {
          const start = o.position/100
          const end   = start + o.width/100
          const bottom= o.dy ?? 0
          const top   = bottom + o.height/100
          return { start, end, bottom, top }
        })

      // Tiles pro Zelle prüfen
      let u0 = 0
      colW.forEach((cw, ci) => {
        const uC = u0 + cw/2
        let v0 = 0
        rowH.forEach((rh, rj) => {
          const vC = v0 + rh/2
          const inOpen = segOpens.some(op =>
            uC + cw/2 > op.start &&
            uC - cw/2 < op.end   &&
            vC + rh/2 > op.bottom &&
            vC - rh/2 < op.top
          )
          if (!inOpen) {
            out.push({ seg: i, u: uC, v: vC, width: cw, height: rh })
          }
          v0 += rh
        })
        u0 += cw
      })
    }

    // 2) Optional: filter nach regionBounds
    if (regionBounds) {
      return out.filter(t => {
        const A = pts[t.seg], B = pts[t.seg+1]
        const dx = B.x - A.x, dz = B.z - A.z
        const segLen = Math.hypot(dx, dz)
        const midX = A.x + (dx/segLen)*t.u
        const midZ = A.z + (dz/segLen)*t.u
        return (
          midX >= regionBounds.minX - 1e-6 &&
          midX <= regionBounds.maxX + 1e-6 &&
          midZ >= regionBounds.minZ - 1e-6 &&
          midZ <= regionBounds.maxZ + 1e-6
        )
      })
    }

    return out
  }, [pts, configs, openings, tileSize, regionBounds])

  // 3) Rendern
  return (
    <group>
      {wallTiles.map((t, idx) => {
        const A = pts[t.seg], B = pts[t.seg+1]
        const dx = B.x - A.x, dz = B.z - A.z
        const segLen = Math.hypot(dx, dz)
        const yaw    = -Math.atan2(dz, dx)
        const midX   = A.x + (dx/segLen)*t.u
        const midZ   = A.z + (dz/segLen)*t.u
        const worldY = t.v

        return (
          <mesh
            key={idx}
            rotation={[0, yaw, 0]}
            position={[midX, worldY, midZ]}
          >
            <planeGeometry args={[t.width, t.height]} />
            <meshStandardMaterial color="#fafafa" side={THREE.DoubleSide}/>
            <Edges color="#000000"/>
          </mesh>
        )
      })}
    </group>
  )
}
