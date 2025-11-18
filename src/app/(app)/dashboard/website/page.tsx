'use client'

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import type { WebsiteContent } from '@/types/website'
import WebsiteOnboardingWizard from '@/app/(app)/components/WebsiteOnboardingWizard'

type WebsiteRow = {
  id: string
  slug: string
  title: string | null
  description: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
  favicon_url: string | null
  content: WebsiteContent | null
  imprint_html: string | null
  privacy_html: string | null
  status: 'draft' | 'published' | 'disabled'
  published_at?: string | null
  domain_requested?: boolean | null 
}

/* ---- Defaults ---- */
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
    // @ts-ignore – intro optional
    intro: '',
    phone: '',
    email: '',
    address: '',
    opening: 'Mo–Fr 9–17 Uhr',
    form: true,
    recipient: '',
  },
}

/* Limits */
const LIM = {
  heroH1: 40,
  heroSub: 300,
  benefitsIntro: 350,
  serviceText: 150,
  benefitText: 150,
  faqQ: 125,
  faqA: 500,
  contactIntro: 300,
}

/* Helpers */
const clamp = (s: string, n: number) => (s ?? '').slice(0, Math.max(0, n))

const withHero = (
  base: WebsiteContent,
  patch: Partial<WebsiteContent['hero']>
) => {
  const b = base.hero || defaultContent.hero
  return {
    h1: patch.h1 ?? b.h1,
    sub: patch.sub ?? b.sub,
    cta_label: patch.cta_label ?? b.cta_label,
    cta_href: patch.cta_href ?? b.cta_href,
    image: patch.image ?? (b as any).image,
  }
}

const withContact = (
  base: WebsiteContent,
  patch: Partial<WebsiteContent['contact']>
) => {
  const b: any = base.contact || (defaultContent.contact as any)
  return {
    ...b,
    title: (patch as any).title ?? b.title ?? 'Kontakt',
    intro: (patch as any).intro ?? b.intro ?? '',
    phone: (patch as any).phone ?? b.phone,
    email: (patch as any).email ?? b.email,
    address: (patch as any).address ?? b.address,
    opening: (patch as any).opening ?? b.opening,
    form: (patch as any).form ?? b.form,
    recipient:
      (patch as any).recipient ??
      b.recipient ??
      '',
  } as any
}

function getContent(row: WebsiteRow | null): WebsiteContent {
  const c = (row?.content as any) || defaultContent

  const benefitItems = Array.isArray(c.benefits?.items)
    ? [...c.benefits.items]
    : []
  while (benefitItems.length < 3)
    benefitItems.push({ title: '', text: '' })
  if (benefitItems.length > 3)
    benefitItems.length = 3

  const faq = c.faq || defaultContent.faq
  const faqItems = Array.isArray(faq.items)
    ? [...faq.items]
    : []

  return {
    ...defaultContent,
    ...c,
    benefits: {
      ...(c.benefits || defaultContent.benefits),
      // @ts-ignore
      intro:
        (c.benefits &&
          (c.benefits as any).intro) ||
        '',
      items: benefitItems,
    } as any,
    faq: {
      ...(faq || {}),
      title:
        faq.title ||
        defaultContent.faq.title,
      items: faqItems,
    },
    contact: {
      ...(c.contact ||
        (defaultContent.contact as any)),
      intro:
        (c.contact &&
          (c.contact as any).intro) ||
        '',
    } as any,
  }
}

/* Counter UI */
const Counter = ({
  value,
  max,
}: {
  value: string
  max: number
}) => (
  <div
    className={`text-xs mt-1 ${
      value.length > max
        ? 'text-rose-600'
        : 'text-slate-500'
    }`}
  >
    {Math.min(value.length, max)}/{max}
  </div>
)

/* Icons */
const Icon = {
  Save: () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h8l4 4v7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16h10M7 7h6v4H7z"
      />
    </svg>
  ),
  Eye: () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Link: () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L10 5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 11a5 5 0 01-7.07 0L5.5 9.57a5 5 0 117.07-7.07L14 5"
      />
    </svg>
  ),
  Warning: () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.72 3h16.92a2 2 0 001.72-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  ),
  Dot: () => (
    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
  ),
  Robot: () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 7V4h6v3" />
      <rect
        x="4"
        y="7"
        width="16"
        height="13"
        rx="2"
      />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 16h8" />
    </svg>
  ),
}

/* ---- Rechtliche Felder ---- */
type ImprintFields = {
  companyName: string
  legalForm: string
  street: string
  zipCity: string
  country: string
  managingDirector: string
  registerCourt?: string
  registerNumber?: string
  vatId?: string
  phone?: string
  email?: string
  website?: string
  supervisoryAuthority?: string
  chamber?: string
  smallBusiness: boolean
  heroAttribution_desc?: string
  heroAttribution_url?: string
  heroAttribution_license?: string
}
type PrivacyFields = {
  controllerName: string
  controllerAddress: string
  controllerEmail: string
  controllerPhone?: string
  website?: string
  newsletter?: boolean
  contactForm?: boolean
  retentionNote?: string
  dpoFirstName?: string
  dpoLastName?: string
  dpoEmail?: string
  dpoPhone?: string
  partnerContactName?: string
  partnerContactEmail?: string
  partnerContactPhone?: string
}

/* HTML Helpers */
const esc = (s?: string) =>
  (s ?? '').replace(
    /[&<>"']/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[m] as string)
  )

function buildImprintHTML(f: ImprintFields) {
  const koRegel = f.smallBusiness
    ? `<p>Hinweis nach § 19 UStG (Kleinunternehmerregelung): Es wird keine Umsatzsteuer ausgewiesen.</p>`
    : f.vatId
    ? `<p>Umsatzsteuer-ID: ${esc(f.vatId)}</p>`
    : `<p>Umsatzsteuer-ID: —</p>`

  const heroBlock =
    f.heroAttribution_desc ||
    f.heroAttribution_url ||
    f.heroAttribution_license
      ? `<h2>Urheberrecht – Hero-Bild</h2>
  <p>${esc(f.heroAttribution_desc || '')}${
          f.heroAttribution_url
            ? ` – <a href="${esc(
                f.heroAttribution_url
              )}" rel="nofollow">Quelle</a>`
            : ''
        }${
          f.heroAttribution_license
            ? ` – Lizenz: ${esc(
                f.heroAttribution_license
              )}`
            : ''
        }</p>`
      : ''

  const supervisory = f.supervisoryAuthority
    ? `<p>Aufsichtsbehörde: ${esc(f.supervisoryAuthority)}</p>`
    : ''
  const chamber = f.chamber
    ? `<p>Zuständige Kammer: ${esc(f.chamber)}</p>`
    : ''

  return `
