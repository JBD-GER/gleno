'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LockClosedIcon, ShieldCheckIcon, CreditCardIcon,
  CheckIcon, ClockIcon, ExclamationTriangleIcon, TrashIcon
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

type BillingStatus = {
  blocked: boolean
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | string
  trial_ends_at?: string | null
  daysLeft?: number
}

export default function StripePaywallModal() {
  const supabase = supabaseClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Rollen-Handling
  const [roleLoading, setRoleLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false) // true = Owner/Admin; false = Mitarbeiter

  const dialogRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Rolle ermitteln: Wenn es einen employees-Eintrag mit auth_user_id gibt → Mitarbeiter, sonst Owner/Admin
  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData.user?.id
        if (!uid) {
          // nicht eingeloggt oder Session unklar → sicherheitshalber kein Modal zeigen
          setIsAdmin(false)
          return
        }
        const { data: emp, error } = await supabase
          .from('employees')
          .select('id')
          .eq('auth_user_id', uid)
          .maybeSingle()

        // Mitarbeiter, wenn employees-Datensatz existiert → dann KEIN Modal
        if (!error && emp) {
          setIsAdmin(false)
        } else {
          // kein employees-Eintrag => Owner/Admin
          setIsAdmin(true)
        }
      } catch {
        // Im Zweifel lieber kein Modal zeigen als Mitarbeiter zu blockieren
        setIsAdmin(false)
      } finally {
        setRoleLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStatus = useCallback(async () => {
    // Nur Admins dürfen/brauchen Billing-Status
    if (!isAdmin) return
    try {
      setRefreshing(true)
      const res = await fetch('/api/billing/status', { cache: 'no-store' })
      const json = (await res.json()) as BillingStatus
      setStatus(json)
      if (!json.blocked) router.refresh?.()
    } catch {
      setStatus({ blocked: true })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, isAdmin])

  useEffect(() => { 
    if (isAdmin) fetchStatus()
  }, [fetchStatus, isAdmin])

  // bei Fokus/Visibility/Intervall – nur, wenn Admin und geblockt
  useEffect(() => {
    if (!isAdmin) return
    const onFocus = () => fetchStatus()
    const onVis = () => { if (!document.hidden) fetchStatus() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    let interval: number | undefined
    if (status?.blocked) interval = window.setInterval(fetchStatus, 5000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      if (interval) clearInterval(interval)
    }
  }, [fetchStatus, status?.blocked, isAdmin])

  // Scroll-Lock nur wenn Admin und wirklich blocked
  useEffect(() => {
    if (!isAdmin || !status?.blocked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [status?.blocked, isAdmin])

  // Fokus nur wenn Admin und blocked
  useEffect(() => { 
    if (isAdmin && status?.blocked) dialogRef.current?.focus() 
  }, [status?.blocked, isAdmin])

  // Wenn Rolle noch unklar → nichts anzeigen (kein Flackern)
  if (roleLoading) return null

  // Mitarbeiter sehen das Modal nie
  if (!isAdmin) return null

  const blocked = !!status?.blocked
  const daysLeft = status?.daysLeft ?? 0
  const trialEnded = !daysLeft
  const until = status?.trial_ends_at ? new Date(status.trial_ends_at) : null
  const countdown = (() => {
    if (!until) return null
    const diff = until.getTime() - Date.now()
    if (diff <= 0) return '0 Tage'
    const d = Math.floor(diff / 86_400_000)
    const h = Math.floor((diff / 3_600_000) % 24)
    return d > 0 ? `${d} ${d === 1 ? 'Tag' : 'Tage'}` : `${h} Std`
  })()

  // Wenn Billing-Status lädt oder nicht blockiert → nichts anzeigen
  if (loading || !blocked) return null

  const goToCheckout = async () => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/billing/checkout-link', { method: 'POST', cache: 'no-store' })
      if (!res.ok) throw new Error('checkout-link failed')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch {
      window.location.href = '/api/billing/checkout'
    }
  }

  const deleteAccount = async () => {
    try {
      setDeleting(true)
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('delete failed')
      // Best effort: nach Löschung zurück zur Login-Seite
      window.location.href = '/login?deleted=1'
    } catch (e) {
      alert('Löschen fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-xl" role="dialog" aria-modal="true">
      <div className="absolute inset-0" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative mx-4 w-full max-w-xl rounded-2xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] outline-none"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/60 bg-white/70 shadow-sm">
            <LockClosedIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-medium tracking-tight">Zugang erforderlich</h2>
            <p className="mt-1 text-sm text-slate-700">
              {trialEnded ? 'Ihre Testphase ist beendet. Buchen Sie ein Abo, um fortzufahren.' : <>Ihre Testphase endet in <strong>{countdown}</strong>.</>}
            </p>
          </div>
          <span className="ml-auto rounded-md border border-white/60 bg-white/70 px-2 py-1 text-xs text-slate-600">
            Status: {status?.subscription_status ?? '—'}
          </span>
        </div>

        {/* Plan */}
        <div className="mt-5 rounded-xl border border-white/60 bg-white/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-700">Plan</div>
              <div className="text-base font-medium">Starter – monatlich</div>
            </div>
            <div className="rounded-lg border border-slate-900/15 bg-white px-4 py-2 text-right">
              <div className="text-sm leading-none text-slate-600">Preis</div>
              <div className="mt-0.5 text-lg font-semibold tracking-tight">59 €</div>
              <div className="text-xs text-slate-500">zzgl. MwSt., monatlich kündbar</div>
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-800 sm:grid-cols-2">
            <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Voller Funktionsumfang</li>
            <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Rechnung für die Buchhaltung</li>
            <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Support per E-Mail</li>
            <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Kündigung jederzeit</li>
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheckIcon className="h-4 w-4" />
          Sichere Zahlung über Stripe. Ihre Daten werden verschlüsselt übertragen.
        </div>

        {/* Footer: links „Konto löschen“, rechts „Jetzt abonnieren“ */}
        <div className="mt-6 flex items-center justify-between">
          {/* Konto löschen */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Konto löschen
            </button>
          ) : (
            <div className="rounded-lg border border-red-300 bg-red-50/70 px-3 py-2">
              <div className="flex items-center gap-2 text-red-700">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Wirklich endgültig löschen?</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Lösche…' : 'Ja, endgültig löschen'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Jetzt abonnieren */}
          <button
            type="button"
            onClick={goToCheckout}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg border border-slate-900/25 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-900/40 disabled:opacity-60"
          >
            <CreditCardIcon className="mr-2 h-4 w-4" />
            {submitting ? 'Weiter zur Kasse …' : 'Jetzt abonnieren'}
          </button>
        </div>

        {!trialEnded && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/60 bg-white/70 px-2.5 py-1.5 text-xs text-slate-600">
            <ClockIcon className="h-4 w-4" />
            Testphase bis {until?.toLocaleDateString()} – verbleibend: {countdown}
          </div>
        )}
      </div>
    </div>
  )
}
