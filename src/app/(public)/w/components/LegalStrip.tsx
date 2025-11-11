// src/app/(public)/w/components/CookieBannerPublic.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type Props = {
  primary?: string
  secondary?: string
  className?: string
}

const CONSENT_VERSION = '1'
const DEVICE_KEY  = 'sf_device_id'
// auf true stellen, wenn KEIN Server-Logging gewünscht ist
const BROWSER_ONLY = false

type Consent = {
  version: string
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  ts: number
  source: 'banner' | 'settings'
  device_id?: string
}

function uuidv4Fallback() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint8Array(16)
    crypto.getRandomValues(buf)
    buf[6] = (buf[6] & 0x0f) | 0x40
    buf[8] = (buf[8] & 0x3f) | 0x80
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    const s = Array.from(buf, toHex).join('')
    return `${s.substring(0,8)}-${s.substring(8,12)}-${s.substring(12,16)}-${s.substring(16,20)}-${s.substring(20)}`
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0, v = c === 'x' ? r : (r&0x3)|0x8
    return v.toString(16)
  })
}

function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : uuidv4Fallback()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

async function postConsentToApi(c: Consent) {
  try {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version:   c.version,
        necessary: c.necessary,
        functional:c.functional,
        analytics: c.analytics,
        marketing: c.marketing,
        source:    c.source,
        device_id: c.device_id,
      }),
    })
  } catch {}
}

export default function CookieBannerPublic({
  primary = '#0a1b40',
  secondary = '#f59e0b',
  className = '',
}: Props) {
  const pathname = usePathname()

  // Nur auf /w/[slug]
  if (!pathname?.startsWith('/w/')) return null

  // /w/slug, /w/slug/irgendwas => base = /w/slug
  let base = '/w'
  let slug = ''
  const parts = pathname.split('/').filter(Boolean) // ["w","slug",...]
  if (parts.length >= 2) {
    base = `/${parts[0]}/${parts[1]}`
    slug = parts[1]
  }

  // Consent pro Website/Slug versionieren
  const STORAGE_KEY = `sf_consent_${slug}_v${CONSENT_VERSION}`

  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { setOpen(true); return }
      const parsed: Consent = JSON.parse(raw)
      if (parsed?.version === CONSENT_VERSION) setOpen(false)
      else { localStorage.removeItem(STORAGE_KEY); setOpen(true) }
    } catch { setOpen(true) }
  }, [STORAGE_KEY])

  const baseConsent = useMemo<Consent>(() => ({
    version:   CONSENT_VERSION,
    necessary: true,
    functional:false,
    analytics: false,
    marketing: false,
    ts:        Date.now(),
    source:    'banner',
    device_id: undefined,
  }), [])

  function persist(c: Consent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
    if (!BROWSER_ONLY) postConsentToApi(c)
    // Event für nachgelagerte Script-Nachladung (Analytics etc.)
    window.dispatchEvent(new CustomEvent('sf:consent-updated', { detail: c }))
  }

  function acceptAll() {
    const device_id = ensureDeviceId()
    const c: Consent = { ...baseConsent, functional: true, analytics: true, marketing: true, device_id, ts: Date.now() }
    persist(c); setOpen(false)
  }

  function acceptNecessary() {
    const device_id = ensureDeviceId()
    const c: Consent = { ...baseConsent, functional: false, analytics: false, marketing: false, device_id, ts: Date.now() }
    persist(c); setOpen(false)
  }

  if (!open) return null

  const impressumHref = `${base}/impressum`
  const datenschutzHref = `${base}/datenschutzerklaerung`

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6">
      <div
        className={`mx-auto max-w-5xl rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.18)] backdrop-blur-xl ring-1 ring-white/60 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${className}`}
      >
        <div className="sm:flex sm:items-start sm:gap-3">
          <div
            aria-hidden
            className="mt-0.5 hidden h-8 w-8 shrink-0 rounded-full sm:block"
            style={{ background: primary }}
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">Cookies & Datenschutz</p>
            <p className="mt-1 text-xs leading-5 text-slate-700">
              Wir verwenden notwendige Cookies für den Betrieb. Optionale (Funktional & Analyse) nur mit Zustimmung.
              Mehr in unserer{' '}
              <a
                href={datenschutzHref}
                className="underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
              >
                Datenschutzerklärung
              </a>
              . Pflichtangaben im{' '}
              <a
                href={impressumHref}
                className="underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
              >
                Impressum
              </a>.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-0 sm:w-80">
          <button
            onClick={acceptAll}
            className="inline-flex w-full items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow"
            style={{ backgroundColor: primary, boxShadow: '0 8px 22px rgba(10,27,64,.22), inset 0 1px 0 rgba(255,255,255,.25)' }}
          >
            Alle akzeptieren
          </button>
          <button
            onClick={acceptNecessary}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/60 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
          >
            Nur notwendige
          </button>
        </div>
      </div>
    </div>
  )
}
