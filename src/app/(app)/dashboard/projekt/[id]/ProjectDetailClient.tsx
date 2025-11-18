// app/(app)/dashboard/projekt/[id]/ProjectDetailClient.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import {
  ArrowLeftIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  HashtagIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  CheckCircleIcon,
  FolderIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  XMarkIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

type TabKey = 'dokumente' | 'vorher' | 'nachher'
type SignedMap = Record<string, string>
type Project = any

type RoomForm = {
  id?: string | null
  name: string
  width: number | null
  length: number | null
  notes: string
  tasks: { id?: string; work: string; description?: string }[]
  materials: {
    id?: string
    material_id: string
    quantity: number
    notes?: string
  }[]
}

type ProjectTimeEntry = {
  id: string
  employee_id: string
  employee_name?: string | null
  work_date: string
  start_time: string | null
  end_time: string | null
  break_minutes: number
  notes: string | null
}

/* ---------- Kleine Helfer ---------- */
const btnWhite =
  'rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white'

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[13px] font-medium text-slate-700">
    {children}
  </label>
)

const GlassTile = ({
  title,
  value,
  Icon,
}: {
  title: string
  value?: string | null
  Icon: typeof MapPinIcon
}) => (
  <div
    className="relative overflow-hidden rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl ring-1 ring-transparent"
    style={{
      backgroundImage:
        'radial-gradient(420px 180px at 120% -30%, rgba(15,23,42,0.06), transparent)',
    }}
  >
    <div className="flex items-start gap-3">
      <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="truncate text-sm font-medium text-slate-900">
          {value || '–'}
        </p>
      </div>
    </div>
  </div>
)

const StatTile = ({
  title,
  value,
  Icon,
}: {
  title: string
  value: string | number
  Icon: typeof FolderIcon
}) => (
  <div
    className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl"
    style={{
      backgroundImage:
        'radial-gradient(520px 220px at 120% -30%, rgba(15,23,42,0.06), transparent)',
    }}
  >
    <div className="flex items-center gap-3">
      <div className="rounded-xl border border-white/60 bg-white/80 p-2 shadow">
        <Icon className="h-6 w-6 text-slate-900" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  </div>
)

/* ---------- Angebot-Chip (Edit) ---------- */
function OfferChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
        'border backdrop-blur shadow-sm',
        active
          ? 'border-slate-900/10 bg-slate-900/90 text-white hover:bg-slate-900'
          : 'border-slate-200/80 bg-white/95 text-slate-900 hover:bg-white',
        'focus:outline-none focus:ring-4 focus:ring-indigo-200/60',
      ].join(' ')}
      aria-pressed={active}
      title={label}
    >
      <span className="tabular-nums">{label}</span>
      <span
        className={[
          'h-1.5 w-1.5 rounded-full transition',
          active ? 'bg-white' : 'bg-slate-300 group-hover:bg-slate-400',
        ].join(' ')}
      />
    </button>
  )
}

