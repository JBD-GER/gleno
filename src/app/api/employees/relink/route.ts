import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { employeeId } = (await req.json()) as { employeeId?: string }
    if (!employeeId) return NextResponse.json({ error: 'employeeId fehlt' }, { status: 400 })

    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Nur Admins dürfen reaktivieren' }, { status: 403 })

    const { data: emp } = await admin.from('employees').select('email').eq('id', employeeId).single()
    if (!emp?.email) return NextResponse.json({ error: 'Mitarbeiter/E-Mail nicht gefunden' }, { status: 404 })

    const { data: prof } = await admin.from('profiles').select('id').eq('email', emp.email).maybeSingle()
    if (!prof?.id) return NextResponse.json({ success: true, note: 'Kein verknüpfter Zugang gefunden.' })

    const { error: updErr } = await admin.auth.admin.updateUserById(prof.id, {
      ban_duration: 'none', // Ban entfernen
    })
    if (updErr) return NextResponse.json({ error: updErr.message || 'Reaktivieren fehlgeschlagen' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Reaktivieren fehlgeschlagen' }, { status: 500 })
  }
}
