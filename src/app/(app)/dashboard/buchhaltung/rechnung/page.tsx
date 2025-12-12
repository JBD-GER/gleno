import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import { BanknotesIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../angebot/StatusBadget'
import InvoiceActionsMenu from './InvoiceActionMenu'
import FilterBarInvoices from './FilterBarInvoices'
import AutomationOverview from './AutomationOverview'

type Pos = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  quantity?: number
  unitPrice?: number
}

type CustomerRow = {
  id: string
  first_name: string
  last_name: string
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
}

/* ===== Rabatte & Summen wie bei Angeboten ===== */
type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'
type Discount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

type InvoiceRow = {
  id: string
  invoice_number: string
  date: string
  valid_until: string | null
  title: string
  intro: string
  tax_rate: number | string
  positions: Pos[]
  pdf_path: string | null
  created_at: string
  updated_at: string
  customers: CustomerRow | null
  status?: string | null
  status_changed_at?: string | null
  due_date?: string | null

  // ✅ STORNO-FELDER (NEU fürs sichere Anzeigen/Disable)
  is_cancellation?: boolean | null
  cancels_invoice_number?: string | null
  cancelled_by_invoice_number?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null

  // optionale, bereits persistierte Summen
  discount?: Discount | null
  net_subtotal?: number | null
  discount_amount?: number | null
  net_after_discount?: number | null
  tax_amount?: number | null
  gross_total?: number | null
}

type InvoiceRowFromDb = Omit<InvoiceRow, 'customers'> & {
  customers: CustomerRow | CustomerRow[] | null
}

const PAGE_SIZE = 10

function isPast(dateStr?: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d < today
}

// robustes Parsen (z.B. "19,00")
const parseNumber = (n: unknown, fallback = 0): number => {
  if (typeof n === 'number' && isFinite(n)) return n
  if (typeof n === 'string') {
    const v = Number(n.trim().replace(',', '.'))
    return isNaN(v) ? fallback : v
  }
  return fallback
}

const clamp = (n: number) => (n < 0 ? 0 : n)

/** Finale NETTO-Summe nach Rabatt.
 * 1) nutzt DB-Feld `net_after_discount`, wenn vorhanden
 * 2) sonst berechnet sie aus Positionen + Rabatt (Basis net/gross)
 */
function computeNetTotalInvoice(inv: InvoiceRow): number {
  const netAfterDb = inv.net_after_discount
  if (typeof netAfterDb === 'number' && isFinite(netAfterDb)) return netAfterDb

  const net = (inv.positions ?? []).reduce(
    (s, p) =>
      s + (p.type === 'item' ? (p.quantity ?? 0) * (p.unitPrice ?? 0) : 0),
    0
  )
  const d = inv.discount || undefined
  if (!d || !d.enabled || !d.value) return net

  const taxRate = parseNumber(inv.tax_rate, 0)
  const taxFactor = 1 + taxRate / 100

  if (d.base === 'net') {
    const discountAmount =
      d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), net)
    return clamp(net - capped)
  } else {
    // Rabatt auf Brutto ➜ erst Brutto berechnen, Rabatt abziehen, dann wieder auf Netto zurückrechnen
    const grossBefore = net * taxFactor
    const discountAmount =
      d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), grossBefore)
    const grossAfter = clamp(grossBefore - capped)
    return grossAfter / taxFactor
  }
}

/** Anzeige-Status:
 * - "Storniert" (Status ODER Storno-Felder) darf NIE zu "Überfällig" werden.
 * - "Bezahlt" ebenso nicht.
 * - Nur wenn NICHT bezahlt/storniert und Zahlungsziel vorbei → "Überfällig".
 */
function getDisplayStatus(inv: InvoiceRow): string {
  const rawStatus = (inv.status ?? 'Erstellt').toString().trim()
  const normalized = rawStatus.toLowerCase()

  // ✅ Storno sicher erkennen (Status ODER Felder)
  const cancelled =
    !!inv.cancelled_by_invoice_number ||
    !!inv.cancelled_at ||
    !!inv.is_cancellation ||
    normalized === 'storniert' ||
    normalized.includes('storno')

  if (cancelled) return 'Storniert'
  if (normalized === 'bezahlt') return 'Bezahlt'

  const due = inv.due_date ?? inv.valid_until
  if (isPast(due)) return 'Überfällig'

  return rawStatus
}

