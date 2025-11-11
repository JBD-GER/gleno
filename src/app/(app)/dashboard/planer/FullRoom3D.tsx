// File: src/app/(app)/dashboard/planer/FullRoom3D.tsx
'use client'

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import * as THREE from 'three'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
// @ts-ignore drei’s Typenexport für TransformControls ist aktuell unvollständig
import { OrbitControls, TransformControls } from '@react-three/drei'
import type { Segment, WallConfig, Opening } from './types'
import TileLayer, { type TileSize } from './TileLayer'
import WallTileLayer from './WallTileLayer'

// Falls Bounds-Typ nicht exportiert, hier neu definieren
export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface Props {
  segments: Segment[]
  configs:  WallConfig[]
  openings: Opening[]
  setOpenings: Dispatch<SetStateAction<Opening[]>>
}

export default function FullRoom3D({
  segments,
  configs,
  openings,
  setOpenings,
}: Props) {
  // Refs für TransformControls
  const orbitRef     = useRef<any>(null)
  const transformRef = useRef<any>(null)
  const meshRefs     = useRef<THREE.Mesh[]>([])

  // State für TransformControls / Undo
  const [activeIdx, setActiveIdx] = useState<number|null>(null)
  const [mode, setMode]           = useState<'translate'|'rotate'>('translate')

  // Zum Rücksetzen merken wir den Ur-Zustand pro Öffnung
  const originRef = useRef<Record<number, {
    dx: number; dy: number; dz: number;
    relQuat: [number,number,number,number];
  }>>({})

  //
  // == 1) Bodenpunkte in Metern aus den Segmenten ==
  //
  const pts = useMemo(() => {
    const out = [{ x: 0, z: 0 }]
    for (const { length, angle } of segments) {
      const last = out[out.length - 1]
      const rad  = angle * Math.PI / 180
      out.push({
        x: last.x + (length / 100) * Math.cos(rad),
        z: last.z + (length / 100) * Math.sin(rad),
      })
    }
    return out
  }, [segments])

  //
  // == 2) Bounds und Kameraposition ==
  //
  const { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth } = useMemo(() => {
    const xs = pts.map(p => p.x), zs = pts.map(p => p.z)
    const _minX = Math.min(...xs), _maxX = Math.max(...xs)
    const _minZ = Math.min(...zs), _maxZ = Math.max(...zs)
    return {
      minX:   _minX,
      maxX:   _maxX,
      minZ:   _minZ,
      maxZ:   _maxZ,
      centerX: (_minX + _maxX) / 2,
      centerZ: (_minZ + _maxZ) / 2,
      width:  _maxX - _minX,
      depth:  _maxZ - _minZ,
    }
  }, [pts])
  const camPos    = [centerX, Math.max(width, depth) * 1.5, centerZ] as [number,number,number]
  const thickness = 0.02

  //
  // == 3) Wand-Basis (Startpunkt + Basis-Yaw) für Öffnungen ==
  //
  const getWallBase = useCallback((o: Opening) => {
    const A = pts[o.wallIndex], B = pts[o.wallIndex + 1]
    const dx = B.x - A.x, dz = B.z - A.z
    const segL = Math.hypot(dx, dz)
    return {
      sx:      A.x + (o.position / 100) * (dx / segL),
      sz:      A.z + (o.position / 100) * (dz / segL),
      baseYaw: -Math.atan2(dz, dx),
    }
  }, [pts])

  //
  // == 4) Öffnungs-Mesh-State lesen / speichern ==
  //
  const computeState = useCallback((idx: number) => {
    const o    = openings[idx]
    const mesh = meshRefs.current[idx]
    if (!mesh) return null
    const { sx, sz, baseYaw } = getWallBase(o)
    const dx = mesh.position.x - sx
    const dy = mesh.position.y
    const dz = mesh.position.z - sz
    const baseQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, baseYaw, 0, 'YXZ')
    )
    const relQuat = baseQuat.clone().invert().multiply(mesh.quaternion)
    return {
      dx, dy, dz,
      relQuat: [relQuat.x, relQuat.y, relQuat.z, relQuat.w] as [number,number,number,number],
    }
  }, [getWallBase, openings])

  const saveActive = useCallback((idx: number) => {
    const st = computeState(idx)
    if (!st) return
    setOpenings(prev =>
      prev.map((o,i) => i === idx ? ({ ...o, ...st } as Opening) : o)
    )
    if (!originRef.current[idx]) {
      originRef.current[idx] = st
    }
  }, [computeState, setOpenings])

  useEffect(() => {
    const ctrl: any = transformRef.current
    if (!ctrl) return
    const onDrag = (e:{value:boolean}) => {
      orbitRef.current.enabled = !e.value
      if (!e.value && activeIdx !== null) saveActive(activeIdx)
    }
    const onObj = () => { if(activeIdx !== null) saveActive(activeIdx) }
    ctrl.addEventListener('dragging-changed', onDrag)
    ctrl.addEventListener('objectChange', onObj)
    return () => {
      ctrl.removeEventListener('dragging-changed', onDrag)
      ctrl.removeEventListener('objectChange', onObj)
    }
  }, [activeIdx, saveActive])

  useEffect(() => {
    return () => {
      if (activeIdx !== null) {
        saveActive(activeIdx)
        setActiveIdx(null)
      }
    }
  }, [activeIdx, saveActive])

  //
  // == 5) Exaktes Boden-Shape (Punkte relativ zum Mittelpunkt) ==
  //
  const floorShape = useMemo(() => {
    const shape = new THREE.Shape()
    if (pts.length > 1) {
      shape.moveTo(pts[0].x - centerX, pts[0].z - centerZ)
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i].x - centerX, pts[i].z - centerZ)
      }
      shape.closePath()
    }
    return shape
  }, [pts, centerX, centerZ])

  //
  // == 6) Neue Boden-„pts“ aus floorShape extrahieren (Nischen mit) ==
  //
  const ptsFromShape = useMemo(() => {
    const { shape: ring2d } = floorShape.extractPoints(1)
    return ring2d.map(p2d => ({
      x: p2d.x + centerX,
      z: p2d.y + centerZ,
    }))
  }, [floorShape, centerX, centerZ])

  //
  // == 7) Region für Wand-Markierung speichern ==
  //
  const [wallBounds, setWallBounds] = useState<Bounds|null>(null)
  const handleWallMarkComplete = useCallback((bounds: Bounds) => {
    setWallBounds(bounds)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar Verschieben / Drehen / Undo */}
      <div className="flex items-center justify-between p-2 bg-gray-100">
        <div className="space-x-2">
          <button
            onClick={() => setMode('translate')}
            className={`px-3 py-1 rounded ${mode === 'translate' ? 'bg-black text-white' : 'bg-gray-200'}`}
          >Verschieben</button>
          <button
            onClick={() => setMode('rotate')}
            className={`px-3 py-1 rounded ${mode === 'rotate'    ? 'bg-black text-white' : 'bg-gray-200'}`}
          >Drehen</button>
        </div>
        {activeIdx !== null && (
          <button
            onClick={() => {
              const idx = activeIdx
              const origin = originRef.current[idx]!
              const o      = openings[idx]
              const { sx, sz, baseYaw } = getWallBase(o)
              const mesh  = meshRefs.current[idx]!
              mesh.position.set(sx + origin.dx, origin.dy, sz + origin.dz)
              const [qx,qy,qz,qw] = origin.relQuat
              const relQ = new THREE.Quaternion(qx,qy,qz,qw)
              const baseQ= new THREE.Quaternion().setFromEuler(
                new THREE.Euler(0, baseYaw, 0, 'YXZ')
              )
              mesh.quaternion.copy(baseQ.multiply(relQ))
              setOpenings(prev =>
                prev.map((oo,i) =>
                  i===idx
                    ? ({ ...oo, dx:origin.dx, dy:origin.dy, dz:origin.dz, relQuat: origin.relQuat } as Opening)
                    : oo
                )
              )
              setActiveIdx(null)
            }}
            className="px-3 py-1 bg-yellow-400 rounded"
          >Rückgängig</button>
        )}
      </div>

      {/* 3D-Canvas */}
      <div className="flex-1">
        <Canvas
          style={{ background: '#fff' }}
          shadows
          camera={{ position: camPos, fov: 60 }}
          onPointerMissed={() => {
            if (activeIdx !== null) {
              saveActive(activeIdx)
              setActiveIdx(null)
            }
          }}
        >
          <ambientLight intensity={0.6}/>
          <directionalLight position={[5,10,5]} intensity={1}/>

          {/* -- Exakter Boden */}
          <mesh
            name="floor"
            position={[centerX, 0, centerZ]}
            rotation={[Math.PI/2, 0, 0]}
            receiveShadow
          >
            <shapeGeometry args={[floorShape]}/>
            <meshStandardMaterial color="#eee" transparent opacity={0.5} side={THREE.DoubleSide}/>
          </mesh>

          {/* -- TileLayer (Floor & Wall Mark) */}
          <TileLayer
            pts={ptsFromShape}
            segments={segments}
            onDrawModeChange={draw => {
              if (orbitRef.current) orbitRef.current.enabled = !draw
            }}
            onTileSizeChange={size => {
              /* optional: speichern */ 
            }}
            onWallMarkComplete={handleWallMarkComplete}
          />

          {/* -- Wände befliesen nur im markierten Bereich -- */}
          {wallBounds && (
            <WallTileLayer
              pts={pts}
              configs={configs}
              openings={openings}
              tileSize={/* über TileLayer bekannt */ (undefined as any as TileSize)}
              regionBounds={wallBounds}    // nur dort filtern
            />
          )}

          {/* -- Exakte Decke */}
          <mesh
            position={[centerX, configs[0]?.height! / 100, centerZ]}
            rotation={[Math.PI/2, 0, 0]}
            castShadow
          >
            <shapeGeometry args={[floorShape]}/>
            <meshStandardMaterial color="#ddd" transparent opacity={0.4} side={THREE.DoubleSide}/>
          </mesh>

          {/* -- Original-Wände (ohne Fliesen) */}
          {pts.slice(1).map((_, i) => {
            const cfg    = configs[i] || { height: 250, pitch: 0, pitchStart: 0 }
            const hTot   = cfg.height   / 100
            const hStart = cfg.pitchStart / 100
            const dh     = hTot - hStart
            const a      = cfg.pitch * Math.PI / 180
            const slope  = a>0 ? dh/Math.sin(a) : 0
            const A = pts[i], B = pts[i+1]
            const dx = B.x - A.x, dz = B.z - A.z
            const segL = Math.hypot(dx, dz)
            const yaw  = -Math.atan2(dz, dx)
            const midX = (A.x + B.x)/2, midZ = (A.z + B.z)/2
            return (
              <group key={i} position={[midX,0,midZ]} rotation={[0,yaw,0]}>
                <mesh position={[0,hTot/2,0]}>
                  <boxGeometry args={[segL,hTot,thickness]}/>
                  <meshStandardMaterial color="#ccc" transparent opacity={0.6}/>
                </mesh>
                {cfg.pitch>0 && dh>0 && (()=>{
                  const geo = new THREE.PlaneGeometry(segL,slope)
                  geo.translate(0,slope/2,0)
                  return (
                    <mesh geometry={geo}
                          position={[0,hStart,thickness/2]}
                          rotation={[Math.PI/2 - a,0,0]}>
                      <meshStandardMaterial color="#f66"
                                            transparent opacity={0.6}
                                            side={THREE.DoubleSide}/>
                    </mesh>
                  )
                })()}
              </group>
            )
          })}

          {/* -- Öffnungen zum Verschieben/Drehen */}
          {openings.map((o, idx) => {
            const { sx, sz, baseYaw } = getWallBase(o)
            const x = sx + (o.dx||0), y = o.dy||0, z = sz + (o.dz||0)
            const relQ  = new THREE.Quaternion(...(o.relQuat||[0,0,0,1]))
            const baseQ = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(0, baseYaw, 0,'YXZ')
            )
            const quat = baseQ.multiply(relQ)
            return (
              <mesh key={idx}
                    ref={el=>meshRefs.current[idx]=el!}
                    position={[x,y,z]}
                    quaternion={quat.toArray() as [number,number,number,number]}
                    onPointerDown={(e:ThreeEvent<PointerEvent>)=>{
                      e.stopPropagation()
                      const init = computeState(idx)!
                      if(!originRef.current[idx]) originRef.current[idx]=init
                      setActiveIdx(idx)
                    }}>
                <boxGeometry args={[o.width/100, o.height/100, 0.05]}/>
                <meshStandardMaterial
                  color={o.type==='door'?'#841':'#148'}
                  transparent opacity={0.8}/>
              </mesh>
            )
          })}

          {/* -- TransformControls & OrbitControls -- */}
          {activeIdx!==null && (
            <TransformControls
              ref={transformRef}
              object={meshRefs.current[activeIdx]}
              mode={mode}
              showX showY showZ={false}
              space="local"
            />
          )}
          <OrbitControls
            ref={orbitRef}
            enablePan enableZoom enableRotate makeDefault
          />

        </Canvas>
      </div>
    </div>
  )
}
