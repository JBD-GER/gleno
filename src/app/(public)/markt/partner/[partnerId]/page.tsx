// src/app/(public)/markt/partner/[partnerId]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { supabaseServer } from '@/lib/supabase-server'
import type { SVGProps } from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PartnerRow = {
  id: string
  status: string | null
  company_name: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  description: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  branch_id: string | null
  category_id: string | null
  logo_path: string | null
  created_at: string
  updated_at: string
}

type Branch = { id: string; name: string; slug: string }
type CategoryRow = { id: string; name: string; slug: string }
type LinkRow = { id: string; url: string | null; kind: string | null }
type ServiceRow = { id: string; name: string | null; priority_percent: number | null }
type RatingRow = {
  id: string
  stars: number
  text: string | null
  name: string | null
  created_at: string
}

/* UI helpers */
const card =
  'rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_10px_34px_rgba(2,6,23,0.07)] ring-1 ring-white/60'
const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 backdrop-blur-xl px-3 py-1 text-xs text-slate-800'
const btnGhost =
  'inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-3 py-1.5 text-sm text-slate-900 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-200'

function niceAddress(p: PartnerRow) {
  const parts = [
    [p.street, p.house_number].filter(Boolean).join(' ').trim(),
    [p.postal_code, p.city].filter(Boolean).join(' ').trim(),
    p.country,
  ].filter(Boolean)
  return parts.join(', ')
}

/* Social-Brand Detection */

type BrandKey =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'github'
  | 'website'

function detectBrand(url?: string | null): BrandKey | null {
  if (!url) return null
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('facebook')) return 'facebook'
    if (h.includes('linkedin')) return 'linkedin'
    if (h.includes('youtube')) return 'youtube'
    if (h.includes('tiktok')) return 'tiktok'
    if (h.includes('x.com') || h.includes('twitter')) return 'x'
    if (h.includes('github')) return 'github'
    return 'website'
  } catch {
    return null
  }
}

/* Icons */

const IconInstagram = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
  </svg>
)
const IconFacebook = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.061l.439-3H13v-1.5c0-.276.224-.5.5-.5z" />
  </svg>
)
const IconLinkedIn = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM10 9h3.6v1.64h.05c.5-.94 1.72-1.94 3.54-1.94 3.78 0 4.48 2.49 4.48 5.73V21h-4v-5.36c0-1.28-.02-2.93-1.79-2.93-1.8 0-2.07 1.4-2.07 2.84V21h-4z" />
  </svg>
)
const IconYouTube = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M23 12s0-3.4-.44-5a3.1 3.1 0 0 0-2.2-2.2C18.77 4 12 4 12 4s-6.77 0-8.36.8A3.1 3.1 0 0 0 1.44 7C1 8.6 1 12 1 12s0 3.4.44 5a3.1 3.1 0 0 0 2.2 2.2C5.23 20 12 20 12 20s6.77 0 8.36-.8a3.1 3.1 0 0 0 2.2-2.2c.44-1.6.44-5 .44-5zM10 8l6 4-6 4V8z" />
  </svg>
)
const IconTikTok = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.5 6.3a5.9 5.9 0 0 0 3.3 1.1V11a8.4 8.4 0 0 1-3.7-1v6.2A5.8 5.8 0 1 1 11 10.5v2.6a3.2 3.2 0 1 0 2.1 3V3h2.4c.2 1.2 1 2.4 2 3.3z" />
  </svg>
)
const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M3 3h4.7l4.1 5.7L17.1 3H21l-7.7 9.2L21.6 21h-4.7l-4.5-6.2L7 21H3l8-9.3z" />
  </svg>
)
const IconGitHub = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12 11.5 11.5 0 0 0 8 23.1c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.6 1.2 1.6 1.2 1 .1.8 2 .8 2 1.1 1.9 2.9 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.6-1.4-5.6-6.1 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.1 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 3 .1 3.3.8.9 1.2 2 1.2 3.3 0 4.7-2.9 5.7-5.6 6.1.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
  </svg>
)

function SocialIcon({ brand, className }: { brand: BrandKey; className?: string }) {
  const cls = `h-5 w-5 ${className || ''}`
  switch (brand) {
    case 'instagram': return <IconInstagram className={cls} />
    case 'facebook':  return <IconFacebook className={cls} />
    case 'linkedin':  return <IconLinkedIn className={cls} />
    case 'youtube':   return <IconYouTube className={cls} />
    case 'tiktok':    return <IconTikTok className={cls} />
    case 'x':         return <IconX className={cls} />
    case 'github':    return <IconGitHub className={cls} />
    default:          return <GlobeAltIcon className={cls} />
  }
}

/* Logo-URL */

async function resolveLogoUrl(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  rawPath?: string | null,
) {
  if (!rawPath) return null
  const trimmed = rawPath.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const bucket = 'markt'
  const objectPath = trimmed.includes('/') ? trimmed : `logo/${trimmed}`

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60)

    if (!error && data?.signedUrl) return data.signedUrl
  } catch {
    // ignore
  }

  const pub = supabase.storage.from(bucket).getPublicUrl(objectPath)
  if (pub?.data?.publicUrl) return pub.data.publicUrl

  return null
}

