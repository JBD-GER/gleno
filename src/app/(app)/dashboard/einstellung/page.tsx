'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function SettingsPage() {
  const router = useRouter()
  const supa   = supabaseClient()

  const [active, setActive] = useState<'profil'|'buchhaltung'|'vorlagen'>('profil')

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingBilling, setLoadingBilling] = useState(true)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [companyName, setCompanyName] = useState('')
  const [street, setStreet]           = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode]   = useState('')
  const [city, setCity]               = useState('')
  const [country, setCountry]         = useState('')
  const [vatNumber, setVatNumber]     = useState('')
  const [website, setWebsite]         = useState('')

  const [billing, setBilling]       = useState<BillingSettings | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user }, error } = await supa.auth.getUser()
      if (error || !user) { router.push('/login'); return }

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
          .from('billing_settings').select('*').eq('user_id', user.id).single()

        if (!sErr && settings) {
          setBilling(settings as BillingSettings)
          if (settings.template) {
            const { data } = supa.storage.from('rechnungvorlagen').getPublicUrl(settings.template)
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
      firstName   !== (profile.first_name || '') ||
      lastName    !== (profile.last_name || '') ||
      companyName !== (profile.company_name || '') ||
      street      !== (profile.street || '') ||
      houseNumber !== (profile.house_number || '') ||
      postalCode  !== (profile.postal_code || '') ||
      city        !== (profile.city || '') ||
      country     !== (profile.country || '') ||
      vatNumber   !== (profile.vat_number || '') ||
      website     !== (profile.website || '')
    )
  }, [profile, firstName, lastName, companyName, street, houseNumber, postalCode, city, country, vatNumber, website])

  const fullAddress = useMemo(() => {
    const parts = [
      `${street || ''} ${houseNumber || ''}`.trim(),
      `${postalCode || ''} ${city || ''}`.trim(),
      country || ''
    ].filter(Boolean)
    return parts.length ? parts.join(', ') : '—'
  }, [street, houseNumber, postalCode, city, country])

  const handleSaveProfile = async () => {
    if (!profile) return
    setError(null)
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        id: profile.id,
        first_name:firstName, last_name:lastName, company_name:companyName,
        street, house_number:houseNumber, postal_code:postalCode, city, country,
        vat_number:vatNumber, website
      })
    })
    const json = await res.json().catch(()=> ({} as any))
    if (!res.ok) { setError(json?.error || 'Fehler beim Speichern'); return }
    setEditing(false)
    setProfile(p => p ? ({
      ...p,
      first_name:firstName, last_name:lastName, company_name:companyName,
      street, house_number:houseNumber, postal_code:postalCode, city, country,
      vat_number:vatNumber, website
    }) : p)
  }

  const uploadLogo = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/users/logo', { method:'POST', body: fd })
    if (res.ok) {
      const { logo_url } = await (await fetch('/api/users')).json()
      setLogoUrl(logo_url || null)
      setFile(null)
    }
  }
  const deleteLogo = async () => {
    await fetch('/api/users/logo', { method:'DELETE' })
    setLogoUrl(null)
  }

  // Dropzone visueller Ring
  const dropRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const f = Array.from(e.dataTransfer?.files || [])[0]
      if (f && f.type.startsWith('image/')) setFile(f)
      el.classList.remove('ring-2','ring-slate-300')
    }
    const onOver = (e: DragEvent) => { e.preventDefault(); el.classList.add('ring-2','ring-slate-300') }
    const onLeave= () => el.classList.remove('ring-2','ring-slate-300')
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
    <div className="p-6 text-slate-700">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_110%_-20%,rgba(15,23,42,0.06),transparent_60%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Einstellungen</h1>
            <p className="text-sm text-slate-600">Profil, Buchhaltung & Vorlagen</p>
          </div>

          {/* EIN EINZIGER TAB-BLOCK – nur lokale Tabs */}
          <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow">
            {(['profil','buchhaltung','vorlagen'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={[
                  'px-3 py-1.5 text-sm transition',
                  active===tab ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-white'
                ].join(' ')}
              >
                {tab==='profil' ? 'Profil' : tab==='buchhaltung' ? 'Buchhaltung' : 'Vorlagen'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PROFIL */}
      {active === 'profil' && (
        <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Profil & Logo</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white"
              >
                Bearbeiten
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={!isDirty}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50/80 p-2 text-sm text-rose-800">
              {error}
            </div>
          )}

<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
  {/* Logo */}
  <div>
    {loadingProfile ? (
      <div className="h-40 w-72 animate-pulse rounded-xl border border-white/60 bg-white/70 shadow" />
    ) : logoUrl ? (
      <div className="space-y-3">
        <div className="relative w-[18rem] sm:w-[20rem] rounded-xl border border-white/60 bg-white/80 p-3 shadow">
          <div className="h-40 sm:h-48 w-full overflow-hidden rounded-lg bg-white">
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" draggable={false} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white">
            <input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            Logo ersetzen…
          </label>
          <button
            onClick={uploadLogo}
            disabled={!file}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-40"
          >
            Hochladen
          </button>
          <button
            onClick={deleteLogo}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white"
          >
            Logo löschen
          </button>
        </div>

        {/* ⬇️ Hinweis */}
        <p className="text-xs text-slate-500">
          Hinweis: PNG oder JPG, ideal 1500×600&nbsp;px (mind. 1250×500&nbsp;px), sRGB. PNG mit transparentem Hintergrund empfohlen; SVG/WebP werden nicht unterstützt.
        </p>
      </div>
    ) : (
      <div
        ref={dropRef}
        className="w-[18rem] sm:w-[20rem] rounded-xl border-2 border-dashed border-slate-200 bg-white/60 p-4 text-center"
      >
        <p className="mb-2 text-sm text-slate-600">Logo ablegen oder Datei wählen</p>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="mx-auto block text-sm"
        />
        <button
          onClick={uploadLogo}
          disabled={!file}
          className="mt-3 rounded-lg border border-white/60 bg-white/90 px-4 py-1.5 text-sm font-medium text-slate-900 shadow hover:bg-white disabled:opacity-50"
        >
          Hochladen
        </button>

        {/* ⬇️ Hinweis */}
        <p className="mt-2 text-xs text-slate-500">
          Hinweis: PNG oder JPG, ideal 1500×600&nbsp;px (mind. 1250×500&nbsp;px), sRGB. PNG mit transparentem Hintergrund empfohlen; SVG/WebP werden nicht unterstützt.
        </p>
      </div>
    )}
  </div>
            {/* Stammdaten */}
            <div className="lg:col-span-2">
              {loadingProfile ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-200/70" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      { label:'Vorname', val:firstName, set:setFirstName },
                      { label:'Nachname', val:lastName, set:setLastName },
                      { label:'Firma', val:companyName, set:setCompanyName },
                      { label:'Website', val:website, set:setWebsite },
                      { label:'Straße', val:street, set:setStreet },
                      { label:'Hausnummer', val:houseNumber, set:setHouseNumber },
                      { label:'PLZ', val:postalCode, set:setPostalCode },
                      { label:'Ort', val:city, set:setCity },
                      { label:'Land', val:country, set:setCountry },
                      { label:'USt-ID', val:vatNumber, set:setVatNumber },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                        <input
                          className="w-full rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-70"
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          disabled={!editing}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-white/60 bg-white/60 p-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-800">Adresse gesamt:</span> {fullAddress}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* BUCHHALTUNG */}
      {active === 'buchhaltung' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Nummernkreise, Bank & Rechtliches</h2>
            {loadingBilling || !billing ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-200/70" />
                ))}
              </div>
            ) : (
              <SettingsForm initial={billing} />
            )}
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Aktuelle Vorlage</h3>
            <p className="mb-3 text-sm text-slate-600">{billing?.template || '—'}</p>
            {previewUrl ? (
              <div className="mb-4 h-[380px] overflow-hidden rounded-xl border border-white/60 bg-white/80">
                <embed src={previewUrl} type="application/pdf" className="h-full w-full" />
              </div>
            ) : (
              <div className="mb-4 grid h-[160px] place-items-center rounded-xl border border-white/60 bg-white/70 text-slate-500">
                Keine Vorschau verfügbar
              </div>
            )}
            <TemplateSelector current={billing?.template || ''} />
          </section>
        </div>
      )}

      {/* VORLAGEN */}
      {active === 'vorlagen' && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.06)] backdrop-blur-xl">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Rechnungsvorlagen</h2>
          <p className="mb-4 text-sm text-slate-600">Öffne den Vorlagen-Auswahldialog und prüfe die PDF-Vorschau.</p>
          <TemplateSelector current={billing?.template || ''} />
        </div>
      )}
    </div>
  )
}
