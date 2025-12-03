// app/api/social/test-insert/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supa = await supabaseServer()

  const { data: { user }, error: userError } = await supa.auth.getUser()

  const { data: inserted, error } = await supa
    .from('social_accounts')
    .insert({
      user_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
      provider: 'facebook',
      account_type: 'profile',
      external_id: 'test-fb-123',
      display_name: 'Test Facebook',
      avatar_url: null,
      access_token: 'dummy-token',
    })
    .select('id')
    .maybeSingle()

  console.log('test insert', { user, userError, inserted, error })

  return NextResponse.json({ user, userError, inserted, error })
}
