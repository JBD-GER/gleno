'use client'

import React, { useEffect, useState } from 'react'

const card = 'rounded-2xl border border-white/60 bg-white/80 p-4'
const btnGhost = 'inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-3 py-1.5 text-sm text-slate-900 shadow-sm hover:shadow transition'

function FullscreenView({ open, onClose, applicationId }: { open: boolean, onClose: ()=>void, applicationId: string|null }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!open || !applicationId) return
    let canceled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/partners/applications/${applicationId}`)
        const j = await res.json()
        if (!canceled) setData(j)
      } catch {
        if (!canceled) setData(null)
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [open, applicationId])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-[121] w-full h-full bg-white/90 ring-1 ring-white/60">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/60">
            <h3 className="text-lg font-semibold text-slate-900">Bewerbung</h3>
            <button onClick={onClose} className={btnGhost}>Schließen</button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {loading && <div>Lade …</div>}
            {!loading && data && (
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.message_html || '' }} />
                {Array.isArray(data.files) && data.files.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-1">Anhänge</div>
                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {data.files.map((f:any) => <li key={f.id}>{f.name}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsViewer({ items }: { items: any[] }) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string|null>(null)

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className={card}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-slate-900 font-medium">
                {a.partner?.display_name || a.partner?.company_name || 'Partner'} · <span className="text-slate-600">{new Date(a.created_at).toLocaleString('de-DE')}</span>
              </div>
              <div className="text-sm text-slate-700 line-clamp-2 mt-1">{a.message_text || '—'}</div>
            </div>
            <div className="flex-shrink-0">
              <button
                className={btnGhost}
                onClick={() => { setActiveId(a.id); setViewerOpen(true) }}
              >
                Aufrufen
              </button>
            </div>
          </div>
        </div>
      ))}

      <FullscreenView
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        applicationId={activeId}
      />
    </div>
  )
}
