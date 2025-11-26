// src/app/api/vault/credentials/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error: qErr } = await supabase
    .from('vault_credentials')
    .select(
      'id, user_id, label, system, url, username, password, notes, tags, created_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const payload = {
    user_id: user.id,
    label: body.label ?? '',
    system: body.system ?? '',
    url: body.url ?? '',
    username: body.username ?? '',
    password: body.password ?? '', // wichtig
    notes: body.notes ?? '',
    tags: Array.isArray(body.tags) ? body.tags : [],
  }

  const { data, error: insErr } = await supabase
    .from('vault_credentials')
    .insert(payload)
    .select('*')
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
