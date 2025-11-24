// src/app/dashboard/mitarbeiter/[id]/EmployeeDocuments.tsx
'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import {
  PaperClipIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

type DocFile = {
  name: string
  path: string
  size: number | null
  signed_url: string | null
  created_at: string | null
}

export default function EmployeeDocuments({
  employeeId,
}: {
  employeeId: string
}) {
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/employees/${employeeId}/documents`, {
      cache: 'no-store',
    })
    const data = await res.json()
    setFiles(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch {
      alert('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const onDelete = async (path: string) => {
    if (!confirm('Dokument wirklich löschen?')) return
    const res = await fetch(
      `/api/employees/${employeeId}/documents?path=${encodeURIComponent(
        path,
      )}`,
      { method: 'DELETE' },
    )
    if (!res.ok) return alert('Löschen fehlgeschlagen')
    await load()
  }

  return (
    <div className="space-y-4">
      {/* Upload-Leiste */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur sm:justify-start">
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Lädt…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <PaperClipIcon className="h-4 w-4" /> + Dokument hochladen
            </span>
          )}
          <input type="file" className="hidden" onChange={onUpload} />
        </label>

        <button
          onClick={load}
          className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur"
          title="Aktualisieren"
        >
          Aktualisieren
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-slate-500">Lade Dokumente…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-500">
          Noch keine Dokumente vorhanden.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex flex-col gap-2 rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">
                  {f.name}
                </div>
                <div className="text-xs text-slate-500">
                  {f.created_at
                    ? new Date(f.created_at).toLocaleString('de-DE')
                    : '—'}
                  {typeof f.size === 'number'
                    ? ` · ${(f.size / 1024).toFixed(1)} KB`
                    : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {f.signed_url && (
                  <a
                    href={f.signed_url}
                    target="_blank"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/60 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm hover:bg-white backdrop-blur sm:flex-none sm:px-3"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    Ansehen
                  </a>
                )}
                <button
                  onClick={() => onDelete(f.path)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/60 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm hover:bg-white backdrop-blur sm:flex-none sm:px-3"
                >
                  <TrashIcon className="h-4 w-4" />
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
