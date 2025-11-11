// src/app/api/complete-invite/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

export async function POST() {
  try {
    // eingeloggter (eingeladener) User
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Keine Session' }, { status: 401 })

    // existiert Profil schon?
    const { data: existing } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (existing?.id) return NextResponse.json({ success: true }) // nichts mehr zu tun

    // Name aus employees per E-Mail holen (optional)
    let first_name: string | null = null
    let last_name: string | null = null
    if (user.email) {
      const { data: emp } = await admin
        .from('employees')
        .select('first_name,last_name')
        .eq('email', user.email)
        .maybeSingle()
      if (emp) { first_name = emp.first_name ?? null; last_name = emp.last_name ?? null }
    }

    // Profil anlegen (role = mitarbeiter)
    const { error: upErr } = await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      role: 'mitarbeiter',
      first_name,
      last_name,
      terms_accepted: true,
      privacy_accepted: true,
      subscription_status: 'none',  // Mitarbeiter braucht keine eigene Subscription
      plan: 'starter'
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invite-Abschluss fehlgeschlagen' }, { status: 500 })
  }
}
