// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/customers?q=&status=&limit=&offset=
 * - listet Kunden des eingeloggten Users
 * - einfache Suche in name/email/company/customer_number
 * - paginiert mit limit/offset (max 200)
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const status = (sp.get('status') || '').trim()
  const limit = Math.min(Math.max(Number(sp.get('limit') || 50), 1), 200)
  const offset = Math.max(Number(sp.get('offset') || 0), 0)

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  if (q) {
    // einfache OR-Suche
    query = query.or([
      `first_name.ilike.%${q}%`,
      `last_name.ilike.%${q}%`,
      `email.ilike.%${q}%`,
      `company.ilike.%${q}%`,
      `customer_number.ilike.%${q}%`,
    ].join(','))
  }

  if (offset) query = query.range(offset, offset + limit - 1)
  else query = query.limit(limit)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ items: data ?? [], count: count ?? 0 }, { status: 200 })
}

/**
 * POST /api/customers
 * Body: {
 *   company?, first_name, last_name, email?, phone?, street?, house_number?, postal_code?, city?, country?, notes?, status?
 * }
 * - Validiert: first_name/last_name + (email || phone)
 * - Kundennummer wird vom DB-Trigger/Function vergeben (API setzt sie nie)
 * - Status: fällt auf 'Lead' zurück, wenn nicht sinnvoll übergeben
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const first_name = String(body.first_name ?? '').trim()
  const last_name  = String(body.last_name  ?? '').trim()
  const email      = (body.email  ? String(body.email).trim()  : '')
  const phone      = (body.phone  ? String(body.phone).trim()  : '')

  if (!first_name || !last_name) {
    return NextResponse.json({ message: 'first_name & last_name sind erforderlich.' }, { status: 422 })
  }
  if (!email && !phone) {
    return NextResponse.json({ message: 'Bitte mindestens E-Mail oder Telefon angeben.' }, { status: 422 })
  }

  const s  = body.street       ? String(body.street).trim()       : null
  const hn = body.house_number ? String(body.house_number).trim() : null
  const pc = body.postal_code  ? String(body.postal_code).trim()  : null
  const ct = body.city         ? String(body.city).trim()         : null
  const co = body.country      ? String(body.country).trim()      : null

  const address =
    s && hn && pc && ct
      ? `${s} ${hn}, ${pc} ${ct}${co ? `, ${co}` : ''}`
      : null

  // Status nur übernehmen, wenn nicht leer/whitespace – sonst 'Lead'
  const rawStatus = typeof body.status === 'string' ? body.status.trim() : ''
  const safeStatus = rawStatus ? rawStatus : 'Lead'

  // Niemals customer_number setzen – das macht der Trigger
  const payload: Record<string, any> = {
    user_id: user.id,
    company: (body.company ? String(body.company).trim() : null),
    first_name,
    last_name,
    email: email || null,
    phone: phone || null,
    street: s,
    house_number: hn,
    postal_code: pc,
    city: ct,
    country: co,
    address,
    notes: (body.notes ? String(body.notes).trim() : null),
    status: safeStatus,
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select('id, customer_number')
    .single()

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  // gibt z. B. { id, customer_number } zurück
  return NextResponse.json(data, { status: 201 })
}
