'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PlusCircleIcon,
  CheckCircleIcon,
  TrashIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  FolderIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

type EmployeeOption = { id: string; name: string }
type ProjectOption = { id: string; title: string }

type Todo = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done'
  due_date: string | null
  project_id: string | null
  employee_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  project?: { id: string; title: string | null } | null
  employee?: { id: string; first_name: string | null; last_name: string | null } | null
}

type Props = {
  employees: EmployeeOption[]
  projects: ProjectOption[]
}

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Kein Datum'
  const d = new Date(value)
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function daysUntil(due_date: string | null): number | null {
  if (!due_date) return null
  const due = new Date(due_date)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((due.getTime() - today.getTime()) / MS_PER_DAY)
}

/**
 * Sortierung nach Dringlichkeit:
 * 1) Überfällig (stärkste Überfälligkeit zuerst)
 * 2) Heute
 * 3) Zukünftig, aufsteigend nach Tagen
 * 4) Ohne Fälligkeitsdatum
 */
function compareUrgency(a: Todo, b: Todo): number {
  const da = daysUntil(a.due_date)
  const db = daysUntil(b.due_date)

  const rank = (d: number | null): number => {
    if (d === null) return 3
    if (d < 0) return 0
    if (d === 0) return 1
    return 2
  }

  const ra = rank(da)
  const rb = rank(db)
  if (ra !== rb) return ra - rb

  if (da !== null && db !== null && da !== db) {
    return da - db
  }

  return (
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

function badgeForDue(due_date: string | null, status: Todo['status']) {
  if (!due_date) {
    return {
      text: 'Ohne Fälligkeit',
      className: 'bg-slate-50 text-slate-600 ring-slate-100',
    }
  }
  if (status === 'done') {
    return {
      text: 'Erledigt',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    }
  }

  const diffDays = daysUntil(due_date)
  if (diffDays === null) {
    return {
      text: 'Ohne Fälligkeit',
      className: 'bg-slate-50 text-slate-600 ring-slate-100',
    }
  }

  if (diffDays < 0) {
    return {
      text: 'Überfällig',
      className: 'bg-rose-50 text-rose-700 ring-rose-100',
    }
  }
  if (diffDays === 0) {
    return {
      text: 'Heute',
      className: 'bg-amber-50 text-amber-700 ring-amber-100',
    }
  }
  if (diffDays <= 3) {
    return {
      text: `In ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`,
      className: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    }
  }
  return {
    text: `In ${diffDays} Tagen`,
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }
}

export default function TodoClient({ employees, projects }: Props) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>(
    'open',
  )
  const [filterProjectId, setFilterProjectId] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<string>('') // ISO yyyy-mm-dd
  const [projectId, setProjectId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  async function loadTodos() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('limit', '200')
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/todos?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Fehler beim Laden der To-dos.')
      }

      setTodos(json.data || [])
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler beim Laden der To-dos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const filteredTodos = useMemo(() => {
    let list = todos

    if (filterProjectId !== 'all') {
      list = list.filter((t) => t.project_id === filterProjectId)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q),
      )
    }

    return list
  }, [todos, search, filterProjectId])

  const openTodos = useMemo(() => {
    const list = filteredTodos.filter((t) => t.status !== 'done')
    return [...list].sort(compareUrgency)
  }, [filteredTodos])

  const doneTodos = useMemo(() => {
    const list = filteredTodos.filter((t) => t.status === 'done')
    return [...list].sort((a, b) => {
      const da = new Date(a.completed_at || a.updated_at).getTime()
      const db = new Date(b.completed_at || b.updated_at).getTime()
      return db - da
    })
  }, [filteredTodos])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setCreating(true)
      setError(null)

      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          project_id: projectId || null,
          employee_id: employeeId || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Fehler beim Erstellen der Aufgabe.')
      }

      setTodos((prev) => [json.data, ...prev])
      setTitle('')
      setDescription('')
      setDueDate('')
      setProjectId('')
      setEmployeeId('')
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler beim Erstellen.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleDone(todo: Todo) {
    const newStatus = todo.status === 'done' ? 'open' : 'done'

    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: newStatus } : t)),
    )

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update fehlgeschlagen.')

      setTodos((prev) => prev.map((t) => (t.id === todo.id ? json.data : t)))
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)))
      console.error(err)
    }
  }

  async function deleteTodo(todo: Todo) {
    const backup = [...todos]
    setTodos((prev) => prev.filter((t) => t.id !== todo.id))

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Löschen fehlgeschlagen.')
    } catch (err) {
      console.error(err)
      setTodos(backup)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Neue Aufgabe */}
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Neue Aufgabe</h2>
            <p className="text-[11px] text-slate-500">
              Schnell ein To-do anlegen, optional Projekt, Mitarbeitende und
              Fälligkeitsdatum setzen.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Was soll erledigt werden?"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner shadow-slate-100 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Details zur Aufgabe …"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 shadow-inner shadow-slate-100 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* FÄLLIG BIS – ohne große Box, nur Icon + DateInput */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Fällig bis
              </label>
              <div className="flex items-center gap-2">
                <div className="w-[120px] sm:w-[130px]">
                  <DateInputWithCalendar value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            </div>

            {/* Projekt */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Projekt (optional)
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-inner shadow-slate-100">
                <FolderIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                >
                  <option value="">Kein Projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mitarbeitende */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Mitarbeitende (optional)
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-inner shadow-slate-100">
                <UserCircleIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                >
                  <option value="">Niemand</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-400">
              Tipp: Nutze To-dos für interne Aufgaben, Checklisten oder kleine Projektsteps.
            </p>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-[0_8px_24px_rgba(15,23,42,0.35)] disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              <PlusCircleIcon className="h-4 w-4" />
              {creating ? 'Wird erstellt…' : 'Aufgabe hinzufügen'}
            </button>
          </div>
        </form>
      </section>

      {/* Filter-Leiste */}
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-50 px-1 py-1">
            {[
              { key: 'open', label: 'Offen' },
              { key: 'done', label: 'Erledigt' },
              { key: 'all', label: 'Alle' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterStatus(f.key as any)}
                className={cls(
                  'px-3 py-1 text-[11px] font-medium rounded-2xl transition-all',
                  filterStatus === f.key
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-[11px] text-slate-600">
              <FolderIcon className="h-4 w-4 text-slate-400" />
              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="w-full bg-transparent text-[11px] text-slate-800 outline-none sm:w-44"
              >
                <option value="all">Alle Projekte</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] shadow-inner shadow-slate-100 sm:w-64">
              <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    loadTodos()
                  }
                }}
                placeholder="In Aufgaben suchen…"
                className="w-full bg-transparent text-[11px] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Listenbereich */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Offene Aufgaben */}
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Offene Aufgaben</h2>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
              {openTodos.length} offen
            </span>
          </div>

          {loading && todos.length === 0 ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-white/80 p-3"
                >
                  <div className="mb-2 h-3 w-40 rounded-full bg-slate-100" />
                  <div className="mb-1 h-3 w-56 rounded-full bg-slate-100" />
                  <div className="h-3 w-24 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : openTodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs text-slate-400">
              Keine offenen Aufgaben.
            </div>
          ) : (
            <div className="space-y-2">
              {openTodos.map((todo) => {
                const dueBadge = badgeForDue(todo.due_date, todo.status)

                const employeeName = todo.employee
                  ? [todo.employee.first_name, todo.employee.last_name]
                      .filter(Boolean)
                      .join(' ')
                  : null

                const projectTitle = todo.project?.title || null

                return (
                  <div
                    key={todo.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDone(todo)}
                        className={cls(
                          'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-slate-400 transition',
                          todo.status === 'done'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white hover:border-slate-400',
                        )}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-medium text-slate-900">
                              {todo.title}
                            </div>
                            {todo.description && (
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                                {todo.description}
                              </div>
                            )}
                          </div>
                          <span
                            className={cls(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset',
                              dueBadge.className,
                            )}
                          >
                            {dueBadge.text}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500">
                          {todo.due_date && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <CalendarDaysIcon className="h-3 w-3" />
                              {formatDate(todo.due_date)}
                            </span>
                          )}
                          {projectTitle && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <FolderIcon className="h-3 w-3" />
                              {projectTitle}
                            </span>
                          )}
                          {employeeName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <UserCircleIcon className="h-3 w-3" />
                              {employeeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        Angelegt am {formatDate(todo.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTodo(todo)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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
        </div>

        {/* Erledigt */}
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Erledigt</h2>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
              {doneTodos.length} erledigt
            </span>
          </div>

          {doneTodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs text-slate-400">
              Noch nichts erledigt – leg los 😄
            </div>
          ) : (
            <div className="space-y-2">
              {doneTodos.map((todo) => {
                const employeeName = todo.employee
                  ? [todo.employee.first_name, todo.employee.last_name]
                      .filter(Boolean)
                      .join(' ')
                  : null
                const projectTitle = todo.project?.title || null

                return (
                  <div
                    key={todo.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDone(todo)}
                        className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-medium text-slate-800 line-through">
                              {todo.title}
                            </div>
                            {todo.description && (
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 line-through">
                                {todo.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500">
                          {todo.due_date && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <CalendarDaysIcon className="h-3 w-3" />
                              {formatDate(todo.due_date)}
                            </span>
                          )}
                          {projectTitle && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <FolderIcon className="h-3 w-3" />
                              {projectTitle}
                            </span>
                          )}
                          {employeeName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <UserCircleIcon className="h-3 w-3" />
                              {employeeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        Erledigt am {formatDate(todo.completed_at || todo.updated_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTodo(todo)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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
        </div>
      </section>
    </div>
  )
}
