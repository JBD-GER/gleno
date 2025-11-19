// app/api/partners/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// ❗ WICHTIG: Auf Node-Runtime wechseln, damit wir genug Zeit haben
export const runtime = 'nodejs'
export const maxDuration = 60 // Sekunden (Vercel)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_BYTES = 480_000
const MAX_PAGES = 6
const PAGE_TIMEOUT_MS = 12000

const PAGE_KEYWORDS = [
  'leistung','leistungen','service','services','angebot','angebote',
  'portfolio','referenzen','ueber-uns','über-uns','about','kontakt',
  'impressum','datenschutz','product','produkte','shop'
]

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function take(jsonld: string) { try { return JSON.parse(jsonld) } catch { return null } }
function truncate(s: string, max = MAX_BYTES) { return s && s.length > max ? s.slice(0, max) : s }
function uniq<T>(arr: T[]) { return Array.from(new Set(arr)) }
function absoluteUrl(href: string, origin: string) {
  try {
    const u = new URL(href, origin)
    if (u.origin !== origin && !href.startsWith('/')) return null
    return u.href
  } catch {
    return null
  }
}

async function fetchText(url: string) {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'PartnerBot/3.0' },
      signal: ctrl.signal,
    })
    return await res.text()
  } catch {
    return ''
  } finally {
    clearTimeout(to)
  }
}

