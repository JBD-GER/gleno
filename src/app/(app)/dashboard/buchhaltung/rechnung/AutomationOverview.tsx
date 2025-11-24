'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AutomationModal } from './InvoiceActionMenu'
import type { AutomationInterval } from './InvoiceActionMenu'

type AutomationDb = {
  id: string
  user_id: string
  source_invoice_id: string
  source_invoice_number: string | null
  label: string | null
  interval: string | null
  start_date: string | null
  end_date: string | null
  next_run_date: string | null
  last_run_date: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type InvoiceDb = {
  id: string
  invoice_number: string
  date: string | null
  customer_id: string | null
  customers: {
    first_name: string | null
    last_name: string | null
    company: string | null
  } | null
}

type InvoiceDbFromDb = {
  id: string
  invoice_number: string
  date: string | null
  customer_id: string | null
  customers:
    | {
        first_name: string | null
        last_name: string | null
        company: string | null
      }
    | {
        first_name: string | null
        last_name: string | null
        company: string | null
      }[]
    | null
}

type AutomationRow = {
  id: string
  label: string | null
  interval: AutomationInterval | null
  start_date: string | null
  end_date: string | null
  next_run_date: string | null
  last_run_date: string | null
  active: boolean
  created_at: string
  updated_at: string
  invoice_number: string | null
  customer_name: string
}

type StatusFilter = 'active' | 'ended'

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE')
}

function intervalLabel(interval: AutomationInterval | null): string {
  switch (interval) {
    case 'weekly':
      return 'wöchentlich'
    case 'every_2_weeks':
      return 'alle 2 Wochen'
    case 'monthly':
      return 'monatlich'
    case 'every_2_months':
      return 'alle 2 Monate'
    case 'quarterly':
      return 'vierteljährlich'
    case 'every_6_months':
      return 'alle 6 Monate'
    case 'yearly':
      return 'jährlich'
    default:
      return '—'
  }
}

