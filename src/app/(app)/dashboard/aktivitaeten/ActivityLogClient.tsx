// src/app/(app)/dashboard/aktivitaet/ActivityLogClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

type ActivitySource =
  | 'app'
  | 'api'
  | 'automation'
  | 'system'
  | 'webhook'
  | 'import'

type ActivityLogEntry = {
  id: string
  tenant_user_id: string
  actor_user_id: string | null
  actor_employee_id: string | null
  actor_display_name: string | null
  actor_email: string | null
  actor_role: string | null
  source: ActivitySource
  event_type: string
  entity_type: string | null
  entity_table: string | null
  entity_id: string | null
  entity_label: string | null
  action: string
  details: any
  ip_hash: string | null
  user_agent: string | null
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  create: 'Angelegt',
  update: 'Geändert',
  delete: 'Gelöscht',
  status_change: 'Status geändert',
  view: 'Angesehen',
  file_upload: 'Datei hochgeladen',
  file_download: 'Datei heruntergeladen',
  email_sent: 'E-Mail versendet',
  login: 'Login',
  logout: 'Logout',
  password_reset: 'Passwort zurückgesetzt',
  automation_run: 'Automation',
  consent: 'Einwilligung',
  export: 'Export',
  other: 'Sonstiges',
}

const SOURCE_LABELS: Record<ActivitySource, string> = {
  app: 'App',
  api: 'API',
  automation: 'Automation',
  system: 'System',
  webhook: 'Webhook',
  import: 'Import',
}

const BADGE_COLORS: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  update: 'bg-amber-50 text-amber-700 ring-amber-100',
  delete: 'bg-rose-50 text-rose-700 ring-rose-100',
  email_sent: 'bg-sky-50 text-sky-700 ring-sky-100',
  automation_run: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  export: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100',
}

