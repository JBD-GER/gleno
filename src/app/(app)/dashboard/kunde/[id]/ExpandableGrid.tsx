'use client'

import { useState } from 'react'

export default function ExpandableGrid({
  cards,
  limit = 3,
  empty,
}: {
  cards: React.ReactNode[]
  limit?: number
  empty: React.ReactNode
}) {
  const [showAll, setShowAll] = useState(false)

  if (!cards || cards.length === 0) return <>{empty}</>

  const visible = showAll ? cards : cards.slice(0, limit)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((node, i) => (
          <div key={i}>{node}</div>
        ))}
      </div>

      {cards.length > limit && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="rounded-lg border border-white/60 bg-white/70 px-4 py-2 text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur"
          >
            {showAll ? 'Weniger anzeigen' : 'Alle anzeigen'}
          </button>
        </div>
      )}
    </div>
  )
}
