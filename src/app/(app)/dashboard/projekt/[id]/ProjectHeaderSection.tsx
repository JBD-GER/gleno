// app/(app)/dashboard/projekt/[id]/ProjectHeaderSection.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  ClockIcon,
  UserCircleIcon,
  PencilSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import ProjectKpiModal from './ProjectKpiModal'

type Project = any

export type Assignee = {
  id: string
  label: string
}

export type ProjectHeaderSectionProps = {
  project: Project
  assignees: Assignee[]
  isOwner: boolean
  roleChecked: boolean
  onOpenTimes: () => void
}

const pill =
  'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide'

function formatCreatedAt(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(+d)) return ''
  return d.toLocaleDateString('de-DE')
}

/** Fallback: Assignees aus dem Project ableiten, falls Prop leer ist */
function deriveAssigneesFromProject(project: any): Assignee[] {
  if (!project) return []
  const result = new Map<string, Assignee>()

  const push = (
    id?: string | null,
    first?: string | null,
    last?: string | null,
    fallback?: string | null,
  ) => {
    if (!id) return
    const name = `${first ?? ''} ${last ?? ''}`.trim()
    const label = name || fallback || id
    if (!label) return
    if (!result.has(String(id))) {
      result.set(String(id), { id: String(id), label: String(label) })
    }
  }

  const collectFrom = (arr: any[] | undefined | null) => {
    if (!Array.isArray(arr)) return
    for (const a of arr) {
      if (!a) continue
      const emp = a.employees || a.employee || null
      const id: string | undefined =
        emp?.id ?? a.employee_id ?? a.id ?? undefined
      const first = emp?.first_name ?? null
      const last = emp?.last_name ?? null
      const fallback =
        a.employee_name ??
        a.employee_id ??
        (typeof a === 'string' ? a : null)
      push(id, first, last, fallback)
    }
  }

  collectFrom(project.assignees)
  collectFrom(project.project_assignees)
  collectFrom(project.project_employees)
  collectFrom(project.projectEmployees)

  return Array.from(result.values())
}

export function ProjectHeaderSection({
  project,
  assignees,
  isOwner,
  roleChecked,
  onOpenTimes,
}: ProjectHeaderSectionProps) {
  const router = useRouter()
  const created = formatCreatedAt(project.created_at)
  const [kpiOpen, setKpiOpen] = React.useState(false)

  const customerName =
    `${project.customer?.first_name ?? ''} ${
      project.customer?.last_name ?? ''
    }`.trim() || null

  const kindLabel =
    String(project.kind ?? '').toLowerCase() === 'general'
      ? 'General'
      : (project.kind ?? 'Projekt')

  const effectiveAssignees: Assignee[] = React.useMemo(() => {
    if (assignees && assignees.length > 0) return assignees
    return deriveAssigneesFromProject(project)
  }, [assignees, project])

  const assigneeLine =
    effectiveAssignees.length > 0
      ? effectiveAssignees.map((a) => a.label).join(', ')
      : null

  const handleEdit = () => {
    // Edit-Mode über Query-Parameter
    router.push(`/dashboard/projekt/projekt-erstellen?projectId=${project.id}`)
  }

  return (
    <>
      <section className="mb-5 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_16px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-5 lg:p-6">
        {/* Top: Titel + Kunde/Mitarbeitende + Aktionen */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Linke Seite */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${pill} bg-slate-900 text-white`}>
                {kindLabel.toUpperCase()}
              </span>

              {customerName && (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                  <UserCircleIcon className="h-4 w-4 text-slate-500" />
                  <span className="truncate">Kunde: {customerName}</span>
                </span>
              )}
            </div>

            <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">
              {project.title || 'Unbenanntes Projekt'}
            </h1>

            {/* Info-Zeile: Assignees oder Fallback-Text */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {assigneeLine ? (
                <>
                  <span className="font-medium text-slate-700">
                    Verantwortliche:
                  </span>
                  <span className="truncate">{assigneeLine}</span>
                </>
              ) : (
                <span className="text-slate-500">
                  Noch keine Mitarbeitenden zugewiesen.
                </span>
              )}
            </div>
          </div>

          {/* Rechte Seite: Aktionen */}
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
            <button
              type="button"
              onClick={onOpenTimes}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
            >
              <ClockIcon className="h-4 w-4" />
              <span className="whitespace-nowrap">Zeiteinträge öffnen</span>
            </button>

            <button
              type="button"
              onClick={() => setKpiOpen(true)}
              disabled={!project?.id}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span className="whitespace-nowrap">
                KPI &amp; Wirtschaftlichkeit
              </span>
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-white sm:w-auto"
              >
                <PencilSquareIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">Projekt bearbeiten</span>
              </button>
            )}
          </div>
        </div>

        {/* Meta-Zeile unten – auf großen Screens dreispaltig */}
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Projekt-ID
            </p>
            <p className="truncate font-mono text-[11px] text-slate-800">
              {project.id}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Erstellt am
            </p>
            <p className="text-slate-800">{created || '–'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Berechtigung
            </p>
            <p className="text-slate-800">
              {!roleChecked
                ? 'Prüfe Zugriffsrechte …'
                : isOwner
                ? 'Du bist Inhaber dieses Projekts'
                : 'Du hast Leserechte für dieses Projekt'}
            </p>
          </div>
        </div>
      </section>

      {project?.id && (
        <ProjectKpiModal
          projectId={project.id}
          open={kpiOpen}
          onClose={() => setKpiOpen(false)}
        />
      )}
    </>
  )
}
