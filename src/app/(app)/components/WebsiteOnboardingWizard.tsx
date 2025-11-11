'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import type { WebsiteContent } from '@/types/website'

type WizardProps = { scoped?: boolean } // wird ignoriert, nur für Abwärtskompat.

const defaultContent: WebsiteContent = {
  order: ['hero','services','benefits','faq','contact'],
  enabled: { hero:true, services:true, benefits:true, gallery:false, testimonials:false, faq:true, contact:true },
  hero: { h1:'Fliesenleger Meisterbetrieb', sub:'Sauber. Pünktlich. Fair.', cta_label:'Angebot anfragen', cta_href:'#kontakt' },
  services: { title:'Leistungen', items: [
    { title:'Badsanierung', text:'Komplett aus einer Hand' },
    { title:'Großformate', text:'Perfekte Fugenbilder' },
    { title:'Balkon abdichten', text:'Langlebig & sicher' },
  ]},
  benefits: { title:'Warum wir', items: [
    { title:'Festpreis', text:'Transparente Angebote' },
    { title:'Termintreu', text:'Wir kommen wie vereinbart' },
    { title:'Staubarm', text:'Saubere Baustelle' },
  ]},
  gallery: { title:'Referenzen', items: [] },
  testimonials: { title:'Kundenstimmen', items: [] },
  faq: { title:'Fragen & Antworten', items: [{ q:'Wie schnell?', a:'In 2–3 Wochen.' }]},
  contact: { title:'Kontakt', phone:'', email:'', address:'', opening:'Mo–Fr 9–17 Uhr', form:true }
}