export default async function RechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: 'desc' | 'asc'; page?: string }>
}) {
  const sp = await searchParams

  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const sort = (sp?.sort as 'desc' | 'asc') || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // --- Query (inkl. Summen & Rabatt + STORNO-FELDER) ------------------------
  let query = supabase
    .from('invoices')
    .select(
      `
      id, invoice_number, date, valid_until, title, intro, tax_rate, positions, pdf_path,
      created_at, updated_at, status, status_changed_at, due_date,

      discount, net_subtotal, discount_amount, net_after_discount, tax_amount, gross_total,

      is_cancellation, cancels_invoice_number, cancelled_by_invoice_number, cancelled_at, cancellation_reason,

      customers ( id, first_name, last_name, street, house_number, postal_code, city )
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id)

  if (qRaw) {
    const like = `%${qRaw}%`
    query = query.or(
      [
        `invoice_number.ilike.${like}`,
        `title.ilike.${like}`,
        `intro.ilike.${like}`,
      ].join(',')
    )
  }

  query = query
    .order('created_at', { ascending: sort === 'asc' })
    .range(from, to)

  const { data, count, error } = await query
  if (error) console.error('Fehler beim Laden der Rechnungen:', error)

  // Kunden-Relation normalisieren
  const rowsDb = (data ?? []) as InvoiceRowFromDb[]
  const rows: InvoiceRow[] = rowsDb.map((r) => ({
    ...r,
    customers: Array.isArray(r.customers)
      ? r.customers[0] ?? null
      : r.customers ?? null,
  }))

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const EUR = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/buchhaltung/rechnung?${params.toString()}`
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
              <BanknotesIcon className="h-7 w-7 text-slate-900" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                Rechnungen
              </h1>
              <p className="text-sm text-slate-600">
                Übersicht über alle Rechnungen – mit Status &amp; Beträgen im
                Blick.
              </p>
            </div>
          </div>
          <div className="relative z-[1] flex w-full items-center justify-start sm:w-auto sm:justify-end">
            <Link
              href="/dashboard/buchhaltung/rechnung/rechnung-erstellen"
              className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow hover:bg-white"
            >
              Neue Rechnung
              <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-white">
                ⌘N
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* FILTERBAR */}
      <FilterBarInvoices />

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
                    {['Nr.', 'Kunde', 'Datum', 'Status', 'Netto', 'Aktionen'].map(
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
                  {rows.map((inv) => {
                    const c = inv.customers
                    const netFinal = computeNetTotalInvoice(inv)

                    const rawStatus = inv.status ?? 'Erstellt'
                    const showStatus = getDisplayStatus(inv)

                    const isCancelled =
                      showStatus === 'Storniert' ||
                      !!inv.cancelled_by_invoice_number ||
                      !!inv.cancelled_at ||
                      (rawStatus ?? '').toString().toLowerCase().includes('storno')

                    const isCancellation = !!inv.is_cancellation

                    return (
                      <tr
                        key={inv.id}
                        className="align-middle transition-colors hover:bg-white/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-900 sm:px-5">
                          {inv.invoice_number}
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
                          {inv.date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <StatusBadge status={showStatus} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-900 sm:px-5">
                          {EUR.format(netFinal)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <InvoiceActionsMenu
                            invoiceNumber={inv.invoice_number}
                            currentStatus={rawStatus}
                            isCancelled={isCancelled}
                            isCancellation={isCancellation}
                            downloadHref={`/api/rechnung/download-invoice/${encodeURIComponent(
                              inv.invoice_number
                            )}`}
                            editHref={`/dashboard/buchhaltung/rechnung/rechnung-bearbeiten/${encodeURIComponent(
                              inv.invoice_number
                            )}`}
                            inlineHref={`/api/rechnung/download-invoice/${encodeURIComponent(
                              inv.invoice_number
                            )}?disposition=inline`}
                          />
                        </td>
                      </tr>
                    )
                  })}

                  {rows.length === 0 && (
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

          {/* Mobile & Tablet: Kartenansicht bis < XL */}
          <div className="xl:hidden">
            {rows.length === 0 ? (
              <div className="p-4 text-left text-sm italic text-slate-700 sm:p-6">
                Keine Treffer.
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {rows.map((inv) => {
                  const c = inv.customers
                  const netFinal = computeNetTotalInvoice(inv)

                  const rawStatus = inv.status ?? 'Erstellt'
                  const showStatus = getDisplayStatus(inv)

                  const isCancelled =
                    showStatus === 'Storniert' ||
                    !!inv.cancelled_by_invoice_number ||
                    !!inv.cancelled_at ||
                    (rawStatus ?? '').toString().toLowerCase().includes('storno')

                  const isCancellation = !!inv.is_cancellation

                  return (
                    <li key={inv.id} className="px-4 py-3 sm:px-5 sm:py-4">
                      <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {inv.invoice_number}
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
                              {inv.date}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <StatusBadge status={showStatus} />
                            <div className="text-sm font-semibold text-slate-900 sm:text-base">
                              {EUR.format(netFinal)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-400">
                            Rechnung:{' '}
                            <span className="font-mono text-slate-600">
                              {inv.invoice_number}
                            </span>
                          </div>
                          <InvoiceActionsMenu
                            invoiceNumber={inv.invoice_number}
                            currentStatus={rawStatus}
                            isCancelled={isCancelled}
                            isCancellation={isCancellation}
                            downloadHref={`/api/rechnung/download-invoice/${encodeURIComponent(
                              inv.invoice_number
                            )}`}
                            editHref={`/dashboard/buchhaltung/rechnung/rechnung-bearbeiten/${encodeURIComponent(
                              inv.invoice_number
                            )}`}
                            inlineHref={`/api/rechnung/download-invoice/${encodeURIComponent(
                              inv.invoice_number
                            )}?disposition=inline`}
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
        Beträge sind <strong>netto</strong> (nach Rabatt). „Überfällig“
        erscheint automatisch, wenn das Zahlungsziel überschritten ist und die
        Rechnung nicht als „Bezahlt“ markiert wurde. „Storniert“ hat immer
        Vorrang.
      </p>

      <AutomationOverview />
    </div>
  )
}
