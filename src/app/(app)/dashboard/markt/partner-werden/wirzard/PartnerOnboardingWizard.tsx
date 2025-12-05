'use client'

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react'

/* ================= Types ================= */

type Extracted = {
  company_name?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: {
    street?: string | null
    house_number?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
  }
  description?: string | null
  branch_name?: string | null
  branch_candidates?: string[]
  category_name?: string | null
  category_candidates?: string[]
  categories_extra?: string[]
  links?: { url: string; kind?: string }[]
  services?: { name: string; priority_percent?: number | null }[]
  confidence?: number
}

type ProfilePayload = {
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    email: string | null
    street: string | null
    house_number: string | null
    postal_code: string | null
    city: string | null
    country: string | null
    website: string | null
    logo_path: string | null
  }
  logo_url: string | null
}

type BranchRow = { id: string; name: string; slug: string }
type CategoryRow = { id: string; name: string; slug: string }

/* ================= Constants & Utils ================= */

const MAX_BRANCHES = 3
const MAX_CATEGORIES = 25

function clampInt(n: any, min = 0, max = 100) {
  const num = Number(n)
  if (!Number.isFinite(num)) return 0
  return Math.max(min, Math.min(max, Math.round(num)))
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
    const key = n.toLowerCase()
    if (!set.has(key)) {
      set.add(key)
      out.push(n)
    }
  }
  return out
}

function dedupeCaseInsensitivePreserve(arr: (string | null | undefined)[]) {
  const set = new Set<string>()
  const out: string[] = []
  for (const raw of arr) {
    if (!raw) continue
    const v = raw.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (!set.has(key)) {
      set.add(key)
      out.push(v)
    }
  }
  return out
}

function slugify(input: string) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/* Debounce Helper – mit stabilem Callback */

function useDebounced<T extends (...args: any[]) => void>(fn: T, delay = 220) {
  const t = useRef<number | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (t.current) window.clearTimeout(t.current)
      t.current = window.setTimeout(() => {
        fnRef.current(...args)
      }, delay)
    },
    [delay],
  )

  return debounced as T
}

/* ================= UI Helpers ================= */

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs text-white sm:text-sm">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[11px] leading-none hover:bg-white/30"
          aria-label="Entfernen"
          title="Entfernen"
        >
          ×
        </button>
      )}
    </span>
  )
}

/* Social Icon */

const SocialIcon = ({ kind }: { kind?: string }) => {
  const k = (kind || '').toLowerCase()
  const base = 'h-4 w-4 shrink-0 sm:h-5 sm:w-5'
  if (k === 'instagram')
    return (
      <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7zm6.5-.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
      </svg>
    )
  if (k === 'facebook')
    return (
      <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 22v-8h3l1-4h-4V7.5A1.5 1.5 0 0 1 14.5 6H17V2h-3.5A5.5 5.5 0 0 0 8 7.5V10H5v4h3v8h5Z" />
      </svg>
    )
  if (k === 'linkedin')
    return (
      <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 3a2 2 0 1 0 .001 4.001A2 2 0 0 0 4 3ZM3 8h2v13H3V8Zm5 0h2v1.8h.03C10.53 8.72 11.9 8 13.5 8 17 8 18 10.2 18 13.6V21h-2v-6.5c0-1.5 0-3.5-2.1-3.5-2.1 0-2.4 1.6-2.4 3.4V21H9V8Z" />
      </svg>
    )
  if (k === 'youtube')
    return (
      <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.5 12 4.5 12 4.5s-5.8 0-7.5.6A3 3 0 0 0 2.4 7.2 31.2 31.2 0 0 0 1.8 12c0 1.8.6 4.8.6 4.8a3 3 0 0 0 2.1 2.1c1.7.6 7.5.6 7.5.6s5.8 0 7.5-.6a3 3 0 0 0 2.1-2.1c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    )
  if (k === 'x' || k === 'twitter')
    return (
      <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3h5.6l4.3 6 4.9-6H21l-7.3 9.1L21 21h-5.6l-4.5-6.3L5.7 21H3l7.8-9.8L3 3Z" />
      </svg>
    )
  return (
    <svg className={base} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm7.9 9h-3.4a15.7 15.7 0 0 0-1.3-6.2A8.02 8.02 0 0 1 19.9 11ZM12 4c.9 0 2.4 2.1 3 6H9c.6-3.9 2.1-6 3-6Zm-4.2.8A15.7 15.7 0 0 0 6.5 11H3.1a8.02 8.02 0 0 1 4.7-6.2ZM3.1 13h3.4c.2 2.2.9 4.4 1.9 6.2A8.02 8.02 0 0 1 3.1 13Zm8.9 7c-.9 0-2.4-2.1-3-6h6c-.6 3.9-2.1 6-3 6Zm4.2-.8c1-1.8 1.7-4 1.9-6.2h3.4a8.02 8.02 0 0 1-4.7 6.2Z" />
    </svg>
  )
}

/* ================= Component ================= */

