'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

interface Customer { id: string; first_name: string | null; last_name: string | null }
interface CountRow { count: number }
interface Assignee { employee_id: string; employees?: { id: string; first_name?: string | null; last_name?: string | null } | null }

interface ProjectOverview {
  id: string
  title: string
  created_at: string
  customer: Customer | null
  project_rooms?: CountRow[]
  project_documents?: CountRow[]
  project_before_images?: CountRow[]
  project_comments?: CountRow[]
  assignees?: Assignee[] | null
}

type ConfirmState =
  | { open: false }
  | { open: true; id: string; title: string }

export default function ProjectsClient({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ProjectOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const [isEmployee, setIsEmployee] = useState<boolean>(false)

  // Rolle bestimmen (Owner vs Mitarbeiter)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supa = supabaseClient()
        const { data } = await supa
          .from('employees')
          .select('id')
          .eq('auth_user_id', userId)
          .maybeSingle()
        if (alive) setIsEmployee(!!data)
      } catch {
        if (alive) setIsEmployee(false)
      }
    })()
    return () => { alive = false }
  }, [userId])

  async function fetchRows() {
    setLoading(true)
    try {
      const res = await fetch('/api/projects', { credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as ProjectOverview[]
      setRows(data ?? [])
    } catch (err) {
      console.error('Projektliste Fehler:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRows() }, [])

  const c = (arr?: CountRow[]) => arr?.[0]?.count ?? 0
  const nameOf = (cust: Customer | null | undefined) =>
    `${cust?.first_name ?? ''} ${cust?.last_name ?? ''}`.trim() || '—'
  const initials = (first?: string | null, last?: string | null) =>
    `${(first ?? '').trim()[0] ?? ''}${(last ?? '').trim()[0] ?? ''}`.toUpperCase()

  // Suche: Titel, Kunde, Mitarbeiter
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter((p) => {
      const custName = `${p.customer?.first_name ?? ''} ${p.customer?.last_name ?? ''}`.trim().toLowerCase()
      const inTitleOrCustomer = p.title.toLowerCase().includes(qq) || custName.includes(qq)
      const ass = (p.assignees ?? []).map(a => a.employees ?? null).filter(Boolean) as NonNullable<Assignee['employees']>[]
      const inAssignees = ass.some(a => (`${a.first_name ?? ''} ${a.last_name ?? ''}`).toLowerCase().includes(qq))
      return inTitleOrCustomer || inAssignees
    })
  }, [rows, q])

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      setConfirm({ open: false })
      fetchRows()
    } catch (e) {
      console.error(e)
      alert('Löschen fehlgeschlagen.')
    }
  }

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-900 ring-1 ring-inset ring-slate-200 backdrop-blur">
      {children}
    </span>
  )

  const GhostIconBtn = (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string; children: React.ReactNode }
  ) => (
    <button
      {...props}
      className={`group rounded-lg border border-white/60 bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60 ${props.className ?? ''}`}
    >
      {props.children}
      <span className="sr-only">{props.title}</span>
    </button>
  )

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <header
        className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        style={{ boxShadow: '0 10px 40px rgba(2,6,23,0.08)' }}
      >
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Projekte</h1>
          <p className="text-sm text-slate-600">Kunde zuweisen, Angebote, Räume & Uploads.</p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Suche */}
          <label className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/90 px-3 py-2 backdrop-blur">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suchen (Titel, Kunde, Mitarbeiter)…"
              className="w-full bg-transparent text-sm text-slate-900 outline-none sm:w-[260px]"
            />
          </label>

          {/* Neu nur für Owner */}
          {!isEmployee && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
              onClick={() => { setEditId(null); setShowForm(true) }}
            >
              <PlusIcon className="h-4 w-4" />
              Projekt
            </button>
          )}
        </div>
      </header>

      {/* ===== MOBILE LIST (unter sm) ===== */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur animate-pulse">
              <div className="h-4 w-2/3 rounded bg-slate-200/70" />
              <div className="mt-2 h-3 w-1/3 rounded bg-slate-200/70" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-6 rounded bg-slate-200/70" />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-9 rounded bg-slate-200/70" />
                <div className="h-9 rounded bg-slate-200/70" />
              </div>
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((p) => {
            const detailHref = `/dashboard/projekt/${p.id}`
            const ass = (p.assignees ?? []).map(a => a.employees ?? null).filter(Boolean) as NonNullable<Assignee['employees']>[]
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur"
                style={{ backgroundImage: 'radial-gradient(900px 360px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
              >
                {/* Titel + Datum */}
                <Link href={detailHref} className="block" title={p.title}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900 line-clamp-2">{p.title}</h3>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0 text-slate-500" />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    erstellt: {new Date(p.created_at).toLocaleDateString('de-DE')}
                  </div>
                </Link>

                {/* Kunde */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-8 w-8 place-content-center rounded-full bg-white/80 text-slate-900 ring-1 ring-inset ring-slate-200 backdrop-blur">
                    <span className="text-xs font-semibold">
                      {(() => {
                        const nm = nameOf(p.customer)
                        const parts = nm.split(' ').filter(Boolean)
                        return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
                      })()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-800">{nameOf(p.customer)}</div>
                  </div>
                </div>

                {/* Mitarbeiter (Chips) */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {ass.length === 0 && <span className="text-xs text-slate-500">—</span>}
                  {ass.map(emp => (
                    <span
                      key={emp.id}
                      className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-slate-200 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 backdrop-blur"
                      title={`${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()}
                    >
                      {initials(emp.first_name, emp.last_name)}
                    </span>
                  ))}
                </div>

                {/* Zähler (4-spaltig) */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="text-[11px] text-slate-500">Räume</div>
                    <div className="mt-0.5"><Badge>{c(p.project_rooms)}</Badge></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-500">Dok.</div>
                    <div className="mt-0.5"><Badge>{c(p.project_documents)}</Badge></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-500">Vorher</div>
                    <div className="mt-0.5"><Badge>{c(p.project_before_images)}</Badge></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-500">Kom.</div>
                    <div className="mt-0.5"><Badge>{c(p.project_comments)}</Badge></div>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={detailHref}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-white/60 bg-white/90 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                    title="Öffnen"
                  >
                    Öffnen
                  </Link>

                  {!isEmployee ? (
                    <button
                      onClick={() => { setEditId(p.id); setShowForm(true) }}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-white/60 bg-white/90 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                      title="Bearbeiten"
                    >
                      Bearbeiten
                    </button>
                  ) : (
                    <button
                      disabled
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-white/60 bg-white/60 text-sm font-medium text-slate-400 shadow-sm backdrop-blur"
                      title="Keine Rechte"
                    >
                      —
                    </button>
                  )}

                  {!isEmployee && (
                    <button
                      onClick={() => setConfirm({ open: true, id: p.id, title: p.title })}
                      className="col-span-2 inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-100"
                      title="Löschen"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-slate-600 shadow-sm backdrop-blur">
            Keine Projekte gefunden.
          </div>
        )}
      </div>

      {/* ===== DESKTOP TABLE (ab sm) ===== */}
      <div
        className="mt-3 hidden rounded-2xl border border-white/60 bg-white/75 backdrop-blur sm:block"
        style={{ boxShadow: '0 10px 40px rgba(2,6,23,0.10)' }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-white/80 text-[12px] uppercase tracking-wide text-slate-600 ring-1 ring-white/60 backdrop-blur">
              <tr>
                {['Titel','Kunde','Mitarbeiter','Räume','Dok.','Vorher','Kommentare', !isEmployee ? '' : ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: !isEmployee ? 8 : 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 w-28 rounded bg-slate-200/70" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((p) => {
                  const detailHref = `/dashboard/projekt/${p.id}`
                  const ass = (p.assignees ?? []).map(a => a.employees ?? null).filter(Boolean) as NonNullable<Assignee['employees']>[]
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-white/70">
                      {/* Titel + Meta */}
                      <td className="px-5 py-4">
                        <Link href={detailHref} className="group block max-w-[48ch]" title={p.title}>
                          <span className="truncate text-sm font-medium text-slate-900 group-hover:underline">
                            {p.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            erstellt: {new Date(p.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </Link>
                      </td>

                      {/* Kunde */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-content-center rounded-full bg-white/80 text-slate-900 ring-1 ring-inset ring-slate-200 backdrop-blur">
                            <span className="text-xs font-semibold">
                              {(() => {
                                const nm = nameOf(p.customer)
                                const parts = nm.split(' ').filter(Boolean)
                                return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
                              })()}
                            </span>
                          </div>
                          <span className="truncate text-sm text-slate-800">{nameOf(p.customer)}</span>
                        </div>
                      </td>

                      {/* Mitarbeiter (Assignee-Initialen) */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {ass.length === 0 && <span className="text-xs text-slate-500">—</span>}
                          {ass.map(emp => (
                            <span
                              key={emp.id}
                              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-slate-200 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 backdrop-blur"
                              title={`${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()}
                            >
                              {initials(emp.first_name, emp.last_name)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Zähler */}
                      <td className="px-5 py-4"><Badge>{c(p.project_rooms)}</Badge></td>
                      <td className="px-5 py-4"><Badge>{c(p.project_documents)}</Badge></td>
                      <td className="px-5 py-4"><Badge>{c(p.project_before_images)}</Badge></td>
                      <td className="px-5 py-4"><Badge>{c(p.project_comments)}</Badge></td>

                      {/* Aktionen – nur Owner */}
                      {!isEmployee && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={detailHref}
                              className="group rounded-lg border border-white/60 bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                              title="Öffnen"
                            >
                              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-900 transition group-hover:scale-105" />
                              <span className="sr-only">Öffnen</span>
                            </Link>

                            <GhostIconBtn title="Bearbeiten" onClick={() => { setEditId(p.id); setShowForm(true) }}>
                              <PencilSquareIcon className="h-5 w-5 text-slate-900 transition group-hover:scale-105" />
                            </GhostIconBtn>

                            <GhostIconBtn title="Löschen" onClick={() => setConfirm({ open: true, id: p.id, title: p.title })}>
                              <TrashIcon className="h-5 w-5 text-slate-900 transition group-hover:scale-105" />
                            </GhostIconBtn>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="flex flex-col items-start gap-3 px-5">
                      <div className="grid h-14 w-14 place-content-center rounded-full bg-white ring-1 ring-inset ring-slate-200">
                        <span className="text-lg">🗂️</span>
                      </div>
                      <div className="text-sm text-slate-600">Keine Projekte gefunden.</div>
                      {!isEmployee && (
                        <button
                          className="rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                          onClick={() => { setEditId(null); setShowForm(true) }}
                        >
                          Neues Projekt anlegen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bestätigen (Delete) */}
      {confirm.open && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-slate-900/60 backdrop-blur">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)]">
            <div className="border-b border-white/60 bg-white/80 px-5 py-4">
              <h3 className="text-base font-medium text-slate-900">Projekt löschen?</h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700">
              „{(confirm as any).title}“ wird dauerhaft entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <button
                className="rounded-lg border border-white/60 bg-white/90 px-4 py-2 text-sm text-slate-900 shadow-sm hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                onClick={() => setConfirm({ open: false })}
              >
                Abbrechen
              </button>
              <button
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-200/60"
                onClick={() => handleDelete((confirm as any).id)}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formular (Modal) – nur Owner */}
      {!isEmployee && showForm && (
        <ProjectForm
          projectId={editId}
          onClose={() => { setShowForm(false); fetchRows() }}
        />
      )}
    </div>
  )
}

/* --------- Lazy import damit es oben lesbar bleibt --------- */
function ProjectForm(props: { projectId: string | null; onClose: () => void }) {
  const Lazy = React.useMemo(() => require('./ProjectForm').default, [])
  return React.createElement(Lazy, props)
}
