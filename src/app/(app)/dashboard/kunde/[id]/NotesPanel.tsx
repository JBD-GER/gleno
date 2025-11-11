'use client'

import { useEffect, useState } from 'react'

type Note = { id: string; content: string; created_at: string }

export default function NotesPanel({
  customerId,
  initialNotes,
}: {
  customerId: string
  initialNotes: Note[]
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')

  const btnWhite =
    'rounded-lg border border-white/60 bg-white/70 px-3 py-1.5 text-sm text-slate-900 ' +
    'shadow-sm hover:bg-white backdrop-blur disabled:opacity-50'

  const inputGlass =
    'w-full rounded-lg border border-white/50 bg-white/70 p-3 text-sm text-slate-900 ' +
    'placeholder-slate-400 outline-none ring-offset-2 focus:border-blue-300 focus:ring-2 focus:ring-blue-200'

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setNotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!content.trim()) return
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error(await res.text())
      const created: Note = await res.json()
      setNotes(prev => [created, ...prev])
      setContent('')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div
      className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl"
      style={{ backgroundImage: 'radial-gradient(600px 300px at 110% -30%, rgba(15,23,42,0.06), transparent)' }}
    >
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Notizen</h2>

      {/* Liste – auf ~2 Einträge sichtbar begrenzt, danach Scroll */}
      <div className="max-h-48 overflow-auto space-y-2 pr-1"> {/* ~ 2 Cards sichtbar */}
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Notizen vorhanden.</p>
        ) : (
          notes.map(n => (
            <div
              key={n.id}
              className="rounded-xl border border-white/60 bg-white/60 p-3 shadow-sm backdrop-blur"
            >
              <div className="mb-1 text-[11px] text-slate-500">
                {new Date(n.created_at).toLocaleString('de-DE')}
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-800">{n.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Eingabe unten */}
      <div className="mt-4 rounded-xl border border-white/60 bg-white/70 p-3 backdrop-blur">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Kommentar hinzufügen…"
          className={`${inputGlass} min-h-[84px] resize-y`} // kompakter als vorher
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={submit} className={btnWhite}>Speichern</button>
          <button onClick={refresh} className={btnWhite} aria-busy={loading}>
            {loading ? 'Aktualisiere…' : 'Neu laden'}
          </button>
        </div>
      </div>
    </div>
  )
}
