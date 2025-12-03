// app/api/social/accounts/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return NextResponse.json({ accounts: [] }, { status: 200 })
  }

  const { data, error } = await supa
    .from('social_accounts')
    .select(
      'id, provider, account_type, external_id, display_name, avatar_url'
    )
    .eq('user_id', user.id)
    .order('provider', { ascending: true })
    .order('display_name', { ascending: true })

  if (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to load social accounts' },
      { status: 500 }
    )
  }

  return NextResponse.json({ accounts: data ?? [] })
}
