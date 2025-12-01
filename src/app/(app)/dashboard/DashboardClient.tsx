// src/app/(app)/dashboard/DashboardClient.tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  UserGroupIcon,
  BriefcaseIcon,
  DocumentChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  MegaphoneIcon,
  ArrowRightIcon,
  XMarkIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  Chart,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

/* Soft Shadow Plugin für Line-Chart (dezent) */
const shadowPlugin = {
  id: 'softShadow',
  beforeDatasetDraw(chart: Chart, args: any) {
    const { ctx } = chart
    if (args?.meta?.type === 'line') {
      ctx.save()
      ctx.shadowColor = 'rgba(15,23,42,0.18)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 6
    }
  },
  afterDatasetDraw(chart: Chart) {
    chart.ctx.restore()
  },
}
ChartJS.register(shadowPlugin as any)

/* --------------------- Slot-Logik für Setup-Call -------------------- */

type SlotDef = {
  label: string // z. B. "09:00"
  from: string
  to: string
}

const SLOT_DEFS: SlotDef[] = [
  { label: '09:00', from: '09:00', to: '09:30' },
  { label: '09:30', from: '09:30', to: '10:00' },
  { label: '10:00', from: '10:00', to: '10:30' },
  { label: '10:30', from: '10:30', to: '11:00' },
  { label: '13:00', from: '13:00', to: '13:30' },
  { label: '13:30', from: '13:30', to: '14:00' },
  { label: '14:00', from: '14:00', to: '14:30' },
  { label: '14:30', from: '14:30', to: '15:00' },
]

/** Normalisiert einen beliebigen ISO-ähnlichen String zu "YYYY-MM-DDTHH:MM:SSZ" */
function normalizeIsoString(iso: string) {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)
  return m ? `${m[1]}Z` : iso
}

/** ISO aus Date, ohne Millisekunden */
function normalizeIsoFromDate(d: Date) {
  return normalizeIsoString(d.toISOString())
}

