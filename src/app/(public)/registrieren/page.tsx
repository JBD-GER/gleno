'use client'

import {
  useMemo,
  useState,
  useEffect,
  Suspense,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const PRIMARY = '#5865f2'
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
 * → damit ist useSearchParams im Inneren sauber "eingekapselt"
 */
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50" />
      }
    >
      <RegisterPageContent />
    </Suspense>
  )
}

/**
 * Eigentliche Seite mit allen Hooks (inkl. useSearchParams)
 */
function RegisterPageContent() {
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

  // 👉 Referral-Code-State
  const [referralCode, setReferralCode] = useState<string | null>(null)

  // Referral-Code beim Laden der Seite holen:
  // 1. Aus URL (?ref=...)
  // 2. Falls nicht vorhanden: aus localStorage
  useEffect(() => {
    try {
      const paramsRef = searchParams.get('ref')

      console.log('RegisterPage searchParams:', searchParams.toString())
      console.log('RegisterPage ?ref=', paramsRef)

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
            content_id: 'gleno_free_registration',
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
        }),
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(payload.error ?? 'Unbekannter Fehler bei der Registrierung.')
        setLoading(false)
        return
      }

      // 👉 TikTok-Event feuern
      trackTikTokSignup()

      router.push('/danke')
    } catch (err: any) {
      setError(err?.message ?? 'Netzwerkfehler.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden from-slate-50 via-slate-50 to-sky-50/40">
      {/* leichte Radial-Glows, sehr hell */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-80"
        style={{
          background:
            'radial-gradient(800px 320px at 15% 0%, rgba(88,101,242,0.14), transparent),' +
            'radial-gradient(900px 360px at 85% 0%, rgba(129,140,248,0.14), transparent)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-80 w-[1100px] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            'radial-gradient(600px 220px at 50% 100%, rgba(15,23,42,0.08), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Kopfbereich / Hero */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
            <span>7 Tage Testphase sichern – alle Funktionen inklusive</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Erstelle dein GLENO Konto in wenigen Minuten.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Teste die GLENO Unternehmenssoftware 7 Tage lang mit allen Bereichen:
            Aufträge, Projekte, Rechnungen, Zeiten, Team, Dokumente &amp; Logistik.
            Danach entscheidest du in Ruhe, ob du weitermachst.
          </p>

          {hasReferral && (
            <p className="mx-auto mt-3 max-w-xl text-xs text-emerald-700">
              Du registrierst dich mit einem Empfehlungs-Code:{' '}
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                {referralCode}
              </span>
            </p>
          )}
        </header>

        {/* Haupt-Card: Formular + Info-Spalte */}
        <motion.div
          className="grid grid-cols-1 gap-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Formular-Spalte */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Konto anlegen &amp; 7 Tage testen
              </h2>
              <p className="text-[11px] text-slate-500">
                Keine Kreditkarte nötig · Monatlich kündbar nach der Testphase
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Vorname
                  </label>
                  <input
                    name="given-name"
                    autoComplete="given-name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Meine Firma GmbH"
                />
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Straße
                  </label>
                  <input
                    name="street-address"
                    autoComplete="address-line1"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-[1px] ${
                    email.length === 0
                      ? 'border-slate-200 bg-white focus:border-slate-400 focus:ring-slate-300'
                      : emailValid
                      ? 'border-emerald-300 bg-emerald-50/60 focus:border-emerald-400 focus:ring-emerald-200'
                      : 'border-amber-300 bg-amber-50/60 focus:border-amber-400 focus:ring-amber-200'
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-[1px] focus:ring-slate-300"
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
                    className="h-full"
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
                <p className="mt-1 text-[12px] text-slate-500">
                  Passwortstärke: {pwLabel}
                </p>
              </div>

              {/* Rechtliches */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <label className="flex items-start gap-2 text-xs text-slate-800">
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
                      className="font-medium text-slate-900 underline underline-offset-2"
                    >
                      AGB
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-800">
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
                      className="font-medium text-slate-900 underline underline-offset-2"
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
                className="group relative mt-1 w-full overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white
             bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.15),#0F172A)]
             shadow-[0_14px_40px_rgba(15,23,42,0.45)]
             transition hover:shadow-[0_18px_55px_rgba(15,23,42,0.7)]
             disabled:opacity-60"
              >
                <span
                  className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                >
                  Konto erstellen &amp; 7 Tage testen
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

              <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                7 Tage kostenlos · Du kannst die Testphase jederzeit beenden.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Bereits ein Konto?{' '}
              <Link
                href="/login"
                className="font-semibold text-slate-900 underline underline-offset-2"
              >
                Jetzt einloggen
              </Link>
            </p>
          </div>

          {/* Info-/Trust-Spalte mit Bild */}
          <div className="flex flex-col justify-between rounded-2xl bg-slate-50/80 px-5 py-6 ring-1 ring-slate-100 sm:px-6 sm:py-7">
            <div>
              {/* Team-Bild oben */}

              <h3 className="text-lg font-semibold text-slate-900">
                Alle Funktionen inklusive – ein Preis später.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Während der 7-tägigen Testphase kannst du GLENO vollumfänglich nutzen:
                Auftragsmanagement, Projekte, Rechnungen, Zeiterfassung, Team,
                Dokumenten-Cloud, Logistik, Vault &amp; Kennzahlen.
              </p>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  'Unbegrenzte Aufträge & Projekte – ohne Funktionsbeschränkung.',
                  'Beliebig viele Team-Mitglieder hinzufügen, kein Nutzer-Limit.',
                  'Server in der EU, DSGVO-konforme Unternehmenssoftware.',
                  'Export deiner wichtigsten Daten jederzeit möglich.',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Noch Fragen vor der Registrierung?
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link
                  href="/beratung"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  30 Tage Testphase sichern
                </Link>
                <a
                  href="tel:+4950353169991"
                  className="inline-flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <PhoneIcon className="h-4 w-4" />
                  +49&nbsp;5035&nbsp;3169991
                </a>
                <a
                  href="mailto:support@gleno.de"
                  className="inline-flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
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
