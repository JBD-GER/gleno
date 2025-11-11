'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import {
  XMarkIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

type Props = {
  open: boolean
  onClose: () => void
}

const PRIMARY = '#0a1b40'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

export default function SignupModal({ open, onClose }: Props) {
  const supabase = supabaseClient()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  )

  function resetState() {
    setStep(1)
    setEmail('')
    setPassword('')
    setAcceptedPrivacy(false)
    setError(null)
  }

  function close() {
    if (loading) return
    onClose()
    setTimeout(() => resetState(), 200)
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!emailValid || password.length < 8) {
      setError('Bitte E-Mail und Passwort korrekt eingeben (min. 8 Zeichen).')
      return
    }

    if (!acceptedPrivacy) {
      setError('Bitte akzeptiere die Datenschutzerklärung, um fortzufahren.')
      return
    }

    setLoading(true)
    try {
      const { error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`,
          data: { role: 'konsument' },
        },
      })
      if (signErr) throw signErr

      setStep(3)
      setTimeout(() => {
        close()
        router.push('/danke?check_email=1')
      }, 800)
    } catch (err: any) {
      setError(err?.message ?? 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Dunkler, weicher Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Leicht animierter Glow im Hintergrund */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Modal */}
 <div className="relative w-full max-w-lg sm:max-w-xl lg:max-w-2xl rounded-3xl border border-white/35 bg-white/85 p-5 shadow-2xl ring-1 ring-white/60 backdrop-blur-2xl sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-50">
              <span>Kostenlos registrieren</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">
              In 60 Sekunden zur Anfrage –
              <span className="block text-slate-600 text-sm sm:text-base font-normal">
                Lass geprüfte Partner sich bei dir bewerben. Du entscheidest, wen du lässt.
              </span>
            </h3>
          </div>
          <button
            onClick={close}
            className="mt-1 rounded-2xl border border-white/70 bg-white/90 p-2 text-slate-500 hover:text-slate-800 hover:shadow-md transition"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress / Steps */}
        <div className="mt-4 flex items-center gap-2 text-[10px] font-medium text-slate-500">
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step >= 1 ? 'bg-sky-500' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step >= 2 ? 'bg-sky-500' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step === 3 ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
          <span className="ml-1">
            {step === 1 && 'Schritt 1: Vorteile & Ablauf'}
            {step === 2 && 'Schritt 2: Zugangsdaten'}
            {step === 3 && 'Fertig'}
          </span>
        </div>

        <div className="mt-5 space-y-5">
          {/* STEP 1: Value Proposition */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-500/25 bg-sky-50/90 p-4 ring-1 ring-sky-500/15">
                <div className="flex items-center gap-2 text-sky-900 font-semibold">
                  <InformationCircleIcon className="h-5 w-5" />
                  Warum ein Konto sinnvoll ist:
                </div>
                <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-800">
                  <li>🔒 <strong>Anonymisierte Anfrage:</strong> Deine Daten werden nicht öffentlich angezeigt.</li>
                  <li>🎯 <strong>Smartes Bewerbungsverfahren:</strong> Nur passende, geprüfte Partner können sich auf deine Anfrage bewerben.</li>
                  <li>📩 <strong>Direkter Vergleich im Portal:</strong> Angebote, Nachrichten & Termine übersichtlich an einem Ort.</li>
                  <li>💶 <strong>Für dich 100% kostenlos:</strong> Keine versteckten Gebühren, keine Verpflichtung.</li>
                  <li>✅ <strong>Volle Kontrolle:</strong> Du entscheidest, wen du freigibst, beauftragst oder ablehnst.</li>
                </ul>
              </div>

              {/* Trust-Badges */}
              <div className="grid grid-cols-3 gap-2 text-[9px] sm:text-[10px] text-slate-600">
                <div className="rounded-2xl bg-white/90 p-2 text-center shadow-sm border border-white/70">
                  DSGVO-konform
                </div>
                <div className="rounded-2xl bg-white/90 p-2 text-center shadow-sm border border-white/70">
                  Geprüfte Partner
                </div>
                <div className="rounded-2xl bg-white/90 p-2 text-center shadow-sm border border-white/70">
                  Jederzeit kündbar
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-[10px] sm:text-xs text-slate-500 leading-snug">
                  Kein Risiko, kein Spam. Du erhältst nur Antworten von Dienstleistern,
                  die sich gezielt auf deine Anfrage bewerben.
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl transition"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Jetzt kostenlos starten
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FORM */}
          {step === 2 && (
            <form onSubmit={onSignup} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-rose-300/70 bg-rose-50/90 px-4 py-2 text-xs sm:text-sm text-rose-900">
                  {error}
                </div>
              )}

              <div className="grid gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">
                    E-Mail-Adresse*
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/50"
                    placeholder="name@beispiel.de"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">
                    Passwort (min. 8 Zeichen)*
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Datenschutzerklärung Pflichtfeld */}
              <div className="mt-1 flex items-start gap-2">
                <input
                  id="privacy"
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400/60"
                />
                <label
                  htmlFor="privacy"
                  className="text-[9px] sm:text-[10px] leading-snug text-slate-700"
                >
                  Ich habe die{' '}
                  <Link
                    href="/datenschutz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-sky-700 hover:text-sky-900"
                  >
                    Datenschutzerklärung
                  </Link>{' '}
                  gelesen und akzeptiere diese.
                </label>
              </div>

              {/* Kurze Reminder zum Bewerbungsverfahren */}
              <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Partner bewerben sich bei dir – du wählst aus, völlig unverbindlich.
              </div>

              {/* Buttons */}
              <div className="mt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-xs sm:text-sm text-slate-700 hover:shadow-md transition"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={
                    loading || !emailValid || password.length < 8 || !acceptedPrivacy
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-xl transition"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {loading ? 'Registriere…' : 'Jetzt kostenlos registrieren'}
                  {!loading && <ArrowRightIcon className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-50/95 p-4 ring-1 ring-emerald-400/25">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <CheckCircleIcon className="h-5 w-5" />
                Registrierung fast abgeschlossen
              </div>
              <p className="mt-2 text-sm text-slate-800">
                Wir haben dir soeben eine Bestätigungs-E-Mail gesendet.
                Bitte rufe dein Postfach auf und klicke auf den Bestätigungslink.
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Sobald dein Konto bestätigt ist, kannst du deine Anfrage einstellen
                und die ersten Bewerbungen von passenden Partnern erhalten.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
