import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY!  // Admin
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

export async function POST(req: Request) {
  try {
    const { employeeId } = await req.json() as { employeeId?: string }
    if (!employeeId) return NextResponse.json({ error: 'employeeId fehlt' }, { status: 400 })

    // nur eingeloggte Admins dürfen einladen
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { data: me } = await admin.from('profiles')
      .select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins dürfen einladen' }, { status: 403 })
    }

    // Mitarbeiter holen
    const { data: emp, error: empErr } = await admin
      .from('employees')
      .select('id, email, first_name, last_name, auth_user_id')
      .eq('id', employeeId)
      .single()
    if (empErr || !emp) return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    if (!emp.email) return NextResponse.json({ error: 'Für den Mitarbeiter ist keine E-Mail hinterlegt.' }, { status: 400 })

    // Wenn bereits verknüpft → Einladung trotzdem erneut senden (falls nötig),
    // aber wir behalten die Verknüpfung bei.
    const { data: invite, error: invErr } = await admin.auth.admin.inviteUserByEmail(emp.email, {
      redirectTo: `${SITE_URL}/willkommen`
    })
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

    // auth_user_id setzen, falls neu
    if (!emp.auth_user_id && invite?.user?.id) {
      await admin.from('employees').update({ auth_user_id: invite.user.id }).eq('id', emp.id)
      // optional: Rolle in profiles = 'mitarbeiter'
      await admin.from('profiles').update({ role: 'mitarbeiter' }).eq('id', invite.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Einladung fehlgeschlagen' }, { status: 500 })
  }
}
