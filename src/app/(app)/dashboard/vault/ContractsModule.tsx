// src/app/(app)/dashboard/.../ContractsModule.tsx
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  DocumentTextIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BellAlertIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

const inputBase =
  'w-full rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-indigo-200/60 transition'

type ContractStatus = 'active' | 'expired' | 'notice' | 'canceled' | 'unknown'

type Contract = {
  id: string
  title: string
  contract_type: string | null
  partner_name: string | null
  partner_contact: string | null
  reference: string | null
  customer_id: string | null
  project_id: string | null
  start_date: string | null
  end_date: string | null
  auto_renew: boolean | null
  cancellation_period_months: number | null
  contract_duration_months: number | null
  monthly_cost: number | null
  status: string | null
  notes: string | null
}

type StatusTone = 'emerald' | 'amber' | 'rose' | 'slate'

const todayIso = new Date().toISOString().slice(0, 10)

/**
 * Status dynamisch aus Enddatum + auto_renew + status ableiten:
 * - status "gekündigt" => canceled
 * - ohne auto_renew:
 *    < 0 Tage   => expired
 *    0–90 Tage => notice (Kündigungsfenster / läuft ab)
 *    > 90 Tage => active
 * - mit auto_renew:
 *    0–90 Tage => notice
 *    sonst     => active
 */
function computeStatus(contract: Contract, nowIso: string): ContractStatus {
  const base = (contract.status || '').toLowerCase()

  if (base === 'gekündigt' || base === 'canceled') return 'canceled'

  if (!contract.end_date) return 'active'

  const diffDays =
    (new Date(contract.end_date).getTime() - new Date(nowIso).getTime()) /
    (1000 * 60 * 60 * 24)

  const auto = !!contract.auto_renew

  if (!auto) {
    if (diffDays < 0) return 'expired'
    if (diffDays <= 90) return 'notice'
    return 'active'
  }

  if (diffDays <= 90 && diffDays >= 0) return 'notice'
  return 'active'
}

function statusBadgeClass(status: ContractStatus): string {
  if (status === 'active')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'expired') return 'bg-rose-50 text-rose-700 ring-rose-100'
  if (status === 'notice') return 'bg-amber-50 text-amber-700 ring-amber-100'
  if (status === 'canceled') return 'bg-slate-50 text-slate-600 ring-slate-200'
  return 'bg-slate-50 text-slate-700 ring-slate-100'
}

function statusLabel(status: ContractStatus): string {
  if (status === 'active') return 'AKTIV'
  if (status === 'expired') return 'ABGELAUFEN'
  if (status === 'notice') return 'KÜNDBAR / BALD FÄLLIG'
  if (status === 'canceled') return 'GEKÜNDIGT'
  return 'UNBEKANNT'
}

/* --------------------------- KPIs helper ------------------------- */

function calcKpis(contracts: Contract[]) {
  const computed = contracts.map((c) => ({
    contract: c,
    status: computeStatus(c, todayIso),
  }))

  const totalMonthly = computed.reduce(
    (sum, { contract }) => sum + (contract.monthly_cost ?? 0),
    0,
  )
  const totalYearly = totalMonthly * 12

  const active = computed.filter((c) => c.status === 'active').length
  const expiring = computed.filter((c) => c.status === 'notice').length
  const expired = computed.filter((c) => c.status === 'expired').length

  const durations = computed
    .map(({ contract }) => {
      if (contract.contract_duration_months != null) {
        return contract.contract_duration_months
      }
      if (contract.start_date && contract.end_date) {
        const start = new Date(contract.start_date)
        const end = new Date(contract.end_date)
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth())
        return months > 0 ? months : null
      }
      return null
    })
    .filter((v): v is number => v != null)

  const avgDurationMonths =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

  return {
    totalMonthly,
    totalYearly,
    active,
    expiring,
    expired,
    avgDurationMonths,
  }
}

/* ----------------------------- Modal ----------------------------- */

