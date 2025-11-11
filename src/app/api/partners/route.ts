import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/* ================= Types & Helpers ================= */
type BranchRow = { id: string; name: string; slug: string }
type CategoryRow = { id: string; name: string; slug: string }

function slugify(input: string) {
  return String(input || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeLabel(s: unknown) {
  const cleaned = String(s || '').trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned.toLowerCase().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function uniqueNormalized(arr: unknown[]) {
  const set = new Set<string>()
  const out: string[] = []
  for (const raw of arr || []) {
    const n = normalizeLabel(raw)
    if (!n) continue
    const key = n.toLowerCase()
    if (!set.has(key)) { set.add(key); out.push(n) }
  }
  return out
}

function safeText(v: any) {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

const MAX_CATEGORIES = 25

/* ===================== GET ====================== */
export async function GET() {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 401 })
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select(`
        id, owner_user_id, status,
        company_name, display_name, first_name, last_name,
        email, phone, website, description,
        street, house_number, postal_code, city, country,
        branch_id, category_id,
        settings, logo_path,
        created_at, updated_at
      `)
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pErr) throw pErr
    if (!partner) return NextResponse.json({ ok: true, partner: null })

    const partner_id = String(partner.id)

    // Primäre Branche (Objekt)
    let branch: BranchRow | null = null
    if (partner.branch_id) {
      const { data: br } = await supabase
        .from('partner_branches')
        .select('id, name, slug')
        .eq('id', partner.branch_id)
        .maybeSingle()
      if (br) branch = { id: String(br.id), name: String(br.name), slug: String(br.slug) }
    }

    // ALLE gewählten Branchen (Mapping)
    const { data: branchMap } = await supabase
      .from('partner_branch_map')
      .select('partner_branches!inner(id,name,slug), branch_id')
      .eq('partner_id', partner_id)

    const branches: BranchRow[] = (branchMap || [])
      .map((r: any) => r?.partner_branches)
      .filter(Boolean)
      .map((b: any) => ({ id: String(b.id), name: String(b.name), slug: String(b.slug) }))

    // Kategorien (Mapping)
    const { data: categoriesMap } = await supabase
      .from('partner_category_map')
      .select('partner_categories!inner(id, name, slug)')
      .eq('partner_id', partner_id)

    const categories: CategoryRow[] = (categoriesMap || [])
      .map((r: any) => r?.partner_categories)
      .filter(Boolean)
      .map((c: any) => ({ id: String(c.id), name: String(c.name), slug: String(c.slug) }))

    // Services
    const { data: servicesRows } = await supabase
      .from('partner_services')
      .select('id, name, priority_percent')
      .eq('partner_id', partner_id)
      .order('created_at', { ascending: true })

    const services = (servicesRows || []).map(s => ({
      id: s.id ? String(s.id) : undefined,
      name: String(s.name || ''),
      priority_percent: Number.isFinite(Number(s.priority_percent)) ? Number(s.priority_percent) : 0
    }))

    // Links
    const { data: linkRows } = await supabase
      .from('partner_links')
      .select('id, url, kind')
      .eq('partner_id', partner_id)
      .order('created_at', { ascending: true })

    const links = (linkRows || []).map(l => ({
      id: l.id ? String(l.id) : undefined,
      url: String(l.url || ''),
      kind: l.kind || 'website'
    }))

    // Logo – signierte URL
    let logo_url: string | null = null
    if (partner.logo_path) {
      try {
        const signed = await supabase
          .storage
          .from('markt')
          .createSignedUrl(partner.logo_path, 60 * 60 * 24 * 7)
        logo_url = signed.data?.signedUrl || null
      } catch { logo_url = null }
    }

    const dto = {
      partner_id,
      status: partner.status ?? null,
      company_name: partner.company_name ?? null,
      display_name: partner.display_name ?? null,
      first_name: partner.first_name ?? null,
      last_name: partner.last_name ?? null,
      email: partner.email ?? null,
      phone: partner.phone ?? null,
      website: partner.website ?? null,
      description: partner.description ?? null,
      address: {
        street: partner.street ?? null,
        house_number: partner.house_number ?? null,
        postal_code: partner.postal_code ?? null,
        city: partner.city ?? null,
        country: partner.country ?? null,
      },
      // flat (legacy)
      street: partner.street ?? null,
      house_number: partner.house_number ?? null,
      postal_code: partner.postal_code ?? null,
      city: partner.city ?? null,
      country: partner.country ?? null,

      branch,          // primär
      branches,        // ALLE gewählten Branchen
      categories,
      services,
      links,
      logo_path: partner.logo_path ?? null,
      logo_url,
      settings: partner.settings || {},
      created_at: partner.created_at,
      updated_at: partner.updated_at,
    }

    return NextResponse.json({ ok: true, partner: dto })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'load_failed' }, { status: 500 })
  }
}

