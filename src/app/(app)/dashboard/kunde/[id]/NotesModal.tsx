'use client'

import { useState } from 'react'

export default function NotesModal({
  onClose,
  onCreated,
  customerId,
}: {
  onClose: () => void
  onCreated: (note: { id: string; content: string; created_at: string }) => void
  customerId: string
}) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!content.trim()) {
      setError('Bitte gib einen Inhalt ein.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      onCreated(created)
    } catch (e) {
      console.error(e)
      setError('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      {/* Dialog */}
      <div className="absolute left-1/2 top-1/2 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-xl">
        <div className="max-h-[90vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Notiz hinzufügen
          </h3>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Schreibe eine interne Notiz zu diesem Kunden. Das Erstellungsdatum wird
            automatisch gespeichert.
          </p>

          <textarea
            className="mt-4 w-full min-h-[140px] resize-y rounded-xl border border-white/60 bg-white/70 p-3 text-sm text-slate-800 placeholder-slate-400 outline-none ring-offset-2 focus:ring-2 focus:ring-slate-300"
            placeholder="Notiz…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              onClick={submit}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-black disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