/* Debounce */
function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
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
  const [step, setStep] = useState<1|2|3|4>(1)
  const [working, setWorking] = useState(false)

  // getrennte States für Eingabe (raw) vs. bereinigt
  const [inputSlug, setInputSlug] = useState('')
  const cleanSlug = useMemo(() => sanitizeSlug(inputSlug), [inputSlug])
  const debouncedClean = useDebounced(cleanSlug, 300)
  const [slugFree, setSlugFree] = useState<boolean | null>(null)
  const [slugMsg, setSlugMsg] = useState('')

  const [prefill, setPrefill] = useState<Prefill>({
    company_name:'', first_name:'', last_name:'',
    street:'', house_number:'', postal_code:'', city:'', country:'',
    email:'', phone:''
  })
  const [responsible, setResponsible] = useState({ name:'', email:'', phone:'' })

  const router = useRouter()
  const supabase = useMemo(() => supabaseClient(), [])

  /* 1) Falls schon Website existiert -> Seite nicht zeigen */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) { setChecking(false); setShouldOpen(false); return }

      const { data } = await supabase
        .from('websites')
        .select('id')
        .eq('user_id', auth.user.id)
        .limit(1)
        .maybeSingle()

      setShouldOpen(!data) // nur öffnen, wenn keine existiert
      setChecking(false)

      // Prefills laden
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, first_name, last_name, email, street, house_number, postal_code, city, country')
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
    (async () => {
      if (!debouncedClean) { setSlugFree(null); setSlugMsg(''); return }
      const { count, error } = await supabase
        .from('websites')
        .select('id', { count: 'exact', head: true })
        .eq('slug', debouncedClean)
      if (error) { console.error(error); setSlugFree(null); setSlugMsg(''); return }
      if ((count ?? 0) > 0) { setSlugFree(false); setSlugMsg('Slug ist bereits vergeben.'); }
      else { setSlugFree(true); setSlugMsg('Slug ist verfügbar.'); }
    })()
  }, [debouncedClean, supabase])

  /* 3) Website anlegen */
  async function handleCreate() {
    setWorking(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) throw new Error('Nicht eingeloggt')
      if (!cleanSlug) throw new Error('Bitte einen gültigen Slug eingeben.')

      const { data: ensured } = await supabase.rpc('ensure_unique_slug', { base: cleanSlug })
      const finalSlug = ensured || cleanSlug

      const contactAddress = [
        prefill.street, prefill.house_number, prefill.postal_code, prefill.city, prefill.country
      ].filter(Boolean).join(' ')

      const content: WebsiteContent = {
        ...defaultContent,
        // optionales Intro für "Warum wir"
        benefits: {
          ...defaultContent.benefits,
          // @ts-ignore – intro ist optional, nicht in allen Typen vorhanden
          intro: 'Wir verbinden präzises Handwerk mit fairer, transparenter Kommunikation.',
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
        }
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
        content
      })
      if (error) throw error

      // 5 Sekunden "wird erstellt…" anzeigen, dann zur Editor-Page
      await new Promise(r => setTimeout(r, 5000))
      router.push('/dashboard/website')
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Erstellung fehlgeschlagen.')
      setWorking(false)
    }
  }

  // Wenn nicht nötig, nichts rendern (Editier-Seite übernimmt)
  if (checking || !shouldOpen) return null

  return (
    <div className="px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header / Welcome */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold">Willkommen! 🎉</h1>
          <p className="mt-2 text-slate-700">
            In <b>2–3 Minuten</b> ist deine Handwerker-Website startklar. Folge einfach den Schritten unten.
          </p>
          <p className="mt-1 text-slate-700">
            <b>Keine Extrakosten</b> – die Erstellung und Veröffentlichung sind in deinem Paket bereits enthalten.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Kopf */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center">
            <div className="font-semibold">
              {step === 1 && 'Wunsch-Slug'}
              {step === 2 && 'Stammdaten'}
              {step === 3 && 'Verantwortliche Person'}
              {step === 4 && 'Erstellen'}
            </div>
            <div className="ml-auto text-sm text-slate-600">Schritt {step} / 4</div>
          </div>

          {/* Body */}
          <div className="px-5 py-5">
            {step === 1 && (
              <div className="space-y-5">
                <p className="text-slate-700">
                  Wähle den eindeutigen <b>Slug</b> (Teil der URL) für deine Seite.
                </p>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Wunsch-Slug</label>
                  <div className="flex gap-2">
                    <input
                      value={inputSlug}
                      onChange={e => { setInputSlug(e.target.value); setSlugFree(null); setSlugMsg(''); }}
                      placeholder="z. B. musterfliese"
                      className="flex-1 rounded-md border px-3 py-2 bg-white"
                    />
                    <span
                      className={
                        'select-none px-2 py-2 rounded-md text-sm ' +
                        (slugFree === true
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : slugFree === false
                          ? 'text-rose-700 bg-rose-50 border border-rose-200'
                          : 'text-slate-600 bg-slate-50 border border-slate-200')
                      }
                    >
                      {slugFree === true ? 'Verfügbar' : slugFree === false ? 'Belegt' : '—'}
                    </span>
                  </div>
                  {inputSlug && cleanSlug !== inputSlug && (
                    <div className="text-xs mt-1 text-slate-500">
                      Wird gespeichert als: <code>{cleanSlug}</code>
                    </div>
                  )}
                  {slugMsg && <div className="text-xs mt-1 text-slate-600">{slugMsg}</div>}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!cleanSlug || slugFree === false}
                    className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Firmenname</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.company_name}
                      onChange={e=>setPrefill(p=>({ ...p, company_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Vorname</label>
                      <input className="w-full rounded-md border px-3 py-2 bg-white"
                        value={prefill.first_name}
                        onChange={e=>setPrefill(p=>({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Nachname</label>
                      <input className="w-full rounded-md border px-3 py-2 bg-white"
                        value={prefill.last_name}
                        onChange={e=>setPrefill(p=>({ ...p, last_name: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Straße</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.street}
                      onChange={e=>setPrefill(p=>({ ...p, street: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Nr.</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.house_number}
                      onChange={e=>setPrefill(p=>({ ...p, house_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">PLZ</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.postal_code}
                      onChange={e=>setPrefill(p=>({ ...p, postal_code: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Stadt</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.city}
                      onChange={e=>setPrefill(p=>({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm text-slate-600 mb-1">Land</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.country}
                      onChange={e=>setPrefill(p=>({ ...p, country: e.target.value }))} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">E-Mail für Website</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.email}
                      onChange={e=>setPrefill(p=>({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Telefon</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={prefill.phone}
                      onChange={e=>setPrefill(p=>({ ...p, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={()=>setStep(1)} className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50">Zurück</button>
                  <button onClick={()=>setStep(3)} className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50">Weiter</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-slate-700">Ansprechpartner (für Impressum / Kontakt):</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Name</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={responsible.name}
                      onChange={e=>setResponsible(p=>({ ...p, name: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">E-Mail</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={responsible.email}
                      onChange={e=>setResponsible(p=>({ ...p, email: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Telefon</label>
                    <input className="w-full rounded-md border px-3 py-2 bg-white"
                      value={responsible.phone}
                      onChange={e=>setResponsible(p=>({ ...p, phone: e.target.value }))}/>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={()=>setStep(2)} className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50">Zurück</button>
                  <button onClick={()=>setStep(4)} className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50">Weiter</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                {!working ? (
                  <>
                    <div className="rounded-lg border bg-white p-4">
                      <div className="font-medium mb-2">Zusammenfassung</div>
                      <ul className="text-sm text-slate-700 space-y-1">
                        <li><b>Slug:</b> {cleanSlug || '—'}</li>
                        <li><b>Firma:</b> {prefill.company_name || '—'}</li>
                        <li><b>Adresse:</b> {[prefill.street, prefill.house_number, prefill.postal_code, prefill.city, prefill.country].filter(Boolean).join(' ') || '—'}</li>
                        <li><b>Kontakt:</b> {(prefill.email || '—') + ' · ' + (prefill.phone || '—')}</li>
                        <li><b>Ansprechpartner:</b> {responsible.name || '—'}{(responsible.email || responsible.phone) ? ` (${responsible.email || '—'} · ${responsible.phone || '—'})` : ''}</li>
                      </ul>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={()=>setStep(3)} className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50">Zurück</button>
                      <button
                        onClick={handleCreate}
                        disabled={!cleanSlug || slugFree === false}
                        className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
                      >
                        Website erstellen
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center py-8">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-[var(--brand,#0a1b40)] border-t-transparent animate-spin"></div>
                    </div>
                    <div className="mt-4 text-slate-700">Deine Website wird erstellt…</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer spacing */}
        <div className="h-10" />
      </div>
    </div>
  )
}
