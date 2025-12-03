// app/api/social/debug-accounts/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supa = await supabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  const { data: accounts, error: accountsError } = await supa
    .from('social_accounts')
    .select('*')
    .order('created_at', { ascending: true })

  return NextResponse.json({
    user,
    userError,
    accountsError,
    accounts,
  })
}
