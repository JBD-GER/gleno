// src/app/(public)/willkommen/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'

export default function WelcomePage() {
  const supabase = supabaseClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        // Variante 1: Invite-/OAuth-Code im Query
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else if (url.hash.includes('access_token')) {
          // Variante 2: Magic-Link Tokens im Fragment
          // Wenn deine Version es kann, nimm:
          // await supabase.auth.getSessionFromUrl()
          // ansonsten manuell setzen:
          const params = new URLSearchParams(url.hash.slice(1))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
          }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Einladung ungültig oder abgelaufen.')
          setLoading(false)
          return
        }
        setEmail(user.email ?? '')
      } catch (e: any) {
        setError(e?.message || 'Anmeldung fehlgeschlagen')
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase])

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.')
      return
    }

    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr

      const res = await fetch('/api/complete-invite', { method: 'POST' })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Profil konnte nicht angelegt werden')

      setDone(true)
      router.replace('/dashboard')
    } catch (e: any) {
      setError(e?.message || 'Abschluss fehlgeschlagen')
    }
  }

  if (loading) return <div className="p-6 text-slate-700">Lade Einladung…</div>

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow backdrop-blur">
        <h1 className="text-xl font-semibold text-slate-900">Willkommen 👋</h1>
        <p className="mt-1 text-sm text-slate-600">
          {email ? <>Du bist mit <b>{email}</b> eingeladen worden.</> : 'Du wurdest eingeladen.'} Bitte wähle ein Passwort.
        </p>

        {error && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
        )}

        <form onSubmit={handleComplete} className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-slate-700">Neues Passwort</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Zugang erstellen
          </button>
        </form>

        {done && <p className="mt-3 text-sm text-emerald-700">Fertig! Du wirst weitergeleitet…</p>}
      </div>
    </div>
  )
}
