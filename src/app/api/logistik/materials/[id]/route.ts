import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }          from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    .update({
      name,
      unit,
      quantity,
      critical_quantity,
      category,
      article_number,
      color,
      pattern,
    })
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabaseResult = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabaseResult.auth.getUser()
  if (authError || !user) return NextResponse.redirect('/login')

  const { error } = await supabaseResult
    .from('materials')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
