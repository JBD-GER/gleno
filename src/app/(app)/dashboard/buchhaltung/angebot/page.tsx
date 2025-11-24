// src/app/(app)/dashboard/buchhaltung/angebot/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import OfferActionsMenu from './OfferActionsMenu'
import StatusBadge from './StatusBadget'
import FilterBarOffers from './FilterBarOffers'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface OfferPosition {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  quantity?: number
  unitPrice?: number
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
}

type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'
interface Discount {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

interface OfferRow {
  id: string
  offer_number: string
  date: string
  valid_until: string
  title: string
  intro: string
  tax_rate: number
  positions: OfferPosition[]
  discount?: Discount | null
  pdf_path: string
  created_at: string
  updated_at: string
  status?: 'Erstellt' | 'Verschickt' | 'Bestätigt' | 'Bestaetigt' | string | null
  status_changed_at?: string | null
  customers: CustomerRow | null
}

type OfferRowFromDb = Omit<OfferRow, 'customers'> & {
  customers: CustomerRow | CustomerRow[] | null
}

const PAGE_SIZE = 10
const clamp = (n: number) => (n < 0 ? 0 : n)

function computeGrossTotal(offer: OfferRow) {
  const net = (offer.positions ?? []).reduce(
    (sum, p) =>
      p.type === 'item' && p.quantity && p.unitPrice
        ? sum + p.quantity * p.unitPrice
        : sum,
    0
  )
  const taxFactor = 1 + (offer.tax_rate || 0) / 100
  const grossBefore = net * taxFactor
  const d = offer.discount || undefined

  if (!d || !d.enabled || !d.value) return grossBefore

  if (d.base === 'net') {
    const discountAmount =
      d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), net)
    const netAfter = clamp(net - capped)
    return netAfter * taxFactor
  } else {
    const discountAmount =
      d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), grossBefore)
    return clamp(grossBefore - capped)
  }
}

export default async function AngebotPage({
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

  let query = supabase
    .from('offers')
    .select(
      `
      id,
      offer_number,
      date,
      valid_until,
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
      customers (
        id, first_name, last_name, street, house_number, postal_code, city
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: sort === 'asc' })

  if (!qRaw) {
    query = query.range(from, to)
  }

  const { data: rows, count, error: offersErr } = await query
  if (offersErr) console.error('Fehler beim Laden der Angebote:', offersErr)

  const rowsNorm = (rows ?? []) as OfferRowFromDb[]
  const offersAll: OfferRow[] = rowsNorm.map((o) => ({
    ...o,
    customers: Array.isArray(o.customers)
      ? o.customers[0] ?? null
      : o.customers ?? null,
  }))

  // Suche in JS
  let filteredOffers: OfferRow[]
  if (qRaw) {
    const needle = qRaw.toLowerCase()
    filteredOffers = offersAll.filter((o) => {
      const c = o.customers
      const haystack = [
        o.offer_number,
        o.title,
        o.intro,
        o.date,
        c?.first_name,
        c?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(needle)
    })
  } else {
    filteredOffers = offersAll
  }

  const total = qRaw ? filteredOffers.length : count ?? filteredOffers.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const sliceFrom = (safePage - 1) * PAGE_SIZE
  const sliceTo = sliceFrom + PAGE_SIZE
  const offersPage = qRaw
    ? filteredOffers.slice(sliceFrom, sliceTo)
    : filteredOffers

  const EUR = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/buchhaltung/angebot?${params.toString()}`
  }

  const downloadHrefFor = (o: OfferRow) => {
    const path = (o.pdf_path || '').replace(/^\/+/, '')
    const base = `/api/angebot/download-offer/${encodeURIComponent(
      o.offer_number
    )}`
    return path ? `${base}?path=${encodeURIComponent(path)}` : base
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
              <DocumentTextIcon className="h-7 w-7 text-slate-900" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                Angebote
              </h1>
              <p className="text-sm text-slate-600">
                Erstellen, verwalten und exportieren – mit Beträgen &amp;
                Gültigkeiten im Blick.
              </p>
            </div>
          </div>

          <div className="relative z-[1] flex w-full items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Link
              href="/dashboard/buchhaltung/angebot/templates/neu"
              className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-800 shadow hover:bg-white"
            >
              Neues Template
            </Link>
            <Link
              href="/dashboard/buchhaltung/angebot/ai"
              className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow hover:bg-white"
            >
              Neues Angebot
              <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-white">
                AI
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* FILTERBAR (Client) */}
      <FilterBarOffers />

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
                    {[
                      'Nr.',
                      'Kunde',
                      'Datum',
                      'Betrag',
                      'Gültig bis',
                      'Status',
                      'Aktionen',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left font-normal sm:px-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70 text-sm">
                  {offersPage.map((offer) => {
                    const c = offer.customers
                    const grossTotal = computeGrossTotal(offer)

                    return (
                      <tr
                        key={offer.id}
                        className="align-middle transition-colors hover:bg-white/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-900 sm:px-5">
                          {offer.offer_number}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left text-slate-900 sm:px-5">
                          {c ? `${c.first_name} ${c.last_name}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left text-slate-700 sm:px-5">
                          {offer.date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-900 sm:px-5">
                          {EUR.format(grossTotal)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-white/60">
                            {offer.valid_until}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <StatusBadge status={offer.status ?? 'Erstellt'} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left sm:px-5">
                          <OfferActionsMenu
                            offerNumber={offer.offer_number}
                            currentStatus={offer.status}
                            downloadHref={downloadHrefFor(offer)}
                            editHref={`/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(
                              offer.offer_number
                            )}`}
                            redirectTo="/dashboard/buchhaltung/auftrag"
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {offersPage.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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

          {/* Mobile & Tablet: Karten bis < XL */}
          <div className="xl:hidden">
            {offersPage.length === 0 ? (
              <div className="p-4 text-left text-sm italic text-slate-700 sm:p-6">
                Keine Treffer.
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {offersPage.map((offer) => {
                  const c = offer.customers
                  const grossTotal = computeGrossTotal(offer)

                  return (
                    <li key={offer.id} className="px-4 py-3 sm:px-5 sm:py-4">
                      <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-sm">
                        {/* Top row: Nummer + Kunde links, Status + Betrag rechts */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {offer.offer_number}
                            </div>
                            {c && (
                              <div className="truncate text-xs text-slate-700 sm:text-sm">
                                {c.first_name} {c.last_name}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-slate-500">
                              {offer.date}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <StatusBadge status={offer.status ?? 'Erstellt'} />
                            <div className="text-sm font-semibold text-slate-900 sm:text-base">
                              {EUR.format(grossTotal)}
                            </div>
                          </div>
                        </div>

                        {/* Mitte: Gültig bis */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-100">
                            Gültig bis {offer.valid_until}
                          </span>
                        </div>

                        {/* Bottom: Aktionen */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-400">
                            Angebot-ID:{' '}
                            <span className="font-mono text-slate-600">
                              {offer.offer_number}
                            </span>
                          </div>
                          <OfferActionsMenu
                            offerNumber={offer.offer_number}
                            currentStatus={offer.status}
                            downloadHref={downloadHrefFor(offer)}
                            editHref={`/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(
                              offer.offer_number
                            )}`}
                            redirectTo="/dashboard/buchhaltung/auftrag"
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
        PDFs werden über eine gesicherte Download-Route bereitgestellt.
      </p>
    </div>
  )
}
