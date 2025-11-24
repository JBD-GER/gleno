import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import AddCustomerModal from './AddCustomerModal'
import ImportCustomersModal from './ImportCustomerModal'
import FilterBar from './FilterBar'
import CustomerRowActions from './CustomerRowAction'
import { UsersIcon } from '@heroicons/react/24/outline'

type Status = 'Lead' | 'Kunde' | 'Deaktiviert'
const PAGE_SIZE = 10

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: 'Lead' | 'Kunde' | 'Deaktiviert' | 'alle'
    sort?: 'desc' | 'asc'
    page?: string
  }>
}) {
  const sp = await searchParams

  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const statusParam =
    (sp?.status as 'Lead' | 'Kunde' | 'Deaktiviert' | 'alle') || 'alle'
  const sort = (sp?.sort as 'desc' | 'asc') || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // --- Query ---------------------------------------------------------------
  let query = supabase
    .from('customers')
    .select(
      'id, company, first_name, last_name, email, phone, address, status, created_at',
      { count: 'exact' }
    )
    .eq('user_id', user.id)

  if (statusParam !== 'alle') query = query.eq('status', statusParam)

  if (qRaw) {
    const like = `%${qRaw}%`
    query = query.or(
      [
        `company.ilike.${like}`,
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `address.ilike.${like}`,
      ].join(',')
    )
  }

  query = query
    .order('created_at', { ascending: sort === 'asc' })
    .range(from, to)

  const { data: rows, count, error } = await query
  if (error) console.error(error)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (statusParam !== 'alle') params.set('status', statusParam)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/kunde?${params.toString()}`
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
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] p-4 text-slate-700 sm:p-5 lg:p-6">
      {/* HERO */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl sm:mb-6 sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-[11px] text-slate-700 backdrop-blur sm:px-3">
              <UsersIcon className="h-4 w-4 text-slate-900" />
              Kunden – Übersicht
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:mt-3 sm:text-2xl">
              Übersicht & Schnellaktionen
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Alle Kunden im Blick. Suchen, filtern, importieren oder neue
              Kunden anlegen.
            </p>
          </div>
          <div className="relative z-[1] flex flex-wrap gap-2 sm:flex-nowrap">
            <AddCustomerModal />
            <ImportCustomersModal />
          </div>
        </div>
      </div>

      {/* FILTERBAR */}
      <FilterBar />

      {/* LISTE */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/65 p-0 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
        <div className="relative">
          {/* Desktop-Tabelle nur ab XL */}
          <div className="hidden xl:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur">
                  <tr className="text-[12.5px] uppercase tracking-wide text-slate-700">
                    {[
                      'Name',
                      'Firma',
                      'E-Mail',
                      'Telefon',
                      'Adresse',
                      'Status',
                      'Erstellt am',
                      'Aktion',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-xs font-semibold lg:text-[13px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/70">
                  {(rows ?? []).map((c: any) => (
                    <tr
                      key={c.id}
                      className="text-sm transition-colors hover:bg-white/80"
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-medium">
                        <Link
                          href={`/dashboard/kunde/${c.id}`}
                          className="text-slate-900 no-underline outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-300 hover:underline"
                          title="Kundendetails öffnen"
                        >
                          {c.first_name} {c.last_name}
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {c.company || '–'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {c.email || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {c.phone || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {c.address || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={c.status as Status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {new Date(c.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        <CustomerRowActions
                          id={c.id}
                          status={c.status as Status}
                        />
                      </td>
                    </tr>
                  ))}
                  {(!rows || rows.length === 0) && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-sm italic text-slate-600"
                      >
                        Keine Treffer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet: Karten-Ansicht (bis < XL) */}
          <div className="xl:hidden">
            {(!rows || rows.length === 0) ? (
              <div className="p-5 text-center text-sm italic text-slate-700">
                Keine Treffer.
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {rows.map((c: any) => (
                  <li key={c.id} className="px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/kunde/${c.id}`}
                          className="block text-[15px] font-semibold text-slate-900 no-underline hover:underline"
                        >
                          {c.first_name} {c.last_name}
                        </Link>
                        {c.company && (
                          <div className="truncate text-xs font-medium text-slate-700 sm:text-sm">
                            {c.company}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-slate-600 sm:text-sm">
                          {c.email || '–'}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </div>
                        {c.address && (
                          <div className="mt-0.5 text-xs text-slate-500 sm:text-[13px]">
                            {c.address}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-400">
                          Erstellt am{' '}
                          {new Date(c.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={c.status as Status} small />
                        <CustomerRowActions
                          id={c.id}
                          status={c.status as Status}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pager */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/70 px-3 py-2.5 text-xs backdrop-blur sm:px-4 sm:py-3">
            <div className="text-[11px] text-slate-600 sm:text-xs">
              Seite <strong>{safePage}</strong> von{' '}
              <strong>{totalPages}</strong> · {total} Einträge
            </div>
            <nav className="flex items-center gap-1">
              <Link
                href={hrefForPage(Math.max(1, safePage - 1))}
                aria-disabled={safePage === 1}
                className={`rounded-lg border border-white/60 bg-white/80 px-2.5 py-1 text-[11px] shadow hover:bg-white sm:px-3 sm:text-xs ${
                  safePage === 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                ← Zurück
              </Link>
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span
                    key={`el-${i}`}
                    className="px-1.5 text-[11px] text-slate-500 sm:px-2 sm:text-xs"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={hrefForPage(n as number)}
                    aria-current={n === safePage ? 'page' : undefined}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-[11px] shadow sm:px-3 sm:text-xs',
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
                className={`rounded-lg border border-white/60 bg-white/80 px-2.5 py-1 text-[11px] shadow hover:bg-white sm:px-3 sm:text-xs ${
                  safePage === totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Weiter →
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, small }: { status: Status; small?: boolean }) {
  const size = small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'
  const tone =
    status === 'Lead'
      ? 'bg-amber-100 text-amber-800 ring-amber-200/60'
      : status === 'Kunde'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200/60'
      : 'bg-rose-100 text-rose-800 ring-rose-200/60'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        size,
        tone,
      ].join(' ')}
    >
      {status}
    </span>
  )
}