<section>
  <h1>Impressum</h1>
  <p><strong>${esc(f.companyName)}${
    f.legalForm
      ? ' ' + esc(f.legalForm)
      : ''
  }</strong></p>
  <p>${esc(f.street)}<br>${esc(
    f.zipCity
  )}<br>${esc(f.country)}</p>
  ${
    f.managingDirector
      ? `<p>Vertreten durch: ${esc(
          f.managingDirector
        )}</p>`
      : ''
  }
  ${
    f.registerCourt || f.registerNumber
      ? `<p>Handelsregister: ${esc(
          f.registerCourt
        )} – Nr. ${esc(
          f.registerNumber
        )}</p>`
      : ''
  }
  ${koRegel}
  ${
    f.phone
      ? `<p>Telefon: ${esc(
          f.phone
        )}</p>`
      : ''
  }
  ${
    f.email
      ? `<p>E-Mail: <a href="mailto:${esc(
          f.email
        )}">${esc(
          f.email
        )}</a></p>`
      : ''
  }
  ${
    f.website
      ? `<p>Web: <a href="${esc(
          f.website
        )}" rel="nofollow">${esc(
          f.website
        )}</a></p>`
      : ''
  }
  ${supervisory}
  ${chamber}

  <p>Inhaltlich Verantwortlicher gemäß § 18 Abs. 2 MStV: ${esc(
    f.managingDirector || f.companyName
  )}</p>
  <p>Haftung für Inhalte: Trotz sorgfältiger Kontrolle übernehmen wir keine Haftung für Inhalte externer Links. Für den Inhalt verlinkter Seiten sind ausschließlich deren Betreiber verantwortlich.</p>

  ${heroBlock}
</section>`.trim()
}

function buildPrivacyHTML(p: PrivacyFields) {
  const newsletterBlock = p.newsletter
    ? `
  <h2>Newsletter</h2>
  <p>Bei Anmeldung verarbeiten wir Ihre E-Mail-Adresse zur Zustellung. Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Widerruf jederzeit möglich.</p>`
    : ''

  const dpoLine =
    p.dpoFirstName ||
    p.dpoLastName ||
    p.dpoEmail ||
    p.dpoPhone
      ? `<h2>Datenschutzbeauftragter</h2>
  <p>${esc(
    [p.dpoFirstName, p.dpoLastName]
      .filter(Boolean)
      .join(' ') || ''
  )}${
          p.dpoEmail
            ? `<br>E-Mail: <a href="mailto:${esc(
                p.dpoEmail
              )}">${esc(
                p.dpoEmail
              )}</a>`
            : ''
        }${
          p.dpoPhone
            ? `<br>Telefon: ${esc(
                p.dpoPhone
              )}`
            : ''
        }</p>`
      : ''

  const deletionBlock = `
  <h2>Speicherdauer & Löschung</h2>
  <p>Personenbezogene Daten werden <strong>dauerhaft</strong> gespeichert. Eine Löschung erfolgt auf Anfrage über einen verifizierten Partner. Bitte wenden Sie sich an: ${esc(
    p.partnerContactName || ''
  )}${
    p.partnerContactEmail
      ? `, <a href="mailto:${esc(
          p.partnerContactEmail
        )}">${esc(
          p.partnerContactEmail
        )}</a>`
      : ''
  }${
    p.partnerContactPhone
      ? `, Tel. ${esc(
          p.partnerContactPhone
        )}`
      : ''
  }.</p>`

  return `
<section>
  <h1>Datenschutzerklärung</h1>
  <p>Diese Hinweise informieren Sie über die Verarbeitung Ihrer personenbezogenen Daten beim Besuch unserer Website ${esc(
    p.website || ''
  )}.</p>

  <h2>Verantwortlicher</h2>
  <p>${esc(
    p.controllerName
  )}<br>${esc(
    p.controllerAddress
  )}<br>E-Mail: <a href="mailto:${esc(
    p.controllerEmail
  )}">${esc(
    p.controllerEmail
  )}</a>${
    p.controllerPhone
      ? `<br>Telefon: ${esc(
          p.controllerPhone
        )}`
      : ''
  }</p>

  ${dpoLine}

  <h2>Hosting</h2>
  <p>Bereitstellung über Vercel (Region Frankfurt, DE) und Supabase (Amazon Web Services, Region Frankfurt, DE). Beim Aufruf werden Server-Logfiles (IP-Adresse, Zeitpunkt, User Agent) verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (technische Bereitstellung, Sicherheit).</p>

  <h2>Cookies & Einwilligung</h2>
  <p>Wir verwenden technisch erforderliche Cookies. Für optionale Dienste holen wir Ihre Einwilligung über ein Consent-Banner ein (Art. 6 Abs. 1 lit. a DSGVO).</p>

  ${newsletterBlock}

  <h2>Ihre Rechte</h2>
  <p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde.</p>

  ${deletionBlock}

  <h2>Stand</h2>
  <p>${new Date().toLocaleDateString(
    'de-DE'
  )}</p>