function formatDateTime(value: string) {
  const d = new Date(value)
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Versucht aus details + event_type eine halbwegs menschliche Kurzbeschreibung zu bauen.
 */
function buildSummary(entry: ActivityLogEntry): string {
  const d = (entry.details ?? {}) as Record<string, any>
  const type = entry.event_type

  if (type === 'email_sent') {
    const to = d.to || d.recipient || d.email
    const subject = d.subject || d.title
    if (to && subject) return `E-Mail an ${to}: „${subject}“`
    if (to) return `E-Mail an ${to} versendet`
    if (subject) return `E-Mail versendet: „${subject}“`
    return 'E-Mail-Versand protokolliert'
  }

  if (type === 'file_upload') {
    const name = d.file_name || d.name
    const path = d.path
    if (name && path) return `Datei „${name}“ nach ${path} hochgeladen`
    if (name) return `Datei „${name}“ hochgeladen`
    return 'Datei hochgeladen'
  }

  if (type === 'file_download') {
    const name = d.file_name || d.name
    if (name) return `Datei „${name}“ heruntergeladen`
    return 'Dateidownload protokolliert'
  }

  if (type === 'status_change') {
    const from = d.old_status || d.from || d.previous
    const to = d.new_status || d.to || d.current
    if (from && to) return `Status von „${from}“ auf „${to}“ geändert`
    if (to) return `Status auf „${to}“ geändert`
    return 'Status geändert'
  }

  if (type === 'create') {
    const label = entry.entity_label || d.name || d.title
    if (label) return `„${label}“ angelegt`
    return 'Objekt angelegt'
  }

  if (type === 'update') {
    const changes = Array.isArray(d.changed_fields)
      ? d.changed_fields.join(', ')
      : d.field
      ? d.field
      : null
    if (changes) return `Geänderte Felder: ${changes}`
    return 'Objekt aktualisiert'
  }

  if (type === 'delete') {
    const label = entry.entity_label || d.name || d.title
    if (label) return `„${label}“ gelöscht`
    return 'Objekt gelöscht'
  }

  if (type === 'login') {
    const method = d.method || d.provider
    if (method) return `Login (${method})`
    return 'Login'
  }

  if (type === 'logout') {
    return 'Logout'
  }

  if (type === 'password_reset') {
    const method = d.method || d.flow
    if (method) return `Passwort zurückgesetzt (${method})`
    return 'Passwort zurückgesetzt'
  }

  if (type === 'automation_run') {
    const label = d.label || d.name
    if (label) return `Automation „${label}“ ausgeführt`
    return 'Automation ausgeführt'
  }

  if (type === 'consent') {
    const version = d.version
    const kind = d.kind || d.type
    if (kind && version) return `Einwilligung (${kind}) Version ${version}`
    if (kind) return `Einwilligung (${kind}) aktualisiert`
    return 'Einwilligung aktualisiert'
  }

  if (type === 'export') {
    const what = d.export_type || d.entity_type || d.target
    if (what) return `Export erstellt (${what})`
    return 'Export erstellt'
  }

  // Fallback
  if (entry.action) return entry.action
  return 'Aktion ausgeführt'
}

function eventIcon(type: string) {
  if (type === 'create') return <PencilSquareIcon className="h-3.5 w-3.5" />
  if (type === 'update') return <Cog6ToothIcon className="h-3.5 w-3.5" />
  if (type === 'delete') return <TrashIcon className="h-3.5 w-3.5" />
  if (type === 'file_upload')
    return <ArrowUpTrayIcon className="h-3.5 w-3.5" />
  if (type === 'file_download')
    return <ArrowDownTrayIcon className="h-3.5 w-3.5" />
  if (type === 'email_sent')
    return <EnvelopeIcon className="h-3.5 w-3.5" />
  if (type === 'login' || type === 'logout')
    return <UserIcon className="h-3.5 w-3.5" />
  if (type === 'automation_run')
    return <Cog6ToothIcon className="h-3.5 w-3.5" />
  if (type === 'export')
    return <DocumentTextIcon className="h-3.5 w-3.5" />
  return <InformationCircleIcon className="h-3.5 w-3.5" />
}

export default function ActivityLogClient() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [eventType, setEventType] = useState<string | ''>('')
  const [source, setSource] = useState<string | ''>('')
  const [entityType, setEntityType] = useState<string | ''>('')
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(
    null,
  )

  const totalPages = useMemo(
    () => (count > 0 ? Math.ceil(count / limit) : 1),
    [count, limit],
  )

  async function loadData(currentPage: number) {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(limit))
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (eventType) params.set('eventType', eventType)
      if (source) params.set('source', source)
      if (entityType) params.set('entityType', entityType)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/activity-log?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Unbekannter Fehler')
      }

      setEntries(json.data ?? [])
      setCount(json.count ?? 0)
      setPage(currentPage)
    } catch (err: any) {
      setError(err.message ?? 'Fehler beim Laden des Activity-Logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, eventType, source, entityType])

  const hasFilters =
    !!fromDate || !!toDate || !!eventType || !!source || !!entityType || !!search

  return (
    <div className="space-y-4">
      {/* Filterpanel */}
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-xl sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              Filter
            </span>
            {hasFilters && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                aktiv
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFromDate('')
                setToDate('')
                setEventType('')
                setSource('')
                setEntityType('')
                setSearch('')
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-700"
            >
              Zurücksetzen
            </button>
            <button
              type="button"
              onClick={() => loadData(page)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Aktualisieren
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Zeitraum */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Zeitraum von
            </label>
            <DateInputWithCalendar
              value={fromDate}
              onChange={setFromDate}
              inputClassName="w-full"
              placeholder="tt.mm.jjjj"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Zeitraum bis
            </label>
            <DateInputWithCalendar
              value={toDate}
              onChange={setToDate}
              inputClassName="w-full"
              placeholder="tt.mm.jjjj"
            />
          </div>

          {/* Event-Typ */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Ereignis-Typ
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Alle</option>
              <option value="create">Angelegt</option>
              <option value="update">Geändert</option>
              <option value="delete">Gelöscht</option>
              <option value="status_change">Status geändert</option>
              <option value="file_upload">Datei hochgeladen</option>
              <option value="file_download">Datei heruntergeladen</option>
              <option value="email_sent">E-Mail versendet</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="password_reset">Passwort zurückgesetzt</option>
              <option value="automation_run">Automation</option>
              <option value="consent">Einwilligung</option>
              <option value="export">Export</option>
            </select>
          </div>

          {/* Quelle */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Quelle
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Alle</option>
              <option value="app">App</option>
              <option value="api">API</option>
              <option value="automation">Automation</option>
              <option value="system">System</option>
              <option value="webhook">Webhook</option>
              <option value="import">Import</option>
            </select>
          </div>

          {/* Entity-Typ */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Bereich / Entity
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Alle</option>
              <option value="customer">Kunden</option>
              <option value="project">Projekte</option>
              <option value="appointment">Termine</option>
              <option value="time_entry">Zeiterfassung</option>
              <option value="offer">Angebote</option>
              <option value="order_confirmation">
                Auftragsbestätigungen
              </option>
              <option value="invoice">Rechnungen</option>
              <option value="employee">Mitarbeiter</option>
              <option value="document">Dokumente</option>
              <option value="cloud_document">Cloud-Dokumente</option>
              <option value="vault_contract">Verträge</option>
              <option value="vault_license">Lizenzen</option>
              <option value="vault_credential">Zugangsdaten</option>
              <option value="market_request">Marktplatz-Anfragen</option>
              <option value="website">Websites</option>
              <option value="zoom_booking">Zoom-Buchungen</option>
            </select>
          </div>

          {/* Suche */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Suche (Person, E-Mail, Aktion, Objekt)
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  loadData(1)
                }
              }}
              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="z.B. Müller, Rechnung, Vertrag, E-Mail..."
            />
          </div>
        </div>
      </section>

      {/* Tabelle + Mobile-Ansicht */}
      <section className="rounded-3xl border border-white/60 bg-white/80 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">
              {count} Einträge
            </span>
            <span className="text-[11px] text-slate-400">
              Seite {page} von {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadData(page - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => loadData(page + 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 disabled:opacity-40"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  loadData(page)
                }}
                className="rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-rose-700 shadow-sm hover:bg-rose-50"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )}

        {!error && (
          <>
            {/* Desktop / Tablet: Tabelle */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-t border-slate-100 text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">
                      Zeitpunkt
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Aktion
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Bereich
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Kurzbeschreibung
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Person
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Quelle
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading && entries.length === 0 ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-3 w-32 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-24 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-24 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-56 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-40 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-16 rounded-full bg-slate-100" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="ml-auto h-7 w-16 rounded-full bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : entries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-xs text-slate-400"
                      >
                        Keine Aktivitäten im gewählten Zeitraum.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                      const eventLabel =
                        EVENT_LABELS[entry.event_type] ?? entry.event_type
                      const eventBadgeClass =
                        BADGE_COLORS[entry.event_type] ??
                        'bg-slate-50 text-slate-600 ring-slate-100'

                      const sourceLabel =
                        SOURCE_LABELS[entry.source] ?? entry.source

                      const entityTypeLabel =
                        entry.entity_type === 'customer'
                          ? 'Kunde'
                          : entry.entity_type === 'project'
                          ? 'Projekt'
                          : entry.entity_type === 'appointment'
                          ? 'Termin'
                          : entry.entity_type === 'time_entry'
                          ? 'Zeiterfassung'
                          : entry.entity_type === 'offer'
                          ? 'Angebot'
                          : entry.entity_type === 'order_confirmation'
                          ? 'Auftragsbestätigung'
                          : entry.entity_type === 'invoice'
                          ? 'Rechnung'
                          : entry.entity_type === 'employee'
                          ? 'Mitarbeiter'
                          : entry.entity_type === 'document'
                          ? 'Dokument'
                          : entry.entity_type === 'cloud_document'
                          ? 'Cloud-Dokument'
                          : entry.entity_type === 'vault_contract'
                          ? 'Vertrag'
                          : entry.entity_type === 'vault_license'
                          ? 'Lizenz'
                          : entry.entity_type === 'vault_credential'
                          ? 'Zugangsdaten'
                          : entry.entity_type === 'market_request'
                          ? 'Marktplatz-Anfrage'
                          : entry.entity_type === 'website'
                          ? 'Website'
                          : entry.entity_type === 'zoom_booking'
                          ? 'Zoom-Buchung'
                          : entry.entity_type ?? '—'

                      const actorName =
                        entry.actor_display_name ??
                        (entry.actor_email
                          ? entry.actor_email.split('@')[0]
                          : 'System')
                      const actorEmail = entry.actor_email
                      const actorRole = entry.actor_role

                      const summary = buildSummary(entry)

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60">
                          {/* Zeitpunkt */}
                          <td className="whitespace-nowrap px-4 py-3 align-top text-[11px] text-slate-500">
                            {formatDateTime(entry.created_at)}
                          </td>

                          {/* Aktion */}
                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ring-inset ${eventBadgeClass}`}
                            >
                              {eventIcon(entry.event_type)}
                              {eventLabel}
                            </span>
                          </td>

                          {/* Bereich */}
                          <td className="px-4 py-3 align-top text-[11px] text-slate-600">
                            {entityTypeLabel}
                            {entry.entity_table && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                ({entry.entity_table})
                              </span>
                            )}
                          </td>

                          {/* Kurzbeschreibung */}
                          <td className="px-4 py-3 align-top text-[11px] text-slate-700">
                            <div className="max-w-xs truncate">
                              {summary}
                            </div>
                            {entry.entity_label && (
                              <div className="mt-0.5 text-[10px] text-slate-400">
                                Objekt: {entry.entity_label}
                              </div>
                            )}
                          </td>

                          {/* Person */}
                          <td className="px-4 py-3 align-top text-[11px] text-slate-700">
                            <div className="flex flex-col">
                              <span>{actorName}</span>
                              {actorEmail && (
                                <span className="text-[10px] text-slate-400">
                                  {actorEmail}
                                </span>
                              )}
                              {actorRole && (
                                <span className="text-[10px] text-slate-400">
                                  Rolle: {actorRole}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quelle */}
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-100">
                              {sourceLabel}
                            </span>
                          </td>

                          {/* Details-Button */}
                          <td className="px-4 py-3 align-top text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEntry(entry)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: Karten-Ansicht */}
            <div className="block space-y-3 px-4 py-3 md:hidden">
              {loading && entries.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-slate-100 bg-white/80 p-3"
                  >
                    <div className="mb-2 h-3 w-32 rounded-full bg-slate-100" />
                    <div className="mb-1 h-3 w-48 rounded-full bg-slate-100" />
                    <div className="mb-1 h-3 w-40 rounded-full bg-slate-100" />
                    <div className="h-3 w-24 rounded-full bg-slate-100" />
                  </div>
                ))
              ) : entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-400">
                  Keine Aktivitäten im gewählten Zeitraum.
                </div>
              ) : (
                entries.map((entry) => {
                  const eventLabel =
                    EVENT_LABELS[entry.event_type] ?? entry.event_type
                  const eventBadgeClass =
                    BADGE_COLORS[entry.event_type] ??
                    'bg-slate-50 text-slate-600 ring-slate-100'
                  const sourceLabel =
                    SOURCE_LABELS[entry.source] ?? entry.source

                  const actorName =
                    entry.actor_display_name ??
                    (entry.actor_email
                      ? entry.actor_email.split('@')[0]
                      : 'System')
                  const actorEmail = entry.actor_email
                  const actorRole = entry.actor_role

                  const entityTypeLabel =
                    entry.entity_type === 'customer'
                      ? 'Kunde'
                      : entry.entity_type === 'project'
                      ? 'Projekt'
                      : entry.entity_type === 'appointment'
                      ? 'Termin'
                      : entry.entity_type === 'time_entry'
                      ? 'Zeiterfassung'
                      : entry.entity_type === 'offer'
                      ? 'Angebot'
                      : entry.entity_type === 'order_confirmation'
                      ? 'Auftragsbestätigung'
                      : entry.entity_type === 'invoice'
                      ? 'Rechnung'
                      : entry.entity_type === 'employee'
                      ? 'Mitarbeiter'
                      : entry.entity_type === 'document'
                      ? 'Dokument'
                      : entry.entity_type === 'cloud_document'
                      ? 'Cloud-Dokument'
                      : entry.entity_type === 'vault_contract'
                      ? 'Vertrag'
                      : entry.entity_type === 'vault_license'
                      ? 'Lizenz'
                      : entry.entity_type === 'vault_credential'
                      ? 'Zugangsdaten'
                      : entry.entity_type === 'market_request'
                      ? 'Marktplatz-Anfrage'
                      : entry.entity_type === 'website'
                      ? 'Website'
                      : entry.entity_type === 'zoom_booking'
                      ? 'Zoom-Buchung'
                      : entry.entity_type ?? '—'

                  const summary = buildSummary(entry)

                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {formatDateTime(entry.created_at)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${eventBadgeClass}`}
                        >
                          {eventIcon(entry.event_type)}
                          {eventLabel}
                        </span>
                      </div>

                      <div className="mb-1 text-[13px] font-medium text-slate-900">
                        {entry.entity_label || summary}
                      </div>
                      <div className="mb-2 text-[11px] text-slate-600">
                        {summary}
                      </div>

                      <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">
                          {entityTypeLabel}
                        </span>
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">
                          {sourceLabel}
                        </span>
                      </div>

                      <div className="mb-2 text-[10px] text-slate-500">
                        <div className="font-medium text-slate-700">
                          {actorName}
                        </div>
                        {actorEmail && (
                          <div className="text-slate-400">{actorEmail}</div>
                        )}
                        {actorRole && (
                          <div className="text-slate-400">
                            Rolle: {actorRole}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {entry.entity_id && (
                          <span className="max-w-[60%] truncate text-[10px] text-slate-400">
                            ID: {entry.entity_id}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          Details
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Detail-Panel (Meta + Technische Details, voll responsive) */}
            {selectedEntry && (
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-700 overflow-x-hidden">
                {/* Header */}
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Detailansicht
                    </div>
                    <div className="text-sm font-medium text-slate-800">
                      {selectedEntry.entity_label ||
                        buildSummary(selectedEntry) ||
                        'Ohne Bezeichnung'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatDateTime(selectedEntry.created_at)} ·{' '}
                      {EVENT_LABELS[selectedEntry.event_type] ??
                        selectedEntry.event_type}{' '}
                      ·{' '}
                      {SOURCE_LABELS[selectedEntry.source] ??
                        selectedEntry.source}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(null)}
                    className="self-start rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 md:self-auto"
                  >
                    Schließen
                  </button>
                </div>

{/* Inhalt */}
<div className="grid gap-3 md:grid-cols-2">
  {/* Meta-Infos */}
  <div className="min-w-0 space-y-1 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      Meta-Daten
    </div>
    <dl className="space-y-1 text-[11px]">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">Bereich</dt>
        <dd className="break-words text-slate-700 sm:text-right">
          {selectedEntry.entity_type || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">Objekt-ID</dt>
        <dd className="break-all text-slate-700 sm:text-right">
          {selectedEntry.entity_id || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">Quelle</dt>
        <dd className="break-words text-slate-700 sm:text-right">
          {SOURCE_LABELS[selectedEntry.source] ?? selectedEntry.source}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">Benutzer-ID</dt>
        <dd className="break-all text-slate-700 sm:text-right">
          {selectedEntry.actor_user_id || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">Mitarbeiter-ID</dt>
        <dd className="break-all text-slate-700 sm:text-right">
          {selectedEntry.actor_employee_id || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">IP-Hash</dt>
        <dd className="break-all text-slate-700 sm:text-right">
          {selectedEntry.ip_hash || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <dt className="text-slate-500 sm:min-w-[90px]">User-Agent</dt>
        <dd className="max-w-full break-words text-slate-700 sm:max-w-[260px] sm:text-right">
          {selectedEntry.user_agent || '—'}
        </dd>
      </div>
    </dl>
  </div>

  {/* Technische Details – blaue Box, voll responsive */}
  <div className="min-w-0 space-y-1 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
    <div className="mb-1 flex items-center justify-between">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Technische Details
      </div>
    </div>

    {/* Scroll nur innerhalb der JSON-Box, Container bleibt im Grid */}
    <div className="max-h-72 w-full overflow-auto rounded-xl bg-slate-900/95 shadow-inner">
      <pre className="min-w-full whitespace-pre px-3 py-2 text-[10px] leading-relaxed text-slate-50">
        {JSON.stringify(selectedEntry.details ?? {}, null, 2)}
      </pre>
    </div>
  </div>
</div>

              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
