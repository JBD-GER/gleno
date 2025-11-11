// File: src/app/(app)/dashboard/planer/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import FloorPlan2D    from './FloorPlan2D'
import WandConfig     from './WandConfig'
import OpeningsConfig from './OpeningsConfig'
import type { Segment, WallConfig, Opening } from './types'

const FullRoom3D = dynamic(() => import('./FullRoom3D'), { ssr: false })

const STORAGE_KEY = 'openings'
function loadOpenings(): Opening[] {
  if (typeof window==='undefined') return []
  const s = window.localStorage.getItem(STORAGE_KEY)
  return s ? JSON.parse(s) : []
}
function saveOpenings(openings: Opening[]) {
  if (typeof window==='undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openings))
}

export default function PlanerPage() {
  const [activeTab, setActiveTab]     = useState<'Boden'|'Wand'|'3D'>('Boden')
  const [segments, setSegments]       = useState<Segment[]>([])
  const [wallConfigs, setWallConfigs] = useState<WallConfig[]>([])
  const [openings, setOpenings]       = useState<Opening[]>(() => loadOpenings())
  const was3D = useRef(false)

  // persist on change
  useEffect(()=>{ saveOpenings(openings) }, [openings])

  // reset Wände+Öffnungen bei Neu-Plan
  useEffect(()=>{
    setWallConfigs(segments.map(()=>({height:250,pitch:0,pitchStart:0})))
    setOpenings([])
  },[segments])

  // final persist on leave 3D
  useEffect(()=>{
    if(was3D.current && activeTab!=='3D') saveOpenings(openings)
    was3D.current = (activeTab==='3D')
  },[activeTab,openings])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex border-b bg-gray-100">
        {['Boden','Wand','3D'].map(tab=>(
          <button
            key={tab}
            onClick={()=>setActiveTab(tab as any)}
            className={`px-6 py-3 hover:bg-gray-200 ${
              activeTab===tab
                ? 'border-b-2 border-primary text-primary font-semibold'
                : 'text-gray-600'
            }`}
          >{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {activeTab==='Boden' && (
          <FloorPlan2D segments={segments} setSegments={setSegments} title="Boden planen"/>
        )}
        {activeTab==='Wand' && (
          <>
            <WandConfig segments={segments} configs={wallConfigs} setConfigs={setWallConfigs}/>
            <OpeningsConfig openings={openings} setOpenings={setOpenings}/>
          </>
        )}
        {activeTab==='3D' && (
          <FullRoom3D
            segments={segments}
            configs={wallConfigs}
            openings={openings}
            setOpenings={setOpenings}
          />
        )}
      </div>
    </div>
  )
}
