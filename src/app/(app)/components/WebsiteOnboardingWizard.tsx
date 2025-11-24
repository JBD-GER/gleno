'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import type { WebsiteContent } from '@/types/website'

type WizardProps = { scoped?: boolean } // wird ignoriert, nur für Abwärtskompat.

const defaultContent: WebsiteContent = {
  order: ['hero', 'services', 'benefits', 'faq', 'contact'],
  enabled: {
    hero: true,
    services: true,
    benefits: true,
    gallery: false,
    testimonials: false,
    faq: true,
    contact: true,
  },
  hero: {
    h1: 'Fliesenleger Meisterbetrieb',
    sub: 'Sauber. Pünktlich. Fair.',
    cta_label: 'Angebot anfragen',
    cta_href: '#kontakt',
  },
  services: {
    title: 'Leistungen',
    items: [
      { title: 'Badsanierung', text: 'Komplett aus einer Hand' },
      { title: 'Großformate', text: 'Perfekte Fugenbilder' },
      { title: 'Balkon abdichten', text: 'Langlebig & sicher' },
    ],
  },
  benefits: {
    title: 'Warum wir',
    items: [
      { title: 'Festpreis', text: 'Transparente Angebote' },
      { title: 'Termintreu', text: 'Wir kommen wie vereinbart' },
      { title: 'Staubarm', text: 'Saubere Baustelle' },
    ],
  },
  gallery: { title: 'Referenzen', items: [] },
  testimonials: { title: 'Kundenstimmen', items: [] },
  faq: {
    title: 'Fragen & Antworten',
    items: [{ q: 'Wie schnell?', a: 'In 2–3 Wochen.' }],
  },
  contact: {
    title: 'Kontakt',
    phone: '',
    email: '',
    address: '',
    opening: 'Mo–Fr 9–17 Uhr',
    form: true,
  },
}

/* Debounce */
function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

/* Slug sanitize */
function sanitizeSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Prefill = {
  company_name: string
  first_name: string
  last_name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  country: string
  email: string
  phone?: string
}

