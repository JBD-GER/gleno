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
  try { return s ? new URL(s.startsWith('http') ? s : `https://${s}`).href : '' } catch { return s }
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

        setServices((p.services || []).map(s => ({ name: s.name, priority_percent: clampInt(s.priority_percent ?? 0, 0, 100) })))
        setLinks((p.links || []).map(l => ({ url: l.url, kind: l.kind || 'website' })))
      } catch (e:any) {
        setError(e?.message || 'Fehler beim Laden')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // logo preview
  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const servicesTotal = useMemo(() => {
    return clampInt((services || []).reduce((acc, s) => acc + (Number(s.priority_percent) || 0), 0), 0, 100)
  }, [services])

  function addService() {
    if (servicesTotal >= 100) return
    setServices(prev => [...prev, { name: '', priority_percent: 0 }])
  }
  function updateService(idx: number, patch: Partial<{ name: string; priority_percent: number }>) {
    setServices(prev => {
      const arr = [...prev]
      const current = arr[idx]
      const otherSum = arr.reduce((acc, s, i) => i === idx ? acc : acc + (Number(s.priority_percent) || 0), 0)
      let next = patch.priority_percent ?? current.priority_percent
      next = clampInt(next, 0, Math.max(0, 100 - otherSum))
      arr[idx] = { ...current, ...patch, priority_percent: next }
      return arr
    })
  }
  function removeService(idx: number) {
    setServices(prev => {
      const arr = [...prev]
      arr.splice(idx, 1)
      return arr
    })
  }

  function addLink() {
    setLinks(prev => [...prev, { url: '' }])
  }
  function updateLink(idx: number, url: string) {
    setLinks(prev => {
      const arr = [...prev]
      arr[idx] = { ...arr[idx], url }
      return arr
    })
  }
  function removeLink(idx: number) {
    setLinks(prev => {
      const arr = [...prev]
      arr.splice(idx, 1)
      return arr
    })
  }

  async function saveAll() {
    if (!data) return
    if (servicesTotal !== 100) {
      alert(`Bitte die Service-Prioritäten auf insgesamt 100% setzen (aktuell ${servicesTotal}%).`)
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
          .map(l => ({ url: normalizeUrlMaybe(l.url), kind: l.kind || 'website' }))
          .filter(l => !!l.url),
        services: services.map(s => ({ name: s.name.trim(), priority_percent: clampInt(s.priority_percent, 0, 100) }))
      }

      const res = await fetch('/api/partners/partnerprofil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const js = await res.json()
      if (!res.ok || !js?.ok) throw new Error(js?.error || 'Speichern fehlgeschlagen')

      // 2) Optional Logo-Upload
      if (logoFile && data.partner_id) {
        const fd = new FormData()
        fd.append('partner_id', data.partner_id)
        fd.append('file', logoFile)
        const up = await fetch('/api/partners/logo', { method: 'POST', body: fd })
        const upJs = await up.json().catch(()=>({}))
        if (!up.ok || !upJs?.ok) {
          console.warn('Logo-Upload-Fehler:', upJs?.error || up.statusText)
          alert(`Gespeichert – aber Logo-Upload fehlgeschlagen: ${upJs?.error || up.statusText}`)
        }
      }

      alert('Gespeichert!')
      window.location.reload()
    } catch (e:any) {
      alert(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow animate-pulse">
          Lade Partnerprofil …
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl p-4 bg-rose-50 ring-1 ring-rose-200 text-rose-800">
          Fehler: {error}
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl p-4 bg-amber-50 ring-1 ring-amber-200 text-amber-800">
          Kein Partner gefunden. Lege zuerst einen Partner an.
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white ring-1 ring-black/10 shadow">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : data.logo_url ? (
              <img
                src={data.logo_url}
                alt="Logo"
                className="w-full h-full object-contain p-2"
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
                className="w-full h-full object-contain p-2"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-slate-400 text-xs">Kein Logo</div>
            )}
          </div>
          <div>
            <div className="text-xl font-semibold">{data.company_name || data.display_name || '—'}</div>
            <div className="text-xs inline-flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 ring-1 ring-slate-200">
                Status: <span className="font-medium">{data.status}</span>
              </span>
              {data.branch?.name && (
                <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200">
                  Branche: <span className="font-medium">{data.branch.name}</span>
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <label className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow hover:border-slate-900 cursor-pointer">
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
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow hover:border-slate-900"
                  onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            onClick={saveAll}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium shadow-lg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Speichern…' : 'Änderungen speichern'}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Kontakt + Beschreibung */}
        <div className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 shadow-lg">
          <div className="text-sm font-semibold mb-3">Kontakt & Darstellung</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Anzeigename</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={display_name} onChange={e=>setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">E-Mail</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Telefon</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Website</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={website} onChange={e=>setWebsite(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Beschreibung</label>
              <textarea className="w-full rounded-lg border border-slate-200 p-3" rows={4} value={description} onChange={e=>setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 shadow-lg">
          <div className="text-sm font-semibold mb-3">Adresse</div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-sm mb-1">Straße</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={street} onChange={e=>setStreet(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Hausnr.</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={house_number} onChange={e=>setHouseNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">PLZ</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={postal_code} onChange={e=>setPostalCode(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Ort</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={city} onChange={e=>setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Land</label>
              <input className="w-full rounded-lg border border-slate-200 p-3" value={country} onChange={e=>setCountry(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 shadow-lg">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Leistungen (Summe = 100%)</div>
            <div className={`text-sm ${servicesTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>Summe: {servicesTotal}%</div>
          </div>

          <div className="mt-3 space-y-3">
            {services.map((s, idx) => {
              const otherSum = services.reduce((acc, x, i) => i === idx ? acc : acc + (Number(x.priority_percent) || 0), 0)
              const remaining = Math.max(0, 100 - otherSum)
              return (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    className="col-span-9 rounded-lg border border-slate-200 p-2"
                    placeholder="Service-Name"
                    value={s.name}
                    onChange={e => updateService(idx, { name: e.target.value })}
                  />
                  <div className="col-span-3 flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-slate-200 p-2"
                      type="number"
                      min={0} max={remaining}
                      value={s.priority_percent}
                      onChange={e => updateService(idx, { priority_percent: Number(e.target.value || 0) })}
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <div className="col-span-12">
                    <button className="text-xs text-slate-600 hover:text-red-700" onClick={() => removeService(idx)}>Entfernen</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3">
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-900 disabled:opacity-50"
                    disabled={servicesTotal >= 100}
                    onClick={addService}>
              + Service hinzufügen
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-2xl p-4 shadow-lg">
          <div className="text-sm font-semibold">Links</div>
          <div className="text-xs text-slate-600">Website/Social – ein Link pro Zeile.</div>

          <div className="mt-3 space-y-2">
            {links.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 p-2"
                  placeholder="https://…"
                  value={l.url}
                  onChange={e => updateLink(idx, e.target.value)}
                />
                <button className="text-xs text-slate-600 hover:text-red-700" onClick={() => removeLink(idx)}>
                  Entfernen
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-900" onClick={addLink}>
              + Link hinzufügen
            </button>
          </div>

          {!!data.categories?.length && (
            <div className="mt-5">
              <div className="text-sm font-semibold mb-1">Kategorien</div>
              <div className="flex flex-wrap gap-2">
                {data.categories.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border text-xs bg-white/70 ring-1 ring-slate-200">{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
