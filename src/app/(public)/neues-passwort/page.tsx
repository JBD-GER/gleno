'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabaseEphemeral } from '@/lib/supabase-client'

export default function ResetPasswordPage() {
  const supabase = supabaseEphemeral() // ⬅️ ephemeraler Client
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [info, setInfo]         = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [ready, setReady]       = useState(false)
  const triedRef = useRef(false)

  useEffect(() => {
    if (triedRef.current) return
    triedRef.current = true

    ;(async () => {
      try {
        // Falls Supabase die Session schon aus der URL hergestellt hat (nur ephemeraler Client):
        const { data: sess } = await supabase.auth.getSession()
        if (sess.session) {
          setInfo('Sicherer Link erkannt. Du kannst jetzt ein neues Passwort setzen.')
          setReady(true)
          return
        }

        // Tokens aus der URL prüfen (Recovery-Flow)
        const search = typeof window !== 'undefined' ? window.location.search : ''
        const qp = new URLSearchParams(search)
        const type = qp.get('type')
        const token_hash = qp.get('token_hash') || qp.get('token')
        const code = qp.get('code')

        if (type === 'recovery' && token_hash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash,
          } as any)
          if (!error) {
            setInfo('Sicherer Link erkannt. Du kannst jetzt ein neues Passwort setzen.')
            setReady(true)
            return
          }
        }

        // Optionaler Fallback: PKCE-Code tauschen (eigentlich nicht nötig)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            setInfo('Sicherer Link erkannt. Du kannst jetzt ein neues Passwort setzen.')
            setReady(true)
            return
          }
        }

        setError('Kein gültiger Wiederherstellungslink. Bitte fordere einen neuen Link an.')
        setReady(false)
      } catch (e) {
        setError('Link ungültig oder abgelaufen. Bitte fordere einen neuen Link an.')
        setReady(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Falls Supabase via Event signalisiert:
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setInfo('Sicherer Link erkannt. Du kannst jetzt ein neues Passwort setzen.')
        setReady(true)
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInfo(null); setError(null)

    if (!ready) { setError('Es konnte keine gültige Sitzung aus dem Link erstellt werden.'); return }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein.'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return }

    setLoading(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr

      // Out-of-band: ephemerale Session beenden
      await supabase.auth.signOut()

      setInfo('Passwort aktualisiert. Du wirst nun zum Login weitergeleitet…')
      setTimeout(() => router.push('/login'), 1200)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Zurücksetzen des Passworts.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-2xl ring-1 ring-white/10 sm:p-8">
        <h2 className="mb-4 text-center text-2xl font-semibold text-white">Neues Passwort festlegen</h2>

        {info && <div className="mb-4 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{info}</div>}
        {error && <div className="mb-4 rounded-md border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/80">Neues Passwort</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 pl-12 text-black outline-none focus:border-white/30 focus:bg-white"
                placeholder="••••••••"
                disabled={!ready}
              />
              <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/80">Passwort wiederholen</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 pl-12 text-black outline-none focus:border-white/30 focus:bg-white"
                placeholder="••••••••"
                disabled={!ready}
              />
              <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:bg-slate-200/70"
                disabled={!ready}
              >
                {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-full bg-[#5865f2] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Wird gespeichert…' : 'Passwort festlegen'}
          </motion.button>
        </form>

        {!ready && (
          <p className="mt-4 text-center text-xs text-white/70">
            Hinweis: Öffne diese Seite ausschließlich über den Link aus deiner E-Mail.
          </p>
        )}
      </div>
    </div>
  )
}
