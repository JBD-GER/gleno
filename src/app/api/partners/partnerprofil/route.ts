import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type BranchRow = { id: string; name: string; slug: string }
type CategoryRow = { id: string; name: string; slug: string }
type LinkRow = { id?: string; url: string; kind?: string }
type ServiceRow = { id?: string; name: string; priority_percent: number | null }

function safeText(v: any) {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

export async function GET() {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) return NextResponse.json({ ok:false, error:uErr.message }, { status:401 })
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    // Partner des Owners holen (neueste zuerst)
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select(`
        id, status, company_name, display_name, first_name, last_name,
        email, phone, website, description, street, house_number, postal_code, city, country,
        branch_id, category_id, logo_path, created_at, updated_at,
        partner_branches!partners_branch_id_fkey ( id, name, slug )
      `)
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pErr) throw pErr
    if (!partner) return NextResponse.json({ ok:false, error:'no_partner' }, { status:404 })

    const partner_id = String(partner.id)

    // --- Branch als Objekt normalisieren (Relation kann Array sein) ---
    const rel = (partner as any).partner_branches as BranchRow | BranchRow[] | null | undefined
    let branch: BranchRow | null = null
    if (Array.isArray(rel)) {
      if (rel.length > 0 && rel[0]?.id) branch = { id: String(rel[0].id), name: String(rel[0].name), slug: String(rel[0].slug) }
    } else if (rel && (rel as any).id) {
      branch = { id: String((rel as any).id), name: String((rel as any).name), slug: String((rel as any).slug) }
    }

    // Links
    const { data: links } = await supabase
      .from('partner_links')
      .select('id, url, kind')
      .eq('partner_id', partner_id)
      .order('created_at', { ascending: true })

    // Services
    const { data: services } = await supabase
      .from('partner_services')
      .select('id, name, priority_percent')
      .eq('partner_id', partner_id)
      .order('created_at', { ascending: true })

    // Kategorien via Mapping
    const { data: categoriesMap } = await supabase
      .from('partner_category_map')
      .select('category_id, partner_categories!inner(id, name, slug)')
      .eq('partner_id', partner_id)

    const categories: CategoryRow[] = (categoriesMap || [])
      .map((r: any) => r?.partner_categories)
      .filter((c: any) => c && c.id)
      .map((c: any) => ({ id: String(c.id), name: String(c.name), slug: String(c.slug) }))

    // Logo URLs (public + signed fallback)
    let logo_url: string | null = null
    let logo_signed_url: string | null = null
    if (partner.logo_path) {
      const pub = supabase.storage.from('markt').getPublicUrl(partner.logo_path)
      logo_url = pub.data?.publicUrl || null

      const signed = await supabase.storage
        .from('markt')
        .createSignedUrl(partner.logo_path, 60 * 60 * 24 * 7) // 7 Tage
      logo_signed_url = signed.data?.signedUrl || null
    }

    const dto = {
      partner_id,
      status: partner.status,
      company_name: partner.company_name,
      display_name: partner.display_name,
      first_name: partner.first_name,
      last_name: partner.last_name,
      email: partner.email,
      phone: partner.phone,
      website: partner.website,
      description: partner.description,
      address: {
        street: partner.street,
        house_number: partner.house_number,
        postal_code: partner.postal_code,
        city: partner.city,
        country: partner.country
      },
      branch,
      categories,
      services: (services || []).map(s => ({ id: s.id, name: s.name, priority_percent: s.priority_percent })) as ServiceRow[],
      links: (links || []).map(l => ({ id: l.id, url: l.url, kind: l.kind })) as LinkRow[],
      logo_path: partner.logo_path,
      logo_url,
      logo_signed_url,
      created_at: partner.created_at,
      updated_at: partner.updated_at
    }

    return NextResponse.json({ ok:true, partner: dto })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'load_failed' }, { status:500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) return NextResponse.json({ ok:false, error:uErr.message }, { status:401 })
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    const body = await req.json().catch(()=> ({}))
    const {
      display_name, email, phone, website, description,
      address = {},
      links = [],
      services = []
    } = body || {}

    // Partner des Owners holen
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pErr) throw pErr
    if (!partner) return NextResponse.json({ ok:false, error:'no_partner' }, { status:404 })

    const partner_id = String(partner.id)

    // 1) Partner aktualisieren
    const upd = {
      display_name: safeText(display_name),
      email: safeText(email),
      phone: safeText(phone),
      website: safeText(website),
      description: safeText(description),
      street: safeText(address?.street),
      house_number: safeText(address?.house_number),
      postal_code: safeText(address?.postal_code),
      city: safeText(address?.city),
      country: safeText(address?.country),
      updated_at: new Date().toISOString()
    }

    const { error: updErr } = await supabase
      .from('partners')
      .update(upd)
      .eq('id', partner_id)
    if (updErr) throw updErr

    // 2) Links ersetzen
    const { error: delLinksErr } = await supabase
      .from('partner_links')
      .delete()
      .eq('partner_id', partner_id)
    if (delLinksErr) throw delLinksErr

    const linkRows = (Array.isArray(links) ? links : [])
      .map((l:any) => ({ partner_id, url: String(l.url || '').trim(), kind: (l.kind || 'website') as string }))
      .filter(r => !!r.url)
    if (linkRows.length) {
      const { error: insLinksErr } = await supabase
        .from('partner_links')
        .insert(linkRows)
      if (insLinksErr) throw insLinksErr
    }

    // 3) Services ersetzen
    const { error: delServErr } = await supabase
      .from('partner_services')
      .delete()
      .eq('partner_id', partner_id)
    if (delServErr) throw delServErr

    const svcRows = (Array.isArray(services) ? services : [])
      .map((s:any) => ({
        partner_id,
        name: String(s.name || '').trim(),
        description: null,
        price_min: null,
        price_max: null,
        unit: null,
        priority_percent: Number.isFinite(Number(s?.priority_percent)) ? Math.round(Number(s.priority_percent)) : null
      }))
      .filter(r => !!r.name)
    if (svcRows.length) {
      const { error: insServErr } = await supabase
        .from('partner_services')
        .insert(svcRows)
      if (insServErr) throw insServErr
    }

    return NextResponse.json({ ok:true })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'update_failed' }, { status:500 })
  }
}