export default function PartnerOnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [me, setMe] = useState<ProfilePayload | null>(null)
  const [loadingMe, setLoadingMe] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [freeText, setFreeText] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkPulsing, setLinkPulsing] = useState(false)

  const [loading, setLoading] = useState(false)
  const [analyzeLogs, setAnalyzeLogs] = useState<string[]>([])
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [model, setModel] = useState<string>('')

  const [form, setForm] = useState<Extracted>({
    address: {},
    services: [],
    links: [],
    branch_candidates: [],
    category_candidates: [],
  })

  const [branchRows, setBranchRows] = useState<BranchRow[]>([])
  const [branchOptions, setBranchOptions] = useState<string[]>([])
  const [branchLoading, setBranchLoading] = useState(false)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [branchInput, setBranchInput] = useState('')
  const [branchSuggest, setBranchSuggest] = useState<string[]>([])
  const [showAllBranches, setShowAllBranches] = useState(false)

  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const [categorySuggest, setCategorySuggest] = useState<string[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)

  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const [branchSuggestions, setBranchSuggestions] = useState<BranchRow[]>([])
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false)

  /* ========== Canonical Branch Matching ========== */

  const canonicalBranchName = useCallback(
    (input: string): string | null => {
      if (!input) return null
      const low = input.toLowerCase().trim()
      const sl = slugify(input)

      const exact = branchRows.find((b) => b.name.toLowerCase() === low)
      if (exact) return exact.name

      const bySlug = branchRows.find((b) => b.slug === sl)
      if (bySlug) return bySlug.name

      const starts = branchRows.find((b) => b.name.toLowerCase().startsWith(low))
      if (starts) return starts.name

      const contains = branchRows.find((b) => b.name.toLowerCase().includes(low))
      if (contains) return contains.name

      const startsSlug = branchRows.find((b) => b.slug.startsWith(sl))
      if (startsSlug) return startsSlug.name

      const containsSlug = branchRows.find((b) => b.slug.includes(sl))
      if (containsSlug) return containsSlug.name

      return null
    },
    [branchRows],
  )

  /* ========== Load Branches ========== */

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBranchLoading(true)
      setBranchError(null)
      try {
        const res = await fetch('/api/partners/partner-branches?limit=200')
        const text = await res.text()
        let data: any = {}
        try {
          data = JSON.parse(text)
        } catch {
          /* ignore */
        }
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} – ${text || 'no body'}`)
        if (cancelled) return
        const rows: BranchRow[] = (data?.branches || []).map((b: any) => ({
          id: String(b.id),
          name: String(b.name),
          slug: String(b.slug),
        }))
        const names = rows.map((r) => r.name)
        setBranchRows(rows)
        setBranchOptions(names)
        setBranchSuggest(names.slice(0, 12))
      } catch (e: any) {
        if (!cancelled)
          setBranchError(e?.message || 'Unbekannter Fehler beim Laden der Branchen.')
      } finally {
        if (!cancelled) setBranchLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /* ========== Debounced Branch Search ========== */

  const debouncedSearchBranches = useDebounced((q: string) => {
    ;(async () => {
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
        /* silent */
      }
    })()
  }, 220)

  useEffect(() => {
    debouncedSearchBranches(branchInput)
  }, [branchInput, debouncedSearchBranches])

  /* ========== Load Categories (Base) ========== */

  const loadCategories = useCallback(async (branchName: string, q: string) => {
    if (!branchName) {
      setCategoryRows((prev) => (prev.length ? [] : prev))
      setCategoryOptions((prev) => (prev.length ? [] : prev))
      setCategorySuggest((prev) => (prev.length ? [] : prev))
      return
    }
    setCategoryLoading(true)
    try {
      const url = `/api/partners/partner-categories?branch=${encodeURIComponent(
        branchName,
      )}&q=${encodeURIComponent(q)}&limit=500`
      const res = await fetch(url)
      if (!res.ok) return
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
    } finally {
      setCategoryLoading(false)
    }
  }, [])

  const debouncedLoadCategories = useDebounced((branchName: string, q: string) => {
    loadCategories(branchName, q)
  }, 220)

  /* ========== Initial Profile Load ========== */

  useEffect(() => {
    ;(async () => {
      setLoadingMe(true)
      try {
        const res = await fetch('/api/users', { method: 'GET' })
        if (!res.ok) throw new Error('Profil konnte nicht geladen werden')
        const data: ProfilePayload = await res.json()
        setMe(data)
        setForm((prev) => ({
          ...prev,
          company_name: data.profile.company_name ?? prev.company_name ?? '',
          first_name: data.profile.first_name ?? prev.first_name ?? '',
          last_name: data.profile.last_name ?? prev.last_name ?? '',
          address: {
            street: data.profile.street ?? prev.address?.street ?? '',
            house_number: data.profile.house_number ?? prev.address?.house_number ?? '',
            postal_code: data.profile.postal_code ?? prev.address?.postal_code ?? '',
            city: data.profile.city ?? prev.address?.city ?? '',
            country: data.profile.country ?? prev.address?.country ?? 'Deutschland',
          },
          website: data.profile.website ?? prev.website ?? '',
          email: prev.email ?? '',
          phone: prev.phone ?? '',
        }))
      } finally {
        setLoadingMe(false)
      }
    })()
  }, [])

  /* ========== Logo Preview ========== */

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  /* ========== Link Handling ========== */

  function addLink() {
    const val = linkInput.trim()
    if (!val) return
    try {
      const u = new URL(val.startsWith('http') ? val : `https://${val}`)
      setLinks([u.href])
      setLinkInput('')
      setLinkError(null)
      setLinkPulsing(true)
      setTimeout(() => setLinkPulsing(false), 500)
    } catch {
      setLinkError('Ungültige URL – bitte prüfen.')
    }
  }

  function onLinkKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addLink()
    }
  }

  /* ========== Reset Wizard ========== */

  function resetAll() {
    setFreeText('')
    setLinkInput('')
    setLinks([])
    setLinkError(null)
    setLinkPulsing(false)
    setAnalyzeLogs([])
    setExtracted(null)
    setModel('')
    setForm({
      address: {},
      services: [],
      links: [],
      branch_candidates: [],
      category_candidates: [],
    })
    setSelectedBranches([])
    setSelectedCategories([])
    setBranchInput('')
    setCategoryInput('')
    setBranchSuggest([])
    setCategorySuggest([])
    setShowAllBranches(false)
    setShowAllCategories(false)
    setBranchSuggestions([])
    setShowBranchSuggestions(false)
    setLogoFile(null)
    setLogoPreview(null)
    setStep(1)
  }

  /* ========== KI Analyse ========== */

  async function handleAnalyze() {
    setLoading(true)
    setAnalyzeLogs(['Starte Analyse …'])
    try {
      const pushLog = (msg: string) => setAnalyzeLogs((prev) => [...prev, msg])

      setTimeout(() => pushLog('🔎 Crawle Seite & erkenne Struktur …'), 250)
      setTimeout(() => pushLog('🧠 Extrahiere Kontaktdaten, Leistungen & Inhalte …'), 650)
      setTimeout(() => pushLog('🗂️ Ermittele Branchen & Kategorien …'), 1050)
      setTimeout(() => pushLog('🧩 Erzeuge Service-Prioritäten …'), 1450)

      const res = await fetch('/api/partners/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeText, links }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Analyse fehlgeschlagen')

      const x = data.extracted as Extracted
      setExtracted(x)
      setModel(data.model)

      const services = (Array.isArray(x.services) ? x.services : []).map((s) => ({
        name: s.name,
        priority_percent: clampInt(s.priority_percent ?? 0),
      }))

      const autoCats = uniqueNormalized([
        x.category_name,
        ...(x.category_candidates || []),
        ...(x.categories_extra || []),
      ]).slice(0, MAX_CATEGORIES)

      setForm((prev) => ({
        ...prev,
        display_name:
          x.display_name ??
          prev.display_name ??
          me?.profile.company_name ??
          '',
        email: x.email ?? prev.email ?? '',
        phone: x.phone ?? prev.phone ?? '',
        website: x.website ?? prev.website ?? links[0] ?? me?.profile.website ?? '',
        description: x.description ?? prev.description ?? freeText,
        address: {
          street: x.address?.street ?? prev.address?.street ?? '',
          house_number: x.address?.house_number ?? prev.address?.house_number ?? '',
          postal_code: x.address?.postal_code ?? prev.address?.postal_code ?? '',
          city: x.address?.city ?? prev.address?.city ?? '',
          country: x.address?.country ?? prev.address?.country ?? 'Deutschland',
        },
        links:
          Array.isArray(x.links) && x.links.length
            ? x.links
            : links.map((u) => ({
                url: u,
                kind: 'website',
              })),
        services,
        category_candidates: autoCats,
      }))

      setSelectedCategories(autoCats)

      setTimeout(() => setAnalyzeLogs((prev) => [...prev, '✅ Fertig']), 1750)
      setTimeout(() => setStep(2), 2100)
    } catch (e: any) {
      setAnalyzeLogs((prev) => [
        ...prev,
        `❌ Fehler: ${e?.message || 'Analyse fehlgeschlagen'}`,
      ])
      alert(e?.message || 'Analyse fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  /* ========== Auto-Branch aus Extracted ========== */

  useEffect(() => {
    if (!branchRows.length || !extracted) return

    const raw = dedupeCaseInsensitivePreserve([
      extracted.branch_name,
      ...(extracted.branch_candidates || []),
    ])

    const mapped = raw
      .map((b) => (b ? canonicalBranchName(b) : null))
      .filter((x): x is string => !!x)

    const auto = dedupeCaseInsensitivePreserve(mapped).slice(0, MAX_BRANCHES)

    if (auto.length) {
      setSelectedBranches(auto)
      setForm((prev) => ({
        ...prev,
        branch_name: auto[0] || null,
        branch_candidates: auto,
      }))
      loadCategories(auto[0], '')
    }
  }, [branchRows, extracted, canonicalBranchName, loadCategories])

  /* ========== Services Helpers ========== */

  const servicesTotal = useMemo(() => {
    const sum =
      form.services?.reduce(
        (acc, s) => acc + (Number(s.priority_percent) || 0),
        0,
      ) ?? 0
    return clampInt(sum)
  }, [form.services])

  function onServiceChange(
    idx: number,
    patch: Partial<NonNullable<Extracted['services']>[number]>,
  ) {
    const arr = [...(form.services || [])]
    const cur = arr[idx]
    const otherSum =
      arr.reduce(
        (acc, s, i) => (i === idx ? acc : acc + (Number(s.priority_percent) || 0)),
        0,
      ) ?? 0
    const remaining = Math.max(0, 100 - otherSum)
    let next = patch.priority_percent ?? cur.priority_percent ?? 0
    next = clampInt(next, 0, remaining)
    arr[idx] = {
      ...cur,
      ...patch,
      priority_percent: next,
    }
    setForm((prev) => ({ ...prev, services: arr }))
  }

  function addService() {
    if (servicesTotal >= 100) return
    setForm((prev) => ({
      ...prev,
      services: [...(prev.services || []), { name: '', priority_percent: 0 }],
    }))
  }

  /* ========== Branch Selection Helpers ========== */

  const addBranchDirect = useCallback(
    (label: string) => {
      const canon = canonicalBranchName(label) || normalizeLabel(label)
      if (!canon) return
      const next = dedupeCaseInsensitivePreserve([...selectedBranches, canon]).slice(
        0,
        MAX_BRANCHES,
      )
      if (!next.length) return
      setSelectedBranches(next)
      setBranchInput('')
      setBranchSuggest([])
      if (next[0]) loadCategories(next[0], '')
    },
    [canonicalBranchName, selectedBranches, loadCategories],
  )

  function addBranchFromInput() {
    const n = branchInput.trim()
    if (!n) return
    const canon = canonicalBranchName(n)
    if (!canon) {
      alert('Diese Branche ist nicht verfügbar. Bitte eine vorhandene Branche wählen.')
      return
    }
    addBranchDirect(canon)
  }

  const removeBranch = useCallback(
    (val: string) => {
      const next = selectedBranches.filter(
        (b) => b.toLowerCase() !== val.toLowerCase(),
      )
      setSelectedBranches(next)
      if (!next.length) {
        setCategoryRows((prev) => (prev.length ? [] : prev))
        setCategoryOptions((prev) => (prev.length ? [] : prev))
        setCategorySuggest((prev) => (prev.length ? [] : prev))
      } else {
        loadCategories(next[0], '')
      }
    },
    [selectedBranches, loadCategories],
  )

  function toggleBranchInAll(name: string) {
    const isSelected = selectedBranches.some(
      (b) => b.toLowerCase() === name.toLowerCase(),
    )
    if (isSelected) {
      removeBranch(name)
    } else if (selectedBranches.length < MAX_BRANCHES) {
      addBranchDirect(name)
    }
  }

  /* ========== Category Selection Helpers ========== */

  function addCategoryDirect(name: string) {
    const n = normalizeLabel(name)
    if (!n) return
    setSelectedCategories((prev) =>
      uniqueNormalized([...prev, n]).slice(0, MAX_CATEGORIES),
    )
    setCategoryInput('')
    setCategorySuggest([])
  }

  function addCategoryFromInput() {
    if (!categoryInput.trim()) return
    addCategoryDirect(categoryInput)
  }

  function removeCategory(val: string) {
    setSelectedCategories((prev) =>
      prev.filter((c) => c.toLowerCase() !== val.toLowerCase()),
    )
  }

  function toggleCategoryInAll(name: string) {
    const isSelected = selectedCategories.some(
      (c) => c.toLowerCase() === name.toLowerCase(),
    )
    if (isSelected) {
      removeCategory(name)
    } else if (selectedCategories.length < MAX_CATEGORIES) {
      addCategoryDirect(name)
    }
  }

  /* ========== Kategorien dynamisch nach Primary Branch ========== */

  const primaryBranch = selectedBranches[0] || ''

  useEffect(() => {
    if (!primaryBranch) {
      setCategoryRows((prev) => (prev.length ? [] : prev))
      setCategoryOptions((prev) => (prev.length ? [] : prev))
      setCategorySuggest((prev) => (prev.length ? [] : prev))
      return
    }

    if (!categoryInput.trim()) {
      loadCategories(primaryBranch, '')
    } else {
      debouncedLoadCategories(primaryBranch, categoryInput)
    }
  }, [primaryBranch, categoryInput, loadCategories, debouncedLoadCategories])

  /* ========== Save / Create Partner ========== */

  async function handleCreate() {
    if (servicesTotal !== 100) {
      alert(
        `Bitte die Service-Prioritäten auf insgesamt 100% setzen (aktuell ${servicesTotal}%).`,
      )
      return
    }

    const cleanBranches = Array.from(
      new Set(
        selectedBranches
          .map((b) => canonicalBranchName(b) || normalizeLabel(b))
          .filter(Boolean) as string[],
      ),
    ).slice(0, MAX_BRANCHES)

    const cleanCategories = uniqueNormalized(selectedCategories).slice(
      0,
      MAX_CATEGORIES,
    )

    try {
      const payload: any = {
        ...form,
        company_name: me?.profile.company_name ?? form.company_name ?? null,
        first_name: me?.profile.first_name ?? form.first_name ?? null,
        last_name: me?.profile.last_name ?? form.last_name ?? null,
        branch_name: cleanBranches[0] || null,
        branches_selected: cleanBranches,
        category_name: cleanCategories[0] || null,
        categories_selected: cleanCategories,
        extracted,
        model,
      }

      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data?.error === 'branch_not_found') {
          const suggestions: BranchRow[] = Array.isArray(data?.suggestions)
            ? data.suggestions
            : []
          setBranchSuggestions(suggestions)
          setShowBranchSuggestions(true)
          alert('Die gewählte Branche wurde nicht gefunden. Siehe Vorschläge unten.')
          return
        }
        if (data?.error === 'branch_required') {
          alert('Bitte wähle mindestens eine Branche.')
          return
        }
        throw new Error(data?.error || 'Speichern fehlgeschlagen')
      }
      if (!data.ok) throw new Error(data.error || 'Speichern fehlgeschlagen')

      const partnerId = data.partner_id as string

      if (logoFile) {
        const fd = new FormData()
        fd.append('partner_id', partnerId)
        fd.append('file', logoFile)
        const up = await fetch('/api/partners/logo', {
          method: 'POST',
          body: fd,
        })
        const upJs = await up.json().catch(() => ({}))
        if (!up.ok || !upJs?.ok)
          throw new Error(upJs?.error || 'Logo-Upload fehlgeschlagen')
      }

      setStep(4)
    } catch (e: any) {
      alert(e?.message || 'Speichern fehlgeschlagen')
    }
  }

  /* ================= Render ================= */

  const shellCls = 'space-y-6'

  return (
    <div className={shellCls}>
      {/* Stepper */}
      <nav className="sticky top-3 z-30 mb-5 flex flex-wrap items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[10px] text-slate-600 shadow-lg ring-1 ring-black/5 backdrop-blur-xl sm:text-xs">
        <span className={step >= 1 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
          1. Eingabe
        </span>
        <span className="opacity-40">›</span>
        <span className={step >= 2 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
          2. Prüfung &amp; Auswahl
        </span>
        <span className="opacity-40">›</span>
        <span className={step >= 3 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
          3. Vorschau
        </span>
        <span className="opacity-40">›</span>
        <span className={step >= 4 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
          4. Abschluss
        </span>
      </nav>

      {/* Header (nur Step 1 & 2) */}
      {(step === 1 || step === 2) && (
        <section className="mb-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-sm sm:h-24 sm:w-24 ${
                linkPulsing ? 'animate-pulse' : ''
              }`}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-full w-full object-contain p-2"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-[10px] text-slate-400 sm:text-xs">Kein Logo</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {me?.profile.company_name || 'Dein Unternehmen'}
              </div>
              <div className="text-[10px] text-slate-600 sm:text-xs">
                {loadingMe
                  ? 'Profil wird geladen…'
                  : (me?.profile.first_name || me?.profile.last_name)
                  ? `${me?.profile.first_name || ''} ${
                      me?.profile.last_name || ''
                    }`.trim()
                  : 'Inhaber'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm hover:border-slate-900 sm:text-sm">
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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-slate-900 sm:text-sm"
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

          <div className="w-full rounded-2xl border border-white/70 bg-white/92 p-4 text-[10px] text-slate-600 shadow-lg backdrop-blur-2xl md:w-80 sm:text-xs">
            <div className="mb-1 text-xs font-semibold text-slate-900 sm:text-sm">
              Auto-Übernahme aktiv
            </div>
            <p>
              Wir lesen Ihre Website &amp; Angaben aus und schlagen Branchen, Kategorien und
              Services vor. Sie können alles vor dem Speichern anpassen.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700 ring-1 ring-emerald-200 sm:text-[10px]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Modell: {model || 'n/a'}
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] text-slate-700 ring-1 ring-slate-200 sm:text-[10px]">
                Confidence: {(extracted?.confidence ?? 0).toFixed(2)}
              </span>
            </div>
            {form.links && form.links.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-medium text-slate-900 sm:text-xs">
                  Erkannte Links
                </div>
                <ul className="mt-1 space-y-0.5 text-[9px] text-slate-600 sm:text-[10px]">
                  {(form.links || []).map((l: any, i: number) => (
                    <li key={i}>{l.url}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 1 – Eingabe */}
      {step === 1 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
              1. Eingabe
            </h2>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-white/70 bg-white/92 px-3 py-1.5 text-[10px] shadow-sm hover:border-slate-900 backdrop-blur-2xl sm:text-xs"
            >
              Zurücksetzen
            </button>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:p-5 sm:text-sm">
            <label className="mb-1 block text-[10px] font-medium sm:text-xs">
              Kurze Beschreibung (optional)
            </label>
            <textarea
              className="w-full rounded-2xl border border-slate-200/70 bg-white/98 px-3 py-2 text-xs shadow-inner sm:text-sm"
              rows={4}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Beschreiben Sie Leistungen, Spezialisierungen, Regionen, besondere Stärken …"
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:p-5 sm:text-sm">
            <label className="block text-[10px] font-medium sm:text-xs">
              Website oder Social-Link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={`flex-1 rounded-2xl border px-3 py-2 text-xs shadow-inner sm:text-sm ${
                  linkError ? 'border-rose-400' : 'border-slate-200'
                } ${linkPulsing ? 'animate-pulse' : ''}`}
                placeholder="https://…"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value)
                  setLinkError(null)
                }}
                onKeyDown={onLinkKeyDown}
                disabled={links.length === 1}
              />
              {links.length === 0 ? (
                <button
                  type="button"
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 sm:text-sm"
                  onClick={addLink}
                >
                  Übernehmen
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-900 shadow hover:border-slate-900 sm:text-sm"
                  onClick={() => {
                    setLinks([])
                    setLinkInput('')
                  }}
                >
                  Ändern
                </button>
              )}
            </div>
            {linkError && (
              <p className="text-[10px] text-rose-600">{linkError}</p>
            )}
            {links.length > 0 && (
              <p className="text-[10px] text-slate-600 sm:text-xs">
                Verwendeter Link:{' '}
                <span className="underline decoration-dotted">{links[0]}</span>
              </p>
            )}
          </div>

          {/* Analyse-Karte */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 p-5 text-xs text-white shadow-2xl sm:text-sm">
            <div className="relative z-10 grid gap-4 sm:grid-cols-3 sm:items-center">
              <div className="sm:col-span-2">
                <div className="text-base font-semibold sm:text-lg">
                  KI-Analyse starten
                </div>
                <p className="mt-1 text-[11px] text-white/80 sm:text-xs">
                  Wir lesen Ihren Link &amp; Text, erkennen Branche, Kategorien, Services &amp;
                  Kontaktdaten. Sie prüfen anschließend alles in Ruhe.
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20">
                  <div
                    className={
                      'h-full bg-white transition-all ' +
                      (loading ? 'animate-[bar_1.4s_linear_infinite]' : 'w-0')
                    }
                  />
                </div>
                <style jsx>{`
                  @keyframes bar {
                    0% {
                      transform: translateX(-100%);
                      width: 40%;
                    }
                    50% {
                      transform: translateX(10%);
                      width: 70%;
                    }
                    100% {
                      transform: translateX(120%);
                      width: 40%;
                    }
                  }
                `}</style>
              </div>
              <div className="flex justify-start sm:justify-end">
                <button
                  disabled={loading}
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg hover:shadow-xl disabled:opacity-50 sm:text-sm"
                >
                  {loading ? 'Analysiere …' : '🚀 Analyse starten'}
                </button>
              </div>
            </div>
            {analyzeLogs.length > 0 && (
              <div className="relative z-10 mt-3 rounded-2xl bg-black/30 p-3 text-[9px] ring-1 ring-white/10 sm:text-[10px]">
                <div className="mb-1 font-medium">System-Log</div>
                <ul className="space-y-0.5">
                  {analyzeLogs.map((l, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 2 – Prüfung & Auswahl */}
      {step === 2 && (
        <section className="space-y-6">
          {/* Profil-Basis */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:grid-cols-2 sm:p-5 sm:text-sm">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Firmenname (aus Profil)
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm"
                value={me?.profile.company_name ?? form.company_name ?? ''}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Vorname
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm"
                value={me?.profile.first_name ?? form.first_name ?? ''}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Nachname
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm"
                value={me?.profile.last_name ?? form.last_name ?? ''}
                readOnly
              />
            </div>
          </div>

          {/* Kontakt & Beschreibung */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:grid-cols-2 sm:p-5 sm:text-sm">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Anzeigename
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.display_name ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                E-Mail
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.email ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Telefon
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.phone ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Website
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.website ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Beschreibung
              </label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                rows={4}
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Adresse */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:grid-cols-5 sm:p-5 sm:text-sm">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Straße
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.address?.street ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      street: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Nr.
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.address?.house_number ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      house_number: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                PLZ
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.address?.postal_code ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      postal_code: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Ort
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.address?.city ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      city: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-medium sm:text-xs">
                Land
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                value={form.address?.country ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      country: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>

          {/* Branchen – DROPDOWN FIX */}
          <div className="relative z-30 space-y-2 overflow-visible rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:p-5 sm:text-sm">
            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
              Branchen (max. {MAX_BRANCHES})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedBranches.length ? (
                selectedBranches.map((b) => (
                  <Chip key={b} onRemove={() => removeBranch(b)}>
                    {b}
                  </Chip>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 sm:text-xs">
                  Noch keine Branche gewählt.
                </span>
              )}
            </div>

<div className="mt-2 flex flex-col items-stretch gap-2 lg:flex-row">
  <div className="relative flex-1 w-full">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  placeholder="Branche suchen …"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  disabled={selectedBranches.length >= MAX_BRANCHES}
                />
                {branchSuggest.length > 0 && branchInput.trim() && (
                  <div className="absolute left-0 right-0 top-full z-[300] mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white/98 shadow-2xl backdrop-blur-xl">
                    <ul>
                      {branchSuggest.map((opt) => (
                        <li key={opt}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 sm:text-sm"
                            onClick={() => addBranchDirect(opt)}
                          >
                            {opt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs hover:border-slate-900 disabled:opacity-50 sm:text-sm"
                  onClick={addBranchFromInput}
                  disabled={
                    !branchInput.trim() ||
                    selectedBranches.length >= MAX_BRANCHES ||
                    branchLoading
                  }
                >
                  + Hinzufügen
                </button>
                <button
                  type="button"
                  className="text-[9px] text-slate-600 underline decoration-slate-300 hover:text-slate-900 sm:text-xs"
                  onClick={() => setShowAllBranches((s) => !s)}
                >
                  Alle anzeigen
                </button>
              </div>
            </div>

            {showAllBranches && (
              <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-2">
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {branchOptions.map((name) => {
                    const checked = selectedBranches.some(
                      (b) => b.toLowerCase() === name.toLowerCase(),
                    )
                    const disabled =
                      !checked && selectedBranches.length >= MAX_BRANCHES
                    return (
                      <li
                        key={name}
                        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleBranchInAll(name)}
                        />
                        <span className="text-[10px] sm:text-xs">{name}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {showBranchSuggestions && branchSuggestions.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <div className="mb-1 text-[10px] font-semibold sm:text-xs">
                  Vorschläge vom Server
                </div>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {branchSuggestions.map((s) => {
                    const checked = selectedBranches.some(
                      (b) => b.toLowerCase() === s.name.toLowerCase(),
                    )
                    const disabled =
                      !checked && selectedBranches.length >= MAX_BRANCHES
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-amber-100"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleBranchInAll(s.name)}
                        />
                        <span className="text-[10px] sm:text-xs">{s.name}</span>
                        <span className="ml-auto text-[8px] text-slate-500">
                          {s.slug}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {(branchError || (!branchLoading && branchOptions.length === 0)) && (
              <p className="mt-2 text-[9px] text-rose-600">
                Branchen konnten nicht geladen werden. Prüfe /api/partners/partner-branches &amp;
                RLS.
              </p>
            )}
          </div>

          {/* Kategorien – DROPDOWN FIX */}
          <div className="relative z-20 space-y-2 overflow-visible rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:p-5 sm:text-sm">
            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
              Kategorien (max. {MAX_CATEGORIES})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.length ? (
                selectedCategories.map((c) => (
                  <Chip key={c} onRemove={() => removeCategory(c)}>
                    {c}
                  </Chip>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 sm:text-xs">
                  Noch keine Kategorie gewählt.
                </span>
              )}
            </div>

<div className="mt-2 flex flex-col items-stretch gap-2 lg:flex-row">
  <div className="relative flex-1 w-full">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  placeholder={
                    primaryBranch
                      ? 'Kategorie in Ihrer Branche suchen …'
                      : 'Bitte zuerst eine Branche wählen'
                  }
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  disabled={!primaryBranch || selectedCategories.length >= MAX_CATEGORIES}
                />
                {categorySuggest.length > 0 && categoryInput.trim() && (
                  <div className="absolute left-0 right-0 top-full z-[300] mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white/98 shadow-2xl backdrop-blur-xl">
                    <ul>
                      {categorySuggest.map((opt) => (
                        <li key={opt}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 sm:text-sm"
                            onClick={() => addCategoryDirect(opt)}
                          >
                            {opt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs hover:border-slate-900 disabled:opacity-50 sm:text-sm"
                  onClick={addCategoryFromInput}
                  disabled={
                    !categoryInput.trim() ||
                    selectedCategories.length >= MAX_CATEGORIES ||
                    categoryLoading
                  }
                >
                  + Hinzufügen
                </button>
                <button
                  type="button"
                  className="text-[9px] text-slate-600 underline decoration-slate-300 hover:text-slate-900 sm:text-xs"
                  onClick={() => setShowAllCategories((s) => !s)}
                  disabled={!primaryBranch}
                >
                  Alle anzeigen
                </button>
              </div>
            </div>

            {showAllCategories && (
              <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-2">
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryOptions.map((name) => {
                    const checked = selectedCategories.some(
                      (c) => c.toLowerCase() === name.toLowerCase(),
                    )
                    const disabled =
                      !checked && selectedCategories.length >= MAX_CATEGORIES
                    return (
                      <li
                        key={name}
                        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleCategoryInAll(name)}
                        />
                        <span className="text-[10px] sm:text-xs">{name}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="rounded-2xl border border-white/70 bg-white/92 p-4 text-xs text-slate-700 shadow-sm backdrop-blur-2xl sm:p-5 sm:text-sm">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                Services (Summe = 100%)
              </div>
              <div
                className={
                  'text-[10px] sm:text-xs ' +
                  (servicesTotal === 100 ? 'text-emerald-600' : 'text-amber-600')
                }
              >
                Summe: {servicesTotal}%
              </div>
            </div>

            <div className="space-y-3">
              {(form.services || []).map((s, idx) => {
                const otherSum =
                  form.services?.reduce(
                    (acc, x, i) =>
                      i === idx ? acc : acc + (Number(x.priority_percent) || 0),
                    0,
                  ) ?? 0
                const remaining = Math.max(0, 100 - otherSum)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-8 rounded-2xl border border-slate-200 px-3 py-2 text-xs sm:col-span-9 sm:text-sm"
                      placeholder="Service-Name"
                      value={s.name}
                      onChange={(e) => {
                        const arr = [...(form.services || [])]
                        arr[idx] = {
                          ...arr[idx],
                          name: e.target.value,
                        }
                        setForm((prev) => ({
                          ...prev,
                          services: arr,
                        }))
                      }}
                    />
                    <div className="col-span-4 flex items-center gap-1 sm:col-span-3">
                      <input
                        className="w-full rounded-2xl border border-slate-200 px-2 py-2 text-xs sm:text-sm"
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
                      <span className="text-[10px] sm:text-xs">%</span>
                    </div>
                    <div className="col-span-12">
                      <button
                        type="button"
                        className="text-[9px] text-slate-500 hover:text-rose-600 sm:text-xs"
                        onClick={() => {
                          const arr = [...(form.services || [])]
                          arr.splice(idx, 1)
                          setForm((prev) => ({
                            ...prev,
                            services: arr,
                          }))
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
                className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs hover:border-slate-900 disabled:opacity-50 sm:text-sm"
                onClick={addService}
                disabled={servicesTotal >= 100}
              >
                + Service hinzufügen
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              className="rounded-2xl border border-white/70 bg-white/92 px-4 py-2 text-xs text-slate-900 shadow-sm hover:border-slate-900 backdrop-blur-2xl sm:text-sm"
              onClick={() => setStep(1)}
            >
              Zurück
            </button>
            <button
              className="rounded-2xl bg-slate-900 px-4 py-2 text-xs text-white shadow hover:opacity-90 disabled:opacity-50 sm:text-sm"
              onClick={() => setStep(3)}
              disabled={servicesTotal !== 100}
            >
              Weiter zur Vorschau
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 – Vorschau */}
      {step === 3 && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/70 bg-white/96 p-5 text-xs text-slate-700 shadow-xl backdrop-blur-2xl sm:text-sm">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-sm sm:h-24 sm:w-24">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[10px] text-slate-400 sm:text-xs">
                    Kein Logo
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                  {form.display_name ||
                    me?.profile.company_name ||
                    'Ihr Profil'}
                </h2>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  {form.description || 'Ohne Beschreibung.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedBranches.map((b) => (
                    <Chip key={b}>{b}</Chip>
                  ))}
                  {selectedCategories.slice(0, 6).map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                  {selectedCategories.length > 6 && (
                    <span className="text-[9px] text-slate-500 sm:text-[10px]">
                      +{selectedCategories.length - 6} weitere
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div className="space-y-2 text-xs text-slate-700 sm:col-span-1 sm:text-sm">
                <h3 className="font-semibold text-slate-900">Kontakt</h3>
                <p>E-Mail: {form.email || '—'}</p>
                <p>Telefon: {form.phone || '—'}</p>
                <p>Website: {form.website || '—'}</p>
                <p>
                  Adresse:{' '}
                  {[
                    form.address?.street,
                    form.address?.house_number,
                    form.address?.postal_code,
                    form.address?.city,
                    form.address?.country,
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </p>

                {form.links && form.links.length > 0 && (
                  <>
                    <h4 className="mt-3 text-xs font-semibold text-slate-900">
                      Social Media
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {form.links.map(
                        (l: any, i: number) =>
                          l.url && (
                            <a
                              key={i}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-full bg-white px-2 py-1 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50"
                            >
                              <SocialIcon kind={l.kind} />
                            </a>
                          ),
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">
                  Leistungen &amp; Prioritäten
                </h3>
                <ul className="space-y-1.5">
                  {(form.services || []).map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-2xl bg-white/96 px-3 py-1.5 text-[10px] text-slate-800 ring-1 ring-slate-200 sm:text-xs"
                    >
                      <span className="truncate">
                        {s.name || 'Service'}
                      </span>
                      <span className="ml-2 tabular-nums font-semibold">
                        {s.priority_percent ?? 0}%
                      </span>
                    </li>
                  ))}
                  {(!form.services || form.services.length === 0) && (
                    <li className="text-[10px] text-slate-500 sm:text-xs">
                      Keine Services definiert.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              className="rounded-2xl border border-white/70 bg-white/92 px-4 py-2 text-xs text-slate-900 shadow-sm hover:border-slate-900 backdrop-blur-2xl sm:text-sm"
              onClick={() => setStep(2)}
            >
              Zurück
            </button>
            <button
              className="rounded-2xl bg-slate-900 px-4 py-2 text-xs text-white shadow hover:opacity-90 sm:text-sm"
              onClick={handleCreate}
            >
              Partner speichern
            </button>
          </div>
        </section>
      )}

      {/* STEP 4 – Abschluss */}
      {step === 4 && (
        <section className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            ✓
          </div>
          <div className="text-lg font-semibold text-slate-900 sm:text-2xl">
            Geschafft! Ihr Partnerprofil ist angelegt.
          </div>
          <p className="max-w-md text-xs text-slate-600 sm:text-sm">
            Sie können Ihr Profil nun im Markt verwenden, sich auf Anfragen bewerben und Ihr
            Profil jederzeit im Dashboard weiter optimieren.
          </p>
        </section>
      )}
    </div>
  )
}