/* ===================== PATCH ====================== */
/** Aktualisiert Stammdaten + Address + Links + Services
 *  UND synchronisiert:
 *   - partners.branch_id + partner_branch_map anhand branches_selected (max 3)
 *   - partners.category_id + partner_category_map anhand categories_selected (primäre Branche)
 */
export async function PATCH(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 401 })
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const {
      display_name,
      email,
      phone,
      website,
      description,
      address = {},
      // optional flach:
      street, house_number, postal_code, city, country,
      links = [],
      services = [],
      branches_selected = [],
      categories_selected = [],
    } = body || {}

    // Partner ermitteln
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id, branch_id, category_id, settings')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pErr) throw pErr
    if (!partner) return NextResponse.json({ ok: false, error: 'no_partner' }, { status: 404 })

    const partner_id = String(partner.id)

    // Settings-Inhalte (nur zur Anzeige, tatsächliche Persistenz folgt unten)
    const cleanBranches = uniqueNormalized(branches_selected).slice(0, 3)
    const cleanCategories = uniqueNormalized(categories_selected).slice(0, MAX_CATEGORIES)

    // Adresse robust zusammensetzen
    const addr = {
      street: safeText((address as any)?.street) ?? safeText(street),
      house_number: safeText((address as any)?.house_number) ?? safeText(house_number),
      postal_code: safeText((address as any)?.postal_code) ?? safeText(postal_code),
      city: safeText((address as any)?.city) ?? safeText(city),
      country: safeText((address as any)?.country) ?? safeText(country),
    }

    /* ---------- 1) Branches (max 3) ---------- */
    let primaryBranchId: string | null = null
    let selectedBranchIds: string[] = []

    if (cleanBranches.length) {
      const branchSlugs = cleanBranches.map(slugify)
      const { data: brRows } = await supabase
        .from('partner_branches')
        .select('id, slug, name')
        .in('slug', branchSlugs)

      const bySlug = new Map((brRows || []).map(b => [b.slug, String(b.id)]))
      primaryBranchId = bySlug.get(branchSlugs[0]) ?? null
      selectedBranchIds = branchSlugs.map(sl => bySlug.get(sl)).filter(Boolean) as string[]

      // vorhandene Mappings holen
      const { data: existingBM } = await supabase
        .from('partner_branch_map')
        .select('branch_id')
        .eq('partner_id', partner_id)
      const existingIds = new Set((existingBM || []).map(r => String(r.branch_id)))

      // add & delete berechnen
      const toAdd = selectedBranchIds.filter(id => !existingIds.has(id))
      const toDelete = [...existingIds].filter(id => !selectedBranchIds.includes(id))

      if (toAdd.length) {
        await supabase.from('partner_branch_map')
          .upsert(toAdd.map(branch_id => ({ partner_id, branch_id })), { onConflict: 'partner_id,branch_id' })
      }
      if (toDelete.length) {
        await supabase.from('partner_branch_map')
          .delete()
          .eq('partner_id', partner_id)
          .in('branch_id', toDelete)
      }
    } else {
      // keine Auswahl -> alles löschen
      await supabase.from('partner_branch_map').delete().eq('partner_id', partner_id)
      primaryBranchId = null
      selectedBranchIds = []
    }

    /* ---------- 2) Kategorien (entlang primärer Branche) ---------- */
    let primaryCategoryId: string | null = null
    if (cleanCategories.length && (primaryBranchId || partner.branch_id)) {
      const useBranchId = primaryBranchId || String(partner.branch_id)
      const catSlugs = cleanCategories.map(slugify)

      const { data: existingCats } = await supabase
        .from('partner_categories')
        .select('id, slug')
        .eq('branch_id', useBranchId)
        .in('slug', catSlugs)

      const bySlug = new Map((existingCats || []).map(c => [c.slug, String(c.id)]))

      // fehlende Kategorien anlegen (RLS tolerant)
      const toInsert = catSlugs
        .filter(sl => !bySlug.has(sl))
        .map((sl, i) => ({ branch_id: useBranchId, name: cleanCategories[i], slug: sl }))

      if (toInsert.length) {
        const { data: ins, error: ec2 } = await supabase
          .from('partner_categories')
          .insert(toInsert)
          .select('id, slug')
        if (ec2) {
          const msg = String(ec2.message || '')
          const rlsBlocked = /row-level security|RLS|violates row-level/i.test(msg)
          if (!rlsBlocked) throw ec2
        } else {
          for (const r of (ins || [])) bySlug.set(r.slug, String(r.id))
        }
      }

      const desiredCatIds = catSlugs.map(sl => bySlug.get(sl)).filter(Boolean) as string[]

      // Mapping angleichen
      const { data: existingCM } = await supabase
        .from('partner_category_map')
        .select('category_id')
        .eq('partner_id', partner_id)
      const existingIds = new Set((existingCM || []).map(r => String(r.category_id)))

      const toAdd = desiredCatIds.filter(id => !existingIds.has(id))
      const toDelete = [...existingIds].filter(id => !desiredCatIds.includes(id))

      if (toAdd.length) {
        await supabase.from('partner_category_map')
          .upsert(toAdd.map(category_id => ({ partner_id, category_id })), { onConflict: 'partner_id,category_id' })
      }
      if (toDelete.length) {
        await supabase.from('partner_category_map')
          .delete()
          .eq('partner_id', partner_id)
          .in('category_id', toDelete)
      }

      primaryCategoryId = desiredCatIds[0] ?? null
    } else {
      await supabase.from('partner_category_map').delete().eq('partner_id', partner_id)
      primaryCategoryId = null
    }

    /* ---------- 3) Partner updaten ---------- */
    // Settings anhand tatsächlich gespeicherter Branches (Namen) schreiben:
    let branchesSelectedFinal: string[] = []
    if (selectedBranchIds.length) {
      const { data: got } = await supabase
        .from('partner_branches')
        .select('id,name')
        .in('id', selectedBranchIds)
      branchesSelectedFinal = (got || [])
        .sort((a,b) => selectedBranchIds.indexOf(String(a.id)) - selectedBranchIds.indexOf(String(b.id)))
        .map(r => r.name)
        .slice(0, 3)
    }

    const nextSettings = {
      ...(partner.settings || {}),
      branches_selected: branchesSelectedFinal,
      categories_selected: cleanCategories,
    }

    const upd: any = {
      display_name: safeText(display_name),
      email: safeText(email),
      phone: safeText(phone),
      website: safeText(website),
      description: safeText(description),
      street: addr.street,
      house_number: addr.house_number,
      postal_code: addr.postal_code,
      city: addr.city,
      country: addr.country,
      settings: nextSettings,
      updated_at: new Date().toISOString(),
    }
    if (primaryBranchId !== null) upd.branch_id = primaryBranchId
    if (primaryCategoryId !== null) upd.category_id = primaryCategoryId

    const { error: updErr } = await supabase.from('partners').update(upd).eq('id', partner_id)
    if (updErr) throw updErr

    /* ---------- 4) Links ersetzen ---------- */
    await supabase.from('partner_links').delete().eq('partner_id', partner_id)
    const linkRows = (Array.isArray(links) ? links : [])
      .map((l: any) => ({ partner_id, url: String(l.url || '').trim(), kind: (l.kind || 'website') as string }))
      .filter(r => !!r.url)
    if (linkRows.length) await supabase.from('partner_links').insert(linkRows)

    /* ---------- 5) Services ersetzen ---------- */
    await supabase.from('partner_services').delete().eq('partner_id', partner_id)
    const svcRows = (Array.isArray(services) ? services : [])
      .map((s: any) => ({
        partner_id,
        name: String(s.name || '').trim(),
        description: null,
        price_min: null,
        price_max: null,
        unit: null,
        priority_percent: Number.isFinite(Number(s?.priority_percent))
          ? Math.round(Number(s.priority_percent))
          : null,
      }))
      .filter(r => !!r.name)
    if (svcRows.length) await supabase.from('partner_services').insert(svcRows)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'update_failed' }, { status: 500 })
  }
}

