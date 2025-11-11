// src/app/api/users/logo/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

// Wichtig: App Router explizit auf Node laufen lassen
export const runtime = 'nodejs'
// Optional: Cache vermeiden bei SSR-Proxies
export const dynamic = 'force-dynamic'

const BUCKET = 'logo'

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function requireEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

/**
 * Admin-Client nur serverseitig mit Service Role Key
 */
function supabaseAdmin() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'users-logo-route' } },
  })
}

/**
 * Hilfsfunktion: Dateiname sicher aufbereiten
 */
function safeName(input: string) {
  const base = input
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || 'upload'
}

/**
 * POST /api/users/logo
 * - lädt eine neue Datei hoch
 * - speichert logo_path in profiles
 */
export async function POST(req: Request) {
  try {
    // 1) Session prüfen (User muss eingeloggt sein)
    const sb = await supabaseServer()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return json(401, { ok: false, error: 'Nicht eingeloggt' })
    }

    // 2) Datei holen
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return json(400, { ok: false, error: 'Keine Datei gefunden (FormData "file" fehlt)' })
    }

    // 3) Datei → ArrayBuffer (Node-kompatibel) + Content-Type
    const contentType = file.type || 'application/octet-stream'
    const arrayBuffer = await file.arrayBuffer()

    // 4) Pfad bauen
    const originalName = (file as any).name ? String((file as any).name) : 'logo'
    const safe = safeName(originalName)
    const ext = safe.includes('.') ? '' : (contentType.split('/')[1] ? '.' + contentType.split('/')[1] : '')
    const path = `${user.id}/${Date.now()}_${safe}${ext}`

    // 5) Upload
    const admin = supabaseAdmin()
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        upsert: true,
        contentType,
        cacheControl: '3600',
      })

    if (uploadErr) {
      // Häufige Ursache: falscher Service Role Key / fehlender Bucket
      return json(500, { ok: false, error: `Upload fehlgeschlagen: ${uploadErr.message}` })
    }

    // 6) DB aktualisieren
    const { error: dbErr } = await admin
      .from('profiles')
      .update({ logo_path: path })
      .eq('id', user.id)

    if (dbErr) {
      // Rollback (optional)
      await admin.storage.from(BUCKET).remove([path]).catch(() => {})
      return json(500, { ok: false, error: `DB-Update fehlgeschlagen: ${dbErr.message}` })
    }

    return json(200, { ok: true, logo_path: path })
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || 'unknown_error' })
  }
}

/**
 * DELETE /api/users/logo
 * - löscht das bestehende Logo aus Storage
 * - setzt logo_path in profiles auf NULL
 */
export async function DELETE() {
  try {
    // 1) Auth
    const sb = await supabaseServer()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return json(401, { ok: false, error: 'Nicht eingeloggt' })
    }

    // 2) Aktuellen Pfad lesen
    const admin = supabaseAdmin()
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('logo_path')
      .eq('id', user.id)
      .single()

    if (profErr) return json(500, { ok: false, error: profErr.message })
    const path = prof?.logo_path
    if (!path) return json(400, { ok: false, error: 'Kein Logo hinterlegt' })

    // 3) Datei löschen
    const { error: removeErr } = await admin.storage.from(BUCKET).remove([path])
    if (removeErr) return json(500, { ok: false, error: removeErr.message })

    // 4) DB zurücksetzen
    const { error: dbErr } = await admin
      .from('profiles')
      .update({ logo_path: null })
      .eq('id', user.id)

    if (dbErr) return json(500, { ok: false, error: dbErr.message })

    return json(200, { ok: true })
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || 'unknown_error' })
  }
}
