// src/app/api/cloud/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

const DEFAULT_FOLDERS = ['Eingehende Rechnungen', 'Ausgehende Rechnungen'] as const

export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const userId = user.id

  // Default-Ordner anlegen, falls nicht vorhanden
  for (let i = 0; i < DEFAULT_FOLDERS.length; i++) {
    const name = DEFAULT_FOLDERS[i]
    await adminClient
      .from('document_folders')
      .upsert(
        {
          user_id: userId,
          name,
          sort_order: i,
        },
        { onConflict: 'user_id,name' }
      )
  }

  // Alle Ordner für User holen
  const { data: folders, error: foldersErr } = await adminClient
    .from('document_folders')
    .select('id, name, sort_order, created_at')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (foldersErr) {
    return NextResponse.json({ error: foldersErr.message }, { status: 500 })
  }

  // Dokumente für den ersten Ordner holen (falls vorhanden)
  let documents: any[] = []
  if (folders && folders.length > 0) {
    const firstFolderId = folders[0].id
    const { data: docs, error: docsErr } = await adminClient
      .from('documents')
      .select('id, folder_id, name, path, size, content_type, uploaded_at')
      .eq('user_id', userId)
      .eq('folder_id', firstFolderId)
      .order('uploaded_at', { ascending: false })

    if (!docsErr && docs) {
      documents = docs
    }
  }

  return NextResponse.json({ folders, documents })
}
