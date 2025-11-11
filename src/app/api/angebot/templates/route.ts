// ✅ PFAD: src/app/api/angebot/templates/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET -> Liste
export async function GET() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('offer_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST -> Template anlegen (Name Pflicht!)
export async function POST(req: Request) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json().catch(() => ({})) as { name?: string }
  if (!name?.trim()) {
    return NextResponse.json({ message: 'Name fehlt' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('offer_templates')
    .insert({
      user_id: user.id,
      name: name.trim(),
      title: null,
      intro: null,
      tax_rate: 19,
      positions: [],
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation
    if ((error as any).code === '23505') {
      return NextResponse.json({ message: 'Name bereits vergeben' }, { status: 409 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
