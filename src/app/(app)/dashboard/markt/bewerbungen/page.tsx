import Link from 'next/link'
import { headers } from 'next/headers'

type ApplicationRow = {
  id: string
  status: string
  created_at: string
  partner_id: string
  partner_display: string
  files_count: number
  request: {
    id: string
    status: string | null
    category: string | null
    city: string | null
    zip: string | null
    execution: string | null
    summary: string | null
    created_at: string
  } | null
}

/* --------------------------- UI Tokens --------------------------- */

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(2,6,23,0.06)] ring-1 ring-white/70'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-xl px-3 py-2 text-xs sm:text-sm text-slate-900 ' +
  'shadow-sm hover:bg-white hover:shadow-md transition'

/* ----------------------- Helpers ----------------------- */

function normalizeApplicationStatus(value: string | null | undefined) {
  const v = String(value || '').trim().toLowerCase()

  const labelMap: Record<string, string> = {
    eingereicht: 'Eingereicht',
    angenommen: 'Angenommen',
    abgelehnt: 'Abgelehnt',
    zurückgezogen: 'Zurückgezogen',
    zurueckgezogen: 'Zurückgezogen',
  }

  const styleMap: Record<string, string> = {
    eingereicht: 'bg-slate-100 text-slate-700 ring-slate-200',
    angenommen: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    abgelehnt: 'bg-rose-50 text-rose-700 ring-rose-200',
    zurückgezogen: 'bg-amber-50 text-amber-700 ring-amber-200',
    zurueckgezogen: 'bg-amber-50 text-amber-700 ring-amber-200',
  }

  return {
    label:
      labelMap[v] ??
      (value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'),
    cls: styleMap[v] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
  }
}

function normalizeExecution(value: string | null | undefined) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return ''
  if (['vorort', 'vor ort', 'vor_ort', 'vor-ort'].includes(v)) return 'Vor Ort'
  if (v === 'digital') return 'Digital'
  if (value === 'vorOrt') return 'Vor Ort'
  return value || ''
}

function StatusBadge({ value }: { value: string }) {
  const norm = normalizeApplicationStatus(value)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs ring-1 ${norm.cls}`}
    >
      {norm.label}
    </span>
  )
}

/* ------------------------------ Data ---------------------------------- */

async function loadApplications(): Promise<{
  ok: boolean
  applications?: ApplicationRow[]
  error?: string
}> {
  const h = await headers() // ✅ jetzt korrekt
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  if (!host) return { ok: false, error: 'no_host_header' }

  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/partners/applications/mine`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const j = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    return {
      ok: false,
      error: j?.error || res.statusText || 'load_failed',
    }
  }

  return {
    ok: true,
    applications: (j.applications || []) as ApplicationRow[],
  }
}

/* ------------------------------ Page ---------------------------------- */

const PAGE_SIZE = 10

