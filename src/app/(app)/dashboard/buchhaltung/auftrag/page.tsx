import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import OrderActionsMenu from './OrderActionMenu'
import StatusBadge from '../angebot/StatusBadget'
import FilterBarOrders from './FilterBarOrders'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'

type Pos = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  quantity?: number
  unitPrice?: number
}

type Customer = {
  id: string
  first_name: string
  last_name: string
  postal_code: string | null
  city: string | null
}

/** Rabatt-Definition wie bei Angebot/Rechnung */
type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'
type Discount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

type Row = {
  id: string
  order_confirmation_number: string
  user_id: string
  customer_id: string
  date: string
  title: string
  intro: string
  tax_rate: number
  positions: Pos[]
  pdf_path: string
  created_at: string
  updated_at: string
  status?: 'Erstellt' | 'Verschickt' | 'Abgerechnet' | string | null
  status_changed_at?: string | null
  discount?: Discount | null
  customers: Customer | null
}

type RowFromDb = Omit<Row, 'customers'> & {
  customers: Customer | Customer[] | null
}

const PAGE_SIZE = 10
const clamp = (n: number) => (n < 0 ? 0 : n)

/** Endbetrag inkl. USt. – berücksichtigt optionalen Rabatt der AB */
function computeGrossTotal(row: Row) {
  const net = (row.positions ?? []).reduce(
    (s, p) =>
      s + (p.type === 'item' ? (p.quantity ?? 0) * (p.unitPrice ?? 0) : 0),
    0
  )
  const taxRateNum = Number(row.tax_rate ?? 0)
  const taxFactor = 1 + taxRateNum / 100
  const grossBefore = net * taxFactor

  const d = row.discount ?? undefined
  if (!d || !d.enabled || !d.value) return grossBefore

  if (d.base === 'net') {
    const discountAmount =
      d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), net)
    const netAfter = clamp(net - capped)
    return netAfter * taxFactor
  } else {
    // base: 'gross'
    const discountAmount =
      d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), grossBefore)
    return clamp(grossBefore - capped)
  }
}

