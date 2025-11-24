// src/app/(app)/dashboard/buchhaltung/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import NewOfferButton from './angebot/angebot-erstellen/NewOfferButton'
import NewInvoiceButton from './rechnung/rechnung-erstellen/NewInvoiceButton'
import {
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

/** Shared types */
type Pos = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  quantity?: number
  unitPrice?: number
}
type AnyRow = {
  id: string
  date: string
  positions: Pos[]
  tax_rate: number
  created_at: string
}

/** Angebot mit Status-Feldern */
type OfferRowWithStatus = AnyRow & {
  offer_number: string
  status?:
    | 'Erstellt'
    | 'Verschickt'
    | 'Bestätigt'
    | 'Bestaetigt'
    | string
    | null
  status_changed_at?: string | null
}

/** Auftrag (Auftragsbestätigung) mit Status-Feldern */
type OrderRowWithStatus = AnyRow & {
  order_confirmation_number: string
  status?: 'Erstellt' | 'Verschickt' | 'Abgerechnet' | string | null
  status_changed_at?: string | null
}

/** Rechnung mit Status-Feldern */
type InvoiceRowWithStatus = AnyRow & {
  invoice_number: string
  status?:
    | 'Erstellt'
    | 'Verschickt'
    | 'Überfällig'
    | 'Bezahlt'
    | string
    | null
  status_changed_at?: string | null
  due_date?: string | null
  valid_until?: string | null
}

/** Helper */
function grossFromPositions(positions: Pos[], tax: number) {
  const net = (positions ?? []).reduce(
    (s, p) =>
      s +
      (p.type === 'item'
        ? (p.quantity ?? 0) * (p.unitPrice ?? 0)
        : 0),
    0,
  )
  return net * (1 + (tax ?? 0) / 100)
}
function isPast(dateStr?: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d < today
}

