'use client'

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react'
import Link from 'next/link'

type BranchRow = { id: string; name: string; slug: string }
type CategoryRow = { id: string; name: string; slug: string }

type PartnerDto = {
  partner_id: string
  status: string | null
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
  branch: BranchRow | null
  branches?: { id: string; name: string; slug: string }[]
  categories: { id: string; name: string; slug: string }[]
  services: { id?: string; name: string; priority_percent: number | null }[]
  links: { id?: string; url: string; kind?: string }[]
  logo_path: string | null
  logo_url: string | null
  logo_signed_url?: string | null
  created_at: string
  updated_at: string
}

type PartnerEditable = {
  id: string
  display_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  description: string | null
  address_street: string | null
  address_house_number: string | null
  address_postal_code: string | null
  address_city: string | null
  address_country: string | null
  branches_selected: string[]
  categories_selected: string[]
  services: { name: string; priority_percent: number }[]
  links: { url: string; kind?: string }[]
  logo_url?: string | null
}

const MAX_BRANCHES = 3
const MAX_CATEGORIES = 25

/* ---------------- UI Tokens ---------------- */

const shellBg =
  'min-h-[100dvh] px-4 sm:px-5 lg:px-8 py-6 sm:py-8 text-slate-800 ' +
  'bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),' +
  'radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.06),transparent_60%),#f3f4f7]'

const card =
  'relative overflow-visible rounded-3xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-2xl p-4 sm:p-5 shadow-[0_10px_34px_rgba(15,23,42,0.06)] ring-1 ring-white/70'

const dropdownPanel =
  'absolute left-0 right-0 top-full z-[300] w-full rounded-2xl border border-slate-200 ' +
  'bg-white/98 shadow-2xl max-h-56 overflow-auto backdrop-blur-xl'

const btnPrimary =
  'inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2 text-xs sm:text-sm ' +
  'font-semibold shadow-[0_10px_30px_rgba(15,23,42,0.35)] hover:bg-slate-950 ' +
  'hover:shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition disabled:opacity-60 disabled:shadow-none'

const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/92 ' +
  'backdrop-blur-xl px-4 py-2 text-xs sm:text-sm text-slate-900 shadow-sm hover:bg-white ' +
  'hover:shadow-md transition'

/* ---------------- Utils ---------------- */

function useDebounced<T extends (...args: any[]) => void>(fn: T, delay = 220) {
  const t = useRef<number | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  return (...args: Parameters<T>) => {
    if (t.current) window.clearTimeout(t.current)
    t.current = window.setTimeout(() => fnRef.current(...args), delay)
  }
}

function normalizeLabel(s: string) {
  const cleaned = (s ?? '').trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned
    .toLowerCase()
    .split(' ')
    .map((w) => (w[0]?.toUpperCase() || '') + w.slice(1))
    .join(' ')
}

function uniqueNormalized(arr: (string | null | undefined)[]) {
  const set = new Set<string>()
  const out: string[] = []
  for (const raw of arr) {
    if (!raw) continue
    const n = normalizeLabel(raw)
    if (!n) continue
    const k = n.toLowerCase()
    if (!set.has(k)) {
      set.add(k)
      out.push(n)
    }
  }
  return out
}

function clampInt(n: any, min = 0, max = 100) {
  const num = Number(n)
  if (!Number.isFinite(num)) return 0
  return Math.max(min, Math.min(max, Math.round(num)))
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm bg-slate-900 text-white border-slate-900">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full w-4 h-4 leading-none ring-1 ring-white/30 bg-white/10 hover:bg-white/20"
          aria-label="Entfernen"
          title="Entfernen"
        >
          <span className="block -mt-[1px] text-[11px]">×</span>
        </button>
      )}
    </span>
  )
}

/* ---------------- Component ---------------- */

