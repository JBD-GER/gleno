'use client'

import { useEffect, useState } from 'react'
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline'

type Note = { id: string; content: string; created_at: string; created_by: string | null }

export default function AppointmentNotes({ appointmentId }: { appointmentId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}/notes`, { credentials: 'include' })
    const data = res.ok ? (await res.json() as Note[]) : []
    setNotes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const add = async () => {
    const content = text.trim()
    if (!content) return
    const res = await fetch(`/api/appointments/${appointmentId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Fehler' }))
      alert(message); return
    }
    setText('')
    await load()
  }

  const remove = async (id: string) => {
    if (!confirm('Notiz löschen?')) return
    const res = await fetch(`/api/appointments/${appointmentId}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ note_id: id })
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Fehler' }))
      alert(message); return
    }
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Notizen</h3>

      {/* Eingabe */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
          }}
          placeholder="Neue Notiz hinzufügen…"
          className="flex-1 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
        >
          <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
          Speichern
        </button>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-white/60 bg-white/70 backdrop-blur">
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Lade…</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">Noch keine Notizen.</div>
        ) : (
          <ul className="divide-y divide-white/60">
            {notes.map(n => (
              <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 whitespace-pre-wrap">
                  <div className="text-slate-900">{n.content}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString('de-DE')}
                  </div>
                </div>
                <button
                  onClick={() => remove(n.id)}
                  className="shrink-0 rounded-md border border-white/60 bg-white/80 p-1.5 text-slate-900 hover:bg-white"
                  title="Löschen"
                  aria-label="Notiz löschen"
                >
                  <TrashIcon className="h-4 w-4 text-rose-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
