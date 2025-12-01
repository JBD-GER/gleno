// app/(app)/dashboard/projekt/[id]/ProjectCoreSection.tsx
'use client'

import React, { useMemo } from 'react'
import {
  ClockIcon,
  BanknotesIcon,
  MapPinIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline'

type Project = any

export type ProjectCoreSectionProps = {
  project: Project
  isOwner: boolean
  refreshProject: () => void | Promise<void>
}

/* --------------------- Helper-Funktionen --------------------- */

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

function formatDate(d?: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('de-DE')
  }
  return String(d)
}

function formatBudget(value: any): string {
  if (value === null || value === undefined || value === '') return ''
  const raw = String(value).trim()
  const num =
    typeof value === 'number'
      ? value
      : Number(raw.replace(/\./g, '').replace(',', '.'))

  if (isNaN(num)) return raw

  return num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function diffInDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num))
}

function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max) + ' …'
}

/* ---------- Label-Maps für Handwerk & IT ---------- */

const TRADE_LABELS: Record<string, string> = {
  fliesen: 'Fliesen / Boden',
  maler: 'Maler / Lackierer',
  elektro: 'Elektro',
  sanitaer: 'Sanitär / Heizung / Klima',
  gebaeudereinigung: 'Gebäudereinigung',
  photovoltaik: 'Photovoltaik',
  gartenbau: 'Garten- & Landschaftsbau',
  trockenbau: 'Trockenbau',
  allgemein: 'Allgemeines Handwerk',
  sonstiges: 'Sonstiges',
}

const OBJECT_TYPE_LABELS: Record<string, string> = {
  haus: 'Einfamilienhaus',
  wohnung: 'Wohnung',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  gewerbe: 'Gewerbeobjekt',
  buero: 'Büro / Praxis',
  aussenanlage: 'Außenanlage / Grundstück',
  sonstiges: 'Sonstiges',
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  neubau: 'Neubau',
  sanierung: 'Sanierung / Modernisierung',
  wartung: 'Wartung / Service',
  reparatur: 'Reparatur',
  montage: 'Montage',
  reinigung_einmalig: 'Reinigung (einmalig)',
  reinigung_wiederkehrend: 'Reinigung (wiederkehrend)',
  sonstiges: 'Sonstiges',
}

const RECURRENCE_LABELS: Record<string, string> = {
  einmalig: 'Einmalig',
  woechentlich: 'Wöchentlich',
  zweiwoechentlich: '14-tägig',
  monatlich: 'Monatlich',
  individuell: 'Individuell / nach Bedarf',
}

const IT_ENV_LABELS: Record<string, string> = {
  prod: 'Produktiv',
  staging: 'Staging',
  test: 'Test',
  dev: 'Entwicklung',
}

const MODE_LABELS: Record<string, string> = {
  rooms: 'Bereiche / Räume',
  simple: 'Allgemein (ohne Bereiche)',
}

/* ------------------------- Component ------------------------- */

