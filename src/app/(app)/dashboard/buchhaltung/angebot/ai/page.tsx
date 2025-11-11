'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AIPromptOfferPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string|null>(null)
  const router = useRouter()

async function handleGenerate() {
  if (!prompt.trim() || loading) return
  setLoading(true); setErr(null)
  try {
    // Draft vor neuem Versuch leeren – verhindert „alter Entwurf wird übernommen“
    try { sessionStorage.removeItem('ai_offer_draft') } catch {}

    const res = await fetch('/api/ai/draft-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Fehler')

    sessionStorage.setItem('ai_offer_draft', JSON.stringify(data))
    router.push('/dashboard/buchhaltung/angebot/angebot-erstellen')
  } catch (e:any) {
    setErr(e?.message || 'Fehler beim Erzeugen des Entwurfs.')
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] text-slate-700">
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <h1 className="text-2xl font-medium text-slate-900">KI-Angebotshelfer</h1>
        <p className="text-sm text-slate-600">Beschreibe kurz, was angeboten werden soll. Beispiel: „30 m² Badezimmer: Fliesen entfernen, Untergrund vorbereiten, neue Feinsteinzeug-Fliesen verlegen, Silikonfugen – inkl. Material.“</p>
        <textarea
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-white/60 bg-white/90 p-3 outline-none ring-indigo-200/60 focus:ring-4"
          placeholder="Dein Prompt…"
        />
        {err && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{err}</div>}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={()=>router.push('/dashboard/buchhaltung/angebot/angebot-erstellen')}
            className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm"
          >
            Ohne KI fortfahren
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className={`rounded-lg px-4 py-2 text-sm text-white ${(!prompt.trim()||loading) ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {loading ? 'Erzeuge…' : 'Entwurf erzeugen & weiter'}
          </button>
        </div>
      </div>
    </div>
  )
}
