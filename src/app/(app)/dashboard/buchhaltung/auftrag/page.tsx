// src/app/(app)/dashboard/buchhaltung/auftrag/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import OrderActionsMenu from './OrderActionMenu'
import StatusBadge from '../angebot/StatusBadget'
import FilterBarOrders from './FilterBarOrders'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

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
  customers: Customer | Customer[] | null
}

const PAGE_SIZE = 10

const clamp = (n: number) => (n < 0 ? 0 : n)

/** Endbetrag inkl. USt. – berücksichtigt optionalen Rabatt der AB */
function computeGrossTotal(row: Row) {
  const net = (row.positions ?? []).reduce(
    (s, p) => s + (p.type === 'item' ? (p.quantity ?? 0) * (p.unitPrice ?? 0) : 0),
    0
  )
  const taxRateNum = Number(row.tax_rate ?? 0)
  const taxFactor = 1 + taxRateNum / 100
  const grossBefore = net * taxFactor

  const d = row.discount ?? undefined
  if (!d || !d.enabled || !d.value) return grossBefore

  if (d.base === 'net') {
    const discountAmount = d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), net)
    const netAfter = clamp(net - capped)
    return netAfter * taxFactor
  } else {
    // base: 'gross'
    const discountAmount = d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
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
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const sort = (sp?.sort as ('desc' | 'asc')) || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('order_confirmations')
    .select(`
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
    `, { count: 'exact' })
    .eq('user_id', user.id)

  if (qRaw) {
    const like = `%${qRaw}%`
    query = query.or([
      `order_confirmation_number.ilike.${like}`,
      `title.ilike.${like}`,
      `intro.ilike.${like}`,
      `date.ilike.${like}`,
      `customers.first_name.ilike.${like}`,
      `customers.last_name.ilike.${like}`,
    ].join(','))
  }

  query = query.order('created_at', { ascending: sort === 'asc' }).range(from, to)

  const { data, count, error: qErr } = await query
  if (qErr) console.error(qErr)
  const rows = (data ?? []) as Row[]

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
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
    if (totalPages <= maxBtns) for (let i = 1; i <= totalPages; i++) list.push(i)
    else {
      const w = 2, s = Math.max(2, safePage - w), e = Math.min(totalPages - 1, safePage + w)
      list.push(1); if (s > 2) list.push('…'); for (let i = s; i <= e; i++) list.push(i); if (e < totalPages - 1) list.push('…'); list.push(totalPages)
    }
    return list
  })()

  return (
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] text-slate-700">
      {/* HEADER */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow">
              <ClipboardDocumentCheckIcon className="h-7 w-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-slate-900">Auftragsbestätigungen</h1>
              <p className="text-sm text-slate-600">Direkter Überblick & Weiterverarbeitung zur Rechnung.</p>
            </div>
          </div>

          <div className="relative z-[1] flex items-center gap-2">
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
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/65 p-0 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
        <div className="relative">
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[1200px] lg:min-w-[1400px] text-left">
                <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                  <tr className="text-[12.5px] uppercase tracking-wide text-slate-700">
                    <th className="px-6 py-3 font-semibold">Nr.</th>
                    <th className="px-6 py-3 font-semibold">Kunde</th>
                    <th className="px-6 py-3 font-semibold">Datum</th>
                    <th className="px-6 py-3 font-semibold">Betrag</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                  {rows.map((r) => {
                    const c = Array.isArray(r.customers) ? (r.customers[0] ?? null) : r.customers
                    const grossTotal = computeGrossTotal(r)

                    return (
                      <tr key={r.id} className="transition-colors hover:bg-white/80">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {r.order_confirmation_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {c ? `${c.first_name} ${c.last_name}` : '—'}
                          {c?.postal_code && c?.city && (
                            <span className="ml-2 text-xs text-slate-600">{c.postal_code} {c.city}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {EUR.format(grossTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={r.status ?? 'Erstellt'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <OrderActionsMenu
                            orderConfirmationNumber={r.order_confirmation_number}
                            pdfPath={r.pdf_path}
                            currentStatus={r.status}
                            redirectAfter="/dashboard/buchhaltung/rechnung"
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center italic text-slate-600">Keine Treffer.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {rows.length === 0 ? (
              <div className="p-6 text-center italic text-slate-700">Keine Treffer.</div>
            ) : (
              <ul className="divide-y divide-white/70">
                {rows.map((r) => {
                  const c = Array.isArray(r.customers) ? (r.customers[0] ?? null) : r.customers
                  const grossTotal = computeGrossTotal(r)

                  return (
                    <li key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{r.order_confirmation_number}</div>
                          {c && <div className="text-sm text-slate-700">{c.first_name} {c.last_name}</div>}
                          <div className="mt-1 text-sm text-slate-700">{r.date}</div>
                          <div className="text-sm font-semibold text-slate-900">{EUR.format(grossTotal)}</div>
                          <div className="mt-1"><StatusBadge status={r.status ?? 'Erstellt'} /></div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
            <div className="text-xs text-slate-600">
              Seite <strong>{safePage}</strong> von <strong>{totalPages}</strong> · {total} Einträge
            </div>
            <nav className="flex items-center gap-1">
              <Link href={hrefForPage(Math.max(1, safePage - 1))} aria-disabled={safePage === 1}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm shadow hover:bg-white ${safePage === 1 ? 'pointer-events-none opacity-40' : ''}`}>
                ← Zurück
              </Link>
              {pageNums.map((n, i) =>
                n === '…'
                  ? <span key={`el-${i}`} className="px-2 text-slate-500">…</span>
                  : <Link key={n} href={hrefForPage(n as number)} aria-current={n === safePage ? 'page' : undefined}
                      className={[
                        'rounded-lg px-3 py-1.5 text-sm border shadow',
                        n === safePage ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/80 border-white/60 hover:bg-white'
                      ].join(' ')}>
                      {n}
                    </Link>
              )}
              <Link href={hrefForPage(Math.min(totalPages, safePage + 1))} aria-disabled={safePage === totalPages}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm shadow hover:bg-white ${safePage === totalPages ? 'pointer-events-none opacity-40' : ''}`}>
                Weiter →
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        Beträge sind <strong>netto</strong> (nach Rabatt).
      </p>
    </div>
  )
}
