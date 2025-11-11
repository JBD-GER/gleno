import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

// sehr großer Bann (z.B. 100 Jahre ≈ 876000 h)
const HUGE_BAN_DURATION = '876000h'

export async function POST(req: Request) {
  try {
    const { employeeId } = (await req.json()) as { employeeId?: string }
    if (!employeeId) return NextResponse.json({ error: 'employeeId fehlt' }, { status: 400 })

    // optional: nur Admins
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Nur Admins dürfen Zugriffe entziehen' }, { status: 403 })

    // Mitarbeiter -> E-Mail
    const { data: emp, error: empErr } = await admin
      .from('employees')
      .select('email')
      .eq('id', employeeId)
      .single()
    if (empErr || !emp) return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    if (!emp.email)   return NextResponse.json({ error: 'Keine E-Mail beim Mitarbeiter hinterlegt.' }, { status: 400 })

    // E-Mail -> Profile -> auth user id
    const { data: prof } = await admin.from('profiles').select('id').eq('email', emp.email).maybeSingle()
    if (!prof?.id) return NextResponse.json({ success: true, note: 'Kein verknüpfter Zugang gefunden.' })

    // Deaktivieren per Ban
    const { error: updErr } = await admin.auth.admin.updateUserById(prof.id, {
      ban_duration: HUGE_BAN_DURATION,
    })
    if (updErr) return NextResponse.json({ error: updErr.message || 'Deaktivieren fehlgeschlagen' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Entzug fehlgeschlagen' }, { status: 500 })
  }
}
