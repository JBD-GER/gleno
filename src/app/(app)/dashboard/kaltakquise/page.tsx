// app/(app)/dashboard/kaltakquise/page.tsx
'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  SparklesIcon,
  PlusIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  UserGroupIcon,
  LanguageIcon,
  PencilSquareIcon,
  TrashIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline'

type IntroStyle = 'professional' | 'casual' | 'neutral'

type AcquisitionProfile = {
  id: string
  name: string
  website_url?: string | null
  offer_name?: string | null
  offer_description?: string | null
  target_audience?: string | null
  language?: 'de' | 'en' | null
  customer_profile?: {
    summary?: string
    pains?: string[]
    goals?: string[]
    decision_makers?: string[]
    deal_sizes?: string
  } | null
  intros?: Record<string, string> | null
  closing_priorities?: {
    primary?: string | null
    secondary?: string | null
    tertiary?: string | null
  } | null
  created_at?: string
}

type CreateFormState = {
  websiteUrl: string
  profileName: string
  offerName: string
  offerDescription: string
  targetAudience: string
  language: 'de' | 'en'
  introStyles: IntroStyle[]
  baseScript: string
  closingPrio1: string
  closingPrio2: string
  closingPrio3: string
  scriptFile?: File | null
}

const defaultForm: CreateFormState = {
  websiteUrl: '',
  profileName: '',
  offerName: '',
  offerDescription: '',
  targetAudience: '',
  language: 'de',
  introStyles: ['professional', 'casual', 'neutral'],
  baseScript: '',
  closingPrio1: 'Demo-Termin vereinbaren',
  closingPrio2: 'Infos per E-Mail senden',
  closingPrio3: 'Höflich verabschieden',
  scriptFile: null,
}

const PAGE_SIZE = 6

