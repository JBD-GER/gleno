import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type ParamsP = Promise<{ id: string }>

/** PUT: Mitarbeiter-Zuweisungen komplett ersetzen (Owner-only) */
export async function PUT(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prüfen: gehört Projekt dem Owner?
  const { data: proj } = await supa.from('projects').select('id, user_id').eq('id', id).single()
  if (!proj || proj.user_id !== user.id) {
    return NextResponse.json({ error: 'Only owner can assign employees' }, { status: 403 })
  }

  const { employee_ids } = (await req.json().catch(() => ({}))) as { employee_ids?: string[] }
  if (!Array.isArray(employee_ids)) {
    return NextResponse.json({ error: 'employee_ids[] required' }, { status: 400 })
  }

  // Existierende löschen, neue setzen
  const del = await supa.from('project_employees').delete().eq('project_id', id)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 })

  if (employee_ids.length) {
    // Optional: validieren, dass Mitarbeiter zur gleichen Firma gehören
    const { data: valid } = await supa
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .in('id', employee_ids)

    const validSet = new Set((valid ?? []).map(v => v.id))
    const filtered = employee_ids.filter(eid => validSet.has(eid))
    const rows = filtered.map(eid => ({ project_id: id, employee_id: eid }))

    if (rows.length) {
      const { error } = await supa.from('project_employees').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}