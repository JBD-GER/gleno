// app/(app)/dashboard/projekt/[id]/ProjectDetailClient.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'

import {
  ProjectHeaderSection,
  type Assignee,
} from './ProjectHeaderSection'
import { ProjectCoreSection } from './ProjectCoreSection'
import { ProjectBottomSection } from './ProjectBottomSection'

import {
  ArrowLeftIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type Project = any
type TabKey = 'dokumente' | 'vorher' | 'nachher'
type SignedMap = Record<string, string>

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

const btnWhite =
  'rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white whitespace-nowrap'

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[13px] font-medium text-slate-700">
    {children}
  </label>
)

/* ---------- Zeit-Helper ---------- */
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

/* ====================================================================== */

export default function ProjectDetailClient({
  project: initialProject,
}: {
  project: Project
}) {
  const supa = supabaseClient()

  const [project, setProject] = useState<Project>(initialProject)

  const [me, setMe] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [roleChecked, setRoleChecked] = useState<boolean>(false)

  const [tab, setTab] = useState<TabKey>('dokumente')
  const [uploading, setUploading] = useState(false)
  const [signed, setSigned] = useState<SignedMap>({})

  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

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

  /* -------------------------------------------------------------------
     Assignees robust ableiten (egal ob assignees oder project_employees)
  -------------------------------------------------------------------- */
  const assignees: Assignee[] = useMemo(() => {
    if (!project) return []

    const rawFromAssignees = Array.isArray(project.assignees)
      ? project.assignees
      : []
    const rawFromProjectEmployees = Array.isArray(project.project_employees)
      ? project.project_employees
      : []

    const combined = [...rawFromAssignees, ...rawFromProjectEmployees]

    const map = new Map<string, Assignee>()

    for (const a of combined) {
      if (!a) continue
      const emp = a.employees || a.employee || null
      const id: string | undefined =
        emp?.id ?? a.employee_id ?? a.id ?? undefined

      const displayName = emp
        ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
        : ''

      const label = displayName || a.employee_name || a.employee_id || id

      if (!id || !label) continue
      if (!map.has(String(id))) {
        map.set(String(id), { id: String(id), label: String(label) })
      }
    }

    return Array.from(map.values())
  }, [project])

  const counts = useMemo(
    () => ({
      comments: (project.project_comments ?? []).length,
    }),
    [project],
  )

  const commentsSorted = useMemo(() => {
    const list = Array.isArray(project.project_comments)
      ? [...project.project_comments]
      : []
    return list.sort((a: any, b: any) => {
      const ad = a.created_at
      const bd = b.created_at
      return new Date(ad).getTime() - new Date(bd).getTime()
    })
  }, [project])

  const lastFive = commentsSorted.slice(-5)

  /* -------------------------------------------------------------------
     Projekt neu laden
  -------------------------------------------------------------------- */
  const refreshProject = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as any)?.error ?? `Status ${res.status}`)
      }
      const data = await res.json()
      setProject(data)
      setSigned({})
    } catch (e: any) {
      alert(
        `Projekt konnte nicht neu geladen werden: ${
          e?.message ?? String(e)
        }`,
      )
    }
  }

  /* -------------------------------------------------------------------
     Role / Owner
  -------------------------------------------------------------------- */
  useEffect(() => {
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
        setIsOwner(!!myId && myId === project.user_id)
      } finally {
        setRoleChecked(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------------------------------------------------------------------
     Signed URLs
  -------------------------------------------------------------------- */
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
        // still ignore, UI zeigt "lädt…"
      }
    }
    setSigned(copy)
  }

  useEffect(() => {
    prefetchSignedForTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, project])

  /* -------------------------------------------------------------------
     Uploads
  -------------------------------------------------------------------- */
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
    if (!isOwner) {
      alert('Nur der Inhaber kann Dateien löschen.')
      return
    }
    const { error } = await supa.from(table).delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    try {
      await supa.storage.from('projekt').remove([path])
    } catch {
      // ignore
    }
    await refreshProject()
    setSigned((s) => {
      const c = { ...s }
      delete c[path]
      return c
    })
  }

  /* -------------------------------------------------------------------
     Kommentare
  -------------------------------------------------------------------- */
  const sendComment = async () => {
    const content = comment.trim()
    if (!content) return
    try {
      setSending(true)
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

  /* -------------------------------------------------------------------
     Projekt-Zeiten
  -------------------------------------------------------------------- */
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
    if (!timeEntries.length) return

    const rows: string[][] = []
    rows.push([
      'Mitarbeiter',
      'Datum',
      'Start',
      'Ende',
      'PauseMin',
      'DauerSek',
      'Notiz',
    ])

    for (const e of timeEntries) {
      const durSec = Math.max(
        0,
        secondsDiff(e.start_time, e.end_time) -
          Number(e.break_minutes || 0) * 60,
      )

      rows.push([
        (e.employee_name || e.employee_id || '').toString(),
        e.work_date,
        fmtTime(e.start_time),
        fmtTime(e.end_time),
        String(e.break_minutes || 0),
        String(durSec),
        (e.notes ?? '').replace(/\r?\n/g, ' '),
      ])
    }

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const c = cell.replace(/"/g, '""')
            return `"${c}"`
          })
          .join(';'),
      )
      .join('\r\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projekt-${project.id}-zeiten.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ================================================================== */

  return (
    <div className="w-full px-3 pb-8 pt-4 sm:px-4 md:px-6">
      {/* Zur Übersicht */}
      <div className="mb-5 flex items-center justify-start">
        <Link
          href="/dashboard/projekt"
          className={`${btnWhite} inline-flex items-center gap-2`}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Zur Übersicht</span>
        </Link>
      </div>

      {/* OBERES MODUL */}
      <ProjectHeaderSection
        project={project}
        assignees={assignees}
        isOwner={isOwner}
        roleChecked={roleChecked}
        onOpenTimes={() => setTimeModalOpen(true)}
      />

      {/* MITTLERES MODUL */}
      <ProjectCoreSection
        project={project}
        isOwner={isOwner}
        refreshProject={refreshProject}
      />

      {/* UPLOAD-BEREICH */}
      <section className="mt-6 rounded-2xl border border-white/60 bg-white/80 p-0 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur">
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
                      {isOwner && (
                        <button
                          onClick={() =>
                            deleteFileRow('project_documents', d.id, d.path)
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
              <p className="mt-3 text-sm text-slate-700">
                Noch keine Dokumente.
              </p>
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
                <p className="mt-3 text-sm text-slate-700">
                  Noch keine Bilder hochgeladen.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* UNTERES MODUL */}
      <ProjectBottomSection
        project={project}
        isOwner={isOwner}
        refreshProject={refreshProject}
      />

      {/* KOMMENTARE */}
      <section className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
            Kommentare{' '}
            <span className="font-normal text-slate-500">
              ({counts.comments})
            </span>
          </h2>
          {counts.comments > 5 && (
            <button className={btnWhite} onClick={() => setCommentsOpen(true)}>
              Alle anzeigen
            </button>
          )}
        </div>

        {lastFive.length === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Kommentare.</p>
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
                        <span className="text-slate-600">Mitarbeiter</span>
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
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:ring-4 focus:ring-indigo-200/60"
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

      {/* COMMENTS MODAL */}
      {commentsOpen && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-slate-900/60 p-3 backdrop-blur sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/60 bg-white/80 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                Kommentare ({commentsSorted.length})
              </h3>
              <button
                className={`${btnWhite} inline-flex items-center gap-1`}
                onClick={() => setCommentsOpen(false)}
              >
                <XMarkIcon className="h-4 w-4" /> <span>Schließen</span>
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
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:ring-4 focus:ring-indigo-200/60"
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
                    <span className="font-mono">{timeTo}</span> · Gesamt:{' '}
                    <span className="font-mono font-semibold">
                      {fmtHMS(timeTotalSeconds)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportProjectTimesCsv}
                    disabled={!timeEntries.length}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span className="whitespace-nowrap">
                      CSV exportieren
                    </span>
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
                    <span className="whitespace-nowrap">
                      Aktualisieren
                    </span>
                  </button>
                  <button
                    onClick={() => setTimeModalOpen(false)}
                    className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50 sm:inline-flex"
                  >
                    Schließen
                  </button>
                </div>
              </div>

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