function VaultModal({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.4)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
        >
          <span className="text-base">×</span>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* --------------------------- BadgeSummary ------------------------ */

function BadgeSummary({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: StatusTone
}) {
  const base =
    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 text-[11px]'
  const styles =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : 'bg-slate-50 text-slate-700 ring-slate-100'

  return (
    <span className={`${base} ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </span>
  )
}

/* --------------------------- Hauptmodul --------------------------- */

export default function ContractsModule() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editContract, setEditContract] = useState<Contract | null>(null)

  const [form, setForm] = useState({
    title: '',
    contract_type: '',
    partner_name: '',
    partner_contact: '',
    reference: '',
    start_date: '',
    end_date: '',
    auto_renew: true,
    cancellation_period_months: '3',
    contract_duration_months: '',
    monthly_cost: '',
    status: 'aktiv',
    notes: '',
  })

  const resetForm = () =>
    setForm({
      title: '',
      contract_type: '',
      partner_name: '',
      partner_contact: '',
      reference: '',
      start_date: '',
      end_date: '',
      auto_renew: true,
      cancellation_period_months: '3',
      contract_duration_months: '',
      monthly_cost: '',
      status: 'aktiv',
      notes: '',
    })

  const fillFormFromContract = (c: Contract) =>
    setForm({
      title: c.title ?? '',
      contract_type: c.contract_type ?? '',
      partner_name: c.partner_name ?? '',
      partner_contact: c.partner_contact ?? '',
      reference: c.reference ?? '',
      start_date: c.start_date ?? '',
      end_date: c.end_date ?? '',
      auto_renew: !!c.auto_renew,
      cancellation_period_months:
        c.cancellation_period_months != null
          ? String(c.cancellation_period_months)
          : '',
      contract_duration_months:
        c.contract_duration_months != null
          ? String(c.contract_duration_months)
          : '',
      monthly_cost:
        c.monthly_cost != null ? c.monthly_cost.toString().replace('.', ',') : '',
      status: c.status ?? 'aktiv',
      notes: c.notes ?? '',
    })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault/contracts')
      if (!res.ok) throw new Error('Fehler beim Laden der Verträge')
      const data = await res.json()
      setContracts(data ?? [])
    } catch (err: any) {
      alert(err?.message ?? 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      title: form.title,
      contract_type: form.contract_type || null,
      partner_name: form.partner_name || null,
      partner_contact: form.partner_contact || null,
      reference: form.reference || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      auto_renew: !!form.auto_renew,
      cancellation_period_months: form.cancellation_period_months
        ? Number(form.cancellation_period_months)
        : null,
      contract_duration_months: form.contract_duration_months
        ? Number(form.contract_duration_months)
        : null,
      monthly_cost: form.monthly_cost
        ? Number(form.monthly_cost.toString().replace(',', '.'))
        : null,
      status: form.status || 'aktiv',
      notes: form.notes || null,
    }

    try {
      const res = await fetch(
        editContract
          ? `/api/vault/contracts/${editContract.id}`
          : '/api/vault/contracts',
        {
          method: editContract ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'Speichern fehlgeschlagen')
      }

      setModalOpen(false)
      setEditContract(null)
      resetForm()
      fetchAll()
    } catch (err: any) {
      alert(err?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Vertrag wirklich löschen?')) return
    try {
      const res = await fetch(`/api/vault/contracts/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'Löschen fehlgeschlagen')
      }
      fetchAll()
    } catch (err: any) {
      alert(err?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  const { totalMonthly, totalYearly, active, expiring, expired } =
    calcKpis(contracts)

  const expiredContracts = contracts.filter(
    (c) => computeStatus(c, todayIso) === 'expired',
  )
  const expiringContracts = contracts.filter(
    (c) => computeStatus(c, todayIso) === 'notice',
  )

  return (
    <div className="space-y-4">
      {/* Top-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DocumentTextIcon className="h-4 w-4 text-slate-700" />
          <span>Verträge (Mietverträge, Wartungsverträge, Serviceverträge …)</span>
          {loading && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <ArrowPathIcon className="h-3 w-3 animate-spin" />
              lädt …
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Aktualisieren
          </button>
          <button
            type="button"
            onClick={() => {
              setEditContract(null)
              resetForm()
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-950"
          >
            <PlusIcon className="h-4 w-4" />
            Vertrag hinzufügen
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase text-slate-500">
              Monatliche Vertragssumme
            </span>
            <BanknotesIcon className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {totalMonthly.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
          <p className="text-[11px] text-slate-400">
            {totalYearly.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}{' '}
            / Jahr
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase text-slate-500">
              Aktive Verträge
            </span>
            <UserIcon className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{active}</p>
          <p className="text-[11px] text-slate-400">laufend</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase text-amber-700">
              Kündigungsfenster
            </span>
            <CalendarDaysIcon className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-sm font-semibold text-amber-700">
            {expiring}
          </p>
          <p className="text-[11px] text-amber-700/80">
            in &lt;= 90 Tagen fällig
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase text-rose-700">
              Abgelaufen
            </span>
            <BellAlertIcon className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1 text-sm font-semibold text-rose-700">{expired}</p>
          <p className="text-[11px] text-rose-700/80">
            prüfen / nachverhandeln
          </p>
        </div>
      </div>

      {/* Notifications-Bereich für abgelaufene / bald fällige Verträge */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <BellAlertIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Vertrags-Benachrichtigungen
              </h4>
              <p className="text-xs text-slate-500">
                Abgelaufene und bald kündbare Verträge im Blick behalten. Klick
                auf eine Kachel, um den Vertrag zu bearbeiten.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <BadgeSummary
              label="Kündigungsfenster ≤ 90 Tage"
              count={expiringContracts.length}
              tone="amber"
            />
            <BadgeSummary
              label="Abgelaufen"
              count={expiredContracts.length}
              tone="rose"
            />
            <BadgeSummary
              label="Gesamt"
              count={contracts.length}
              tone="slate"
            />
          </div>
        </div>

        {(expiredContracts.length > 0 || expiringContracts.length > 0) && (
          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-600 md:grid-cols-2">
            {expiringContracts.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setEditContract(c)
                  fillFormFromContract(c)
                  setModalOpen(true)
                }}
                className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-left ring-1 ring-amber-100 transition hover:bg-amber-50/80"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-amber-700">
                    {c.title || c.contract_type || 'Unbenannter Vertrag'}
                  </span>
                  <span className="text-[10px] text-amber-600">
                    Läuft am {c.end_date || '—'} (Kündigung prüfen)
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    KÜNDBAR / BALD FÄLLIG
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Vertrag öffnen
                  </span>
                </div>
              </button>
            ))}

            {expiredContracts.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setEditContract(c)
                  fillFormFromContract(c)
                  setModalOpen(true)
                }}
                className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-left ring-1 ring-rose-100 transition hover:bg-rose-50/80"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-rose-700">
                    {c.title || c.contract_type || 'Unbenannter Vertrag'}
                  </span>
                  <span className="text-[10px] text-rose-600">
                    Abgelaufen am {c.end_date || '—'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    ABGELAUFEN
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Vertrag öffnen
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
          <DocumentTextIcon className="h-6 w-6 text-slate-400" />
          <p>
            Noch keine Verträge erfasst. Lege z.&nbsp;B. Miet-, Wartungs- oder
            Serviceverträge an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {contracts.map((c) => {
            const s = computeStatus(c, todayIso)
            const statusText = statusLabel(s)

            return (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-50 shadow-sm">
                        <DocumentTextIcon className="h-3.5 w-3.5" />
                        <span>{c.contract_type || 'VERTRAG'}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {c.title || 'Ohne Bezeichnung'}
                      </h3>
                      {c.partner_name && (
                        <p className="text-[11px] text-slate-500">
                          Vertragspartner: {c.partner_name}
                        </p>
                      )}
                      {c.reference && (
                        <p className="text-[11px] text-slate-400">
                          Referenz: {c.reference}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1',
                          statusBadgeClass(s),
                        ].join(' ')}
                      >
                        {statusText}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditContract(c)
                            fillFormFromContract(c)
                            setModalOpen(true)
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Monatliche Kosten (netto)
                      </span>
                      <span>
                        {c.monthly_cost != null
                          ? c.monthly_cost.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Start
                      </span>
                      <span>{c.start_date ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Ende
                      </span>
                      <span>{c.end_date ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Laufzeit (Monate)
                      </span>
                      <span>{c.contract_duration_months ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Kündigungsfrist (Monate)
                      </span>
                      <span>{c.cancellation_period_months ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Automatische Verlängerung
                      </span>
                      <span>{c.auto_renew ? 'Ja' : 'Nein'}</span>
                    </div>
                  </div>

                  {c.notes && (
                    <p className="mt-2 line-clamp-3 text-[11px] text-slate-500">
                      {c.notes}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}



      {/* Modal */}
      {modalOpen && (
        <VaultModal
          onClose={() => {
            setModalOpen(false)
            setEditContract(null)
            resetForm()
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                (e.target as HTMLElement).tagName !== 'TEXTAREA'
              ) {
                e.preventDefault()
              }
            }}
          >
            <h2 className="text-base font-semibold text-slate-900">
              {editContract ? 'Vertrag bearbeiten' : 'Neuen Vertrag hinzufügen'}
            </h2>
            <p className="text-xs text-slate-500">
              Verwalte Verträge inkl. Laufzeiten, Kündigungsfristen,
              automatischer Verlängerung und Kosten.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Bezeichnung / Titel
                </label>
                <input
                  className={inputBase}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Vertragsart
                </label>
                <input
                  className={inputBase}
                  value={form.contract_type}
                  onChange={(e) =>
                    setForm({ ...form, contract_type: e.target.value })
                  }
                  placeholder="z.B. Mietvertrag, Wartungsvertrag"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Vertragspartner
                </label>
                <input
                  className={inputBase}
                  value={form.partner_name}
                  onChange={(e) =>
                    setForm({ ...form, partner_name: e.target.value })
                  }
                  placeholder="Firma / Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Kontakt (E-Mail / Telefon)
                </label>
                <input
                  className={inputBase}
                  value={form.partner_contact}
                  onChange={(e) =>
                    setForm({ ...form, partner_contact: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Referenz / Vertragsnummer
                </label>
                <input
                  className={inputBase}
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Monatliche Kosten (netto)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputBase}
                  value={form.monthly_cost}
                  onChange={(e) =>
                    setForm({ ...form, monthly_cost: e.target.value })
                  }
                  placeholder="z.B. 99.00"
                />
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Falls jährliche Zahlung: auf 12 Monate herunterbrechen.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Startdatum
                </label>
                <DateInputWithCalendar
                  value={form.start_date}
                  onChange={(value) =>
                    setForm({ ...form, start_date: value || '' })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Enddatum
                </label>
                <DateInputWithCalendar
                  value={form.end_date}
                  onChange={(value) =>
                    setForm({ ...form, end_date: value || '' })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Vertragslaufzeit (Monate)
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputBase}
                  value={form.contract_duration_months}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contract_duration_months: e.target.value,
                    })
                  }
                  placeholder="z.B. 12"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Kündigungsfrist (Monate)
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  value={form.cancellation_period_months}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cancellation_period_months: e.target.value,
                    })
                  }
                  placeholder="z.B. 3"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Automatische Verlängerung
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, auto_renew: !form.auto_renew })
                  }
                  className={[
                    'flex items-center justify-between rounded-full border px-3 py-1.5 text-xs shadow-sm',
                    form.auto_renew
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600',
                  ].join(' ')}
                >
                  <span>
                    {form.auto_renew
                      ? 'Automatische Verlängerung aktiv'
                      : 'Automatische Verlängerung aus'}
                  </span>
                  <span className="ml-3 inline-flex h-4 w-7 items-center rounded-full bg-white/80 p-[2px]">
                    <span
                      className={[
                        'h-3 w-3 rounded-full bg-slate-900 transition-transform',
                        form.auto_renew ? 'translate-x-3' : '',
                      ].join(' ')}
                    />
                  </span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  className={inputBase}
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="aktiv">Aktiv</option>
                  <option value="gekündigt">Gekündigt</option>
                  <option value="pausiert">Pausiert</option>
                  <option value="entwurf">Entwurf</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Notizen
                </label>
                <textarea
                  rows={3}
                  className={inputBase}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-950"
              >
                Speichern
              </button>
            </div>
          </form>
        </VaultModal>
      )}
    </div>
  )
}
