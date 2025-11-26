'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  BellAlertIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

const inputBase =
  'w-full rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-indigo-200/60 transition'

type LicenseStatus = 'active' | 'expired' | 'pending' | 'unknown'

type License = {
  id: string
  name: string
  product: string
  vendor: string | null
  license_key: string
  seats: number | null
  valid_from: string | null
  valid_until: string | null
  status: LicenseStatus | null
  notes: string | null
  auto_renew: boolean | null
  contract_duration_months: number | null
  monthly_cost: number | null
}

type StatusTone = 'rose' | 'amber' | 'slate'

const masked = '••••••••••'

/**
 * Status dynamisch aus Datum + auto_renew ableiten:
 * - ohne auto_renew:
 *    < 0 Tage   => expired
 *    0–30 Tage => pending
 *    > 30 Tage => active
 * - mit auto_renew:
 *    0–30 Tage => pending (läuft aus / wird verlängert)
 *    sonst     => active (auch wenn das Datum in der Vergangenheit liegt)
 */
function computeStatus(lic: License, todayIso: string): LicenseStatus {
  const base = ((lic.status as LicenseStatus) || 'unknown') as LicenseStatus

  if (!lic.valid_until) return base

  const diffDays =
    (new Date(lic.valid_until).getTime() - new Date(todayIso).getTime()) /
    (1000 * 60 * 60 * 24)

  const auto = !!lic.auto_renew

  if (!auto) {
    if (diffDays < 0) return 'expired'
    if (diffDays <= 30) return 'pending'
    return 'active'
  }

  // automatische Verlängerung
  if (diffDays <= 30 && diffDays >= 0) return 'pending'
  return 'active'
}

const statusBadgeClass = (statusRaw: string | null) => {
  const status = (statusRaw || '').toLowerCase()
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'expired') return 'bg-rose-50 text-rose-700 ring-rose-100'
  if (status === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-slate-50 text-slate-700 ring-slate-100'
}

const statusLabel = (statusRaw: string | null) => {
  const s = (statusRaw || '').toLowerCase()
  if (s === 'active') return 'AKTIV'
  if (s === 'expired') return 'ABGELAUFEN'
  if (s === 'pending') return 'AUSLAUFEND'
  return 'UNBEKANNT'
}

