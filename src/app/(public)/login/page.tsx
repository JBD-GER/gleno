// src/app/(public)/login/page.tsx
'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

const PRIMARY = '#5865f2'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://software-fliesenleger.de')

function CheckEmailEffect({ onInfo }: { onInfo: (msg: string) => void }) {
  const qp = useSearchParams()
  useEffect(() => {
    if (qp?.get('check_email') === '1') {
      onInfo('Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse.')
    }
  }, [qp, onInfo])
  return null
}

export default function LoginPage() {
  const supabase = supabaseClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [canResend, setCanResend] = useState(false)

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setCanResend(false)

    if (!emailValid || password.length < 8) {
      setError('Bitte E-Mail und Passwort korrekt eingeben.')
      return
    }

    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        return
      }

      // User abrufen und Bestätigung prüfen
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError('Fehler beim Abrufen des Benutzers.')
        return
      }
      const user = data.user
      if (!user?.email_confirmed_at) {
        await supabase.auth.signOut()
        setError('Deine E-Mail ist noch nicht bestätigt.')
        setCanResend(true)
        return
      }

      // Profil sicherstellen + Rolle NUR aus profiles nehmen
      let profileRole: string | null = null
      try {
        const res = await fetch('/api/profiles/ensure', { method: 'POST' })
        if (res.ok) {
          const j = await res.json()
          profileRole = j?.role || null
        }
      } catch {
        // Ignorieren – wir leiten dann auf Dashboard, falls Rolle unbekannt
      }

      if (profileRole === 'konsument') {
        router.push('/konsument')
      } else {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setInfo(null)
    if (!emailValid) {
      setError('Bitte zuerst eine gültige E-Mail eintragen.')
      return
    }
    setLoading(true)
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
      })
      if (resendErr) throw resendErr
      setInfo('Bestätigungslink wurde erneut gesendet.')
    } catch (err: any) {
      setError(err?.message ?? 'Konnte die E-Mail nicht erneut senden.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    setError(null)
    setInfo(null)
    if (!emailValid) {
      setError('Bitte gib deine E-Mail ein, um den Reset-Link zu erhalten.')
      return
    }
    setLoading(true)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/neues-passwort`,
      })
      if (resetErr) throw resetErr
      setInfo('Falls die E-Mail existiert, wurde ein Reset-Link versendet.')
    } catch (err: any) {
      setError(err?.message ?? 'Konnte die Reset-E-Mail nicht senden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220]">
      <Suspense fallback={null}>
        <CheckEmailEffect onInfo={setInfo} />
      </Suspense>

      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(1200px 520px at 50% -10%, rgba(88,101,242,0.14), transparent),' +
            'radial-gradient(900px 420px at 10% 0%, rgba(88,101,242,0.12), transparent),' +
            'radial-gradient(900px 420px at 90% 0%, rgba(139,92,246,0.10), transparent)',
        }}
      />
      <motion.div
        className="absolute -top-32 -left-20 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(88,101,242,.20), rgba(88,101,242,0))' }}
        initial={{ opacity: 0.5, scale: 0.9 }}
        animate={{ opacity: [0.5, 0.65, 0.5], scale: [0.9, 1, 0.9] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-20 h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,.18), rgba(139,92,246,0))' }}
        initial={{ opacity: 0.45, scale: 0.95 }}
        animate={{ opacity: [0.45, 0.6, 0.45], scale: [0.95, 1.03, 0.95] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur">
            <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
            Sicher & DSGVO – Server in der EU
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Willkommen zurück
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
            Melde dich an und arbeite weiter an Angeboten, Material & Terminen.
          </p>
        </div>

        <motion.div
          className="mx-auto grid max-w-3xl grid-cols-1 gap-6 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-8"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {info && (
            <div className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {info}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/80">E-Mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-4 py-3 pl-11 text-black outline-none focus:bg-white ${
                    email.length === 0
                      ? 'border-white/20 bg-white/80 focus:border-white/30'
                      : emailValid
                      ? 'border-emerald-400/70 bg-white'
                      : 'border-amber-400/70 bg-white'
                  }`}
                  placeholder="name@firma.de"
                />
                <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/80">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/20 bg-white/80 px-4 pl-12 pr-12 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                  placeholder="••••••••"
                />
                <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:bg-slate-200/70"
                  aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>

              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-white/80 underline-offset-4 hover:underline"
                >
                  Passwort vergessen?
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-lg transition enabled:hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{loading ? 'Anmeldung…' : 'Einloggen'}</span>
                {!loading && <ArrowRightIcon className="h-5 w-5 opacity-90" />}
              </motion.button>

              {canResend && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResend}
                  className="w-full rounded-full border border-white/20 bg-white/15 px-6 py-3 text-sm font-medium text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
                >
                  Bestätigungs-E-Mail erneut senden
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-white/80">
            Noch kein Konto?{' '}
            <Link href="/registrieren" className="font-semibold text-white underline-offset-2 hover:underline">
              Registrieren
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
