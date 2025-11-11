'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

type Doc = { id: string; path: string; name: string | null; size: number | null; uploaded_at: string }

export default function AppointmentDocuments({ appointmentId }: { appointmentId: string }) {
  const supa = supabaseClient()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, { credentials: 'include' })
    const data = res.ok ? (await res.json() as Doc[]) : []
    setDocs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
      method: 'POST',
      body: fd,
      credentials: 'include'
    })
    setUploading(false)
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Upload fehlgeschlagen' }))
      alert(message); return
    }
    await load()
  }

  const download = async (path: string) => {
    const { data, error } = await supa.storage.from('termin').createSignedUrl(path, 60)
    if (error || !data?.signedUrl) { alert(error?.message ?? 'Download fehlgeschlagen'); return }
    window.open(data.signedUrl, '_blank')
  }

  const remove = async (id: string) => {
    if (!confirm('Datei wirklich löschen?')) return
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ document_id: id })
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Löschen fehlgeschlagen' }))
      alert(message); return
    }
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const fmtSize = (b: number | null) => {
    if (!b) return '0 B'
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Dokumente</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white">
          <input
            type="file"
            className="hidden"
            multiple
            onChange={e => upload(e.target.files)}
          />
          {uploading ? 'Lade hoch…' : 'Datei hochladen'}
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/60 bg-white/70 backdrop-blur">
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Lade…</div>
        ) : docs.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">Noch keine Dokumente.</div>
        ) : (
          <ul className="divide-y divide-white/60">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">
                    {d.name ?? d.path.split('/').pop()}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(d.uploaded_at).toLocaleString('de-DE')} • {fmtSize(d.size)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => download(d.path)}
                    className="rounded-md border border-white/60 bg-white/80 p-1.5 text-slate-900 hover:bg-white"
                    title="Herunterladen"
                    aria-label="Herunterladen"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(d.id)}
                    className="rounded-md border border-white/60 bg-white/80 p-1.5 text-slate-900 hover:bg-white"
                    title="Löschen"
                    aria-label="Löschen"
                  >
                    <TrashIcon className="h-4 w-4 text-rose-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
