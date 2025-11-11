import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Nur Member (Owner oder zugewiesener Mitarbeiter)
  const { data: isMember } = await supa.rpc('is_project_member', { p_project_id: id })
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = (await request.json()) as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'Empty' }, { status: 400 })

  const { error } = await supa.from('project_comments').insert({
    project_id: id,
    user_id: user.id,
    content: content.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
