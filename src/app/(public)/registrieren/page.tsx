// src/app/(public)/registrieren/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  EyeIcon, EyeSlashIcon, CheckCircleIcon, PhoneIcon, EnvelopeIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const PRIMARY = '#5865f2'
const TERMS_VERSION = '1'
const PRIVACY_VERSION = '1'

// Länder-Optionen (Label → ISO-Code)
const COUNTRY_OPTIONS = [
  { label: 'Deutschland', value: 'DE' },
  { label: 'Österreich',  value: 'AT' },
  { label: 'Schweiz',     value: 'CH' },
  { label: 'Frankreich',  value: 'FR' },
  { label: 'Italien',     value: 'IT' },
  { label: 'Spanien',     value: 'ES' },
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

export default function RegisterPage() {
  const router = useRouter()

  // Pflichtfelder
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')

  // Adresse
  const [street,  setStreet]  = useState('')
  const [houseNo, setHouseNo] = useState('')
  const [zip,     setZip]     = useState('')
  const [city,    setCity]    = useState('')
  const [country, setCountry] = useState('DE')

  // Optional
  const [companyName, setCompanyName] = useState('')
  const [vatNumber,   setVatNumber]   = useState('')

  // ✅ NEU: AGB & Datenschutz
  const [acceptTerms,   setAcceptTerms]   = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = useMemo(() => validateEmail(email), [email])
  const pwScore    = useMemo(() => passwordScore(password), [password])
  const pwLabel    = ['zu kurz', 'schwach', 'okay', 'gut', 'stark'][pwScore]

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
    acceptTerms && acceptPrivacy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Bitte alle Pflichtfelder korrekt ausfüllen und AGB/Datenschutz akzeptieren.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password,
          first_name: firstName,
          last_name:  lastName,
          company_name: companyName || null,
          vat_number:   vatNumber || null,
          street,
          house_number: houseNo,
          postal_code:  zip,
          city,
          country,
          accept_terms:   true,
          accept_privacy: true,
          terms_version:   TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload.error ?? 'Unbekannter Fehler bei der Registrierung.')
        setLoading(false)
        return
      }
      // ⬇️ NACH ERFOLG: auf /danke leiten
      router.push('/danke')
    } catch (err: any) {
      setError(err?.message ?? 'Netzwerkfehler.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220]">
      {/* Glows */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(1200px 520px at 50% -10%, rgba(88,101,242,0.14), transparent),' +
            'radial-gradient(900px 420px at 10% 0%, rgba(88,101,242,0.12), transparent),' +
            'radial-gradient(900px 420px at 90% 0%, rgba(139,92,246,0.10), transparent)',
        }}
      />
      <motion.div className="absolute -top-32 -left-20 h-[34rem] w-[34rem] rounded-full blur-3xl"
                  style={{ background: 'radial-gradient(closest-side, rgba(88,101,242,.20), rgba(88,101,242,0))' }}
                  initial={{ opacity: 0.5, scale: 0.9 }}
                  animate={{ opacity: [0.5, 0.65, 0.5], scale: [0.9, 1, 0.9] }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-40 -right-20 h-[38rem] w-[38rem] rounded-full blur-3xl"
                  style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,.18), rgba(139,92,246,0))' }}
                  initial={{ opacity: 0.45, scale: 0.95 }}
                  animate={{ opacity: [0.45, 0.6, 0.45], scale: [0.95, 1.03, 0.95] }}
                  transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Intro */}
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur">
            <ShieldCheckIcon className="h-4 w-4" />
            7 Tage kostenlos – ohne Kreditkarte
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Erstelle dein Konto in wenigen Minuten</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">All-in-One für Angebote, Material, Team & Benachrichtigungen.</p>
        </div>

        {/* Card */}
        <motion.div
          className="grid grid-cols-1 gap-6 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-8 lg:grid-cols-2"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Formular */}
          <div>
            <h2 className="mb-5 text-center text-2xl font-semibold text-white">Registrierung</h2>

            {error && <div className="mb-4 rounded-lg border border-rose-300/40 bg-rose-300/10 p-3 text-rose-100">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">Vorname</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">Nachname</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              {/* Firma optional */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Firmenname (optional)</label>
                <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                       value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-white/80">Straße</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={street} onChange={(e) => setStreet(e.target.value)} required placeholder="Beispielstraße" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-white/80">Hausnummer</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={houseNo} onChange={(e) => setHouseNo(e.target.value)} required placeholder="12A" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">PLZ</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={zip} onChange={(e) => setZip(e.target.value)} required placeholder="10115" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-white/80">Ort</label>
                  <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                         value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Berlin" />
                </div>
                {/* ⬇️ Land als Dropdown */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-white/80">Land</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="w-full appearance-none rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                  >
                    {COUNTRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* USt-ID optional */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">USt-ID (optional)</label>
                <input className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 text-black outline-none focus:border-white/30 focus:bg-white"
                       value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="DE123456789" />
              </div>

              {/* E-Mail */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">E-Mail</label>
                <input
                  type="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className={`w-full rounded-lg border px-4 py-3 text-black outline-none focus:bg-white ${
                    email.length === 0
                      ? 'border-white/20 bg-white/80 focus:border-white/30'
                      : emailValid
                      ? 'border-emerald-400/70 bg-white'
                      : 'border-amber-400/70 bg-white'
                  }`}
                  placeholder="name@firma.de"
                />
              </div>

              {/* Passwort */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Passwort</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    className="w-full rounded-lg border border-white/20 bg-white/80 px-4 py-3 pr-12 text-black outline-none focus:border-white/30 focus:bg-white"
                    placeholder="Mind. 8 Zeichen"
                  />
                  <button
                    type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:bg-slate-200/70"
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full"
                    style={{
                      width: `${(pwScore / 4) * 100}%`,
                      background: pwScore < 2 ? '#f59e0b' : pwScore < 3 ? '#22c55e' : '#16a34a',
                      transition: 'width .25s ease',
                    }}
                  />
                </div>
                <p className="mt-1 text-[12px] text-white/70">Passwortstärke: {pwLabel}</p>
              </div>

              {/* ✅ Rechtliches: Pflicht-Checkboxen */}
              <div className="space-y-2 rounded-xl border border-white/20 bg-white/5 p-3">
                <label className="flex items-start gap-2 text-sm text-white/90">
                  <input
                    type="checkbox" className="mt-1"
                    checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                  />
                  <span>
                    Ich akzeptiere die{' '}
                    <Link href="/agb" className="underline underline-offset-2 hover:opacity-90">AGB</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-white/90">
                  <input
                    type="checkbox" className="mt-1"
                    checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    required
                  />
                  <span>
                    Ich habe die{' '}
                    <Link href="/datenschutz" className="underline underline-offset-2 hover:opacity-90">Datenschutzerklärung</Link> gelesen und akzeptiere sie.
                  </span>
                </label>
                <p className="mt-1 text-[11px] text-white/60">Versionen: AGB v{TERMS_VERSION} · Datenschutz v{PRIVACY_VERSION}</p>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={!canSubmit}
                className="group relative mt-2 w-full overflow-hidden rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition enabled:hover:bg-indigo-700 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                <span className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>Konto erstellen</span>
                {loading && (
                  <span className="absolute inset-0 grid place-items-center">
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </span>
                )}
              </button>

              <p className="mt-4 text-center text-xs text-white/60">
                <CheckCircleIcon className="mr-1 inline h-4 w-4 align-[-2px] text-emerald-300" />
                Nach der Registrierung erhältst du eine E-Mail zur Bestätigung.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-white/80">
              Bereits ein Konto?{' '}
              <Link href="/login" className="font-semibold text-white hover:underline">
                Jetzt einloggen
              </Link>
            </p>
          </div>

          {/* Info-Spalte */}
          <div className="flex flex-col justify-center rounded-2xl border border-white/20 bg-white/10 p-6 ring-1 ring-white/10 sm:p-8">
            <h3 className="text-2xl font-semibold text-white">7 Tage kostenlos & unverbindlich</h3>
            <p className="mt-2 text-white/80">Teste alle Features ohne Risiko. Deine Daten bleiben in der EU.</p>
            <ul className="mt-5 space-y-3 text-white/85">
              {['Angebot → Auftrag → Rechnung (PDF)','Material & Mindestmengen mit Benachrichtigungen','Team- & Terminplanung inkl. ICS-Export','Fotos & Dokumente (Drag & Drop, Lightbox)'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-1">
              <a href="tel:+4950353169991" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25">
                <PhoneIcon className="h-5 w-5" /> +49&nbsp;5035&nbsp;3169991
              </a>
              <a href="mailto:kontakt@software-fliesenleger.de" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25">
                <EnvelopeIcon className="h-5 w-5" /> kontakt@software-fliesenleger.de
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
