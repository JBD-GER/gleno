// src/app/api/profiles/ensure/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

/**
 * POST /api/profiles/ensure
 * - holt den aktuellen Auth-User (Cookie via supabaseServer)
 * - prüft, ob es einen profiles-Eintrag gibt
 * - wenn nicht, legt ihn an (Rolle = user_metadata.role || 'konsument')
 * - gibt { profile, role } zurück
 */
export async function POST() {
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  // Profil holen
  const { data: existing, error: selErr } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ profile: existing, role: existing.role }, { status: 200 })
  }

  // falls noch nicht vorhanden → anlegen
  const role = (user.user_metadata as any)?.role ?? 'konsument'
  const { data: inserted, error: insErr } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      role,
      terms_accepted: false,
      privacy_accepted: false,
      plan: 'free',
      subscription_status: 'inactive'
    }, { onConflict: 'id' })
    .select('id, email, role')
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ profile: inserted, role: inserted.role }, { status: 201 })
}
