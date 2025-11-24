'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

type Doc = {
  id: string
  path: string
  name: string | null
  size: number | null
  uploaded_at: string
}

export default function AppointmentDocuments({ appointmentId }: { appointmentId: string }) {
  const supa = supabaseClient()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
      credentials: 'include',
    })
    const data = res.ok ? ((await res.json()) as Doc[]) : []
    // Neueste oben
    setDocs(data.sort((a, b) => +new Date(b.uploaded_at) - +new Date(a.uploaded_at)))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId])

  const upload = async (files: FileList | null) => {
    if (!files || !files.length || uploading) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    })
    setUploading(false)
    if (!res.ok) {
      const { message } = await res
        .json()
        .catch(() => ({ message: 'Upload fehlgeschlagen' }))
      alert(message)
      return
    }
    await load()
  }

  const download = async (path: string) => {
    const { data, error } = await supa.storage.from('termin').createSignedUrl(path, 60)
    if (error || !data?.signedUrl) {
      alert(error?.message ?? 'Download fehlgeschlagen')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const remove = async (id: string) => {
    if (!confirm('Datei wirklich löschen?')) return
    const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ document_id: id }),
    })
    if (!res.ok) {
      const { message } = await res
        .json()
        .catch(() => ({ message: 'Löschen fehlgeschlagen' }))
      alert(message)
      return
    }
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const fmtSize = (b: number | null) => {
    if (!b) return '0 B'
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Dokumente</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white">
          <input
            type="file"
            className="hidden"
            multiple
            onChange={(e) => upload(e.target.files)}
          />
          {uploading ? 'Lade hoch…' : 'Datei hochladen'}
        </label>
      </div>

      <div className="flex max-h-72 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {loading ? (
          <div className="px-4 py-3 text-sm text-slate-600">Lade…</div>
        ) : docs.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-500">
            Noch keine Dokumente. Laden Sie oben Dateien hoch.
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-white/70 overflow-y-auto">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">
                    {d.name ?? d.path.split('/').pop()}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formattedDate(d.uploaded_at)} • {fmtSize(d.size)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => download(d.path)}
                    className="rounded-lg border border-white/60 bg-white/90 p-1.5 text-slate-900 shadow-sm hover:bg-white"
                    title="Herunterladen"
                    aria-label="Herunterladen"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(d.id)}
                    className="rounded-lg border border-white/60 bg-white/90 p-1.5 text-slate-900 shadow-sm hover:bg-white"
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
