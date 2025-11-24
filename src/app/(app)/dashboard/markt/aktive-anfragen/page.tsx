// src/app/(app)/dashboard/markt/aktive-anfragen/page.tsx

import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowUturnLeftIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

type ActiveItem = {
  application_id: string
  partner_id: string
  partner_display: string
  accepted_at: string
  // falls deine API zusätzlich request_id direkt liefert:
  request_id?: string | null
  request: {
    id: string
    status: string | null
    summary: string | null
    category: string | null
    city: string | null
    zip: string | null
    execution: 'vorOrt' | 'digital' | string | null
    budget_min: number | null
    budget_max: number | null
    created_at: string | null
  } | null
}

const shellBg =
  'min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const cardBase =
  'rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl ' +
  'shadow-[0_10px_34px_rgba(2,6,23,0.06)] ring-1 ring-white/70 ' +
  'px-4 sm:px-5 py-4 sm:py-5 transition hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 ' +
  'shadow-sm hover:bg-white hover:shadow-md transition'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2 ' +
  'text-xs sm:text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] ' +
  'hover:bg-slate-950 hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition ' +
  'disabled:opacity-50 disabled:shadow-none'

async function loadData(): Promise<{ ok: boolean; items: ActiveItem[]; error?: string }> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  if (!host) return { ok: false, items: [], error: 'no_host_header' }

  const res = await fetch(`${proto}://${host}/api/partners/active-requests`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const j = await res.json().catch(() => ({}))

  if (!res.ok) {
    return {
      ok: false,
      items: [],
      error: j?.error || res.statusText || 'Unexpected error',
    }
  }

  return { ok: true, items: (j.items || []) as ActiveItem[] }
}

function formatExecution(v: string | null | undefined) {
  if (!v) return '—'
  const x = v.toLowerCase().trim()
  if (['vorort', 'vor_ort', 'vor-ort'].includes(x)) return 'Vor Ort'
  if (x === 'digital') return 'Digital'
  if (v === 'vorOrt') return 'Vor Ort'
  return v
}

function formatBudget(
  min: number | null | undefined,
  max: number | null | undefined
) {
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `ab ${min} €`
  return `bis ${max} €`
}

export default async function AktiveAnfragenPage() {
  const { ok, items, error } = await loadData()

  return (
    <div className={shellBg}>
      {/* HERO */}
      <section className={`${cardBase} relative mb-6 overflow-hidden`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_260px_at_-10%_-40%,rgba(15,23,42,0.05),transparent_70%),radial-gradient(900px_260px_at_110%_140%,rgba(15,23,42,0.07),transparent_70%)]"
        />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur">
              <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5 text-slate-900" />
              <span>GLENO Markt</span>
              <span className="text-slate-300">•</span>
              <span>Aktive Anfragen</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Anfragen, bei denen Sie im Spiel sind.
            </h1>
            <p className="max-w-3xl text-xs sm:text-sm text-slate-600">
              Alle Markt-Anfragen mit akzeptierter Bewerbung auf einen Blick.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-start md:justify-end mt-2 md:mt-0">
            <Link href="/dashboard/markt/anfragen" className={btnGhost}>
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>Zu offenen Anfragen</span>
            </Link>
          </div>
        </div>
      </section>

      <main className="space-y-4">
        {!ok && (
          <section className={`${cardBase} border-rose-100/80 bg-rose-50/95 text-rose-800 ring-rose-100`}>
            <div className="text-sm font-medium">
              Beim Laden der aktiven Anfragen ist ein Fehler aufgetreten.
            </div>
            <div className="mt-1 text-xs text-rose-700">
              {error || 'Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.'}
            </div>
          </section>
        )}

        {ok && items.length === 0 && (
          <section className={cardBase}>
            <div className="text-sm text-slate-800">
              Aktuell gibt es keine aktiven Anfragen für Ihre Profile.
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Tipp: Bewerben Sie sich auf passende Anfragen im Bereich{' '}
              <Link
                href="/dashboard/markt/anfragen"
                className="font-medium text-slate-900 underline underline-offset-2"
              >
                „Alle Anfragen“
              </Link>
              . Sobald eine Bewerbung angenommen wird, erscheint sie hier.
            </p>
          </section>
        )}

        {ok && items.length > 0 && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {items.map((item) => {
              const r = item.request
              const title =
                r?.summary ||
                [r?.category, [r?.zip, r?.city].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(' – ') ||
                'Anfrage'

              const budgetText = formatBudget(r?.budget_min ?? null, r?.budget_max ?? null)

              // Chat-Route: bevorzugt request.id, fallback auf request_id falls vorhanden
              const chatId = r?.id || item.request_id
              const chatHref = chatId
                ? `/dashboard/markt/chat/${chatId}`
                : undefined

              return (
                <article key={item.application_id} className={cardBase}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-baseline gap-2 text-[10px] text-slate-400">
                        <span className="uppercase tracking-[0.14em] text-slate-500">
                          Anfrage
                        </span>
                        <span>#{r?.id?.slice(0, 8) ?? '—'}</span>
                      </div>

                      <h2 className="line-clamp-2 text-sm sm:text-base font-semibold text-slate-900">
                        {title}
                      </h2>

                      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-600">
                        {r?.category && (
                          <span className="rounded-full bg-white/95 px-2 py-0.5 ring-1 ring-white/70">
                            {r.category}
                          </span>
                        )}
                        {r?.city && (
                          <span className="rounded-full bg-white/95 px-2 py-0.5 ring-1 ring-white/70">
                            {[r.zip, r.city].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {r?.execution && (
                          <span className="rounded-full bg-white/95 px-2 py-0.5 ring-1 ring-white/70">
                            Modus: {formatExecution(r.execution)}
                          </span>
                        )}
                        {budgetText && (
                          <span className="rounded-full bg-white/95 px-2 py-0.5 ring-1 ring-white/70">
                            Budget: {budgetText}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
                        <div>
                          Angenommen am{' '}
                          <span className="font-medium text-slate-700">
                            {new Date(item.accepted_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div>
                          Als Profil:{' '}
                          <span className="font-medium text-slate-800">
                            {item.partner_display}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chat-Link */}
                    <div className="mt-1 md:mt-0 flex justify-start md:justify-end">
                      {chatHref ? (
                        <Link
                          href={chatHref}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/98 px-3 py-1.5 text-[10px] font-medium text-slate-900 shadow-sm hover:shadow-md transition"
                        >
                          <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5" />
                          <span>Chat öffnen</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 px-3 py-1.5 text-[10px] text-slate-400 cursor-not-allowed"
                        >
                          <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5" />
                          <span>Kein Chat verfügbar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {r?.id && (
                      <Link
                        href={`/dashboard/markt/anfragen/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/98 px-3 py-1.5 text-[10px] sm:text-xs text-slate-900 shadow-sm hover:bg-white hover:shadow-md transition"
                      >
                        <span>Anfrage öffnen</span>
                        <ArrowRightIcon className="h-3.5 w-3.5 text-slate-500" />
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/markt/bewerbungen/${item.application_id}`}
                      className={
                        btnPrimary +
                        ' !px-3 !py-1.5 text-[10px] sm:text-xs inline-flex items-center'
                      }
                    >
                      <span>Bewerbung ansehen</span>
                    </Link>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}
