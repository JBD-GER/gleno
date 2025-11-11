import Link from 'next/link'
import { headers } from 'next/headers'

type Item = {
  conversation_id: string
  request_id: string
  updated_at: string
  request: {
    id: string
    status: string | null
    summary: string | null
    category: string | null
    city: string | null
    zip: string | null
    created_at: string
  } | null
  partner: {
    id: string
    display: string
    logo_path: string | null
    city: string | null
  } | null
}

/* ---------------- UI Tokens ---------------- */

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(15,23,42,0.06)] ring-1 ring-white/70'

const btnPrimary =
  'inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-3 py-2 ' +
  'text-xs sm:text-sm font-semibold shadow-[0_10px_30px_rgba(15,23,42,0.35)] ' +
  'hover:bg-slate-950 hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition'

/* ---------------- Data Loader ---------------- */

async function loadItems(): Promise<{
  ok: boolean
  items?: Item[]
  error?: string
}> {
  const h = await headers() // ✅ wichtig: await, damit TS nicht meckert
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  if (!host) return { ok: false, error: 'no_host_header' }

  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/partners/chat/list`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const j = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    return { ok: false, error: j?.error || res.statusText || 'load_failed' }
  }

  return { ok: true, items: (j.items || []) as Item[] }
}

/* ---------------- Helpers ---------------- */

function StatusBadge({ value }: { value?: string | null }) {
  const raw = (value ?? '').toLowerCase()
  const map: Record<string, string> = {
    anfrage: 'bg-slate-100 text-slate-700 ring-slate-200',
    aktiv: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    gelöscht: 'bg-rose-50 text-rose-700 ring-rose-200',
    geloescht: 'bg-rose-50 text-rose-700 ring-rose-200',
  }
  const cls = map[raw] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
  const label = value || '—'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs ring-1 ${cls}`}
    >
      {label}
    </span>
  )
}

/* ---------------- Page ---------------- */

export default async function PartnerChatIndexPage() {
  const { ok, items, error } = await loadItems()
  const hasItems = ok && (items?.length ?? 0) > 0

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
        <div className="relative flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
            <span>GLENO Markt</span>
            <span className="text-slate-300">•</span>
            <span>Chats</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Kommunikation zu deinen Markt-Anfragen.
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-600">
            Hier erscheinen nur Chats zu Anfragen, bei denen deine Bewerbung
            angenommen wurde. Alles zentral, klar und schnell erreichbar.
          </p>
        </div>
      </section>

      {/* ERROR */}
      {!ok && (
        <section className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5`}>
          <div className="text-sm text-rose-700">
            Fehler beim Laden der Chats:{' '}
            <span className="font-medium">
              {error || 'Unbekannter Fehler'}
            </span>
          </div>
        </section>
      )}

      {/* EMPTY */}
      {ok && !hasItems && (
        <section className={`${cardBase} px-4 sm:px-5 py-4 sm:py-5`}>
          <div className="text-sm sm:text-base font-medium text-slate-900">
            Noch kein Chat gestartet.
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Ein Chat wird automatisch eröffnet, sobald eine deiner Bewerbungen{' '}
            <span className="font-semibold">angenommen</span> wurde.
          </p>
          <ul className="mt-3 text-xs sm:text-sm text-slate-600 list-disc pl-4 space-y-1">
            <li>Bewirb dich auf passende Markt-Anfragen.</li>
            <li>
              Wird deine Bewerbung akzeptiert, erscheint der zugehörige Chat
              automatisch hier.
            </li>
          </ul>
          <div className="mt-4">
            <Link href="/dashboard/markt/anfragen" className={btnPrimary}>
              Zu den Markt-Anfragen
            </Link>
          </div>
        </section>
      )}

      {/* LIST */}
      {hasItems && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items!.map((it) => {
            const r = it.request
            const title =
              r?.summary ||
              [r?.category, [r?.zip, r?.city].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' – ') ||
              'Anfrage'

            return (
              <article
                key={it.conversation_id}
                className={
                  cardBase +
                  ' px-4 py-3 sm:px-4 sm:py-3 flex flex-col gap-2 hover:bg-white hover:shadow-[0_14px_40px_rgba(15,23,42,0.14)] transition'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={r?.status ?? ''} />
                    <span className="text-[10px] sm:text-xs text-slate-400">
                      Anfrage #{it.request_id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">
                    Zuletzt aktiv:{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(it.updated_at).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>

                <div className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-2">
                  {title}
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-600">
                  {r?.category && <span>{r.category}</span>}
                  {(r?.zip || r?.city) && (
                    <span>
                      {[r.zip, r.city].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {it.partner?.display && (
                    <span className="text-slate-500">
                      Profil:{' '}
                      <span className="font-medium text-slate-900">
                        {it.partner.display}
                      </span>
                      {it.partner.city
                        ? ` · ${it.partner.city}`
                        : ''}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex justify-end">
                  <Link
                    href={`/dashboard/markt/chat/${it.request_id}`}
                    className={
                      'inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 text-white ' +
                      'px-3 py-1.5 text-[10px] sm:text-xs shadow-[0_8px_24px_rgba(15,23,42,0.35)] ' +
                      'hover:bg-slate-950 hover:shadow-[0_12px_32px_rgba(15,23,42,0.45)] transition'
                    }
                  >
                    Chat öffnen
                  </Link>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