export default function AcquisitionProfilesPage() {
  const supabase = createClientComponentClient()

  const [profiles, setProfiles] = useState<AcquisitionProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateFormState>(defaultForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editProfile, setEditProfile] = useState<AcquisitionProfile | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // File input reset (damit gleiche Datei erneut gewählt werden kann)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE))
  const startIndex = (page - 1) * PAGE_SIZE
  const visibleProfiles = profiles.slice(startIndex, startIndex + PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [profiles.length])

  /* --------- Load profiles from Supabase --------- */
  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const { data, error } = await supabase
          .from('acquisition_profiles')
          .select(
            'id, name, website_url, offer_name, offer_description, target_audience, language, customer_profile, intros, closing_priorities, created_at'
          )
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[acquisition] load error', error)
          setLoadError('Profile konnten nicht geladen werden.')
          return
        }

        setProfiles((data ?? []) as AcquisitionProfile[])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  /* --------- Form helpers --------- */

  const updateFormField = <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleIntroStyle = (style: IntroStyle) => {
    setForm((prev) => {
      const exists = prev.introStyles.includes(style)
      if (exists) {
        const next = prev.introStyles.filter((s) => s !== style)
        return { ...prev, introStyles: next.length ? next : [style] }
      }
      return { ...prev, introStyles: [...prev.introStyles, style] }
    })
  }

  /* --------- Create profile via KI-API --------- */

  const handleCreateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError(null)

    if (
      !form.websiteUrl ||
      !form.profileName ||
      !form.offerName ||
      !form.offerDescription ||
      !form.targetAudience ||
      !form.closingPrio1 ||
      !form.closingPrio2 ||
      !form.closingPrio3
    ) {
      setCreateError('Bitte alle Pflichtfelder inkl. Prio 1–3 ausfüllen.')
      return
    }

    try {
      setCreating(true)

      const closingGoals = {
        primary: form.closingPrio1,
        secondary: form.closingPrio2,
        tertiary: form.closingPrio3,
      }

      // Wenn Datei vorhanden → multipart/form-data
      if (form.scriptFile) {
        const fd = new FormData()
        fd.append('websiteUrl', form.websiteUrl)
        fd.append('profileName', form.profileName)
        fd.append('offerName', form.offerName)
        fd.append('offerDescription', form.offerDescription)
        fd.append('targetAudience', form.targetAudience)
        fd.append('language', form.language)
        fd.append('introStyles', JSON.stringify(form.introStyles))
        fd.append('scriptText', form.baseScript || '')
        fd.append('closingGoals', JSON.stringify(closingGoals))
        fd.append('scriptFile', form.scriptFile)

        const res = await fetch('/api/ai/acquisition/profile', {
          method: 'POST',
          body: fd,
        })

        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          throw new Error(txt || `Fehler beim Erstellen (${res.status}).`)
        }

        const json = await res.json()
        const created = json.profile as AcquisitionProfile
        setProfiles((prev) => [created, ...prev])
        setForm(defaultForm)

        // file input hart resetten
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      // Kein File → JSON (wie vorher)
      const payload = {
        websiteUrl: form.websiteUrl,
        profileName: form.profileName,
        offerName: form.offerName,
        offerDescription: form.offerDescription,
        targetAudience: form.targetAudience,
        language: form.language,
        introStyles: form.introStyles,
        scriptText: form.baseScript || undefined,
        closingGoals,
      }

      const res = await fetch('/api/ai/acquisition/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `Fehler beim Erstellen (${res.status}).`)
      }

      const json = await res.json()
      const created = json.profile as AcquisitionProfile
      setProfiles((prev) => [created, ...prev])
      setForm(defaultForm)
    } catch (err: any) {
      console.error(err)
      setCreateError(err?.message ?? 'Unbekannter Fehler beim Erstellen.')
    } finally {
      setCreating(false)
    }
  }

  /* --------- Delete --------- */

  const handleDelete = async (id: string) => {
    const ok = window.confirm(
      'Akquise-Profil wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.'
    )
    if (!ok) return

    try {
      setDeletingId(id)
      const { error } = await supabase.from('acquisition_profiles').delete().eq('id', id)

      if (error) {
        console.error('[acquisition] delete error', error)
        alert('Profil konnte nicht gelöscht werden.')
        return
      }

      setProfiles((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  /* --------- Edit --------- */

  const openEdit = (p: AcquisitionProfile) => {
    setEditError(null)
    setEditProfile(p)
  }

  const handleEditChange = (key: keyof AcquisitionProfile, value: any) => {
    setEditProfile((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSaveEdit = async () => {
    if (!editProfile) return
    setEditError(null)

    try {
      setEditSaving(true)
      const { id, name, offer_name, offer_description, target_audience, language } = editProfile

      const { data, error } = await supabase
        .from('acquisition_profiles')
        .update({
          name,
          offer_name,
          offer_description,
          target_audience,
          language,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('[acquisition] update error', error)
        setEditError('Profil konnte nicht gespeichert werden.')
        return
      }

      setProfiles((prev) => prev.map((p) => (p.id === id ? (data as AcquisitionProfile) : p)))
      setEditProfile(null)
    } finally {
      setEditSaving(false)
    }
  }

  /* --------- UI --------- */

  const btnPrimaryGlass =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-50 sm:text-sm'

  const pillBtn = 'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors'

  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="min-h-[100dvh] w-full bg-[radial-gradient(1300px_450px_at_-10%_-30%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(1300px_450px_at_110%_130%,rgba(88,101,242,0.07),transparent_60%),#e8edf5] px-3 pb-8 pt-4 text-slate-800 sm:px-4 sm:pt-5 md:px-6 lg:px-8 xl:px-10">
      <div className="w-full text-left">
        {/* HERO */}
        <div className="relative mb-6 w-full overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.22)] backdrop-blur-2xl sm:p-5 lg:p-6">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_260px_at_-10%_-20%,rgba(15,23,42,0.10),transparent_60%),radial-gradient(1000px_280px_at_110%_120%,rgba(88,101,242,0.14),transparent_60%)]" />
          <div className="relative flex flex-col gap-3">
            <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] text-slate-700 shadow-sm backdrop-blur">
              <SparklesIcon className="h-4 w-4 text-slate-900" />
              <span className="font-medium">Akquise-Profile</span>
              <span className="h-0.5 w-6 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
              <span className="text-[10px] text-slate-500">KI-basierte Baselines für deine Telefonie</span>
            </div>

            <h1 className="mt-1 text-[1.55rem] font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-[1.9rem]">
              KI-gestützte Akquise-Baselines für deine Telefonie
            </h1>

            <p className="max-w-3xl text-xs text-slate-600 sm:text-sm">
              Lege Profile für unterschiedliche Zielgruppen und Angebote an. Die KI analysiert deine Website (und
              optional dein bestehendes Skript / Upload), baut ein Kundenprofil und erzeugt passende Telefon-Intros –
              inkl. klaren Abschlusszielen.
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              <StepPill index={1} label="Website & Angebot eingeben" />
              <StepPill index={2} label="Optional: Skript hochladen" />
              <StepPill index={3} label="KI baut Kundenprofil, Intros & Prio-Ziele" />
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          {/* LEFT: Create form */}
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(700px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(700px_260px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <div className="text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Neues Akquise-Profil</p>
                  <p className="text-[11px] text-slate-500">
                    Website + optional Skript (Text oder Upload) → KI erzeugt Inhalte.
                  </p>
                </div>
                <SparklesIcon className="h-5 w-5 text-indigo-500" />
              </div>

              <form onSubmit={handleCreateProfile} className="mt-4 space-y-3 text-sm">
                <FieldShell label="Website-URL *" icon={<GlobeAltIcon className="h-5 w-5" />}>
                  <input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => updateFormField('websiteUrl', e.target.value)}
                    placeholder="https://mein-unternehmen.de"
                    className="h-10 w-full rounded-lg border border-white/60 bg-white/85 px-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                <FieldShell label="Profil-Name *" icon={<MegaphoneIcon className="h-5 w-5" />}>
                  <input
                    type="text"
                    value={form.profileName}
                    onChange={(e) => updateFormField('profileName', e.target.value)}
                    placeholder="z. B. Photovoltaik-Betriebe DACH"
                    className="h-10 w-full rounded-lg border border-white/60 bg-white/85 px-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                <FieldShell label="Angebot / Produkt *" icon={<MegaphoneIcon className="h-5 w-5" />}>
                  <input
                    type="text"
                    value={form.offerName}
                    onChange={(e) => updateFormField('offerName', e.target.value)}
                    placeholder="z. B. GLENO – Unternehmenssoftware"
                    className="h-10 w-full rounded-lg border border-white/60 bg-white/85 px-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                <FieldShell label="Kurzbeschreibung des Angebots *">
                  <textarea
                    value={form.offerDescription}
                    onChange={(e) => updateFormField('offerDescription', e.target.value)}
                    rows={3}
                    placeholder="Was löst dein Produkt, Nutzen, Problem der Zielgruppe?"
                    className="w-full rounded-lg border border-white/60 bg-white/85 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                <FieldShell label="Zielgruppe *" icon={<UserGroupIcon className="h-5 w-5" />}>
                  <textarea
                    value={form.targetAudience}
                    onChange={(e) => updateFormField('targetAudience', e.target.value)}
                    rows={2}
                    placeholder="z. B. Inhaber von PV-Betrieben mit 5–50 Mitarbeitenden"
                    className="w-full rounded-lg border border-white/60 bg-white/85 px-3 py-2 pl-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                <FieldShell label="Bestehendes Telefon-Skript (Text, optional)">
                  <textarea
                    value={form.baseScript}
                    onChange={(e) => updateFormField('baseScript', e.target.value)}
                    rows={4}
                    placeholder="Optional: Text hier einfügen. (Upload zusätzlich möglich.)"
                    className="w-full rounded-lg border border-white/60 bg-white/85 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </FieldShell>

                {/* Upload */}
                <FieldShell label="Skript hochladen (optional)">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-[11px] text-slate-700 shadow-sm hover:bg-white">
                      <PaperClipIcon className="h-4 w-4" />
                      Datei auswählen
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".txt,.md,.csv,.json,.pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null
                          updateFormField('scriptFile', f)
                        }}
                      />
                    </label>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-slate-600">
                        {form.scriptFile ? form.scriptFile.name : 'Keine Datei ausgewählt'}
                      </p>
                      {form.scriptFile && (
                        <button
                          type="button"
                          onClick={() => {
                            updateFormField('scriptFile', null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="mt-0.5 text-[10px] text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          Datei entfernen
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Upload wird in Supabase Storage (Bucket: <span className="font-medium">skripte</span>) gespeichert
                    und von der KI ausgewertet.
                  </p>
                </FieldShell>

                {/* Sprache & Tonalitäten */}
                <div className="mt-2 flex flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                      <LanguageIcon className="h-4 w-4" />
                      Sprache
                    </p>
                    <div className="inline-flex rounded-full border border-white/60 bg-white/85 p-1 text-[11px] backdrop-blur">
                      {(['de', 'en'] as const).map((lng) => (
                        <button
                          key={lng}
                          type="button"
                          onClick={() => updateFormField('language', lng)}
                          className={[
                            pillBtn,
                            'px-3',
                            form.language === lng
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-white/60 bg-white/85 text-slate-700 hover:bg-white',
                          ].join(' ')}
                        >
                          {lng === 'de' ? 'Deutsch' : 'Englisch'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-700">Tonalitäten</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {(['professional', 'neutral', 'casual'] as IntroStyle[]).map((style) => {
                        const active = form.introStyles.includes(style)
                        const label =
                          style === 'professional'
                            ? 'Professionell'
                            : style === 'neutral'
                            ? 'Neutral'
                            : 'Locker'
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => toggleIntroStyle(style)}
                            className={[
                              pillBtn,
                              active
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-white/60 bg-white/85 text-slate-700 hover:bg-white',
                            ].join(' ')}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Abschlussziele (PRIO) */}
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] font-medium text-slate-700">Abschlussziele (Prioritäten) *</p>
                  <div className="grid gap-2 text-[11px] sm:grid-cols-3">
                    <div>
                      <p className="mb-1 text-[10px] text-slate-500">Prio 1</p>
                      <input
                        type="text"
                        value={form.closingPrio1}
                        onChange={(e) => updateFormField('closingPrio1', e.target.value)}
                        className="h-9 w-full rounded-lg border border-white/60 bg-white/85 px-3 text-[11px] text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-slate-500">Prio 2</p>
                      <input
                        type="text"
                        value={form.closingPrio2}
                        onChange={(e) => updateFormField('closingPrio2', e.target.value)}
                        className="h-9 w-full rounded-lg border border-white/60 bg-white/85 px-3 text-[11px] text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-slate-500">Prio 3</p>
                      <input
                        type="text"
                        value={form.closingPrio3}
                        onChange={(e) => updateFormField('closingPrio3', e.target.value)}
                        className="h-9 w-full rounded-lg border border-white/60 bg-white/85 px-3 text-[11px] text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">Die KI nutzt diese Prioritäten später beim Live-Coaching.</p>
                </div>

                {createError && <p className="pt-1 text-[11px] text-rose-500">{createError}</p>}

                <button type="submit" disabled={creating} className={[btnPrimaryGlass, 'mt-3 w-full justify-center rounded-xl'].join(' ')}>
                  <PlusIcon className="h-4 w-4" />
                  {creating ? 'Profil wird mit KI erstellt…' : 'Akquise-Profil erstellen'}
                </button>

                <p className="mt-2 text-[10px] text-slate-500">
                  Hinweis: Die KI liest die Website (gekürzt) und berücksichtigt zusätzlich Script-Text und/oder Upload.
                </p>
              </form>
            </div>
          </div>

          {/* RIGHT: Profile list */}
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_260px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
            <div className="relative flex h-full flex-col">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Deine Profile</p>
                <p className="text-[11px] text-slate-500">Wähle ein Profil, um später damit zu telefonieren.</p>
              </div>

              {loading ? (
                <div className="flex flex-col gap-3 py-4 text-xs text-slate-600">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : loadError ? (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-600">{loadError}</div>
              ) : profiles.length === 0 ? (
                <div className="rounded-xl bg-white/90 px-4 py-6 text-xs text-slate-600">
                  Noch keine Akquise-Profile vorhanden. Lege links dein erstes Profil an.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleProfiles.map((p) => {
                      const prio1 = p.closing_priorities?.primary || null
                      return (
                        <div
                          key={p.id}
                          className="flex flex-col rounded-2xl border border-white/70 bg-white/95 p-3 text-xs text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</h3>
                              {p.offer_name && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{p.offer_name}</p>}
                            </div>
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              {p.language === 'en' ? 'EN' : 'DE'}
                            </span>
                          </div>

                          {p.customer_profile?.summary && (
                            <p className="mt-2 line-clamp-3 text-[11px] text-slate-600">{p.customer_profile.summary}</p>
                          )}

                          {prio1 && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] text-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Prio 1: {prio1}
                              </span>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <Link
                              href={`/dashboard/kaltakquise/${p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/70 bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                            >
                              Telefonie öffnen
                              <ArrowRightIcon className="h-3.5 w-3.5" />
                            </Link>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/95 text-slate-700 shadow-sm hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                                title="Bearbeiten"
                              >
                                <PencilSquareIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Löschen"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {p.created_at && (
                            <p className="mt-1 text-[10px] text-slate-400">
                              Erstellt am {new Date(p.created_at).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                      <button
                        type="button"
                        disabled={!canPrev}
                        onClick={() => canPrev && setPage((p) => p - 1)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 ${
                          canPrev
                            ? 'border-white/70 bg-white/90 text-slate-800 shadow-sm hover:border-slate-900 hover:bg-slate-900 hover:text-white'
                            : 'cursor-not-allowed border-slate-100 bg-white/60 text-slate-300'
                        }`}
                      >
                        ‹ Zurück
                      </button>

                      <span className="flex-1 text-center text-[11px] text-slate-500">
                        Seite {page} von {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={!canNext}
                        onClick={() => canNext && setPage((p) => p + 1)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 ${
                          canNext
                            ? 'border-white/70 bg-white/90 text-slate-800 shadow-sm hover:border-slate-900 hover:bg-slate-900 hover:text-white'
                            : 'cursor-not-allowed border-slate-100 bg-white/60 text-slate-300'
                        }`}
                      >
                        Weiter ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT-MODAL */}
      {editProfile && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/60 bg-white/95 p-4 text-sm shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Akquise-Profil bearbeiten</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Passe Namen, Angebot und Zielgruppe an. KI-Inhalte bleiben bestehen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditProfile(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <FieldShell label="Profil-Name">
                <input
                  type="text"
                  value={editProfile.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  className="h-9 w-full rounded-lg border border-white/60 bg-white/80 px-3 text-xs text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
              </FieldShell>

              <FieldShell label="Angebot / Produkt">
                <input
                  type="text"
                  value={editProfile.offer_name ?? ''}
                  onChange={(e) => handleEditChange('offer_name', e.target.value)}
                  className="h-9 w-full rounded-lg border border-white/60 bg-white/80 px-3 text-xs text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
              </FieldShell>

              <FieldShell label="Kurzbeschreibung">
                <textarea
                  rows={3}
                  value={editProfile.offer_description ?? ''}
                  onChange={(e) => handleEditChange('offer_description', e.target.value)}
                  className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-xs text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
              </FieldShell>

              <FieldShell label="Zielgruppe">
                <textarea
                  rows={2}
                  value={editProfile.target_audience ?? ''}
                  onChange={(e) => handleEditChange('target_audience', e.target.value)}
                  className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-xs text-slate-900 outline-none ring-offset-2 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
              </FieldShell>

              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-700">Sprache</p>
                <div className="inline-flex rounded-full border border-white/60 bg-white/80 p-1 text-[11px] backdrop-blur">
                  {(['de', 'en'] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => handleEditChange('language', lng)}
                      className={[
                        pillBtn,
                        'px-3',
                        editProfile.language === lng || (!editProfile.language && lng === 'de')
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-transparent bg-transparent text-slate-700 hover:bg-white',
                      ].join(' ')}
                    >
                      {lng === 'de' ? 'Deutsch' : 'Englisch'}
                    </button>
                  ))}
                </div>
              </div>

              {editError && <p className="text-[11px] text-rose-500">{editError}</p>}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfile(null)}
                  className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-xs text-slate-800 shadow-sm hover:bg-white sm:text-sm"
                >
                  Abbrechen
                </button>
                <button type="button" onClick={handleSaveEdit} disabled={editSaving} className={btnPrimaryGlass}>
                  {editSaving ? 'Speichert…' : 'Änderungen speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KI-GENERATION OVERLAY */}
      {creating && <AIGeneratingOverlay />}
    </div>
  )
}

/* --------- UI Helper Components --------- */

function FieldShell({
  label,
  children,
  icon,
}: {
  label: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col text-left">
      <label className="mb-1 text-[11px] font-medium text-slate-700 sm:text-xs">{label}</label>
      <div className="relative">
        {children}
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center pl-2 text-slate-400">
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}

function StepPill({ index, label }: { index: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-semibold text-white">
        {index}
      </span>
      {label}
    </span>
  )
}

function SkeletonCard() {
  return <div className="h-[150px] animate-pulse rounded-2xl border border-white/70 bg-white/80" />
}

function AIGeneratingOverlay() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex justify-center px-4 sm:bottom-5 sm:px-6">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-indigo-200 bg-white/95 px-3 py-2.5 text-xs text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:px-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-tr from-indigo-500 via-sky-400 to-emerald-400 opacity-80 blur-sm" />
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
            KI
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-medium text-slate-900">KI generiert dein Akquise-Profil …</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Website wird analysiert, Upload wird ausgewertet.</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="ai-bar h-full w-1/2 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
          </div>
        </div>

        <style jsx>{`
          @keyframes aiBar {
            0% {
              transform: translateX(-60%);
            }
            50% {
              transform: translateX(10%);
            }
            100% {
              transform: translateX(110%);
            }
          }
          .ai-bar {
            animation: aiBar 1.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  )
}
