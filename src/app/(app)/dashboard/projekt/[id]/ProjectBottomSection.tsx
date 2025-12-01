'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import {
  ClipboardDocumentListIcon,
  CheckIcon,
  BuildingOffice2Icon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type Project = any

export type ProjectBottomSectionProps = {
  project: Project
  isOwner: boolean
  refreshProject: () => Promise<void>
}

/* ----------------------------- UI Helpers ----------------------------- */

const btnWhite =
  'rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white'

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[13px] font-medium text-slate-700">
    {children}
  </label>
)

/* ----------------------------- Badge Helpers ----------------------------- */

const badgeBase =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset'

function statusLabel(status: string | null | undefined) {
  if (!status) return ''
  const s = String(status).toLowerCase()
  switch (s) {
    case 'open':
    case 'todo':
      return 'Offen'
    case 'in_progress':
    case 'doing':
    case 'active':
      return 'In Bearbeitung'
    case 'done':
    case 'completed':
      return 'Erledigt'
    case 'cancelled':
    case 'canceled':
      return 'Abgebrochen'
    default:
      return s.charAt(0).toUpperCase() + s.slice(1)
  }
}

function priorityLabel(priority: string | null | undefined) {
  if (!priority) return ''
  const p = String(priority).toLowerCase()
  if (p === '0' || p === 'none' || p === 'null' || p === 'undefined') {
    return ''
  }
  switch (p) {
    case 'low':
      return 'Niedrig'
    case 'medium':
    case 'normal':
      return 'Normal'
    case 'high':
      return 'Hoch'
    case 'urgent':
      return 'Dringend'
    default:
      return p.charAt(0).toUpperCase() + p.slice(1)
  }
}

function statusBadgeClass(status: string | null | undefined) {
  const s = status?.toString().toLowerCase()
  switch (s) {
    case 'open':
    case 'todo':
      return `${badgeBase} bg-amber-50 text-amber-800 ring-amber-200`
    case 'in_progress':
    case 'doing':
    case 'active':
      return `${badgeBase} bg-sky-50 text-sky-800 ring-sky-200`
    case 'done':
    case 'completed':
      return `${badgeBase} bg-emerald-50 text-emerald-800 ring-emerald-200`
    case 'cancelled':
    case 'canceled':
      return `${badgeBase} bg-rose-50 text-rose-800 ring-rose-200`
    default:
      return `${badgeBase} bg-slate-50 text-slate-700 ring-slate-200`
  }
}

function priorityBadgeClass(priority: string | null | undefined) {
  const p = priority?.toString().toLowerCase()
  if (p === '0' || p === 'none' || p === 'null' || p === 'undefined') {
    return `${badgeBase} bg-slate-50 text-slate-700 ring-slate-200`
  }
  switch (p) {
    case 'low':
      return `${badgeBase} bg-slate-50 text-slate-700 ring-slate-200`
    case 'medium':
    case 'normal':
      return `${badgeBase} bg-indigo-50 text-indigo-800 ring-indigo-200`
    case 'high':
      return `${badgeBase} bg-rose-50 text-rose-800 ring-rose-200`
    case 'urgent':
      return `${badgeBase} bg-red-50 text-red-800 ring-red-200`
    default:
      return `${badgeBase} bg-slate-50 text-slate-700 ring-slate-200`
  }
}

/* ----------------------------- Details / Rooms Helpers ----------------------------- */

function normalizeDetails(details: any): any | null {
  if (!details) return null
  if (typeof details === 'string') {
    try {
      return JSON.parse(details)
    } catch {
      return null
    }
  }
  return details
}

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

/* ====================================================================== */
/*                            HAUPT-KOMPONENTE                            */
/* ====================================================================== */

