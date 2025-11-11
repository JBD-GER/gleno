'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Segment, Opening } from './types'

// Bounds-Typ für onRectChange / onComplete
export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface TileSize {
  width: number
  height: number
}

interface Props {
  tileSize: TileSize
  segments: Segment[]
  openings: Opening[]            // neu: Türen/Fenster, für Wand-Logik
  drawMode: boolean              // aktivierter Zeichen-Modus
  wallMode?: boolean             // neu: true = Wand-Modus, false = Boden-Modus
  onRectChange?: (bounds: Bounds) => void
  onComplete: (tiles: { position: THREE.Vector3 }[], bounds: Bounds) => void
  onCancel: () => void
}

export default function TileSelector({
  tileSize,
  segments,
  openings = [],         // default leer
  drawMode,
  wallMode = false,      // default Boden
  onRectChange,
  onComplete,
  onCancel,
}: Props) {
  const { gl, scene, camera } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  // start/cur Punkt: 
  // Boden: x/z Koordinate, y=Höhe
  // Wand: x=U (Meter entlang Wand), y=V (Meter Höhe), z=wallIndex
  const [startPt, setStartPt] = useState<THREE.Vector3|null>(null)
  const [curPt,   setCurPt]   = useState<THREE.Vector3|null>(null)
  const [rectPts, setRectPts] = useState<THREE.Vector3[]>([])

  // Maus → NDC
  const updateMouse = useCallback((e: MouseEvent) => {
    const r = gl.domElement.getBoundingClientRect()
    mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
    mouse.current.y = -((e.clientY - r.top)  / r.height) * 2 + 1
  }, [gl.domElement])

  // Intersection mit floor und unsichtbaren Wand-Planes
  const getHit = useCallback(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const objs: THREE.Object3D[] = []
    scene.traverse(o => {
      if (o.name === 'floor' || o.userData.wallIndex !== undefined) {
        objs.push(o)
      }
    })
    const hits = raycaster.current.intersectObjects(objs, false)
    return hits.length > 0 ? hits[0] : null
  }, [camera, scene])

  // Wand-Modus: Weltpunkt → (u,v) + Basis-Info
  const worldToUV = useCallback((pt: THREE.Vector3, idx: number) => {
    // baue Meter-Punkte aus segments
    const ptsM = segments.reduce<THREE.Vector3[]>((arr, seg, i) => {
      if (i === 0) arr.push(new THREE.Vector3(0,0,0))
      const last = arr[arr.length-1]
      const rad = seg.angle * Math.PI/180
      arr.push(new THREE.Vector3(
        last.x + seg.length/100 * Math.cos(rad),
        0,
        last.z + seg.length/100 * Math.sin(rad)
      ))
      return arr
    }, [])
    const A = ptsM[idx], B = ptsM[idx+1]
    const dir = B.clone().sub(A).normalize()
    const diff= new THREE.Vector3(pt.x-A.x, pt.y, pt.z-A.z)
    const u = diff.dot(dir)
    const v = pt.y
    return { u, v, A, dir }
  }, [segments])

  // Pointer-Down: Startpunkt setzen
  const onDown = useCallback((e: MouseEvent) => {
    if (!drawMode) return
    updateMouse(e)
    const hit = getHit()
    if (!hit) return

    if (wallMode && hit.object.userData.wallIndex!==undefined) {
      const idx = hit.object.userData.wallIndex as number
      const { u,v } = worldToUV(hit.point, idx)
      setStartPt(new THREE.Vector3(u,v,idx))
      setCurPt(  new THREE.Vector3(u,v,idx))
      setRectPts([hit.point,hit.point,hit.point,hit.point,hit.point])
      onRectChange?.({ minX:u, maxX:u, minZ:v, maxZ:v })
    }
    else if (!wallMode && hit.object.name==='floor') {
      setStartPt(hit.point.clone())
      setCurPt(  hit.point.clone())
      setRectPts([hit.point,hit.point,hit.point,hit.point,hit.point])
      onRectChange?.({
        minX:hit.point.x, maxX:hit.point.x,
        minZ:hit.point.z, maxZ:hit.point.z,
      })
    }
  }, [drawMode, wallMode, getHit, updateMouse, onRectChange, worldToUV])

  // Pointer-Move: Rahmen aktualisieren
  const onMove = useCallback((e: MouseEvent) => {
    if (!drawMode || !startPt) return
    updateMouse(e)
    const hit = getHit()
    if (!hit) return

    if (wallMode) {
      const idx = startPt.z
      const { u,v,A,dir } = worldToUV(hit.point, idx)
      setCurPt(new THREE.Vector3(u,v,idx))
      const u0 = startPt.x, v0 = startPt.y
      const u1 = u,        v1 = v
      const P0 = A.clone().add(dir.clone().multiplyScalar(u0)).add(new THREE.Vector3(0,v0,0))
      const P1 = A.clone().add(dir.clone().multiplyScalar(u1)).add(new THREE.Vector3(0,v0,0))
      const P2 = A.clone().add(dir.clone().multiplyScalar(u1)).add(new THREE.Vector3(0,v1,0))
      const P3 = A.clone().add(dir.clone().multiplyScalar(u0)).add(new THREE.Vector3(0,v1,0))
      setRectPts([P0,P1,P2,P3,P0])
      onRectChange?.({
        minX: Math.min(u0,u), maxX: Math.max(u0,u),
        minZ: Math.min(v0,v), maxZ: Math.max(v0,v),
      })
    } else {
      const a = startPt, b = hit.point
      setCurPt(b.clone())
      const p0 = new THREE.Vector3(a.x,a.y,a.z)
      const p1 = new THREE.Vector3(b.x,a.y,a.z)
      const p2 = new THREE.Vector3(b.x,a.y,b.z)
      const p3 = new THREE.Vector3(a.x,a.y,b.z)
      setRectPts([p0,p1,p2,p3,p0])
      onRectChange?.({
        minX: Math.min(a.x,b.x), maxX: Math.max(a.x,b.x),
        minZ: Math.min(a.z,b.z), maxZ: Math.max(a.z,b.z),
      })
    }
  }, [drawMode, wallMode, startPt, getHit, updateMouse, onRectChange, worldToUV])

  // Pointer-Up: Fertigstellen
  const onUp = useCallback(() => {
    if (!startPt || !curPt) { onCancel(); return }
    if (wallMode) {
      const u0 = Math.min(startPt.x, curPt.x)
      const u1 = Math.max(startPt.x, curPt.x)
      const v0 = Math.min(startPt.y, curPt.y)
      const v1 = Math.max(startPt.y, curPt.y)
      const idx = startPt.z
      const { A, dir } = worldToUV(new THREE.Vector3(startPt.x, 0, startPt.z), idx)
      const cols = Math.ceil((u1-u0)/tileSize.width)
      const rows = Math.ceil((v1-v0)/tileSize.height)
      const out: { position: THREE.Vector3 }[] = []
      for (let i=0; i<cols; i++){
        for (let j=0; j<rows; j++){
          const uMid = u0 + tileSize.width*(i+0.5)
          const vMid = v0 + tileSize.height*(j+0.5)
          const pos = A.clone()
            .add(dir.clone().multiplyScalar(uMid))
            .add(new THREE.Vector3(0,vMid,0))
          out.push({ position: pos })
        }
      }
      onComplete(out, { minX:u0, maxX:u1, minZ:v0, maxZ:v1 })
    } else {
      const a = startPt, b = curPt
      const minX = Math.min(a.x,b.x), maxX = Math.max(a.x,b.x)
      const minZ = Math.min(a.z,b.z), maxZ = Math.max(a.z,b.z)
      const cols = Math.ceil((maxX-minX)/tileSize.width)
      const rows = Math.ceil((maxZ-minZ)/tileSize.height)
      const out: { position: THREE.Vector3 }[] = []
      for (let i=0; i<cols; i++){
        for (let j=0; j<rows; j++){
          const xMid = minX + tileSize.width*(i+0.5)
          const zMid = minZ + tileSize.height*(j+0.5)
          out.push({ position: new THREE.Vector3(xMid, a.y+0.001, zMid) })
        }
      }
      onComplete(out, { minX, maxX, minZ, maxZ })
    }
    setStartPt(null)
    setCurPt(null)
    setRectPts([])
  }, [curPt, startPt, tileSize, wallMode, onComplete, onCancel, worldToUV])

  // Event-Listener
  useEffect(() => {
    if (!drawMode) return
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [drawMode, onDown, onMove, onUp])

  // grüner Rahmen
  return rectPts.length > 0 ? (
    <Line points={rectPts} color="lime" lineWidth={2} dashed={false} />
  ) : null
}
