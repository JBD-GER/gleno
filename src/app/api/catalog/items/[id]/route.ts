import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---------- PUT: Update ----------
export async function PUT(req: Request, ctx: any) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    // id aus params oder als Fallback aus der URL
    const params = (ctx?.params ?? {}) as { id?: string }
    const id =
      params.id ||
      new URL(req.url).pathname.split('/').filter(Boolean).slice(-1)[0]

    if (!id) {
      return NextResponse.json({ message: 'Fehlende ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({} as any))

    const updates: any = {
      kind:
        body?.kind === 'service'
          ? 'service'
          : body?.kind === 'product'
          ? 'product'
          : undefined,
      name:
        body?.name !== undefined ? String(body.name).trim() : undefined,
      unit:
        body?.unit !== undefined ? String(body.unit).trim() : undefined,
      unit_price:
        body?.unit_price !== undefined ? Number(body.unit_price) || 0 : undefined,
      description:
        body?.description !== undefined
          ? String(body.description).trim()
          : undefined,
    }

    // undefined-Felder entfernen
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k])

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'Keine Änderungen' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('catalog_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || 'Fehler' },
      { status: 500 }
    )
  }
}

// ---------- DELETE ----------
export async function DELETE(req: Request, ctx: any) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const params = (ctx?.params ?? {}) as { id?: string }
    const id =
      params.id ||
      new URL(req.url).pathname.split('/').filter(Boolean).slice(-1)[0]

    if (!id) {
      return NextResponse.json({ message: 'Fehlende ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('catalog_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || 'Fehler' },
      { status: 500 }
    )
  }
}