/* Stars (0–10) */

function Stars10({ value }: { value: number }) {
  const v = Math.max(0, Math.min(10, value))
  const full = Math.floor(v)
  const hasHalf = v - full >= 0.5
  const total = 10

  return (
    <div className="flex items-center gap-[2px] text-amber-400">
      {Array.from({ length: total }).map((_, i) => {
        if (i < full) return <span key={i}>★</span>
        if (i === full && hasHalf) return <span key={i}>☆</span>
        return (
          <span key={i} className="text-slate-300">
            ★
          </span>
        )
      })}
    </div>
  )
}

/* Seite */

const PAGE_SIZE = 3

export default async function PublicPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const { partnerId } = await params
  const sp = await searchParams

  const supabase = await supabaseServer()

  // Partner laden
  const { data: partner, error: pErr } = await supabase
    .from('partners')
    .select(`
      id, status, company_name, display_name, first_name, last_name,
      email, phone, website, description, street, house_number,
      postal_code, city, country, branch_id, category_id, logo_path,
      created_at, updated_at
    `)
    .eq('id', partnerId)
    .maybeSingle<PartnerRow>()

  if (pErr || !partner) return notFound()

  // Branchen
  let branches: Branch[] = []
  const { data: branchMap } = await supabase
    .from('partner_branch_map')
    .select('branch_id, partner_branches!inner(id, name, slug)')
    .eq('partner_id', partner.id)

  if (branchMap && branchMap.length > 0) {
    branches = branchMap
      .map((r: any) => r?.partner_branches)
      .filter((b: any) => b && b.id)
      .map((b: any) => ({
        id: String(b.id),
        name: String(b.name),
        slug: String(b.slug),
      }))
      .slice(0, 3)
  } else if (partner.branch_id) {
    const { data: br } = await supabase
      .from('partner_branches')
      .select('id, name, slug')
      .eq('id', partner.branch_id)
      .maybeSingle<Branch>()
    if (br) branches = [br]
  }

  // Kategorien
  const { data: categoriesMap } = await supabase
    .from('partner_category_map')
    .select('category_id, partner_categories!inner(id, name, slug)')
    .eq('partner_id', partner.id)
  const categories: CategoryRow[] = (categoriesMap || [])
    .map((r: any) => r?.partner_categories)
    .filter((c: any) => c && c.id)
    .map((c: any) => ({
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug),
    }))

  // Links
  const { data: links } = await supabase
    .from('partner_links')
    .select('id, url, kind')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: true })

  // Services
  const { data: services } = await supabase
    .from('partner_services')
    .select('id, name, priority_percent')
    .eq('partner_id', partner.id)
    .order('priority_percent', { ascending: false })

  // Alle Ratings (für Durchschnitt + Paging)
  const { data: allRatings, error: rErr } = await supabase
    .from('market_partner_ratings')
    .select('id, stars, text, name, created_at')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  let ratingCount = 0
  let avg: number | null = null

  if (!rErr && allRatings && allRatings.length > 0) {
    ratingCount = allRatings.length
    const sum = allRatings.reduce(
      (acc, r) => acc + (Number(r.stars) || 0),
      0,
    )
    avg = sum / ratingCount
  }

  const hasRatings = avg !== null && ratingCount > 0

  // Pagination (max 3 pro Seite)
  const pageRaw = Array.isArray(sp?.page) ? sp.page[0] : sp?.page
  const parsedPage = pageRaw ? parseInt(pageRaw, 10) : 1
  const currentPage = hasRatings
    ? Math.min(
        Math.max(parsedPage || 1, 1),
        Math.max(1, Math.ceil(ratingCount / PAGE_SIZE)),
      )
    : 1

  const totalPages = hasRatings
    ? Math.max(1, Math.ceil(ratingCount / PAGE_SIZE))
    : 1

  const start = (currentPage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const ratingsPage: RatingRow[] =
    hasRatings && allRatings ? allRatings.slice(start, end) : []

  const logoUrl = await resolveLogoUrl(supabase, partner.logo_path)
  const title = partner.display_name || partner.company_name || 'Partner'
  const addr = niceAddress(partner)

  // Social
  const socialBase =
    (links || [])
      .map((l: LinkRow) => ({
        id: l.id,
        url: l.url || undefined,
        brand: detectBrand(l.url),
      }))
      .filter((x) => x.brand) as { id: string; url?: string; brand: BrandKey }[]
  const social: { id: string; url?: string; brand: BrandKey }[] = [...socialBase]
  if (partner.website) {
    const already = social.some(
      (s) => s.brand === 'website' || (s.url && s.url === partner.website),
    )
    if (!already) {
      social.unshift({ id: 'website', url: partner.website, brand: 'website' })
    }
  }

  return (
    <section className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="underline hover:no-underline">
            Start
          </Link>{' '}
          /{' '}
          <Link href="/markt" className="underline hover:no-underline">
            Markt
          </Link>{' '}
          / Partner
        </nav>

        <div className="mt-2 flex items-start gap-4">
          <div className="flex-shrink-0 pt-[2px]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="h-12 w-12 rounded-xl object-contain border border-white/60 bg-white/80 p-1"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 flex items-center justify-center text-slate-600 text-base">
                {(title || 'P').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                {partner.email && (
                  <a
                    href={`mailto:${partner.email}`}
                    className={btnGhost}
                    title="E-Mail schreiben"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    E-Mail
                  </a>
                )}
                {partner.phone && (
                  <a
                    href={`tel:${partner.phone}`}
                    className={btnGhost}
                    title="Anrufen"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    Telefon
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-2">
          {branches.map((b) => (
            <span key={b.id} className={chip}>
              <BuildingOffice2Icon className="h-4 w-4" />
              {b.name}
            </span>
          ))}
          {(partner.city || partner.postal_code || partner.country) && (
            <span className={chip}>
              <MapPinIcon className="h-4 w-4" />
              {addr}
            </span>
          )}
        </div>
      </div>

      {/* Über */}
      <div className={card}>
        <div className="text-lg font-medium text-slate-900">Über {title}</div>
        {partner.description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
            {partner.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Noch keine Beschreibung hinterlegt.
          </p>
        )}
      </div>

      {/* Bewertungen */}
      <div className={`${card} mt-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-medium text-slate-900">
            Bewertungen
          </div>
          {hasRatings && avg !== null && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Stars10 value={avg} />
              <span className="font-semibold text-slate-900">
                {avg.toFixed(1)} / 10
              </span>
              <span>
                ({ratingCount}{' '}
                {ratingCount === 1 ? 'Bewertung' : 'Bewertungen'})
              </span>
            </div>
          )}
        </div>

        {!hasRatings && (
          <div className="mt-3 text-sm text-slate-600">
            Noch keine Bewertungen vorhanden.
          </div>
        )}

        {hasRatings && ratingsPage.length > 0 && (
          <>
            <div className="mt-4 space-y-3">
              {ratingsPage.map((r) => {
                const displayName =
                  (r.name ?? '').trim() !== '' ? (r.name as string) : 'anonym'
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-slate-900 ring-1 ring-white/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Stars10 value={r.stars} />
                        <span className="text-xs text-slate-600">
                          {r.stars} / 10
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(r.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    {r.text && (
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                        {r.text}
                      </p>
                    )}
                    <div className="mt-1 text-[11px] text-slate-500">
                      Von {displayName}
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-3 text-[11px] text-slate-500">
                <span>
                  Seite {currentPage} / {totalPages}
                </span>
                <div className="flex gap-1">
                  {currentPage > 1 && (
                    <Link
                      href={`/markt/partner/${partner.id}?page=${
                        currentPage - 1
                      }`}
                      className="px-2 py-1 rounded-md border border-slate-200 bg-white/80 hover:bg-white"
                    >
                      Zurück
                    </Link>
                  )}
                  {currentPage < totalPages && (
                    <Link
                      href={`/markt/partner/${partner.id}?page=${
                        currentPage + 1
                      }`}
                      className="px-2 py-1 rounded-md border border-slate-200 bg-white/80 hover:bg-white"
                    >
                      Weiter
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Kategorien */}
      <div className={`${card} mt-4`}>
        <div className="text-lg font-medium text-slate-900 flex items-center gap-1.5">
          <TagIcon className="h-5 w-5" />
          Kategorien
        </div>
        {categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-800"
              >
                {c.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">
            Keine Kategorien hinterlegt.
          </div>
        )}
      </div>

      {/* Leistungen */}
      <div className={`${card} mt-4`}>
        <div className="text-lg font-medium text-slate-900">
          Leistungen
        </div>
        {Array.isArray(services) && services.length > 0 ? (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {services.map((s: ServiceRow) => (
              <li
                key={s.id}
                className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-slate-900 ring-1 ring-white/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">
                    {s.name || 'Leistung'}
                  </span>
                  {typeof s.priority_percent === 'number' && (
                    <span className="text-xs text-slate-600">
                      {s.priority_percent}%
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-sm text-slate-600">
            Noch keine Leistungen hinterlegt.
          </div>
        )}
      </div>

      {/* Social */}
      <div className={`${card} mt-4`}>
        <div className="text-lg font-medium text-slate-900">
          Social
        </div>
        {social.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {social.map((s) =>
              s.url ? (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  title={
                    s.brand === 'website' ? 'Website' : s.brand.toUpperCase()
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 backdrop-blur-xl hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <SocialIcon brand={s.brand} />
                  <span className="sr-only">{s.brand}</span>
                </a>
              ) : null,
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">
            Keine Social-Profile hinterlegt.
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-6 text-xs text-slate-500">
        Profil zuletzt aktualisiert am{' '}
        {new Date(
          partner.updated_at || partner.created_at,
        ).toLocaleString('de-DE')}
      </div>
    </section>
  )
}