export default function LicensesModule() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editLicense, setEditLicense] = useState<License | null>(null)

  const [form, setForm] = useState({
    name: '',
    product: '',
    vendor: '',
    license_key: '',
    seats: '',
    valid_from: '',
    valid_until: '',
    status: 'active' as LicenseStatus,
    notes: '',
    auto_renew: true,
    contract_duration_months: '',
    monthly_cost: '',
  })

  const [visible, setVisible] = useState<Record<string, boolean>>({})

  const toggleVisible = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault/licenses')
      if (!res.ok) throw new Error('Fehler beim Laden der Lizenzen')
      const data = await res.json()
      setLicenses(data ?? [])
    } catch (err: any) {
      alert(err?.message ?? 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Notifications:
  // -> jetzt ALLE Lizenzen, die laut computeStatus abgelaufen bzw. pending sind
  const expired = licenses.filter(
    (l) => computeStatus(l, todayIso) === 'expired',
  )

  const expiringSoon = licenses.filter(
    (l) => computeStatus(l, todayIso) === 'pending',
  )

  // KPIs oben
  const totalMonthlyCost = licenses.reduce((sum, l) => {
    if (l.monthly_cost != null) return sum + l.monthly_cost
    return sum
  }, 0)

  const autoRenewCount = licenses.filter((l) => !!l.auto_renew).length
  const activeCount = licenses.filter(
    (l) => computeStatus(l, todayIso) === 'active',
  ).length

  /** Standard-Reset für "Neue Lizenz" */
  const resetForm = () =>
    setForm({
      name: '',
      product: '',
      vendor: '',
      license_key: '',
      seats: '',
      valid_from: '',
      valid_until: '',
      status: 'active',
      notes: '',
      auto_renew: true,
      contract_duration_months: '',
      monthly_cost: '',
    })

  /** Formular mit vorhandener Lizenz füllen (Bearbeiten) */
  const fillFormFromLicense = (lic: License) =>
    setForm({
      name: lic.name ?? '',
      product: lic.product ?? '',
      vendor: lic.vendor ?? '',
      license_key: lic.license_key ?? '',
      seats: lic.seats != null ? lic.seats.toString() : '',
      valid_from: lic.valid_from ?? '',
      valid_until: lic.valid_until ?? '',
      status: computeStatus(lic, todayIso),
      notes: lic.notes ?? '',
      auto_renew: !!lic.auto_renew,
      contract_duration_months:
        lic.contract_duration_months != null
          ? lic.contract_duration_months.toString()
          : '',
      monthly_cost:
        lic.monthly_cost != null ? lic.monthly_cost.toString() : '',
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name: form.name,
      product: form.product,
      vendor: form.vendor,
      license_key: form.license_key,
      seats: form.seats ? Number(form.seats) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      status: form.status,
      notes: form.notes,
      auto_renew: !!form.auto_renew,
      contract_duration_months: form.contract_duration_months
        ? Number(form.contract_duration_months)
        : null,
      monthly_cost: form.monthly_cost
        ? Number(form.monthly_cost.toString().replace(',', '.'))
        : null,
    }

    try {
      const res = await fetch(
        editLicense
          ? `/api/vault/licenses/${editLicense.id}`
          : '/api/vault/licenses',
        {
          method: editLicense ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'Speichern fehlgeschlagen')
      }

      setModalOpen(false)
      setEditLicense(null)
      resetForm()
      fetchAll()
    } catch (err: any) {
      alert(err?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Lizenz wirklich löschen?')) return
    try {
      const res = await fetch(`/api/vault/licenses/${id}`, {
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

  return (
    <div className="space-y-4">
      {/* Top-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ClipboardDocumentCheckIcon className="h-4 w-4 text-slate-700" />
          <span>Software-Lizenzen inkl. Laufzeiten &amp; Status.</span>
          {loading && <span>· lädt …</span>}
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
          {/* NEUE LIZENZ */}
          <button
            type="button"
            onClick={() => {
              setEditLicense(null)
              resetForm()
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-950"
          >
            <PlusIcon className="h-4 w-4" />
            Lizenz hinzufügen
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Gesamt-Monatskosten (netto)
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {totalMonthlyCost.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Summe aller hinterlegten monatlichen Lizenzkosten.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Automatische Verlängerung
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {autoRenewCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Lizenzen mit aktiver automatischer Verlängerung.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Aktive Lizenzen
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {activeCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Auf Basis von Gültigkeitsdatum &amp; Verlängerung.
          </p>
        </div>
      </div>

{/* Notifications mit Karten (mobil) + Tabelle (ab md) */}
<div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4 sm:py-4">
  {/* Header */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <BellAlertIcon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-900">
          Lizenz-Benachrichtigungen
        </h4>
        <p className="max-w-xl text-xs text-slate-500">
          Abgelaufene und bald ablaufende Lizenzen im Blick behalten.
          Tippe / klicke auf eine Zeile, um die Lizenz zu bearbeiten.
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 text-[11px]">
      <BadgeSummary label="Abgelaufen" count={expired.length} tone="rose" />
      <BadgeSummary
        label="Läuft in 30 Tagen ab"
        count={expiringSoon.length}
        tone="amber"
      />
      <BadgeSummary label="Gesamt" count={licenses.length} tone="slate" />
    </div>
  </div>

  {(expired.length > 0 || expiringSoon.length > 0) && (
    <div className="mt-3 space-y-4 text-[11px] text-slate-600">
      {/* --- Abgelaufene Lizenzen --- */}
      {expired.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-rose-700">
            Abgelaufene Lizenzen
          </p>

          {/* Mobile / kleine Screens: Karten-Liste */}
          <div className="space-y-2 md:hidden">
            {expired.slice(0, 10).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setEditLicense(l)
                  fillFormFromLicense(l)
                  setModalOpen(true)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white/95 px-3 py-2 text-left shadow-sm hover:bg-rose-50/70"
              >
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-slate-900">
                    {l.name || l.product || 'Unbenannte Lizenz'}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-500">
                    Abgelaufen am {l.valid_until || '—'}
                    {l.monthly_cost != null && (
                      <>
                        {' · '}
                        {l.monthly_cost.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </>
                    )}
                  </span>
                </div>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  ABGELAUFEN
                </span>
              </button>
            ))}
          </div>

          {/* Tablet / Desktop: Tabelle */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl bg-white/90 ring-1 ring-rose-100">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-rose-50/80 text-[10px] uppercase tracking-wide text-rose-700">
                  <tr>
                    <th className="px-3 py-2">Lizenz</th>
                    <th className="px-3 py-2 whitespace-nowrap">Gültig bis</th>
                    <th className="px-3 py-2 whitespace-nowrap">Monatskosten</th>
                    <th className="px-3 py-2 whitespace-nowrap">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {expired.slice(0, 10).map((l) => (
                    <tr
                      key={l.id}
                      className="cursor-pointer hover:bg-rose-50/60"
                      onClick={() => {
                        setEditLicense(l)
                        fillFormFromLicense(l)
                        setModalOpen(true)
                      }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-900">
                          {l.name || l.product || 'Unbenannte Lizenz'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.valid_until || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.monthly_cost != null
                          ? l.monthly_cost.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-rose-600">
                        Öffnen &amp; bearbeiten
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- Läuft in 30 Tagen ab --- */}
      {expiringSoon.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-amber-700">
            Läuft innerhalb der nächsten 30 Tage ab
          </p>

          {/* Mobile: Karten */}
          <div className="space-y-2 md:hidden">
            {expiringSoon.slice(0, 10).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setEditLicense(l)
                  fillFormFromLicense(l)
                  setModalOpen(true)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white/95 px-3 py-2 text-left shadow-sm hover:bg-amber-50/70"
              >
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-slate-900">
                    {l.name || l.product || 'Unbenannte Lizenz'}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-500">
                    Läuft ab am {l.valid_until || '—'}
                    {l.monthly_cost != null && (
                      <>
                        {' · '}
                        {l.monthly_cost.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </>
                    )}
                  </span>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  BALD ABLAUFEND
                </span>
              </button>
            ))}
          </div>

          {/* Tablet / Desktop: Tabelle */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl bg-white/90 ring-1 ring-amber-100">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-amber-50/80 text-[10px] uppercase tracking-wide text-amber-700">
                  <tr>
                    <th className="px-3 py-2">Lizenz</th>
                    <th className="px-3 py-2 whitespace-nowrap">Gültig bis</th>
                    <th className="px-3 py-2 whitespace-nowrap">Monatskosten</th>
                    <th className="px-3 py-2 whitespace-nowrap">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {expiringSoon.slice(0, 10).map((l) => (
                    <tr
                      key={l.id}
                      className="cursor-pointer hover:bg-amber-50/60"
                      onClick={() => {
                        setEditLicense(l)
                        fillFormFromLicense(l)
                        setModalOpen(true)
                      }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-900">
                          {l.name || l.product || 'Unbenannte Lizenz'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.valid_until || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.monthly_cost != null
                          ? l.monthly_cost.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-amber-700">
                        Öffnen &amp; bearbeiten
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>



      {/* Liste */}
      {licenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
          <ClipboardDocumentCheckIcon className="h-6 w-6 text-slate-400" />
          <p>
            Noch keine Lizenzen erfasst. Lege z.&nbsp;B. deine Tools für
            Buchhaltung, E-Mail, CRM oder Design an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {licenses.map((lic) => {
            const computedStatus = computeStatus(lic, todayIso)
            const statusText = statusLabel(computedStatus)

            return (
              <article
                key={lic.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-50 shadow-sm">
                        <ShieldCheckIcon className="h-3.5 w-3.5" />
                        <span>{lic.product || 'LIZENZ'}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {lic.name || 'Ohne Bezeichnung'}
                      </h3>
                      {lic.vendor && (
                        <p className="text-[11px] text-slate-500">
                          Anbieter: {lic.vendor}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1',
                          statusBadgeClass(computedStatus),
                        ].join(' ')}
                      >
                        {statusText}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggleVisible(lic.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          {visible[lic.id] ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        {/* BEARBEITEN */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditLicense(lic)
                            fillFormFromLicense(lic)
                            setModalOpen(true)
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(lic.id)}
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
                        Lizenzschlüssel
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-[11px] text-slate-800">
                          {lic.license_key
                            ? visible[lic.id]
                              ? lic.license_key
                              : masked
                            : '—'}
                        </span>
                        {lic.license_key && (
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard.writeText(lic.license_key)
                            }
                            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Plätze / Seats
                      </span>
                      <span>{lic.seats ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Monatliche Kosten (netto)
                      </span>
                      <span>
                        {lic.monthly_cost != null
                          ? lic.monthly_cost.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Gültig von
                      </span>
                      <span>{lic.valid_from ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Gültig bis
                      </span>
                      <span>{lic.valid_until ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Vertragslaufzeit (Monate)
                      </span>
                      <span>{lic.contract_duration_months ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase text-slate-500">
                        Automatische Verlängerung
                      </span>
                      <span>{lic.auto_renew ? 'Ja' : 'Nein'}</span>
                    </div>
                  </div>

                  {lic.notes && (
                    <p className="mt-2 line-clamp-3 text-[11px] text-slate-500">
                      {lic.notes}
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
            setEditLicense(null)
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
              {editLicense ? 'Lizenz bearbeiten' : 'Neue Lizenz hinzufügen'}
            </h2>
            <p className="text-xs text-slate-500">
              Verwalte Lizenzen für deine Tools – inklusive Laufzeiten,
              Laufzeitverlängerung, Kosten und Status.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Name / Bezeichnung
                </label>
                <input
                  className={inputBase}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Produkt
                </label>
                <input
                  className={inputBase}
                  value={form.product}
                  onChange={(e) =>
                    setForm({ ...form, product: e.target.value })
                  }
                  placeholder="z.B. Microsoft 365, Adobe, Lexoffice"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Anbieter
                </label>
                <input
                  className={inputBase}
                  value={form.vendor}
                  onChange={(e) =>
                    setForm({ ...form, vendor: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Seats / Nutzeranzahl
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  value={form.seats}
                  onChange={(e) =>
                    setForm({ ...form, seats: e.target.value })
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
                  placeholder="z.B. 14.90"
                />
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Wenn es ein Jahresbeitrag ist, bitte auf 12 Monate
                  runterbrechen.
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Lizenzschlüssel
                </label>
                <input
                  className={inputBase}
                  value={form.license_key}
                  onChange={(e) =>
                    setForm({ ...form, license_key: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Gültig von
                </label>
                <DateInputWithCalendar
                  value={form.valid_from}
                  onChange={(value) =>
                    setForm({ ...form, valid_from: value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Gültig bis
                </label>
                <DateInputWithCalendar
                  value={form.valid_until}
                  onChange={(value) =>
                    setForm({ ...form, valid_until: value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  className={inputBase}
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as LicenseStatus,
                    })
                  }
                >
                  <option value="active">AKTIV</option>
                  <option value="expired">ABGELAUFEN</option>
                  <option value="pending">AUSLAUFEND</option>
                </select>
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
                  placeholder="z.B. 12 – wenn monatlich kündbar, einfach 1 eintragen"
                />
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Wenn monatlich kündbar, einfach <strong>1</strong> eintragen.
                </p>
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
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : 'bg-slate-50 text-slate-700 ring-slate-100'

  return (
    <span className={`${base} ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </span>
  )
}

/** Modal via Portal – überdeckt die komplette Page */
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
