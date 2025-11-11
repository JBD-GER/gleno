// ✅ PFAD: src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ message: error?.message ?? 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, any> = {}

  // Kundennummer NIE änderbar
  if ('customer_number' in body) delete body.customer_number

  // Status nur setzen, wenn sinnvoller, nicht-leerer String
  if (body.status !== undefined) {
    const s = typeof body.status === 'string' ? body.status.trim() : body.status
    if (typeof s === 'string' && s !== '') updates.status = s
  }

  // explizit erlaubte Felder
  for (const f of [
    'company',
    'first_name', 'last_name', 'email', 'phone',
    'street', 'house_number', 'postal_code', 'city', 'country',
    'notes',
  ] as const) {
    if (f in body) {
      const v = body[f]
      updates[f] = typeof v === 'string' ? v.trim() : v
    }
  }

  // Adresse neu zusammensetzen
  const s  = updates.street       ?? body.street
  const hn = updates.house_number ?? body.house_number
  const pc = updates.postal_code  ?? body.postal_code
  const ct = updates.city         ?? body.city
  const co = updates.country      ?? body.country
  if (s && hn && pc && ct) {
    updates.address = `${s} ${hn}, ${pc} ${ct}${co ? `, ${co}` : ''}`
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ message: 'Kunde nicht gefunden oder nicht aktualisiert.' }, { status: 404 })
  }
  return NextResponse.json(data[0], { status: 200 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  return NextResponse.json({ message: 'Kunde endgültig gelöscht' }, { status: 200 })
}
