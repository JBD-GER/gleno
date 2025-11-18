// src/app/(app)/dashboard/cloud/CloudClient.tsx
'use client'

import {
  useEffect,
  useMemo,
  useState,
  DragEvent,
  ChangeEvent,
} from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import {
  DocumentArrowUpIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

type Folder = {
  id: string
  name: string
  sort_order?: number
  created_at: string
}

type DocumentItem = {
  id: string
  folder_id: string
  name: string
  path: string
  size: number | null
  content_type: string | null
  uploaded_at: string
}

type ViewMode = 'grid' | 'list'

type Props = {
  userId: string
  userEmail: string
}

/* --- Helper für Datum --- */

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDisplayDate(value: string): string {
  const d = parseIsoDate(value)
  if (!d) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/* --- Kleiner Kalender-Popover --- */

type DateInputWithCalendarProps = {
  value: string
  onChange: (value: string) => void
}

function DateInputWithCalendar({ value, onChange }: DateInputWithCalendarProps) {
  const [open, setOpen] = useState(false)

  const initialDate = parseIsoDate(value) ?? new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )

  const displayValue = value ? formatDisplayDate(value) : ''

  const buildCalendar = () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const startWeekday = (startOfMonth.getDay() + 6) % 7 // Montag = 0
    const startDate = new Date(startOfMonth)
    startDate.setDate(startOfMonth.getDate() - startWeekday)

    const weeks: Date[][] = []
    let cursor = new Date(startDate)

    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }

  const weeks = buildCalendar()
  const selected = parseIsoDate(value)

  const handleSelect = (day: Date) => {
    onChange(toIsoDate(day))
    setOpen(false)
  }

  const goPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    )
  }

  const goNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder="tt.mm.jjjj"
          onClick={() => setOpen((o) => !o)}
          className="w-[108px] rounded-full border border-slate-200 bg-white px-3 py-1 pr-7 text-[11px] text-slate-600 shadow-sm outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <CalendarDaysIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-xs font-medium text-slate-900">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrevMonth}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-1 pt-1 text-[10px] text-slate-400">
            {WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-3 text-[11px]">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                const inCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isSelected =
                  selected &&
                  day.getFullYear() === selected.getFullYear() &&
                  day.getMonth() === selected.getMonth() &&
                  day.getDate() === selected.getDate()

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full transition',
                      inCurrentMonth ? 'text-slate-700' : 'text-slate-300',
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/50'
                        : 'hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </button>
                )
              }),
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="rounded-full px-2 py-1 hover:bg-slate-100 hover:text-slate-700"
            >
              Löschen
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                onChange(toIsoDate(today))
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setOpen(false)
              }}
              className="rounded-full px-2 py-1 text-slate-700 hover:bg-slate-100"
            >
              Heute
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* --- Hauptkomponente --- */