/* ===================== POST (Create) ====================== */
export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      extracted, model,
      display_name, email, phone, website, description,
      address = {},
      branch_name,
      category_name,
      branches_selected = [],
      categories_selected = [],
      links = [],
      services = []
    } = body as any

    // Owner-Profil
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, company_name, first_name, last_name')
      .eq('id', user.id)
      .single()
    if (profErr) throw profErr

    // Branch prüfen
    if (!branch_name) {
      return NextResponse.json({ ok: false, error: 'branch_required' }, { status: 400 })
    }
    const branchSlug = slugify(String(branch_name))
    const { data: branch, error: branchErr } = await supabase
      .from('partner_branches')
      .select('id, name, slug')
      .eq('slug', branchSlug)
      .maybeSingle()
    if (branchErr) throw branchErr
    if (!branch) {
      const like = branchSlug.slice(0, Math.max(2, Math.min(6, branchSlug.length)))
      const { data: suggestions } = await supabase
        .from('partner_branches')
        .select('id, name, slug')
        .ilike('slug', `%${like}%`)
        .limit(6)
      return NextResponse.json({ ok: false, error: 'branch_not_found', suggestions: suggestions || [] }, { status: 400 })
    }
    const branch_id = branch.id

    // Kategorien auflösen
    const mergedCatNames = uniqueNormalized([
      ...categories_selected,
      category_name,
      ...(extracted?.category_candidates || []),
      ...(extracted?.categories_extra || []),
    ]).slice(0, MAX_CATEGORIES)

    const desiredSlugs = mergedCatNames.map(n => slugify(n))

    let bySlug = new Map<string, { id: string, slug: string }>()
    if (desiredSlugs.length) {
      const { data: existingCats, error: ec1 } = await supabase
        .from('partner_categories')
        .select('id, slug')
        .eq('branch_id', branch_id)
        .in('slug', desiredSlugs)
      if (ec1) throw ec1
      for (const c of (existingCats || [])) bySlug.set(c.slug, { id: c.id, slug: c.slug })
    }

    const toInsert: { branch_id: string, name: string, slug: string }[] = []
    for (const name of mergedCatNames) {
      const sl = slugify(name)
      if (bySlug.has(sl)) continue
      const isPlaceholder = /^kategorie\s+\d+$/i.test(name) || /^category\s+\d+$/i.test(name)
      if (isPlaceholder) continue
      toInsert.push({ branch_id, name, slug: sl })
    }

    let inserted: { id: string, slug: string }[] = []
    if (toInsert.length) {
      const { data: ins, error: ec2 } = await supabase
        .from('partner_categories')
        .insert(toInsert)
        .select('id, slug')
      if (ec2) {
        const msg = String(ec2.message || '')
        const rlsBlocked = /row-level security|RLS|violates row-level/i.test(msg)
        if (!rlsBlocked) throw ec2
      } else {
        inserted = ins || []
      }
    }
    for (const c of inserted) bySlug.set(c.slug, c)

    let primaryCategoryId: string | null = null
    const primaryCandidate = category_name ? slugify(normalizeLabel(category_name)) : null
    if (primaryCandidate && bySlug.has(primaryCandidate)) {
      primaryCategoryId = bySlug.get(primaryCandidate)!.id
    } else {
      const firstValid = mergedCatNames.map(n => slugify(n)).find(sl => bySlug.has(sl))
      primaryCategoryId = firstValid ? bySlug.get(firstValid)!.id : null
    }

    const { street, house_number, postal_code, city, country } = (address || {})
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .insert({
        owner_user_id: profile!.id,
        status: 'pending',
        company_name: profile?.company_name ?? null,
        display_name: display_name || profile?.company_name || null,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        street: street || null,
        house_number: house_number || null,
        postal_code: postal_code || null,
        city: city || null,
        country: country || null,
        description: description || null,
        branch_id: branch_id,
        category_id: primaryCategoryId,
        settings: {
          branches_selected: uniqueNormalized(branches_selected).slice(0, 3),
          categories_selected: mergedCatNames,
        }
      })
      .select('id')
      .single()
    if (pErr) throw pErr
    const partner_id = partner.id

    // Links
    if (Array.isArray(links) && links.length) {
      const rows = links
        .filter((l: any) => l?.url)
        .map((l: any) => ({ partner_id, url: String(l.url), kind: l.kind || 'website' }))
      if (rows.length) {
        const { error: lErr } = await supabase.from('partner_links').insert(rows)
        if (lErr) throw lErr
      }
    } else if (website) {
      await supabase.from('partner_links').insert({ partner_id, url: website, kind: 'website' })
    }

    // Services
    if (Array.isArray(services) && services.length) {
      const rows = services.map((s: any) => ({
        partner_id,
        name: String(s.name || ''),
        description: null,
        price_min: null,
        price_max: null,
        unit: null,
        priority_percent: Number.isFinite(Number(s?.priority_percent))
          ? Math.round(Number(s.priority_percent))
          : null
      }))
      const { error: sErr } = await supabase.from('partner_services').insert(rows)
      if (sErr) throw sErr
    }

    // AI-Findings optional
    if (extracted) {
      await supabase.from('partner_ai_findings').insert({
        partner_id,
        raw_text: null,
        sources: null,
        extracted,
        model: model || 'unknown',
        confidence: Number(extracted?.confidence ?? 0)
      })
    }

    // Branch-Map
    try {
      const chosenBranchSlugs = uniqueNormalized(branches_selected).slice(0, 3).map(slugify)
      if (!chosenBranchSlugs.includes(branch.slug)) chosenBranchSlugs.unshift(branch.slug)
      if (chosenBranchSlugs.length) {
        const { data: branchRowsForMap } = await supabase
          .from('partner_branches')
          .select('id, slug')
          .in('slug', chosenBranchSlugs)
        const branchMapRows = (branchRowsForMap || []).map(b => ({ partner_id, branch_id: b.id }))
        if (branchMapRows.length) {
          await supabase.from('partner_branch_map').upsert(branchMapRows, { onConflict: 'partner_id,branch_id' })
        }
      }
    } catch {}

    // Category-Map
    try {
      const catSlugs = uniqueNormalized(categories_selected).slice(0, MAX_CATEGORIES).map(slugify)
      if (catSlugs.length) {
        const { data: catRows } = await supabase
          .from('partner_categories')
          .select('id, slug')
          .eq('branch_id', branch_id)
          .in('slug', catSlugs)
        const mapRows = (catRows || []).map(c => ({ partner_id, category_id: c.id }))
        if (mapRows.length) {
          await supabase.from('partner_category_map').upsert(mapRows, { onConflict: 'partner_id,category_id' })
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, partner_id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'create_failed' }, { status: 500 })
  }
}
