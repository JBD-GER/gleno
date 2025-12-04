// app/(app)/dashboard/projekt/[id]/ProjectKpiModal.tsx
'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition, Switch } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowPathIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

type ProjectKpiSettings = {
  budget: number | null
  target_margin_percent: number | null
  planned_duration_days: number | null
  extra_costs: number | null
  notify_on_zero_margin: boolean
  notify_email: string | null
}

type EmployeeBreakdown = {
  employee_id: string
  name: string
  hours: number
  hourly_rate: number
  cost: number
}

type TimeStats = {
  total_hours: number
  total_labor_cost: number
  by_employee: EmployeeBreakdown[]
}

type FinanceStats = {
  budget: number
  extra_costs: number
  total_labor_cost: number
  total_cost: number
  profit: number
  margin_percent: number | null
  budget_usage_percent: number | null
  effective_hourly_rate_budget_based: number | null
  effective_hourly_rate_cost_based: number | null
}

type ApiResponse = {
  settings: ProjectKpiSettings
  time_stats: TimeStats
  finance: FinanceStats
}

type Props = {
  projectId: string
  open: boolean
  onClose: () => void
}

const safeJson = async (res: Response) => {
  const txt = await res.text()
  try {
    return JSON.parse(txt)
  } catch {
    return { error: txt }
  }
}

