// src/app/api/cloud/folders/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

// GET optional: alle Ordner holen
export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const { data, error } = await adminClient
    .from('document_folders')
    .select('id, name, sort_order, created_at')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folders: data })
}

// POST: neuen Ordner anlegen
export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const body = await req.json()
  const name = (body.name || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('document_folders')
    .insert({
      user_id: user.id,
      name,
    })
    .select('id, name, sort_order, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folder: data }, { status: 201 })
}

// PATCH: Ordner umbenennen oder sort_order setzen
export async function PATCH(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const body = await req.json()
  const { id, name, sort_order } = body

  if (!id) {
    return NextResponse.json({ error: 'Ordner-ID ist erforderlich.' }, { status: 400 })
  }

  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = (name || '').trim()
  if (sort_order !== undefined) updates.sort_order = sort_order

  const { data, error } = await adminClient
    .from('document_folders')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, sort_order, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folder: data })
}

// DELETE: Ordner löschen (Dokumente fallen per FK-Cascade)
export async function DELETE(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const body = await req.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'Ordner-ID ist erforderlich.' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('document_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
