import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    if (!employeeId) return NextResponse.json({ error: 'employeeId fehlt' }, { status: 400 })

    // nur eingeloggt prüfen (optional: Firmen-/Admin-Check ergänzen)
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { data: emp, error: empErr } = await admin
      .from('employees')
      .select('email')
      .eq('id', employeeId)
      .single()
    if (empErr || !emp) return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })

    if (!emp.email) return NextResponse.json({ linked: false, disabled: false })

    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('email', emp.email)
      .maybeSingle()

    if (!prof?.id) return NextResponse.json({ linked: false, disabled: false })

    // User laden, banned_until auswerten
    const { data: authUser } = await admin.auth.admin.getUserById(prof.id)
    const bannedUntil = (authUser as any)?.user?.banned_until as string | null | undefined
    const disabled = !!(bannedUntil && new Date(bannedUntil).getTime() > Date.now())

    return NextResponse.json({ linked: true, disabled })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Statusprüfung fehlgeschlagen' }, { status: 500 })
  }
}
