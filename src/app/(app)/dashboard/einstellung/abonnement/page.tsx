'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type BillingStatus = {
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | string
  trial_ends_at?: string | null
  current_period_end?: string | null
  grace_active?: boolean
  access_until?: string | null
  access_reason?: 'trial' | 'subscription' | null
  stripe_status?: string | null
  cancel_at_period_end?: boolean | null
  subscription_current_period_start?: string | null
  subscription_current_period_end?: string | null
  subscription_started_at?: string | null
  plan?: string | null
  company_name?: string | null
  contact_name?: string | null
  stripe_customer_id?: string | null
}

type Invoice = {
  id: string
  number: string | null
  status: string | null
  currency: string | null
  amount_due: number | null
  amount_paid: number | null
  amount_remaining: number | null
  created: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  period_start: string | null
  period_end: string | null
}

type InvoiceResponse = {
  invoices: Invoice[]
  upcoming: Invoice | null
}

export default function AbonnementPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [upcomingInvoice, setUpcomingInvoice] = useState<Invoice | null>(null)
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  const loadStatus = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/billing/status', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      })
      const json = (await res.json()) as BillingStatus & { error?: string }
      if ((json as any).error) {
        setStatus(null)
      } else {
        setStatus(json)
      }
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/invoices', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      })
      const json = (await res.json()) as InvoiceResponse & { error?: string }
      if ((json as any).error) {
        setInvoices([])
        setUpcomingInvoice(null)
      } else {
        setInvoices(json.invoices || [])
        setUpcomingInvoice(json.upcoming || null)
      }
    } catch {
      setInvoices([])
      setUpcomingInvoice(null)
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadInvoices()
  }, [loadStatus, loadInvoices])

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'long' }) : '—'

  const fmtShort = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString('de-DE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—'

  const fmtCurrency = (amount?: number | null, currency?: string | null) => {
    if (amount == null || currency == null) return '—'
    try {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100) // Stripe = Cent
    } catch {
      return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
    }
  }

  const isActive = status?.subscription_status === 'active'
  const inTrial = status?.subscription_status === 'trialing'
  const isCanceled = status?.subscription_status === 'canceled'
  const cancelScheduled = !!status?.cancel_at_period_end

  const periodStart = status?.subscription_current_period_start ?? null
  const periodEnd =
    status?.subscription_current_period_end ??
    status?.current_period_end ??
    null
  const startedAt = status?.subscription_started_at ?? null

  const canReactivate =
    !!(
      cancelScheduled ||
      (isCanceled &&
        status?.current_period_end &&
        new Date(status.current_period_end) > new Date())
    )
  const canCancel = !!(isActive && !cancelScheduled)
  const canCheckout = !isActive && !canReactivate // auch während Trial erlaubt

  const subEnds = useMemo(() => fmt(periodEnd), [periodEnd])

  const labelOfStatus = (s?: string) => {
    switch (s) {
      case 'active':
        return 'Aktives Abonnement'
      case 'trialing':
        return 'Testphase'
      case 'past_due':
        return 'Zahlung überfällig'
      case 'canceled':
        return 'Gekündigt (läuft aus)'
      default:
        return s ?? '—'
    }
  }

  const handleCancel = async () => {
    if (!canCancel) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        cache: 'no-store',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'cancel_failed')
      setStatus((s) => ({
        ...(s || {}),
        subscription_status: 'canceled',
        cancel_at_period_end: true,
        current_period_end:
          j?.current_period_end ?? s?.current_period_end ?? null,
        subscription_current_period_end:
          j?.current_period_end ??
          s?.subscription_current_period_end ??
          null,
        grace_active: true,
        access_reason: 'subscription',
        access_until: j?.current_period_end ?? s?.access_until ?? null,
      }))
      setMsg('Abo gekündigt. Zugriff bleibt bis zum Periodenende bestehen.')
      loadStatus()
    } catch (e: any) {
      setErr(
        e?.message === 'no_subscription'
          ? 'Kein aktives Abonnement gefunden.'
          : 'Kündigung fehlgeschlagen. Bitte später erneut versuchen.'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleReactivate = async () => {
    if (!canReactivate) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch('/api/billing/reactivate', {
        method: 'POST',
        cache: 'no-store',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (j?.error === 'no_stripe_customer') {
          setErr(
            'Bitte Zahlungsmethode hinzufügen. Kontaktiere den Support oder nutze den Checkout.'
          )
        } else {
          throw new Error(j?.error || 'reactivate_failed')
        }
      } else {
        setStatus((s) => ({
          ...(s || {}),
          subscription_status: 'active',
          cancel_at_period_end: false,
          current_period_end:
            j?.current_period_end ?? s?.current_period_end ?? null,
          subscription_current_period_end:
            j?.current_period_end ??
            s?.subscription_current_period_end ??
            null,
          grace_active: false,
          access_reason: 'subscription',
          access_until: null,
        }))
        setMsg('Abo reaktiviert.')
        loadStatus()
      }
    } catch {
      setErr('Reaktivierung fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  const handleCheckout = async () => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      // erstellt Session und redirectet
      window.location.href = '/api/billing/checkout'
    } finally {
      setBusy(false)
    }
  }

  const planLabel =
    status?.plan && status.plan.toLowerCase() !== 'starter'
      ? status.plan
      : 'Starter – monatlich'

  return (
    <div className="p-6 text-slate-700">
      <div className="mb-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-slate-900">Abonnement</h1>
        <p className="text-sm text-slate-600">Plan, Laufzeit &amp; Verwaltung</p>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        {loading ? (
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200/80" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-24 animate-pulse rounded-lg bg-slate-200/70" />
              <div className="h-24 animate-pulse rounded-lg bg-slate-200/70" />
              <div className="h-24 animate-pulse rounded-lg bg-slate-200/70" />
            </div>
          </div>
        ) : !status ? (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            Status konnte nicht geladen werden.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/60 bg-white/80 px-2 py-1 text-xs text-slate-700">
                Status:{' '}
                <strong>{labelOfStatus(status.subscription_status)}</strong>
              </span>
              {status.stripe_status && (
                <span className="rounded-md border border-white/60 bg-white/80 px-2 py-1 text-xs text-slate-600">
                  Stripe: {status.stripe_status}
                </span>
              )}
              {cancelScheduled && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                  Kündigung zum Periodenende aktiv
                </span>
              )}
            </div>

            {/* Testphase-Hinweis */}
            {inTrial && (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-900">
                <strong>Hinweis:</strong> Während der Testphase ist <em>kein</em>{' '}
                Abonnement aktiv. Nach Ablauf der Testphase wird{' '}
                <em>nicht automatisch</em> ein Abo gestartet. Für die weitere Nutzung
                ist eine <strong>manuelle Aktivierung</strong> Ihres Abonnements
                erforderlich (Button „Jetzt abonnieren“).
              </div>
            )}

            {/* Meta-Infos zum Abo inkl. Firma */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Plan</div>
                <div className="mt-0.5 text-slate-900">{planLabel}</div>
                <div className="text-xs text-slate-500">
                  59 € zzgl. MwSt., monatlich kündbar
                </div>
              </div>

              {(status.company_name || status.contact_name) && (
                <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                  <div className="text-slate-600">Rechnung an</div>
                  <div className="mt-0.5 text-slate-900">
                    {status.company_name && (
                      <>
                        {status.company_name}
                        <br />
                      </>
                    )}
                    {status.contact_name && (
                      <span className="text-sm text-slate-700">
                        {status.contact_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Diese Angaben werden an Stripe übermittelt und auf den Rechnungen
                    verwendet.
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Abo gestartet am</div>
                <div className="mt-0.5 text-slate-900">{fmt(startedAt)}</div>
                <div className="text-xs text-slate-500">
                  Zeitpunkt der ersten Aktivierung
                </div>
              </div>

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Aktueller Zeitraum</div>
                <div className="mt-0.5 text-slate-900">
                  {fmt(periodStart)} – {fmt(periodEnd)}
                </div>
                <div className="text-xs text-slate-500">Monatliche Abrechnung</div>
              </div>

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Zugriff</div>
                <div className="mt-0.5 text-slate-900">
                  {isActive && !cancelScheduled && 'Verlängert sich automatisch'}
                  {canReactivate && `Läuft aus am ${subEnds}`}
                  {inTrial &&
                    status.trial_ends_at &&
                    `Testphase bis ${fmt(status.trial_ends_at)}`}
                  {!isActive &&
                    !canReactivate &&
                    !inTrial &&
                    'Kein aktives Abonnement'}
                </div>
                {status.access_until && (
                  <div className="text-xs text-slate-500">
                    Garantierter Zugriff bis {fmtShort(status.access_until)}
                  </div>
                )}
              </div>
            </div>

            {/* Aktionen */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCancel}
                  className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                >
                  {busy ? 'Wird gekündigt …' : 'Abonnement kündigen'}
                </button>
              )}

              {canReactivate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReactivate}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? 'Wird reaktiviert …' : 'Abonnement reaktivieren'}
                </button>
              )}

              {canCheckout && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCheckout}
                  className="rounded-lg border border-slate-900/25 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {busy
                    ? 'Weiter zur Kasse …'
                    : inTrial
                    ? 'Jetzt abonnieren (während Testphase)'
                    : 'Jetzt abonnieren'}
                </button>
              )}
            </div>

            {msg && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">
                {msg}
              </div>
            )}
            {err && (
              <div className="mt-4 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">
                {err}
              </div>
            )}
          </>
        )}
      </section>

      {/* Rechnungen */}
      <section className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rechnungen
            </h2>
            <p className="text-xs text-slate-500">
              Alle über Stripe erstellten Rechnungen für dieses Konto.
            </p>
          </div>
        </div>

        {/* Bevorstehende Rechnung */}
        {upcomingInvoice && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">Bevorstehende Rechnung</div>
                <div className="text-xs text-sky-800">
                  Fälligkeitszeitraum:{' '}
                  {fmt(upcomingInvoice.period_start)} –{' '}
                  {fmt(upcomingInvoice.period_end)}
                </div>
              </div>
              <div className="text-right text-sm font-semibold">
                {fmtCurrency(
                  upcomingInvoice.amount_due,
                  upcomingInvoice.currency
                )}
              </div>
            </div>
          </div>
        )}

        {loadingInvoices ? (
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80" />
            <div className="hidden h-24 animate-pulse rounded-lg bg-slate-200/70 md:block" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-200/70 md:hidden" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 sm:text-sm">
            Es sind noch keine Rechnungen vorhanden.
          </div>
        ) : (
          <>
            {/* Desktop-Tabelle */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 md:block">
              <table className="min-w-full text-left text-xs text-slate-700 sm:text-sm">
                <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Rechnungsnummer</th>
                    <th className="px-4 py-2">Datum</th>
                    <th className="px-4 py-2">Zeitraum</th>
                    <th className="px-4 py-2">Betrag</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const statusLabel = (() => {
                      switch (inv.status) {
                        case 'paid':
                          return 'Bezahlt'
                        case 'open':
                          return 'Offen'
                        case 'draft':
                          return 'Entwurf'
                        case 'uncollectible':
                          return 'Uneinbringlich'
                        case 'void':
                          return 'Storniert'
                        default:
                          return inv.status ?? '—'
                      }
                    })()

                    const statusClass = (() => {
                      switch (inv.status) {
                        case 'paid':
                          return 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        case 'open':
                          return 'bg-amber-50 text-amber-800 border-amber-200'
                        case 'void':
                        case 'uncollectible':
                          return 'bg-rose-50 text-rose-800 border-rose-200'
                        default:
                          return 'bg-slate-50 text-slate-700 border-slate-200'
                      }
                    })()

                    const link = inv.hosted_invoice_url || inv.invoice_pdf || null

                    return (
                      <tr
                        key={inv.id}
                        className="border-t border-slate-200/70 last:border-b hover:bg-slate-100/60"
                      >
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {inv.number ?? inv.id}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {fmtShort(inv.created)}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {fmt(inv.period_start)} – {fmt(inv.period_end)}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {fmtCurrency(inv.amount_due, inv.currency)}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-middle text-right text-xs sm:text-sm">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
                            >
                              Öffnen
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-Karten */}
            <div className="space-y-3 md:hidden">
              {invoices.map((inv) => {
                const statusLabel = (() => {
                  switch (inv.status) {
                    case 'paid':
                      return 'Bezahlt'
                    case 'open':
                      return 'Offen'
                    case 'draft':
                      return 'Entwurf'
                    case 'uncollectible':
                      return 'Uneinbringlich'
                    case 'void':
                      return 'Storniert'
                    default:
                      return inv.status ?? '—'
                  }
                })()

                const statusClass = (() => {
                  switch (inv.status) {
                    case 'paid':
                      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    case 'open':
                      return 'bg-amber-50 text-amber-800 border-amber-200'
                    case 'void':
                    case 'uncollectible':
                      return 'bg-rose-50 text-rose-800 border-rose-200'
                    default:
                      return 'bg-slate-50 text-slate-700 border-slate-200'
                  }
                })()

                const link = inv.hosted_invoice_url || inv.invoice_pdf || null

                return (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {inv.number ?? inv.id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {fmtShort(inv.created)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Zeitraum:</span>
                        <span className="font-medium text-slate-800">
                          {fmt(inv.period_start)} – {fmt(inv.period_end)}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Betrag:</span>
                        <span className="font-medium text-slate-800">
                          {fmtCurrency(inv.amount_due, inv.currency)}
                        </span>
                      </p>
                      {link && (
                        <p className="pt-1 text-right">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-slate-900 underline underline-offset-2"
                          >
                            Rechnung öffnen
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
