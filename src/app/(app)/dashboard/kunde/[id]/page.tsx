// ✅ PFAD: src/app/(app)/dashboard/buchhaltung/angebot/templates/[id]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import NotesPanel from './NotesPanel'
import ExpandableGrid from './ExpandableGrid'
import EditCustomerForm from './EditCustomerForm'
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  TagIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline'

/* ---------------- Types ---------------- */
type Note = { id: string; content: string; created_at: string }
type OfferPosition = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  quantity?: number
  unitPrice?: number
}
type OfferRec = {
  id: string
  offer_number: string
  date: string
  tax_rate: number
  positions: OfferPosition[]
}
type OrderConfRec = {
  id: string
  order_confirmation_number: string
  date: string
  tax_rate: number
  positions: OfferPosition[]
  pdf_path: string | null
}
type InvoiceRec = {
  id: string
  invoice_number: string
  date: string
  tax_rate: number
  positions: OfferPosition[]
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = (await searchParams) ?? {}

  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Kunde
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (custErr || !customer) redirect('/dashboard/kunde')

  // Angebote
  const { data: offersData } = await supabase
    .from('offers')
    .select('id, offer_number, date, tax_rate, positions')
    .eq('user_id', user.id)
    .eq('customer_id', id)
    .order('date', { ascending: false })
  const offers: OfferRec[] = (offersData ?? []) as any

  // Auftragsbestätigungen (mit pdf_path)
  const { data: ocData } = await supabase
    .from('order_confirmations')
    .select(
      'id, order_confirmation_number, date, tax_rate, positions, pdf_path',
    )
    .eq('user_id', user.id)
    .eq('customer_id', id)
    .order('date', { ascending: false })
  const orderConfirmations: OrderConfRec[] = (ocData ?? []) as any

  // Rechnungen
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select('id, invoice_number, date, tax_rate, positions')
    .eq('user_id', user.id)
    .eq('customer_id', id)
    .order('date', { ascending: false })
  const invoices: InvoiceRec[] = (invoicesData ?? []) as any

  // Notizen (initial)
  const { data: notesData } = await supabase
    .from('customer_notes')
    .select('id, content, created_at')
    .eq('user_id', user.id)
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
  const initialNotes: Note[] = (notesData ?? []) as any

  /* ---------------- Helpers ---------------- */
  const euro = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(v || 0)

  const sumGross = (
    positions: OfferPosition[] | null | undefined,
    tax: number | null | undefined,
  ) => {
    const ps = positions ?? []
    const net = ps.reduce(
      (acc, p) =>
        acc +
        (p.type === 'item' && p.quantity && p.unitPrice
          ? p.quantity * p.unitPrice
          : 0),
      0,
    )
    return net * (1 + (tax ?? 0) / 100)
  }

  // KPIs
  const totalRevenue = invoices.reduce(
    (acc, inv) => acc + sumGross(inv.positions, inv.tax_rate),
    0,
  )
  const acceptedOffers = orderConfirmations.length
  const totalOffers = offers.length
  const conversion =
    totalOffers > 0
      ? Math.round((acceptedOffers / totalOffers) * 100)
      : null

  const btnWhite =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white transition'

  const StatusBadge = ({ value }: { value: string }) => {
    const tone =
      value === 'Kunde'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : value === 'Inaktiv'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-amber-50 text-amber-800 ring-amber-200'
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}
      >
        {value || 'Lead'}
      </span>
    )
  }

  const GlassTile = ({
    title,
    value,
    Icon,
  }: {
    title: string
    value?: string | null
    Icon: typeof TagIcon
  }) => (
    <div
      className="relative overflow-hidden rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl ring-1 ring-transparent sm:p-4"
      style={{
        backgroundImage:
          'radial-gradient(420px 180px at 120% -30%, rgba(15,23,42,0.06), transparent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="truncate text-sm font-medium text-slate-900">
            {value || '–'}
          </p>
        </div>
      </div>
    </div>
  )

  const StatTile = ({
    title,
    value,
    HintIcon,
  }: {
    title: string
    value: string
    HintIcon: typeof BanknotesIcon
  }) => (
    <div
      className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5"
      style={{
        backgroundImage:
          'radial-gradient(520px 220px at 120% -30%, rgba(15,23,42,0.06), transparent)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/60 bg-white/80 p-2 shadow">
          <HintIcon className="h-6 w-6 text-slate-900" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
        </div>
      </div>
    </div>
  )

  /* ---------------- Cards für Listen ---------------- */
  const offerCards = offers.map((o) => {
    const gross = euro(sumGross(o.positions, o.tax_rate))
    return (
      <div
        key={o.id}
        className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow transition hover:shadow-md backdrop-blur sm:p-5"
      >
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
          Angebot {o.offer_number}
        </h3>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Datum: {o.date}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900 sm:text-base">
          Total brutto: {gross}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/buchhaltung/angebot/angebot-bearbeiten/${encodeURIComponent(
              o.offer_number,
            )}`}
            className={btnWhite}
          >
            Bearbeiten
          </Link>
          <Link
            href={`/api/angebot/download-offer/${encodeURIComponent(
              o.offer_number,
            )}`}
            target="_blank"
            className={btnWhite}
          >
            PDF herunterladen
          </Link>
        </div>
      </div>
    )
  })

  const ocCards = orderConfirmations.map((oc) => {
    const gross = euro(sumGross(oc.positions, oc.tax_rate))
    const path = (oc.pdf_path || '').replace(/^\/+/, '')
    const canDownload = !!path
    const ocDownloadHref = canDownload
      ? `/api/auftrag/generate-from-offer/download?path=${encodeURIComponent(
          path,
        )}&disposition=attachment`
      : undefined

    return (
      <div
        key={oc.id}
        className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow transition hover:shadow-md backdrop-blur sm:p-5"
      >
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
          Auftragsbestätigung {oc.order_confirmation_number}
        </h3>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Datum: {oc.date}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900 sm:text-base">
          Total brutto: {gross}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canDownload ? (
            <Link href={ocDownloadHref!} target="_blank" className={btnWhite}>
              PDF herunterladen
            </Link>
          ) : (
            <button
              disabled
              className={`${btnWhite} cursor-not-allowed opacity-60`}
              title="Kein gespeicherter PDF-Pfad"
            >
              PDF nicht verfügbar
            </button>
          )}
        </div>
      </div>
    )
  })

  const invoiceCards = invoices.map((inv) => {
    const gross = euro(sumGross(inv.positions, inv.tax_rate))
    return (
      <div
        key={inv.id}
        className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow transition hover:shadow-md backdrop-blur sm:p-5"
      >
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
          Rechnung {inv.invoice_number}
        </h3>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Datum: {inv.date}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900 sm:text-base">
          Total brutto: {gross}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/buchhaltung/rechnung/rechnung-bearbeiten/${encodeURIComponent(
              inv.invoice_number,
            )}`}
            className={btnWhite}
          >
            Bearbeiten
          </Link>
          <Link
            href={`/api/rechnung/download-invoice/${encodeURIComponent(
              inv.invoice_number,
            )}`}
            target="_blank"
            className={btnWhite}
          >
            PDF herunterladen
          </Link>
        </div>
      </div>
    )
  })

  const editRequested = (sp?.edit ?? '') === '1'

  /* ---------------- Render ---------------- */
  return (
    <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-6 xl:px-8">
      {/* HIER: keine zentrierte max-width mehr */}
      <div className="w-full">
        {/* Zur Übersicht */}
        <div className="mb-4 flex items-center justify-start">
          <Link href="/dashboard/kunde" className={btnWhite}>
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="ml-1">Zur Übersicht</span>
          </Link>
        </div>

        {/* Header */}
        <div
          className="relative mb-5 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:mb-6 sm:p-5"
          style={{
            backgroundImage:
              'radial-gradient(1000px 400px at 110% -30%, rgba(15,23,42,0.07), transparent)',
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {customer.first_name} {customer.last_name}
              </h1>
              {customer.company && (
                <p className="truncate text-sm text-slate-700">
                  {customer.company}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Kundennummer:{' '}
                <span className="font-mono tabular-nums">
                  {customer.customer_number ?? '—'}
                </span>
              </p>
            </div>
            <div className="mt-2 sm:mt-0">
              <StatusBadge value={customer.status} />
            </div>
          </div>
        </div>

        {/* Kundendaten */}
        <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-[13px]">
              Kundendaten
            </h2>
            <Link href={`?edit=1#edit`} className={btnWhite}>
              Bearbeiten
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <GlassTile
              title="Unternehmen"
              value={customer.company}
              Icon={BuildingOfficeIcon}
            />
            <GlassTile
              title="E-Mail"
              value={customer.email}
              Icon={EnvelopeIcon}
            />
            <GlassTile title="Telefon" value={customer.phone} Icon={PhoneIcon} />
            <GlassTile
              title="Adresse"
              value={customer.address}
              Icon={MapPinIcon}
            />
            <GlassTile
              title="Kundennummer"
              value={customer.customer_number}
              Icon={IdentificationIcon}
            />
            <GlassTile
              title="Status"
              value={customer.status}
              Icon={TagIcon}
            />
          </div>

          {editRequested && (
            <div id="edit" className="mt-5">
              <EditCustomerForm customer={customer} />
            </div>
          )}
        </section>

        {/* KPIs */}
        <section className="mt-5 grid grid-cols-1 gap-3 md:mt-6 md:grid-cols-3">
          <StatTile
            title="Gesamtumsatz (brutto)"
            value={euro(totalRevenue)}
            HintIcon={BanknotesIcon}
          />
          <StatTile
            title="Angenommene Angebote"
            value={`${acceptedOffers}`}
            HintIcon={CheckCircleIcon}
          />
          <StatTile
            title="Conversion (Angebot → AB)"
            value={conversion === null ? '—' : `${conversion}%`}
            HintIcon={ChartPieIcon}
          />
        </section>

        {/* Angebots-/AB-/Rechnungslisten */}
        <section className="mt-7 sm:mt-8">
          <h2 className="mb-3 text-base font-semibold text-slate-900 sm:text-lg">
            Angebote
          </h2>
          <ExpandableGrid
            cards={offerCards}
            limit={3}
            empty={
              <p className="text-sm text-slate-500">
                Für diesen Kunden liegen noch keine Angebote vor.
              </p>
            }
          />
        </section>

        <section className="mt-7 sm:mt-8">
          <h2 className="mb-3 text-base font-semibold text-slate-900 sm:text-lg">
            Auftragsbestätigungen
          </h2>
          <ExpandableGrid
            cards={ocCards}
            limit={3}
            empty={
              <p className="text-sm text-slate-500">
                Noch keine Auftragsbestätigungen vorhanden.
              </p>
            }
          />
        </section>

        <section className="mt-7 sm:mt-8">
          <h2 className="mb-3 text-base font-semibold text-slate-900 sm:text-lg">
            Rechnungen
          </h2>
          <ExpandableGrid
            cards={invoiceCards}
            limit={3}
            empty={
              <p className="text-sm text-slate-500">
                Für diesen Kunden liegen noch keine Rechnungen vor.
              </p>
            }
          />
        </section>

        {/* Notizen */}
        <div className="mt-7 sm:mt-8">
          <NotesPanel customerId={customer.id} initialNotes={initialNotes} />
        </div>
      </div>
    </div>
  )
}
