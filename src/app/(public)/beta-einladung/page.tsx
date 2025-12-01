'use client'

import {
  useMemo,
  useState,
  useEffect,
  Suspense,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const PRIMARY = '#0F172A' // dunkles Navy als Akzent
const TERMS_VERSION = '1'
const PRIVACY_VERSION = '1'
const REFERRAL_STORAGE_KEY = 'gleno_referral_code'

// 👉 fiktiver Conversion-Wert für kostenlose Registrierung
const TIKTOK_SIGNUP_VALUE = 10

const COUNTRY_OPTIONS = [
  { label: 'Deutschland', value: 'DE' },
  { label: 'Österreich', value: 'AT' },
  { label: 'Schweiz', value: 'CH' },
  { label: 'Frankreich', value: 'FR' },
  { label: 'Italien', value: 'IT' },
  { label: 'Spanien', value: 'ES' },
]

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function passwordScore(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

/**
 * Äußere Page-Komponente: nur Suspense + Wrapper
 */
export default function BetaEinladungPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <BetaEinladungPageContent />
    </Suspense>
  )
}

/**
 * Eigentliche Seite mit allen Hooks
 */
function BetaEinladungPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [street, setStreet] = useState('')
  const [houseNo, setHouseNo] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('DE')

  const [companyName, setCompanyName] = useState('')
  const [vatNumber, setVatNumber] = useState('')

  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 👉 Referral-Code (optional)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  // Referral-Code aus URL oder localStorage
  useEffect(() => {
    try {
      const paramsRef = searchParams.get('ref')

      if (paramsRef && paramsRef.trim().length > 0) {
        const clean = paramsRef.trim()
        setReferralCode(clean)
        try {
          localStorage.setItem(REFERRAL_STORAGE_KEY, clean)
        } catch {
          // ignore
        }
        return
      }

      try {
        const stored = localStorage.getItem(REFERRAL_STORAGE_KEY)
        if (stored && stored.trim().length > 0) {
          setReferralCode(stored.trim())
        }
      } catch {
        // ignore
      }
    } catch (e) {
      console.error('Fehler beim Lesen des Referral-Codes:', e)
    }
  }, [searchParams])

  const hasReferral = !!(referralCode && referralCode.trim().length > 0)

  const emailValid = useMemo(() => validateEmail(email), [email])
  const pwScore = useMemo(() => passwordScore(password), [password])
  const pwLabel = ['zu kurz', 'schwach', 'okay', 'gut', 'stark'][pwScore]

  const canSubmit =
    !loading &&
    firstName.trim() &&
    lastName.trim() &&
    emailValid &&
    password.length >= 8 &&
    street.trim() &&
    houseNo.trim() &&
    zip.trim() &&
    city.trim() &&
    country.trim() &&
    acceptTerms &&
    acceptPrivacy

  // 👉 TikTok Pixel Event für kostenlose Registrierung
  function trackTikTokSignup() {
    try {
      if (typeof window === 'undefined') return
      const w = window as any
      const ttq = w.ttq
      if (!ttq || typeof ttq.track !== 'function') return

      ttq.track('CompleteRegistration', {
        value: TIKTOK_SIGNUP_VALUE,
        currency: 'EUR',
        contents: [
          {
            content_type: 'signup',
            content_id: 'gleno_beta_registration',
            quantity: 1,
            price: TIKTOK_SIGNUP_VALUE,
          },
        ],
      })
    } catch (e) {
      console.error('TikTok Tracking Fehler:', e)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      setError(
        'Bitte alle Pflichtfelder korrekt ausfüllen und AGB/Datenschutz akzeptieren.'
      )
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName || null,
          vat_number: vatNumber || null,
          street,
          house_number: houseNo,
          postal_code: zip,
          city,
          country,
          accept_terms: true,
          accept_privacy: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          referral_code: referralCode,
          // 👉 WICHTIG: Beta-Flag mitgeben
          beta_invite: true,
        }),
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(payload.error ?? 'Unbekannter Fehler bei der Registrierung.')
        setLoading(false)
        return
      }

      trackTikTokSignup()

      router.push('/danke')
    } catch (err: any) {
      setError(err?.message ?? 'Netzwerkfehler.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen ">
      {/* dezent: Glass-Ring in der Mitte */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-72 w-72 rounded-full bg-white/60 blur-3xl shadow-[0_0_120px_rgba(15,23,42,0.15)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8">
        {/* Intro / Hero */}
        <div className="mb-8 text-center sm:mb-10">
          <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
            <span className="text-base leading-none">🎉</span>
            <span>Exklusive Beta-Einladung · Dauerhaft kostenlos</span>
          </span>
          <h1 className="mx-auto max-w-3xl text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Du gehörst zu den ersten Unternehmen, die GLENO offiziell testen
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-[15px]">
            Diese Seite ist nur über deine persönliche Einladung erreichbar.
            Dein Zugang bleibt dauerhaft kostenlos – im Gegenzug wünschen wir
            uns ehrliches Feedback & die ein oder andere Empfehlung.
          </p>

          {hasReferral && (
            <p className="mx-auto mt-3 max-w-xl text-xs text-emerald-700">
              Du registrierst dich mit einem Empfehlungs-Code:{' '}
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-900 ring-1 ring-emerald-200">
                {referralCode}
              </span>
            </p>
          )}

          <p className="mx-auto mt-4 max-w-xl text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
            Limitiert · Dein Platz als Beta-Unternehmen ist reserviert
          </p>
        </div>

        {/* Card */}
        <motion.div
          className="grid grid-cols-1 gap-6 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 lg:p-8"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Formular-Spalte */}
          <div className="flex flex-col">
            <h2 className="mb-4 text-center text-xl font-semibold text-slate-900 sm:mb-5">
              Beta-Zugang anlegen
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 sm:text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              autoComplete="on"
              className="space-y-4"
            >
              {/* Name */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Vorname
                  </label>
                  <input
                    name="given-name"
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nachname
                  </label>
                  <input
                    name="family-name"
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Firma optional */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Firmenname (optional)
                </label>
                <input
                  name="organization"
                  autoComplete="organization"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Straße
                  </label>
                  <input
                    name="street-address"
                    autoComplete="address-line1"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                    placeholder="Beispielstraße"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Hausnummer
                  </label>
                  <input
                    name="address-line2"
                    autoComplete="address-line2"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    required
                    placeholder="12A"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    PLZ
                  </label>
                  <input
                    name="postal-code"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    placeholder="10115"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Ort
                  </label>
                  <input
                    name="address-level2"
                    autoComplete="address-level2"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="Berlin"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Land
                  </label>
                  <select
                    name="country"
                    autoComplete="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* USt-ID optional */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  USt-ID (optional)
                </label>
                <input
                  name="vat-number"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="DE123456789"
                />
              </div>

              {/* E-Mail */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-900/5 ${
                    email.length === 0
                      ? 'border-slate-200 bg-slate-50 focus:border-slate-400'
                      : emailValid
                      ? 'border-emerald-300 bg-emerald-50/60 focus:border-emerald-400'
                      : 'border-amber-300 bg-amber-50/70 focus:border-amber-400'
                  }`}
                  placeholder="name@firma.de"
                />
              </div>

              {/* Passwort */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Mind. 8 Zeichen"
                  />
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
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(pwScore / 4) * 100}%`,
                      background:
                        pwScore < 2
                          ? '#f59e0b'
                          : pwScore < 3
                          ? '#22c55e'
                          : '#16a34a',
                      transition: 'width .25s ease',
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Passwortstärke: {pwLabel}
                </p>
              </div>

              {/* Rechtliches */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
                <label className="flex items-start gap-2 text-xs text-slate-700 sm:text-sm">
                  <input
                    type="checkbox"
                    name="accept-terms"
                    className="mt-0.5"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                  />
                  <span>
                    Ich akzeptiere die{' '}
                    <Link
                      href="/agb"
                      className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
                    >
                      AGB
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 sm:text-sm">
                  <input
                    type="checkbox"
                    name="accept-privacy"
                    className="mt-0.5"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    required
                  />
                  <span>
                    Ich habe die{' '}
                    <Link
                      href="/datenschutz"
                      className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
                    >
                      Datenschutzerklärung
                    </Link>{' '}
                    gelesen und akzeptiere sie.
                  </span>
                </label>
                <p className="mt-1 text-[11px] text-slate-500">
                  Versionen: AGB v{TERMS_VERSION} · Datenschutz v{PRIVACY_VERSION}
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative mt-2 w-full overflow-hidden rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                <span
                  className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                >
                  Beta-Zugang jetzt sichern
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
              </button>

              <p className="mt-4 text-center text-xs text-slate-500">
                <CheckCircleIcon className="mr-1 inline h-4 w-4 align-[-2px] text-emerald-500" />
                Nach der Registrierung erhältst du eine E-Mail zur Bestätigung.
              </p>
            </form>

            <p className="mt-5 text-center text-xs text-slate-600 sm:text-sm">
              Bereits ein Konto?{' '}
              <Link
                href="/login"
                className="font-semibold text-slate-900 underline-offset-2 hover:underline"
              >
                Jetzt einloggen
              </Link>
            </p>
          </div>

          {/* Info-Spalte */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-inner shadow-slate-200/60 backdrop-blur-md sm:p-5 lg:p-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-medium text-slate-700">
                <ShieldCheckIcon className="h-4 w-4" />
                <span>Beta-Unternehmen · Kein Abo · Kein Haken</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">
                Was bedeutet Beta für dich?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Du nutzt GLENO als eines der ersten Unternehmen – dauerhaft
                kostenlos. Alle neuen Funktionen landen zuerst bei dir.
              </p>
              <ul className="mt-4 space-y-2.5 text-slate-700">
                {[
                  'Dauerhaft 100% kostenlos – auch nach der Beta',
                  'Voller Zugriff auf Angebote, Aufträge & Rechnungen',
                  'Team- & Terminplanung, Dokumente, Fotos & mehr',
                  'Du bestimmst mit deinem Feedback, wie GLENO sich entwickelt',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-sm leading-snug">{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
                Das Einzige, worum wir dich bitten: ehrliches Feedback,
                gelegentliche kurze Abstimmungen und – wenn du zufrieden bist –
                die ein oder andere Empfehlung an Unternehmen aus deiner Branche.
              </p>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Direkt erreichbar
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-1">
                <a
                  href="tel:+4950353169991"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  <PhoneIcon className="h-5 w-5" /> +49&nbsp;5035&nbsp;3169991
                </a>
                <a
                  href="mailto:support@gleno.de"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  <EnvelopeIcon className="h-5 w-5" /> support@gleno.de
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
