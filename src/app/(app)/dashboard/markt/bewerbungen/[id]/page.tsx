import Link from 'next/link'
import { headers } from 'next/headers'

type AppFile = {
  id: string
  path: string
  name: string | null
  size: number | null
  content_type: string | null
  uploaded_at: string
  signed_url: string | null
}

type AppDetail = {
  id: string
  status: string
  created_at: string
  message_html: string | null
  partner_display: string
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
  files: AppFile[]
}

/* --------------------------- UI Tokens --------------------------- */

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(15,23,42,0.06)] ring-1 ring-white/70'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-xl px-3 py-2 text-xs sm:text-sm text-slate-900 ' +
  'shadow-sm hover:bg-white hover:shadow-md transition'

/* ------------------------ Status Badge -------------------------- */

function norm(s: string) {
  return (s || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
}

function tStatus(value: string) {
  const v = norm(value)
  const map: Record<string, { de: string; cls: string }> = {
    eingereicht: {
      de: 'Eingereicht',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    pending: {
      de: 'Offen',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    'in-review': {
      de: 'In Prüfung',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    accepted: {
      de: 'Angenommen',
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    rejected: {
      de: 'Abgelehnt',
      cls: 'bg-rose-50 text-rose-700 ring-rose-200',
    },
    declined: {
      de: 'Abgelehnt',
      cls: 'bg-rose-50 text-rose-700 ring-rose-200',
    },
    withdrawn: {
      de: 'Zurückgezogen',
      cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
  }
  return (
    map[v] ?? {
      de: value || '—',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200',
    }
  )
}

function StatusBadge({ value }: { value: string }) {
  const t = tStatus(value)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs ring-1 ${t.cls}`}
    >
      {t.de}
    </span>
  )
}

/* ----------------------------- Data ------------------------------ */

async function loadDetail(
  id: string
): Promise<{ ok: boolean; application?: AppDetail; error?: string }> {
  const h = await headers() // ✅ hier auch async
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  if (!host) return { ok: false, error: 'no_host_header' }

  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/partners/applications/${id}`, {
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

  return { ok: true, application: j.application as AppDetail }
}

/* ----------------------------- Page ------------------------------ */

export default async function BewerbungDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { ok, application, error } = await loadDetail(params.id)

  if (!ok || !application) {
    return (
      <div className={shellBg}>
        <section
          className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5 mb-4 flex flex-col gap-3`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
                <span>GLENO Markt</span>
                <span className="text-slate-300">•</span>
                <span>Bewerbung</span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Bewerbung
              </h1>
            </div>
            <Link href="/dashboard/markt/bewerbungen" className={btnGhost}>
              Zur Übersicht
            </Link>
          </div>
          <div className="text-sm text-rose-700">
            Fehler beim Laden: {error || 'Unbekannter Fehler'}
          </div>
        </section>
      </div>
    )
  }

  const a = application

  return (
    <div className={shellBg}>
      {/* HEADER */}
      <section
        className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5 mb-4 relative overflow-hidden`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(800px_220px_at_-10%_-40%,rgba(15,23,42,0.05),transparent_70%),radial-gradient(800px_220px_at_110%_140%,rgba(15,23,42,0.07),transparent_70%)]"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
              <span>GLENO Markt</span>
              <span className="text-slate-300">•</span>
              <span>Bewerbung</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Bewerbung #{a.id.slice(0, 8)}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-600">
              Abgegeben für Profil{' '}
              <span className="font-medium text-slate-900">
                {a.partner_display}
              </span>{' '}
              am{' '}
              <span className="font-medium text-slate-900">
                {new Date(a.created_at).toLocaleString('de-DE')}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            {a.request?.id && (
              <Link
                href={`/dashboard/markt/anfragen/${a.request.id}`}
                className={btnGhost}
              >
                Anfrage öffnen
              </Link>
            )}
            <Link
              href="/dashboard/markt/bewerbungen"
              className={btnGhost}
            >
              Zur Übersicht
            </Link>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5`}>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Meta */}
          <div className="md:col-span-1 space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs text-slate-500 mb-1">
                Status
              </div>
              <StatusBadge value={a.status} />
              <div className="mt-3 text-[10px] sm:text-xs text-slate-500">
                Erstellt am
              </div>
              <div className="text-xs sm:text-sm text-slate-900">
                {new Date(a.created_at).toLocaleString('de-DE')}
              </div>
              <div className="mt-3 text-[10px] sm:text-xs text-slate-500">
                Partnerprofil
              </div>
              <div className="text-xs sm:text-sm text-slate-900">
                {a.partner_display}
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-900">
                Zugehörige Anfrage
              </div>
              <div className="mt-1 text-xs sm:text-sm text-slate-700">
                {a.request?.summary || 'Ohne Kurzbeschreibung'}
              </div>
              <div className="mt-2 text-[10px] sm:text-xs text-slate-500">
                {[
                  a.request?.category,
                  [a.request?.zip, a.request?.city]
                    .filter(Boolean)
                    .join(' '),
                  a.request?.execution
                    ? `Modus: ${a.request.execution}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </div>

          {/* Nachricht & Dateien */}
          <div className="md:col-span-2 space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-900 mb-2">
                Deine Nachricht
              </div>
              {a.message_html ? (
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: a.message_html }}
                />
              ) : (
                <div className="text-sm text-slate-500">
                  Keine Nachricht hinterlegt.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-900 mb-2">
                Unterlagen
              </div>
              {a.files && a.files.length > 0 ? (
                <ul className="divide-y divide-slate-200/80">
                  {a.files.map((f) => {
                    const fileName =
                      f.name || f.path.split('/').pop() || 'Datei'
                    const sizeKb =
                      f.size != null
                        ? Math.max(1, Math.round(f.size / 1024))
                        : null
                    return (
                      <li
                        key={f.id}
                        className="py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-slate-900 truncate">
                            {fileName}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500">
                            {sizeKb
                              ? `${sizeKb} KB`
                              : 'Größe unbekannt'}{' '}
                            · {f.content_type || 'Typ unbekannt'}
                          </div>
                        </div>
                        {f.signed_url ? (
                          <a
                            href={f.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-2xl border border-white/70 bg-white px-3 py-1.5 text-[10px] sm:text-xs text-slate-900 shadow-sm hover:bg-white hover:shadow-md transition"
                          >
                            Öffnen
                          </a>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-rose-600">
                            Kein Zugriff
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">
                  Keine Dateien hochgeladen.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
