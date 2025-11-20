// src/app/api/time-entries/[entryId]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await ctx.params
    const supa = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // 1) Eintrag laden
    const { data: entry, error: getEntryErr } = await supa
      .from('time_entries')
      .select('id, user_id, employee_id')
      .eq('id', entryId)
      .single()

    if (getEntryErr || !entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2) Eigentümerschaft über employee prüfen
    const { data: emp } = await supa
      .from('employees')
      .select('id, user_id')
      .eq('id', entry.employee_id)
      .single()

    if (!emp || emp.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 3) Patch bauen (+ Backfill user_id)
    const patch: any = {
      user_id: user.id,
      work_date: body.work_date,
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      break_minutes: Number(body.break_minutes || 0),
      notes: body.notes ?? null,
      project_id: body.project_id ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updErr } = await supa
      .from('time_entries')
      .update(patch)
      .eq('id', entryId)
      .select('id')
      .single()

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message },
        { status: 400 }
      )
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await ctx.params
    const supa = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Eintrag + Mitarbeiter prüfen
    const { data: entry } = await supa
      .from('time_entries')
      .select('id, employee_id')
      .eq('id', entryId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: emp } = await supa
      .from('employees')
      .select('id, user_id')
      .eq('id', entry.employee_id)
      .single()

    if (!emp || emp.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: delErr } = await supa
      .from('time_entries')
      .delete()
      .eq('id', entryId)

    if (delErr) {
      return NextResponse.json(
        { error: delErr.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