export default function WebsiteOnboardingWizard({}: WizardProps) {
  const [shouldOpen, setShouldOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [working, setWorking] = useState(false)

  // getrennte States für Eingabe (raw) vs. bereinigt
  const [inputSlug, setInputSlug] = useState('')
  const cleanSlug = useMemo(() => sanitizeSlug(inputSlug), [inputSlug])
  const debouncedClean = useDebounced(cleanSlug, 300)
  const [slugFree, setSlugFree] = useState<boolean | null>(null)
  const [slugMsg, setSlugMsg] = useState('')

  const [prefill, setPrefill] = useState<Prefill>({
    company_name: '',
    first_name: '',
    last_name: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: '',
    email: '',
    phone: '',
  })
  const [responsible, setResponsible] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const router = useRouter()
  const supabase = useMemo(() => supabaseClient(), [])

  /* 1) Falls schon Website existiert -> Seite nicht zeigen */
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) {
        setChecking(false)
        setShouldOpen(false)
        return
      }

      const { data } = await supabase
        .from('websites')
        .select('id')
        .eq('user_id', auth.user.id)
        .limit(1)
        .maybeSingle()

      setShouldOpen(!data) // nur öffnen, wenn keine existiert
      setChecking(false)

      if (!auth.user) return

      // Prefills laden
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'company_name, first_name, last_name, email, street, house_number, postal_code, city, country',
        )
        .eq('id', auth.user.id)
        .single()

      const { data: billing } = await supabase
        .from('billing_settings')
        .select('billing_phone, billing_email')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      setPrefill({
        company_name: profile?.company_name || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        street: profile?.street || '',
        house_number: profile?.house_number || '',
        postal_code: profile?.postal_code || '',
        city: profile?.city || '',
        country: profile?.country || '',
        email: billing?.billing_email || profile?.email || '',
        phone: billing?.billing_phone || '',
      })
      setResponsible({
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
        email: billing?.billing_email || profile?.email || '',
        phone: billing?.billing_phone || '',
      })
    })()
  }, [supabase])

  /* 2) Slug live prüfen (Eingabe nie überschreiben) */
  useEffect(() => {
    ;(async () => {
      if (!debouncedClean) {
        setSlugFree(null)
        setSlugMsg('')
        return
      }
      const { count, error } = await supabase
        .from('websites')
        .select('id', { count: 'exact', head: true })
        .eq('slug', debouncedClean)
      if (error) {
        console.error(error)
        setSlugFree(null)
        setSlugMsg('')
        return
      }
      if ((count ?? 0) > 0) {
        setSlugFree(false)
        setSlugMsg('Dieser Slug ist bereits vergeben.')
      } else {
        setSlugFree(true)
        setSlugMsg('Dieser Slug ist verfügbar.')
      }
    })()
  }, [debouncedClean, supabase])

  /* 3) Website anlegen */
  async function handleCreate() {
    setWorking(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) throw new Error('Nicht eingeloggt')
      if (!cleanSlug) throw new Error('Bitte einen gültigen Slug eingeben.')

      const { data: ensured } = await supabase.rpc('ensure_unique_slug', {
        base: cleanSlug,
      })
      const finalSlug = ensured || cleanSlug

      const contactAddress = [
        prefill.street,
        prefill.house_number,
        prefill.postal_code,
        prefill.city,
        prefill.country,
      ]
        .filter(Boolean)
        .join(' ')

      const content: WebsiteContent = {
        ...defaultContent,
        benefits: {
          ...defaultContent.benefits,
          // @ts-ignore – intro ist optional, nicht in allen Typen vorhanden
          intro:
            'Wir verbinden präzises Handwerk mit fairer, transparenter Kommunikation.',
        } as any,
        hero: {
          ...defaultContent.hero,
          h1: prefill.company_name || defaultContent.hero.h1,
          sub: `${prefill.city ? prefill.city + ' · ' : ''}Meisterbetrieb`,
        },
        contact: {
          ...defaultContent.contact,
          title: 'Kontakt',
          phone: prefill.phone || '',
          email: prefill.email || '',
          address: contactAddress,
          opening: defaultContent.contact.opening,
          form: true,
        },
      }

      const { error } = await supabase.from('websites').insert({
        user_id: auth.user.id,
        slug: finalSlug,
        title: prefill.company_name || 'Fliesenleger Meisterbetrieb',
        description: 'Saubere Arbeit. Faire Preise. Termintreu.',
        primary_color: '#0a1b40',
        secondary_color: '#f59e0b',
        imprint_html: '',
        privacy_html: '',
        content,
      })
      if (error) throw error

      // 5 Sekunden "wird erstellt…" anzeigen, dann zur Editor-Page
      await new Promise((r) => setTimeout(r, 5000))
      router.push('/dashboard/website')
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Erstellung fehlgeschlagen.')
      setWorking(false)
    }
  }

  // Wenn nicht nötig, nichts rendern (Editier-Seite übernimmt)
  if (checking || !shouldOpen) return null

  const steps = [
    { id: 1 as const, label: 'Slug' },
    { id: 2 as const, label: 'Stammdaten' },
    { id: 3 as const, label: 'Ansprechpartner' },
    { id: 4 as const, label: 'Erstellen' },
  ]

  const canGoNextFrom1 = !!cleanSlug && slugFree !== false
  const canGoNextFrom2 =
    !!prefill.company_name &&
    !!prefill.street &&
    !!prefill.postal_code &&
    !!prefill.city
  const canGoNextFrom3 = !!responsible.name

  function goToNext() {
    if (step === 1 && !canGoNextFrom1) return
    if (step === 2 && !canGoNextFrom2) return
    if (step === 3 && !canGoNextFrom3) return
    setStep((s) => (s < 4 ? ((s + 1) as 2 | 3 | 4) : s))
  }

  function goToPrev() {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
  }

  const baseInput =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50'

  return (
    <div className="w-full px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-6 md:p-7 min-h-[calc(100vh-6rem)] sm:min-h-0">
        {/* Header / Welcome */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Deine Website in wenigen Minuten ✨
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            In <span className="font-medium">2–3 Minuten</span> ist deine
            Handwerker-Website online. Folge einfach den Schritten.
          </p>
          <p className="text-xs text-slate-600 sm:text-sm">
            <span className="font-medium">Keine Extrakosten</span> – die
            Veröffentlichung ist in deinem Paket enthalten.
          </p>
        </div>

        {/* Stepper */}
        <div className="-mx-1 overflow-x-auto pb-1">
          <ol className="flex min-w-full items-center justify-between gap-2 px-1 text-xs sm:text-sm">
            {steps.map((s, index) => {
              const isActive = s.id === step
              const isDone = s.id < step
              const isClickable = s.id < step // nur zurückspringen
              return (
                <li
                  key={s.id}
                  className="flex flex-1 items-center gap-2 sm:gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isClickable) setStep(s.id)
                    }}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                        isActive || isDone
                          ? 'bg-white/20'
                          : 'bg-slate-100 text-slate-700',
                      ].join(' ')}
                    >
                      {isDone ? '✓' : s.id}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="hidden flex-1 border-t border-dashed border-slate-200 sm:block" />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        {/* Card Body */}
        <div className="mt-1 flex-1 rounded-2xl border border-slate-100 bg-white/95 px-3 py-4 text-sm text-slate-800 shadow-inner sm:px-4 sm:py-5 md:px-5">
          {/* Step-Label oben */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {step === 1 && 'Schritt 1 · Wunsch-Slug'}
              {step === 2 && 'Schritt 2 · Stammdaten'}
              {step === 3 && 'Schritt 3 · Ansprechpartner'}
              {step === 4 && 'Schritt 4 · Zusammenfassung'}
            </div>
            <div className="text-xs text-slate-500">
              {step} / {steps.length}
            </div>
          </div>

          {/* Inhalt pro Step */}
          <div className="space-y-5">
            {step === 1 && (
              <>
                <p className="text-sm text-slate-700">
                  Wähle den <span className="font-medium">Slug</span> (Teil der URL)
                  für deine Website.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Wunsch-Slug
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <input
                        value={inputSlug}
                        onChange={(e) => {
                          setInputSlug(e.target.value)
                          setSlugFree(null)
                          setSlugMsg('')
                        }}
                        placeholder="z. B. musterfliese"
                        className={baseInput}
                      />
                      {inputSlug && cleanSlug !== inputSlug && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          Wird intern gespeichert als:{' '}
                          <code className="rounded bg-slate-100 px-1 py-0.5">
                            {cleanSlug}
                          </code>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:w-40">
                      <span
                        className={[
                          'inline-flex w-full items-center justify-center rounded-lg border px-2 py-1.5 text-[11px] font-medium',
                          slugFree === true
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : slugFree === false
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600',
                        ].join(' ')}
                      >
                        {slugFree === true
                          ? 'Verfügbar'
                          : slugFree === false
                          ? 'Belegt'
                          : 'Wird geprüft…'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-500">
                    Deine URL wird ungefähr so aussehen:{' '}
                    <code className="rounded bg-slate-100 px-1 py-0.5">
                      deine-domain.de/{cleanSlug || 'mein-betrieb'}
                    </code>
                  </div>

                  {slugMsg && (
                    <div className="mt-1 text-[11px] text-slate-600">
                      {slugMsg}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-slate-700">
                  Diese Daten nutzen wir für die Website-Texte und den Kontaktbereich.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Firmenname
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.company_name}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          company_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Vorname
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.first_name}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          first_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Nachname
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.last_name}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          last_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Straße
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.street}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          street: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Nr.
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.house_number}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          house_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      PLZ
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.postal_code}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          postal_code: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Stadt
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.city}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Land
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.country}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          country: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      E-Mail für Website
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.email}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Telefon
                    </label>
                    <input
                      className={baseInput}
                      value={prefill.phone}
                      onChange={(e) =>
                        setPrefill((p) => ({
                          ...p,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-slate-700">
                  Wer ist die verantwortliche Person für Impressum & Kontakt?
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      className={baseInput}
                      value={responsible.name}
                      onChange={(e) =>
                        setResponsible((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      E-Mail
                    </label>
                    <input
                      className={baseInput}
                      value={responsible.email}
                      onChange={(e) =>
                        setResponsible((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Telefon
                    </label>
                    <input
                      className={baseInput}
                      value={responsible.phone}
                      onChange={(e) =>
                        setResponsible((p) => ({
                          ...p,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                {!working ? (
                  <>
                    <p className="text-sm text-slate-700">
                      Prüfe kurz die Angaben. Du kannst später alles im Editor anpassen.
                    </p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:text-sm">
                      <div className="mb-2 font-semibold text-slate-800">
                        Zusammenfassung
                      </div>
                      <ul className="space-y-1 text-slate-700">
                        <li>
                          <span className="font-medium">Slug:</span>{' '}
                          {cleanSlug || '—'}
                        </li>
                        <li>
                          <span className="font-medium">Firma:</span>{' '}
                          {prefill.company_name || '—'}
                        </li>
                        <li>
                          <span className="font-medium">Adresse:</span>{' '}
                          {[
                            prefill.street,
                            prefill.house_number,
                            prefill.postal_code,
                            prefill.city,
                            prefill.country,
                          ]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </li>
                        <li>
                          <span className="font-medium">Kontakt:</span>{' '}
                          {(prefill.email || '—') +
                            ' · ' +
                            (prefill.phone || '—')}
                        </li>
                        <li>
                          <span className="font-medium">Ansprechpartner:</span>{' '}
                          {responsible.name || '—'}
                          {(responsible.email || responsible.phone) && (
                            <>
                              {' '}
                              (
                              {responsible.email || '—'} ·{' '}
                              {responsible.phone || '—'})
                            </>
                          )}
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center py-6 sm:py-10">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                      <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
                    </div>
                    <div className="mt-4 text-sm text-slate-700 sm:text-base">
                      Deine Website wird erstellt…
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer / Navigation */}
        {!working && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goToPrev}
              disabled={step === 1}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Zurück
            </button>

            {step < 4 && (
              <button
                type="button"
                onClick={goToNext}
                disabled={
                  (step === 1 && !canGoNextFrom1) ||
                  (step === 2 && !canGoNextFrom2) ||
                  (step === 3 && !canGoNextFrom3)
                }
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Weiter
              </button>
            )}

            {step === 4 && !working && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={!cleanSlug || slugFree === false}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Website jetzt erstellen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
