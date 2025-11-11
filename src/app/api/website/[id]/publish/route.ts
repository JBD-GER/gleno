// src/app/api/website/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // id aus der URL parsen: /api/website/:id/publish
  const { pathname } = new URL(req.url)
  const id = pathname.match(/\/api\/website\/([^/]+)\/publish\/?$/)?.[1]

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('websites')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