export function ProjectBottomSection({
  project,
  isOwner,
  refreshProject,
}: ProjectBottomSectionProps) {
  const supa = supabaseClient()

  /* ---------- KI-Todos & Todo-Formular ---------- */

  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<
    { id: string; title: string; description: string; offer_id?: string | null }[]
  >([])

  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [todoSaving, setTodoSaving] = useState(false)
  const [todoFromSuggestionIndex, setTodoFromSuggestionIndex] =
    useState<number | null>(null)
  const [todoForm, setTodoForm] = useState({
    id: null as string | null,
    title: '',
    description: '',
    status: 'open' as 'open' | 'in_progress' | 'done' | 'cancelled',
    due_date: '' as string,
    assigneeIds: [] as string[],
  })

  /* ---------- DETAILS, KIND & RÄUME (inkl. rooms_meta Fallback) ---------- */

  const details = useMemo(() => normalizeDetails(project.details), [project])

  const kind = useMemo(
    () => String(project.kind ?? details?.kind ?? '').toLowerCase(),
    [project, details],
  )
  const isHandwerk = kind === 'handwerk'

  const roomsFromMeta = useMemo(() => {
    if (!details?.handwerk?.rooms_meta) return [] as any[]
    const raw = details.handwerk.rooms_meta
    if (!Array.isArray(raw)) return [] as any[]
    return raw.map((r: any, idx: number) => ({
      id: r.id ?? `meta-${idx}`,
      name: r.name ?? r.title ?? `Objekt ${idx + 1}`,
      width: r.width ?? r.breite ?? null,
      length: r.length ?? r.laenge ?? null,
      notes: r.notes ?? r.beschreibung ?? '',
      project_room_tasks:
        Array.isArray(r.tasks) || Array.isArray(r.arbeiten)
          ? (r.tasks ?? r.arbeiten).map((t: any, i: number) => ({
              id: t.id ?? `meta-task-${idx}-${i}`,
              work: t.work ?? t.title ?? t.name ?? '',
              description: t.description ?? t.beschreibung ?? '',
            }))
          : [],
      project_room_materials:
        Array.isArray(r.materials) || Array.isArray(r.materialien)
          ? (r.materials ?? r.materialien).map((m: any, j: number) => ({
              id: m.id ?? `meta-mat-${idx}-${j}`,
              materials: {
                name: m.material_name ?? m.name ?? '',
                unit: m.unit ?? m.einheit ?? '',
              },
              quantity: m.quantity ?? m.menge ?? null,
              notes: m.notes ?? m.beschreibung ?? '',
            }))
          : [],
      _source: 'meta',
    }))
  }, [details])

  const relationalRooms = useMemo(
    () => (Array.isArray(project.project_rooms) ? project.project_rooms : []),
    [project],
  )

  const allRooms = useMemo(() => {
    if (relationalRooms.length > 0) return relationalRooms as any[]
    return roomsFromMeta as any[]
  }, [relationalRooms, roomsFromMeta])

  /* ---------- COUNTS / KPIs ---------- */

  const counts = useMemo(
    () => ({
      todos: (project.project_todos ?? []).length,
      docs: (project.project_documents ?? []).length,
      before: (project.project_before_images ?? []).length,
      after: (project.project_after_images ?? []).length,
      rooms: allRooms.length,
    }),
    [project, allRooms],
  )

  const todosSorted = useMemo(() => {
    const list = Array.isArray(project.project_todos)
      ? [...project.project_todos]
      : []
    return list.sort((a: any, b: any) => {
      const ad = a.due_date ?? a.created_at
      const bd = b.due_date ?? b.created_at
      return new Date(ad).getTime() - new Date(bd).getTime()
    })
  }, [project])

  /* ---------- Mitarbeiter-Optionen für Todo-Modal ---------- */

  const employeeOptions = useMemo(() => {
    const rows = Array.isArray(project.assignees) ? project.assignees : []
    const seen = new Set<string>()
    const out: { id: string; label: string }[] = []

    for (const row of rows) {
      const r: any = row
      const emp = r.employees || r.employee || null
      const id = emp?.id || r.employee_id
      if (!id || seen.has(id)) continue
      seen.add(id)
      const label =
        `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim() ||
        'Unbenannter Mitarbeiter'
      out.push({ id, label })
    }

    return out
  }, [project.assignees])

  /* ===================== TODOs – Mitarbeiterzuordnung ===================== */

  const getTodoAssignees = (t: any): { id: string; label: string }[] => {
    const result: { id: string; label: string }[] = []

    const pushEmp = (emp: any | null, fallbackId?: any) => {
      const name =
        emp &&
        ((emp.name as string) ||
          `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim())
      const email = emp?.email as string | undefined
      const id = emp?.id || email || name || fallbackId

      const label = name || email || (id ? String(id) : '')
      if (!label) return

      result.push({ id: String(id ?? label), label })
    }

    if (Array.isArray(t.todo_assignees)) {
      for (const x of t.todo_assignees) {
        const emp =
          (x as any).employees ||
          (x as any).employee ||
          (x as any).user ||
          (x as any).users ||
          null
        if (emp) {
          pushEmp(emp, (x as any).employee_id)
        } else if ((x as any).employee_id) {
          result.push({
            id: String((x as any).employee_id),
            label: String((x as any).employee_id),
          })
        }
      }
    }

    if (Array.isArray(t.project_todo_assignees)) {
      for (const x of t.project_todo_assignees) {
        const emp =
          (x as any).employees ||
          (x as any).employee ||
          (x as any).user ||
          (x as any).users ||
          null
        if (emp) {
          pushEmp(emp, (x as any).employee_id)
        } else if ((x as any).employee_id) {
          result.push({
            id: String((x as any).employee_id),
            label: String((x as any).employee_id),
          })
        }
      }
    }

    if (Array.isArray(t.assignees)) {
      for (const emp of t.assignees) {
        pushEmp(emp)
      }
    }

    if (Array.isArray(t.employees)) {
      for (const emp of t.employees) {
        pushEmp(emp)
      }
    }

    if (t.employee || t.employees) {
      pushEmp(t.employee || t.employees)
    }

    if (t.assignee_name) {
      result.push({
        id: String(t.assignee_id ?? t.assignee_name),
        label: String(t.assignee_name),
      })
    }
    if (t.assigned_employee_name) {
      result.push({
        id: String(t.assigned_employee_id ?? t.assigned_employee_name),
        label: String(t.assigned_employee_name),
      })
    }
    if (t.employee_name) {
      result.push({
        id: String(t.employee_id ?? t.employee_name),
        label: String(t.employee_name),
      })
    }

    Object.entries(t).forEach(([_, value]) => {
      if (!Array.isArray(value)) return
      for (const item of value) {
        if (!item || typeof item !== 'object') continue
        const i: any = item
        const looksLikeEmployee =
          'employee_id' in i ||
          'first_name' in i ||
          'last_name' in i ||
          'email' in i

        if (!looksLikeEmployee) continue

        const emp = i.employees || i.employee || i.user || i.users || i || null

        if (emp) {
          pushEmp(emp, i.employee_id)
        } else if (i.employee_id) {
          result.push({
            id: String(i.employee_id),
            label: String(i.employee_id),
          })
        }
      }
    })

    if (!result.length && t.employee_id) {
      result.push({
        id: String(t.employee_id),
        label: String(t.employee_id),
      })
    }

    const seen = new Set<string>()
    return result.filter((x) => {
      if (seen.has(x.id)) return false
      seen.add(x.id)
      return true
    })
  }

  /* ---------- KI: Todos aus Angeboten erzeugen ---------- */

  const handleGenerateTodosFromOffers = async () => {
    if (!isOwner) {
      alert('Nur der Inhaber kann KI-Vorschläge erzeugen.')
      return
    }
    if (
      !project.project_offers ||
      !Array.isArray(project.project_offers) ||
      project.project_offers.length === 0
    ) {
      alert('Es sind keine Angebote mit diesem Projekt verknüpft.')
      return
    }

    try {
      setAiError(null)
      setAiLoading(true)
      setAiSuggestions([])

      const res = await fetch('/api/ai/project-todos-from-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message || 'KI konnte keine Vorschläge erzeugen.')
      }

      const suggestions = (body?.suggestions ?? []) as any[]
      setAiSuggestions(
        suggestions.map((s, idx) => ({
          id: s.id || `suggestion-${idx}`,
          title: s.title ?? '',
          description: s.description ?? '',
          offer_id: s.offer_id ?? null,
        })),
      )
    } catch (e: any) {
      setAiError(e?.message ?? 'Fehler beim Erzeugen der Vorschläge.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleUseSuggestion = (idx: number) => {
    const s = aiSuggestions[idx]
    if (!s) return
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben speichern.')
      return
    }
    setTodoForm({
      id: null,
      title: s.title || '',
      description: s.description || '',
      status: 'open',
      due_date: '',
      assigneeIds: [],
    })
    setTodoFromSuggestionIndex(idx)
    setTodoModalOpen(true)
  }

  const handleRemoveSuggestion = (idx: number) => {
    setAiSuggestions((prev) => prev.filter((_, i) => i !== idx))
  }

  /* ---------- Räume / Objekte – Formular & Modal ---------- */

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

  useEffect(() => {
    supa
      .from('materials')
      .select('id,name,unit')
      .then(({ data }) => setMaterialsMaster((data as any) ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAddRoom = () => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Objekte hinzufügen.')
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
      alert('Nur der Inhaber kann Objekte bearbeiten.')
      return
    }

    const isMeta = r._source === 'meta'

    setRoomForm({
      id: isMeta ? null : r.id,
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
      alert(`Objekt speichern fehlgeschlagen: ${err?.error ?? res.statusText}`)
      return
    }
    setRoomOpen(false)
    await refreshProject()
  }

  const deleteRoom = async (roomId: string) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Objekte löschen.')
      return
    }
    if (!confirm('Dieses Objekt wirklich löschen?')) return
    const res = await fetch(`/api/projects/${project.id}/rooms/${roomId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Löschen fehlgeschlagen: ${err?.error ?? res.statusText}`)
      return
    }
    await refreshProject()
  }

  function setRoomField<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {
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

  /* ---------- Todo abhaken ---------- */

  const [updatingTodoId, setUpdatingTodoId] = useState<string | null>(null)

  const toggleTodoDone = async (todo: any) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben bearbeiten.')
      return
    }
    const current = String(todo.status ?? 'open').toLowerCase()
    const next =
      current === 'done' || current === 'completed' ? 'open' : 'done'

    try {
      setUpdatingTodoId(todo.id)
      const { error } = await supa
        .from('project_todos')
        .update({ status: next })
        .eq('id', todo.id)
      if (error) throw error
      await refreshProject()
    } catch (e: any) {
      alert(e?.message ?? 'Status konnte nicht aktualisiert werden.')
    } finally {
      setUpdatingTodoId(null)
    }
  }

  /* ---------- Todo-Modal: öffnen / speichern / löschen ---------- */

  const openNewTodo = () => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben anlegen.')
      return
    }
    setTodoForm({
      id: null,
      title: '',
      description: '',
      status: 'open',
      due_date: '',
      assigneeIds: [],
    })
    setTodoFromSuggestionIndex(null)
    setTodoModalOpen(true)
  }

  const openEditTodo = (t: any) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben bearbeiten.')
      return
    }

    const statusRaw = String(t.status ?? 'open').toLowerCase()
    let status: 'open' | 'in_progress' | 'done' | 'cancelled' = 'open'
    if (statusRaw === 'in_progress' || statusRaw === 'doing' || statusRaw === 'active') {
      status = 'in_progress'
    } else if (statusRaw === 'done' || statusRaw === 'completed') {
      status = 'done'
    } else if (statusRaw === 'cancelled' || statusRaw === 'canceled') {
      status = 'cancelled'
    }

    const assigneeIds: string[] = []
    if (Array.isArray(t.project_todo_assignees)) {
      for (const row of t.project_todo_assignees) {
        const r: any = row
        const empId = r.employee_id || r.employees?.id
        if (empId && !assigneeIds.includes(empId)) assigneeIds.push(empId)
      }
    }

    setTodoForm({
      id: t.id,
      title: t.title ?? '',
      description: t.description ?? '',
      status,
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : '',
      assigneeIds,
    })
    setTodoFromSuggestionIndex(null)
    setTodoModalOpen(true)
  }

  const handleSaveTodo = async () => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben speichern.')
      return
    }
    if (!todoForm.title.trim()) {
      alert('Bitte einen Aufgabentitel eingeben.')
      return
    }

    try {
      setTodoSaving(true)

      const base = {
        title: todoForm.title.trim(),
        description: todoForm.description.trim() || null,
        status: todoForm.status,
        due_date: todoForm.due_date || null,
      }

      let todoId = todoForm.id

      if (todoId) {
        const { error } = await supa
          .from('project_todos')
          .update(base)
          .eq('id', todoId)
        if (error) throw error

        const { error: delErr } = await supa
          .from('project_todo_assignees')
          .delete()
          .eq('todo_id', todoId)
        if (delErr) throw delErr

        if (todoForm.assigneeIds.length) {
          const rows = todoForm.assigneeIds.map((employee_id) => ({
            todo_id: todoId,
            employee_id,
          }))
          const { error: insErr } = await supa
            .from('project_todo_assignees')
            .insert(rows)
          if (insErr) throw insErr
        }
      } else {
        const insertPayload: any = {
          ...base,
          project_id: project.id,
          priority: 0,
        }
        const { data: inserted, error } = await supa
          .from('project_todos')
          .insert(insertPayload)
          .select('id')
          .single()

        if (error || !inserted) {
          throw error || new Error('Todo konnte nicht angelegt werden.')
        }

        todoId = inserted.id

        if (todoForm.assigneeIds.length) {
          const rows = todoForm.assigneeIds.map((employee_id) => ({
            todo_id: todoId,
            employee_id,
          }))
          const { error: insErr } = await supa
            .from('project_todo_assignees')
            .insert(rows)
          if (insErr) throw insErr
        }
      }

      if (todoFromSuggestionIndex != null) {
        setAiSuggestions((prev) =>
          prev.filter((_, i) => i !== todoFromSuggestionIndex),
        )
        setTodoFromSuggestionIndex(null)
      }

      setTodoModalOpen(false)
      await refreshProject()
    } catch (e: any) {
      alert(e?.message ?? 'Aufgabe konnte nicht gespeichert werden.')
    } finally {
      setTodoSaving(false)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    if (!isOwner) {
      alert('Nur der Inhaber kann Aufgaben löschen.')
      return
    }
    if (!confirm('Aufgabe wirklich löschen?')) return

    try {
      const { error: delAss } = await supa
        .from('project_todo_assignees')
        .delete()
        .eq('todo_id', todoId)
      if (delAss) throw delAss

      const { error } = await supa
        .from('project_todos')
        .delete()
        .eq('id', todoId)
      if (error) throw error

      await refreshProject()
    } catch (e: any) {
      alert(e?.message ?? 'Aufgabe konnte nicht gelöscht werden.')
    }
  }

  const showRooms = isHandwerk

  /* ================================================================== */
  /*                                RENDER                              */
  /* ================================================================== */

  return (
    <>
      {/* Aufgaben / ToDos */}
      <section className="mt-6 w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl sm:px-4 sm:py-5 lg:px-5 lg:py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-[15px]">
              <ClipboardDocumentListIcon className="h-5 w-5" />
              Aufgaben
              <span className="text-xs font-normal text-slate-500">
                ({counts.todos})
              </span>
            </h2>
            <p className="max-w-xl text-xs text-slate-500 sm:text-[13px]">
              Alle Aufgaben zu diesem Projekt mit Status, Verantwortlichen und
              Fälligkeiten.
            </p>
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openNewTodo}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 sm:text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Neue Aufgabe
              </button>
              <button
                type="button"
                onClick={handleGenerateTodosFromOffers}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <SparklesIcon className="h-4 w-4" />
                {aiLoading ? 'KI-Vorschläge…' : 'Aus Angeboten vorschlagen'}
              </button>
            </div>
          )}
        </div>

        {aiError && (
          <p className="mb-2 text-xs text-rose-600 sm:text-[13px]">{aiError}</p>
        )}

        {aiSuggestions.length > 0 && (
          <div className="mb-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 sm:p-4 sm:text-[13px]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                <span className="font-semibold">
                  KI-Vorschläge (noch nicht gespeichert)
                </span>
              </div>
              <span className="text-[11px] text-amber-800 sm:text-xs">
                Du kannst Aufgaben bearbeiten, übernehmen oder verwerfen.
              </span>
            </div>
            <div className="space-y-2">
              {aiSuggestions.map((s, idx) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-amber-200/80 bg-white/90 p-2 text-[13px] shadow-sm sm:p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {s.title}
                      </div>
                      {s.description && (
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-slate-700 sm:text-[13px]">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleUseSuggestion(idx)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
                      >
                        <CheckIcon className="h-3 w-3" />
                        Übernehmen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSuggestion(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <TrashIcon className="h-3 w-3" />
                        Verwerfen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {todosSorted.length === 0 ? (
          <p className="text-sm text-slate-600">
            Keine Aufgaben zu diesem Projekt angelegt.
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {todosSorted.map((t: any) => {
              const statusCls = statusBadgeClass(t.status)
              const prioLabel = priorityLabel(t.priority)
              const priorityCls = priorityBadgeClass(t.priority)
              const isDone =
                String(t.status ?? '').toLowerCase() === 'done' ||
                String(t.status ?? '').toLowerCase() === 'completed'

              const todoAssignees = getTodoAssignees(t)

              return (
                <article
                  key={t.id}
                  className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm backdrop-blur sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTodoDone(t)}
                        disabled={!!updatingTodoId && updatingTodoId === t.id}
                        className={[
                          'mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-white shadow-sm transition',
                          isDone
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300 bg-white',
                          !isOwner
                            ? 'cursor-not-allowed opacity-60'
                            : 'hover:border-emerald-500 hover:bg-emerald-50',
                        ].join(' ')}
                        title={
                          isOwner
                            ? isDone
                              ? 'Als offen markieren'
                              : 'Als erledigt markieren'
                            : 'Nur der Inhaber kann abhaken'
                        }
                      >
                        {isDone && <CheckIcon className="h-4 w-4" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm font-semibold text-slate-900 sm:text-[15px] ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {t.title}
                          </h3>
                          {t.offers?.offer_number && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                              Bezug: Angebot {t.offers.offer_number}
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p
                            className={`mt-1 whitespace-pre-wrap text-sm ${
                              isDone ? 'text-slate-400' : 'text-slate-700'
                            }`}
                          >
                            {t.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">
                            Zugewiesen an:
                          </span>
                          {todoAssignees.length > 0 ? (
                            todoAssignees.map((a) => (
                              <span
                                key={`${t.id}-${a.id}`}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                              >
                                {a.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">
                              Noch niemand zugewiesen
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex flex-wrap gap-2">
                        {t.status && (
                          <span className={statusCls}>
                            {statusLabel(t.status)}
                          </span>
                        )}
                        {prioLabel && (
                          <span className={priorityCls}>{prioLabel}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.due_date ? (
                          <>
                            Fällig am{' '}
                            <span className="font-mono">
                              {new Date(
                                t.due_date,
                              ).toLocaleDateString('de-DE')}
                            </span>
                          </>
                        ) : (
                          <>
                            Erstellt am{' '}
                            <span className="font-mono">
                              {new Date(
                                t.created_at,
                              ).toLocaleDateString('de-DE')}
                            </span>
                          </>
                        )}
                      </div>
                      {isOwner && (
                        <div className="mt-1 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditTodo(t)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <PencilSquareIcon className="h-3 w-3" />
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTodo(t.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-rose-700"
                          >
                            <TrashIcon className="h-3 w-3" />
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Bereiche / Räume – nur bei Handwerk sichtbar */}
      {showRooms && (
        <section className="mt-6 w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl sm:px-4 sm:py-5 lg:px-5 lg:py-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
            <div className="flex flex-1 flex-col gap-1">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-[15px]">
                <BuildingOffice2Icon className="h-5 w-5" />
                Bereiche / Räume
                <span className="text-xs font-normal text-slate-500">
                  ({counts.rooms})
                </span>
              </h2>
              <p className="max-w-xl text-xs text-slate-500 sm:text-[13px]">
                Strukturierte Unterteilung deines Projekts in Räume oder
                Bereiche – inkl. Arbeiten und benötigter Materialien.
              </p>
            </div>
            {isOwner && (
              <button
                onClick={openAddRoom}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 sm:text-sm"
              >
                + Bereich hinzufügen
              </button>
            )}
          </div>

          {allRooms.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {allRooms.map((room: any) => {
                const roomTasks = Array.isArray(room.project_room_tasks)
                  ? room.project_room_tasks
                  : []
                const roomMats = Array.isArray(room.project_room_materials)
                  ? room.project_room_materials
                  : []
                const isMeta = room._source === 'meta'

                return (
                  <div
                    key={room.id}
                    className="space-y-3 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.07)] backdrop-blur-xl"
                    style={{
                      backgroundImage:
                        'radial-gradient(420px 220px at 110% -30%, rgba(15,23,42,0.06), transparent)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-semibold text-slate-900">
                            {room.name}
                          </div>
                          {isMeta && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              aus Projektdetails
                            </span>
                          )}
                        </div>
                        {(room.width || room.length) && (
                          <div className="mt-1 text-xs text-slate-600">
                            {room.width ? `B: ${room.width} m` : ''}
                            {room.width && room.length ? ' • ' : ''}
                            {room.length ? `L: ${room.length} m` : ''}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-white/60">
                            Arbeiten: {roomTasks.length || '–'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-white/60">
                            Materialien: {roomMats.length || '–'}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {isOwner && (
                          <button
                            className={btnWhite}
                            onClick={() => openEditRoom(room)}
                          >
                            Bearbeiten
                          </button>
                        )}
                        {isOwner && !isMeta && (
                          <button
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs text-white shadow-sm hover:bg-rose-700"
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

                    <div className="pt-1">
                      <div className="mb-1 text-sm font-medium text-slate-700">
                        Arbeiten
                      </div>
                      {roomTasks.length ? (
                        <ul className="ml-4 list-disc space-y-1 text-sm text-slate-800">
                          {roomTasks.map((t: any) => (
                            <li key={t.id}>
                              <strong>{t.work}</strong>
                              {t.description ? ` – ${t.description}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-slate-500">
                          Keine Arbeiten hinterlegt.
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <div className="mb-1 text-sm font-medium text-slate-700">
                        Materialien
                      </div>
                      {roomMats.length ? (
                        <div className="overflow-hidden rounded-xl border border-white/60 bg-white/70 backdrop-blur">
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
                              {roomMats.map((pm: any) => {
                                const qty =
                                  pm.quantity === 0 || pm.quantity == null
                                    ? ''
                                    : pm.quantity
                                return (
                                  <tr
                                    key={pm.id}
                                    className="border-t border-slate-200/70"
                                  >
                                    <td className="p-2">
                                      {pm.materials?.name ??
                                        pm.material_name ??
                                        pm.name ??
                                        '—'}
                                    </td>
                                    <td className="p-2">{qty}</td>
                                    <td className="p-2">
                                      {pm.notes ?? pm.beschreibung ?? ''}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">
                          Keine Materialien hinterlegt.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-white/60 bg-white/60 px-4 py-6 text-sm text-slate-600 shadow-inner backdrop-blur">
              <p>
                Noch keine Bereiche / Räume angelegt.
                {isOwner && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={openAddRoom}
                      className="font-semibold text-slate-900 underline underline-offset-2"
                    >
                      Jetzt ersten Bereich hinzufügen
                    </button>
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </section>
      )}

      {/* TODO-MODAL */}
      {todoModalOpen && isOwner && (
        <div className="fixed inset-0 z-[180] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  {todoForm.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnWhite}
                    onClick={() => setTodoModalOpen(false)}
                    disabled={todoSaving}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTodo}
                    disabled={todoSaving}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {todoSaving
                      ? 'Speichert…'
                      : todoForm.id
                        ? 'Änderungen speichern'
                        : 'Aufgabe anlegen'}
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-auto px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <Label>Titel</Label>
                  <input
                    value={todoForm.title}
                    onChange={(e) =>
                      setTodoForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                    placeholder="z.B. Aufmaß vor Ort, Untergrund prüfen, Material bestellen …"
                  />
                </div>

                <div>
                  <Label>Beschreibung</Label>
                  <textarea
                    value={todoForm.description}
                    onChange={(e) =>
                      setTodoForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                    placeholder="Optional: Details zur Aufgabe, Vorbereitung, Materialien …"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Status</Label>
                    <select
                      value={todoForm.status}
                      onChange={(e) =>
                        setTodoForm((prev) => ({
                          ...prev,
                          status: e.target.value as
                            | 'open'
                            | 'in_progress'
                            | 'done'
                            | 'cancelled',
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                    >
                      <option value="open">Offen</option>
                      <option value="in_progress">In Bearbeitung</option>
                      <option value="done">Erledigt</option>
                      <option value="cancelled">Abgebrochen</option>
                    </select>
                  </div>
                  <div>
                    <Label>Fällig am</Label>
                    <input
                      type="date"
                      value={todoForm.due_date}
                      onChange={(e) =>
                        setTodoForm((prev) => ({
                          ...prev,
                          due_date: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                    />
                  </div>
                </div>

                <div>
                  <Label>Mitarbeiter (optional)</Label>
                  {employeeOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Es sind noch keine Mitarbeiter diesem Projekt zugewiesen.
                      Zuweisung erfolgt im Projektkopf.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {employeeOptions.map((emp) => {
                        const active =
                          todoForm.assigneeIds.indexOf(emp.id) !== -1
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() =>
                              setTodoForm((prev) => {
                                const exists =
                                  prev.assigneeIds.indexOf(emp.id) !== -1
                                return {
                                  ...prev,
                                  assigneeIds: exists
                                    ? prev.assigneeIds.filter(
                                        (id) => id !== emp.id,
                                      )
                                    : [...prev.assigneeIds, emp.id],
                                }
                              })
                            }
                            className={[
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur',
                              active
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-white',
                            ].join(' ')}
                          >
                            {emp.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {todoForm.id && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(todoForm.id!)}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Aufgabe löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OBJEKT-MODAL */}
      {roomOpen && isOwner && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-[1000px] overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  {roomForm.id ? 'Objekt bearbeiten' : 'Neuer Bereich / Raum'}
                </h3>
                <div className="flex gap-2">
                  <button
                    className={btnWhite}
                    onClick={() => setRoomOpen(false)}
                    type="button"
                  >
                    Abbrechen
                  </button>
                  <button
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={saveRoom}
                    type="button"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-auto px-4 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>Bezeichnung</Label>
                  <input
                    value={roomForm.name}
                    onChange={(e) => setRoomField('name', e.target.value)}
                    placeholder="z.B. Wohnzimmer, Meetingraum, Lager"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
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
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
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
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Notizen</Label>
                  <textarea
                    rows={3}
                    value={roomForm.notes}
                    onChange={(e) => setRoomField('notes', e.target.value)}
                    placeholder="Freitext zu Besonderheiten …"
                    className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                  />
                </div>
              </div>

              {/* Arbeiten */}
              <div className="mt-6">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
                                updateTask(idx, { work: e.target.value })
                              }
                              placeholder="z.B. Tapezieren, Streichen"
                              className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
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
                              className="mt-1 w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
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
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
                  <div className="overflow-hidden rounded-xl border border-white/60 bg-white/70 backdrop-blur">
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
                        {roomForm.materials.map((m, idx) => (
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
                                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                              >
                                <option value="">– auswählen –</option>
                                {materialsMaster.map((mat) => (
                                  <option key={mat.id} value={mat.id}>
                                    {mat.name}{' '}
                                    {mat.unit ? `(${mat.unit})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={m.quantity ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  updateMaterial(idx, {
                                    quantity:
                                      v === ''
                                        ? 0
                                        : Number.isNaN(Number(v))
                                        ? 0
                                        : Number(v),
                                  })
                                }}
                                className="w-24 rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
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
                                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:border-slate-300 focus:ring-4"
                                placeholder="optional"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
                                onClick={() => removeMaterial(idx)}
                              >
                                Entfernen
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