/** Einheitliche Status-Badge Styles (ohne Import) */
function statusClasses(status?: string | null) {
  const s = (status ?? 'Erstellt').toString().toLowerCase()
  if (s === 'bestätigt' || s === 'bestaetigt')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (s === 'verschickt')
    return 'bg-indigo-50 text-indigo-700 ring-indigo-100'
  if (s === 'abgerechnet')
    return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

export default async function BuchhaltungPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Load all three entities for stats (Status-Spalten selektieren)
  const [offersRes, ordersRes, invoicesRes] = await Promise.all([
    supabase
      .from('offers')
      .select(
        'id, date, positions, tax_rate, created_at, offer_number, status, status_changed_at',
      )
      .eq('user_id', user.id),
    supabase
      .from('order_confirmations')
      .select(
        'id, date, positions, tax_rate, created_at, order_confirmation_number, status, status_changed_at',
      )
      .eq('user_id', user.id),
    supabase
      .from('invoices')
      .select(
        'id, date, positions, tax_rate, created_at, invoice_number, status, status_changed_at, due_date, valid_until',
      )
      .eq('user_id', user.id),
  ])

  const offers = (offersRes.data ?? []) as OfferRowWithStatus[]
  const orders = (ordersRes.data ?? []) as OrderRowWithStatus[]
  const invoices = (invoicesRes.data ?? []) as InvoiceRowWithStatus[]

  // Aggregation
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}` // YYYY-MM
  const isSameMonth = (d: string) => d?.startsWith?.(monthStr)

  const sumGross = (arr: AnyRow[]) =>
    arr.reduce(
      (s, r) =>
        s + grossFromPositions(r.positions, r.tax_rate),
      0,
    )
  const countOffers = offers.length
  const countOrders = orders.length
  const countInvoices = invoices.length

  const sumOffersAll = sumGross(offers)
  const sumOrdersAll = sumGross(orders)
  const sumInvoicesAll = sumGross(invoices)

  const sumOffersMonth = sumGross(
    offers.filter((r) => isSameMonth(r.date)),
  )
  const sumOrdersMonth = sumGross(
    orders.filter((r) => isSameMonth(r.date)),
  )
  const sumInvoicesMonth = sumGross(
    invoices.filter((r) => isSameMonth(r.date)),
  )

  // Angebote nach Status
  const offerStatusCounts = offers.reduce((acc, o) => {
    const key = (o.status ?? 'Erstellt') as string
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const countOfferErstellt = offerStatusCounts['Erstellt'] ?? 0
  const countOfferVerschickt =
    offerStatusCounts['Verschickt'] ?? 0
  const countOfferBestaetigt =
    (offerStatusCounts['Bestätigt'] ?? 0) +
    (offerStatusCounts['Bestaetigt'] ?? 0)

  // Auftragsbestätigungen nach Status
  const orderStatusCounts = orders.reduce((acc, o) => {
    const key = (o.status ?? 'Erstellt') as string
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const countOrderErstellt = orderStatusCounts['Erstellt'] ?? 0
  const countOrderVerschickt =
    orderStatusCounts['Verschickt'] ?? 0
  const countOrderAbgerechnet =
    orderStatusCounts['Abgerechnet'] ?? 0

  // Rechnungen nach Status (mit Fallback "Überfällig" anhand due_date/valid_until)
  const invStatusCounts = invoices.reduce(
    (acc, inv) => {
      let s = (inv.status ?? 'Erstellt') as string
      if (s !== 'Bezahlt') {
        const due = inv.due_date ?? inv.valid_until
        if (isPast(due)) s = 'Überfällig'
      }
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const countInvErstellt = invStatusCounts['Erstellt'] ?? 0
  const countInvVerschickt =
    invStatusCounts['Verschickt'] ?? 0
  const countInvUeberfaellig =
    invStatusCounts['Überfällig'] ?? 0
  const countInvBezahlt = invStatusCounts['Bezahlt'] ?? 0

  // Activity feed: latest 10 across all
  type Activity = {
    kind: 'Angebot' | 'Auftrag' | 'Rechnung'
    number: string
    date: string
    created_at: string
    href: string
    amount: number
    status?: string | null
  }
  const activities: Activity[] = [
    ...offers.map((o) => ({
      kind: 'Angebot' as const,
      number: o.offer_number,
      date: o.date,
      created_at: o.created_at,
      href: `/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(
        o.offer_number,
      )}`,
      amount: grossFromPositions(o.positions, o.tax_rate),
      status: o.status ?? 'Erstellt',
    })),
    ...orders.map((o) => ({
      kind: 'Auftrag' as const,
      number: o.order_confirmation_number,
      date: o.date,
      created_at: o.created_at,
      href: `/dashboard/buchhaltung/auftrag`,
      amount: grossFromPositions(o.positions, o.tax_rate),
      status: o.status ?? 'Erstellt',
    })),
    ...invoices.map((i) => ({
      kind: 'Rechnung' as const,
      number: i.invoice_number,
      date: i.date,
      created_at: i.created_at,
      href: `/dashboard/buchhaltung/rechnung`,
      amount: grossFromPositions(i.positions, i.tax_rate),
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 10)

  const fmt = (v: number) =>
    `€ ${v.toFixed(2).replace('.', ',')}`

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),transparent_60%)] px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-slate-900 shadow-[0_8px_30px_rgba(2,6,23,0.06)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
                <BoltIcon className="h-4 w-4 text-slate-700" />
                Buchhaltung – Command Center
              </div>
              <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                Übersicht & Quick Actions
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Alle KPIs im Blick. Springe direkt in Angebote,
                Aufträge oder Rechnungen.
              </p>
            </div>

            {/* Buttons: auf Mobile full-width, nebeneinander ab sm */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="flex w-full gap-2 sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <NewOfferButton />
                </div>
                <div className="flex-1 sm:flex-none">
                  <NewInvoiceButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Angebote */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/3 translate-x-1/3 rounded-full bg-indigo-100/60 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
                  <DocumentTextIcon className="h-4 w-4" />
                  Angebote
                </div>
                <div className="text-2xl font-semibold">
                  {countOffers}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Anzahl gesamt
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {fmt(sumOffersMonth)}
                </div>
                <div className="text-xs text-slate-500">
                  Diesen Monat
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Gesamt:{' '}
                  <span className="font-medium text-slate-900">
                    {fmt(sumOffersAll)}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 text-center text-slate-900">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Erstellt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOfferErstellt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Verschickt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOfferVerschickt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Bestätigt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOfferBestaetigt}
                </div>
              </div>
            </div>

            <div className="relative mt-4">
              <Link
                href="/dashboard/buchhaltung/angebot"
                className="text-sm font-medium text-indigo-700 hover:underline"
              >
                Zur Angebotsliste →
              </Link>
            </div>
          </div>

          {/* Aufträge */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/3 translate-x-1/3 rounded-full bg-teal-100/60 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-100">
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                  Aufträge
                </div>
                <div className="text-2xl font-semibold">
                  {countOrders}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Anzahl gesamt
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {fmt(sumOrdersMonth)}
                </div>
                <div className="text-xs text-slate-500">
                  Diesen Monat
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Gesamt:{' '}
                  <span className="font-medium text-slate-900">
                    {fmt(sumOrdersAll)}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Erstellt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOrderErstellt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Verschickt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOrderVerschickt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Abgerechnet
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countOrderAbgerechnet}
                </div>
              </div>
            </div>

            <div className="relative mt-4">
              <Link
                href="/dashboard/buchhaltung/auftrag"
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                Zu Aufträgen →
              </Link>
            </div>
          </div>

          {/* Rechnungen */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/3 translate-x-1/3 rounded-full bg-amber-100/60 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
                  <BanknotesIcon className="h-4 w-4" />
                  Rechnungen
                </div>
                <div className="text-2xl font-semibold">
                  {countInvoices}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Anzahl gesamt
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {fmt(sumInvoicesMonth)}
                </div>
                <div className="text-xs text-slate-500">
                  Diesen Monat
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Gesamt:{' '}
                  <span className="font-medium text-slate-900">
                    {fmt(sumInvoicesAll)}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Erstellt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countInvErstellt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Verschickt
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {countInvVerschickt}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-rose-700">
                  Überfällig
                </div>
                <div className="mt-1 text-lg font-semibold text-rose-700">
                  {countInvUeberfaellig}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium text-emerald-700">
                  Bezahlt
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">
                  {countInvBezahlt}
                </div>
              </div>
            </div>

            <div className="relative mt-4">
              <Link
                href="/dashboard/buchhaltung/rechnung"
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                Zu Rechnungen →
              </Link>
            </div>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 text-slate-900 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
          <div className="border-b border-white/60 bg-white/80 px-4 py-3 text-[13px] font-medium uppercase tracking-wide text-slate-700 sm:px-5">
            Letzte Aktivitäten
          </div>

          {activities.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-600 sm:px-5">
              Noch keine Aktivitäten.
            </div>
          ) : (
            <ul className="divide-y divide-white/70">
              {activities.map((a, idx) => (
                <li
                  key={`${a.kind}-${a.number}-${idx}`}
                  className="px-4 py-4 text-sm transition-colors hover:bg-white/80 sm:px-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Badges + Meta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          a.kind === 'Angebot'
                            ? 'bg-indigo-100 text-indigo-800 ring-indigo-200/60'
                            : a.kind === 'Auftrag'
                            ? 'bg-teal-100 text-teal-800 ring-teal-200/60'
                            : 'bg-amber-100 text-amber-800 ring-amber-200/60',
                        ].join(' ')}
                      >
                        {a.kind}
                      </span>

                      <div className="text-slate-900">
                        <span className="font-medium">
                          {a.number}
                        </span>
                        <span className="ml-2 text-xs text-slate-600">
                          vom {a.date}
                        </span>
                      </div>

                      {a.kind !== 'Rechnung' && (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClasses(
                            a.status,
                          )}`}
                        >
                          {a?.status === 'Bestaetigt'
                            ? 'Bestätigt'
                            : a?.status ?? 'Erstellt'}
                        </span>
                      )}
                    </div>

                    {/* Right: Betrag + Button */}
                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                      <div className="text-sm font-semibold text-slate-900">
                        {fmt(a.amount)}
                      </div>
                      <Link
                        href={a.href}
                        className="inline-flex items-center rounded-lg border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:text-sm"
                      >
                        Öffnen
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FOOTNOTE */}
        <p className="text-xs text-slate-500">
          Summen basieren auf Positionen (inkl. USt.). Zeiträume:
          „Diesen Monat“ = aktueller Kalendermonat.
        </p>
      </div>
    </div>
  )
}
