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
    const discountAmount = d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, discountAmount), net)
    const netAfter = clamp(net - capped)
    return netAfter * taxFactor
  } else {
    const discountAmount = d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
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
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const sort = (sp?.sort as ('desc' | 'asc')) || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('offers')
    .select(`
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
    `, { count: 'exact' })
    .eq('user_id', user.id)

  if (qRaw) {
    const like = `%${qRaw}%`
    query = query.or([
      `offer_number.ilike.${like}`,
      `title.ilike.${like}`,
      `intro.ilike.${like}`,
      `date.ilike.${like}`,
      `customers.first_name.ilike.${like}`,
      `customers.last_name.ilike.${like}`,
    ].join(','))
  }

  query = query.order('created_at', { ascending: sort === 'asc' }).range(from, to)

  const { data: rows, count, error: offersErr } = await query
  if (offersErr) console.error('Fehler beim Laden der Angebote:', offersErr)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const rowsNorm = (rows ?? []) as unknown as OfferRowFromDb[] // nach erfolgreichem Select ist rows ein Array
  const offers: OfferRow[] = rowsNorm.map((o) => ({
    ...o,
    customers: Array.isArray(o.customers) ? (o.customers[0] ?? null) : (o.customers ?? null),
  }))

  const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/buchhaltung/angebot?${params.toString()}`
  }

  const downloadHrefFor = (o: OfferRow) => {
    const path = (o.pdf_path || '').replace(/^\/+/, '')
    const base = `/api/angebot/download-offer/${encodeURIComponent(o.offer_number)}`
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
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] text-slate-700">
      {/* HEADER */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow">
              <DocumentTextIcon className="h-7 w-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-slate-900">Angebote</h1>
              <p className="text-sm text-slate-600">Erstellen, verwalten und exportieren – mit Beträgen & Gültigkeiten im Blick.</p>
            </div>
          </div>

          <div className="relative z-[1] flex items-center gap-2">
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
              <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-white">AI</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FILTERBAR (Client) */}
      <FilterBarOffers />

      {/* LISTE */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/65 p-0 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
        <div className="relative">
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                  <tr className="text-[12.5px] uppercase tracking-wide text-slate-700">
                    {['Nr.','Kunde','Datum','Betrag','Gültig bis','Status','Aktionen'].map(h => (
                      <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                  {offers.map((offer) => {
                    const c = offer.customers
                    const grossTotal = computeGrossTotal(offer)

                    return (
                      <tr key={offer.id} className="transition-colors hover:bg-white/80">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{offer.offer_number}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900">{c ? `${c.first_name} ${c.last_name}` : '—'}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{offer.date}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{EUR.format(grossTotal)}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-white/60">
                            {offer.valid_until}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm"><StatusBadge status={offer.status ?? 'Erstellt'} /></td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <OfferActionsMenu
                            offerNumber={offer.offer_number}
                            currentStatus={offer.status}
                            downloadHref={downloadHrefFor(offer)}
                            editHref={`/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(offer.offer_number)}`}
                            redirectTo="/dashboard/buchhaltung/auftrag"
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {offers.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center italic text-slate-600">Keine Treffer.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {offers.length === 0 ? (
              <div className="p-6 text-center italic text-slate-700">Keine Treffer.</div>
            ) : (
              <ul className="divide-y divide-white/70">
                {offers.map((offer) => {
                  const c = offer.customers
                  const grossTotal = computeGrossTotal(offer)

                  return (
                    <li key={offer.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{offer.offer_number}</div>
                          {c && <div className="text-sm text-slate-700">{c.first_name} {c.last_name}</div>}
                          <div className="mt-1 text-sm text-slate-700">{offer.date}</div>
                          <div className="text-sm font-semibold text-slate-900">{EUR.format(grossTotal)}</div>
                          <div className="mt-1">
                            <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-white/60">
                              Gültig bis {offer.valid_until}
                            </span>
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={offer.status ?? 'Erstellt'} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <OfferActionsMenu
                            offerNumber={offer.offer_number}
                            currentStatus={offer.status}
                            downloadHref={downloadHrefFor(offer)}
                            editHref={`/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(offer.offer_number)}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
            <div className="text-xs text-slate-600">
              Seite <strong>{safePage}</strong> von <strong>{totalPages}</strong> · {total} Einträge
            </div>
            <nav className="flex itemsänger gap-1">
              <Link href={hrefForPage(Math.max(1, safePage - 1))} aria-disabled={safePage === 1}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm shadow hover:bg-white ${safePage === 1 ? 'pointer-events-none opacity-40' : ''}`}>
                ← Zurück
              </Link>
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span key={`el-${i}`} className="px-2 text-slate-500">…</span>
                ) : (
                  <Link key={n} href={hrefForPage(n as number)} aria-current={n === safePage ? 'page' : undefined}
                    className={[
                      'rounded-lg px-3 py-1.5 text-sm border shadow',
                      n === safePage ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/80 border-white/60 hover:bg-white'
                    ].join(' ')}>
                    {n}
                  </Link>
                )
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
        Beträge sind <strong>netto</strong> (nach Rabatt). PDFs werden über eine gesicherte Download-Route bereitgestellt.
      </p>
    </div>
  )
}
