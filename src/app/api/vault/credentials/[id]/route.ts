// src/app/api/vault/credentials/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Params = {
  params: Promise<{ id: string }>
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const updates = {
    label: body.label ?? '',
    system: body.system ?? '',
    url: body.url ?? '',
    username: body.username ?? '',
    password: body.password ?? '',
    notes: body.notes ?? '',
    tags: Array.isArray(body.tags) ? body.tags : [],
  }

  const { data, error: upErr } = await supabase
    .from('vault_credentials')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error: delErr } = await supabase
    .from('vault_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