export function ProjectCoreSection(props: ProjectCoreSectionProps) {
  const { project } = props

  const details = useMemo(() => normalizeDetails(project.details), [project])

  const kind = useMemo(
    () => String(project.kind ?? details?.kind ?? '').toLowerCase(),
    [project, details],
  )

  const kindLabel = useMemo(() => {
    if (kind === 'general') return 'Allgemeines Projekt'
    if (kind === 'handwerk') return 'Handwerk / Dienstleistung'
    if (kind === 'it') return 'IT / Digital'
    return 'Projekt'
  }, [kind])

  const kindDetails = useMemo(() => {
    if (!details) return {}
    if (kind === 'general') return details.general ?? {}
    if (kind === 'handwerk') return details.handwerk ?? details[kind] ?? {}
    if (kind === 'it') return details.it ?? details[kind] ?? {}
    return details[kind] ?? details
  }, [details, kind])

  const isGeneral = kind === 'general'
  const isHandwerk = kind === 'handwerk'
  const isIt = kind === 'it'

  /* ---------- GENERAL-Felder ---------- */

  const startDate =
    (kindDetails as any).start_date ?? (kindDetails as any).startDate ?? null
  const dueDate =
    (kindDetails as any).due_date ?? (kindDetails as any).dueDate ?? null
  const budget =
    (kindDetails as any).budget ?? (kindDetails as any).budget_planned ?? null
  const goal = (kindDetails as any).goal ?? null
  const notes = (kindDetails as any).notes ?? null
  const successMetric =
    (kindDetails as any).success_metric ??
    (kindDetails as any).successMetric ??
    null

  /* ---------- HANDWERK-Felder ---------- */

  const hwMode: string | null = isHandwerk
    ? (kindDetails as any).mode ?? null
    : null
  const hwTrade: string | null = isHandwerk
    ? (kindDetails as any).trade ?? null
    : null
  const hwObjectType: string | null = isHandwerk
    ? (kindDetails as any).object_type ?? null
    : null
  const hwServiceType: string | null = isHandwerk
    ? (kindDetails as any).service_type ?? null
    : null
  const hwRecurrence: string | null = isHandwerk
    ? (kindDetails as any).recurrence ?? null
    : null
  const hwScope: string | null = isHandwerk
    ? (kindDetails as any).scope ?? null
    : null
  const hwArea: string | null = isHandwerk
    ? (kindDetails as any).area_m2 ?? null
    : null
  const hwPlannedHours: string | null = isHandwerk
    ? (kindDetails as any).planned_hours ?? null
    : null

  const hasHandwerkMeta =
    isHandwerk &&
    (hwMode ||
      hwTrade ||
      hwObjectType ||
      hwServiceType ||
      hwRecurrence ||
      hwScope ||
      hwArea ||
      hwPlannedHours)

  /* ---------- IT-Felder ---------- */

  const itSystemName: string | null = isIt
    ? (kindDetails as any).system_name ?? null
    : null
  const itEnvironment: string | null = isIt
    ? (kindDetails as any).environment ?? null
    : null
  const itRepoUrl: string | null = isIt
    ? (kindDetails as any).repo_url ?? null
    : null
  const itHostUrl: string | null = isIt
    ? (kindDetails as any).host_url ?? null
    : null
  const itGoLiveDate: string | null = isIt
    ? (kindDetails as any).go_live_date ?? null
    : null
  const itAccessNotes: string | null = isIt
    ? (kindDetails as any).access_notes ?? null
    : null

  const hasItMeta =
    isIt &&
    (itSystemName ||
      itEnvironment ||
      itRepoUrl ||
      itHostUrl ||
      itGoLiveDate ||
      itAccessNotes)

  /* ---------- Projekt-Felder ---------- */

  const offerCount = (project.project_offers ?? []).length

  const address: string = project.address ?? ''
  const objectName: string = project.object_name ?? ''
  const floor: string = project.floor ?? ''

  const hasObjectData = !!address || !!objectName || !!floor

  /* ---------- KPI / Timeline ---------- */

  const timeline = useMemo(() => {
    if (!startDate || !dueDate) return null
    const start = new Date(startDate)
    const end = new Date(dueDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

    const today = new Date()
    const totalDays = Math.max(diffInDays(start, end), 1)
    const elapsedDays = diffInDays(start, today)
    const remainingDays = diffInDays(today, end)

    const progress = clamp((elapsedDays / totalDays) * 100, 0, 100)

    return {
      startLabel: formatDate(startDate),
      endLabel: formatDate(dueDate),
      totalDays,
      elapsedDays: Math.max(elapsedDays, 0),
      remainingDays: Math.max(remainingDays, 0),
      progress,
    }
  }, [startDate, dueDate])

  const kpiBudgetLabel = budget
    ? `${formatBudget(budget)} €`
    : 'Kein Budget hinterlegt'

  const kpiScopeLabel = isHandwerk
    ? hwArea
      ? `${hwArea} m²${hwPlannedHours ? ` · ${hwPlannedHours} Std.` : ''}`
      : hwPlannedHours
      ? `${hwPlannedHours} Std. geplant`
      : 'Kein Umfang hinterlegt'
    : isGeneral && goal
    ? truncate(String(goal), 40)
    : isIt && itSystemName
    ? truncate(String(itSystemName), 40)
    : 'Keine zusätzlichen Angaben'

  /* ----------------------------- UI ----------------------------- */

  return (
    <section className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:px-4 sm:py-5 lg:px-5 lg:py-6">
      {/* Kopfzeile */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[12px]">
            Projektdaten
          </h2>
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-100 bg-slate-50/80 px-2 py-1 text-[11px] font-medium text-slate-600">
            <PresentationChartBarIcon className="h-3.5 w-3.5" />
            {kindLabel}
          </span>
        </div>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* KPI-Row – mobil 1 Spalte, Tablet 2, Desktop 3 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Zeitraum */}
          <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-white">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Zeitraum
                </p>
              </div>
              {timeline && (
                <span className="text-[11px] font-medium text-slate-500">
                  {timeline.elapsedDays}/{timeline.totalDays} Tage
                </span>
              )}
            </div>

            {timeline ? (
              <div className="mt-3 space-y-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-[width]"
                    style={{ width: `${timeline.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{timeline.startLabel}</span>
                  <span>{timeline.endLabel}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Kein geplanter Zeitraum hinterlegt.
              </p>
            )}
          </div>

          {/* Budget */}
          <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-white">
                <BanknotesIcon className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Budget / Volumen
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 sm:text-base">
              {kpiBudgetLabel}
            </p>
            {budget && (
              <p className="mt-1 text-[11px] text-slate-500">
                Richtwert – kein verbindliches Angebot
              </p>
            )}
          </div>

          {/* Umfang / Ziel */}
          <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-white">
                <MapPinIcon className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Umfang / Ziel
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-900 sm:text-base">
              {kpiScopeLabel}
            </p>
          </div>
        </div>

        {/* Karten untereinander, volle Breite */}
        <div className="mt-2 space-y-4 sm:space-y-5">
          {/* Beschreibung – ganze Zeile */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm sm:p-5">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Beschreibung
            </p>
            {project.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900 sm:text-[15px]">
                {project.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Keine Beschreibung hinterlegt.
              </p>
            )}
          </div>

          {/* Box 2: Einsatz & Umfang ODER Kontext/System – ganze Zeile */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm sm:p-5">
            {isHandwerk ? (
              <>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Einsatz &amp; Umfang
                </p>
                {hasHandwerkMeta ? (
                  <dl className="mt-2 space-y-2 text-sm text-slate-900 sm:text-[15px]">
                    {hwTrade && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Gewerk
                        </dt>
                        <dd>{TRADE_LABELS[hwTrade] ?? hwTrade}</dd>
                      </div>
                    )}
                    {hwObjectType && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Objektart
                        </dt>
                        <dd>
                          {OBJECT_TYPE_LABELS[hwObjectType] ?? hwObjectType}
                        </dd>
                      </div>
                    )}
                    {hwServiceType && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Auftragsart
                        </dt>
                        <dd>
                          {SERVICE_TYPE_LABELS[hwServiceType] ?? hwServiceType}
                        </dd>
                      </div>
                    )}
                    {hwRecurrence && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Turnus / Rhythmus
                        </dt>
                        <dd>
                          {RECURRENCE_LABELS[hwRecurrence] ?? hwRecurrence}
                        </dd>
                      </div>
                    )}
                    {hwMode && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Struktur
                        </dt>
                        <dd>{MODE_LABELS[hwMode] ?? hwMode}</dd>
                      </div>
                    )}
                    {hwArea && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Fläche gesamt
                        </dt>
                        <dd>{String(hwArea)} m²</dd>
                      </div>
                    )}
                    {hwPlannedHours && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Geplante Stunden / Hinweise
                        </dt>
                        <dd className="whitespace-pre-wrap">
                          {String(hwPlannedHours)}
                        </dd>
                      </div>
                    )}
                    {hwScope && (
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                          Leistungsumfang
                        </dt>
                        <dd className="whitespace-pre-wrap">{hwScope}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Keine handwerksspezifischen Angaben hinterlegt.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {isGeneral ? 'Kontext & Ziel' : 'System-Info'}
                </p>
                <div className="mt-2 text-sm text-slate-900 sm:text-[15px]">
                  {isGeneral ? (
                    goal || successMetric || notes ? (
                      <>
                        {goal && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Projektziel
                            </span>
                            <br />
                            <span className="whitespace-pre-wrap">
                              {goal}
                            </span>
                          </p>
                        )}
                        {successMetric && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Erfolgskriterium
                            </span>
                            <br />
                            {String(successMetric)}
                          </p>
                        )}
                        {notes && (
                          <p>
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Interne Notizen
                            </span>
                            <br />
                            <span className="whitespace-pre-wrap">
                              {String(notes)}
                            </span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-400">
                        Noch keine Ziele oder Hinweise hinterlegt.
                      </p>
                    )
                  ) : isIt ? (
                    hasItMeta ? (
                      <>
                        {itSystemName && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              System / Projekt
                            </span>
                            <br />
                            {itSystemName}
                          </p>
                        )}
                        {itEnvironment && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Umgebung
                            </span>
                            <br />
                            {IT_ENV_LABELS[itEnvironment] ?? itEnvironment}
                          </p>
                        )}
                        {itRepoUrl && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Repository
                            </span>
                            <br />
                            <a
                              href={itRepoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                            >
                              {itRepoUrl}
                            </a>
                          </p>
                        )}
                        {itHostUrl && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Hosting / URL
                            </span>
                            <br />
                            <a
                              href={itHostUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                            >
                              {itHostUrl}
                            </a>
                          </p>
                        )}
                        {itGoLiveDate && (
                          <p className="mb-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Go-Live (geplant)
                            </span>
                            <br />
                            {formatDate(itGoLiveDate)}
                          </p>
                        )}
                        {itAccessNotes && (
                          <p>
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Zugänge / Besonderheiten
                            </span>
                            <br />
                            <span className="whitespace-pre-wrap">
                              {itAccessNotes}
                            </span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-400">
                        Noch keine Systeminformationen hinterlegt.
                      </p>
                    )
                  ) : (
                    <p className="text-slate-400">
                      Keine zusätzlichen Angaben hinterlegt.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Box 3: Objekt & Adresse + Angebote – ganze Zeile */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm sm:p-5">
            {isHandwerk && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Objekt &amp; Adresse
                </p>
                {hasObjectData ? (
                  <div className="mt-2 space-y-2 text-sm text-slate-900 sm:text-[15px]">
                    {objectName && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Objekt / Bezeichnung
                        </p>
                        <p className="mt-0.5">{objectName}</p>
                      </div>
                    )}
                    {floor && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Etage / Bereich
                        </p>
                        <p className="mt-0.5">{floor}</p>
                      </div>
                    )}
                    {address && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Adresse
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">
                          {address}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Keine Objektdaten hinterlegt.
                  </p>
                )}

                <hr className="my-3 border-slate-100" />
              </>
            )}

            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Verknüpfte Angebote
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {offerCount > 0 ? (
                project.project_offers.map((po: any) => (
                  <span
                    key={po.offer_id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm"
                  >
                    {po.offers?.offer_number ?? po.offer_id}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  Noch keine Angebote verknüpft.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
