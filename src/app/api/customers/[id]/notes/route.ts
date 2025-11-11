// ✅ PFAD: src/app/api/customers/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('customer_notes')
    .select('id, content, created_at')
    .eq('user_id', user.id)
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  return NextResponse.json(data ?? [], { status: 200 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const content = (body?.content ?? '').toString().trim()
  if (!content) {
    return NextResponse.json({ message: 'Inhalt fehlt.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customer_notes')
    .insert({
      user_id: user.id,
      customer_id: id,
      content,
    })
    .select('id, content, created_at')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
