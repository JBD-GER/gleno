'use client'

import { useEffect, useState } from 'react'
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline'

type Note = {
  id: string
  content: string
  created_at: string
  created_by: string | null
}

export default function AppointmentNotes({ appointmentId }: { appointmentId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}/notes`, {
      credentials: 'include',
    })
    const data = res.ok ? ((await res.json()) as Note[]) : []
    // Neueste zuerst anzeigen
    setNotes(data.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId])

  const add = async () => {
    const content = text.trim()
    if (!content || saving) return
    setSaving(true)
    const res = await fetch(`/api/appointments/${appointmentId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    })
    setSaving(false)
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Fehler' }))
      alert(message)
      return
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
      body: JSON.stringify({ note_id: id }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Fehler' }))
      alert(message)
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  const disabled = !text.trim() || saving

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Notizen</h3>
        <span className="rounded-full border border-white/60 bg-white/80 px-2.5 py-0.5 text-[11px] text-slate-600 backdrop-blur">
          {notes.length === 0 ? 'Keine Notizen' : `${notes.length} Notiz${notes.length > 1 ? 'en' : ''}`}
        </span>
      </div>

      {/* Card: Header + scrollbare Liste + Input unten */}
      <div className="flex max-h-72 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {/* Liste / Inhalt */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-600">Lade…</div>
          ) : notes.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Noch keine Notizen. Einfach unten eine Notiz hinzufügen.
            </div>
          ) : (
            <ul className="divide-y divide-white/70">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap text-slate-900">{n.content}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formattedDate(n.created_at)}</p>
                  </div>
                  <button
                    onClick={() => remove(n.id)}
                    className="shrink-0 rounded-md border border-white/60 bg-white/80 p-1.5 text-slate-900 hover:bg-white"
                    title="Notiz löschen"
                    aria-label="Notiz löschen"
                  >
                    <TrashIcon className="h-4 w-4 text-rose-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Eingabe unten – mobil gestapelt, Desktop nebeneinander */}
        <div className="border-t border-white/70 bg-white/90 px-3 py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
              }}
              placeholder="Neue Notiz hinzufügen… (Strg/⌘ + Enter zum Speichern)"
              className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:border-slate-300 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={add}
              disabled={disabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
              {saving ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
