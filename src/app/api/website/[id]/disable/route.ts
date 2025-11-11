// src/app/api/website/[id]/disable/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // id aus der URL parsen: /api/website/:id/disable
  const { pathname } = new URL(req.url)
  const id = pathname.match(/\/api\/website\/([^/]+)\/disable\/?$/)?.[1]

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('websites')
    .update({ status: 'disabled' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
