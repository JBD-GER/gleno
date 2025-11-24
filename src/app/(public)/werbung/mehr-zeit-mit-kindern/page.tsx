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
import { StarIcon } from '@heroicons/react/20/solid'

const PRIMARY = '#0F172A'
const TERMS_VERSION = '1'
const PRIVACY_VERSION = '1'
const REFERRAL_STORAGE_KEY = 'gleno_referral_code'

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

/* -------------------------------------------------------------------------- */
/* Page Wrapper mit Suspense (für useSearchParams)                            */
/* -------------------------------------------------------------------------- */

export default function FamilyTimeLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <FamilyTimeLandingPageContent />
    </Suspense>
  )
}

/* -------------------------------------------------------------------------- */
/* Eigentliche Landingpage mit Formular                                      */
/* -------------------------------------------------------------------------- */

function FamilyTimeLandingPageContent() {
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

  // Referral-Code-State
  const [referralCode, setReferralCode] = useState<string | null>(null)

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

      router.push('/danke')
    } catch (err: any) {
      setError(err?.message ?? 'Netzwerkfehler.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      {/* Glow-Background */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(1200px 520px at 50% -10%, rgba(15,23,42,0.9), transparent),' +
            'radial-gradient(800px 420px at 0% 0%, rgba(15,23,42,0.9), transparent),' +
            'radial-gradient(1000px 520px at 100% 0%, rgba(30,64,175,0.35), transparent)',
        }}
      />
      <motion.div
        className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(30,64,175,0.35), rgba(15,23,42,0))',
        }}
        initial={{ opacity: 0.4, scale: 0.95 }}
        animate={{ opacity: [0.4, 0.6, 0.4], scale: [0.95, 1.02, 0.95] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(15,23,42,0.8), rgba(15,23,42,0))',
        }}
        initial={{ opacity: 0.45, scale: 0.96 }}
        animate={{ opacity: [0.45, 0.7, 0.45], scale: [0.96, 1.03, 0.96] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-10 sm:px-5 sm:pt-14 lg:pt-16">
        {/* HERO-TOP: Story / Hook */}
        <header className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-sky-100 ring-1 ring-white/15 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Für Selbstständige &amp; KMU mit Familie</span>
              <span className="hidden text-slate-400 sm:inline">•</span>
              <span className="hidden sm:inline">Weniger Büro, mehr Zuhause</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.55rem] lg:leading-tight">
              Zu wenig Zeit mit Ihren Kindern&nbsp;wegen Papierkram?
              <span className="mt-1 block text-[1.8rem] sm:text-[2rem] text-slate-100">
                GLENO nimmt Ihnen Angebote &amp; Rechnungen in Minuten ab.
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-[15px]">
              Wenn andere schon auf dem Sofa sitzen, kämpfen Sie noch mit Word, Excel
              und Ordnern? GLENO automatisiert Angebote, Rechnungen und Abläufe –
              damit Feierabend wieder Feierabend ist.
            </p>

            <div className="mt-4 grid gap-2 text-sm text-slate-100 sm:text-[14px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>Angebote &amp; Rechnungen in Minuten.</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Mehr Zeit mit Ihren Kindern.</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>GLENO regelt den Rest.</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Inspiriert vom Video: trauriges Kind, dramatischer Bass – die Realität
              vieler Unternehmerfamilien. Hier beginnt die Alternative.
            </p>
          </div>

          {/* “Video”-Teaser / Trust-Kachel */}
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-4 text-sm text-slate-100 shadow-[0_22px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                WIEDER ZEIT FÜR WICHTIGES
              </p>
              <p className="mt-2 text-[13px] text-slate-100">
                GLENO ist die schlanke Unternehmenssoftware für Menschen, deren
                wichtigstes Projekt nicht das Büro ist – sondern die eigene Familie.
              </p>
              <ul className="mt-3 space-y-1.5 text-[13px] text-slate-100">
                <li>• 1 System statt 5 Tools: Angebote, Rechnungen &amp; CRM</li>
                <li>• In Minuten statt Stunden: vordefinierte Vorlagen &amp; Workflows</li>
                <li>• Zugriff von überall: Büro, Baustelle oder Sofa</li>
              </ul>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} className="h-4 w-4 text-amber-300" />
                  ))}
                </div>
                <span>4,9 / 5,0 – basierend auf Rückmeldungen aus der Beta</span>
              </div>
            </div>
          </div>
        </header>

        {/* CARD: Formular + Vorteile / Micro-Reviews */}
        <motion.div
          className="grid grid-cols-1 gap-6 rounded-3xl border border-white/15 bg-white/5 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Formular-Spalte */}
          <div>
            <div className="mb-4 text-center sm:text-left">
              <span className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-400/40 backdrop-blur sm:mx-0">
                <ShieldCheckIcon className="h-4 w-4" />
                7 Tage kostenlos testen – ohne Kreditkarte
              </span>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                In 2 Minuten starten – und heute früher zu Hause sein.
              </h2>
              <p className="mt-1 text-xs text-slate-200">
                Konto anlegen, GLENO ausprobieren, Bürozeit reduzieren. Wenn es
                nicht passt, einfach nicht weiternutzen.
              </p>

              {hasReferral && (
                <p className="mt-2 text-[11px] text-emerald-200">
                  Sie registrieren sich mit einem Empfehlungs-Code:{' '}
                  <span className="rounded-md bg-emerald-900/40 px-2 py-1 font-mono text-[11px]">
                    {referralCode}
                  </span>
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-300/40 bg-rose-300/10 p-3 text-xs text-rose-100">
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
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Vorname
                  </label>
                  <input
                    name="given-name"
                    autoComplete="given-name"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Nachname
                  </label>
                  <input
                    name="family-name"
                    autoComplete="family-name"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Firma optional */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-white/80">
                  Firmenname (optional)
                </label>
                <input
                  name="organization"
                  autoComplete="organization"
                  className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Straße
                  </label>
                  <input
                    name="street-address"
                    autoComplete="address-line1"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                    placeholder="Beispielstraße"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Hausnummer
                  </label>
                  <input
                    name="address-line2"
                    autoComplete="address-line2"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    required
                    placeholder="12A"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    PLZ
                  </label>
                  <input
                    name="postal-code"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    placeholder="10115"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Ort
                  </label>
                  <input
                    name="address-level2"
                    autoComplete="address-level2"
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="Berlin"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-white/80">
                    Land
                  </label>
                  <select
                    name="country"
                    autoComplete="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="w-full appearance-none rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
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
                <label className="mb-1 block text-[11px] font-medium text-white/80">
                  USt-ID (optional)
                </label>
                <input
                  name="vat-number"
                  autoComplete="off"
                  className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="DE123456789"
                />
              </div>

              {/* E-Mail */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-white/80">
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-black outline-none focus:bg-white ${
                    email.length === 0
                      ? 'border-white/15 bg-white/80 focus:border-white/40'
                      : emailValid
                      ? 'border-emerald-400/70 bg-white'
                      : 'border-amber-400/70 bg-white'
                  }`}
                  placeholder="name@firma.de"
                />
              </div>

              {/* Passwort */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-white/80">
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
                    className="w-full rounded-lg border border-white/15 bg-white/80 px-3.5 py-2.5 pr-11 text-sm text-black outline-none focus:border-white/40 focus:bg-white"
                    placeholder="Mind. 8 Zeichen"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:bg-slate-200/70"
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
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
                <p className="mt-1 text-[11px] text-white/70">
                  Passwortstärke: {pwLabel}
                </p>
              </div>

              {/* Rechtliches */}
              <div className="space-y-2 rounded-xl border border-white/18 bg-white/5 p-3">
                <label className="flex items-start gap-2 text-[12px] text-white/90">
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
                      className="underline underline-offset-2 hover:opacity-90"
                    >
                      AGB
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[12px] text-white/90">
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
                      className="underline underline-offset-2 hover:opacity-90"
                    >
                      Datenschutzerklärung
                    </Link>{' '}
                    gelesen und akzeptiere sie.
                  </span>
                </label>
                <p className="mt-1 text-[10px] text-white/60">
                  Versionen: AGB v{TERMS_VERSION} · Datenschutz v{PRIVACY_VERSION}
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative mt-2 w-full overflow-hidden rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition enabled:hover:bg-indigo-700 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                <span
                  className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                >
                  Jetzt kostenlos testen
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

              <p className="mt-3 text-center text-[11px] text-white/65">
                <CheckCircleIcon className="mr-1 inline h-4 w-4 align-[-2px] text-emerald-300" />
                Nach der Registrierung erhalten Sie eine E-Mail zur Bestätigung.
              </p>
            </form>

            <p className="mt-5 text-center text-xs text-white/75">
              Bereits ein Konto?{' '}
              <Link
                href="/login"
                className="font-semibold text-white hover:underline"
              >
                Jetzt einloggen
              </Link>
            </p>
          </div>

          {/* Info / Painpoints / Social Proof */}
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-white/15 bg-white/5 p-4 ring-1 ring-white/10 sm:p-5">
            <div>
              <h3 className="text-lg font-semibold text-white sm:text-xl">
                Was GLENO Eltern wirklich zurückgibt:
              </h3>
              <p className="mt-1 text-[13px] text-slate-200">
                Sie kennen das: Tagsüber Kunden &amp; Projekte, abends Angebote,
                Rechnungen und Papierkram. GLENO dreht das Verhältnis um.
              </p>

              <div className="mt-4 space-y-3 text-[13px] text-slate-100">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-semibold text-emerald-200">
                    1. Angebote &amp; Rechnungen in Minuten
                  </p>
                  <p className="mt-1 text-slate-100/90">
                    Vorlagen, Positionen &amp; Kundendaten sind schon da. Aus „Ich
                    mach das heute Abend noch“ wird „Ist schon raus“.
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-semibold text-sky-200">
                    2. Klarer Überblick statt Kopfsalat
                  </p>
                  <p className="mt-1 text-slate-100/90">
                    Offene Angebote, fällige Rechnungen und Kundenverläufe – alles in
                    einem System. Kein Suchen in E-Mails, Zetteln &amp; Excel.
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-semibold text-amber-200">
                    3. Mehr echte Zeit mit Ihren Kindern
                  </p>
                  <p className="mt-1 text-slate-100/90">
                    Wenn GLENO den Papierkram erledigt, sind Sie früher aus dem Büro
                    raus – und nicht mehr mit halbem Kopf bei der nächsten Rechnung.
                  </p>
                </div>
              </div>
            </div>

            {/* Micro-Testimonials */}
            <div className="mt-2 space-y-3 text-[12px] text-slate-100">
              <div className="flex items-start gap-3 rounded-xl bg-black/20 p-3">
                <div className="mt-0.5 flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} className="h-4 w-4 text-amber-300" />
                  ))}
                </div>
                <p className="text-slate-100/90">
                  „Früher habe ich sonntags Rechnungen geschrieben. Heute klicke ich
                  abends nur noch auf &quot;Senden&quot; – der Rest ist vorbereitet.“
                  <span className="block text-[11px] text-slate-400">
                    – Sarah K., Inhaberin Reinigungsbetrieb, 2 Kinder
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-black/20 p-3">
                <div className="mt-0.5 flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} className="h-4 w-4 text-amber-300" />
                  ))}
                </div>
                <p className="text-slate-100/90">
                  „Der größte Unterschied? Ich bin beim Abendessen wirklich da – und
                  nicht gedanklich bei drei offenen Angeboten.“
                  <span className="block text-[11px] text-slate-400">
                    – Marco H., Handwerksunternehmer
                  </span>
                </p>
              </div>
            </div>

            {/* Kontakt / Trust */}
            <div className="mt-2 grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
              <a
                href="tel:+4950353169991"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                <PhoneIcon className="h-4 w-4" /> Rückfrage? +49&nbsp;5035&nbsp;3169991
              </a>
              <a
                href="mailto:support@gleno.de"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                <EnvelopeIcon className="h-4 w-4" /> support@gleno.de
              </a>
            </div>
          </div>
        </motion.div>

        {/* UNTERER BEREICH: Painpoints & Sicherheit */}
        <section className="mt-10 space-y-8">
          {/* Painpoints */}
          <div className="grid grid-cols-1 gap-4 text-[13px] text-slate-100 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">
                Abende im Büro statt auf dem Sofa
              </h3>
              <p className="mt-1 text-slate-200">
                Nach einem vollen Tag noch &quot;nur kurz&quot; Angebote und Rechnungen
                schreiben – und plötzlich ist es 22:30 Uhr.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">
                Schuldgefühle gegenüber den Kindern
              </h3>
              <p className="mt-1 text-slate-200">
                „Ich komm gleich“ wird zum Standardsatz. GLENO kann Ihre Kinder nicht
                ins Bett bringen – aber die Hürde dorthin kleiner machen.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">
                Kein Überblick, nur Feuerlöschen
              </h3>
              <p className="mt-1 text-slate-200">
                Welche Angebote sind offen? Wer hat noch nicht gezahlt? GLENO
                beantwortet das in Sekunden – ohne dass Sie suchen müssen.
              </p>
            </div>
          </div>

          {/* Hinweis: DSGVO / Hosting */}
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-[12px] text-slate-200 backdrop-blur">
            <p>
              GLENO wird in der EU gehostet, ist DSGVO-konform und für kleine
              Unternehmen gebaut – nicht für Konzern-IT. Sie testen in Ruhe, ohne
              Einrichtungsgebühr und ohne langfristige Bindung.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
