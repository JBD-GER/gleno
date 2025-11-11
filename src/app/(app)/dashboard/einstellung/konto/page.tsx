// src/app/(app)/dashboard/einstellung/konto/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Status = {
  subscription_status?: 'active'|'trialing'|'canceled'|'past_due'|string
  grace_active?: boolean
}

export default function KontoPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirm1, setConfirm1] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status', { cache: 'no-store' })
      const json = await res.json()
      setStatus(json)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const active = status?.subscription_status === 'active'

  const reallyDelete = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(()=> ({}))
        throw new Error(j?.error || 'delete_failed')
      }
      // raus zur Login-Seite
      window.location.href = '/login?deleted=1'
    } catch (e: any) {
      setError(
        e?.message === 'active_subscription'
          ? 'Bitte kündige zuerst dein Abonnement.'
          : 'Löschen fehlgeschlagen. Bitte später erneut versuchen.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 text-slate-700">
      <div className="mb-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-slate-900">Konto</h1>
        <p className="text-sm text-slate-600">Account-Verwaltung</p>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-slate-200/70" />
        ) : (
          <>
            {active ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
                Dein Konto kann erst gelöscht werden, wenn kein aktives Abonnement besteht.
                Bitte <Link href="/dashboard/einstellung/abonnement" className="font-medium underline">kündige zuerst dein Abo</Link>.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-900">
                  <strong>Achtung:</strong> Das Löschen ist endgültig. Alle Daten (Projekte, Angebote, Dateien etc.)
                  werden dauerhaft entfernt.
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</div>
                )}

                {!confirm1 ? (
                  <button
                    onClick={() => setConfirm1(true)}
                    className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Konto löschen …
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={reallyDelete}
                      disabled={busy}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busy ? 'Wird gelöscht …' : 'Ja, endgültig löschen'}
                    </button>
                    <button
                      onClick={() => setConfirm1(false)}
                      className="rounded-lg border border-white/60 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
