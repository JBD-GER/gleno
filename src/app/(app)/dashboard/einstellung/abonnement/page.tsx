'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'

type BillingStatus = {
  subscription_status?: 'active'|'trialing'|'past_due'|'canceled'|string
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
}

export default function AbonnementPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/billing/status', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' }})
      const json = (await res.json()) as BillingStatus
      setStatus(json)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'long' }) : '—'
  const fmtShort = (iso?: string | null) => iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  const isActive   = status?.subscription_status === 'active'
  const inTrial    = status?.subscription_status === 'trialing'
  const isCanceled = status?.subscription_status === 'canceled'
  const cancelScheduled = !!status?.cancel_at_period_end

  const periodStart = status?.subscription_current_period_start ?? null
  const periodEnd   = status?.subscription_current_period_end ?? status?.current_period_end ?? null
  const startedAt   = status?.subscription_started_at ?? null

  const canReactivate = !!(cancelScheduled || (isCanceled && status?.current_period_end && new Date(status.current_period_end) > new Date()))
  const canCancel = !!(isActive && !cancelScheduled)
  const canCheckout = !isActive && !canReactivate // auch während Trial erlaubt

  const subEnds = useMemo(() => fmt(periodEnd), [periodEnd])

  const labelOfStatus = (s?: string) => {
    switch (s) {
      case 'active':   return 'Aktives Abonnement'
      case 'trialing': return 'Testphase'
      case 'past_due': return 'Zahlung überfällig'
      case 'canceled': return 'Gekündigt (läuft aus)'
      default:         return s ?? '—'
    }
  }

  const handleCancel = async () => {
    if (!canCancel) return
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST', cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'cancel_failed')
      setStatus(s => ({
        ...(s || {}),
        subscription_status: 'canceled',
        cancel_at_period_end: true,
        current_period_end: j?.current_period_end ?? s?.current_period_end ?? null,
        subscription_current_period_end: j?.current_period_end ?? s?.subscription_current_period_end ?? null,
        grace_active: true,
        access_reason: 'subscription',
        access_until: j?.current_period_end ?? s?.access_until ?? null,
      }))
      setMsg('Abo gekündigt. Zugriff bleibt bis zum Periodenende bestehen.')
      load()
    } catch (e: any) {
      setErr(e?.message === 'no_subscription' ? 'Kein aktives Abonnement gefunden.' : 'Kündigung fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  const handleReactivate = async () => {
    if (!canReactivate) return
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST', cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        // kein Customer/Payment-Methode vorhanden → Hinweis
        if (j?.error === 'no_stripe_customer') {
          setErr('Bitte Zahlungsmethode hinzufügen. Kontaktiere den Support oder nutze den Checkout.')
        } else {
          throw new Error(j?.error || 'reactivate_failed')
        }
      } else {
        setStatus(s => ({
          ...(s || {}),
          subscription_status: 'active',
          cancel_at_period_end: false,
          current_period_end: j?.current_period_end ?? s?.current_period_end ?? null,
          subscription_current_period_end: j?.current_period_end ?? s?.subscription_current_period_end ?? null,
          grace_active: false,
          access_reason: 'subscription',
          access_until: null,
        }))
        setMsg('Abo reaktiviert.')
        load()
      }
    } catch {
      setErr('Reaktivierung fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  // Falls du weiterhin einen Checkout-Endpunkt hast, nutze ihn hier.
  const handleCheckout = async () => {
    setBusy(true); setErr(null); setMsg(null)
    try {
      // Falls du keinen /checkout-link hast, leite einfach auf /api/billing/checkout (Server erzeugt Session) – oder ersetze durch Portal.
      window.location.href = '/api/billing/checkout'
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 text-slate-700">
      <div className="mb-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-slate-900">Abonnement</h1>
        <p className="text-sm text-slate-600">Plan, Laufzeit & Verwaltung</p>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-slate-200/70" />
        ) : !status ? (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Status konnte nicht geladen werden.</div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/60 bg-white/80 px-2 py-1 text-xs text-slate-700">
                Status: <strong>{labelOfStatus(status.subscription_status)}</strong>
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
                <strong>Hinweis:</strong> Während der Testphase ist <em>kein</em> Abonnement aktiv.
                Nach Ablauf der Testphase wird <em>nicht automatisch</em> ein Abo gestartet.
                Für die weitere Nutzung ist eine <strong>manuelle Aktivierung</strong> deines Abonnements erforderlich
                (Button „Jetzt abonnieren“).
              </div>
            )}

            {/* Meta-Infos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Plan</div>
                <div className="mt-0.5 text-slate-900">Starter – monatlich</div>
                <div className="text-xs text-slate-500">59 € zzgl. MwSt., monatlich kündbar</div>
              </div>

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Abo gestartet am</div>
                <div className="mt-0.5 text-slate-900">{fmt(status.subscription_started_at)}</div>
                <div className="text-xs text-slate-500">Zeitpunkt der ersten Aktivierung</div>
              </div>

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Aktueller Zeitraum</div>
                <div className="mt-0.5 text-slate-900">{fmt(periodStart)} – {fmt(periodEnd)}</div>
                <div className="text-xs text-slate-500">Monatliche Abrechnung</div>
              </div>

              <div className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm">
                <div className="text-slate-600">Zugriff</div>
                <div className="mt-0.5 text-slate-900">
                  {isActive && !cancelScheduled && 'Verlängert sich automatisch'}
                  {canReactivate && `Läuft aus am ${subEnds}`}
                  {inTrial && status.trial_ends_at && `Testphase bis ${fmt(status.trial_ends_at)}`}
                  {!isActive && !canReactivate && !inTrial && 'Kein aktives Abonnement'}
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
                  {busy ? 'Weiter zur Kasse …' : (inTrial ? 'Jetzt abonnieren (während Testphase)' : 'Jetzt abonnieren')}
                </button>
              )}
            </div>

            {msg && <div className="mt-4 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</div>}
            {err && <div className="mt-4 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{err}</div>}
          </>
        )}
      </section>
    </div>
  )
}