export default function PartnerBearbeitenPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [partner, setPartner] = useState<PartnerEditable | null>(null)

  const [branchRows, setBranchRows] = useState<BranchRow[]>([])
  const [branchOptions, setBranchOptions] = useState<string[]>([])
  const [branchInput, setBranchInput] = useState('')
  const [branchSuggest, setBranchSuggest] = useState<string[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])

  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const [categorySuggest, setCategorySuggest] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const servicesTotal = useMemo(() => {
    const sum =
      partner?.services?.reduce(
        (acc, s) => acc + (Number(s.priority_percent) || 0),
        0,
      ) ?? 0
    return clampInt(sum)
  }, [partner?.services])

  /* --------- Kategorien nach Branche laden --------- */

  const loadCategories = useCallback(
    async (branchName: string, q: string) => {
      if (!branchName) {
        setCategoryRows([])
        setCategoryOptions([])
        setCategorySuggest([])
        return
      }
      try {
        const url = `/api/partners/partner-categories?branch=${encodeURIComponent(
          branchName,
        )}&q=${encodeURIComponent(q)}&limit=500`
        const res = await fetch(url)
        const data = await res.json().catch(() => ({}))
        const rows: CategoryRow[] = (data?.categories || []).map((c: any) => ({
          id: String(c.id),
          name: String(c.name),
          slug: String(c.slug),
        }))
        const names = rows.map((r) => r.name)
        setCategoryRows(rows)
        setCategoryOptions(names)
        setCategorySuggest(names.slice(0, 12))
      } catch {
        // soft fail
      }
    },
    [],
  )

  /* ---------------- Partner laden ---------------- */

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        let dto: PartnerDto | null = null
        const res = await fetch('/api/partners', { cache: 'no-store' })
        if (res.ok) {
          const js = await res.json()
          dto = js?.partner as PartnerDto
        } else if (res.status !== 404) {
          try {
            const js = await res.json()
            throw new Error(js?.error || `HTTP ${res.status}`)
          } catch {
            throw new Error(`HTTP ${res.status}`)
          }
        }

        if (!dto) {
          if (!cancelled) setPartner(null)
          return
        }

        const initialBranches = uniqueNormalized([
          ...(dto.branches?.map((b) => b.name) || []),
          dto.branch?.name || '',
        ]).slice(0, MAX_BRANCHES)

        const editable: PartnerEditable = {
          id: dto.partner_id,
          display_name: dto.display_name,
          email: dto.email,
          phone: dto.phone,
          website: dto.website,
          description: dto.description,
          address_street: dto.address?.street ?? null,
          address_house_number: dto.address?.house_number ?? null,
          address_postal_code: dto.address?.postal_code ?? null,
          address_city: dto.address?.city ?? null,
          address_country: dto.address?.country ?? null,
          branches_selected: initialBranches,
          categories_selected: uniqueNormalized(
            (dto.categories || []).map((c) => c.name),
          ).slice(0, MAX_CATEGORIES),
          services: (dto.services || []).map((s) => ({
            name: s.name,
            priority_percent: clampInt(s.priority_percent ?? 0),
          })),
          links: (dto.links || []).map((l) => ({
            url: l.url,
            kind: l.kind || 'website',
          })),
          logo_url: dto.logo_url || dto.logo_signed_url || null,
        }

        if (cancelled) return

        setPartner(editable)
        setSelectedBranches(editable.branches_selected)
        setSelectedCategories(editable.categories_selected)
        setLogoPreview(editable.logo_url || null)

        // Branches laden
        try {
          const bRes = await fetch('/api/partners/partner-branches?limit=300')
          const bJson = await bRes.json().catch(() => ({}))
          const rows: BranchRow[] = (bJson?.branches || []).map((b: any) => ({
            id: String(b.id),
            name: String(b.name),
            slug: String(b.slug),
          }))
          const names = rows.map((r) => r.name)
          if (!cancelled) {
            setBranchRows(rows)
            setBranchOptions(names)
            setBranchSuggest(names.slice(0, 12))
          }
        } catch {
          // ignore
        }

        // Kategorien für erste Branche initial
        if (editable.branches_selected[0]) {
          await loadCategories(editable.branches_selected[0], '')
        }
      } catch {
        if (!cancelled) {
          setPartner(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadCategories])

  /* ---------------- Branch-Suche (debounced) ---------------- */

  const debouncedSearchBranches = useDebounced(async (q: string) => {
    if (!q.trim()) {
      setBranchSuggest(branchOptions.slice(0, 12))
      return
    }
    try {
      const res = await fetch(
        `/api/partners/partner-branches?q=${encodeURIComponent(q)}&limit=50`,
      )
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      const rows: BranchRow[] = (data?.branches || []).map((b: any) => ({
        id: String(b.id),
        name: String(b.name),
        slug: String(b.slug),
      }))
      setBranchSuggest(rows.map((r) => r.name).slice(0, 12))
    } catch {
      // noop
    }
  }, 200)

  useEffect(() => {
    debouncedSearchBranches(branchInput)
  }, [branchInput, debouncedSearchBranches])

  /* ---------------- Kategorie-Suche nach erster Branche ---------------- */

  useEffect(() => {
    const primary = selectedBranches[0]
    if (!primary) {
      setCategoryRows([])
      setCategoryOptions([])
      setCategorySuggest([])
      return
    }
    loadCategories(primary, categoryInput || '')
  }, [selectedBranches, categoryInput, loadCategories])

  /* ---------------- Logo Preview ---------------- */

  useEffect(() => {
    if (!logoFile) return
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  /* ---------------- Branch Helpers ---------------- */

  function addBranchDirect(name: string) {
    if (selectedBranches.length >= MAX_BRANCHES) return
    const next = uniqueNormalized([...selectedBranches, name]).slice(
      0,
      MAX_BRANCHES,
    )
    setSelectedBranches(next)
  }

  function removeBranch(val: string) {
    const next = selectedBranches.filter(
      (b) => b.toLowerCase() !== val.toLowerCase(),
    )
    setSelectedBranches(next)
  }

  /* ---------------- Category Helpers ---------------- */

  function addCategoryDirect(name: string) {
    const next = uniqueNormalized([...selectedCategories, name]).slice(
      0,
      MAX_CATEGORIES,
    )
    setSelectedCategories(next)
  }

  function removeCategory(val: string) {
    const next = selectedCategories.filter(
      (c) => c.toLowerCase() !== val.toLowerCase(),
    )
    setSelectedCategories(next)
  }

  /* ---------------- Services ---------------- */

  function onServiceChange(
    idx: number,
    patch: Partial<NonNullable<PartnerEditable['services']>[number]>,
  ) {
    if (!partner) return
    const arr = [...(partner.services || [])]
    const current = arr[idx]
    const otherSum = arr.reduce(
      (acc, s, i) =>
        i === idx ? acc : acc + (Number(s.priority_percent) || 0),
      0,
    )
    const remaining = Math.max(0, 100 - otherSum)
    let nextPercent = patch.priority_percent ?? current.priority_percent ?? 0
    nextPercent = clampInt(nextPercent, 0, remaining)
    arr[idx] = {
      ...current,
      ...patch,
      priority_percent: nextPercent,
    }
    setPartner({ ...partner, services: arr })
  }

  function addService() {
    if (!partner) return
    if (servicesTotal >= 100) return
    setPartner({
      ...partner,
      services: [...(partner.services || []), { name: '', priority_percent: 0 }],
    })
  }

  /* ---------------- Save ---------------- */

  async function save() {
    if (!partner) return
    if (servicesTotal !== 100) {
      alert(
        `Bitte die Service-Prioritäten auf insgesamt 100% setzen (aktuell ${servicesTotal}%).`,
      )
      return
    }

    setSaving(true)
    try {
      const payload = {
        display_name: partner.display_name,
        email: partner.email,
        phone: partner.phone,
        website: partner.website,
        description: partner.description,
        address: {
          street: partner.address_street,
          house_number: partner.address_house_number,
          postal_code: partner.address_postal_code,
          city: partner.address_city,
          country: partner.address_country,
        },
        branches_selected: selectedBranches,
        categories_selected: selectedCategories,
        services: partner.services || [],
        links: partner.links || [],
      }

      const res = await fetch('/api/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const js = await res.json().catch(() => ({}))
      if (!res.ok || !js?.ok)
        throw new Error(js?.error || 'Update fehlgeschlagen')

      if (logoFile && partner.id) {
        const fd = new FormData()
        fd.append('partner_id', partner.id)
        fd.append('file', logoFile)
        const up = await fetch('/api/partners/logo', {
          method: 'POST',
          body: fd,
        })
        const upJs = await up.json().catch(() => ({}))
        if (!up.ok || !upJs?.ok)
          throw new Error(upJs?.error || 'Logo-Upload fehlgeschlagen')
      }

      alert('Änderungen gespeichert.')
    } catch (e: any) {
      alert(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- States ---------------- */

  if (loading) {
    return (
      <div className={shellBg}>
        <div className="max-w-5xl mx-auto min-h-[60vh] grid place-items-center">
          <div className="px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl text-sm text-slate-600 shadow">
            Lade Partnerprofil …
          </div>
        </div>
      </div>
    )
  }

   if (!partner) {
    return (
      <div className={shellBg}>
        <div className="w-full min-h-[60vh] px-4 py-4 flex items-start">
          <div className={card}>
            <div className="text-lg font-semibold text-slate-900 mb-1">
              Kein Partnerprofil gefunden
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Lege zuerst ein Profil an, um es anschließend bearbeiten zu können.
            </p>
            <Link href="/dashboard/markt/partner-werden" className={btnPrimary}>
              Partner werden
            </Link>
          </div>
        </div>
      </div>
    )
  }


  /* ---------------- Render ---------------- */

  return (
    <div className={shellBg}>
       <div className="w-full space-y-6">
        {/* Header */}
        <header className="mb-2 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium text-slate-900 ring-1 ring-white/80 backdrop-blur self-start">
            <span>GLENO Markt</span>
            <span className="text-slate-300">•</span>
            <span>Partnerprofil bearbeiten</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Partnerprofil bearbeiten
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Passe Sichtbarkeit, Kontaktdaten, Branchen, Kategorien und Services für dein
            öffentliches Marktprofil an.
          </p>
        </header>

        {/* Top: Logo + Save */}
        <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white/90 flex items-center justify-center ring-1 ring-black/5 shadow-sm shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-[10px] sm:text-xs text-slate-400">
                  Kein Logo
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {partner.display_name || 'Anzeigename festlegen'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className={btnGhost + ' cursor-pointer !px-3 !py-1.5'}>
                  Logo wählen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    className={btnGhost + ' !px-3 !py-1.5'}
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

          <div className={`${card} w-full md:w-80 py-4`}>
            <div className="text-sm font-semibold text-slate-900">
              Änderungen speichern
            </div>
            <p className="mt-1 text-[10px] sm:text-xs text-slate-600">
              Achte darauf, dass die Service-Prioritäten zusammen genau 100% ergeben.
            </p>
            <button
              onClick={save}
              disabled={saving}
              className={btnPrimary + ' mt-3 w-full justify-center'}
            >
              {saving ? 'Speichere …' : 'Änderungen speichern'}
            </button>
          </div>
        </section>

        {/* Kontakt & Beschreibung */}
        <section className={`${card} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Anzeigename
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={partner.display_name ?? ''}
              onChange={(e) =>
                setPartner({ ...partner, display_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              E-Mail
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.email ?? ''}
              onChange={(e) => setPartner({ ...partner, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Telefon
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.phone ?? ''}
              onChange={(e) => setPartner({ ...partner, phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Website
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.website ?? ''}
              onChange={(e) =>
                setPartner({ ...partner, website: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Beschreibung
            </label>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm resize-y"
              value={partner.description ?? ''}
              onChange={(e) =>
                setPartner({ ...partner, description: e.target.value })
              }
            />
          </div>
        </section>

        {/* Adresse */}
        <section
          className={`${card} grid grid-cols-1 sm:grid-cols-5 gap-3`}
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Straße
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.address_street ?? ''}
              onChange={(e) =>
                setPartner({
                  ...partner,
                  address_street: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nr.
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.address_house_number ?? ''}
              onChange={(e) =>
                setPartner({
                  ...partner,
                  address_house_number: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              PLZ
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.address_postal_code ?? ''}
              onChange={(e) =>
                setPartner({
                  ...partner,
                  address_postal_code: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Ort
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.address_city ?? ''}
              onChange={(e) =>
                setPartner({
                  ...partner,
                  address_city: e.target.value,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Land
            </label>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              value={partner.address_country ?? ''}
              onChange={(e) =>
                setPartner({
                  ...partner,
                  address_country: e.target.value,
                })
              }
            />
          </div>
        </section>

        {/* Branchen */}
        <section className={`${card} z-30`}>
          <div className="text-sm font-semibold text-slate-900 mb-1">
            Branchen (max. {MAX_BRANCHES})
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 mb-2">
            Wähle bis zu drei Branchen, in denen dieses Profil Aufträge erhalten soll.
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {selectedBranches.map((b) => (
              <Chip key={b} onRemove={() => removeBranch(b)}>
                {b}
              </Chip>
            ))}
          </div>

          <div className="relative">
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              placeholder="Branche suchen …"
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              disabled={selectedBranches.length >= MAX_BRANCHES}
            />
            {branchSuggest.length > 0 && branchInput.trim() && (
              <div className={dropdownPanel}>
                <ul>
                  {branchSuggest.map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-50"
                        onClick={() => {
                          addBranchDirect(opt)
                          setBranchInput('')
                        }}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Kategorien */}
        <section className={`${card} z-20`}>
          <div className="text-sm font-semibold text-slate-900 mb-1">
            Kategorien (max. {MAX_CATEGORIES})
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 mb-2">
            Feiner zuschneiden, für welche Leistungen du sichtbar sein möchtest.
            Vorschläge basieren auf deiner ersten Branche.
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCategories.map((c) => (
              <Chip key={c} onRemove={() => removeCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>

          <div className="relative">
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-sm shadow-sm"
              placeholder={
                selectedBranches[0]
                  ? 'Kategorie suchen …'
                  : 'Bitte zuerst eine Branche wählen'
              }
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              disabled={
                !selectedBranches[0] || selectedCategories.length >= MAX_CATEGORIES
              }
            />
            {categorySuggest.length > 0 && categoryInput.trim() && (
              <div className={dropdownPanel}>
                <ul>
                  {categorySuggest.map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-50"
                        onClick={() => {
                          addCategoryDirect(opt)
                          setCategoryInput('')
                        }}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Services */}
        <section className={card}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-sm font-semibold text-slate-900">
              Services (Summe = 100%)
            </div>
            <div
              className={
                'text-xs sm:text-sm ' +
                (servicesTotal === 100 ? 'text-emerald-600' : 'text-amber-600')
              }
            >
              Summe: {servicesTotal}%
            </div>
          </div>

          <div className="space-y-3">
            {(partner.services || []).map((s, idx) => {
              const otherSum =
                partner.services?.reduce(
                  (acc, x, i) =>
                    i === idx ? acc : acc + (Number(x.priority_percent) || 0),
                  0,
                ) ?? 0
              const remaining = Math.max(0, 100 - otherSum)

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  <input
                    className="col-span-8 sm:col-span-9 rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-xs sm:text-sm shadow-sm"
                    placeholder="Service-Name"
                    value={s.name}
                    onChange={(e) => {
                      const arr = [...(partner.services || [])]
                      arr[idx] = {
                        ...arr[idx],
                        name: e.target.value,
                      }
                      setPartner({ ...partner, services: arr })
                    }}
                  />
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-1">
                    <input
                      className="w-full rounded-2xl border border-white/70 bg-white/98 px-2 py-2 text-xs sm:text-sm shadow-sm"
                      type="number"
                      min={0}
                      max={remaining}
                      value={s.priority_percent ?? 0}
                      onChange={(e) =>
                        onServiceChange(idx, {
                          priority_percent: Number(e.target.value || 0),
                        })
                      }
                    />
                    <span className="text-xs sm:text-sm">%</span>
                  </div>
                  <div className="col-span-12">
                    <button
                      type="button"
                      className="text-[10px] sm:text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => {
                        const arr = [...(partner.services || [])]
                        arr.splice(idx, 1)
                        setPartner({
                          ...partner,
                          services: arr,
                        })
                      }}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3">
            <button
              type="button"
              className={
                btnGhost +
                ' !px-3 !py-1.5 text-xs sm:text-sm border-slate-200'
              }
              onClick={addService}
              disabled={servicesTotal >= 100}
            >
              + Service hinzufügen
            </button>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            href="/dashboard/markt"
            className={btnGhost + ' w-full sm:w-auto justify-center'}
          >
            Zur Markt-Übersicht
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className={btnPrimary + ' w-full sm:w-auto justify-center'}
          >
            {saving ? 'Speichere …' : 'Änderungen speichern'}
          </button>
        </div>

        {/* Öffentliches Profil */}
        {partner.id && (
          <div className="mt-1 text-[10px] sm:text-xs text-slate-600">
            <Link
              className="underline decoration-slate-300 underline-offset-4 hover:no-underline"
              href={`/markt/partner/${partner.id}`}
              target="_blank"
            >
              Öffentliches Profil ansehen →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
