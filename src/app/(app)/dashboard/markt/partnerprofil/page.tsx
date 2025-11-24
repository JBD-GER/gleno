'use client'

import React, { useEffect, useMemo, useState } from 'react'

type PartnerDTO = {
  partner_id: string
  status: string
  company_name: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  description: string | null
  address: {
    street: string | null
    house_number: string | null
    postal_code: string | null
    city: string | null
    country: string | null
  }
  branch: { id: string; name: string; slug: string } | null
  categories: { id: string; name: string; slug: string }[]
  services: { id?: string; name: string; priority_percent: number | null }[]
  links: { id?: string; url: string; kind?: string }[]
  logo_path: string | null
  logo_url: string | null
  logo_signed_url: string | null
  created_at: string
  updated_at: string
}

function clampInt(n: any, min = 0, max = 100) {
  const v = Number.isFinite(Number(n)) ? Math.max(min, Math.min(max, Math.round(Number(n)))) : 0
  return v
}

function normalizeUrlMaybe(u: string) {
  const s = (u || '').trim()
  try {
    return s ? new URL(s.startsWith('http') ? s : `https://${s}`).href : ''
  } catch {
    return s
  }
}

export default function PartnerProfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<PartnerDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  // edit state
  const [display_name, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')

  const [street, setStreet] = useState('')
  const [house_number, setHouseNumber] = useState('')
  const [postal_code, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Deutschland')

  const [services, setServices] = useState<{ name: string; priority_percent: number }[]>([])
  const [links, setLinks] = useState<{ url: string; kind?: string }[]>([])

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // load
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/partners/partnerprofil', { method: 'GET' })
        const js = await res.json()
        if (!res.ok || !js?.ok) throw new Error(js?.error || `HTTP ${res.status}`)
        if (!alive) return
        const p: PartnerDTO = js.partner

        setData(p)
        setDisplayName(p.display_name || '')
        setEmail(p.email || '')
        setPhone(p.phone || '')
        setWebsite(p.website || '')
        setDescription(p.description || '')

        setStreet(p.address?.street || '')
        setHouseNumber(p.address?.house_number || '')
        setPostalCode(p.address?.postal_code || '')
        setCity(p.address?.city || '')
        setCountry(p.address?.country || 'Deutschland')

        setServices(
          (p.services || []).map((s) => ({
            name: s.name,
            priority_percent: clampInt(s.priority_percent ?? 0, 0, 100),
          })),
        )
        setLinks((p.links || []).map((l) => ({ url: l.url, kind: l.kind || 'website' })))
      } catch (e: any) {
        setError(e?.message || 'Fehler beim Laden')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // logo preview
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const servicesTotal = useMemo(() => {
    return clampInt(
      (services || []).reduce(
        (acc, s) => acc + (Number(s.priority_percent) || 0),
        0,
      ),
      0,
      100,
    )
  }, [services])

  function addService() {
    if (servicesTotal >= 100) return
    setServices((prev) => [...prev, { name: '', priority_percent: 0 }])
  }

  function updateService(
    idx: number,
    patch: Partial<{ name: string; priority_percent: number }>,
  ) {
    setServices((prev) => {
      const arr = [...prev]
      const current = arr[idx]
      const otherSum = arr.reduce(
        (acc, s, i) => (i === idx ? acc : acc + (Number(s.priority_percent) || 0)),
        0,
      )
      let next = patch.priority_percent ?? current.priority_percent
      next = clampInt(next, 0, Math.max(0, 100 - otherSum))
      arr[idx] = { ...current, ...patch, priority_percent: next }
      return arr
    })
  }

  function removeService(idx: number) {
    setServices((prev) => {
      const arr = [...prev]
      arr.splice(idx, 1)
      return arr
    })
  }

  function addLink() {
    setLinks((prev) => [...prev, { url: '' }])
  }

  function updateLink(idx: number, url: string) {
    setLinks((prev) => {
      const arr = [...prev]
      arr[idx] = { ...arr[idx], url }
      return arr
    })
  }

  function removeLink(idx: number) {
    setLinks((prev) => {
      const arr = [...prev]
      arr.splice(idx, 1)
      return arr
    })
  }

  async function saveAll() {
    if (!data) return
    if (servicesTotal !== 100) {
      alert(
        `Bitte die Service-Prioritäten auf insgesamt 100% setzen (aktuell ${servicesTotal}%).`,
      )
      return
    }

    try {
      setSaving(true)
      // 1) Core + links + services
      const payload = {
        display_name,
        email,
        phone,
        website,
        description,
        address: { street, house_number, postal_code, city, country },
        links: links
          .map((l) => ({ url: normalizeUrlMaybe(l.url), kind: l.kind || 'website' }))
          .filter((l) => !!l.url),
        services: services.map((s) => ({
          name: s.name.trim(),
          priority_percent: clampInt(s.priority_percent, 0, 100),
        })),
      }

      const res = await fetch('/api/partners/partnerprofil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const js = await res.json()
      if (!res.ok || !js?.ok) throw new Error(js?.error || 'Speichern fehlgeschlagen')

      // 2) Optional Logo-Upload
      if (logoFile && data.partner_id) {
        const fd = new FormData()
        fd.append('partner_id', data.partner_id)
        fd.append('file', logoFile)
        const up = await fetch('/api/partners/logo', { method: 'POST', body: fd })
        const upJs = await up.json().catch(() => ({}))
        if (!up.ok || !upJs?.ok) {
          console.warn('Logo-Upload-Fehler:', upJs?.error || up.statusText)
          alert(
            `Gespeichert – aber Logo-Upload fehlgeschlagen: ${
              upJs?.error || up.statusText
            }`,
          )
        }
      }

      alert('Gespeichert!')
      window.location.reload()
    } catch (e: any) {
      alert(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI States ---------------- */

  if (loading) {
    return (
      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          Lade Partnerprofil …
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
          Fehler: {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          Kein Partnerprofil gefunden. Lege zuerst einen Partner an.
        </div>
      </div>
    )
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {/* Header: Logo + Basis + Save-Button – linksbündig, responsive */}
      <header className="flex w-full flex-col gap-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Logo */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-sm sm:h-24 sm:w-24">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="h-full w-full object-contain p-2"
              />
            ) : data.logo_url ? (
              <img
                src={data.logo_url}
                alt="Logo"
                className="h-full w-full object-contain p-2"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if (data.logo_signed_url && img.dataset.fallback !== '1') {
                    img.dataset.fallback = '1'
                    img.src = data.logo_signed_url as string
                  }
                }}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            ) : data.logo_signed_url ? (
              <img
                src={data.logo_signed_url}
                alt="Logo"
                className="h-full w-full object-contain p-2"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-[11px] text-slate-400">
                Kein Logo
              </div>
            )}
          </div>

          {/* Kopf-Daten */}
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Partnerprofil
              </p>
              <h1 className="mt-0.5 truncate text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                {data.company_name || data.display_name || '—'}
              </h1>
              {(data.first_name || data.last_name) && (
                <p className="text-xs text-slate-600">
                  {data.first_name} {data.last_name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-50">
                Status: <span className="font-semibold">{data.status}</span>
              </span>
              {data.branch?.name && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700">
                  Branche: <span>{data.branch.name}</span>
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-900 shadow-sm hover:border-slate-900">
                Logo wählen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </label>
              {!!logoFile && (
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-slate-900"
                  onClick={() => {
                    setLogoFile(null)
                    setLogoPreview(null)
                  }}
                >
                  Logo entfernen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Save-Button – mobil volle Breite, Desktop rechts */}
        <div className="flex w-full justify-start lg:w-auto lg:justify-end">
          <button
            disabled={saving}
            onClick={saveAll}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Speichern …' : 'Änderungen speichern'}
          </button>
        </div>
      </header>

      {/* Content Cards */}
      <main className="mt-6 grid w-full grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Kontakt & Darstellung */}
        <section className="xl:col-span-2 w-full rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kontakt & Darstellung
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Anzeigename
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none ring-0 focus:border-slate-900"
                value={display_name}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Dieser Name wird im Markt und in Anfragen angezeigt.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                E-Mail
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Telefon
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Website
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Beschreibung
              </label>
              <textarea
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe dein Unternehmen in 1–3 Sätzen …"
              />
            </div>
          </div>
        </section>

        {/* Adresse */}
        <section className="w-full rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Adresse
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Straße
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Hausnummer
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={house_number}
                onChange={(e) => setHouseNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                PLZ
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={postal_code}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Ort
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Land
              </label>
              <input
                className="w-full rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm shadow-inner outline-none focus:border-slate-900"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="xl:col-span-2 w-full rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Leistungen & Prioritäten
            </h2>
            <p
              className={`text-xs ${
                servicesTotal === 100 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              Summe: {servicesTotal}% (muss 100% sein)
            </p>
          </div>

          <div className="space-y-3">
            {services.map((s, idx) => {
              const otherSum = services.reduce(
                (acc, x, i) => (i === idx ? acc : acc + (Number(x.priority_percent) || 0)),
                0,
              )
              const remaining = Math.max(0, 100 - otherSum)
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-inner"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                    <div className="sm:col-span-8">
                      <label className="mb-1 block text-[11px] font-medium text-slate-700">
                        Service-Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="z. B. Glasreinigung, Unterhaltsreinigung …"
                        value={s.name}
                        onChange={(e) =>
                          updateService(idx, {
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="mb-1 block text-[11px] font-medium text-slate-700">
                        Anteil
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                          type="number"
                          min={0}
                          max={remaining}
                          value={s.priority_percent}
                          onChange={(e) =>
                            updateService(idx, {
                              priority_percent: Number(e.target.value || 0),
                            })
                          }
                        />
                        <span className="text-xs text-slate-600">%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Max. {remaining}% verfügbar.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-[11px] text-slate-500 hover:text-rose-600"
                      onClick={() => removeService(idx)}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              )
            })}

            {services.length === 0 && (
              <p className="text-xs text-slate-500">
                Noch keine Leistungen angelegt. Füge deine wichtigsten Services mit
                Priorität hinzu, damit Kunden sofort sehen, wofür du stehst.
              </p>
            )}
          </div>

          <div className="mt-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={servicesTotal >= 100}
              onClick={addService}
            >
              + Service hinzufügen
            </button>
          </div>
        </section>

        {/* Links & Kategorien */}
        <section className="w-full rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Links & Kategorien
          </h2>

          {/* Links */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-700">Links</p>
            <p className="mb-2 text-[11px] text-slate-500">
              Website, Social Media oder spezielle Landingpages. Ein Link pro Zeile.
            </p>

            <div className="space-y-2">
              {links.map((l, idx) => (
                <div key={idx} className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    placeholder="https://…"
                    value={l.url}
                    onChange={(e) => updateLink(idx, e.target.value)}
                  />
                  <div className="mt-1 flex justify-start sm:mt-0 sm:ml-2">
                    <button
                      type="button"
                      className="text-[11px] text-slate-500 hover:text-rose-600"
                      onClick={() => removeLink(idx)}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm hover:border-slate-900"
                onClick={addLink}
              >
                + Link hinzufügen
              </button>
            </div>
          </div>

          {/* Kategorien (nur Anzeige) */}
          {!!data.categories?.length && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-medium text-slate-700">Kategorien</p>
              <div className="flex flex-wrap gap-1.5">
                {data.categories.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] text-slate-700"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Kategorien werden im Onboarding gesetzt und steuern die Zuordnung im Markt.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
