// src/app/(app)/dashboard/einstellung/konto/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Status = {
  subscription_status?: 'active' | 'trialing' | 'canceled' | 'past_due' | string
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

  useEffect(() => {
    load()
  }, [load])

  const active = status?.subscription_status === 'active'

  const reallyDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'delete_failed')
      }
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
    <div className="w-full p-4 text-slate-700 sm:p-6">
      {/* Header – volle Breite, linksbündig */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_110%_-20%,rgba(15,23,42,0.05),transparent_60%)]" />
        <div className="relative flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Konto
          </h1>
          <p className="text-sm text-slate-600">
            Account-Verwaltung & endgültiges Löschen deines Kontos.
          </p>
        </div>
      </div>

      {/* Inhalt */}
      <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
        ) : (
          <>
            {active ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Aktives Abonnement vorhanden</p>
                    <p className="text-xs sm:text-sm">
                      Dein Konto kann erst gelöscht werden, wenn kein aktives
                      Abonnement besteht.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/einstellung/abonnement"
                    className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 sm:text-sm"
                  >
                    Zum Abonnement
                  </Link>
                </div>
                <p className="text-xs text-slate-500">
                  Hinweis: Nach Kündigung deines Abos kannst du dein Konto hier
                  endgültig löschen.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-900 sm:p-4">
                  <p className="mb-1 text-sm font-semibold">
                    ⚠️ Achtung – Dieser Vorgang ist endgültig
                  </p>
                  <p className="text-xs sm:text-sm">
                    Beim Löschen deines Kontos werden <strong>alle Daten</strong>{' '}
                    (Kunden, Projekte, Angebote, Rechnungen, Dateien usw.)
                    dauerhaft entfernt. Eine Wiederherstellung ist nicht
                    möglich.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/90 p-2 text-sm text-rose-800">
                    {error}
                  </div>
                )}

                {!confirm1 ? (
                  <button
                    onClick={() => setConfirm1(true)}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
                  >
                    Konto löschen …
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={reallyDelete}
                      disabled={busy}
                      className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? 'Wird gelöscht …' : 'Ja, Konto endgültig löschen'}
                    </button>
                    <button
                      onClick={() => setConfirm1(false)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Tipp: Falls du GLENO nur pausieren möchtest, reicht es, dein
                  Abonnement zu kündigen. Dein Account bleibt dann bestehen.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
