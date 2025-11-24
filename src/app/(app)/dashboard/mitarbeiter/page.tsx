import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import AddEmployeeModal from './AddEmployeeModal'
import EmployeeRowActions from './EmployeeRowActions'
import EmployeeFilterBar from './EmployeeFilterBar'
import { UsersIcon } from '@heroicons/react/24/outline'

type Status = 'Aktiv' | 'Deaktiviert' | 'Gelöscht'
const PAGE_SIZE = 10

export default async function MitarbeiterPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: 'Aktiv' | 'Deaktiviert' | 'Gelöscht' | 'alle'
    sort?: 'desc' | 'asc'
    page?: string
  }>
}) {
  const sp = await searchParams

  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const qRaw = (sp?.q ?? '').trim()
  const statusParam =
    (sp?.status as 'Aktiv' | 'Deaktiviert' | 'Gelöscht' | 'alle') || 'alle'
  const sort = (sp?.sort as 'desc' | 'asc') || 'desc'
  const page = Math.max(1, Number(sp?.page ?? '1') || 1)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query
  let query = supabase
    .from('employees')
    .select(
      `
      id, first_name, last_name, email, phone,
      role, specialization, start_date, created_at, status,
      city, employment_type
    `,
      { count: 'exact' },
    )
    .eq('user_id', user.id)

  if (statusParam !== 'alle') query = query.eq('status', statusParam)

  if (qRaw) {
    const like = `%${qRaw}%`
    // Suche über Name, Kontakt, Rolle, Spezialisierung & Ort
    query = query.or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `role.ilike.${like}`,
        `specialization.ilike.${like}`,
        `city.ilike.${like}`,
        `employment_type.ilike.${like}`,
      ].join(','),
    )
  }

  query = query
    .order('created_at', { ascending: sort === 'asc' })
    .range(from, to)

  const {
    data: rows,
    count,
    error: qErr,
  } = await query
  if (qErr) console.error(qErr)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams()
    if (qRaw) params.set('q', qRaw)
    if (statusParam !== 'alle') params.set('status', statusParam)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    return `/dashboard/mitarbeiter?${params.toString()}`
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
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] p-4 text-slate-700 sm:p-6">
      {/* HERO */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] text-slate-700 backdrop-blur">
              <UsersIcon className="h-4 w-4 text-slate-900" />
              Mitarbeiter – Übersicht
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Team &amp; Verwaltung
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Suchen, filtern, anlegen und Status verwalten.
            </p>
          </div>
          <div className="relative z-[1] flex gap-2">
            <AddEmployeeModal />
          </div>
        </div>
      </div>

      {/* FILTERBAR */}
      <EmployeeFilterBar />

      {/* LISTE */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/65 p-0 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
        <div className="relative">
          {/* Desktop (nur sehr große Screens) */}
          <div className="hidden xl:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur">
                  <tr className="text-[12.5px] uppercase tracking-wide text-slate-700">
                    {[
                      'Name',
                      'E-Mail',
                      'Telefon',
                      'Rolle',
                      'Spezialisierung',
                      'Ort',
                      'Anstellung',
                      'Eingestellt am',
                      'Status',
                      'Aktion',
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                  {(rows ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center italic text-slate-600"
                      >
                        Keine Treffer.
                      </td>
                    </tr>
                  )}

                  {(rows ?? []).map((emp: any) => (
                    <tr
                      key={emp.id}
                      className="transition-colors hover:bg-white/80"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium">
                        <Link
                          href={`/dashboard/mitarbeiter/${emp.id}`}
                          className="text-slate-900 no-underline outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-300 hover:underline"
                          title="Mitarbeiter öffnen"
                        >
                          {emp.first_name} {emp.last_name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.email || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.phone || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.role || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.specialization || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.city || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {emp.employment_type || '–'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm italic">
                        {emp.start_date
                          ? new Date(emp.start_date).toLocaleDateString(
                              'de-DE',
                            )
                          : new Date(
                              emp.created_at,
                            ).toLocaleDateString('de-DE')}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={emp.status as Status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <EmployeeRowActions
                          id={emp.id}
                          status={emp.status as Status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile + Tablet + kleiner Desktop -> Kartenlayout */}
          <div className="xl:hidden">
            {!rows || rows.length === 0 ? (
              <div className="p-6 text-center text-sm italic text-slate-700">
                Keine Treffer.
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {rows.map((emp: any) => (
                  <li key={emp.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/mitarbeiter/${emp.id}`}
                          className="line-clamp-1 text-base font-semibold text-slate-900 no-underline hover:underline"
                        >
                          {emp.first_name} {emp.last_name}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                          {emp.role || '—'}
                          {emp.specialization
                            ? ` · ${emp.specialization}`
                            : ''}
                        </div>
                        {emp.city && (
                          <div className="text-xs text-slate-500 sm:text-sm">
                            {emp.city}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                          Eingestellt am{' '}
                          {emp.start_date
                            ? new Date(
                                emp.start_date,
                              ).toLocaleDateString('de-DE')
                            : new Date(
                                emp.created_at,
                              ).toLocaleDateString('de-DE')}
                        </div>
                        {(emp.email || emp.phone) && (
                          <div className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                            {emp.email || '–'}
                            {emp.phone ? ` · ${emp.phone}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={emp.status as Status} small />
                        <EmployeeRowActions
                          id={emp.id}
                          status={emp.status as Status}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pager */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/70 px-3 py-3 text-xs backdrop-blur sm:px-4">
            <div className="text-[11px] text-slate-600 sm:text-xs">
              Seite <strong>{safePage}</strong> von{' '}
              <strong>{totalPages}</strong> · {total} Einträge
            </div>
            <nav className="flex items-center gap-1">
              <Link
                href={hrefForPage(Math.max(1, safePage - 1))}
                aria-disabled={safePage === 1}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-xs shadow hover:bg-white sm:text-sm ${
                  safePage === 1
                    ? 'pointer-events-none opacity-40'
                    : ''
                }`}
              >
                ← Zurück
              </Link>
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span
                    key={`el-${i}`}
                    className="px-2 text-xs text-slate-500"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={hrefForPage(n as number)}
                    aria-current={n === safePage ? 'page' : undefined}
                    className={[
                      'rounded-lg border px-3 py-1.5 text-xs shadow sm:text-sm',
                      n === safePage
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-white/60 bg-white/80 hover:bg-white',
                    ].join(' ')}
                  >
                    {n}
                  </Link>
                ),
              )}
              <Link
                href={hrefForPage(Math.min(totalPages, safePage + 1))}
                aria-disabled={safePage === totalPages}
                className={`rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-xs shadow hover:bg-white sm:text-sm ${
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
    </div>
  )
}

function StatusBadge({ status, small }: { status: Status; small?: boolean }) {
  const size = small ? 'text-[11px]' : 'text-xs'
  const tone =
    status === 'Aktiv'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200/60'
      : status === 'Deaktiviert'
      ? 'bg-amber-100 text-amber-800 ring-amber-200/60'
      : 'bg-rose-100 text-rose-800 ring-rose-200/60'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-1 font-medium ring-1 ring-inset',
        size,
        tone,
      ].join(' ')}
    >
      {status}
    </span>
  )
}
