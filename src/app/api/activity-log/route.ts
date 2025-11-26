// src/app/api/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 },
    )
  }

  const url = new URL(req.url)
  const searchParams = url.searchParams

  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const limitRaw = Number(searchParams.get('limit') ?? '50')
  const limit = Math.min(Math.max(limitRaw, 1), 200)
  const from = searchParams.get('from') // ISO-Datum (yyyy-mm-dd)
  const to = searchParams.get('to') // ISO-Datum
  const entityType = searchParams.get('entityType')
  const eventType = searchParams.get('eventType')
  const source = searchParams.get('source')
  const q = searchParams.get('q')

  const fromIdx = (page - 1) * limit
  const toIdx = fromIdx + limit - 1

  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .eq('tenant_user_id', user.id) // RLS / Mandant
    .order('created_at', { ascending: false })

  if (from) {
    // inkl. Start-Tag
    query = query.gte('created_at', from)
  }
  if (to) {
    // bis inkl. End-Tag
    query = query.lte('created_at', to + 'T23:59:59.999Z')
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (eventType) {
    query = query.eq('event_type', eventType)
  }
  if (source) {
    query = query.eq('source', source)
  }
  if (q) {
    query = query.or(
      [
        `actor_email.ilike.%${q}%`,
        `actor_display_name.ilike.%${q}%`,
        `entity_label.ilike.%${q}%`,
        `action.ilike.%${q}%`,
      ].join(','),
    )
  }

  const { data, error, count } = await query.range(fromIdx, toIdx)

  if (error) {
    console.error('activity-log GET error', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    limit,
  })
}