function formatCurrency(n: number | null | undefined) {
  const value = typeof n === 'number' && !isNaN(n) ? n : 0
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(n: number | null | undefined, decimals = 1) {
  const value = typeof n === 'number' && !isNaN(n) ? n : 0
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export default function ProjectKpiModal({ projectId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<ProjectKpiSettings | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null)
  const [finance, setFinance] = useState<FinanceStats | null>(null)

  // Form-States
  const [budgetInput, setBudgetInput] = useState('')
  const [marginInput, setMarginInput] = useState('')
  const [durationInput, setDurationInput] = useState('')
  const [extraCostsInput, setExtraCostsInput] = useState('')
  const [notifyToggle, setNotifyToggle] = useState(false)
  const [notifyEmailInput, setNotifyEmailInput] = useState('')

  const hydrateFormFromSettings = (s: ProjectKpiSettings | null) => {
    if (!s) {
      setBudgetInput('')
      setMarginInput('')
      setDurationInput('')
      setExtraCostsInput('')
      setNotifyToggle(false)
      setNotifyEmailInput('')
      return
    }

    setBudgetInput(
      s.budget !== null && !isNaN(s.budget) ? String(s.budget) : '',
    )
    setMarginInput(
      s.target_margin_percent !== null && !isNaN(s.target_margin_percent)
        ? String(s.target_margin_percent)
        : '',
    )
    setDurationInput(
      s.planned_duration_days !== null && !isNaN(s.planned_duration_days)
        ? String(s.planned_duration_days)
        : '',
    )
    setExtraCostsInput(
      s.extra_costs !== null && !isNaN(s.extra_costs)
        ? String(s.extra_costs)
        : '',
    )
    setNotifyToggle(Boolean(s.notify_on_zero_margin))
    setNotifyEmailInput(s.notify_email ?? '')
  }

  const handleLoad = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/kpi`, {
        cache: 'no-store',
      })
      const body: ApiResponse | any = await safeJson(res)

      if (!res.ok) {
        throw new Error(
          body?.error || 'KPI-Daten konnten nicht geladen werden.',
        )
      }

      setSettings(body.settings)
      setTimeStats(body.time_stats)
      setFinance(body.finance)
      hydrateFormFromSettings(body.settings)
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler beim Laden.')
      setSettings(null)
      setTimeStats(null)
      setFinance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    handleLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!projectId) return

    setSaving(true)
    setError(null)

    const parseNum = (val: string): number | null => {
      if (!val || !val.trim()) return null
      const replaced = val.replace(',', '.')
      const n = Number(replaced)
      if (isNaN(n)) return null
      return n
    }

    const payload = {
      budget: parseNum(budgetInput),
      target_margin_percent: parseNum(marginInput),
      planned_duration_days: durationInput ? Number(durationInput) : null,
      extra_costs: parseNum(extraCostsInput),
      notify_on_zero_margin: notifyToggle,
      notify_email: notifyEmailInput || null,
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/kpi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body: ApiResponse | any = await safeJson(res)

      if (!res.ok) {
        throw new Error(
          body?.error || 'Speichern der KPI-Einstellungen fehlgeschlagen.',
        )
      }

      setSettings(body.settings)
      setTimeStats(body.time_stats)
      setFinance(body.finance)
      hydrateFormFromSettings(body.settings)
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  const marginClass =
    finance && finance.margin_percent !== null
      ? finance.margin_percent > 10
        ? 'text-emerald-600'
        : finance.margin_percent > 0
        ? 'text-amber-600'
        : 'text-rose-600'
      : 'text-slate-700'

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          {/* md: zentriert, mobil eher oben – fühlt sich natürlicher an */}
          <div className="flex min-h-full items-start md:items-center justify-center p-3 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-3 scale-[0.97]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-[0.97]"
            >
              <Dialog.Panel className="mx-2 w-full max-w-6xl md:mx-auto overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_24px_90px_rgba(15,23,42,0.45)] backdrop-blur-2xl ring-1 ring-white/70">
                {/* Header */}
                <div className="border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Dialog.Title className="text-base font-semibold text-slate-900 sm:text-lg">
                        Wirtschaftlichkeit &amp; KPIs
                      </Dialog.Title>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Lege Budget, Zielmarge und Dauer fest. GLENO berechnet
                        auf Basis der Zeiteinträge und Stundensätze deiner
                        Mitarbeitenden die wichtigsten Kennzahlen.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="self-end rounded-full p-2 text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Aktionen oben rechts */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div>
                      {timeStats && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 font-medium text-slate-700">
                          Gesamtstunden im Projekt:{' '}
                          <span className="font-mono">
                            {formatNumber(timeStats.total_hours, 2)} h
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoad}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-800 shadow-sm outline-none hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ArrowPathIcon
                          className={`h-3.5 w-3.5 ${
                            loading ? 'animate-spin' : ''
                          }`}
                        />
                        Neu laden
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-5">
                    {error}
                  </div>
                )}

                {/* Content */}
                <div className="max-h-[75vh] overflow-y-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    {/* Form-Spalte */}
                    <div className="lg:col-span-5">
                      <form
                        onSubmit={handleSave}
                        className="space-y-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
                      >
                        <h3 className="text-sm font-semibold text-slate-900">
                          Eingaben
                        </h3>

                        {/* Budget */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Budget (Netto, EUR)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            placeholder="z. B. 25.000"
                            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="text-[11px] text-slate-500">
                            Gesamtbudget, das der Kunde für dieses Projekt zahlt
                            (exkl. USt).
                          </p>
                        </div>

                        {/* Zielmarge */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Ziel-Gewinnmarge (%)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={marginInput}
                            onChange={(e) => setMarginInput(e.target.value)}
                            placeholder="z. B. 20"
                            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="text-[11px] text-slate-500">
                            Wunschmarge auf Basis Budget – hilft, Ziel vs.
                            Ist-Werte zu vergleichen.
                          </p>
                        </div>

                        {/* Dauer */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Geplante Projektdauer (Tage)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={durationInput}
                            onChange={(e) => setDurationInput(e.target.value)}
                            placeholder="z. B. 30"
                            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="text-[11px] text-slate-500">
                            Grobe Zeitspanne des Projekts (für spätere KPIs und
                            Planungsfunktionen).
                          </p>
                        </div>

                        {/* Weitere Kosten */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Weitere Kosten (z. B. Material, Subunternehmer)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={extraCostsInput}
                            onChange={(e) => setExtraCostsInput(e.target.value)}
                            placeholder="z. B. 5.000"
                            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="text-[11px] text-slate-500">
                            Gesamtsumme aller zusätzlichen Kosten, die nicht in
                            den Zeiteinträgen stecken.
                          </p>
                        </div>

                        {/* Benachrichtigung */}
                        <div className="mt-3 space-y-2 rounded-2xl bg-slate-50/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium text-slate-900">
                                Benachrichtigung bei 0% Marge
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Wenn die kalkulierte Gewinnmarge auf 0% fällt,
                                soll eine Mail verschickt werden.
                              </p>
                            </div>
                            {/* Optimierter Toggle */}
                            <Switch
                              checked={notifyToggle}
                              onChange={setNotifyToggle}
                              className={`${
                                notifyToggle
                                  ? 'bg-teal-500'
                                  : 'bg-slate-200/80'
                              } relative inline-flex h-7 w-12 items-center rounded-full border border-white/60 shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-colors duration-200 ease-out`}
                            >
                              <span
                                className={`${
                                  notifyToggle
                                    ? 'translate-x-4 translate-y-[-1px]'
                                    : 'translate-x-1 translate-y-[-1px]'
                                } inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition-transform duration-200 ease-out`}
                              />
                            </Switch>
                          </div>

                          <div className="mt-2">
                            <label className="mb-1 block text-[11px] text-slate-600">
                              Ziel-E-Mail-Adresse
                            </label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-indigo-200">
                              <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                              <input
                                type="email"
                                value={notifyEmailInput}
                                onChange={(e) =>
                                  setNotifyEmailInput(e.target.value)
                                }
                                disabled={!notifyToggle}
                                placeholder="z. B. controlling@firma.de"
                                className="w-full border-none bg-transparent text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving && (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            )}
                            <span>
                              {saving
                                ? 'Speichere …'
                                : 'Einstellungen speichern'}
                            </span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* KPI-Spalte */}
                    <div className="lg:col-span-7">
                      <div className="space-y-4">
                        {/* Top KPIs */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Budget
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance ? formatCurrency(finance.budget) : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Geplantes Netto-Budget für dieses Projekt.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Aktueller Gewinn
                            </p>
                            <p
                              className={`mt-1 text-lg font-semibold ${marginClass}`}
                            >
                              {finance
                                ? formatCurrency(finance.profit)
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Budget minus Lohnkosten und weitere Kosten.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Aktuelle Marge
                            </p>
                            <p
                              className={`mt-1 text-lg font-semibold ${marginClass}`}
                            >
                              {finance && finance.margin_percent !== null
                                ? `${formatNumber(
                                    finance.margin_percent,
                                    1,
                                  )} %`
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Gewinn im Verhältnis zum Budget.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Budgetverbrauch
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance &&
                              finance.budget_usage_percent !== null
                                ? `${formatNumber(
                                    finance.budget_usage_percent,
                                    1,
                                  )} %`
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Anteil der bereits verbrauchten Projektkosten am
                              Budget.
                            </p>
                          </div>
                        </div>

                        {/* Kosten */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Lohnkosten gesamt
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance
                                ? formatCurrency(finance.total_labor_cost)
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Basierend auf den Stundensätzen deiner
                              Mitarbeitenden und den erfassten Zeiten.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Gesamtkosten (Lohn + weitere)
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance
                                ? formatCurrency(finance.total_cost)
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Summe aus Lohnkosten und weiteren manuell
                              hinterlegten Kosten.
                            </p>
                          </div>
                        </div>

                        {/* Effektive Stundensätze */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Effektiver Stundensatz (Budget-basiert)
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance &&
                              finance.effective_hourly_rate_budget_based !==
                                null
                                ? formatCurrency(
                                    finance.effective_hourly_rate_budget_based,
                                  )
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Budget geteilt durch bisher geleistete
                              Projektstunden.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              Effektiver Stundensatz (Kosten-basiert)
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {finance &&
                              finance.effective_hourly_rate_cost_based !== null
                                ? formatCurrency(
                                    finance.effective_hourly_rate_cost_based,
                                  )
                                : '–'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Gesamtkosten geteilt durch bisher geleistete
                              Projektstunden.
                            </p>
                          </div>
                        </div>

                        {/* Breakdown nach Mitarbeiter */}
                        <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm">
                          <p className="mb-2 text-xs font-semibold text-slate-900">
                            Aufwand nach Mitarbeitenden
                          </p>

                          {!timeStats ||
                          !timeStats.by_employee ||
                          timeStats.by_employee.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                              Noch keine Zeiteinträge mit zugeordneten
                              Mitarbeitenden vorhanden.
                            </p>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                              <div className="min-w-[520px]">
                                <div className="grid grid-cols-12 bg-slate-50/70 px-3 py-2 text-[11px] font-medium text-slate-600 backdrop-blur-sm">
                                  <div className="col-span-4">Mitarbeiter</div>
                                  <div className="col-span-3 text-right">
                                    Stunden
                                  </div>
                                  <div className="col-span-2 text-right">
                                    Stundensatz
                                  </div>
                                  <div className="col-span-3 text-right">
                                    Kosten
                                  </div>
                                </div>
                                <div className="divide-y divide-slate-100 bg-white/95">
                                  {timeStats.by_employee.map((emp) => (
                                    <div
                                      key={emp.employee_id}
                                      className="grid grid-cols-12 items-center px-3 py-2 text-[11px] text-slate-800"
                                    >
                                      <div className="col-span-4">
                                        <span className="font-medium text-slate-900">
                                          {emp.name}
                                        </span>
                                      </div>
                                      <div className="col-span-3 text-right font-mono">
                                        {formatNumber(emp.hours, 2)} h
                                      </div>
                                      <div className="col-span-2 text-right font-mono">
                                        {formatCurrency(emp.hourly_rate)}
                                      </div>
                                      <div className="col-span-3 text-right font-mono">
                                        {formatCurrency(emp.cost)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-white/90 px-4 py-3 text-right text-[11px] text-slate-600 sm:px-5">
                  {settings &&
                  settings.target_margin_percent !== null &&
                  finance &&
                  finance.margin_percent !== null ? (
                    <span>
                      Zielmarge:{' '}
                      <span className="font-semibold">
                        {formatNumber(settings.target_margin_percent, 1)} %
                      </span>{' '}
                      · Ist-Marge:{' '}
                      <span className={`font-semibold ${marginClass}`}>
                        {formatNumber(finance.margin_percent, 1)} %
                      </span>
                    </span>
                  ) : (
                    <span>
                      Trage Budget und Zielmarge ein, um einen direkten
                      Vergleich von Soll/Ist zu sehen.
                    </span>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