/* ---------- Time-Helper ---------- */
const pad = (n: number) => String(n).padStart(2, '0')
const secondsDiff = (a: string | null, b: string | null) => {
  if (!a || !b) return 0
  const A = +new Date(a)
  const B = +new Date(b)
  return Math.max(0, Math.round((B - A) / 1000))
}
const fmtHMS = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = Math.floor(s % 60)
  return `${pad(h)}:${pad(m)}:${pad(r)}`
}
const fmtTime = (iso: string | null) => {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(+d)) return '–'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/* ---------- kleine Helfer ---------- */
const timeAgo = (iso: string) => {
  const d = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - d)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}T`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function ProjectDetailClient({
  project: initialProject,
}: {
  project: Project
}) {
  const supa = supabaseClient()

  const [project, setProject] = useState<Project>(initialProject)
  const [tab, setTab] = useState<TabKey>('dokumente')
  const [uploading, setUploading] = useState(false)
  const [signed, setSigned] = useState<SignedMap>({})

  // Edit-Flow
  const [editRequested, setEditRequested] = useState(false)
  const [savingProject, setSavingProject] = useState(false)

  // Editable fields
  const [title, setTitle] = useState(project.title ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [address, setAddress] = useState(project.address ?? '')
  const [objectName, setObjectName] = useState(project.object_name ?? '')
  const [floor, setFloor] = useState(project.floor ?? '')

  // Angebote (Master + Auswahl)
  const [offersMaster, setOffersMaster] = useState<
    { id: string; offer_number: string }[]
  >([])
  const [offerIds, setOfferIds] = useState<string[]>(
    (project.project_offers ?? []).map((x: any) => x.offer_id),
  )
  const [offerQuery, setOfferQuery] = useState('')

  // Rooms
  const [roomOpen, setRoomOpen] = useState(false)
  const [roomForm, setRoomForm] = useState<RoomForm>({
    id: null,
    name: '',
    width: null,
    length: null,
    notes: '',
    tasks: [],
    materials: [],
  })
  const [materialsMaster, setMaterialsMaster] = useState<
    { id: string; name: string; unit: string }[]
  >([])

  // Comments
  const [me, setMe] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false) // Modal

  // Ownership / Role
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [roleChecked, setRoleChecked] = useState<boolean>(false)

  // Projekt-Zeiterfassungs-Modal
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntry[]>([])
  const [timeLoading, setTimeLoading] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [timeFrom, setTimeFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return localDateStr(d)
  })
  const [timeTo, setTimeTo] = useState<string>(() => localDateStr(new Date()))

  const timeTotalSeconds = useMemo(
    () =>
      timeEntries.reduce((acc, e) => {
        if (!e.start_time || !e.end_time) return acc
        const sec =
          secondsDiff(e.start_time, e.end_time) -
          Number(e.break_minutes || 0) * 60
        return acc + Math.max(0, sec)
      }, 0),
    [timeEntries],
  )

  const counts = useMemo(
    () => ({
      rooms: (project.project_rooms ?? []).length,
      docs: (project.project_documents ?? []).length,
      before: (project.project_before_images ?? []).length,
      after: (project.project_after_images ?? []).length,
      comments: (project.project_comments ?? []).length,
    }),
    [project],
  )

  /* ---------- Data ---------- */
  const refreshProject = async () => {
    const { data } = await supa
      .from('projects')
      .select(
        `
        id, user_id, customer_id, title, description, address, object_name, floor, created_at,
        customer:customers ( id, first_name, last_name ),
        project_offers ( offer_id, offers ( id, offer_number ) ),
        project_documents ( id, path, name, size, uploaded_at ),
        project_before_images ( id, path, uploaded_at ),
        project_after_images ( id, path, uploaded_at ),
        project_comments ( id, user_id, content, created_at ),
        project_rooms (
          id, name, width, length, notes,
          project_room_tasks ( id, work, description ),
          project_room_materials ( id, material_id, quantity, notes, materials ( id, name, unit ) )
        )
      `,
      )
      .eq('id', project.id)
      .single()

    if (data) {
      setProject(data)
      if (!editRequested) {
        setTitle(data.title ?? '')
        setDescription(data.description ?? '')
        setAddress(data.address ?? '')
        setObjectName(data.object_name ?? '')
        setFloor(data.floor ?? '')
      }
      setOfferIds((data.project_offers ?? []).map((x: any) => x.offer_id))
    }
  }

  useEffect(() => {
    supa
      .from('materials')
      .select('id,name,unit')
      .then(({ data }) => setMaterialsMaster((data as any) ?? []))
  }, []) // eslint-disable-line

  useEffect(() => {
    // wer bin ich? (für "Du" Markierung) + Owner-Rolle via RPC
    ;(async () => {
      const { data } = await supa.auth.getUser()
      const myId = data.user?.id ?? null
      setMe(myId)
      try {
        const { data: ownerFlag } = await supa.rpc('is_project_owner', {
          p_project_id: project.id,
        })
        setIsOwner(!!ownerFlag)
      } catch {
        // Fallback: falls RPC mal nicht erreichbar ist
        setIsOwner(!!myId && myId === project.user_id)
      } finally {
        setRoleChecked(true)
      }
    })()
  }, []) // eslint-disable-line

  // Angebote des Kunden laden
  useEffect(() => {
    const load = async () => {
      if (!project.customer_id) {
        setOffersMaster([])
        return
      }
      const { data } = await supa
        .from('offers')
        .select('id, offer_number')
        .eq('customer_id', project.customer_id)
        .order('date', { ascending: false })
      setOffersMaster((data as any) ?? [])
    }
    load()
  }, [project.customer_id]) // eslint-disable-line

  /* ---------- Signed URLs ---------- */
  const createSigned = async (path: string, expires = 300) => {
    const { data, error } = await supabaseClient()
      .storage.from('projekt')
      .createSignedUrl(path, expires)
    if (error || !data?.signedUrl)
      throw new Error(error?.message || 'signed url error')
    return data.signedUrl
  }

  const prefetchSignedForTab = async (t: TabKey) => {
    const paths: string[] =
      t === 'dokumente'
        ? (project.project_documents ?? []).map((d: any) => d.path)
        : t === 'vorher'
          ? (project.project_before_images ?? []).map((x: any) => x.path)
          : (project.project_after_images ?? []).map((x: any) => x.path)

    const missing = paths.filter((p) => !signed[p])
    if (missing.length === 0) return
    const copy: SignedMap = { ...signed }
    for (const p of missing) {
      try {
        copy[p] = await createSigned(p, 300)
      } catch (e) {
        console.error(e)
      }
    }
    setSigned(copy)
  }

  useEffect(() => {
    prefetchSignedForTab(tab)
  }, [tab, project]) // eslint-disable-line

  /* ---------- Uploads ---------- */
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      setUploading(true)

      if (tab === 'dokumente') {
        const rows: any[] = []
        for (const f of Array.from(files)) {
          const ext = f.name.split('.').pop() || 'bin'
          const key = `dokumente/${crypto.randomUUID()}.${ext}`
          const { error } = await supa
            .storage.from('projekt')
            .upload(key, f, { upsert: false })
          if (error) throw error
          rows.push({
            project_id: project.id,
            path: key,
            name: f.name,
            size: f.size,
          })
        }
        const { error: insErr } = await supa
          .from('project_documents')
          .insert(rows)
        if (insErr) throw insErr
      } else {
        const table =
          tab === 'vorher' ? 'project_before_images' : 'project_after_images'
        const rows: any[] = []
        for (const f of Array.from(files)) {
          const ext = f.name.split('.').pop() || 'bin'
          const key = `${tab}/${crypto.randomUUID()}.${ext}`
          const { error } = await supa
            .storage.from('projekt')
            .upload(key, f, { upsert: false })
          if (error) throw error
          rows.push({ project_id: project.id, path: key })
        }
        const { error: insErr } = await supa.from(table).insert(rows)
        if (insErr) throw insErr
      }

      await refreshProject()
      setSigned({})
      await prefetchSignedForTab(tab)
    } catch (e: any) {
      alert(`Upload fehlgeschlagen: ${e.message ?? e}`)
    } finally {
      setUploading(false)
    }
  }

  const openDocument = async (path: string) => {
    try {
      const url = await createSigned(path, 60)
      window.open(url, '_blank', 'noopener')
    } catch (e: any) {
      alert(`Download fehlgeschlagen: ${e.message ?? e}`)
    }
  }

  const deleteFileRow = async (
    table:
      | 'project_documents'
      | 'project_before_images'
      | 'project_after_images',
    id: string,
    path: string,
  ) => {
    // Nur Owner darf löschen (UI ist bereits versteckt, aber hier zusätzliche Absicherung)
    if (!isOwner) {
      alert('Nur der Inhaber kann Dateien löschen.')
      return
    }
    const { error } = await supa.from(table).delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    await supa
      .storage.from('projekt')
      .remove([path])
      .catch(() => {})
    await refreshProject()
    setSigned((s) => {
      const c = { ...s }
      delete c[path]
      return c
    })
  }

  /* ---------- Save Project ---------- */
  const saveProject = async () => {
    try {
      setSavingProject(true)
      const payload = {
        title,
        description,
        address,
        object_name: objectName,
        floor,
        offer_ids: offerIds,
      }
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({})))?.error ?? res.statusText,
        )
      await refreshProject()
      setEditRequested(false)
    } catch (e: any) {
      alert(`Speichern fehlgeschlagen: ${e.message ?? e}`)
    } finally {
      setSavingProject(false)
    }
  }

  /* ---------- Rooms (Modal-Logik) ---------- */
  const openAddRoom = () => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Räume hinzufügen.')
      return
    }
    setRoomForm({
      id: null,
      name: '',
      width: null,
      length: null,
      notes: '',
      tasks: [],
      materials: [],
    })
    setRoomOpen(true)
  }
  const openEditRoom = (r: any) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Räume bearbeiten.')
      return
    }
    setRoomForm({
      id: r.id,
      name: r.name ?? '',
      width: r.width ?? null,
      length: r.length ?? null,
      notes: r.notes ?? '',
      tasks: (r.project_room_tasks ?? []).map((t: any) => ({
        id: t.id,
        work: t.work ?? '',
        description: t.description ?? '',
      })),
      materials: (r.project_room_materials ?? []).map((m: any) => ({
        id: m.id,
        material_id: m.material_id ?? '',
        quantity: m.quantity ?? 0,
        notes: m.notes ?? '',
      })),
    })
    setRoomOpen(true)
  }
  const saveRoom = async () => {
    const isEdit = !!roomForm.id
    const url = isEdit
      ? `/api/projects/${project.id}/rooms/${roomForm.id}`
      : `/api/projects/${project.id}/rooms`
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomForm),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(
        `Raum speichern fehlgeschlagen: ${err?.error ?? res.statusText}`,
      )
      return
    }
    setRoomOpen(false)
    await refreshProject()
  }
  const deleteRoom = async (roomId: string) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Räume löschen.')
      return
    }
    if (!confirm('Diesen Raum wirklich löschen?')) return
    const res = await fetch(
      `/api/projects/${project.id}/rooms/${roomId}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Löschen fehlgeschlagen: ${err?.error ?? res.statusText}`)
      return
    }
    await refreshProject()
  }

  /* ---------- Helpers: Room form handlers ---------- */
  const setRoomField = <K extends keyof RoomForm>(
    key: K,
    value: RoomForm[K],
  ) => {
    setRoomForm((prev) => ({ ...prev, [key]: value }))
  }

  const addTask = () => {
    setRoomForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { work: '', description: '' }],
    }))
  }
  const removeTask = (idx: number) => {
    setRoomForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx),
    }))
  }
  const updateTask = (
    idx: number,
    patch: Partial<RoomForm['tasks'][number]>,
  ) => {
    setRoomForm((prev) => {
      const tasks = [...prev.tasks]
      tasks[idx] = { ...tasks[idx], ...patch }
      return { ...prev, tasks }
    })
  }

  const addMaterial = () => {
    setRoomForm((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        { material_id: '', quantity: 0, notes: '' },
      ],
    }))
  }
  const removeMaterial = (idx: number) => {
    setRoomForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== idx),
    }))
  }
  const updateMaterial = (
    idx: number,
    patch: Partial<RoomForm['materials'][number]>,
  ) => {
    setRoomForm((prev) => {
      const materials = [...prev.materials]
      materials[idx] = { ...materials[idx], ...patch }
      return { ...prev, materials }
    })
  }

  /* ---------- Comments ---------- */
  const sendComment = async () => {
    const content = comment.trim()
    if (!content) return
    try {
      setSending(true)
      // kleiner Optimistic-Append
      const optimistic = {
        id: `temp-${crypto.randomUUID()}`,
        user_id: me,
        content,
        created_at: new Date().toISOString(),
      }
      setProject((p: any) => ({
        ...p,
        project_comments: [...(p.project_comments ?? []), optimistic],
      }))
      setComment('')
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Fehler' }))
        throw new Error(error)
      }
      await refreshProject()
    } catch (e: any) {
      alert(
        `Kommentar konnte nicht gesendet werden: ${e.message ?? e}`,
      )
    } finally {
      setSending(false)
    }
  }

  const commentsSorted = [...(project.project_comments ?? [])].sort(
    (a: any, b: any) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime(),
  )
  const lastFive = commentsSorted.slice(-5)

  /* ---------- Projekt-Zeiten laden ---------- */
  const loadProjectTimes = async () => {
    try {
      setTimeLoading(true)
      setTimeError(null)
      const params = new URLSearchParams()
      if (timeFrom) params.set('from', timeFrom)
      if (timeTo) params.set('to', timeTo)
      const url = `/api/projects/${project.id}/time-entries${
        params.toString() ? `?${params.toString()}` : ''
      }`

      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok)
        throw new Error(
          (body as any)?.error ||
            'Zeiteinträge konnten nicht geladen werden.',
        )

      const list = Array.isArray(body) ? body : []
      const mapped: ProjectTimeEntry[] = list.map((row: any) => {
        const empNameFromRel = row.employee
          ? `${row.employee.first_name ?? ''} ${
              row.employee.last_name ?? ''
            }`.trim() || null
          : null
        return {
          id: row.id,
          employee_id: row.employee_id,
          employee_name:
            row.employee_name ?? empNameFromRel ?? row.employee_id,
          work_date: row.work_date,
          start_time: row.start_time,
          end_time: row.end_time,
          break_minutes: row.break_minutes ?? 0,
          notes: row.notes ?? null,
        }
      })
      setTimeEntries(mapped)
    } catch (e: any) {
      setTimeError(e?.message || 'Fehler beim Laden der Zeiteinträge.')
      setTimeEntries([])
    } finally {
      setTimeLoading(false)
    }
  }

  useEffect(() => {
    if (!timeModalOpen) return
    const t = setTimeout(loadProjectTimes, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeModalOpen, timeFrom, timeTo])

  const exportProjectTimesCsv = () => {
    if (!timeEntries.length) {
      alert('Keine Zeiteinträge im gewählten Zeitraum – nichts zu exportieren.')
      return
    }

    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '""'
      const s = String(v)
      return `"${s.replace(/"/g, '""')}"`
    }

    const header = [
      'Mitarbeiter',
      'Datum',
      'Start',
      'Ende',
      'Pause_Minuten',
      'Dauer_Sekunden',
      'Dauer_Stunden',
      'Notiz',
    ]
    const lines: string[] = []
    lines.push(header.join(';'))

    timeEntries.forEach((e) => {
      const durSec = Math.max(
        0,
        secondsDiff(e.start_time, e.end_time) -
          Number(e.break_minutes || 0) * 60,
      )
      const durHours = (durSec / 3600).toFixed(2)
      lines.push(
        [
          esc(e.employee_name || e.employee_id),
          esc(e.work_date),
          esc(e.start_time || ''),
          esc(e.end_time || ''),
          esc(Number(e.break_minutes || 0)),
          esc(durSec),
          esc(durHours),
          esc(e.notes ?? ''),
        ].join(';'),
      )
    })

    const csv = lines.join('\r\n')
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projekt_zeiteintraege_${project.id}_${timeFrom}_bis_${timeTo}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* ---------- Render ---------- */
  return (
    <div className="p-6">
      {/* Zur Übersicht */}
      <div className="mb-5 flex items-center justify-start">
        <Link href="/dashboard/projekt" className={btnWhite}>
          <span className="inline-flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Zur Übersicht
          </span>
        </Link>
      </div>

      {/* Header */}
      <div
        className="mb-6 relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl"
        style={{
          backgroundImage:
            'radial-gradient(1000px 400px at 110% -30%, rgba(15,23,42,0.07), transparent)',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {project.title}
            </h1>
            <p className="text-sm text-slate-600">
              {project.customer?.first_name} {project.customer?.last_name}
            </p>
            <p className="text-sm text-slate-500">
              Erstellt am{' '}
              <span className="tabular-nums font-mono">
                {new Date(project.created_at).toLocaleDateString('de-DE')}
              </span>
            </p>
          </div>
         {/* Actions rechts */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              onClick={() => setTimeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white"
            >
              <ClockIcon className="h-4 w-4" />
              Zeiteinträge zu diesem Projekt
            </button>

            {isOwner && (
              <button
                onClick={openAddRoom}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                + Raum
              </button>
            )}
          </div>
        </div>
        {/* Hinweis für Mitarbeiter */}
        {roleChecked && !isOwner && (
          <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
            Du hast Mitarbeiter-Rechte: Du kannst kommentieren sowie
            Dokumente und Vorher/Nachher-Bilder hochladen. Stammdaten &
            Räume sind schreibgeschützt.
          </div>
        )}
      </div>

      {/* Projektdaten */}
      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Projektdaten
          </h2>
          {/* Bearbeiten – nur Owner */}
          {!editRequested ? (
            isOwner ? (
              <button
                className={btnWhite}
                onClick={() => setEditRequested(true)}
              >
                Bearbeiten
              </button>
            ) : null
          ) : (
            <div className="flex gap-2">
              <button
                className={btnWhite}
                onClick={() => {
                  setEditRequested(false)
                  setTitle(project.title ?? '')
                  setDescription(project.description ?? '')
                  setAddress(project.address ?? '')
                  setObjectName(project.object_name ?? '')
                  setFloor(project.floor ?? '')
                  setOfferIds(
                    (project.project_offers ?? []).map(
                      (x: any) => x.offer_id,
                    ),
                  )
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={saveProject}
                disabled={savingProject}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {savingProject ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          )}
        </div>

        {/* Tiles */}
        {!editRequested && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <GlassTile
                title="Adresse"
                value={project.address}
                Icon={MapPinIcon}
              />
              <GlassTile
                title="Objekt"
                value={project.object_name}
                Icon={BuildingOfficeIcon}
              />
              <GlassTile
                title="Etage"
                value={project.floor}
                Icon={HashtagIcon}
              />
              <GlassTile
                title="Kunde"
                value={`${project.customer?.first_name ?? ''} ${
                  project.customer?.last_name ?? ''
                }`.trim() || '–'}
                Icon={ClipboardDocumentListIcon}
              />
              <GlassTile
                title="Angebote"
                value={String(
                  (project.project_offers ?? []).length,
                )}
                Icon={CheckCircleIcon}
              />
              <GlassTile
                title="Projekt-ID"
                value={project.id}
                Icon={HashtagIcon}
              />
            </div>

            {/* Beschreibung & Angebote */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label>Beschreibung</Label>
                <p className="mt-1 whitespace-pre-wrap text-slate-900">
                  {project.description || '–'}
                </p>
              </div>
              <div>
                <Label>Verknüpfte Angebote</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(project.project_offers ?? []).length > 0 ? (
                    project.project_offers.map((po: any) => (
                      <span
                        key={po.offer_id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-sm text-slate-900 shadow-sm"
                      >
                        {po.offers?.offer_number ?? po.offer_id}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      – keine –
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Formular – nur sichtbar, wenn Owner auf „Bearbeiten“ geklickt hat */}
        {editRequested && isOwner && (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Titel</Label>
              <input
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4 focus:border-slate-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Label>Beschreibung</Label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4 focus:border-slate-300"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Label>Adresse</Label>
              <input
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4 focus:border-slate-300"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Objekt</Label>
              <input
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4 focus:border-slate-300"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
              />
              <Label>Etage</Label>
              <input
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4 focus:border-slate-300"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />

              {/* Angebote – Edit */}
              <div className="pt-2">
                <Label>Angebote verknüpfen</Label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={offerQuery}
                    onChange={(e) => setOfferQuery(e.target.value)}
                    placeholder="Nach Angebotsnummer suchen…"
                    className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                  />
                  <div className="whitespace-nowrap text-xs text-slate-500">
                    {offerIds.length} ausgewählt
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {offersMaster
                    .filter((o) =>
                      o.offer_number
                        ?.toLowerCase()
                        .includes(
                          offerQuery.trim().toLowerCase(),
                        ),
                    )
                    .map((o) => {
                      const active = offerIds.includes(o.id)
                      return (
                        <OfferChip
                          key={o.id}
                          active={active}
                          label={o.offer_number}
                          onClick={() => {
                            setOfferIds((prev) =>
                              prev.includes(o.id)
                                ? prev.filter((id) => id !== o.id)
                                : [...prev, o.id],
                            )
                          }}
                        />
                      )
                    })}
                  {offersMaster.length === 0 && (
                    <span className="text-sm text-slate-500">
                      Keine Angebote (prüfe Kunde)
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={btnWhite}
                    onClick={() =>
                      setOfferIds(offersMaster.map((o) => o.id))
                    }
                    disabled={offersMaster.length === 0}
                  >
                    Alle auswählen
                  </button>
                  <button
                    type="button"
                    className={btnWhite}
                    onClick={() => setOfferIds([])}
                    disabled={offerIds.length === 0}
                  >
                    Keine
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* KPIs */}
      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatTile title="Dokumente" value={counts.docs} Icon={FolderIcon} />
        <StatTile
          title="Vorher-Bilder"
          value={counts.before}
          Icon={PhotoIcon}
        />
        <StatTile
          title="Nachher-Bilder"
          value={counts.after}
          Icon={PhotoIcon}
        />
      </section>

      {/* Uploads */}
      <section className="mt-6 rounded-2xl border border-white/60 bg-white/80 p-0 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-4">
          {(['dokumente', 'vorher', 'nachher'] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'rounded-lg border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition',
                tab === t
                  ? 'border-white/60 bg-white/90 text-slate-900'
                  : 'border-transparent bg-white/60 text-slate-600 hover:bg-white',
              ].join(' ')}
              title={t}
            >
              {t === 'dokumente'
                ? 'Dokumente'
                : t === 'vorher'
                  ? 'Vorher'
                  : 'Nachher'}
            </button>
          ))}
        </div>

        <div className="border-t border-white/60 p-4 sm:p-5">
          <Label>
            Upload{' '}
            {tab === 'dokumente'
              ? 'Dokumente'
              : tab === 'vorher'
                ? 'Vorher-Bilder'
                : 'Nachher-Bilder'}
          </Label>
          <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 p-5 backdrop-blur">
            <input
              type="file"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              accept={tab === 'dokumente' ? undefined : 'image/*'}
              className="block w-full text-sm"
            />
            {uploading && (
              <div className="mt-2 text-sm text-slate-600">
                Lade hoch…
              </div>
            )}
          </div>

          {tab === 'dokumente' ? (
            (project.project_documents?.length ?? 0) > 0 ? (
              <ul className="mt-4 space-y-2">
                {project.project_documents.map((d: any) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur"
                  >
                    <button
                      onClick={() => openDocument(d.path)}
                      className="text-left text-slate-900 underline-offset-2 hover:underline"
                      title="Anzeigen"
                    >
                      {d.name || d.path.split('/').pop()}
                    </button>
                    <div className="flex items-center gap-3">
                      {d.size ? (
                        <span className="text-xs text-slate-500">
                          {Math.round(d.size / 1024)} KB
                        </span>
                      ) : null}
                      {/* Löschen – nur Owner */}
                      {isOwner && (
                        <button
                          onClick={() =>
                            deleteFileRow(
                              'project_documents',
                              d.id,
                              d.path,
                            )
                          }
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                        >
                          Löschen
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-700">– keine –</p>
            )
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {(
                  tab === 'vorher'
                    ? project.project_before_images
                    : project.project_after_images
                )?.map((img: any) => {
                  const signedUrl = signed[img.path]
                  return (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur"
                    >
                      {signedUrl ? (
                        <img
                          src={signedUrl}
                          alt=""
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-48 w-full place-items-center text-sm text-slate-500">
                          lädt…
                        </div>
                      )}
                      {/* Löschen – nur Owner */}
                      {isOwner && (
                        <div className="absolute right-2 top-2 hidden rounded-lg border border-rose-200 bg-rose-50/95 px-2 py-1 text-xs text-rose-700 shadow-sm group-hover:block">
                          <button
                            onClick={() =>
                              deleteFileRow(
                                tab === 'vorher'
                                  ? 'project_before_images'
                                  : 'project_after_images',
                                img.id,
                                img.path,
                              )
                            }
                          >
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {(
                tab === 'vorher'
                  ? project.project_before_images
                  : project.project_after_images
              )?.length === 0 && (
                <p className="mt-3 text-slate-700">– keine –</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Räume */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Räume</h2>
          {/* + Raum hinzufügen – nur Owner */}
          {isOwner && (
            <button
              onClick={openAddRoom}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              + Raum hinzufügen
            </button>
          )}
        </div>

        {project.project_rooms?.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {project.project_rooms.map((room: any) => (
              <div
                key={room.id}
                className="space-y-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {room.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {room.width
                        ? `Breite: ${room.width} m`
                        : ''}
                      {room.width && room.length ? ' • ' : ''}
                      {room.length
                        ? `Länge: ${room.length} m`
                        : ''}
                    </div>
                  </div>
                  {/* Bearbeiten/Löschen – nur Owner */}
                  <div className="flex gap-2">
                    {isOwner && (
                      <button
                        className={btnWhite}
                        onClick={() => openEditRoom(room)}
                      >
                        Bearbeiten
                      </button>
                    )}
                    {isOwner && (
                      <button
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-rose-700"
                        onClick={() => deleteRoom(room.id)}
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>

                {room.notes && (
                  <p className="whitespace-pre-wrap text-sm text-slate-800">
                    {room.notes}
                  </p>
                )}

                <div>
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Arbeiten
                  </div>
                  {room.project_room_tasks?.length ? (
                    <ul className="ml-5 list-disc text-sm text-slate-800">
                      {room.project_room_tasks.map((t: any) => (
                        <li key={t.id}>
                          <strong>{t.work}</strong>
                          {t.description
                            ? ` – ${t.description}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">
                      – keine –
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Materialien
                  </div>
                  {room.project_room_materials?.length ? (
                    <div className="overflow-hidden rounded-xl border border-white/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/80 backdrop-blur">
                          <tr>
                            <th className="p-2 font-semibold text-slate-700">
                              Material
                            </th>
                            <th className="p-2 font-semibold text-slate-700">
                              Menge
                            </th>
                            <th className="p-2 font-semibold text-slate-700">
                              Notiz
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.project_room_materials.map(
                            (pm: any) => (
                              <tr
                                key={pm.id}
                                className="border-t border-slate-200/70"
                              >
                                <td className="p-2">
                                  {pm.materials?.name ?? '—'}
                                </td>
                                <td className="p-2">
                                  {pm.quantity}
                                </td>
                                <td className="p-2">
                                  {pm.notes}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      – keine –
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-700">Keine Räume angelegt.</p>
        )}
      </section>

      {/* KOMMENTARE – stets GANZ unten */}
      <section className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
            Kommentare{' '}
            <span className="font-normal text-slate-500">
              ({counts.comments})
            </span>
          </h2>
          {counts.comments > 5 && (
            <button
              className={btnWhite}
              onClick={() => setCommentsOpen(true)}
            >
              Alle anzeigen
            </button>
          )}
        </div>

        {/* Letzte 5 */}
        {lastFive.length === 0 ? (
          <p className="text-sm text-slate-600">
            Noch keine Kommentare.
          </p>
        ) : (
          <ul className="space-y-2">
            {lastFive.map((c: any) => (
              <li
                key={c.id}
                className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {c.user_id === me ? (
                        <span className="font-medium text-slate-700">
                          Du
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          Mitarbeiter
                        </span>
                      )}
                      <span className="mx-2">·</span>
                      <span
                        title={new Date(
                          c.created_at,
                        ).toLocaleString('de-DE')}
                      >
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">
                      {c.content}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Eingabe */}
        <div className="mt-4">
          <Label>Neuer Kommentar</Label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                sendComment()
              }
            }}
            placeholder="Schreibe eine Notiz für das Projekt … (⌘/Ctrl + Enter zum Senden)"
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:ring-4 ring-indigo-200/60"
          />
          <div className="mt-2 flex items-center justify-end">
            <button
              onClick={sendComment}
              disabled={sending || !comment.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Sende…' : 'Kommentar posten'}
            </button>
          </div>
        </div>
      </section>

      {/* ROOM MODAL – nur Owner kann es öffnen */}
      {roomOpen && isOwner && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-[1000px] overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {roomForm.id ? 'Raum bearbeiten' : 'Neuer Raum'}
                </h3>
                <div className="flex gap-2">
                  <button
                    className={btnWhite}
                    onClick={() => setRoomOpen(false)}
                  >
                    Abbrechen
                  </button>
                  <button
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={saveRoom}
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>

            {/* Body – vollständiges Formular */}
            <div className="max-h-[72vh] overflow-auto px-4 py-4 sm:px-6">
              {/* Stammdaten */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>Raumname</Label>
                  <input
                    value={roomForm.name}
                    onChange={(e) =>
                      setRoomField('name', e.target.value)
                    }
                    placeholder="z.B. Wohnzimmer"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                  />
                </div>
                <div>
                  <Label>Breite (m)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomForm.width ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setRoomField(
                        'width',
                        v === ''
                          ? null
                          : Number.isNaN(Number(v))
                            ? null
                            : Number(v),
                      )
                    }}
                    placeholder="z.B. 3.80"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                  />
                </div>
                <div>
                  <Label>Länge (m)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomForm.length ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setRoomField(
                        'length',
                        v === ''
                          ? null
                          : Number.isNaN(Number(v))
                            ? null
                            : Number(v),
                      )
                    }}
                    placeholder="z.B. 4.20"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Notizen</Label>
                  <textarea
                    rows={3}
                    value={roomForm.notes}
                    onChange={(e) =>
                      setRoomField('notes', e.target.value)
                    }
                    placeholder="Freitext zu Besonderheiten im Raum …"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                  />
                </div>
              </div>

              {/* Arbeiten */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Arbeiten
                  </h4>
                  <button
                    type="button"
                    className={btnWhite}
                    onClick={addTask}
                  >
                    + Arbeit
                  </button>
                </div>
                {roomForm.tasks.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Noch keine Arbeiten erfasst.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {roomForm.tasks.map((t, idx) => (
                      <div
                        key={t.id ?? idx}
                        className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="md:col-span-1">
                            <Label>Arbeit</Label>
                            <input
                              value={t.work}
                              onChange={(e) =>
                                updateTask(idx, {
                                  work: e.target.value,
                                })
                              }
                              placeholder="z.B. Tapezieren"
                              className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Beschreibung</Label>
                            <input
                              value={t.description ?? ''}
                              onChange={(e) =>
                                updateTask(idx, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Optionale Zusatzbeschreibung"
                              className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
                            onClick={() => removeTask(idx)}
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materialien */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Materialien
                  </h4>
                  <button
                    type="button"
                    className={btnWhite}
                    onClick={addMaterial}
                  >
                    + Material
                  </button>
                </div>

                {roomForm.materials.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Noch keine Materialien erfasst.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/80 backdrop-blur">
                        <tr>
                          <th className="p-2 font-semibold text-slate-700">
                            Material
                          </th>
                          <th className="p-2 font-semibold text-slate-700">
                            Menge
                          </th>
                          <th className="p-2 font-semibold text-slate-700">
                            Notiz
                          </th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {roomForm.materials.map((m, idx) => {
                          return (
                            <tr
                              key={m.id ?? idx}
                              className="border-t border-slate-200/70"
                            >
                              <td className="p-2">
                                <select
                                  value={m.material_id}
                                  onChange={(e) =>
                                    updateMaterial(idx, {
                                      material_id: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                                >
                                  <option value="">
                                    – auswählen –
                                  </option>
                                  {materialsMaster.map((mat) => (
                                    <option
                                      key={mat.id}
                                      value={mat.id}
                                    >
                                      {mat.name}{' '}
                                      {mat.unit
                                        ? `(${mat.unit})`
                                        : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={m.quantity ?? 0}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    updateMaterial(idx, {
                                      quantity:
                                        v === ''
                                          ? 0
                                          : Number.isNaN(
                                                Number(v),
                                              )
                                            ? 0
                                            : Number(v),
                                    })
                                  }}
                                  className="w-28 rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  value={m.notes ?? ''}
                                  onChange={(e) =>
                                    updateMaterial(idx, {
                                      notes: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60"
                                  placeholder="optional"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
                                  onClick={() =>
                                    removeMaterial(idx)
                                  }
                                >
                                  Entfernen
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS MODAL – komplette Historie + Eingabe */}
      {commentsOpen && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/60 bg-white/80 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                Kommentare ({commentsSorted.length})
              </h3>
              <button
                className={btnWhite}
                onClick={() => setCommentsOpen(false)}
              >
                <span className="inline-flex items-center gap-1">
                  <XMarkIcon className="h-4 w-4" /> Schließen
                </span>
              </button>
            </div>

            <div className="max-h-[68vh] overflow-auto px-4 py-4">
              {commentsSorted.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Noch keine Kommentare.
                </p>
              ) : (
                <ul className="space-y-2">
                  {commentsSorted.map((c: any) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm"
                    >
                      <div className="text-xs text-slate-500">
                        {c.user_id === me ? (
                          <span className="font-medium text-slate-700">
                            Du
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            Mitarbeiter
                          </span>
                        )}
                        <span className="mx-2">·</span>
                        <span
                          title={new Date(
                            c.created_at,
                          ).toLocaleString('de-DE')}
                        >
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">
                        {c.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-white/60 bg-white/80 px-4 py-3">
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    sendComment()
                  }
                }}
                placeholder="Kommentar hinzufügen … (⌘/Ctrl + Enter)"
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:ring-4 ring-indigo-200/60"
              />
              <div className="mt-2 flex items-center justify-end">
                <button
                  onClick={sendComment}
                  disabled={sending || !comment.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? 'Sende…' : 'Posten'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJEKT-ZEITEN MODAL */}
      {timeModalOpen && (
        <div className="fixed inset-0 z-[205] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/60 bg-white/90 px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    <ClockIcon className="h-3.5 w-3.5" />
                    Projekt-Zeiterfassung
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Zeiteinträge für dieses Projekt
                  </h3>
                  <p className="text-xs text-slate-600">
                    Zeitraum{' '}
                    <span className="font-mono">{timeFrom}</span> –{' '}
                    <span className="font-mono">{timeTo}</span> ·{' '}
                    Gesamt:{' '}
                    <span className="font-mono font-semibold">
                      {fmtHMS(timeTotalSeconds)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportProjectTimesCsv}
                    disabled={!timeEntries.length}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    CSV exportieren
                  </button>
                  <button
                    onClick={loadProjectTimes}
                    disabled={timeLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ClockIcon
                      className={`h-4 w-4 ${
                        timeLoading ? 'animate-spin' : ''
                      }`}
                    />
                    Aktualisieren
                  </button>
                  <button
                    onClick={() => setTimeModalOpen(false)}
                    className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50 sm:inline-flex"
                  >
                    Schließen
                  </button>
                </div>
              </div>

              {/* Filter-Zeile */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label>Von</Label>
                    <input
                      type="date"
                      value={timeFrom}
                      onChange={(e) =>
                        setTimeFrom(e.target.value || timeFrom)
                      }
                      className="mt-1 w-36 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <Label>Bis</Label>
                    <input
                      type="date"
                      value={timeTo}
                      onChange={(e) =>
                        setTimeTo(e.target.value || timeTo)
                      }
                      className="mt-1 w-36 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setTimeModalOpen(false)}
                  className="mt-1 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-slate-50 sm:hidden"
                >
                  Schließen
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[72vh] overflow-auto px-4 py-3 sm:px-6">
              {timeError && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {timeError}
                </div>
              )}

              {timeLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
                    />
                  ))}
                </div>
              )}

              {!timeLoading && !timeEntries.length && !timeError && (
                <div className="rounded-xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-600 shadow-sm">
                  Keine Zeiteinträge für dieses Projekt im gewählten
                  Zeitraum.
                </div>
              )}

              {/* Mobile: Karten */}
              <div className="space-y-3 md:hidden">
                {timeEntries.map((e) => {
                  const durSec = Math.max(
                    0,
                    secondsDiff(e.start_time, e.end_time) -
                      Number(e.break_minutes || 0) * 60,
                  )
                  return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-800 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {e.employee_name || e.employee_id}
                          </div>
                          <div className="text-xs text-slate-500">
                            Datum:{' '}
                            <span className="font-mono">
                              {e.work_date}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-700">
                          <div className="font-mono text-sm">
                            {fmtHMS(durSec)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fmtTime(e.start_time)} –{' '}
                            {fmtTime(e.end_time)} · Pause{' '}
                            {e.break_minutes || 0} min
                          </div>
                        </div>
                      </div>
                      {e.notes && (
                        <div className="mt-2 rounded-xl bg-slate-50/80 px-2.5 py-2 text-xs text-slate-700">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Notiz:
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap break-words">
                            {e.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop: Tabelle */}
              <div className="mt-2 hidden md:block">
                {timeEntries.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                    <div className="max-h-[60vh] overflow-auto">
                      <table className="min-w-full border-collapse text-left text-[13px] text-slate-800">
                        <thead className="sticky top-0 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2">Mitarbeiter</th>
                            <th className="px-3 py-2">Datum</th>
                            <th className="px-3 py-2">Start</th>
                            <th className="px-3 py-2">Ende</th>
                            <th className="px-3 py-2 text-right">
                              Pause (Min)
                            </th>
                            <th className="px-3 py-2 text-right">
                              Dauer
                            </th>
                            <th className="px-3 py-2">Notiz</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {timeEntries.map((e) => {
                            const durSec = Math.max(
                              0,
                              secondsDiff(
                                e.start_time,
                                e.end_time,
                              ) -
                                Number(
                                  e.break_minutes || 0,
                                ) *
                                  60,
                            )
                            return (
                              <tr key={e.id} className="align-top">
                                <td className="px-3 py-2 text-sm">
                                  {e.employee_name || e.employee_id}
                                </td>
                                <td className="px-3 py-2 text-sm font-mono">
                                  {e.work_date}
                                </td>
                                <td className="px-3 py-2 text-sm font-mono">
                                  {fmtTime(e.start_time)}
                                </td>
                                <td className="px-3 py-2 text-sm font-mono">
                                  {fmtTime(e.end_time)}
                                </td>
                                <td className="px-3 py-2 text-right text-sm">
                                  {e.break_minutes || 0}
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-mono">
                                  {fmtHMS(durSec)}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {e.notes ? (
                                    <div className="max-h-16 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50/80 px-2 py-1">
                                      {e.notes}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">
                                      –
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/60 bg-white/90 px-4 py-2 text-right text-[11px] text-slate-700 sm:px-6">
              Gesamtzeit im Zeitraum:{' '}
              <span className="font-mono font-semibold">
                {fmtHMS(timeTotalSeconds)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