export default async function BewerbungenPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const pageParam = Number(searchParams?.page ?? '1')
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const { ok, applications, error } = await loadApplications()

  const total = ok && applications ? applications.length : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const pageItems =
    ok && applications ? applications.slice(start, end) : []

  const hasApps = ok && total > 0

  const pageHref = (p: number) =>
    `/dashboard/markt/bewerbungen${p > 1 ? `?page=${p}` : ''}`

  const pageNums = (() => {
    const out: (number | '…')[] = []
    const maxBtns = 7
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) out.push(i)
    } else {
      const w = 2
      const s = Math.max(2, safePage - w)
      const e = Math.min(totalPages - 1, safePage + w)
      out.push(1)
      if (s > 2) out.push('…')
      for (let i = s; i <= e; i++) out.push(i)
      if (e < totalPages - 1) out.push('…')
      out.push(totalPages)
    }
    return out
  })()

  return (
    <div className={shellBg}>
      {/* HERO */}
      <section
        className={`${cardBase} relative mb-6 overflow-hidden px-4 sm:px-5 py-4 sm:py-5`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_260px_at_-10%_-40%,rgba(15,23,42,0.05),transparent_70%),radial-gradient(900px_260px_at_110%_140%,rgba(15,23,42,0.07),transparent_70%)]"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
              <span>GLENO Markt</span>
              <span className="text-slate-300">•</span>
              <span>Bewerbungen</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Deine Bewerbungen im Überblick.
            </h1>
            <p className="max-w-3xl text-xs sm:text-sm text-slate-600">
              Alle Bewerbungen über deine Partnerprofile mit Status,
              Kurzbeschreibung und Direkt-Link zur Anfrage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <Link href="/dashboard/markt/anfragen" className={btnGhost}>
              Zu den Markt-Anfragen
            </Link>
          </div>
        </div>
      </section>

      {/* LISTE */}
      <section className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5`}>
        {!ok && (
          <div className="text-sm text-rose-700">
            Fehler beim Laden deiner Bewerbungen:{' '}
            <span className="font-medium">
              {error || 'Unbekannter Fehler'}
            </span>
          </div>
        )}

        {ok && !hasApps && (
          <div className="text-sm text-slate-600">
            Du hast aktuell noch keine Bewerbungen abgegeben.
          </div>
        )}

        {hasApps && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pageItems.map((r) => {
                const exec = normalizeExecution(r.request?.execution)
                const req = r.request
                return (
                  <article
                    key={r.id}
                    className={
                      'group rounded-2xl border border-white/70 bg-white/95 px-4 py-3 ' +
                      'ring-1 ring-white/70 backdrop-blur-xl shadow-[0_4px_18px_rgba(15,23,42,0.06)] ' +
                      'hover:shadow-[0_10px_26px_rgba(15,23,42,0.10)] hover:bg-white transition'
                    }
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={r.status} />
                          <span className="text-[10px] sm:text-xs text-slate-400">
                            #{r.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500">
                          {r.files_count} Datei
                          {r.files_count === 1 ? '' : 'en'}
                        </div>
                      </div>

                      <div className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-2">
                        {req?.summary || 'Ohne Kurzbeschreibung'}
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-600">
                        {req?.category && <span>{req.category}</span>}
                        {(req?.zip || req?.city) && (
                          <span>
                            {[req.zip, req.city]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        )}
                        {exec && <span>Modus: {exec}</span>}
                        <span>
                          Erstellt am{' '}
                          {new Date(
                            req?.created_at || r.created_at
                          ).toLocaleDateString('de-DE')}
                        </span>
                      </div>

                      <div className="text-[10px] sm:text-xs text-slate-500">
                        Profil:{' '}
                        <span className="font-medium text-slate-900">
                          {r.partner_display}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {req?.id && (
                        <Link
                          href={`/dashboard/markt/anfragen/${req.id}`}
                          className={
                            'inline-flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/95 ' +
                            'px-3 py-1.5 text-[10px] sm:text-xs text-slate-900 shadow-sm hover:bg-white hover:shadow-md transition'
                          }
                        >
                          Anfrage öffnen
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/markt/bewerbungen/${r.id}`}
                        className={
                          'inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 text-white ' +
                          'px-3 py-1.5 text-[10px] sm:text-xs shadow-[0_8px_24px_rgba(15,23,42,0.35)] hover:bg-slate-950 hover:shadow-[0_12px_32px_rgba(15,23,42,0.45)] transition'
                        }
                      >
                        Details
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-xs text-slate-600">
                <div>
                  Seite <strong>{safePage}</strong> von{' '}
                  <strong>{totalPages}</strong> · {total} Bewerbungen
                </div>
                <nav className="flex items-center gap-1">
                  <Link
                    href={pageHref(Math.max(1, safePage - 1))}
                    aria-disabled={safePage === 1}
                    className={
                      'rounded-2xl border border-white/70 bg-white/95 px-2.5 py-1.5 shadow-sm ' +
                      (safePage === 1
                        ? 'pointer-events-none opacity-40'
                        : 'hover:bg:white hover:shadow-md')
                    }
                  >
                    ← Zurück
                  </Link>
                  {pageNums.map((n, i) =>
                    n === '…' ? (
                      <span
                        key={`el-${i}`}
                        className="px-1.5 text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        key={n}
                        href={pageHref(n as number)}
                        aria-current={
                          n === safePage ? 'page' : undefined
                        }
                        className={
                          'rounded-2xl px-2.5 py-1.5 border text-[10px] sm:text-xs ' +
                          (n === safePage
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white/95 border-white/70 text-slate-800 hover:bg-white hover:shadow-sm')
                        }
                      >
                        {n}
                      </Link>
                    )
                  )}
                  <Link
                    href={pageHref(
                      Math.min(totalPages, safePage + 1)
                    )}
                    aria-disabled={safePage === totalPages}
                    className={
                      'rounded-2xl border border-white/70 bg-white/95 px-2.5 py-1.5 shadow-sm ' +
                      (safePage === totalPages
                        ? 'pointer-events-none opacity-40'
                        : 'hover:bg:white hover:shadow-md')
                    }
                  >
                    Weiter →
                  </Link>
                </nav>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
