// src/components/orders/InvoiceUploadModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  requestId: string
}

export default function InvoiceUploadModal({ open, onClose, requestId }: Props) {
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [okMsg, setOkMsg] = React.useState<string | null>(null)

  // Escape + Scroll-Lock
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const fd = new FormData()
      fd.set('category', 'rechnung')
      fd.set('filename', file.name)
      fd.set('file', file)

      const res = await fetch(`/api/chat/${requestId}/documents`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      setOkMsg('Rechnung hochgeladen.')
      window.dispatchEvent(
        new CustomEvent('documents:updated', { detail: { requestId } }),
      )
      setFile(null)
      setTimeout(onClose, 600)
    } catch (e: any) {
      setError(e?.message || 'Upload fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const node = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
        onClick={() => !busy && onClose()}
      />
      <div
        className="relative z-10 mt-8 w-full max-w-lg max-h-[92vh] overflow-y-auto
                   rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-6
                   shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-slate-900">
              Rechnung hochladen
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Lade hier deine Rechnung (PDF oder Bild) hoch. Der Status ist
              zunächst <b>„Erstellt“</b> und kann später in der Dokumenten-Cloud
              angepasst werden.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm"
          >
            Schließen
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="block text-xs text-slate-600 mb-1">
              Datei auswählen
            </span>
            <input
              type="file"
              accept=".pdf,image/*"
              className="block w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {error && (
            <div className="text-xs text-rose-600">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="text-xs text-emerald-600">
              {okMsg}
            </div>
          )}

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!file || busy}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Lädt…' : 'Hochladen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node
}
