import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }          from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabaseResult = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabaseResult.auth.getUser()
  if (authError || !user) return NextResponse.redirect('/login')

  const { data, error } = await supabaseResult
    .from('materials')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabaseResult = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabaseResult.auth.getUser()
  if (authError || !user) return NextResponse.redirect('/login')

  const {
    name,
    unit,
    quantity,
    critical_quantity,
    category,
    article_number,
    color,
    pattern,
  } = await req.json()

  const { data, error } = await supabaseResult
    .from('materials')
    .insert({
      user_id:         user.id,
      name,
      unit,
      quantity,
      critical_quantity,
      category,
      article_number,
      color,
      pattern,
    })
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