function extractInternalLinks(html: string, base: string) {
  const hrefs = Array.from(
    html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/gi)
  ).map((m) => m[1])

  const cleaned = hrefs
    .map((h) => h.trim())
    .filter(
      (h) =>
        !!h &&
        !h.startsWith('mailto:') &&
        !h.startsWith('tel:') &&
        !h.startsWith('#')
    )
    .map((h) => absoluteUrl(h, new URL(base).origin))
    .filter((x): x is string => !!x)

  const scored = cleaned.map((u) => {
    const path = new URL(u).pathname.toLowerCase()
    const score = PAGE_KEYWORDS.reduce(
      (acc, kw) => acc + (path.includes(kw) ? 1 : 0),
      0
    )
    return { u, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return uniq(scored.map((s) => s.u))
}

function discoverSocials(html: string) {
  const out: { url: string; kind: string }[] = []
  const add = (re: RegExp, kind: string) => {
    const m = html.match(re)
    if (m?.[0]) out.push({ url: m[0], kind })
  }
  add(/https?:\/\/(www\.)?facebook\.com\/[^\s"']+/i, 'facebook')
  add(/https?:\/\/(www\.)?instagram\.com\/[^\s"']+/i, 'instagram')
  add(/https?:\/\/(www\.)?linkedin\.com\/[^\s"']+/i, 'linkedin')
  add(/https?:\/\/(www\.)?youtube\.com\/[^\s"']+/i, 'youtube')
  add(/https?:\/\/(www\.)?(x|twitter)\.com\/[^\s"']+/i, 'x')
  return out
}

function pickMeta(html: string) {
  const out: Record<string, string> = {}
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
  if (title) out.title = title.trim()

  const meta = (name: string, attr = 'name') =>
    html.match(
      new RegExp(
        `<meta[^>]+${attr}\\s*=\\s*["']${name}["'][^>]+content\\s*=\\s*["']([^"']+)["'][^>]*>`,
        'i'
      )
    )?.[1]

  out.description =
    meta('description') || meta('og:description', 'property') || ''

  const ldjsons = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ).map((m) => m[1])
  const ldParsed = ldjsons.map((s) => take(s)).filter(Boolean)

  return { meta: out, jsonld: ldParsed }
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

export async function POST(req: NextRequest) {
  try {
    const { freeText = '', links = [] } = await req.json()

    // 🔹 Branches aus DB
    const supabase = await supabaseServer()
    const { data: branchRows } = await supabase
      .from('partner_branches')
      .select('id, name, slug')
      .order('name', { ascending: true })

    const DB_BRANCHES: { id: string; name: string; slug: string }[] = (
      branchRows || []
    ).map((b) => ({
      id: String(b.id),
      name: String(b.name),
      slug: String(b.slug),
    }))

    // Crawling
    const seeds: string[] = []
    for (const raw of links || []) {
      try {
        const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
        seeds.push(u.href)
      } catch {}
    }
    const seed = seeds[0]

    const pages: { url: string; html: string; text: string }[] = []
    const visited = new Set<string>()

    async function addPage(url: string) {
      if (visited.size >= MAX_PAGES || visited.has(url)) return
      visited.add(url)
      const html = await fetchText(url)
      if (!html) return
      pages.push({ url, html, text: truncate(stripHtml(html)) })
    }

    if (seed) {
      await addPage(seed)
      const first = pages[0]?.html || ''
      const nextLinks = extractInternalLinks(first, seed).slice(0, 30)
      for (const u of nextLinks) {
        await addPage(u)
        if (visited.size >= MAX_PAGES) break
      }
    }

    const combined = [freeText, ...pages.map((p) => p.text)]
      .filter(Boolean)
      .join('\n\n')

    const metaBlocks = pages.map((p) => pickMeta(p.html))
    const socials = uniq(
      pages.flatMap((p) =>
        discoverSocials(p.html).map((s) => JSON.stringify(s))
      )
    ).map((s) => JSON.parse(s))

    const emails = uniq(
      (combined.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
      ) || []).slice(0, 5)
    )
    const phones = uniq(
      (combined.match(
        /(\+?\d{1,3}[\s\-]?)?(\(?\d{2,5}\)?[\s\-]?)?[\d\s\-]{5,}/g
      ) || []).slice(0, 5)
    )

    const BRANCH_LIST_TEXT =
      (DB_BRANCHES || [])
        .map((b) => `- ${b.name} (slug: ${b.slug})`)
        .join('\n') || '- (keine Branches gefunden)'

    const sys = 'Du bist ein strenger Extraktor. Antworte ausschließlich mit gültigem JSON.'
    const usr = `
Nutze Beschreibung + gecrawlte Seiten (gekürzt). Berücksichtige Meta/OG/JSON-LD und Socials.

**VERFÜGBARE BRANCHES (feste Auswahl – NUR aus dieser Liste wählen!):**
${BRANCH_LIST_TEXT}

Gib **exakt** dieses JSON zurück:
{
  "company_name": string|null,
  "display_name": string|null,
  "first_name": string|null,
  "last_name": string|null,
  "email": string|null,
  "phone": string|null,
  "website": string|null,
  "address": { "street": string|null, "house_number": string|null, "postal_code": string|null, "city": string|null, "country": string|null },
  "description": string|null,

  "branch_name": string|null,
  "branch_candidates": [string],
  "category_name": string|null,
  "category_candidates": [string],
  "categories_extra": [string],

  "services": [ { "name": string, "priority_percent": number|null } ],
  "links": [ { "url": string, "kind": "website"|"facebook"|"instagram"|"linkedin"|"youtube"|"x"|"other" } ],
  "confidence": number
}

REGELN:
- Keine zusätzlichen Felder, KEIN Markdown.
- **branch_name**: exakt eine Branche aus der DB-Liste.
- **branch_candidates**: exakt [branch_name].
- **category_candidates >= 25** (ohne Duplikate/Plural-Singular-Doppler).
- Services nur mit ganzen Prozenten, Summe ≈ 100.

Heuristik:
Emails: ${emails.join(', ') || '–'}
Phones: ${phones.join(', ') || '–'}
Socials: ${socials
      .map((s: any) => `${s.kind}:${s.url}`)
      .join(', ') || '–'}

META Titel: ${
      metaBlocks.map((m) => m.meta.title).filter(Boolean).join(' | ') || '–'
    }
META Desc: ${
      metaBlocks
        .map((m) => m.meta.description)
        .filter(Boolean)
        .slice(0, 2)
        .join(' | ') || '–'
    }

BESCHREIBUNG:
${freeText}

SEITEN (gekürzt):
${truncate(
  pages.map((p) => `URL: ${p.url}\n${p.text}`).join('\n\n')
)}
`.trim()

    let extracted: any = null
    let modelUsed = 'gpt-4o-mini'

    if (OPENAI_API_KEY) {
      const resLLM = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: usr },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      })

      if (resLLM.ok) {
        const data = await resLLM.json()
        try {
          extracted = JSON.parse(
            data?.choices?.[0]?.message?.content ?? '{}'
          )
        } catch {
          extracted = null
        }
      }
    }

    // Fallback, falls LLM fehlschlägt
    if (!extracted) {
      extracted = {
        company_name: null,
        display_name: null,
        first_name: null,
        last_name: null,
        email: emails[0] || null,
        phone: phones[0] || null,
        website: seed || null,
        address: {
          street: null,
          house_number: null,
          postal_code: null,
          city: null,
          country: null,
        },
        description: freeText || null,
        branch_name: DB_BRANCHES[0]?.name || null,
        branch_candidates: DB_BRANCHES[0]?.name
          ? [DB_BRANCHES[0].name]
          : [],
        category_name: null,
        category_candidates: [],
        categories_extra: [],
        services: [],
        links: [
          ...socials,
          ...(seeds.length
            ? seeds.map((u: string) => ({ url: u, kind: 'website' }))
            : []),
        ],
        confidence: 0.4,
      }
      modelUsed = 'fallback'
    }

    // Robustheit
    if (!extracted.email && emails[0]) extracted.email = emails[0]
    if (!extracted.phone && phones[0]) extracted.phone = phones[0]
    if (!extracted.website && seed) extracted.website = seed

    if (!extracted.links || !extracted.links.length) {
      extracted.links = [
        ...socials,
        ...(seeds.length
          ? seeds.map((u: string) => ({ url: u, kind: 'website' }))
          : []),
      ]
    }

    if (Array.isArray(extracted.services)) {
      extracted.services = extracted.services.map((s: any) => ({
        name: String(s?.name || ''),
        priority_percent: Number.isFinite(Number(s?.priority_percent))
          ? Math.round(Number(s.priority_percent))
          : 0,
      }))
    }

    // Branch-Kandidaten fixen
    if (extracted?.branch_name) {
      extracted.branch_candidates = [extracted.branch_name]
    } else {
      extracted.branch_candidates = []
    }

    // Kategorien >= 25 erzwingen
    const norm = (s: string) => s?.trim().replace(/\s+/g, ' ') || ''
    const dedupe = (arr: string[]) => {
      const set = new Set<string>()
      const out: string[] = []
      for (const x of arr) {
        const n = norm(x)
        if (n && !set.has(n.toLowerCase())) {
          set.add(n.toLowerCase())
          out.push(n)
        }
      }
      return out
    }

    const baseCats = dedupe([
      ...(extracted.category_candidates || []),
      ...(extracted.categories_extra || []),
      extracted.category_name || '',
    ]).filter(Boolean)

    while (baseCats.length < 25) {
      baseCats.push(`Kategorie ${baseCats.length + 1}`)
    }
    extracted.category_candidates = dedupe(baseCats).slice(0, 50)

    return NextResponse.json({
      ok: true,
      extracted,
      model: modelUsed,
      sources: pages.map((p) => ({ url: p.url, bytes: p.text.length })),
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'analyze_failed' },
      { status: 500 }
    )
  }
}
