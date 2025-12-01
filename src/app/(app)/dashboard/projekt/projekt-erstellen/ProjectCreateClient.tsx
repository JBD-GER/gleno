// app/(app)/dashboard/projekt-erstellen/ProjectCreateClient.tsx
'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

const PRIMARY = '#0F172A'

type ProjectKind = 'general' | 'handwerk' | 'it'

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
}

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
}

type Offer = {
  id: string
  offer_number: string
}

type HandwerkRoom = {
  id: string
  name: string
  width: string
  length: string
  notes: string
}

type TodoDraft = {
  id: string
  title: string
  description: string
  assigneeIds: string[]
}

type ProjectCreateClientProps = {
  mode: 'create' | 'edit'
  initialProject: any | null
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const inputBase =
  'w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder-slate-400 backdrop-blur focus:border-slate-300 focus:ring-4 focus:ring-indigo-200/60'

const textareaBase =
  'w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder-slate-400 backdrop-blur focus:border-slate-300 focus:ring-4 focus:ring-indigo-200/60'

const pillButtonBase =
  'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition border backdrop-blur whitespace-nowrap'

const cardBase =
  'rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl'

export default function ProjectCreateClient({
  mode,
  initialProject,
}: ProjectCreateClientProps) {
  const router = useRouter()
  const supa = supabaseClient()
  const isEdit = mode === 'edit'

  // ---------------------------------------------------
  // Initialwerte aus initialProject ableiten
  // ---------------------------------------------------
  const baseDetails = (initialProject?.details as any) ?? {}
  const detailsGeneral = baseDetails.general ?? {}
  const detailsHandwerk = baseDetails.handwerk ?? {}
  const detailsIt = baseDetails.it ?? {}

  const initialKind: ProjectKind =
    (initialProject?.kind as ProjectKind) ?? 'general'

  const initialCustomerId: string = initialProject?.customer_id ?? ''

  const initialGeneralStart: string =
    detailsGeneral.start_date ??
    detailsHandwerk.start_date ??
    detailsIt.start_date ??
    ''

  const initialGeneralDue: string =
    detailsGeneral.due_date ??
    detailsHandwerk.due_date ??
    detailsIt.due_date ??
    ''

  const initialGeneralBudget: string =
    detailsGeneral.budget ??
    detailsHandwerk.budget ??
    detailsIt.budget ??
    ''

  const initialGoal: string = detailsGeneral.goal ?? ''
  const initialSuccessMetric: string = detailsGeneral.success_metric ?? ''
  const initialGeneralNotes: string = detailsGeneral.notes ?? ''

  const initialHandwerkMode: 'rooms' | 'simple' =
    detailsHandwerk.mode === 'simple' || detailsHandwerk.mode === 'rooms'
      ? detailsHandwerk.mode
      : detailsHandwerk.rooms_meta?.length
      ? 'rooms'
      : 'simple'

  const initialHandwerkRooms: HandwerkRoom[] = Array.isArray(
    detailsHandwerk.rooms_meta,
  )
    ? detailsHandwerk.rooms_meta.map((r: any) => ({
        id: createLocalId(),
        name: r?.name ?? '',
        width:
          r?.width !== undefined && r?.width !== null
            ? String(r.width)
            : '',
        length:
          r?.length !== undefined && r?.length !== null
            ? String(r.length)
            : '',
        notes: r?.notes ?? '',
      }))
    : []

  const initialHandwerkTrade: string = detailsHandwerk.trade ?? ''
  const initialHandwerkObjectType: string = detailsHandwerk.object_type ?? ''
  const initialHandwerkServiceType: string = detailsHandwerk.service_type ?? ''
  const initialHandwerkRecurrence: string = detailsHandwerk.recurrence ?? ''
  const initialHandwerkScope: string = detailsHandwerk.scope ?? ''
  const initialHandwerkArea: string =
    detailsHandwerk.area_m2 !== undefined &&
    detailsHandwerk.area_m2 !== null
      ? String(detailsHandwerk.area_m2)
      : ''
  const initialHandwerkHours: string =
    detailsHandwerk.planned_hours ?? ''

  const initialItSystemName: string = detailsIt.system_name ?? ''
  const initialItEnvironment: 'prod' | 'staging' | 'test' | 'dev' | '' =
    detailsIt.environment ?? ''
  const initialItRepo: string = detailsIt.repo_url ?? ''
  const initialItHost: string = detailsIt.host_url ?? ''
  const initialItGoLive: string = detailsIt.go_live_date ?? ''
  const initialItAccessNotes: string = detailsIt.access_notes ?? ''

  const initialAssigneeIds: string[] = Array.isArray(
    initialProject?.project_assignees,
  )
    ? (initialProject.project_assignees as any[]).map(
        (a) => a.employee_id as string,
      )
    : []

  const initialOfferIds: string[] = Array.isArray(
    initialProject?.project_offers,
  )
    ? (initialProject.project_offers as any[]).map(
        (o) => o.offer_id as string,
      )
    : []

const initialTodoDrafts: TodoDraft[] = Array.isArray(baseDetails.todo_drafts)
  ? baseDetails.todo_drafts.map((t: any) => ({
      id: createLocalId(),
      title: t?.title ?? '',
      description: t?.description ?? '',
      // sicherstellen, dass wir wirklich string-IDs im State haben
      assigneeIds: Array.isArray(t?.assignee_ids)
        ? t.assignee_ids
            .filter((v: unknown) => typeof v === 'string')
        : [],
    }))
  : []


  // ---------------------------------------------------
  // State
  // ---------------------------------------------------
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [kind, setKind] = useState<ProjectKind>(initialKind)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [offers, setOffers] = useState<Offer[]>([])

  const [loadingMaster, setLoadingMaster] = useState(true)
  const [loadingOffers, setLoadingOffers] = useState(false)

  // Basisdaten
  const [title, setTitle] = useState(initialProject?.title ?? '')
  const [description, setDescription] = useState(
    initialProject?.description ?? '',
  )

  // Kunde
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerFocused, setCustomerFocused] = useState(false)

  // Mitarbeiter
  const [assigneeIds, setAssigneeIds] =
    useState<string[]>(initialAssigneeIds)
  const [employeeSearch, setEmployeeSearch] = useState('')

  // Angebote
  const [offerIds, setOfferIds] = useState<string[]>(initialOfferIds)
  const [offerSearch, setOfferSearch] = useState('')

  // Todos – beim Edit aus details.todo_drafts vorbefüllen
  const [todoDrafts, setTodoDrafts] =
    useState<TodoDraft[]>(initialTodoDrafts)

  // Handwerk-spezifisch
  const [address, setAddress] = useState(initialProject?.address ?? '')
  const [objectName, setObjectName] = useState(
    initialProject?.object_name ?? '',
  )
  const [floor, setFloor] = useState(initialProject?.floor ?? '')
  const [handwerkMode, setHandwerkMode] = useState<'rooms' | 'simple'>(
    initialHandwerkMode,
  )
  const [handwerkRooms, setHandwerkRooms] =
    useState<HandwerkRoom[]>(initialHandwerkRooms)
  const [handwerkScope, setHandwerkScope] =
    useState(initialHandwerkScope)
  const [handwerkArea, setHandwerkArea] = useState(initialHandwerkArea)
  const [handwerkHours, setHandwerkHours] =
    useState(initialHandwerkHours)

  const [handwerkTrade, setHandwerkTrade] =
    useState(initialHandwerkTrade) // Gewerk
  const [handwerkObjectType, setHandwerkObjectType] =
    useState(initialHandwerkObjectType) // Objektart
  const [handwerkServiceType, setHandwerkServiceType] =
    useState(initialHandwerkServiceType) // Auftragsart
  const [handwerkRecurrence, setHandwerkRecurrence] =
    useState(initialHandwerkRecurrence) // Turnus

  // Allgemein-spezifisch (für alle Arten gemeinsamer Zeitraum & Budget)
  const [goal, setGoal] = useState(initialGoal)
  const [successMetric, setSuccessMetric] =
    useState(initialSuccessMetric)
  const [generalStart, setGeneralStart] =
    useState(initialGeneralStart)
  const [generalDue, setGeneralDue] = useState(initialGeneralDue)
  const [generalBudget, setGeneralBudget] =
    useState(initialGeneralBudget)
  const [generalNotes, setGeneralNotes] =
    useState(initialGeneralNotes)

  // IT-spezifisch
  const [itSystemName, setItSystemName] =
    useState(initialItSystemName)
  const [itEnvironment, setItEnvironment] =
    useState<'prod' | 'staging' | 'test' | 'dev' | ''>(
      initialItEnvironment,
    )
  const [itRepo, setItRepo] = useState(initialItRepo)
  const [itHost, setItHost] = useState(initialItHost)
  const [itGoLive, setItGoLive] = useState(initialItGoLive)
  const [itAccessNotes, setItAccessNotes] =
    useState(initialItAccessNotes)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ---------------------------------------------------
  // Stammdaten laden (Kunden & Mitarbeiter)
  // ---------------------------------------------------
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoadingMaster(true)
        const {
          data: { user },
        } = await supa.auth.getUser()
        if (!user) throw new Error('no user')

        // Prüfen, ob der eingeloggte User Mitarbeiter ist
        const { data: empRec } = await supa
          .from('employees')
          .select('id, user_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        const companyId = empRec?.user_id ?? user.id

        const [{ data: custs }, { data: emps }] = await Promise.all([
          supa
            .from('customers')
            .select('id, first_name, last_name')
            .eq('user_id', companyId)
            .order('first_name', {
              ascending: true,
            }),
          supa
            .from('employees')
            .select('id, first_name, last_name')
            .eq('user_id', companyId)
            .order('first_name', {
              ascending: true,
            }),
        ])

        if (!alive) return
        setCustomers((custs as any) ?? [])
        setEmployees((emps as any) ?? [])
      } catch {
        if (!alive) return
        setCustomers([])
        setEmployees([])
      } finally {
        if (alive) setLoadingMaster(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------
  // Angebote bei Kunden-Wechsel laden
  // ---------------------------------------------------
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!customerId) {
        setOffers([])
        setOfferIds([])
        return
      }
      try {
        setLoadingOffers(true)
        const { data } = await supa
          .from('offers')
          .select('id, offer_number')
          .eq('customer_id', customerId)
          .order('date', { ascending: false })
        if (!alive) return
        setOffers((data as any) ?? [])

        // Bei Edit: vorhandene offerIds behalten
        if (!isEdit) {
          setOfferIds([])
        }
        setOfferSearch('')
      } catch {
        if (!alive) return
        setOffers([])
        if (!isEdit) {
          setOfferIds([])
        }
      } finally {
        if (alive) setLoadingOffers(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  // ---------------------------------------------------
  // Helper
  // ---------------------------------------------------
  const selectedCustomerName = useMemo(() => {
    const c = customers.find((c) => c.id === customerId)
    if (!c) return ''
    return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
  }, [customers, customerId])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers.slice(0, 20)
    return customers
      .filter((c) =>
        `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [customers, customerSearch])

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) =>
      `${e.first_name ?? ''} ${e.last_name ?? ''}`.toLowerCase().includes(q),
    )
  }, [employees, employeeSearch])

  const filteredOffers = useMemo(() => {
    const q = offerSearch.trim().toLowerCase()
    if (!q) return offers
    return offers.filter((o) => o.offer_number?.toLowerCase().includes(q))
  }, [offers, offerSearch])

  const selectedEmployeesForTodos = useMemo(
    () => employees.filter((e) => assigneeIds.includes(e.id)),
    [employees, assigneeIds],
  )

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleOffer = (id: string) => {
    setOfferIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const addRoom = () => {
    setHandwerkRooms((prev) => [
      ...prev,
      {
        id: createLocalId(),
        name: '',
        width: '',
        length: '',
        notes: '',
      },
    ])
  }

  const removeRoom = (id: string) => {
    setHandwerkRooms((prev) => prev.filter((r) => r.id !== id))
  }

  const addTodoDraft = () => {
    setTodoDrafts((prev) => [
      ...prev,
      { id: createLocalId(), title: '', description: '', assigneeIds: [] },
    ])
  }

  const removeTodoDraft = (id: string) => {
    setTodoDrafts((prev) => prev.filter((t) => t.id !== id))
  }

  const updateTodoDraft = (id: string, patch: Partial<TodoDraft>) => {
    setTodoDrafts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    )
  }

  const steps = [
    {
      key: 1 as const,
      label: 'Grundlagen',
      description: 'Projektart, Titel, Kunde, Zeitraum & Budget',
      icon: ClipboardDocumentListIcon,
    },
    {
      key: 2 as const,
      label: 'Zuweisungen',
      description: 'Mitarbeiter & Angebote',
      icon: UsersIcon,
    },
    {
      key: 3 as const,
      label: 'Details',
      description: 'Allgemein / Handwerk / IT',
      icon: Cog6ToothIcon,
    },
  ]

  const canGoNext = () => {
    if (step === 1) {
      return !!title.trim() && !!customerId
    }
    if (step === 2) {
      return true
    }
    return true
  }

  // ---------------------------------------------------
  // Submit
  // ---------------------------------------------------
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitError(null)

    if (!title.trim() || !customerId) {
      setSubmitError('Bitte mindestens Titel und Kunde angeben.')
      setStep(1)
      return
    }

        setSubmitting(true)
    try {
      // Bestehende Details aus der DB als Basis verwenden,
      // damit beim Bearbeiten nichts "weggewischt" wird
      const details: any = {
        ...(baseDetails || {}),
        kind,
      }

      // Bereiche, die der Wizard kontrolliert, leeren wir erst,
      // damit sie exakt dem aktuellen Formular entsprechen
      delete details.general
      delete details.handwerk
      delete details.it
      delete details.todo_drafts

      // Allgemeine / Meta-Infos (für allgemeine Projekte)
      if (kind === 'general') {
        details.general = {
          goal: goal || null,
          success_metric: successMetric || null,
          start_date: generalStart || null,
          due_date: generalDue || null,
          budget: generalBudget || null,
          notes: generalNotes || null,
        }
      }

      // Handwerk: alles inkl. Zeitraum/Budget & rooms_meta
      if (kind === 'handwerk') {
        details.handwerk = {
          mode: handwerkMode,
          trade: handwerkTrade || null,
          object_type: handwerkObjectType || null,
          service_type: handwerkServiceType || null,
          recurrence: handwerkRecurrence || null,
          scope: handwerkScope || null,
          area_m2: handwerkArea || null,
          planned_hours: handwerkHours || null,
          start_date: generalStart || null,
          due_date: generalDue || null,
          budget: generalBudget || null,
          rooms_meta: handwerkRooms.map((r) => ({
            name: r.name,
            width: r.width || null,
            length: r.length || null,
            notes: r.notes || null,
          })),
        }
      }

      // IT-Projekte: Systemdaten + Zeitraum/Budget mit in details.it speicher
      if (kind === 'it') {
        details.it = {
          system_name: itSystemName || null,
          environment: itEnvironment || null,
          repo_url: itRepo || null,
          host_url: itHost || null,
          go_live_date: itGoLive || null,
          access_notes: itAccessNotes || null,
          start_date: generalStart || null,
          due_date: generalDue || null,
          budget: generalBudget || null,
        }
      }

      // Todo-Entwürfe immer 1:1 aus dem State übernehmen
      if (todoDrafts.length > 0) {
        details.todo_drafts = todoDrafts.map((t) => ({
          title: t.title || null,
          description: t.description || null,
          assignee_ids: t.assigneeIds ?? [],
        }))
      }

      const payload: any = {
        customer_id: customerId,
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        object_name: objectName.trim() || null,
        floor: floor.trim() || null,
        assignee_ids: assigneeIds,
        offer_ids: offerIds,
        kind,
        details,
      }

      if (
        kind === 'handwerk' &&
        handwerkMode === 'rooms' &&
        handwerkRooms.length > 0
      ) {
        payload.rooms = handwerkRooms.map((r) => ({
          name: r.name,
          width: r.width ? Number(r.width) : null,
          length: r.length ? Number(r.length) : null,
          notes: r.notes || null,
          tasks: [],
          materials: [],
        }))
      }

      let res: Response
      let body: any

      if (isEdit && initialProject?.id) {
        // UPDATE
        res = await fetch(`/api/projects/${initialProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error ?? res.statusText)
        }

        const id = initialProject.id as string
        router.push(`/dashboard/projekt/${id}`)
      } else {
        // CREATE
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error ?? res.statusText)
        }

        const newId = body?.id as string | undefined
        if (newId) {
          router.push(`/dashboard/projekt/${newId}`)
        } else {
          router.push('/dashboard/projekt')
        }
      }
    } catch (e: any) {
      console.error(e)
      setSubmitError(e?.message ?? 'Speichern fehlgeschlagen.')
      setStep(1)
    } finally {
      setSubmitting(false)
    }
  }


  const headerTitle = isEdit ? 'Projekt bearbeiten' : 'Projekt anlegen'
  const headerBadge = isEdit ? 'Projekt' : 'Neues Projekt'
  const headerSubtitle = isEdit
    ? 'Passe Projektdaten, Zuordnungen und Details an. Bestehende Zeiten, Dokumente & Räume bleiben erhalten.'
    : 'Wähle zuerst Projektart, Kunde, Zeitraum & Budget – danach Mitarbeiter, Angebote und Details.'

  // ---------------------------------------------------
  // Render
  // ---------------------------------------------------
  return (
    <div className="min-h-[100vh] bg-slate-50/60">
      {/* Inhalt */}
      <div className="px-3 pb-8 pt-4 sm:px-4 sm:pt-6 md:px-6">
        <div className="flex w-full flex-col gap-4 sm:gap-5">
          {/* Zurück */}
          <div className="flex items-center justify-start">
            <Link
              href="/dashboard/projekt"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white whitespace-nowrap"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Zur Projektübersicht
            </Link>
          </div>

          {/* Header */}
          <header
            className={`${cardBase} relative overflow-hidden px-4 py-4 sm:px-6 sm:py-5`}
            style={{
              backgroundImage:
                'radial-gradient(900px 360px at 110% -40%, rgba(15,23,42,0.08), transparent)',
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm whitespace-nowrap">
                  {headerBadge}
                  <span className="h-1 w-1 rounded-full bg-white/80" />
                  Wizard
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {headerTitle}
                </h1>
                <p className="max-w-2xl text-xs sm:text-sm text-slate-600">
                  {headerSubtitle}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-[11px] sm:text-xs text-slate-500">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-sm whitespace-nowrap">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PRIMARY }}
                  />
                  <span>
                    Typ{' '}
                    {kind === 'general'
                      ? 'Allgemein'
                      : kind === 'handwerk'
                      ? 'Handwerk'
                      : 'IT'}
                  </span>
                </div>
                {submitError && (
                  <span className="max-w-xs text-right text-[11px] font-medium text-rose-600">
                    {submitError}
                  </span>
                )}
              </div>
            </div>

            {/* Stepper */}
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
                <div className="flex min-w-full flex-col gap-2 sm:min-w-0 sm:flex-row sm:items-center">
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {steps.map((s, idx) => {
                      const active = step === s.key
                      const done = step > s.key
                      return (
                        <div
                          key={s.key}
                          className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0"
                        >
                          <button
                            type="button"
                            onClick={() => setStep(s.key)}
                            className={`flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-xs sm:px-3 ${
                              active
                                ? 'border-slate-900/40 bg-white/95 text-slate-900 shadow-sm'
                                : done
                                ? 'border-emerald-200 bg-white/90 text-slate-800'
                                : 'border-slate-200/80 bg-white/70 text-slate-500'
                            }`}
                          >
                            <div
                              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                                active
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : done
                                  ? 'border-emerald-400 bg-emerald-500 text-white'
                                  : 'border-slate-300 bg-white text-slate-700'
                              }`}
                            >
                              {done ? (
                                <CheckCircleIcon className="h-4 w-4" />
                              ) : (
                                s.key
                              )}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span
                                className={`truncate text-[11px] font-semibold uppercase tracking-wide ${
                                  active ? 'text-slate-900' : 'text-slate-500'
                                }`}
                              >
                                {s.label}
                              </span>
                              <span className="hidden truncate text-[11px] text-slate-500 md:inline">
                                {s.description}
                              </span>
                            </div>
                          </button>
                          {idx < steps.length - 1 && (
                            <div className="hidden flex-1 border-t border-dashed border-slate-200 sm:block" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Inhalt */}
          <main className="grid gap-4 overflow-visible sm:gap-5">
            {step === 1 && (
              <Step1Grundlagen
                kind={kind}
                setKind={setKind}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                customers={customers}
                loadingMaster={loadingMaster}
                customerId={customerId}
                setCustomerId={setCustomerId}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                customerFocused={customerFocused}
                setCustomerFocused={setCustomerFocused}
                filteredCustomers={filteredCustomers}
                generalStart={generalStart}
                setGeneralStart={setGeneralStart}
                generalDue={generalDue}
                setGeneralDue={setGeneralDue}
                generalBudget={generalBudget}
                setGeneralBudget={setGeneralBudget}
              />
            )}

            {step === 2 && (
              <Step2Zuweisungen
                employees={employees}
                filteredEmployees={filteredEmployees}
                employeeSearch={employeeSearch}
                setEmployeeSearch={setEmployeeSearch}
                assigneeIds={assigneeIds}
                toggleAssignee={toggleAssignee}
                offers={filteredOffers}
                rawOffers={offers}
                offerIds={offerIds}
                toggleOffer={toggleOffer}
                offerSearch={offerSearch}
                setOfferSearch={setOfferSearch}
                loadingOffers={loadingOffers}
                todoDrafts={todoDrafts}
                addTodoDraft={addTodoDraft}
                removeTodoDraft={removeTodoDraft}
                updateTodoDraft={updateTodoDraft}
                selectedEmployeesForTodos={selectedEmployeesForTodos}
              />
            )}

            {step === 3 && (
              <Step3Details
                kind={kind}
                address={address}
                setAddress={setAddress}
                objectName={objectName}
                setObjectName={setObjectName}
                floor={floor}
                setFloor={setFloor}
                handwerkMode={handwerkMode}
                setHandwerkMode={setHandwerkMode}
                handwerkRooms={handwerkRooms}
                setHandwerkRooms={setHandwerkRooms}
                addRoom={addRoom}
                removeRoom={removeRoom}
                handwerkScope={handwerkScope}
                setHandwerkScope={setHandwerkScope}
                handwerkArea={handwerkArea}
                setHandwerkArea={setHandwerkArea}
                handwerkHours={handwerkHours}
                setHandwerkHours={setHandwerkHours}
                handwerkTrade={handwerkTrade}
                setHandwerkTrade={setHandwerkTrade}
                handwerkObjectType={handwerkObjectType}
                setHandwerkObjectType={setHandwerkObjectType}
                handwerkServiceType={handwerkServiceType}
                setHandwerkServiceType={setHandwerkServiceType}
                handwerkRecurrence={handwerkRecurrence}
                setHandwerkRecurrence={setHandwerkRecurrence}
                goal={goal}
                setGoal={setGoal}
                successMetric={successMetric}
                setSuccessMetric={setSuccessMetric}
                generalStart={generalStart}
                setGeneralStart={setGeneralStart}
                generalDue={generalDue}
                setGeneralDue={setGeneralDue}
                generalBudget={generalBudget}
                setGeneralBudget={setGeneralBudget}
                generalNotes={generalNotes}
                setGeneralNotes={setGeneralNotes}
                itSystemName={itSystemName}
                setItSystemName={setItSystemName}
                itEnvironment={itEnvironment}
                setItEnvironment={setItEnvironment}
                itRepo={itRepo}
                setItRepo={setItRepo}
                itHost={itHost}
                setItHost={setItHost}
                itGoLive={itGoLive}
                setItGoLive={setItGoLive}
                itAccessNotes={itAccessNotes}
                setItAccessNotes={setItAccessNotes}
              />
            )}
          </main>
        </div>
      </div>

      {/* Footer Navigation – direkt unterhalb des Formulars */}
      <div className="mt-4 mb-6 flex w-full justify-center px-3 sm:px-4 md:px-6">
        <div className="flex w-full max-w-lg flex-wrap items-center justify-between gap-2 rounded-full border border-slate-200/80 bg-white/95 px-4 py-2 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
            }
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            Zurück
          </button>

          <div className="flex flex-1 items-center justify-end gap-2">
            {step < 3 && (
              <button
                type="button"
                onClick={() =>
                  canGoNext() && setStep((s) => ((s + 1) as 1 | 2 | 3))
                }
                disabled={!canGoNext()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                Weiter
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !title || !customerId}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                {submitting
                  ? isEdit
                    ? 'Speichert …'
                    : 'Speichert…'
                  : isEdit
                  ? 'Projekt speichern'
                  : 'Projekt anlegen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------
 * STEP 1 – Grundlagen
 * -----------------------------------------------------*/
type Step1Props = {
  kind: ProjectKind
  setKind: (k: ProjectKind) => void
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  customers: Customer[]
  loadingMaster: boolean
  customerId: string
  setCustomerId: (v: string) => void
  customerSearch: string
  setCustomerSearch: (v: string) => void
  customerFocused: boolean
  setCustomerFocused: (v: boolean) => void
  filteredCustomers: Customer[]

  generalStart: string
  setGeneralStart: (v: string) => void
  generalDue: string
  setGeneralDue: (v: string) => void
  generalBudget: string
  setGeneralBudget: (v: string) => void
}

function Step1Grundlagen(props: Step1Props) {
  const {
    kind,
    setKind,
    title,
    setTitle,
    description,
    setDescription,
    customers,
    loadingMaster,
    customerId,
    setCustomerId,
    customerSearch,
    setCustomerSearch,
    customerFocused,
    setCustomerFocused,
    filteredCustomers,
    generalStart,
    setGeneralStart,
    generalDue,
    setGeneralDue,
    generalBudget,
    setGeneralBudget,
  } = props

  const currentCustomerLabel = useMemo(() => {
    const c = customers.find((x) => x.id === customerId)
    if (!c) return ''
    return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
  }, [customers, customerId])

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateDropdownPosition = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }

  const openDropdown = () => {
    if (loadingMaster) return
    setCustomerFocused(true)
    updateDropdownPosition()
  }

  useEffect(() => {
    if (!customerFocused) return

    const handler = () => {
      updateDropdownPosition()
    }

    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerFocused])

  const dropdown =
    customerFocused && !loadingMaster && dropdownPos ? (
      <div
        className="fixed z-[9999] max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white/95 text-sm shadow-xl"
        style={{
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
        }}
      >
        {filteredCustomers.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-500">
            Kein Kunde gefunden.
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const label = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
            const active = c.id === customerId
            return (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setCustomerId(c.id)
                  setCustomerSearch(label)
                  setCustomerFocused(false)
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left ${
                  active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                }`}
              >
                <span className="truncate">
                  {label || 'Unbenannter Kunde'}
                </span>
              </button>
            )
          })
        )}
      </div>
    ) : null

  return (
    <>
      <section className={`${cardBase} px-4 py-4 sm:px-6 sm:py-5`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Schritt 1: Grundlagen
            </h2>
            <p className="text-xs text-slate-500">
              Projektart wählen, Titel vergeben, Kunde auswählen – plus geplanter
              Zeitraum &amp; Budget.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Projektart */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Projektart
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { key: 'general', label: 'Allgemein', desc: 'Flexible Projekte' },
                {
                  key: 'handwerk',
                  label: 'Handwerk',
                  desc: 'Bau / Ausbau / Service',
                },
                { key: 'it', label: 'IT', desc: 'Software / Infrastruktur' },
              ].map((opt) => {
                const active = kind === (opt.key as ProjectKind)
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setKind(opt.key as ProjectKind)}
                    className={`${pillButtonBase} relative flex flex-col items-start gap-0 border-slate-200 px-3 py-2 text-left whitespace-normal ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'bg-white/90 text-slate-800 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-slate-200 sm:text-slate-400">
                      {opt.desc}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-[11px] text-slate-600">
              <strong className="font-semibold text-slate-800">
                Allgemein:
              </strong>{' '}
              Ziele, Deadlines &amp; Budget.{' '}
              <strong className="font-semibold text-slate-800">Handwerk:</strong>{' '}
              Gewerke, Objekt, Struktur (auch Reinigung/Service).{' '}
              <strong className="font-semibold text-slate-800">IT:</strong>{' '}
              Systeme, Umgebungen &amp; Go-Live.
            </div>
          </div>

          {/* Titel & Beschreibung */}
          <div className="space-y-3 lg:col-span-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Projekttitel *
              </label>
              <input
                className={inputBase}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Treppenhausreinigung Müller, Elektroinstallation EFH, Badsanierung, Glasreinigung Büro …"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Kurzbeschreibung
              </label>
              <textarea
                className={textareaBase}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Worum geht es in diesem Projekt, was ist das Ziel?"
              />
            </div>
          </div>
        </div>

        {/* Zeitraum & Budget – für alle Projektarten */}
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Zeitraum (geplant)
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Start */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Start
              </label>
              <DateInputWithCalendar
                value={generalStart}
                onChange={setGeneralStart}
                wrapperClassName="w-full"
                inputClassName="w-full"
              />
            </div>

            {/* Fertigstellung */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Fertigstellung
              </label>
              <DateInputWithCalendar
                value={generalDue}
                onChange={setGeneralDue}
                wrapperClassName="w-full"
                inputClassName="w-full"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Budget (brutto)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputBase}
                value={generalBudget}
                onChange={(e) => setGeneralBudget(e.target.value)}
                placeholder="z.B. 10.000,00"
              />
            </div>
          </div>
        </div>

        {/* Kunde */}
        <div className="mt-6">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Kunde *
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              value={customerSearch || currentCustomerLabel}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                if (!e.target.value) setCustomerId('')
                openDropdown()
              }}
              onFocus={openDropdown}
              onBlur={() => {
                setTimeout(() => setCustomerFocused(false), 120)
              }}
              placeholder={
                loadingMaster ? 'Kunden werden geladen…' : 'Nach Namen suchen…'
              }
              disabled={loadingMaster}
              className={`${inputBase} pr-3`}
            />
          </div>

          {customerId && (
            <p className="mt-1 text-[11px] text-emerald-600">
              Kunde ausgewählt. Zugehörige Angebote kannst du im nächsten Schritt
              verknüpfen.
            </p>
          )}
        </div>
      </section>

      {/* Dropdown via Portal direkt an <body> */}
      {mounted && dropdown && createPortal(dropdown, document.body)}
    </>
  )
}

/* -------------------------------------------------------
 * STEP 2 – Mitarbeiter, Angebote & Todo-Entwürfe
 * -----------------------------------------------------*/
type Step2Props = {
  employees: Employee[]
  filteredEmployees: Employee[]
  employeeSearch: string
  setEmployeeSearch: (v: string) => void
  assigneeIds: string[]
  toggleAssignee: (id: string) => void
  offers: Offer[]
  rawOffers: Offer[]
  offerIds: string[]
  toggleOffer: (id: string) => void
  offerSearch: string
  setOfferSearch: (v: string) => void
  loadingOffers: boolean
  todoDrafts: TodoDraft[]
  addTodoDraft: () => void
  removeTodoDraft: (id: string) => void
  updateTodoDraft: (id: string, patch: Partial<TodoDraft>) => void
  selectedEmployeesForTodos: Employee[]
}

function Step2Zuweisungen(props: Step2Props) {
  const {
    employees,
    filteredEmployees,
    employeeSearch,
    setEmployeeSearch,
    assigneeIds,
    toggleAssignee,
    offers,
    rawOffers,
    offerIds,
    toggleOffer,
    offerSearch,
    setOfferSearch,
    loadingOffers,
    todoDrafts,
    addTodoDraft,
    removeTodoDraft,
    updateTodoDraft,
    selectedEmployeesForTodos,
  } = props

  const initials = (e: Employee) =>
    `${(e.first_name ?? '').trim()[0] ?? ''}${
      (e.last_name ?? '').trim()[0] ?? ''
    }`.toUpperCase()

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6 sm:py-5`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Schritt 2: Zuweisungen
          </h2>
          <p className="text-xs text-slate-500">
            Mitarbeiter, Angebote und erste Aufgaben-Entwürfe. Später generiert die KI
            daraus automatisch umfangreiche Todos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mitarbeiter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Mitarbeiter zuweisen
              </p>
              <p className="text-[11px] text-slate-500">
                Nur zugewiesene Mitarbeiter sehen das Projekt in ihrer Übersicht.
              </p>
            </div>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-slate-500 shadow-sm whitespace-nowrap">
              {assigneeIds.length} ausgewählt
            </span>
          </div>

          <input
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Mitarbeiter suchen…"
            className={inputBase}
          />

          <div className="flex flex-wrap gap-2">
            {filteredEmployees.length === 0 && (
              <span className="text-xs text-slate-500">
                Keine Mitarbeiter gefunden.
              </span>
            )}
            {filteredEmployees.map((e) => {
              const active = assigneeIds.includes(e.id)
              const label =
                `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() ||
                'Unbenannt'
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleAssignee(e.id)}
                  className={[
                    pillButtonBase,
                    'gap-2 border-slate-200/80 px-3 py-1.5 text-xs max-w-full',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white/95 text-slate-900 hover:bg-white',
                  ].join(' ')}
                >
                  <span className="max-w-[140px] truncate font-medium">
                    {label}
                  </span>
                  <span
                    className={`grid h-6 w-6 flex-shrink-0 place-content-center rounded-full text-[11px] font-semibold ${
                      active
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {initials(e)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Angebote */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Angebote verknüpfen
              </p>
              <p className="text-[11px] text-slate-500">
                Die KI wird später aus den verknüpften Angeboten passende Todos
                erzeugen. Es werden nur BESTÄTIGTE Angebote angezeigt.
              </p>
            </div>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-slate-500 shadow-sm whitespace-nowrap">
              {offerIds.length} ausgewählt
            </span>
          </div>

          <input
            value={offerSearch}
            onChange={(e) => setOfferSearch(e.target.value)}
            placeholder={
              loadingOffers ? 'Angebote werden geladen…' : 'Nach Angebotsnummer suchen…'
            }
            disabled={loadingOffers}
            className={inputBase}
          />

          <div className="flex flex-wrap gap-2">
            {loadingOffers && (
              <span className="text-xs text-slate-500">Lade Angebote …</span>
            )}
            {!loadingOffers && rawOffers.length === 0 && (
              <span className="text-xs text-slate-500">
                Noch keine Angebote (oder Kunde nicht gewählt).
              </span>
            )}
            {!loadingOffers &&
              offers.map((o) => {
                const active = offerIds.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleOffer(o.id)}
                    className={[
                      pillButtonBase,
                      'gap-2 border-slate-200/80 px-3 py-1.5 text-xs',
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white/95 text-slate-900 hover:bg-white',
                    ].join(' ')}
                  >
                    <span className="tabular-nums truncate">
                      {o.offer_number}
                    </span>
                    {active && <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />}
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      {/* Todos – Entwürfe */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-[180px] flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Aufgaben-Entwürfe (optional)
            </p>
            <p className="text-[11px] text-slate-500">
              Hier kannst du manuell Aufgaben anlegen. Später können wir aus den
              Angeboten automatisiert umfangreiche Todos erstellen und den
              gewählten Mitarbeitern zuweisen.
            </p>
          </div>
          <button
            type="button"
            onClick={addTodoDraft}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-white whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4" />
            Todo hinzufügen
          </button>
        </div>

        {todoDrafts.length === 0 ? (
          <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-xs text-slate-500">
            Noch keine Todos angelegt. Du kannst diesen Schritt auch überspringen.
          </div>
        ) : (
          <div className="space-y-3">
            {todoDrafts.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      className={inputBase}
                      value={t.title}
                      onChange={(e) =>
                        updateTodoDraft(t.id, { title: e.target.value })
                      }
                      placeholder="Todo-Titel (z.B. 'Aufmaß vor Ort durchführen', 'Unterverteilung prüfen', 'Treppenhaus wischen')"
                    />
                    <textarea
                      className={textareaBase}
                      rows={2}
                      value={t.description}
                      onChange={(e) =>
                        updateTodoDraft(t.id, { description: e.target.value })
                      }
                      placeholder="Beschreibung, z.B. konkreter Ablauf, benötigte Unterlagen, Besonderheiten …"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTodoDraft(t.id)}
                    className="ml-2 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    title="Todo entfernen"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Mitarbeiter-Zuweisung (optional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployeesForTodos.length === 0 && (
                      <span className="text-xs text-slate-400">
                        Zuerst oben Mitarbeiter dem Projekt zuweisen.
                      </span>
                    )}
                    {selectedEmployeesForTodos.map((e) => {
                      const active = t.assigneeIds.includes(e.id)
                      const label =
                        `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() ||
                        'Unbenannt'
                      const toggle = () => {
                        const next = active
                          ? t.assigneeIds.filter((id) => id !== e.id)
                          : [...t.assigneeIds, e.id]
                        updateTodoDraft(t.id, { assigneeIds: next })
                      }
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={toggle}
                          className={[
                            pillButtonBase,
                            'gap-2 border-slate-200/80 px-3 py-1.5 text-xs max-w-full',
                            active
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white/95 text-slate-900 hover:bg-white',
                          ].join(' ')}
                        >
                          <span className="max-w-[140px] truncate">
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------
 * STEP 3 – Details (Allgemein / Handwerk / IT)
 * -----------------------------------------------------*/
type Step3Props = {
  kind: ProjectKind
  address: string
  setAddress: (v: string) => void
  objectName: string
  setObjectName: (v: string) => void
  floor: string
  setFloor: (v: string) => void
  handwerkMode: 'rooms' | 'simple'
  setHandwerkMode: (v: 'rooms' | 'simple') => void
  handwerkRooms: HandwerkRoom[]
  setHandwerkRooms: Dispatch<SetStateAction<HandwerkRoom[]>>
  addRoom: () => void
  removeRoom: (id: string) => void
  handwerkScope: string
  setHandwerkScope: (v: string) => void
  handwerkArea: string
  setHandwerkArea: (v: string) => void
  handwerkHours: string
  setHandwerkHours: (v: string) => void
  handwerkTrade: string
  setHandwerkTrade: (v: string) => void
  handwerkObjectType: string
  setHandwerkObjectType: (v: string) => void
  handwerkServiceType: string
  setHandwerkServiceType: (v: string) => void
  handwerkRecurrence: string
  setHandwerkRecurrence: (v: string) => void
  goal: string
  setGoal: (v: string) => void
  successMetric: string
  setSuccessMetric: (v: string) => void
  generalStart: string
  setGeneralStart: (v: string) => void
  generalDue: string
  setGeneralDue: (v: string) => void
  generalBudget: string
  setGeneralBudget: (v: string) => void
  generalNotes: string
  setGeneralNotes: (v: string) => void
  itSystemName: string
  setItSystemName: (v: string) => void
  itEnvironment: 'prod' | 'staging' | 'test' | 'dev' | ''
  setItEnvironment: (v: 'prod' | 'staging' | 'test' | 'dev' | '') => void
  itRepo: string
  setItRepo: (v: string) => void
  itHost: string
  setItHost: (v: string) => void
  itGoLive: string
  setItGoLive: (v: string) => void
  itAccessNotes: string
  setItAccessNotes: (v: string) => void
}

function Step3Details(props: Step3Props) {
  const {
    kind,
    address,
    setAddress,
    objectName,
    setObjectName,
    floor,
    setFloor,
    handwerkMode,
    setHandwerkMode,
    handwerkRooms,
    setHandwerkRooms,
    addRoom,
    removeRoom,
    handwerkScope,
    setHandwerkScope,
    handwerkArea,
    setHandwerkArea,
    handwerkHours,
    setHandwerkHours,
    handwerkTrade,
    setHandwerkTrade,
    handwerkObjectType,
    setHandwerkObjectType,
    handwerkServiceType,
    setHandwerkServiceType,
    handwerkRecurrence,
    setHandwerkRecurrence,
    goal,
    setGoal,
    successMetric,
    setSuccessMetric,
    generalStart,
    setGeneralStart,
    generalDue,
    setGeneralDue,
    generalBudget,
    setGeneralBudget,
    generalNotes,
    setGeneralNotes,
    itSystemName,
    setItSystemName,
    itEnvironment,
    setItEnvironment,
    itRepo,
    setItRepo,
    itHost,
    setItHost,
    itGoLive,
    setItGoLive,
    itAccessNotes,
    setItAccessNotes,
  } = props

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6 sm:py-5`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Schritt 3: Details &amp; Struktur
          </h2>
          <p className="text-xs text-slate-500">
            Je nach Projektart erfasst du hier entweder allgemeine Kennzahlen,
            Handwerker-spezifische Angaben oder IT-spezifische Informationen.
          </p>
        </div>
      </div>

      {kind === 'general' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Projektziel
              </label>
              <textarea
                className={textareaBase}
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Was soll am Ende erreicht sein? (z.B. Umsatzsteigerung, Prozessoptimierung, Launch einer neuen Dienstleistung …)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Erfolgsmessung
              </label>
              <input
                className={inputBase}
                value={successMetric}
                onChange={(e) => setSuccessMetric(e.target.value)}
                placeholder="z.B. 'Mind. 20 qualifizierte Leads pro Monat', 'Fehlerquote < 1%' …"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Start (geplant)
                </label>
                <DateInputWithCalendar
                  value={generalStart}
                  onChange={setGeneralStart}
                  wrapperClassName="w-full"
                  inputClassName="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Fertigstellung (geplant)
                </label>
                <DateInputWithCalendar
                  value={generalDue}
                  onChange={setGeneralDue}
                  wrapperClassName="w-full"
                  inputClassName="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Budget (brutto)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputBase}
                value={generalBudget}
                onChange={(e) => setGeneralBudget(e.target.value)}
                placeholder="z.B. 10.000,00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Interne Notizen
              </label>
              <textarea
                className={textareaBase}
                rows={3}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Interne Hinweise, sensible Infos, Abhängigkeiten …"
              />
            </div>
          </div>
        </div>
      )}

      {kind === 'handwerk' && (
        <div className="space-y-5">
          {/* Gewerk & Einsatz */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Gewerk
              </label>
              <select
                className={inputBase}
                value={handwerkTrade}
                onChange={(e) => setHandwerkTrade(e.target.value)}
              >
                <option value="">– Gewerk wählen –</option>
                <option value="fliesen">Fliesen / Boden</option>
                <option value="maler">Maler / Lackierer</option>
                <option value="elektro">Elektro</option>
                <option value="sanitaer">Sanitär / Heizung / Klima</option>
                <option value="gebaeudereinigung">Gebäudereinigung</option>
                <option value="photovoltaik">Photovoltaik</option>
                <option value="gartenbau">
                  Garten- &amp; Landschaftsbau
                </option>
                <option value="trockenbau">Trockenbau</option>
                <option value="allgemein">Allgemeines Handwerk</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Objektart
              </label>
              <select
                className={inputBase}
                value={handwerkObjectType}
                onChange={(e) => setHandwerkObjectType(e.target.value)}
              >
                <option value="">– Objektart wählen –</option>
                <option value="haus">Einfamilienhaus</option>
                <option value="wohnung">Wohnung</option>
                <option value="mehrfamilienhaus">Mehrfamilienhaus</option>
                <option value="gewerbe">Gewerbeobjekt</option>
                <option value="buero">Büro / Praxis</option>
                <option value="aussenanlage">Außenanlage / Grundstück</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Auftragsart
              </label>
              <select
                className={inputBase}
                value={handwerkServiceType}
                onChange={(e) => setHandwerkServiceType(e.target.value)}
              >
                <option value="">– Auftragsart wählen –</option>
                <option value="neubau">Neubau</option>
                <option value="sanierung">Sanierung / Modernisierung</option>
                <option value="wartung">Wartung / Service</option>
                <option value="reparatur">Reparatur</option>
                <option value="montage">Montage</option>
                <option value="reinigung_einmalig">
                  Reinigung (einmalig)
                </option>
                <option value="reinigung_wiederkehrend">
                  Reinigung (wiederkehrend)
                </option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Turnus / Rhythmus
              </label>
              <select
                className={inputBase}
                value={handwerkRecurrence}
                onChange={(e) => setHandwerkRecurrence(e.target.value)}
              >
                <option value="">– auswählen –</option>
                <option value="einmalig">Einmalig</option>
                <option value="woechentlich">Wöchentlich</option>
                <option value="zweiwoechentlich">14-tägig</option>
                <option value="monatlich">Monatlich</option>
                <option value="individuell">Individuell / nach Bedarf</option>
              </select>
            </div>
          </div>

          {/* Objekt / Adresse */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Objekt / Bezeichnung
              </label>
              <input
                className={inputBase}
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                placeholder="z.B. EFH Müller, Bürogebäude Nord, Treppenhaus A …"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Etage / Bereich
              </label>
              <input
                className={inputBase}
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="z.B. EG, 1. OG, gesamtes Treppenhaus …"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Adresse
              </label>
              <input
                className={inputBase}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Straße, Nr., PLZ, Ort …"
              />
            </div>
          </div>

          {/* Modus: Bereiche/Räume oder Allgemein */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Struktur
            </p>
            <div className="inline-flex rounded-full bg-slate-100/80 p-1 shadow-inner">
              {[
                {
                  key: 'rooms',
                  label: 'Bereiche / Räume',
                  desc: 'z.B. Bad, Treppenhaus, Büro 1 …',
                },
                { key: 'simple', label: 'Allgemein', desc: 'Nur Projektbasis' },
              ].map((opt) => {
                const active = handwerkMode === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setHandwerkMode(opt.key as 'rooms' | 'simple')
                    }
                    className={`flex flex-col px-3 py-1.5 text-left text-[11px] ${
                      active
                        ? 'rounded-full bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="font-semibold whitespace-nowrap">
                      {opt.label}
                    </span>
                    <span className="hidden text-[10px] sm:inline truncate">
                      {opt.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {handwerkMode === 'simple' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-3 md:col-span-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Leistungsumfang
                  </label>
                  <textarea
                    className={textareaBase}
                    rows={3}
                    value={handwerkScope}
                    onChange={(e) => setHandwerkScope(e.target.value)}
                    placeholder="z.B. Grundreinigung Treppenhaus inkl. Kehren, Wischen, Geländer; Elektroinstallation Wohnung komplett; Badsanierung inkl. Demontage Altbelag …"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Geplante Stunden / interne Hinweise
                  </label>
                  <textarea
                    className={textareaBase}
                    rows={3}
                    value={handwerkHours}
                    onChange={(e) => setHandwerkHours(e.target.value)}
                    placeholder="z.B. 2 Mitarbeitende à 6 Std., Zugang nur ab 18 Uhr, Koordination mit Elektriker Meier …"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Fläche gesamt (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputBase}
                    value={handwerkArea}
                    onChange={(e) => setHandwerkArea(e.target.value)}
                    placeholder="z.B. 120"
                  />
                </div>
              </div>
            </div>
          )}

          {handwerkMode === 'rooms' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Bereiche / Räume
                </p>
                <button
                  type="button"
                  onClick={addRoom}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-white whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4" />
                  Bereich hinzufügen
                </button>
              </div>

              {handwerkRooms.length === 0 ? (
                <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-xs text-slate-500">
                  Noch keine Bereiche angelegt. Du kannst das Projekt auch ohne
                  Bereiche speichern – dann blenden wir den Abschnitt in der
                  Detailansicht einfach aus.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {handwerkRooms.map((r, idx) => (
                    <div
                      key={r.id}
                      className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                          Bereich {idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeRoom(r.id)}
                          className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          title="Bereich entfernen"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Name + Breite + Länge */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <input
                            className={inputBase}
                            value={r.name}
                            onChange={(e) =>
                              setHandwerkRooms((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, name: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="Bereich / Raum (z.B. Bad, Küche, Treppenhaus, Büro 1 …)"
                          />
                        </div>
                        <div>
                          <input
                            className={inputBase}
                            type="text"
                            value={r.width}
                            onChange={(e) =>
                              setHandwerkRooms((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, width: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="Breite (m)"
                          />
                        </div>
                        <div>
                          <input
                            className={inputBase}
                            type="text"
                            value={r.length}
                            onChange={(e) =>
                              setHandwerkRooms((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, length: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="Länge (m)"
                          />
                        </div>
                      </div>

                      <div>
                        <textarea
                          className={textareaBase}
                          rows={2}
                          value={r.notes}
                          onChange={(e) =>
                            setHandwerkRooms((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, notes: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          placeholder="Besonderheiten / Notizen (z.B. schwer zugänglich, Bodenbelag, Steckdosen, Geländer, Glasflächen …)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {kind === 'it' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                System / Projektname
              </label>
              <input
                className={inputBase}
                value={itSystemName}
                onChange={(e) => setItSystemName(e.target.value)}
                placeholder="z.B. CRM GLENO, Kundenportal, API-Gateway …"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Umgebung
              </label>
              <select
                className={inputBase}
                value={itEnvironment}
                onChange={(e) =>
                  setItEnvironment(
                    e.target.value as 'prod' | 'staging' | 'test' | 'dev' | '',
                  )
                }
              >
                <option value="">– auswählen –</option>
                <option value="prod">Produktiv</option>
                <option value="staging">Staging</option>
                <option value="test">Test</option>
                <option value="dev">Entwicklung</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Repository (Git)
              </label>
              <input
                className={inputBase}
                value={itRepo}
                onChange={(e) => setItRepo(e.target.value)}
                placeholder="z.B. https://github.com/deine-org/projekt"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Hosting / URL
              </label>
              <input
                className={inputBase}
                value={itHost}
                onChange={(e) => setItHost(e.target.value)}
                placeholder="z.B. https://app.deine-domain.de"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Go-Live (geplant)
                </label>
                <DateInputWithCalendar
                  value={itGoLive}
                  onChange={setItGoLive}
                  wrapperClassName="w-full"
                  inputClassName="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Zugänge / Besonderheiten
              </label>
              <textarea
                className={textareaBase}
                rows={3}
                value={itAccessNotes}
                onChange={(e) => setItAccessNotes(e.target.value)}
                placeholder="z.B. VPN-Zugänge, Admin-Accounts, kritische Abhängigkeiten, Wartungsfenster …"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