/** Lokales Datum -> "YYYY-MM-DD" (ohne UTC-Shift) */
function formatDateParamLocal(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Nächste Beratungs-Tage (Di–Do) */
function getNextConsultingDays(count = 4): Date[] {
  const result: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)

  while (result.length < count) {
    const weekday = d.getDay() // 0=So,1=Mo,...,2=Di
    if (weekday === 2 || weekday === 3 || weekday === 4) {
      result.push(new Date(d))
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

function formatWeekday(date: Date) {
  const wd = date.getDay()
  const map: Record<number, string> = {
    1: 'Mo.',
    2: 'Di.',
    3: 'Mi.',
    4: 'Do.',
    5: 'Fr.',
    6: 'Sa.',
    0: 'So.',
  }
  return map[wd] ?? ''
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatHeadingDate(date: Date) {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Lokalen Slot (z. B. 09:00 in Europe/Berlin) in normalisierte ISO wandeln */
function toLocalIsoForSlot(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10))
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return normalizeIsoFromDate(d)
}

/* --------------------------- Typen Dashboard ------------------------- */

type SeriesPoint = { month: string; count: number }
type RevenuePoint = { month: string; amount: number }

/* ---------- Helpers für Vault-KPIs (Verträge & Lizenzen) ------------ */

type DashboardContract = {
  id: string
  end_date: string | null
  auto_renew: boolean | null
  monthly_cost: number | null
  status: string | null
  created_at?: string | null
}

type DashboardLicense = {
  id: string
  valid_until: string | null
  auto_renew: boolean | null
  monthly_cost: number | null
  status: string | null
  created_at?: string | null
}

type ContractStatus = 'active' | 'expired' | 'notice' | 'canceled' | 'unknown'
type LicenseStatusSimple = 'active' | 'expired' | 'pending' | 'unknown'

type ContractSummaryResult = {
  totalMonthly: number
  active: number
  expiring: number
  expired: number
  nextInDays: number | null
  increaseLast7: number
}

type LicenseSummaryResult = {
  totalMonthly: number
  active: number
  expiring: number
  expired: number
  nextInDays: number | null
  increaseLast7: number
}

type VaultMetrics = {
  contractsMonthly: number
  contractsActive: number
  contractsExpiringSoon: number
  contractsExpired: number
  licensesMonthly: number
  licensesActive: number
  licensesExpiringSoon: number
  licensesExpired: number
  contractsNextInDays: number | null
  licensesNextInDays: number | null
  costsIncreaseLast7: number
}

function computeDashboardContractStatus(
  c: DashboardContract,
  todayIso: string,
): ContractStatus {
  const base = (c.status || '').toLowerCase()

  if (base === 'gekündigt' || base === 'gekuendigt' || base === 'canceled') {
    return 'canceled'
  }
  if (base === 'abgelaufen') return 'expired'

  if (!c.end_date) {
    // kein Enddatum -> wenn nicht explizit abgelaufen, dann aktiv
    return 'active'
  }

  const diffDays =
    (new Date(c.end_date).getTime() - new Date(todayIso).getTime()) /
    (1000 * 60 * 60 * 24)

  const auto = !!c.auto_renew

  if (!auto) {
    if (diffDays < 0) return 'expired'
    if (diffDays <= 90) return 'notice'
    return 'active'
  }

  if (diffDays <= 90 && diffDays >= 0) return 'notice'
  if (diffDays < 0) return 'expired'
  return 'active'
}

function computeDashboardLicenseStatus(
  lic: DashboardLicense,
  todayIso: string,
): LicenseStatusSimple {
  const base = (lic.status || '').toLowerCase()

  if (!lic.valid_until) {
    if (base === 'abgelaufen' || base === 'expired') return 'expired'
    if (base === 'pending') return 'pending'
    return 'active'
  }

  const diffDays =
    (new Date(lic.valid_until).getTime() - new Date(todayIso).getTime()) /
    (1000 * 60 * 60 * 24)

  const auto = !!lic.auto_renew

  if (!auto) {
    if (diffDays < 0) return 'expired'
    if (diffDays <= 30) return 'pending'
    return 'active'
  }

  if (diffDays <= 30 && diffDays >= 0) return 'pending'
  if (diffDays < 0) return 'expired'
  return 'active'
}

function summarizeContracts(
  contracts: DashboardContract[],
  todayIso: string,
): ContractSummaryResult {
  let totalMonthly = 0
  let active = 0
  let expiring = 0
  let expired = 0
  let nextInDays: number | null = null
  let increaseLast7 = 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  for (const c of contracts) {
    const status = computeDashboardContractStatus(c, todayIso)

    if (c.monthly_cost != null) {
      totalMonthly += Number(c.monthly_cost)
    }

    if (status === 'active') active++
    else if (status === 'notice') expiring++
    else if (status === 'expired' || status === 'canceled') expired++

    if (c.end_date) {
      const diffDays = Math.round(
        (new Date(c.end_date).getTime() - new Date(todayIso).getTime()) /
          (1000 * 60 * 60 * 24),
      )
      if (diffDays >= 0 && (nextInDays === null || diffDays < nextInDays)) {
        nextInDays = diffDays
      }
    }

    if (
      c.created_at &&
      c.monthly_cost != null &&
      new Date(c.created_at) >= sevenDaysAgo
    ) {
      increaseLast7 += Number(c.monthly_cost)
    }
  }

  return { totalMonthly, active, expiring, expired, nextInDays, increaseLast7 }
}

function summarizeLicenses(
  licenses: DashboardLicense[],
  todayIso: string,
): LicenseSummaryResult {
  let totalMonthly = 0
  let active = 0
  let expiring = 0
  let expired = 0
  let nextInDays: number | null = null
  let increaseLast7 = 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  for (const lic of licenses) {
    const status = computeDashboardLicenseStatus(lic, todayIso)

    if (lic.monthly_cost != null) {
      totalMonthly += Number(lic.monthly_cost)
    }

    if (status === 'active') active++
    else if (status === 'pending') expiring++
    else if (status === 'expired') expired++

    if (lic.valid_until) {
      const diffDays = Math.round(
        (new Date(lic.valid_until).getTime() - new Date(todayIso).getTime()) /
          (1000 * 60 * 60 * 24),
      )
      if (diffDays >= 0 && (nextInDays === null || diffDays < nextInDays)) {
        nextInDays = diffDays
      }
    }

    if (
      lic.created_at &&
      lic.monthly_cost != null &&
      new Date(lic.created_at) >= sevenDaysAgo
    ) {
      increaseLast7 += Number(lic.monthly_cost)
    }
  }

  return { totalMonthly, active, expiring, expired, nextInDays, increaseLast7 }
}

/* ------------------------- SetupCall Modal --------------------------- */

const DEFAULT_NOTE =
  'Fragen zur Einrichtung von GLENO und zur Nutzung der Software als aktiver Partner.'

function SetupCallModal({
  open,
  onClose,
  userEmail,
}: {
  open: boolean
  onClose: () => void
  userEmail: string
}) {
  const [days] = useState<Date[]>(() => getNextConsultingDays(4))
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const selectedDay = days[selectedDayIndex]

  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string | null>(null)
  const [bookedIso, setBookedIso] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(userEmail || '')
  const [phone, setPhone] = useState('')
  const [note] = useState(DEFAULT_NOTE)

  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Falls sich userEmail ändert (theoretisch), Feld nachziehen
  useEffect(() => {
    if (userEmail) setEmail(userEmail)
  }, [userEmail])

  const bookedSet = useMemo(
    () => new Set(bookedIso.map(normalizeIsoString)),
    [bookedIso],
  )

  // Belegte Slots holen, wenn Tag oder Modal offen
  useEffect(() => {
    if (!open) return

    async function loadBooked() {
      try {
        setLoadingSlots(true)
        setBookedIso([])

        const dateParam = formatDateParamLocal(selectedDay) // YYYY-MM-DD
        const res = await fetch(`/api/zoom/book?date=${dateParam}`, {
          method: 'GET',
        })

        if (!res.ok) {
          console.error(
            'Fehler beim Laden der belegten Slots (Dashboard)',
            await res.text(),
          )
          return
        }

        const data = (await res.json()) as { booked?: string[] }
        const normalized = (data.booked ?? []).map((s) => normalizeIsoString(s))
        setBookedIso(normalized)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSlots(false)
      }
    }

    loadBooked()
    setSelectedSlotLabel(null)
  }, [selectedDay, open])

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    if (!email) {
      setErrorMsg('Bitte hinterlegen Sie eine E-Mail-Adresse.')
      return
    }
    if (!selectedSlotLabel) {
      setErrorMsg('Bitte wählen Sie einen freien Zeitslot aus.')
      return
    }

    const slotIso = toLocalIsoForSlot(selectedDay, selectedSlotLabel)

    if (bookedSet.has(slotIso)) {
      setErrorMsg(
        'Dieser Slot wurde soeben gebucht. Bitte wählen Sie einen anderen Zeitpunkt.',
      )
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/zoom/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          note,
          startTime: slotIso,
          durationMinutes: 30,
        }),
      })

      if (res.status === 409) {
        setErrorMsg(
          'Dieser Slot wurde gerade bereits gebucht. Bitte wählen Sie einen anderen Termin.',
        )
        const dateParam = formatDateParamLocal(selectedDay)
        const reload = await fetch(`/api/zoom/book?date=${dateParam}`)
        if (reload.ok) {
          const data = (await reload.json()) as { booked?: string[] }
          const normalized = (data.booked ?? []).map((s) =>
            normalizeIsoString(s),
          )
          setBookedIso(normalized)
        }
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMsg(
          data?.error ??
            'Der Termin konnte nicht gebucht werden. Bitte später erneut versuchen.',
        )
        return
      }

      setSuccessMsg(
        'Vielen Dank! Ihr Einrichtungs-Termin wurde gebucht. Der Link zum Zoom-Gespräch und ein Kalendereintrag wurden Ihnen per E-Mail zugeschickt.',
      )
      setErrorMsg(null)
    } catch (err) {
      console.error(err)
      setErrorMsg('Unbekannter Fehler. Bitte versuchen Sie es später erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-3 py-6 backdrop-blur-sm sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-xl max-h-[min(680px,100vh-3rem)] flex-col overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)] ring-1 ring-white/60 sm:px-6 sm:py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close-Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm hover:text-slate-800"
          aria-label="Schließen"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        <div className="mb-4 space-y-1.5 pr-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Einrichtungsservice
          </p>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Kostenlosen Einrichtungs-Termin mit GLENO buchen
          </h2>
          <p className="text-xs text-slate-600 sm:text-[13px]">
            Wir richten GLENO gemeinsam mit Ihnen ein, beantworten Ihre Fragen
            zur Software und zeigen Ihnen Best Practices für Ihren Betrieb.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datumsauswahl */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Datum auswählen
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day, idx) => {
                const isActive = idx === selectedDayIndex
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex min-w-[86px] flex-col items-center rounded-2xl border px-3 py-2 text-xs transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white/80 text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wide">
                      {formatWeekday(day)}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatDateShort(day)}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="text-[11px] text-slate-400">
              Ausgewählt: {formatHeadingDate(selectedDay)}
            </div>
          </div>

          {/* Slots */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Uhrzeit auswählen
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SLOT_DEFS.map((slot) => {
                const iso = toLocalIsoForSlot(selectedDay, slot.from)
                const isBooked = bookedSet.has(iso)
                const isSelected =
                  !isBooked && selectedSlotLabel === slot.label

                const baseStyles =
                  'flex flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-[11px] sm:text-[13px] transition'

                let styles = baseStyles
                if (isBooked) {
                  styles +=
                    ' cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 line-through opacity-70'
                } else if (isSelected) {
                  styles +=
                    ' cursor-pointer border-slate-900 bg-slate-900 text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)]'
                } else {
                  styles +=
                    ' cursor-pointer border-slate-200 bg-white/80 text-slate-800 hover:border-slate-400'
                }

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={isBooked || loadingSlots}
                    onClick={() =>
                      !isBooked && setSelectedSlotLabel(slot.label)
                    }
                    className={styles}
                  >
                    <span className="font-medium">{slot.from} Uhr</span>
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      bis {slot.to} Uhr
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Bereits gebuchte Zeiten sind durchgestrichen, grau hinterlegt und
              nicht auswählbar.
            </p>
          </div>

          {/* Formularfelder */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Vorname <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Max"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Nachname <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                E-Mail-Adresse <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!userEmail}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="ihr.name@firma.de"
              />
              {userEmail && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Wir nutzen Ihre Login-E-Mail für den Terminversand.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Telefonnummer <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="+49 ..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Kurz: Worum geht es?
            </label>
            <textarea
              value={note}
              readOnly
              disabled
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Diese Notiz senden wir automatisch mit, damit klar ist, dass es
              um Fragen zu Einrichtung &amp; Nutzung als aktiver Partner geht.
            </p>
          </div>

          {(errorMsg || successMsg) && (
            <div className="space-y-1 text-xs">
              {errorMsg && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                  {successMsg}
                </div>
              )}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting || loadingSlots}
              className="flex w-full items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Buchen …' : 'Einrichtungs-Termin jetzt buchen'}
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Wir verwenden Ihre Angaben ausschließlich zur Vorbereitung und
              Durchführung des Zoom-Meetings. Es gelten die bekannten
              Datenschutzhinweise von GLENO.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

/* --------------------------- Dashboard ------------------------------ */

type GrowthMode = 'positive' | 'negative'

function formatPctLabel(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function growthClasses(mode: GrowthMode, value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  }
  const isPositive = value > 0

  if (mode === 'positive') {
    return isPositive
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  }

  // mode === 'negative' -> Zuwachs ist schlecht (Kosten)
  return isPositive
    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
}

export default function DashboardClient({
  userEmail,
  kpis,
  series,
  alerts,
  appointments,
  contacts,
}: {
  userEmail: string
  kpis: {
    employees: number
    customers: number
    customersLast7?: number
    projects: number
    invoices: number
    revenueYTD: number
    revenueLast7?: number
  }
  series: {
    customers: SeriesPoint[]
    projects: SeriesPoint[]
    revenue: RevenuePoint[]
  }
  alerts: {
    lowMaterials: {
      id: string
      name: string
      quantity: number
      critical_quantity: number
    }[]
    dueFleet: {
      id: string
      license_plate: string
      inspection_due_date: string | null
    }[]
    dueTools: { id: string; name: string; next_inspection_due: string | null }[]
  }
  appointments: {
    id: string
    title: string | null
    location: string
    start_time: string
    end_time: string | null
    reason: string | null
  }[]
  contacts: { name: string; phone: string; email: string }
}) {
  const [range, setRange] = useState<3 | 6 | 12>(12)
  const [setupOpen, setSetupOpen] = useState(false)
  const [showVaultMobile, setShowVaultMobile] = useState(false)

  // "Heute" als ISO für Vault-Berechnungen
  const todayIso = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  )

  const [vaultMetrics, setVaultMetrics] = useState<VaultMetrics>({
    contractsMonthly: 0,
    contractsActive: 0,
    contractsExpiringSoon: 0,
    contractsExpired: 0,
    contractsNextInDays: null,
    licensesMonthly: 0,
    licensesActive: 0,
    licensesExpiringSoon: 0,
    licensesExpired: 0,
    licensesNextInDays: null,
    costsIncreaseLast7: 0,
  })
  const [vaultLoading, setVaultLoading] = useState(false)

  // Vault-KPIs aus aktuellen Vertrags- und Lizenzdaten holen
  useEffect(() => {
    let isCancelled = false

    async function loadVaultMetrics() {
      try {
        setVaultLoading(true)
        const [contractsRes, licensesRes] = await Promise.all([
          fetch('/api/vault/contracts'),
          fetch('/api/vault/licenses'),
        ])

        const contracts: DashboardContract[] = contractsRes.ok
          ? await contractsRes.json()
          : []
        const licenses: DashboardLicense[] = licensesRes.ok
          ? await licensesRes.json()
          : []

        const contractSummary = summarizeContracts(contracts, todayIso)
        const licenseSummary = summarizeLicenses(licenses, todayIso)

        if (isCancelled) return

        const costsIncreaseLast7 =
          contractSummary.increaseLast7 + licenseSummary.increaseLast7

        setVaultMetrics({
          contractsMonthly: contractSummary.totalMonthly,
          contractsActive: contractSummary.active,
          contractsExpiringSoon: contractSummary.expiring,
          contractsExpired: contractSummary.expired,
          contractsNextInDays: contractSummary.nextInDays,
          licensesMonthly: licenseSummary.totalMonthly,
          licensesActive: licenseSummary.active,
          licensesExpiringSoon: licenseSummary.expiring,
          licensesExpired: licenseSummary.expired,
          licensesNextInDays: licenseSummary.nextInDays,
          costsIncreaseLast7,
        })
      } catch (err) {
        console.error('Fehler beim Laden der Vault-KPIs', err)
      } finally {
        if (!isCancelled) setVaultLoading(false)
      }
    }

    loadVaultMetrics()
    return () => {
      isCancelled = true
    }
  }, [todayIso])

  /* Datenaufbereitung für Charts */
  const m = useMemo(() => {
    const take = <T,>(arr: T[]) => arr.slice(-range)
    const labels = take(series.customers).map((p) => p.month)
    return {
      labels,
      customers: take(series.customers).map((p) => p.count),
      projects: take(series.projects).map((p) => p.count),
      revenue: take(series.revenue).map((p) => p.amount),
    }
  }, [range, series])

  const euro = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v || 0)

  const formatDaysLabel = (days: number | null) => {
    if (days == null) return '–'
    if (days === 0) return 'heute'
    if (days > 0) return `in ${days} Tagen`
    return `vor ${Math.abs(days)} Tagen`
  }

  // --- Zuwachs letzte 7 Tage (Kunden, Umsatz, Kosten) ---
  const totalCustomers = Math.max(0, Number(kpis.customers ?? 0))
  const customersLast7 = Math.max(0, Number(kpis.customersLast7 ?? 0))

  const customerGrowthPct =
    totalCustomers > 0 && customersLast7 > 0 && customersLast7 <= totalCustomers
      ? (customersLast7 / totalCustomers) * 100
      : 0

  const totalRevenue = Math.max(0, Number(kpis.revenueYTD ?? 0))
  const revenueLast7 = Math.max(0, Number(kpis.revenueLast7 ?? 0))

  const revenueGrowthPct =
    totalRevenue > 0 && revenueLast7 > 0 && revenueLast7 <= totalRevenue
      ? (revenueLast7 / totalRevenue) * 100
      : 0

  const fixedCostsMonthly =
    vaultMetrics.contractsMonthly + vaultMetrics.licensesMonthly

  // Fixkosten vor 7 Tagen = aktuelle Fixkosten - Zuwachs im Zeitraum
  const baseCostsBefore7 =
    fixedCostsMonthly - vaultMetrics.costsIncreaseLast7
  const fixedCostsGrowthPct =
    baseCostsBefore7 > 0 && vaultMetrics.costsIncreaseLast7 > 0
      ? (vaultMetrics.costsIncreaseLast7 / baseCostsBefore7) * 100
      : 0

  const nextDueDays =
    vaultMetrics.contractsNextInDays != null &&
    vaultMetrics.licensesNextInDays != null
      ? Math.min(
          vaultMetrics.contractsNextInDays,
          vaultMetrics.licensesNextInDays,
        )
      : vaultMetrics.contractsNextInDays ?? vaultMetrics.licensesNextInDays

  const nextDueLabel = formatDaysLabel(nextDueDays)

  /* Charts */
  const lineData = {
    labels: m.labels,
    datasets: [
      {
        label: 'Kunden',
        data: m.customers,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#0a1b40',
        pointBackgroundColor: '#0a1b40',
        fill: 'start' as const,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(10,27,64,0.10)'
          const grad = c.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          )
          grad.addColorStop(0, 'rgba(10,27,64,0.18)')
          grad.addColorStop(1, 'rgba(10,27,64,0.02)')
          return grad
        },
        tension: 0.35,
      },
      {
        label: 'Projekte',
        data: m.projects,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#2563eb',
        pointBackgroundColor: '#2563eb',
        fill: 'start' as const,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(37,99,235,0.10)'
          const grad = c.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          )
          grad.addColorStop(0, 'rgba(37,99,235,0.18)')
          grad.addColorStop(1, 'rgba(37,99,235,0.02)')
          return grad
        },
        tension: 0.35,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 6,
          color: '#334155',
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
      softShadow: {},
    },
    scales: {
      x: {
        grid: { color: 'rgba(148,163,184,0.15)' },
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.15)', drawTicks: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          precision: 0 as number | undefined,
        },
      },
    },
  }

  const barData = {
    labels: m.labels,
    datasets: [
      {
        label: 'Umsatz (€)',
        data: m.revenue,
        borderWidth: 1,
        borderColor: 'rgba(10,27,64,0.8)',
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(10,27,64,0.75)'
          const grad = c.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          )
          grad.addColorStop(0, 'rgba(10,27,64,0.9)')
          grad.addColorStop(1, 'rgba(10,27,64,0.35)')
          return grad
        },
        borderRadius: 10,
        hoverBorderWidth: 2,
        hoverBorderColor: '#0a1b40',
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (ctx: any) =>
            ` ${new Intl.NumberFormat('de-DE').format(
              Number(ctx.parsed.y || 0),
            )} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.15)', drawTicks: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (v: any) =>
            `${new Intl.NumberFormat('de-DE').format(Number(v))} €`,
        },
      },
    },
  }

  /* UI-Helfer: KPI-Card mit optionalem Growth-Badge */
  const kpiCard = (
    title: string,
    value: string | number,
    Icon: any,
    growth?: { pct: number; mode: GrowthMode },
  ) => {
    const showGrowth = !!growth
    const growthLabel = growth ? formatPctLabel(growth.pct) : ''
    const growthClass = growth
      ? growthClasses(growth.mode, growth.pct)
      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {value}
            </p>
            {showGrowth && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${growthClass}`}
              >
                {growthLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const vaultKpiCard = (
    title: string,
    value: string | number,
    subtitle: string,
    Icon: any,
    growth?: { pct: number; mode: GrowthMode },
  ) => {
    const showGrowth = !!growth
    const growthLabel = growth ? formatPctLabel(growth.pct) : ''
    const growthClass = growth
      ? growthClasses(growth.mode, growth.pct)
      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {value}
            </p>
            {showGrowth && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${growthClass}`}
              >
                {growthLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">
            {subtitle}
          </p>
        </div>
      </div>
    )
  }

  /* Render */
  return (
    <>
      <section className="space-y-6">
        {/* OBERE WEISSE BOX */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4 lg:px-6 lg:py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Willkommen zurück
              </h1>
              <p className="text-sm text-slate-600">
                Eingeloggt als <span className="font-medium">{userEmail}</span>
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                Behalten Sie Mitarbeiter, Kunden, Projekte und Ihren Umsatz
                jederzeit im Blick.
              </p>
            </div>
          </div>
        </div>

        {/* KPIs – Kernzahlen */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>{kpiCard('Mitarbeiter', kpis.employees, UserGroupIcon)}</div>

          <div>
            {kpiCard('Kunden', kpis.customers, UserGroupIcon, {
              pct: customerGrowthPct,
              mode: 'positive',
            })}
          </div>

          <div>{kpiCard('Projekte', kpis.projects, BriefcaseIcon)}</div>
          <div>{kpiCard('Rechnungen', kpis.invoices, DocumentChartBarIcon)}</div>

          <div className="col-span-2 md:col-span-1">
            {kpiCard('Umsatz YTD', euro(kpis.revenueYTD), BanknotesIcon, {
              pct: revenueGrowthPct,
              mode: 'positive',
            })}
          </div>
        </div>

        {/* KPIs – Verträge & Lizenzen */}
        <div className="space-y-3">
          {/* Toggle nur auf Handy/kleine Screens */}
          <button
            type="button"
            onClick={() => setShowVaultMobile((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm md:hidden"
          >
            <span>Fixkosten, Verträge &amp; Lizenzen</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              {vaultLoading ? 'lädt …' : showVaultMobile ? 'ausblenden' : 'anzeigen'}
              {showVaultMobile ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </span>
          </button>

          <div
            className={
              showVaultMobile
                ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4'
                : 'hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:grid'
            }
          >
            {vaultKpiCard(
              'Fixkosten (Monat)',
              euro(fixedCostsMonthly),
              vaultLoading
                ? 'Verträge & Lizenzen – lädt …'
                : 'Verträge & Lizenzen',
              BanknotesIcon,
              {
                pct: fixedCostsGrowthPct,
                mode: 'negative', // Zuwachs = schlecht -> rot
              },
            )}
            {vaultKpiCard(
              'Aktive Verträge',
              vaultMetrics.contractsActive,
              `${vaultMetrics.contractsExpiringSoon} im Kündigungsfenster (≤ 90 Tage)`,
              DocumentTextIcon,
            )}
            {vaultKpiCard(
              'Aktive Lizenzen',
              vaultMetrics.licensesActive,
              `${vaultMetrics.licensesExpiringSoon} laufen ≤ 30 Tage ab`,
              ShieldCheckIcon,
            )}
            {vaultKpiCard(
              'Nächster Ablauf',
              nextDueLabel,
              'Nächster Vertrag oder Lizenz, der ausläuft',
              BellAlertIcon,
            )}
          </div>
        </div>

        {/* KUNDEN-WERBEN-KUNDEN */}
        <div className="rounded-2xl bg-slate-900 px-4 py-4 text-slate-50 shadow-sm sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-800 p-2 sm:p-2.5">
                <MegaphoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Kunden werben Kunden
                </p>
                <h2 className="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl">
                  Empfehlen Sie GLENO weiter &amp; sichern Sie sich{' '}
                  <span className="text-emerald-300">59 € Gutschrift</span> pro
                  geworbenem Unternehmen.
                </h2>
                <p className="text-xs text-slate-200 sm:text-[13px]">
                  Für jedes Unternehmen, das über Ihren Link startet und
                  mindestens{' '}
                  <span className="font-semibold">3 Monate aktiv Kunde</span>{' '}
                  bleibt, schreiben wir Ihnen{' '}
                  <span className="font-semibold">59 € gut</span>.
                </p>

                {/* CTA – auf Mobile direkt unter dem Text */}
                <div className="mt-2 md:hidden">
                  <Link
                    href="/dashboard/kunden-werben-kunden"
                    className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm"
                  >
                    Jetzt Empfehlungslink ansehen
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Rechte Seite / Steps – nur ab md sichtbar */}
            <div className="hidden text-xs text-slate-100 md:block md:text-sm">
              <p className="font-medium">So funktioniert&apos;s:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Persönlichen Empfehlungslink aus Ihrem Profil kopieren</li>
                <li>Mit befreundeten Unternehmen teilen</li>
                <li>
                  Unternehmen bleibt 3 Monate aktiv – Sie erhalten 59 € Gutschrift
                </li>
              </ul>
              <Link
                href="/dashboard/kunden-werben-kunden"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-200 underline-offset-2 hover:underline"
              >
                Mehr zum Empfehlungsprogramm
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kunden & Projekte */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Kunden- &amp; Projektentwicklung
              </h3>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs">
                {[3, 6, 12].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRange(n as 3 | 6 | 12)}
                    className={`px-2.5 py-1 ${
                      range === n
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {n}M
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              <Line data={lineData} options={lineOptions as any} />
            </div>
          </div>

          {/* Umsatz pro Monat */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Umsatz pro Monat
              </h3>
              <span className="text-xs text-slate-500">
                Netto nach Rabatt – letzte {range} Monate
              </span>
            </div>
            <div className="h-56">
              <Bar data={barData} options={barOptions as any} />
            </div>
          </div>
        </div>

        {/* TERMINE & SUPPORT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Termine heute */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Heutige Termine
              </h3>
              <span className="text-xs text-slate-500">
                {appointments.length === 0
                  ? 'Keine Termine'
                  : `${appointments.length} Termin(e)`}
              </span>
            </div>

            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500">
                Heute ist frei – perfekt für Angebote, Rechnungen oder
                Organisation.
              </p>
            ) : (
              <ul className="space-y-2">
                {appointments.map((a) => {
                  const dateYmd = new Date(a.start_time)
                    .toISOString()
                    .slice(0, 10)
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/kalender?event=${a.id}&date=${dateYmd}`}
                        className="group block rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
                          <span className="font-medium text-slate-800 group-hover:text-slate-900">
                            {a.title || a.reason || 'Termin'}
                          </span>
                          <span className="ml-auto text-xs text-slate-500">
                            {new Date(a.start_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="ml-6 mt-0.5 text-xs text-slate-500">
                          {a.location}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Support + Einrichtungsservice */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ihr persönlicher Kundenberater
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {contacts.name}
                </p>
                <p className="text-xs text-slate-500">
                  Gründer von GLENO &amp; erster Ansprechpartner für
                  Einrichtung, Fragen zur Software und neue Ideen.
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  <li>• Unterstützung bei der Einrichtung</li>
                  <li>• Praxisnahe Tipps aus Kundensicht</li>
                  <li>• Gemeinsame Weiterentwicklung Ihrer Prozesse</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <a
                href={`tel:${contacts.phone}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-white"
              >
                <PhoneIcon className="h-4 w-4" />
                Anrufen
              </a>
              <a
                href={`mailto:${contacts.email}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                <EnvelopeIcon className="h-4 w-4" />
                E-Mail an Support
              </a>
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
              >
                <CalendarDaysIcon className="h-4 w-4" />
                Einrichtungs-Termin buchen
              </button>
              <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] text-slate-500">
                Antwort in der Regel innerhalb von 24 Stunden.
              </span>
            </div>
          </div>
        </div>

        {/* WARNUNGEN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Wichtige Hinweise (nächste 30 Tage)
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Materialbestand */}
            <div>
              <p className="text-xs font-medium text-slate-600">
                Materialbestand niedrig
              </p>
              {alerts.lowMaterials.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Aktuell alles im grünen Bereich.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {alerts.lowMaterials.slice(0, 6).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="ml-2">
                        {m.quantity} / {m.critical_quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* TÜV */}
            <div>
              <p className="text-xs font-medium text-slate-600">
                TÜV (Fuhrpark)
              </p>
              {alerts.dueFleet.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Keine Fälligkeiten innerhalb der nächsten 30 Tage.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {alerts.dueFleet.slice(0, 6).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                    >
                      <span>{f.license_plate}</span>
                      <span className="ml-2">
                        {f.inspection_due_date ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Werkzeugprüfungen */}
            <div>
              <p className="text-xs font-medium text-slate-600">
                Werkzeug-Prüfungen
              </p>
              {alerts.dueTools.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Keine Prüfungen in den nächsten 30 Tagen fällig.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {alerts.dueTools.slice(0, 6).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="ml-2">
                        {t.next_inspection_due ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Einrichtungsservice-Modal */}
      <SetupCallModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        userEmail={userEmail}
      />
    </>
  )
}
