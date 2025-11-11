// src/app/(consument)/konsument/aktive-anfragen/page.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

type KonsumentActiveItem = {
  request: {
    id: string
    status: string
    summary: string | null
    category: string | null
    city: string | null
    zip: string | null
    execution: string | null
    budget_min: number | null
    budget_max: number | null
    created_at: string
  }
  application: {
    id: string
    status: string
    partner_id: string
    accepted_at: string
    partner: {
      id: string
      display_name: string | null
      company_name: string | null
      city: string | null
      website: string | null
      logo_path: string | null
    } | null
  } | null
}

/* Layout / Styles */
const shellBg =
  'min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.04),transparent_65%)]'

const glassHeader =
  'rounded-3xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-white/70'

const itemCard =
  'rounded-3xl border border-slate-100/95 bg-white/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_22px_55px_rgba(15,23,42,0.10)] transition-shadow'

/* Data Loader */
async function loadData(): Promise<{ ok: boolean; items: KonsumentActiveItem[]; error?: string }> {
  try {
    const h = await headers() // in deinem Setup Promise-typisiert

    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    const cookie = h.get('cookie') ?? ''

    if (!host) {
      return { ok: false, items: [], error: 'Kein Host-Header vorhanden.' }
    }

    const res = await fetch(`${proto}://${host}/api/konsument/active-requests`, {
      cache: 'no-store',
      headers: { cookie },
    })

    const j = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        items: [],
        error: j?.error || res.statusText || 'Unbekannter Fehler beim Laden.',
      }
    }

    return { ok: true, items: (j.items || []) as KonsumentActiveItem[] }
  } catch (e: any) {
    return {
      ok: false,
      items: [],
      error: e?.message || 'Fehler beim Laden der Daten.',
    }
  }
}

/* Helpers */
function formatExecution(v: string | null | undefined) {
  if (!v) return '—'
  const x = v.toLowerCase()
  if (x === 'vorort' || x === 'vor-ort' || x === 'vor_ort' || v === 'vorOrt') return 'Vor Ort'
  if (x === 'digital') return 'Digital'
  return v
}

/* Page */
export default async function KonsumentAktiveAnfragenPage() {
  const { ok, items, error } = await loadData()
  const hasItems = ok && items.length > 0

  return (
    <div className={shellBg}>
      <div className="px-4 py-6 lg:px-10 lg:py-8 space-y-6">

        {/* Glass Header */}
        <div className={`${glassHeader} px-5 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-slate-700 border border-white">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Übersicht Ihrer aktiven Aufträge
            </div>
            <h1 className="text-xl lg:text-2xl font-semibold text-slate-900">
              Aktive Anfragen
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 max-w-2xl">
              Hier sehen Sie alle Anfragen, bei denen Sie bereits eine Bewerbung eines Partners
              angenommen haben. Von hier aus können Sie Details einsehen und direkt mit Ihrem
              Handwerker chatten.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/konsument/anfragen"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white px-4 py-2 text-xs lg:text-sm text-slate-900 shadow-sm hover:shadow-md transition"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Zu meinen Anfragen
            </Link>

            {hasItems && (
              <span className="text-[10px] text-slate-500">
                {items.length} aktive Anfrage{items.length === 1 ? '' : 'n'}
              </span>
            )}
          </div>
        </div>

        {/* Fehleranzeige */}
        {!ok && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/95 px-4 py-3 text-sm text-rose-800 shadow-sm">
            Fehler beim Laden der aktiven Anfragen:
            <span className="ml-1 font-medium">
              {error || 'Unbekannter Fehler.'}
            </span>
          </div>
        )}

        {/* Keine aktiven Anfragen */}
        {ok && items.length === 0 && (
          <div className={`${glassHeader} px-5 py-5`}>
            <div className="text-sm text-slate-800">
              Aktuell haben Sie keine aktiven Anfragen.
            </div>
            <p className="text-xs text-slate-500 mt-2 max-w-xl">
              Sobald Sie eine Bewerbung eines Partners annehmen, erscheint die Anfrage automatisch
              hier in der Übersicht.
            </p>
            <div className="mt-4">
              <Link
                href="/konsument/anfragen"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2 text-xs shadow-sm hover:opacity-90 transition"
              >
                Zu meinen Anfragen
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Grid: 2 Karten pro Zeile */}
        {ok && items.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const r = item.request
              const app = item.application

              const partnerName =
                app?.partner?.display_name ||
                app?.partner?.company_name ||
                (app ? 'Angenommener Partner' : '—')

              const location = [r.zip, r.city].filter(Boolean).join(' ')
              const title =
                r.summary ||
                [r.category, location].filter(Boolean).join(' – ') ||
                'Anfrage'

              const chatHref = app
                ? `/konsument/chat?requestId=${encodeURIComponent(
                    r.id
                  )}&applicationId=${encodeURIComponent(
                    app.id
                  )}&partnerId=${encodeURIComponent(app.partner_id)}`
                : undefined

              return (
                <div key={r.id} className={`${itemCard} px-5 py-4 flex flex-col gap-3`}>
                  {/* Kopfbereich */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mb-1">
                        <span>Anfrage #{r.id.slice(0, 8)}</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                        <span>
                          erstellt am {new Date(r.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <h2 className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {title}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                        {r.category && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                            {r.category}
                          </span>
                        )}
                        {location && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                            {location}
                          </span>
                        )}
                        {r.execution && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                            Modus: {formatExecution(r.execution)}
                          </span>
                        )}
                        {r.budget_min != null && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                            Budget: {r.budget_min} € – {r.budget_max ?? '—'} €
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Partnerinfo */}
                  {app && (
                    <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
                      <div>
                        Partner angenommen am{' '}
                        <span className="font-medium text-slate-800">
                          {new Date(app.accepted_at).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div>
                        Partner:{' '}
                        <span className="font-medium text-slate-800">{partnerName}</span>
                        {app.partner?.city && (
                          <span className="text-slate-400"> · {app.partner.city}</span>
                        )}
                      </div>
                      {app.partner?.website && (
                        <div>
                          <a
                            href={app.partner.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-600 hover:underline"
                          >
                            Website des Partners öffnen
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions inkl. Chat */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/konsument/anfragen/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-100 bg-white px-3 py-1.5 text-[10px] text-slate-900 hover:shadow-sm transition"
                    >
                      Anfrage öffnen
                    </Link>

                    {app && (
                      <Link
                        href={`/konsument/anfragen/${r.id}/bewerbungen/${app.id}`}
                        className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 text-white px-3 py-1.5 text-[10px] hover:opacity-90 transition"
                      >
                        Angenommene Bewerbung
                      </Link>
                    )}

                    {/* Ein Chat-Button pro Karte */}
                    {chatHref && (
                      <Link
                        href={chatHref}
                        className="inline-flex items-center gap-1 rounded-2xl bg-sky-600 text-white px-3 py-1.5 text-[10px] hover:bg-sky-500 transition"
                      >
                        Chat mit Partner
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 12h14M13 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