export default function CloudClient({ userId }: Props) {
  const supabase = supabaseClient()

  const [folders, setFolders] = useState<Folder[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  // Zeitraum-Filter (ISO: yyyy-mm-dd)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  // Suche
  const [searchTerm, setSearchTerm] = useState('')

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) ?? folders[0],
    [folders, activeFolderId],
  )

  const filteredDocuments = useMemo(() => {
    let docs = [...documents]

    if (dateFrom || dateTo) {
      const fromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
      const toMs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null

      docs = docs.filter((doc) => {
        const docMs = new Date(doc.uploaded_at).getTime()
        if (fromMs !== null && docMs < fromMs) return false
        if (toMs !== null && docMs > toMs) return false
        return true
      })
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      docs = docs.filter((doc) => doc.name.toLowerCase().includes(q))
    }

    return docs
  }, [documents, dateFrom, dateTo, searchTerm])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/cloud', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Laden der Cloud-Daten.')
        }
        setFolders(data.folders || [])
        setDocuments(data.documents || [])
        if (data.folders?.length && !activeFolderId) {
          setActiveFolderId(data.folders[0].id)
        }
      } catch (e: any) {
        setError(e.message || 'Unbekannter Fehler.')
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reloadDocuments = async (folderId: string) => {
    if (!folderId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cloud/documents?folder_id=${folderId}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Laden der Dokumente.')
      setDocuments(data.documents || [])
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler.')
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = async (folder: Folder) => {
    setActiveFolderId(folder.id)
    await reloadDocuments(folder.id)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreatingFolder(true)
    setError(null)
    try {
      const res = await fetch('/api/cloud/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Anlegen des Ordners.')

      setFolders((prev) => [...prev, data.folder])
      setNewFolderName('')
      setActiveFolderId(data.folder.id)
      setDocuments([])
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler.')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteFolder = async (folder: Folder) => {
    if (
      !window.confirm(
        `Ordner "${folder.name}" wirklich löschen? Alle enthaltenen Dokumente werden entfernt.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      const res = await fetch('/api/cloud/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folder.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen des Ordners.')

      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      if (activeFolderId === folder.id) {
        const remaining = folders.filter((f) => f.id !== folder.id)
        if (remaining.length > 0) {
          setActiveFolderId(remaining[0].id)
          reloadDocuments(remaining[0].id)
        } else {
          setActiveFolderId(null)
          setDocuments([])
        }
      }
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler.')
    }
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (!activeFolder) return
    const files = Array.from(e.dataTransfer.files || [])
    if (!files.length) return
    void handleFilesUpload(files, activeFolder.id)
  }

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeFolder) return
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    await handleFilesUpload(files, activeFolder.id)
    e.target.value = ''
  }

  const handleFilesUpload = async (files: File[], folderId: string) => {
    if (!files.length) return
    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const randomId = Math.random().toString(36).slice(2)
        const safeName = file.name.replace(/\s+/g, '_')
        const path = `${userId}/${folderId}/${randomId}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('cloud')
          .upload(path, file, {
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error', uploadError)
          throw new Error(uploadError.message)
        }

        const res = await fetch('/api/cloud/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder_id: folderId,
            name: file.name,
            path,
            size: file.size,
            content_type: file.type,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Speichern der Metadaten.')
        }

        setDocuments((prev) => [data.document, ...prev])
      }
    } catch (e: any) {
      setError(e.message || 'Fehler beim Hochladen.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!window.confirm(`Dokument "${doc.name}" wirklich löschen?`)) return
    setError(null)
    try {
      const res = await fetch('/api/cloud/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, path: doc.path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen des Dokuments.')

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler.')
    }
  }

  const handleOpenDocument = async (doc: DocumentItem) => {
    setError(null)
    setOpeningDocId(doc.id)
    try {
      const { data, error } = await supabase.storage
        .from('cloud')
        .createSignedUrl(doc.path, 60)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Konnte Dokument-URL nicht erzeugen.')
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      setError(e.message || 'Fehler beim Öffnen des Dokuments.')
    } finally {
      setOpeningDocId(null)
    }
  }

  const handleExport = async () => {
    if (!activeFolder || !filteredDocuments.length) return
    setExporting(true)
    setError(null)

    const docsForExport = filteredDocuments.map((d) => ({
      id: d.id,
      name: d.name,
      path: d.path,
      content_type: d.content_type,
    }))

    try {
      const res = await fetch('/api/cloud/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: docsForExport,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        let msg = 'Fehler beim Export.'
        try {
          const parsed = JSON.parse(text)
          if (parsed?.error) msg = parsed.error
        } catch {
          if (text) msg = text
        }
        throw new Error(msg)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeFolderName = (activeFolder.name || 'Dokumentenexport').replace(
        /\s+/g,
        '_',
      )
      const today = new Date().toISOString().slice(0, 10)

      a.href = url
      a.download = `${safeFolderName}_${today}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || 'Fehler beim Export.')
    } finally {
      setExporting(false)
    }
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatSize = (size: number | null) => {
    if (size == null) return '–'
    if (size < 1024) return `${size} B`
    const kb = size / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
  }

  const resetDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="relative min-h-[calc(100vh-6rem)] w-full text-slate-900">
      {/* Background-Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_60%)]" />
      </div>

      {/* HEADER-CARD */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Digitale Ablage für dein Business
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-md shadow-slate-900/40">
                <DocumentArrowUpIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Dokumenten-Cloud
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">
                  Belege, Rechnungen und Verträge an einem Ort – strukturiert nach Ordnern
                  und jederzeit abrufbar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-6 md:grid-cols-[260px,1fr]">
        {/* Ordner-Spalte */}
        <aside className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FolderIcon className="h-5 w-5 text-slate-400" />
              <span>Ordner</span>
            </div>
          </div>

          <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {folders.map((folder) => {
              const isActive = activeFolder?.id === folder.id
              return (
                <div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleFolderClick(folder)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      void handleFolderClick(folder)
                    }
                  }}
                  className={`group flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/40'
                      : 'bg-white/0 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs ${
                        isActive ? 'bg-slate-800/80 text-slate-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <FolderIcon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDeleteFolder(folder)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleDeleteFolder(folder)
                      }
                    }}
                    className={`rounded-full p-1 text-xs transition ${
                      isActive
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                    }`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
              )
            })}

            {folders.length === 0 && !loading && (
              <p className="mt-2 text-xs text-slate-400">
                Noch keine Ordner – Standardordner werden automatisch angelegt.
              </p>
            )}
          </div>

          {/* Neuer Ordner */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Neuer Ordnername"
                className="flex-1 rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="inline-flex items-center justify-center rounded-xl border border-slate-900/10 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-900/20 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                Ordner
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Standardordner: „Eingehende Rechnungen“, „Ausgehende Rechnungen“.
            </p>
          </div>
        </aside>

        {/* Content-Spalte */}
        <section className="space-y-4">
          {/* Upload-Zeile + Ansicht-Umschalter */}
          <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Upload-Bereich
              </span>
              <span className="text-sm text-slate-600">
                Dateien per Drag & Drop oder Klick hinzufügen.
              </span>
              <span className="text-[11px] text-slate-400">
                Aktueller Ordner:{' '}
                <span className="font-medium text-slate-600">
                  {activeFolder ? activeFolder.name : '–'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'grid'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/40'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Squares2X2Icon className="mr-1 h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/40'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ListBulletIcon className="mr-1 h-4 w-4" />
                Liste
              </button>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative flex min-h-[140px] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
              dragActive
                ? 'border-indigo-300 bg-indigo-50/60'
                : 'border-slate-200 bg-white/80 hover:border-slate-300'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.12),_transparent_55%)]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-md shadow-slate-900/40">
                <DocumentArrowUpIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-slate-700">
                Dateien hierher ziehen <span className="text-slate-400">oder</span>
              </p>
              <label className="mt-1 inline-flex cursor-pointer items-center rounded-full border border-slate-900/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-900/20 hover:bg-slate-50">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={!activeFolder || uploading}
                />
                <DocumentArrowUpIcon className="mr-1.5 h-4 w-4" />
                Dateien auswählen
              </label>
              <p className="mt-1 text-[11px] text-slate-400">
                {uploading
                  ? 'Upload läuft … bitte einen Moment.'
                  : 'PDF, Bilder, Office-Dokumente – bis zu einigen MB pro Datei.'}
              </p>
            </div>
          </div>

          {/* Fehlermeldung */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Dokumentliste */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-slate-700">
                  {activeFolder ? activeFolder.name : 'Dokumente'}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {filteredDocuments.length} Dokument
                  {filteredDocuments.length === 1 ? '' : 'e'} im aktuellen Filter
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Suchfeld */}
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 shadow-sm">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Dateiname suchen…"
                    className="w-28 bg-transparent text-[11px] text-slate-700 placeholder:text-slate-300 outline-none border-none sm:w-40"
                  />
                </div>

                {/* Zeitraum-Filter */}
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
                  <span className="ml-0.5 text-slate-400">Zeitraum</span>
                  <div className="flex items-center gap-2">
                    <DateInputWithCalendar value={dateFrom} onChange={setDateFrom} />
                    <span className="text-slate-300">–</span>
                    <DateInputWithCalendar value={dateTo} onChange={setDateTo} />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={resetDateFilter}
                      className="ml-1 rounded-full px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {/* Export-Button */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!activeFolder || !filteredDocuments.length || exporting || loading}
                  className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-slate-900/30 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {exporting ? 'Export läuft …' : 'Export als PDF'}
                </button>
              </div>
            </div>

            {loading && (
              <div className="py-8 text-center text-sm text-slate-400">
                Lade Dokumente …
              </div>
            )}

            {!loading && filteredDocuments.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                Keine Dokumente im ausgewählten Filter.
              </div>
            )}

            {/* GRID-VIEW */}
            {!loading && filteredDocuments.length > 0 && viewMode === 'grid' && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => {
                  const opening = openingDocId === doc.id
                  return (
                    <div
                      key={doc.id}
                      onClick={() => void handleOpenDocument(doc)}
                      className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start gap-2">
                        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-50">
                          <DocumentArrowUpIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-slate-800">
                            {doc.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {formatDateTime(doc.uploaded_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{opening ? 'Öffne …' : formatSize(doc.size)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteDocument(doc)
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <TrashIcon className="h-3 w-3" />
                          Löschen
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* LIST-VIEW */}
            {!loading && filteredDocuments.length > 0 && viewMode === 'list' && (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 text-xs text-slate-600">
                <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_120px] border-b border-slate-100 bg-slate-100/80 px-4 py-2 text-[11px] font-medium text-slate-500">
                  <div>Datei</div>
                  <div>Datum</div>
                  <div className="text-right">Größe</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => {
                    const opening = openingDocId === doc.id
                    return (
                      <div
                        key={doc.id}
                        onClick={() => void handleOpenDocument(doc)}
                        className="grid cursor-pointer grid-cols-[minmax(0,3fr)_minmax(0,2fr)_120px] items-center px-4 py-2 hover:bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-50">
                            <DocumentArrowUpIcon className="h-4 w-4" />
                          </span>
                          <span className="truncate text-[13px] text-slate-800">
                            {doc.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateTime(doc.uploaded_at)}
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[11px] text-slate-500">
                            {opening ? 'Öffne …' : formatSize(doc.size)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDeleteDocument(doc)
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <TrashIcon className="h-3 w-3" />
                            Löschen
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
