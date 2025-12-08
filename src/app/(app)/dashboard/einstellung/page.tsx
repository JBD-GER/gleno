'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import SettingsForm, { type BillingSettings } from './buchhaltung/SettingsForm'
import TemplateSelector from './buchhaltung/TemplateSelector'

type Profile = {
  id: string
  first_name?: string
  last_name?: string
  company_name?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  country?: string
  vat_number?: string
  website?: string | null
}

// gleiche feste Mapping-Logik wie auf der Buchhaltungs-Page
function labelFromTemplateName(fileName: string | null): string {
  if (!fileName) return 'Keine Auswahl'
  const base = fileName.split('/').pop() ?? fileName

  switch (base) {
    case 'Rechnung_Vorlage_Standard_weiss.pdf':
      return 'Standard'
    case 'Rechnung_Vorlage_2_Beige.pdf':
      return 'Beige'
    case 'Rechnung_Vorlage_1_Welle_Standard.pdf':
      return 'Welle'
    case 'Rechnung_Vorlage_3_Schwarz.pdf':
      return 'Schwarz'
    case 'Rechnung_Vorlage_4_Blau.pdf':
      return 'Blau'
    case 'Rechnung_Vorlage_6_Modern.pdf':
      return 'Modern'
    default:
      return 'Layout'
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supa = supabaseClient()

  const initialTabParam = searchParams.get('tab')
  const [active, setActive] = useState<'profil' | 'buchhaltung'>(
    initialTabParam === 'buchhaltung' ? 'buchhaltung' : 'profil'
  )

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingBilling, setLoadingBilling] = useState(true)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [website, setWebsite] = useState('')

  const [billing, setBilling] = useState<BillingSettings | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const switchTab = (tab: 'profil' | 'buchhaltung') => {
    setActive(tab)
    router.push(`/dashboard/einstellung?tab=${tab}`)
  }

  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
        error,
      } = await supa.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }

      // Profil + Logo
      try {
        const res = await fetch('/api/users')
        const { profile: p, logo_url } = await res.json()
        setProfile(p)
        setLogoUrl(logo_url || null)
        setFirstName(p?.first_name ?? '')
        setLastName(p?.last_name ?? '')
        setCompanyName(p?.company_name ?? '')
        setStreet(p?.street ?? '')
        setHouseNumber(p?.house_number ?? '')
        setPostalCode(p?.postal_code ?? '')
        setCity(p?.city ?? '')
        setCountry(p?.country ?? '')
        setVatNumber(p?.vat_number ?? '')
        setWebsite(p?.website ?? '')
      } catch (e) {
        console.error('Profil laden fehlgeschlagen:', e)
      } finally {
        setLoadingProfile(false)
      }

      // Billing Settings
      try {
        const { data: settings, error: sErr } = await supa
          .from('billing_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!sErr && settings) {
          setBilling(settings as BillingSettings)
          if (settings.template) {
            const { data } = supa.storage
              .from('rechnungvorlagen')
              .getPublicUrl(settings.template)
            setPreviewUrl(data.publicUrl || null)
          } else setPreviewUrl(null)
        } else {
          const fallback: BillingSettings = {
            user_id: user.id,
            invoice_prefix: 'RE',
            invoice_suffix: '',
            invoice_start: 1,
            quote_prefix: 'AN',
            quote_suffix: '',
            quote_start: 1,
            order_confirmation_prefix: 'AB',
            order_confirmation_suffix: '',
            order_confirmation_start: 1,
            template: '',
          }
          setBilling(fallback)
          setPreviewUrl(null)
        }
      } catch (e) {
        console.error('Billing settings laden fehlgeschlagen:', e)
      } finally {
        setLoadingBilling(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDirty = useMemo(() => {
    if (!profile) return false
    return (
      firstName !== (profile.first_name || '') ||
      lastName !== (profile.last_name || '') ||
      companyName !== (profile.company_name || '') ||
      street !== (profile.street || '') ||
      houseNumber !== (profile.house_number || '') ||
      postalCode !== (profile.postal_code || '') ||
      city !== (profile.city || '') ||
      country !== (profile.country || '') ||
      vatNumber !== (profile.vat_number || '') ||
      website !== (profile.website || '')
    )
  }, [
    profile,
    firstName,
    lastName,
    companyName,
    street,
    houseNumber,
    postalCode,
    city,
    country,
    vatNumber,
    website,
  ])

  const fullAddress = useMemo(() => {
    const parts = [
      `${street || ''} ${houseNumber || ''}`.trim(),
      `${postalCode || ''} ${city || ''}`.trim(),
      country || '',
    ].filter(Boolean)
    return parts.length ? parts.join(', ') : '—'
  }, [street, houseNumber, postalCode, city, country])

  const currentTemplateLabel = useMemo(
    () => labelFromTemplateName(billing?.template || null),
    [billing?.template]
  )

  // 👉 NEU: wenn TemplateSelector speichert, direkt State + Preview updaten
  const handleTemplateSaved = (newTemplate: string) => {
    setBilling((prev) =>
      prev ? { ...prev, template: newTemplate } : prev
    )

    if (newTemplate) {
      const { data } = supa.storage
        .from('rechnungvorlagen')
        .getPublicUrl(newTemplate)
      setPreviewUrl(data.publicUrl || null)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setError(null)
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profile.id,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        street,
        house_number: houseNumber,
        postal_code: postalCode,
        city,
        country,
        vat_number: vatNumber,
        website,
      }),
    })
    const json = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      setError(json?.error || 'Fehler beim Speichern')
      return
    }
    setEditing(false)
    setProfile((p) =>
      p
        ? {
            ...p,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            street,
            house_number: houseNumber,
            postal_code: postalCode,
            city,
            country,
            vat_number: vatNumber,
            website,
          }
        : p
    )
  }

  const uploadLogo = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/users/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const { logo_url } = await (await fetch('/api/users')).json()
      setLogoUrl(logo_url || null)
      setFile(null)
    }
  }

  const deleteLogo = async () => {
    await fetch('/api/users/logo', { method: 'DELETE' })
    setLogoUrl(null)
  }

  const dropRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const f = Array.from(e.dataTransfer?.files || [])[0]
      if (f && f.type.startsWith('image/')) setFile(f)
      el.classList.remove('ring-2', 'ring-slate-300')
    }
    const onOver = (e: DragEvent) => {
      e.preventDefault()
      el.classList.add('ring-2', 'ring-slate-300')
    }
    const onLeave = () =>
      el.classList.remove('ring-2', 'ring-slate-300')
    el.addEventListener('drop', onDrop)
    el.addEventListener('dragover', onOver)
    el.addEventListener('dragleave', onLeave)
    return () => {
      el.removeEventListener('drop', onDrop)
      el.removeEventListener('dragover', onOver)
      el.removeEventListener('dragleave', onLeave)
    }
  }, [])

  return (
    <div className="w-full p-4 text-slate-700 sm:p-6">
      {/* Header */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_110%_-20%,rgba(15,23,42,0.05),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Einstellungen
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Profil & Buchhaltung für deine Dokumente.
            </p>
          </div>

          {/* Tabs */}
          <div className="inline-flex self-start rounded-full border border-white/70 bg-white/90 p-0.5 text-xs shadow-sm backdrop-blur">
            {(['profil', 'buchhaltung'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                className={[
                  'rounded-full px-3 py-1.5 text-sm transition',
                  active === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                {tab === 'profil' ? 'Profil' : 'Buchhaltung'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PROFIL TAB */}
      {active === 'profil' && (
        <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 sm:text-base">
                Profil & Logo
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Stammdaten für Dokumente, Rechnungen und E-Mails.
              </p>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Bearbeiten
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={!isDirty}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50/80 p-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)]">
            {/* Logo linksbündig */}
            <div className="flex flex-col gap-4">
              {loadingProfile ? (
                <div className="h-40 w-full max-w-sm animate-pulse rounded-xl border border-white/60 bg-white/70 shadow-sm" />
              ) : logoUrl ? (
                <div className="space-y-4">
                  <div className="w-full max-w-sm rounded-xl border border-white/60 bg-white/90 p-3 shadow-sm">
                    <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-white sm:h-48">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFile(e.target.files?.[0] ?? null)
                        }
                        className="hidden"
                      />
                      Logo ersetzen…
                    </label>
                    <button
                      onClick={uploadLogo}
                      disabled={!file}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Hochladen
                    </button>
                    <button
                      onClick={deleteLogo}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
                    >
                      Logo löschen
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    Hinweis: PNG oder JPG, ideal ca. 1500×600&nbsp;px (mind.
                    1250×500&nbsp;px), sRGB. PNG mit transparentem Hintergrund
                    empfohlen; SVG/WebP werden nicht unterstützt.
                  </p>
                </div>
              ) : (
                <div
                  ref={dropRef}
                  className="w-full max-w-sm rounded-xl border-2 border-dashed border-slate-200 bg-white/80 p-4 text-center transition"
                >
                  <p className="mb-2 text-sm text-slate-600">
                    Logo hier ablegen oder Datei wählen
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFile(e.target.files?.[0] ?? null)
                    }
                    className="mx-auto block text-sm"
                  />
                  <button
                    onClick={uploadLogo}
                    disabled={!file}
                    className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hochladen
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    Hinweis: PNG oder JPG, ideal ca. 1500×600&nbsp;px (mind.
                    1250×500&nbsp;px), sRGB. PNG mit transparentem Hintergrund
                    empfohlen; SVG/WebP werden nicht unterstützt.
                  </p>
                </div>
              )}
            </div>

            {/* Stammdaten */}
            <div className="space-y-4">
              {loadingProfile ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 animate-pulse rounded-lg bg-slate-200/70"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      { label: 'Vorname', val: firstName, set: setFirstName },
                      { label: 'Nachname', val: lastName, set: setLastName },
                      {
                        label: 'Firma',
                        val: companyName,
                        set: setCompanyName,
                      },
                      { label: 'Website', val: website, set: setWebsite },
                      { label: 'Straße', val: street, set: setStreet },
                      {
                        label: 'Hausnummer',
                        val: houseNumber,
                        set: setHouseNumber,
                      },
                      { label: 'PLZ', val: postalCode, set: setPostalCode },
                      { label: 'Ort', val: city, set: setCity },
                      { label: 'Land', val: country, set: setCountry },
                      {
                        label: 'USt-ID',
                        val: vatNumber,
                        set: setVatNumber,
                      },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          {f.label}
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none ring-indigo-100/60 transition focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
                          value={f.val}
                          onChange={(e) => f.set(e.target.value)}
                          disabled={!editing}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-800">
                      Adresse gesamt:
                    </span>{' '}
                    {fullAddress}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* BUCHHALTUNG TAB */}
      {active === 'buchhaltung' && (
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-800 sm:text-base">
              Nummernkreise, Bank & Rechtliches
            </h2>
            <p className="mb-4 text-xs text-slate-500 sm:text-sm">
              Diese Einstellungen gelten für alle Angebote,
              Auftragsbestätigungen und Rechnungen.
            </p>
            {loadingBilling || !billing ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-lg bg-slate-200/70"
                  />
                ))}
              </div>
            ) : (
              <SettingsForm initial={billing} />
            )}
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
                  Rechnungsvorlage!
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Lege fest, welches PDF-Layout für deine Dokumente verwendet
                  wird.
                </p>
              </div>
            </div>

            {/* Aktuelle Vorlage */}
            <div className="mb-4">
              <p className="mb-1 text-xs text-slate-500 sm:text-sm">
                Aktuelle Vorlage
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm sm:text-sm">
                {currentTemplateLabel}
                {currentTemplateLabel === 'Standard' && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Empfohlen
                  </span>
                )}
              </div>
            </div>

            {previewUrl ? (
              <div className="mb-4 h-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-[380px]">
                <embed
                  src={previewUrl}
                  type="application/pdf"
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="mb-4 grid h-[160px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 sm:text-sm">
                Keine Vorschau verfügbar
              </div>
            )}

            {/* 👉 Jetzt mit onSaved, damit sich Label & Preview sofort ändern */}
            <TemplateSelector
              current={billing?.template || ''}
              onSaved={handleTemplateSaved}
            />
          </section>
        </div>
      )}
    </div>
  )
}