export default function AutomationOverview() {
  const [rows, setRows] = useState<AutomationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] =
    useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [searchTerm, setSearchTerm] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const sb = supabaseClient()
      const {
        data: { user },
      } = await sb.auth.getUser()

      if (!user) {
        setRows([])
        setLoading(false)
        return
      }

      const { data: automations, error: aErr } = await sb
        .from('invoice_automations')
        .select(
          'id, user_id, source_invoice_id, source_invoice_number, label, interval, start_date, end_date, next_run_date, last_run_date, active, created_at, updated_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (aErr) throw aErr

      const list = (automations ?? []) as AutomationDb[]
      if (list.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const invoiceIds = Array.from(
        new Set(list.map((a) => a.source_invoice_id).filter(Boolean))
      ) as string[]

      const { data: invoices, error: iErr } = await sb
        .from('invoices')
        .select(
          'id, invoice_number, date, customer_id, customers ( first_name, last_name, company )'
        )
        .in('id', invoiceIds)

      if (iErr) throw iErr

      const invoicesArr = (invoices ?? []) as InvoiceDbFromDb[]
      const invoiceMap = new Map<string, InvoiceDb>()

      invoicesArr.forEach((raw) => {
        const normalized: InvoiceDb = {
          id: raw.id,
          invoice_number: raw.invoice_number,
          date: raw.date,
          customer_id: raw.customer_id,
          customers: Array.isArray(raw.customers)
            ? raw.customers[0] ?? null
            : raw.customers ?? null,
        }
        invoiceMap.set(normalized.id, normalized)
      })

      const merged: AutomationRow[] = list.map((a) => {
        const inv = invoiceMap.get(a.source_invoice_id)
        const cust = inv?.customers
        const customerName =
          cust?.company ||
          [cust?.first_name, cust?.last_name].filter(Boolean).join(' ') ||
          'Kundin / Kunde'

        return {
          id: a.id,
          label: a.label,
          interval: (a.interval as AutomationInterval) || null,
          start_date: a.start_date,
          end_date: a.end_date,
          next_run_date: a.next_run_date,
          last_run_date: a.last_run_date,
          active: a.active,
          created_at: a.created_at,
          updated_at: a.updated_at,
          invoice_number: inv?.invoice_number ?? a.source_invoice_number,
          customer_name: customerName,
        }
      })

      setRows(merged)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Fehler beim Laden der Automatisierungen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openModalForInvoice = (invoiceNumber: string | null) => {
    if (!invoiceNumber) return
    setSelectedInvoiceNumber(invoiceNumber)
    setModalOpen(true)
  }

  if (!loading && rows.length === 0) {
    return null
  }

  const filteredRows = rows.filter((row) => {
    const matchesStatus =
      statusFilter === 'active' ? row.active === true : row.active === false
    if (!matchesStatus) return false

    const s = searchTerm.trim().toLowerCase()
    if (!s) return true

    const haystack = `${row.customer_name ?? ''} ${
      row.invoice_number ?? ''
    }`.toLowerCase()

    return haystack.includes(s)
  })

  const hasResults = filteredRows.length > 0

  return (
    <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Wiederkehrende Rechnungen
          </h2>
          <p className="text-xs text-slate-600">
            Übersicht aller eingerichteten Automatisierungen. Tipp auf einen
            Eintrag, um die Einstellungen zu bearbeiten.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status-Toggle */}
          <div className="inline-flex rounded-full border border-slate-200 bg-white/80 p-0.5 text-[11px] shadow-sm">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={[
                'rounded-full px-2.5 py-1 transition',
                statusFilter === 'active'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              Aktiv
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ended')}
              className={[
                'rounded-full px-2.5 py-1 transition',
                statusFilter === 'ended'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              Beendet
            </button>
          </div>

          {/* Suche Kunde */}
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kunde suchen…"
              className="w-40 rounded-lg border border-slate-200 bg-white pl-7 pr-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:w-56"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-sm text-slate-500">
          Lädt Automatisierungen …
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : !hasResults ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          Keine passenden Automatisierungen für die aktuelle Filterung.
        </div>
      ) : (
        <>
          {/* Desktop-Tabelle (ab md) */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-white/80 text-[11px] uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Kunde</th>
                    <th className="px-3 py-2 font-semibold">Bezeichnung</th>
                    <th className="px-3 py-2 font-semibold">Intervall</th>
                    <th className="px-3 py-2 font-semibold">Start</th>
                    <th className="px-3 py-2 font-semibold">Ende</th>
                    <th className="px-3 py-2 font-semibold">Nächster Lauf</th>
                    <th className="px-3 py-2 font-semibold">Erstellt am</th>
                    <th className="px-3 py-2 font-semibold">
                      Aktualisiert am
                    </th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80"
                      onClick={() => openModalForInvoice(row.invoice_number)}
                    >
                      <td className="px-3 py-2 text-[12px] text-slate-900">
                        {row.customer_name}
                        {row.invoice_number && (
                          <span className="ml-1 text-[11px] text-slate-500">
                            · {row.invoice_number}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-800">
                        {row.label || 'Ohne Bezeichnung'}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {intervalLabel(row.interval)}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {fmtDate(row.start_date)}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {row.end_date ? fmtDate(row.end_date) : 'Unbegrenzt'}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {fmtDate(row.next_run_date)}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">
                        {fmtDate(row.updated_at)}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5',
                            row.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-50 text-slate-600 border border-slate-200',
                          ].join(' ')}
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                          {row.active ? 'Aktiv' : 'Beendet'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openModalForInvoice(row.invoice_number)}
                className="w-full text-left rounded-2xl border border-slate-100 bg-white/95 px-3 py-3 shadow-sm transition hover:border-slate-200 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-900">
                      {row.customer_name}
                    </div>
                    {row.invoice_number && (
                      <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                        {row.invoice_number}
                      </div>
                    )}
                  </div>
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px]',
                      row.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-600 border border-slate-200',
                    ].join(' ')}
                  >
                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                    {row.active ? 'Aktiv' : 'Beendet'}
                  </span>
                </div>

                {row.label && (
                  <div className="mt-1 text-[12px] text-slate-800">
                    {row.label}
                  </div>
                )}

                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                      Intervall
                    </span>
                    <span>{intervalLabel(row.interval)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                      Nächster Lauf
                    </span>
                    <span>{fmtDate(row.next_run_date)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                      Start
                    </span>
                    <span>{fmtDate(row.start_date)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                      Ende
                    </span>
                    <span>
                      {row.end_date ? fmtDate(row.end_date) : 'Unbegrenzt'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Erstellt: {fmtDate(row.created_at)}</span>
                  <span>Aktualisiert: {fmtDate(row.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedInvoiceNumber && (
        <AutomationModal
          invoiceNumber={selectedInvoiceNumber}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onChanged={async () => {
            setModalOpen(false)
            await load()
          }}
        />
      )}
    </div>
  )
}
