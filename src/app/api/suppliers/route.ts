// src/app/api/suppliers/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_email, contact_phone, address, notes, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const payload = {
    name: (body?.name ?? '').toString().trim(),
    contact_email: body?.contact_email ?? null,
    contact_phone: body?.contact_phone ?? null,
    address: body?.address ?? null,
    notes: body?.notes ?? null,
    user_id: user.id,
  }

  if (!payload.name) {
    return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('suppliers').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