</section>`.trim()
}

/* ---------- Reusable Modal + Loader ---------- */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-white/60 bg-white/80 hover:bg-white"
            >
              Schließen
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function GeneratingBlock({
  label,
}: {
  label: string
}) {
  return (
    <div className="mt-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
        <div className="text-slate-800">
          {label}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200/70 overflow-hidden">
        <div className="h-full w-0 bg-slate-900/80 animate-[grow_3s_linear_forwards]" />
      </div>
      <style>{`@keyframes grow { to { width: 100%; } }`}</style>
    </div>
  )
}

/* ---------------- Component ---------------- */
export default function WebsitePage() {
  const supabase = useRef(supabaseClient()).current

  const [row, setRow] = useState<WebsiteRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [origin, setOrigin] = useState('')

   // NEU: CTA-State
  const [domainRequestLoading, setDomainRequestLoading] = useState(false)
  const [domainRequestError, setDomainRequestError] = useState<string | null>(null)

  // KI/Generator Felder
  const [imprint, setImprint] = useState<ImprintFields | null>(null)
  const [privacy, setPrivacy] = useState<PrivacyFields | null>(null)

  // Modal States
  const [showImprintModal, setShowImprintModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [imprintDraft, setImprintDraft] = useState<ImprintFields | null>(null)
  const [privacyDraft, setPrivacyDraft] = useState<PrivacyFields | null>(null)
  const [isGenerating, setIsGenerating] =
    useState<null | 'imprint' | 'privacy'>(null)

  // Refs für Realtime/Polling
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pollRef = useRef<number | null>(null)

  // Origin nur clientseitig
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const content = useMemo(() => getContent(row), [row])

  /* ------ Default-Erzeuger für Modals ------ */
  const defaultImprint = useCallback((): ImprintFields => ({
    companyName: row?.title || 'Ihr Unternehmen',
    legalForm: '',
    street: '',
    zipCity: '',
    country: 'Deutschland',
    managingDirector: '',
    registerCourt: '',
    registerNumber: '',
    vatId: '',
    phone: content.contact?.phone || '',
    email: content.contact?.email || '',
    website: origin && row?.slug ? `${origin}/w/${row.slug}` : '',
    supervisoryAuthority: '',
    chamber: '',
    smallBusiness: true,
    heroAttribution_desc: '',
    heroAttribution_url: '',
    heroAttribution_license: '',
  }), [row, content, origin])

  const defaultPrivacy = useCallback((): PrivacyFields => ({
    controllerName: row?.title || 'Ihr Unternehmen',
    controllerAddress: content.contact?.address || '',
    controllerEmail: content.contact?.email || '',
    controllerPhone: content.contact?.phone || '',
    website: origin && row?.slug ? `${origin}/w/${row.slug}` : '',
    newsletter: false,
    contactForm: true,
    retentionNote:
      'Daten werden dauerhaft gespeichert und nur auf Anfrage über einen verifizierten Partner gelöscht.',
    partnerContactName: '',
    partnerContactEmail: content.contact?.email || '',
    partnerContactPhone: content.contact?.phone || '',
    dpoFirstName: '',
    dpoLastName: '',
    dpoEmail: '',
    dpoPhone: '',
  }), [row, content, origin])

   /* ------ Website Laden ------ */
  const fetchWebsite = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('websites')
      .select(
        'id, slug, title, description, primary_color, secondary_color, logo_url, favicon_url, content, imprint_html, privacy_html, status, published_at, domain_requested'
      )
      .eq('user_id', auth.user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(error)
    }

    if (data) {
      const withContent: WebsiteRow = {
        ...(data as any),
        content: (data.content as any) || defaultContent,
      }

      setRow(withContent)

      // Onboarding Prefill
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'company_name, first_name, last_name, email, street, house_number, postal_code, city, country, dpo_first_name, dpo_last_name, dpo_email, dpo_phone'
        )
        .eq('id', auth.user.id)
        .maybeSingle()

      const { data: billing } = await supabase
        .from('billing_settings')
        .select('billing_phone, billing_email')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      const c = getContent(withContent)

      const addr = c.contact?.address || ''
      const addressLines = addr ? addr.split('\n') : []
      const streetFromContent = addressLines[0] || ''
      const zipCityFromContent = (addressLines.slice(1).join(' ') || '').trim()

      const company =
        profile?.company_name || withContent.title || 'Ihr Unternehmen'
      const streetFull = [profile?.street, profile?.house_number]
        .filter(Boolean)
        .join(' ')
        .trim()
      const zipCity = [profile?.postal_code, profile?.city]
        .filter(Boolean)
        .join(' ')
        .trim()
      const country = profile?.country || 'Deutschland'
      const emailPublic =
        billing?.billing_email || profile?.email || c.contact?.email || ''
      const phonePublic =
        billing?.billing_phone || c.contact?.phone || ''

      const websiteFull =
        origin && withContent.slug ? `${origin}/w/${withContent.slug}` : ''

      setImprint((prev) => ({
        companyName: company,
        legalForm: prev?.legalForm || '',
        street: streetFull || streetFromContent,
        zipCity: zipCity || zipCityFromContent,
        country,
        managingDirector:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          prev?.managingDirector ||
          '',
        registerCourt: prev?.registerCourt || '',
        registerNumber: prev?.registerNumber || '',
        vatId: prev?.vatId || '',
        phone: phonePublic,
        email: emailPublic,
        website: websiteFull || prev?.website || '',
        supervisoryAuthority: prev?.supervisoryAuthority || '',
        chamber: prev?.chamber || '',
        smallBusiness: prev?.smallBusiness ?? true,
        heroAttribution_desc: prev?.heroAttribution_desc || '',
        heroAttribution_url: prev?.heroAttribution_url || '',
        heroAttribution_license: prev?.heroAttribution_license || '',
      }))

      setPrivacy((prev) => ({
        controllerName: company,
        controllerAddress:
          [streetFull || streetFromContent, zipCity || zipCityFromContent, country]
            .filter(Boolean)
            .join('\n'),
        controllerEmail: emailPublic,
        controllerPhone: phonePublic,
        website: websiteFull || prev?.website || '',
        newsletter: prev?.newsletter ?? false,
        contactForm: prev?.contactForm ?? true,
        retentionNote:
          'Daten werden dauerhaft gespeichert und nur auf Anfrage über einen verifizierten Partner gelöscht.',
        partnerContactName:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          '',
        partnerContactEmail: emailPublic || '',
        partnerContactPhone: phonePublic || '',
        dpoFirstName: profile?.dpo_first_name || prev?.dpoFirstName || '',
        dpoLastName: profile?.dpo_last_name || prev?.dpoLastName || '',
        dpoEmail: profile?.dpo_email || prev?.dpoEmail || '',
        dpoPhone: profile?.dpo_phone || prev?.dpoPhone || '',
      }))
    } else {
      setRow(null)
    }

    setLoading(false)
  }, [supabase, origin])


  /* ------ Init + Realtime + Polling ------ */
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (cancelled) return

      await fetchWebsite()

      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) return

      const filter = `user_id=eq.${auth.user.id}`

      const ch = supabase
        .channel('websites-watch')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'websites',
            filter,
          },
          () => fetchWebsite()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'websites',
            filter,
          },
          () => fetchWebsite()
        )
        .subscribe()

      subRef.current = ch

      // Fallback-Polling
      if (!pollRef.current) {
        pollRef.current = window.setInterval(
          () => fetchWebsite(),
          3000
        )
      }
    })()

    return () => {
      cancelled = true
      if (subRef.current) {
        supabase.removeChannel(subRef.current)
        subRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [fetchWebsite, supabase])

  // Polling stoppen sobald Website da ist
  useEffect(() => {
    if (row && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [row])

  /* ------ Mutations ------ */
  const save = useCallback(async () => {
    if (!row) return
    setSaving(true)
    const { id, ...rest } = row
    const { error } = await supabase
      .from('websites')
      .update(rest)
      .eq('id', id)
    if (error) console.error(error)
    setSaving(false)
  }, [row, supabase])

  const setDraft = useCallback(async () => {
    if (!row) return
    const { error } = await supabase
      .from('websites')
      .update({ status: 'draft' })
      .eq('id', row.id)
    if (!error) {
      setRow({ ...row, status: 'draft' })
    }
  }, [row, supabase])

  const publish = useCallback(async () => {
    if (!row) return
    if (!row.imprint_html || !row.privacy_html) {
      alert(
        'Bitte Impressum und Datenschutzerklärung ausfüllen oder per „KI generieren“ erstellen. Veröffentlichung ist erst dann möglich.'
      )
      await setDraft()
      return
    }
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('websites')
      .update({
        status: 'published',
        published_at: now,
      })
      .eq('id', row.id)
    if (!error) {
      setRow({
        ...row,
        status: 'published',
        published_at: now,
      })
    }
  }, [row, supabase, setDraft])

  const disable = useCallback(async () => {
    if (!row) return
    const { error } = await supabase
      .from('websites')
      .update({ status: 'disabled' })
      .eq('id', row.id)
    if (!error) {
      setRow({ ...row, status: 'disabled' })
    }
  }, [row, supabase])

  const uploadToBucket = useCallback(
    async (
      file: File,
      kind: 'logo' | 'favicon' | 'hero' | 'gallery'
    ) => {
      if (!row) return null
      const { data: auth } =
        await supabase.auth.getUser()
      if (!auth?.user) return null

      const ext =
        file.name.split('.').pop()?.toLowerCase() ||
        'png'
      const filename = `${kind}-${Date.now()}.${ext}`
      const path = `website/${auth.user.id}/${row.id}/${filename}`

      const { error } =
        await supabase.storage
          .from('website')
          .upload(path, file, {
            upsert: true,
            cacheControl: '3600',
          })

      if (error) {
        alert(error.message)
        return null
      }

      const { data: pub } =
        await supabase.storage
          .from('website')
          .getPublicUrl(path)
      return pub.publicUrl
    },
    [row, supabase]
  )

    const handleDomainRequest = useCallback(async () => {
    setDomainRequestError(null)
    setDomainRequestLoading(true)
    try {
      const res = await fetch('/api/website/domain-request', {
        method: 'POST',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Fehler bei der Anfrage.')
      }

      // Flag lokal setzen → CTA verschwindet sofort
      setRow((prev) =>
        prev ? { ...prev, domain_requested: true } : prev
      )
    } catch (err) {
      console.error(err)
      setDomainRequestError(
        'Leider ist ein Fehler aufgetreten. Bitte versuche es später erneut.'
      )
    } finally {
      setDomainRequestLoading(false)
    }
  }, [])


  /* UI Classes */
  const inputCls =
    'w-full rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40'
  const textareaLg = `${inputCls} h-40`
  const textareaMd = `${inputCls} h-32`
  const sectionCard =
    'rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-sm'
  const actionBtn =
    'inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-4 py-2.5 text-slate-900 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-sky-400/40'
  const pill =
    'inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 backdrop-blur-md px-3 py-1 text-xs text-slate-700'

  /* ------ Loading / Onboarding ------ */
  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.06),transparent_60%)]">
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl px-5 py-3 shadow-sm flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
          <span className="text-slate-700">
            Lade…
          </span>
        </div>
      </div>
    )
  }

  if (!row) {
    return (
      <div className="p-6">
        <WebsiteOnboardingWizard />
      </div>
    )
  }

  const publicUrl = `/w/${row.slug}`

  /* ------ Render ------ */
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.06),transparent_60%)]">
      {/* Toolbar */}
      <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="w-full px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="font-semibold text-slate-800">
            Website bearbeiten
          </div>

          <span className={pill}>
            {row.status ===
              'published' && <Icon.Dot />}
            {row.status ===
              'disabled' && (
              <Icon.Warning />
            )}
            {row.status === 'draft' && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
            <span>
              Status:{' '}
              {row.status ===
              'published'
                ? 'Live'
                : row.status === 'draft'
                ? 'Entwurf'
                : 'Deaktiviert'}
            </span>
          </span>

          {(!row.imprint_html ||
            !row.privacy_html) && (
            <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl">
              Hinweis: Impressum &
              Datenschutz müssen ausgefüllt
              sein, um live zu gehen.
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                const url =
                  (origin || '') +
                  publicUrl
                try {
                  await navigator.clipboard.writeText(
                    url
                  )
                } catch {
                  // ignore
                }
              }}
              className={actionBtn}
              title="Öffentliche URL kopieren"
            >
              <Icon.Link />
              Link kopieren
            </button>

            <a
              target="_blank"
              href={publicUrl}
              className={actionBtn}
              rel="noreferrer"
            >
              <Icon.Eye />
              Vorschau
            </a>

            <button
              onClick={save}
              disabled={saving}
              className={actionBtn}
            >
              <Icon.Save />
              {saving
                ? 'Speichere…'
                : 'Speichern'}
            </button>

            <div className="flex rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl p-1 shadow-sm">
              <button
                onClick={setDraft}
                className={`px-3 py-1.5 rounded-xl text-sm ${
                  row.status === 'draft'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                Entwurf
              </button>
              <button
                onClick={publish}
                className={`px-3 py-1.5 rounded-xl text-sm ${
                  row.status ===
                  'published'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                Live
              </button>
              <button
                onClick={disable}
                className={`px-3 py-1.5 rounded-xl text-sm ${
                  row.status ===
                  'disabled'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                Aus
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full p-6 space-y-6">
                {/* CTA: Professionelle Website inkl. Domain */}
        {!row.domain_requested && (
          <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/80 px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">
                Professionelle Website inklusive eigener Domain gewünscht?
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Wenn du statt der Standard-URL eine eigene .de- oder .com-Domain und ein
                komplett für dich eingerichtetes Layout möchtest, kannst du hier eine Anfrage
                an das GLENO-Team senden. Wir melden uns dann persönlich bei dir.
              </p>
              {domainRequestError && (
                <p className="mt-2 text-xs text-rose-600">
                  {domainRequestError}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={handleDomainRequest}
                disabled={domainRequestLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {domainRequestLoading ? 'Wird gesendet…' : 'Anfrage senden'}
              </button>
            </div>
          </div>
        )}

        {/* Meta / Branding */}
        <div className={sectionCard}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Titel
              </label>
              <input
                value={row.title || ''}
                onChange={(e) =>
                  setRow({
                    ...row,
                    title: e.target.value,
                  })
                }
                className={inputCls}
                placeholder="Website-Titel"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Beschreibung
              </label>
              <input
                value={
                  row.description || ''
                }
                onChange={(e) =>
                  setRow({
                    ...row,
                    description:
                      e.target.value,
                  })
                }
                className={inputCls}
                placeholder="Kurzbeschreibung"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Primärfarbe */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Primärfarbe
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm px-4 py-3">
                  <input
                    type="color"
                    value={
                      row.primary_color ||
                      '#0a1b40'
                    }
                    onChange={(e) =>
                      setRow({
                        ...row,
                        primary_color:
                          e.target.value,
                      })
                    }
                    className="h-10 w-10 rounded-md border border-slate-300 cursor-pointer"
                    title="Primärfarbe"
                  />
                  <span className="text-sm text-slate-700">
                    {row.primary_color ||
                      '#0a1b40'}
                  </span>
                </div>
              </div>
              {/* Sekundärfarbe */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Sekundärfarbe
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm px-4 py-3">
                  <input
                    type="color"
                    value={
                      row.secondary_color ||
                      '#f59e0b'
                    }
                    onChange={(e) =>
                      setRow({
                        ...row,
                        secondary_color:
                          e.target.value,
                      })
                    }
                    className="h-10 w-10 rounded-md border border-slate-300 cursor-pointer"
                    title="Sekundärfarbe"
                  />
                  <span className="text-sm text-slate-700">
                    {row.secondary_color ||
                      '#f59e0b'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logo / Favicon */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Logo */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Logo
                </label>
                <div className="flex items-center gap-3">
                  {row.logo_url ? (
                    <img
                      src={row.logo_url}
                      alt=""
                      className="h-14 w-14 rounded-2xl border border-slate-200/70 object-contain bg-white/70"
                    />
                  ) : (
                    <div className="h-14 w-14 border border-dashed border-slate-300 rounded-2xl bg-white/50" />
                  )}
                  <label className={actionBtn}>
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v14m-7-7h14"
                      />
                    </svg>
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (
                        e
                      ) => {
                        const f =
                          e
                            .target
                            .files?.[0]
                        if (!f)
                          return
                        const url =
                          await uploadToBucket(
                            f,
                            'logo'
                          )
                        if (url)
                          setRow({
                            ...row,
                            logo_url:
                              url,
                          })
                      }}
                    />
                  </label>
                </div>
              </div>
              {/* Favicon */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Favicon
                </label>
                <div className="flex items-center gap-3">
                  {row.favicon_url ? (
                    <img
                      src={
                        row
                          .favicon_url
                      }
                      alt=""
                      className="h-12 w-12 rounded-xl border border-slate-200/70 object-contain bg-white/70"
                    />
                  ) : (
                    <div className="h-12 w-12 border border-dashed border-slate-300 rounded-xl bg-white/50" />
                  )}
                  <label className={actionBtn}>
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v14m-7-7h14"
                      />
                    </svg>
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (
                        e
                      ) => {
                        const f =
                          e
                            .target
                            .files?.[0]
                        if (!f)
                          return
                        const url =
                          await uploadToBucket(
                            f,
                            'favicon'
                          )
                        if (url)
                          setRow({
                            ...row,
                            favicon_url:
                              url,
                          })
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Öffentliche URL */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm px-4 py-3">
              <div className="text-xs text-slate-600">
                Veröffentlicht unter:
              </div>
              <div className="font-medium break-all text-slate-800">
                {origin}
                {publicUrl}
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <div className={sectionCard}>
          <div className="font-medium mb-4 text-slate-800">
            Hero
          </div>

          {/* H1 */}
          <label className="block text-sm text-slate-600">
            Überschrift (max. {LIM.heroH1}{' '}
            Zeichen)
          </label>
          {(() => {
            const v = clamp(
              content.hero?.h1 ||
                '',
              LIM.heroH1
            )
            return (
              <>
                <input
                  className={`${inputCls} mt-1`}
                  value={v}
                  onChange={(e) =>
                    setRow((r) => {
                      if (!r)
                        return r
                      const c =
                        getContent(
                          r
                        )
                      return {
                        ...r,
                        content: {
                          ...c,
                          hero: withHero(
                            c,
                            {
                              h1: clamp(
                                e
                                  .target
                                  .value,
                                LIM.heroH1
                              ),
                            }
                          ),
                        },
                      }
                    })
                  }
                />
                <Counter
                  value={v}
                  max={
                    LIM.heroH1
                  }
                />
              </>
            )
          })()}

          {/* Sub */}
          <label className="block text-sm text-slate-600 mt-4">
            Untertitel (max. {LIM.heroSub}{' '}
            Zeichen)
          </label>
          {(() => {
            const v = clamp(
              content.hero?.sub ||
                '',
              LIM.heroSub
            )
            return (
              <>
                <textarea
                  className={`${textareaMd} mt-1`}
                  value={v}
                  onChange={(e) =>
                    setRow((r) => {
                      if (!r)
                        return r
                      const c =
                        getContent(
                          r
                        )
                      return {
                        ...r,
                        content: {
                          ...c,
                          hero: withHero(
                            c,
                            {
                              sub: clamp(
                                e
                                  .target
                                  .value,
                                LIM.heroSub
                              ),
                            }
                          ),
                        },
                      }
                    })
                  }
                />
                <Counter
                  value={v}
                  max={
                    LIM.heroSub
                  }
                />
              </>
            )
          })()}

          {/* Hero Bild */}
          <div className="flex items-center gap-3 mt-4">
            {content.hero?.image ? (
              <img
                src={
                  content.hero
                    .image as string
                }
                className="h-20 w-36 object-cover rounded-xl border border-slate-200/70 bg-white/60"
                alt=""
              />
            ) : (
              <div className="h-20 w-36 rounded-xl border border-dashed border-slate-300 bg-white/50 grid place-items-center text-xs text-slate-500">
                Kein Bild
              </div>
            )}
            <label className={actionBtn}>
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14m-7-7h14"
                />
              </svg>
              <span>
                Hero Bild
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (
                  e
                ) => {
                  const f =
                    e
                      .target
                      .files?.[0]
                  if (!f)
                    return
                  const url =
                    await uploadToBucket(
                      f,
                      'hero'
                    )
                  if (url)
                    setRow(
                      (r) => {
                        if (!r)
                          return r
                        const c =
                          getContent(
                            r
                          )
                        return {
                          ...r,
                          content:
                            {
                              ...c,
                              hero: withHero(
                                c,
                                {
                                  image:
                                    url,
                                }
                              ),
                            },
                        }
                      }
                    )
                }}
              />
            </label>
          </div>
        </div>

        {/* SERVICES */}
        <div className={sectionCard}>
          <div className="font-medium mb-4 text-slate-800">
            Leistungen
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">
              Titel
            </label>
            <input
              className={`${inputCls} mt-1`}
              value={
                content.services?.title ||
                'Leistungen'
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      services: {
                        ...(c.services ||
                          {
                            title: '',
                            items: [],
                          }),
                        title:
                          e.target
                            .value,
                      },
                    },
                  }
                })
              }
            />
          </div>

          <div className="space-y-4">
            {(content.services?.items ||
              []
            ).map((it, i) => {
              const show =
                clamp(
                  it.text ?? '',
                  LIM.serviceText
                )
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-4"
                >
                  <div className="space-y-3">
                    <input
                      placeholder="Leistungstitel"
                      className={
                        inputCls
                      }
                      value={
                        it.title
                      }
                      onChange={(
                        e
                      ) =>
                        setRow(
                          (
                            r
                          ) => {
                            if (!r)
                              return r
                            const c =
                              getContent(
                                r
                              )
                            const items =
                              [
                                ...(c
                                  .services
                                  ?.items ||
                                  []),
                              ]
                            items[i] =
                              {
                                ...items[
                                  i
                                ],
                                title:
                                  e
                                    .target
                                    .value,
                              }
                            return {
                              ...r,
                              content:
                                {
                                  ...c,
                                  services:
                                    {
                                      ...(c.services ||
                                        {
                                          title:
                                            '',
                                          items:
                                            [],
                                        }),
                                      items,
                                    },
                                },
                            }
                          }
                        )
                      }
                    />
                    <textarea
                      placeholder={`Kurztext (max. ${LIM.serviceText} Zeichen)`}
                      className={
                        textareaMd
                      }
                      value={
                        show
                      }
                      onChange={(
                        e
                      ) =>
                        setRow(
                          (
                            r
                          ) => {
                            if (!r)
                              return r
                            const c =
                              getContent(
                                r
                              )
                            const items =
                              [
                                ...(c
                                  .services
                                  ?.items ||
                                  []),
                              ]
                            items[i] =
                              {
                                ...items[
                                  i
                                ],
                                text: clamp(
                                  e
                                    .target
                                    .value,
                                  LIM.serviceText
                                ),
                              }
                            return {
                              ...r,
                              content:
                                {
                                  ...c,
                                  services:
                                    {
                                      ...(c.services ||
                                        {
                                          title:
                                            '',
                                          items:
                                            [],
                                        }),
                                      items,
                                    },
                                },
                            }
                          }
                        )
                      }
                    />
                  </div>
                  <Counter
                    value={
                      show
                    }
                    max={
                      LIM.serviceText
                    }
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      className="text-sm px-3 py-1.5 rounded-xl border border-white/60 bg-white/80 hover:bg-white shadow-sm"
                      onClick={() =>
                        setRow(
                          (
                            r
                          ) => {
                            if (!r)
                              return r
                            const c =
                              getContent(
                                r
                              )
                            const items =
                              [
                                ...(c
                                  .services
                                  ?.items ||
                                  []),
                              ]
                            items.splice(
                              i,
                              1
                            )
                            return {
                              ...r,
                              content:
                                {
                                  ...c,
                                  services:
                                    {
                                      ...(c.services ||
                                        {
                                          title:
                                            '',
                                          items:
                                            [],
                                        }),
                                      items,
                                    },
                                },
                            }
                          }
                        )
                      }
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <button
              className={actionBtn}
              onClick={() =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  const items = [
                    ...(c.services
                      ?.items ||
                      []),
                  ]
                  items.push({
                    title: '',
                    text: '',
                  })
                  return {
                    ...r,
                    content: {
                      ...c,
                      services: {
                        ...(c.services ||
                          {
                            title: '',
                            items: [],
                          }),
                        items,
                      },
                    },
                  }
                })
              }
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14m-7-7h14"
                />
              </svg>
              Leistung hinzufügen
            </button>
          </div>
        </div>

        {/* BENEFITS */}
        <div className={sectionCard}>
          <div className="font-medium mb-4 text-slate-800">
            Warum wir
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">
              Titel
            </label>
            <input
              className={`${inputCls} mt-1`}
              value={
                content.benefits
                  ?.title ||
                'Warum wir'
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      benefits: {
                        ...(c.benefits ||
                          {
                            title: '',
                            items: [],
                          }),
                        title:
                          e.target
                            .value,
                      } as any,
                    },
                  }
                })
              }
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-600">
              Intro (max.{' '}
              {
                LIM.benefitsIntro
              }{' '}
              Zeichen)
            </label>
            {(() => {
              const v = clamp(
                (content as any)
                  .benefits
                  ?.intro ||
                  '',
                LIM.benefitsIntro
              )
              return (
                <>
                  <textarea
                    className={`${textareaLg} mt-1`}
                    value={v}
                    onChange={(
                      e
                    ) =>
                      setRow(
                        (
                          r
                        ) => {
                          if (!r)
                            return r
                          const c =
                            getContent(
                              r
                            ) as any
                          return {
                            ...r,
                            content:
                              {
                                ...c,
                                benefits:
                                  {
                                    ...(c.benefits ||
                                      {}),
                                    intro:
                                      clamp(
                                        e
                                          .target
                                          .value,
                                        LIM.benefitsIntro
                                      ),
                                    items:
                                      c
                                        .benefits
                                        .items,
                                  },
                              },
                          }
                        }
                      )
                    }
                  />
                  <Counter
                    value={
                      (content as any)
                        .benefits
                        ?.intro ||
                      ''
                    }
                    max={
                      LIM.benefitsIntro
                    }
                  />
                </>
              )
            })()}
          </div>

          <div className="space-y-4">
            {content.benefits?.items.map(
              (it, i) => {
                const show =
                  clamp(
                    it.text ??
                      '',
                    LIM.benefitText
                  )
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200/70 bg-white/60 p-4"
                  >
                    <div className="space-y-3">
                      <input
                        placeholder="Vorteil – Titel"
                        className={
                          inputCls
                        }
                        value={
                          it.title
                        }
                        onChange={(
                          e
                        ) =>
                          setRow(
                            (
                              r
                            ) => {
                              if (!r)
                                return r
                              const c =
                                getContent(
                                  r
                                )
                              const items =
                                [
                                  ...(c
                                    .benefits
                                    ?.items ||
                                    []),
                                ]
                              items[i] =
                                {
                                  ...items[
                                    i
                                  ],
                                  title:
                                    e
                                      .target
                                      .value,
                                }
                              return {
                                ...r,
                                content:
                                  {
                                    ...c,
                                    benefits:
                                      {
                                        ...(c.benefits ||
                                          {
                                            title:
                                              '',
                                            items:
                                              [],
                                          }),
                                        items,
                                      } as any,
                                  },
                              }
                            }
                          )
                        }
                      />
                      <textarea
                        placeholder={`Kurztext (max. ${LIM.benefitText} Zeichen)`}
                        className={
                          textareaMd
                        }
                        value={
                          show
                        }
                        onChange={(
                          e
                        ) =>
                          setRow(
                            (
                              r
                            ) => {
                              if (!r)
                                return r
                              const c =
                                getContent(
                                  r
                                )
                              const items =
                                [
                                  ...(c
                                    .benefits
                                    ?.items ||
                                    []),
                                ]
                              items[i] =
                                {
                                  ...items[
                                    i
                                  ],
                                  text: clamp(
                                    e
                                      .target
                                      .value,
                                    LIM.benefitText
                                  ),
                                }
                              return {
                                ...r,
                                content:
                                  {
                                    ...c,
                                    benefits:
                                      {
                                        ...(c.benefits ||
                                          {
                                            title:
                                              '',
                                            items:
                                              [],
                                          }),
                                        items,
                                      } as any,
                                  },
                              }
                            }
                          )
                        }
                      />
                    </div>
                    <Counter
                      value={
                        show
                      }
                      max={
                        LIM.benefitText
                      }
                    />
                  </div>
                )
              }
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className={sectionCard}>
          <div className="font-medium mb-4 text-slate-800">
            FAQ
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">
              Titel
            </label>
            <input
              className={`${inputCls} mt-1`}
              value={
                content.faq?.title ||
                'Fragen & Antworten'
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      faq: {
                        ...(c.faq || {
                          title: '',
                          items: [],
                        }),
                        title:
                          e.target
                            .value,
                      },
                    },
                  }
                })
              }
            />
          </div>

          <div className="space-y-4">
            {(content.faq?.items ||
              []
            ).map((qa, i) => {
              const qShow =
                clamp(
                  qa.q ?? '',
                  LIM.faqQ
                )
              const aShow =
                clamp(
                  qa.a ?? '',
                  LIM.faqA
                )
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-4"
                >
                  <div className="space-y-3">
                    <input
                      placeholder={`Frage (max. ${LIM.faqQ} Zeichen)`}
                      className={
                        inputCls
                      }
                      value={
                        qShow
                      }
                      onChange={(
                        e
                      ) =>
                        setRow(
                          (
                            r
                          ) => {
                            if (!r)
                              return r
                            const c =
                              getContent(
                                r
                              )
                            const items =
                              [
                                ...(c
                                  .faq
                                  ?.items ||
                                  []),
                              ]
                            items[i] =
                              {
                                ...items[
                                  i
                                ],
                                q: clamp(
                                  e
                                    .target
                                    .value,
                                  LIM.faqQ
                                ),
                              }
                            return {
                              ...r,
                              content:
                                {
                                  ...c,
                                  faq: {
                                    ...(c.faq ||
                                      {
                                        title:
                                          '',
                                        items:
                                          [],
                                      }),
                                    items,
                                  },
                                },
                            }
                          }
                        )
                      }
                    />
                    <textarea
                      placeholder={`Antwort (max. ${LIM.faqA} Zeichen)`}
                      className={
                        textareaLg
                      }
                      value={
                        aShow
                      }
                      onChange={(
                        e
                      ) =>
                        setRow(
                          (
                            r
                          ) => {
                            if (!r)
                              return r
                            const c =
                              getContent(
                                r
                              )
                            const items =
                              [
                                ...(c
                                  .faq
                                  ?.items ||
                                  []),
                              ]
                            items[i] =
                              {
                                ...items[
                                  i
                                ],
                                a: clamp(
                                  e
                                    .target
                                    .value,
                                  LIM.faqA
                                ),
                              }
                            return {
                              ...r,
                              content:
                                {
                                  ...c,
                                  faq: {
                                    ...(c.faq ||
                                      {
                                        title:
                                          '',
                                        items:
                                          [],
                                      }),
                                    items,
                                  },
                                },
                            }
                          }
                        )
                      }
                    />
                    <div className="flex justify-between">
                      <Counter
                        value={
                          aShow
                        }
                        max={
                          LIM.faqA
                        }
                      />
                      <button
                        className="text-sm px-3 py-1.5 rounded-xl border border-white/60 bg-white/80 hover:bg-white shadow-sm"
                        onClick={() =>
                          setRow(
                            (
                              r
                            ) => {
                              if (!r)
                                return r
                              const c =
                                getContent(
                                  r
                                )
                              const items =
                                [
                                  ...(c
                                    .faq
                                    ?.items ||
                                    []),
                                ]
                              items.splice(
                                i,
                                1
                              )
                              return {
                                ...r,
                                content:
                                  {
                                    ...c,
                                    faq: {
                                      ...(c.faq ||
                                        {
                                          title:
                                            '',
                                          items:
                                            [],
                                        }),
                                      items,
                                    },
                                  },
                              }
                            }
                          )
                        }
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <button
              className={actionBtn}
              onClick={() =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  const items = [
                    ...(c.faq?.items ||
                      []),
                  ]
                  items.push({
                    q: '',
                    a: '',
                  })
                  return {
                    ...r,
                    content: {
                      ...c,
                      faq: {
                        ...(c.faq || {
                          title: '',
                          items: [],
                        }),
                        items,
                      },
                    },
                  }
                })
              }
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14m-7-7h14"
                />
              </svg>
              Frage hinzufügen
            </button>
          </div>
        </div>

        {/* KONTAKT */}
        <div className={sectionCard}>
          <div className="font-medium mb-4 text-slate-800">
            Kontakt
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">
              Titel
            </label>
            <input
              className={`${inputCls} mt-1`}
              value={
                content.contact
                  ?.title ||
                'Kontakt'
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      contact:
                        withContact(
                          c,
                          {
                            title:
                              e
                                .target
                                .value,
                          }
                        ),
                    },
                  }
                })
              }
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-600">
              Intro (max.{' '}
              {
                LIM.contactIntro
              }{' '}
              Zeichen)
            </label>
            {(() => {
              const v = clamp(
                (content as any)
                  .contact
                  ?.intro ||
                  '',
                LIM.contactIntro
              )
              return (
                <>
                  <textarea
                    className={`${textareaMd} mt-1`}
                    value={v}
                    onChange={(
                      e
                    ) =>
                      setRow(
                        (
                          r
                        ) => {
                          if (!r)
                            return r
                          const c =
                            getContent(
                              r
                            )
                          return {
                            ...r,
                            content:
                              {
                                ...c,
                                contact:
                                  withContact(
                                    c,
                                    {
                                      // @ts-ignore
                                      intro:
                                        clamp(
                                          e
                                            .target
                                            .value,
                                          LIM.contactIntro
                                        ),
                                    } as any
                                  ),
                              },
                          }
                        }
                      )
                    }
                  />
                  <Counter
                    value={
                      v
                    }
                    max={
                      LIM.contactIntro
                    }
                  />
                </>
              )
            })()}
          </div>
          <div className="space-y-3">
            <input
              placeholder="Telefon"
              className={inputCls}
              value={
                content.contact
                  ?.phone || ''
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      contact:
                        withContact(
                          c,
                          {
                            phone:
                              e
                                .target
                                .value,
                          }
                        ),
                    },
                  }
                })
              }
            />
            <input
              placeholder="E-Mail (Anzeige auf der Website)"
              className={inputCls}
              value={
                content.contact
                  ?.email || ''
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      contact:
                        withContact(
                          c,
                          {
                            email:
                              e
                                .target
                                .value,
                          }
                        ),
                    },
                  }
                })
              }
            />
            <textarea
              placeholder={
                'Adresse (Straße, Hausnr.\nPLZ Ort)'
              }
              className={textareaMd}
              value={
                content.contact
                  ?.address ||
                ''
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      contact:
                        withContact(
                          c,
                          {
                            address:
                              e
                                .target
                                .value,
                          }
                        ),
                    },
                  }
                })
              }
            />
            <input
              placeholder="Empfänger für Anfragen (z. B. a@a.de,b@b.de)"
              className={inputCls}
              value={
                content.contact
                  ?.recipient ||
                ''
              }
              onChange={(e) =>
                setRow((r) => {
                  if (!r) return r
                  const c =
                    getContent(r)
                  return {
                    ...r,
                    content: {
                      ...c,
                      contact:
                        withContact(
                          c,
                          {
                            recipient:
                              e
                                .target
                                .value,
                          }
                        ),
                    },
                  }
                })
              }
            />
          </div>
        </div>

        {/* RECHTLICHES – Impressum & Datenschutz */}
        <div className={sectionCard}>
          <div className="font-medium mb-2 text-slate-800">
            Impressum /
            Datenschutz
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Hinweis: Diese Vorlagen sind
            generisch und ersetzen keine
            Rechtsberatung. Bitte an dein
            Unternehmen anpassen.
          </p>

          {/* IMPRESSUM */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-slate-800">
                Impressum
              </div>
              <button
                className={actionBtn}
                onClick={() => {
                  setImprintDraft(
                    imprint ||
                      defaultImprint()
                  )
                  setShowImprintModal(
                    true
                  )
                }}
                title="Impressum erzeugen"
              >
                <Icon.Robot />
                KI generieren
              </button>
            </div>

            <textarea
              placeholder="Impressum (HTML erlaubt)"
              className={`${textareaLg} mt-3`}
              value={
                row.imprint_html ||
                ''
              }
              onChange={(e) =>
                setRow({
                  ...row,
                  imprint_html:
                    e.target
                      .value,
                })
              }
            />
          </div>

          <hr className="my-5 border-white/60" />

          {/* DATENSCHUTZ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-slate-800">
                Datenschutzerklärung
              </div>
              <button
                className={actionBtn}
                onClick={() => {
                  setPrivacyDraft(
                    privacy ||
                      defaultPrivacy()
                  )
                  setShowPrivacyModal(
                    true
                  )
                }}
                title="Datenschutz erzeugen"
              >
                <Icon.Robot />
                KI generieren
              </button>
            </div>

            <textarea
              placeholder="Datenschutzerklärung (HTML erlaubt)"
              className={`${textareaLg} mt-3`}
              value={
                row.privacy_html ||
                ''
              }
              onChange={(e) =>
                setRow({
                  ...row,
                  privacy_html:
                    e.target
                      .value,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* ---------- MODALS ---------- */}
      {showImprintModal &&
        imprintDraft && (
          <Modal
            title="Impressum – Angaben"
            onClose={() => {
              if (!isGenerating)
                setShowImprintModal(
                  false
                )
            }}
          >
            {isGenerating ===
            'imprint' ? (
              <GeneratingBlock label="Erzeuge Impressum …" />
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Firma"
                    value={
                      imprintDraft.companyName
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        companyName:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Rechtsform (z. B. GmbH)"
                    value={
                      imprintDraft.legalForm
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        legalForm:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Straße, Nr."
                    value={
                      imprintDraft.street
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        street:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="PLZ Ort"
                    value={
                      imprintDraft.zipCity
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        zipCity:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Land"
                    value={
                      imprintDraft.country
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        country:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Geschäftsführer/Vertretung"
                    value={
                      imprintDraft.managingDirector
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        managingDirector:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Registergericht"
                    value={
                      imprintDraft.registerCourt ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        registerCourt:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Registernummer (HRB/HRA)"
                    value={
                      imprintDraft.registerNumber ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        registerNumber:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={
                        !!imprintDraft.smallBusiness
                      }
                      onChange={(
                        e
                      ) =>
                        setImprintDraft({
                          ...imprintDraft,
                          smallBusiness:
                            e
                              .target
                              .checked,
                        })
                      }
                    />
                    Kleinunternehmerregelung
                    (§19 UStG)
                  </label>
                  <input
                    className={
                      inputCls
                    }
                    placeholder="USt-ID (DE…)"
                    value={
                      imprintDraft.vatId ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        vatId:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Telefon"
                    value={
                      imprintDraft.phone ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        phone:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="E-Mail"
                    value={
                      imprintDraft.email ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        email:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Aufsichtsbehörde (optional)"
                    value={
                      imprintDraft.supervisoryAuthority ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        supervisoryAuthority:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Zuständige Kammer (optional)"
                    value={
                      imprintDraft.chamber ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        chamber:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Hero-Bild: Beschreibung/Autor"
                    value={
                      imprintDraft.heroAttribution_desc ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        heroAttribution_desc:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Hero-Bild: Link zur Quelle"
                    value={
                      imprintDraft.heroAttribution_url ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        heroAttribution_url:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Hero-Bild: Lizenz (z. B. CC BY 4.0)"
                    value={
                      imprintDraft.heroAttribution_license ||
                      ''
                    }
                    onChange={(e) =>
                      setImprintDraft({
                        ...imprintDraft,
                        heroAttribution_license:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-xl border border-white/60 bg-white/80 hover:bg-white"
                    onClick={() =>
                      setShowImprintModal(
                        false
                      )
                    }
                  >
                    Abbrechen
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl border border-white/60 bg-white/80 hover:bg-white shadow-sm"
                    onClick={() => {
                      if (!imprintDraft)
                        return
                      setIsGenerating(
                        'imprint'
                      )
                      setTimeout(
                        () => {
                          const html =
                            buildImprintHTML(
                              imprintDraft
                            )
                          setRow(
                            (r) =>
                              r
                                ? {
                                    ...r,
                                    imprint_html:
                                      html,
                                  }
                                : r
                          )
                          setImprint(
                            imprintDraft
                          )
                          setIsGenerating(
                            null
                          )
                          setShowImprintModal(
                            false
                          )
                        },
                        800
                      )
                    }}
                  >
                    Generieren
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}

      {showPrivacyModal &&
        privacyDraft && (
          <Modal
            title="Datenschutzerklärung – Angaben"
            onClose={() => {
              if (!isGenerating)
                setShowPrivacyModal(
                  false
                )
            }}
          >
            {isGenerating ===
            'privacy' ? (
              <GeneratingBlock label="Erzeuge Datenschutzerklärung …" />
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Verantwortlicher (Name/Firma)"
                    value={
                      privacyDraft.controllerName
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        controllerName:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="E-Mail Verantwortlicher"
                    value={
                      privacyDraft.controllerEmail
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        controllerEmail:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Telefon Verantwortlicher (optional)"
                    value={
                      privacyDraft.controllerPhone ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        controllerPhone:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="Website"
                    value={
                      privacyDraft.website ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        website:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <textarea
                    className={
                      textareaMd
                    }
                    placeholder="Adresse Verantwortlicher (mehrzeilig möglich)"
                    value={
                      privacyDraft.controllerAddress
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        controllerAddress:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <input
                    className={
                      inputCls
                    }
                    placeholder="DSB – Vorname"
                    value={
                      privacyDraft.dpoFirstName ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        dpoFirstName:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="DSB – Nachname"
                    value={
                      privacyDraft.dpoLastName ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        dpoLastName:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="DSB – E-Mail"
                    value={
                      privacyDraft.dpoEmail ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        dpoEmail:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                  <input
                    className={
                      inputCls
                    }
                    placeholder="DSB – Telefon"
                    value={
                      privacyDraft.dpoPhone ||
                      ''
                    }
                    onChange={(e) =>
                      setPrivacyDraft({
                        ...privacyDraft,
                        dpoPhone:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={
                        !!privacyDraft.contactForm
                      }
                      onChange={(
                        e
                      ) =>
                        setPrivacyDraft({
                          ...privacyDraft,
                          contactForm:
                            e
                              .target
                              .checked,
                        })
                      }
                    />
                    Kontaktformular
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={
                        !!privacyDraft.newsletter
                      }
                      onChange={(
                        e
                      ) =>
                        setPrivacyDraft({
                          ...privacyDraft,
                          newsletter:
                            e
                              .target
                              .checked,
                        })
                      }
                    />
                    Newsletter
                  </label>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-xl border border-white/60 bg-white/80 hover:bg-white"
                    onClick={() =>
                      setShowPrivacyModal(
                        false
                      )
                    }
                  >
                    Abbrechen
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl border border-white/60 bg-white/80 hover:bg-white shadow-sm"
                    onClick={() => {
                      if (!privacyDraft)
                        return
                      setIsGenerating(
                        'privacy'
                      )
                      setTimeout(
                        () => {
                          const html =
                            buildPrivacyHTML(
                              privacyDraft
                            )
                          setRow(
                            (r) =>
                              r
                                ? {
                                    ...r,
                                    privacy_html:
                                      html,
                                  }
                                : r
                          )
                          setPrivacy(
                            privacyDraft
                          )
                          setIsGenerating(
                            null
                          )
                          setShowPrivacyModal(
                            false
                          )
                        },
                        800
                      )
                    }}
                  >
                    Generieren
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
    </div>
  )
}
