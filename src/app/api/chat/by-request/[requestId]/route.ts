// src/app/api/chat/by-request/[requestId]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await ctx.params
  const supabase = await supabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Conversation laden (RLS lässt nur Teilnehmer rein)
  const { data: conv, error } = await supabase
    .from('market_conversations')
    .select('id, request_id, partner_id, consumer_user_id')
    .eq('request_id', requestId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ conversation: conv })
}
