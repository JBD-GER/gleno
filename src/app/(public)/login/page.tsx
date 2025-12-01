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
  PhoneIcon,
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

const PRIMARY = '#0F172A'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://gleno.de')

function CheckEmailEffect({ onInfo }: { onInfo: (msg: string) => void }) {
  const qp = useSearchParams()
  useEffect(() => {
    if (qp?.get('check_email') === '1') {
      onInfo(
        'Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse, um dich einloggen zu können.'
      )
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

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  )

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // User abrufen & Bestätigung prüfen
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError('Fehler beim Abrufen des Benutzers.')
        setLoading(false)
        return
      }

      const user = data.user
      if (!user?.email_confirmed_at) {
        await supabase.auth.signOut()
        setError('Deine E-Mail ist noch nicht bestätigt.')
        setCanResend(true)
        setLoading(false)
        return
      }

      // Profil sicherstellen & Rolle aus profiles holen
      let profileRole: string | null = null
      try {
        const res = await fetch('/api/profiles/ensure', { method: 'POST' })
        if (res.ok) {
          const j = await res.json()
          profileRole = j?.role || null
        }
      } catch {
        // Ignorieren – Fallback Routing
      }

      // Zentrales Login: Rolle entscheidet Ziel
      if (profileRole === 'konsument') {
        router.push('/konsument')
      } else {
        router.push('/dashboard')
      }
      // WICHTIG: loading hier NICHT zurücksetzen -> Spinner läuft,
      // bis die Seite gewechselt ist und die Komponente unmountet.
    } catch (err: any) {
      setError(err?.message ?? 'Unbekannter Fehler bei der Anmeldung.')
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
      const { error: resetErr } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_URL}/neues-passwort`,
        })
      if (resetErr) throw resetErr
      setInfo(
        'Falls diese E-Mail bei uns hinterlegt ist, haben wir dir einen Link zum Zurücksetzen geschickt.'
      )
    } catch (err: any) {
      setError(err?.message ?? 'Konnte die Reset-E-Mail nicht senden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden ">
      <Suspense fallback={null}>
        <CheckEmailEffect onInfo={setInfo} />
      </Suspense>

      {/* Radiale Glows wie bei Registrierung */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-80"
        style={{
          background:
            'radial-gradient(800px 320px at 15% 0%, rgba(15,23,42,0.14), transparent),' +
            'radial-gradient(900px 360px at 85% 0%, rgba(15,23,42,0.12), transparent)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-80 w-[1100px] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            'radial-gradient(600px 220px at 50% 100%, rgba(15,23,42,0.10), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Kopfbereich */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">
              <span className="text-base leading-none">🔐</span>
              <span>Zentraler Login für GLENO Unternehmenssoftware &amp; Marktplatz</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Willkommen zurück bei GLENO.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Melde dich mit deiner Geschäfts-E-Mail an. Wir leiten dich automatisch
              in das passende Dashboard – Unternehmensbereich oder Konsumentenbereich –
              abhängig von deiner hinterlegten Rolle.
            </p>
          </div>
        </header>

        {/* Card: Login + Info-Spalte */}
        <motion.div
          className="grid grid-cols-1 gap-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Linke Spalte – Formular */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Einloggen in dein GLENO Konto
              </h2>
              <p className="text-[11px] text-slate-500">
                Sicherer Login · Server in der EU · Rollenbasierter Zugriff
              </p>
            </div>

            {info && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* E-Mail */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  E-Mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3.5 py-2.5 pl-10 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-[1px] ${
                      email.length === 0
                        ? 'border-slate-200 bg-white focus:border-slate-400 focus:ring-slate-300'
                        : emailValid
                        ? 'border-emerald-300 bg-emerald-50/60 focus:border-emerald-400 focus:ring-emerald-200'
                        : 'border-amber-300 bg-amber-50/60 focus:border-amber-400 focus:ring-amber-200'
                    }`}
                    placeholder="name@firma.de"
                  />
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
                    placeholder="Mind. 8 Zeichen"
                  />
                  <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Buttons + Passwort vergessen in EINER Reihe */}
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white
                             bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.15),#0F172A)]
                             shadow-[0_14px_40px_rgba(15,23,42,0.45)]
                             transition hover:shadow-[0_18px_55px_rgba(15,23,42,0.7)]
                             disabled:opacity-60 sm:w-auto"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <span
                    className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                  >
                    Einloggen
                  </span>
                  {loading && (
                    <span className="absolute inset-0 grid place-items-center">
                      <svg
                        className="h-5 w-5 animate-spin text-white"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-30"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-80"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    </span>
                  )}
                  {!loading && (
                    <ArrowRightIcon className="ml-2 inline-block h-5 w-5 opacity-90" />
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-left text-[11px] font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline sm:text-right"
                >
                  Passwort vergessen?
                </button>
              </div>

              {/* Resend-Button darunter */}
              {canResend && (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResend}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-white disabled:opacity-60 sm:w-auto"
                  >
                    Bestätigungs-E-Mail erneut senden
                  </button>
                </div>
              )}
            </form>

{/* Info unter dem Formular weiter nach unten */}
<div className="mt-8 border-t border-slate-200 pt-4 space-y-3 text-center">
  <p className="text-[11px] text-slate-500">
    Mit deinem Zugang kannst du dich sowohl im Unternehmens-Dashboard (Betrieb &amp; Team)
    als auch im Konsumentenbereich des Marktplatzes anmelden – abhängig von deiner
    hinterlegten Rolle.
  </p>

  <p className="text-sm text-slate-700">
    Noch kein Konto?{' '}
    <Link
      href="/registrieren"
      className="font-semibold text-slate-900 underline underline-offset-2"
    >
      Jetzt registrieren
    </Link>
  </p>
</div>
          </div>

          {/* Rechte Spalte – Info & Trust */}
          <div className="flex flex-col justify-between rounded-2xl bg-slate-50/80 px-5 py-6 ring-1 ring-slate-100 sm:px-6 sm:py-7">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Dein Zugang zur GLENO Unternehmenssoftware.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Mit einem Login behältst du Aufträge, Projekte, Rechnungen, Zeiten,
                Termine und Marktplatz-Aktivitäten im Blick – ohne Tool-Chaos.
              </p>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  'Ein Login für Unternehmens-Dashboard & Marktplatz – Rolle entscheidet über die Ansicht.',
                  'Server in der EU, TLS-verschlüsselte Verbindung und DSGVO-konforme Prozesse.',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hilfe beim Login?
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <a
                  href="tel:+4950353169991"
                  className="inline-flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900"
                >
                  <PhoneIcon className="h-4 w-4" />
                  +49&nbsp;5035&nbsp;3169991
                </a>
                <a
                  href="mailto:support@gleno.de"
                  className="inline-flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  support@gleno.de
                </a>
              </div>
            </div>
          </div>
          
        </motion.div>
          {/* Auszeichnungen / Social Proof unterhalb der Card */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md text-[11px] sm:text-xs text-slate-600">
              <p className="text-sm font-semibold text-slate-900 sm:text-[13px]">
                GLENO wird bereits von Dienstleistern &amp; KMU im Alltag getestet.
              </p>
              <p className="mt-1 leading-relaxed">
                Entwickelt von Unternehmern aus der Praxis – mit Fokus auf klare Abläufe
                statt Feature-Wirrwarr. Feedback aus Pilot-Teams fließt direkt in die
                Weiterentwicklung ein.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                <span className="mr-1 text-amber-400">★ ★ ★ ★ ★</span>
                4,8 / 5 in Pilot-Teams
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                Made in Germany
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                Server in der EU
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                Für Dienstleister &amp; KMU entwickelt
              </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                Ohne Verbindlichkeit
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                0€ Kosten für die Testphase
              </span>
            </div>
          </div>
        </section>
      </div>
      
    </div>
  )
}
