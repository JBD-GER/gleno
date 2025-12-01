// src/app/(public)/neues-passwort/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { supabaseEphemeral } from '@/lib/supabase-client'

export default function ResetPasswordPage() {
  const supabase = supabaseEphemeral() // ⬅️ ephemeraler Client
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const triedRef = useRef(false)

  useEffect(() => {
    if (triedRef.current) return
    triedRef.current = true

    ;(async () => {
      try {
        // Falls Supabase die Session schon aus der URL hergestellt hat (nur ephemeraler Client):
        const { data: sess } = await supabase.auth.getSession()
        if (sess.session) {
          setInfo(
            'Sicherer Link erkannt. Sie können jetzt ein neues Passwort festlegen.',
          )
          setReady(true)
          return
        }

        // Tokens aus der URL prüfen (Recovery-Flow)
        const search =
          typeof window !== 'undefined' ? window.location.search : ''
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
            setInfo(
              'Sicherer Link erkannt. Sie können jetzt ein neues Passwort festlegen.',
            )
            setReady(true)
            return
          }
        }

        // Optionaler Fallback: PKCE-Code tauschen
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            setInfo(
              'Sicherer Link erkannt. Sie können jetzt ein neues Passwort festlegen.',
            )
            setReady(true)
            return
          }
        }

        setError(
          'Kein gültiger Wiederherstellungslink. Bitte fordern Sie einen neuen Link an.',
        )
        setReady(false)
      } catch (e) {
        setError(
          'Link ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.',
        )
        setReady(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Falls Supabase via Event signalisiert:
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setInfo(
          'Sicherer Link erkannt. Sie können jetzt ein neues Passwort festlegen.',
        )
        setReady(true)
      }
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInfo(null)
    setError(null)

    if (!ready) {
      setError(
        'Es konnte keine gültige Sitzung aus dem Link erstellt werden. Bitte rufen Sie die Seite erneut über den Link in Ihrer E-Mail auf.',
      )
      return
    }
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr

      // Ephemerale Session beenden
      await supabase.auth.signOut()

      setInfo(
        'Passwort erfolgreich aktualisiert. Sie werden nun zum Login weitergeleitet …',
      )
      setTimeout(() => router.push('/login'), 1200)
    } catch (err: any) {
      setError(
        err?.message || 'Fehler beim Zurücksetzen des Passworts. Bitte später erneut versuchen.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* dezenter Radial-Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9),_rgba(15,23,42,1))]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.45)] backdrop-blur-2xl ring-1 ring-white/60 sm:p-8">
            {/* Header */}
            <div className="mb-5 space-y-2 text-center">
              <p className="mx-auto inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Passwort zurücksetzen
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Neues Passwort festlegen
              </h1>
              <p className="text-xs text-slate-500 sm:text-[13px]">
                Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
                Öffnen Sie diese Seite immer direkt über den Link in Ihrer
                E-Mail.
              </p>
            </div>

            {/* Info / Fehler */}
            {info && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Neues Passwort */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Neues Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-100"
                    placeholder="••••••••"
                    disabled={!ready}
                  />
                  <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Mindestens 8 Zeichen, gerne mit Buchstaben, Zahlen und
                  Sonderzeichen.
                </p>
              </div>

              {/* Wiederholen */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Passwort wiederholen
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-100"
                    placeholder="••••••••"
                    disabled={!ready}
                  />
                  <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    disabled={!ready}
                  >
                    {showPw ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Button */}
              <motion.button
                type="submit"
                disabled={loading || !ready}
                whileHover={{ scale: loading || !ready ? 1 : 1.02 }}
                whileTap={{ scale: loading || !ready ? 1 : 0.98 }}
                className="mt-2 flex w-full items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Wird gespeichert …' : 'Passwort festlegen'}
              </motion.button>
            </form>

            {!ready && (
              <p className="mt-4 text-center text-[11px] text-slate-500">
                Hinweis: Öffnen Sie diese Seite ausschließlich über den Link in
                der E-Mail zum Zurücksetzen Ihres Passworts.
              </p>
            )}

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Zurück zum{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                Login
              </button>
              .
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
