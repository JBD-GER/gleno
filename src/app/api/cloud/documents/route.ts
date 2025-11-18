// src/app/api/cloud/documents/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

// GET ?folder_id=...
export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const url = new URL(req.url)
  const folderId = url.searchParams.get('folder_id')

  if (!folderId) {
    return NextResponse.json({ error: 'folder_id ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('documents')
    .select('id, folder_id, name, path, size, content_type, uploaded_at')
    .eq('user_id', user.id)
    .eq('folder_id', folderId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data })
}

// POST: Metadaten nach erfolgreichem Upload speichern
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
  const { folder_id, name, path, size, content_type } = body

  if (!folder_id || !name || !path) {
    return NextResponse.json(
      { error: 'folder_id, name und path sind erforderlich.' },
      { status: 400 }
    )
  }

  const { data, error } = await adminClient
    .from('documents')
    .insert({
      user_id: user.id,
      folder_id,
      name,
      path,
      size,
      content_type,
    })
    .select('id, folder_id, name, path, size, content_type, uploaded_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: data }, { status: 201 })
}

// DELETE: Dokument (Metadaten + Storage) löschen
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
  const { id, path } = body

  if (!id || !path) {
    return NextResponse.json({ error: 'id und path sind erforderlich.' }, { status: 400 })
  }

  // 1) Metadaten löschen
  const { error: delErr } = await adminClient
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  // 2) Storage-Objekt löschen (best effort)
  const { error: storageErr } = await adminClient.storage
    .from('cloud')
    .remove([path])

  if (storageErr) {
    // nur loggen – kein Fehler, damit UI nicht hängen bleibt
    console.error('Storage delete error', storageErr.message)
  }

  return NextResponse.json({ success: true })
}