export default async function AuftragsbestaetigungenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: 'desc' | 'asc'; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const sort = (sp?.sort as 'desc' | 'asc') || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('order_confirmations')
    .select(
      `
      id,
      order_confirmation_number,
      user_id,
      customer_id,
      date,
      title,
      intro,
      tax_rate,
      positions,
      discount,
      pdf_path,
      created_at,
      updated_at,
      status,
      status_changed_at,
      customers ( id, first_name, last_name, postal_code, city )
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: sort === 'asc' })

  // Bei Suche KEIN range, damit wir nach Kundennamen etc. filtern können
  if (!qRaw) {
    query = query.range(from, to)
  }

  const { data, count, error: qErr } = await query
  if (qErr)
    console.error('Fehler beim Laden der Auftragsbestätigungen:', qErr)

  const rowsDb = (data ?? []) as RowFromDb[]
  const allRows: Row[] = rowsDb.map((r) => ({
    ...r,
    customers: Array.isArray(r.customers)
      ? r.customers[0] ?? null
      : r.customers ?? null,
  }))

  // Suche in JS: Nummer, Titel, Intro, Datum, Kundennamen, PLZ, Ort
  let filteredRows: Row[]
  if (qRaw) {
    const needle = qRaw.toLowerCase()
    filteredRows = allRows.filter((r) => {
      const c = r.customers
      const haystack = [
        r.order_confirmation_number,
        r.title,
        r.intro,
        r.date,
        c?.first_name,
        c?.last_name,
        c?.postal_code,
        c?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(needle)
    })
  } else {
    filteredRows = allRows
  }

  const total = qRaw ? filteredRows.length : count ?? filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const sliceFrom = (safePage - 1) * PAGE_SIZE
  const sliceTo = sliceFrom + PAGE_SIZE
  const rowsPage = qRaw ? filteredRows.slice(sliceFrom, sliceTo) : filteredRows

  const EUR = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/buchhaltung/auftrag?${params.toString()}`
  }

  const pageNums = (() => {
    const list: (number | '…')[] = []
    const maxBtns = 7
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) list.push(i)
    } else {
      const w = 2
      const s = Math.max(2, safePage - w)
      const e = Math.min(totalPages - 1, safePage + w)
      list.push(1)
      if (s > 2) list.push('…')
      for (let i = s; i <= e; i++) list.push(i)
      if (e < totalPages - 1) list.push('…')
      list.push(totalPages)
    }
    return list
  })()

  return (
    <div className="min-h-[100dvh] w-full bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] px-4 py-4 text-slate-700 sm:px-6 sm:py-6 lg:px-8">
      {/* HEADER */}
      <div className="relative mb-4 w-full overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-4 text-left shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow">
              <ClipboardDocumentCheckIcon className="h-7 w-7 text-slate-900" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                Auftragsbestätigungen
              </h1>
              <p className="text-sm text-slate-600">
                Überblick über alle Aufträge – mit Beträgen &amp; Status im
                Blick.
              </p>
            </div>
          </div>

          <div className="relative z-[1] flex w-full items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Link
              href="/dashboard/buchhaltung/angebot"
              className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-800 shadow hover:bg-white"
            >
              Zu Angeboten
            </Link>
          </div>
        </div>
      </div>

      {/* FILTERBAR */}
      <FilterBarOrders />

      {/* LISTE */}
      <div className="relative mt-4 w-full overflow-hidden rounded-2xl border border-white/60 bg-white/65 p-0 text-left shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
        <div className="relative">
          {/* Desktop-Tabelle ab XL */}
          <div className="hidden xl:block">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full table-fixed text-left align-middle">
                <thead className="sticky top-0 z-10 bg-white/80 text-left text-xs text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                  <tr>
                    {['Nr.', 'Kunde', 'Datum', 'Betrag', 'Status', 'Aktionen'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left font-normal sm:px-5"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70 text-sm">
                  {rowsPage.map((r) => {
                    const c = r.customers
                    const grossTotal = computeGrossTotal(r)

                    return (
                      <tr
                        key={r.id}
                        className="align-middle transition-colors hover:bg-white/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-900 sm:px-5">
                          {r.order_confirmation_number}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left text-slate-900 sm:px-5">
                          {c ? `${c.first_name} ${c.last_name}` : '—'}
                          {c?.postal_code && c?.city && (
                            <span className="ml-2 text-xs text-slate-600">
                              {c.postal_code} {c.city}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left text-slate-700 sm:px-5">
                          {r.date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-900 sm:px-5">
                          {EUR.format(grossTotal)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <StatusBadge status={r.status ?? 'Erstellt'} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <OrderActionsMenu
                            orderConfirmationNumber={
                              r.order_confirmation_number
                            }
                            pdfPath={r.pdf_path}
                            currentStatus={r.status}
                            redirectAfter="/dashboard/buchhaltung/rechnung"
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {rowsPage.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-left text-sm italic text-slate-600 sm:px-5"
                      >
                        Keine Treffer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet: Karten-Ansicht bis < XL */}
          <div className="xl:hidden">
            {rowsPage.length === 0 ? (
              <div className="p-4 text-left text-sm italic text-slate-700 sm:p-6">
                Keine Treffer.
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {rowsPage.map((r) => {
                  const c = r.customers
                  const grossTotal = computeGrossTotal(r)

                  return (
                    <li key={r.id} className="px-4 py-3 sm:px-5 sm:py-4">
                      <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-sm">
                        {/* Top: Nummer + Kunde links, Status + Betrag rechts */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {r.order_confirmation_number}
                            </div>
                            {c && (
                              <div className="truncate text-xs text-slate-700 sm:text-sm">
                                {c.first_name} {c.last_name}
                              </div>
                            )}
                            {c?.postal_code && c?.city && (
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {c.postal_code} {c.city}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-slate-500">
                              {r.date}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <StatusBadge status={r.status ?? 'Erstellt'} />
                            <div className="text-sm font-semibold text-slate-900 sm:text-base">
                              {EUR.format(grossTotal)}
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Aktionen + Meta */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-400">
                            Auftrag-ID:{' '}
                            <span className="font-mono text-slate-600">
                              {r.order_confirmation_number}
                            </span>
                          </div>
                          <OrderActionsMenu
                            orderConfirmationNumber={r.order_confirmation_number}
                            pdfPath={r.pdf_path}
                            currentStatus={r.status}
                            redirectAfter="/dashboard/buchhaltung/rechnung"
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Pager */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/80 px-4 py-3 text-left text-xs text-slate-600 backdrop-blur">
            <div>
              Seite <strong>{safePage}</strong> von{' '}
              <strong>{totalPages}</strong> · {total} Einträge
            </div>
            <nav className="flex flex-wrap items-center gap-1">
              <Link
                href={hrefForPage(Math.max(1, safePage - 1))}
                aria-disabled={safePage === 1}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm shadow hover:bg-white ${
                  safePage === 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                ← Zurück
              </Link>
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span key={`el-${i}`} className="px-2 text-slate-500">
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={hrefForPage(n as number)}
                    aria-current={n === safePage ? 'page' : undefined}
                    className={[
                      'rounded-lg border px-3 py-1.5 text-sm shadow',
                      n === safePage
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-white/60 bg-white/80 hover:bg-white',
                    ].join(' ')}
                  >
                    {n}
                  </Link>
                )
              )}
              <Link
                href={hrefForPage(Math.min(totalPages, safePage + 1))}
                aria-disabled={safePage === totalPages}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm shadow hover:bg-white ${
                  safePage === totalPages
                    ? 'pointer-events-none opacity-40'
                    : ''
                }`}
              >
                Weiter →
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <p className="mt-3 text-left text-xs text-slate-600">
        Beträge sind <strong>brutto</strong> inkl. Rabatt und Mehrwertsteuer.
      </p>
    </div>
  )
}
