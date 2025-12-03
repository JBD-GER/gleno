// app/api/social/disconnect/[provider]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

export async function GET(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as 'facebook' | 'instagram' | 'linkedin'

  if (!['facebook', 'instagram', 'linkedin'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    console.error('disconnect: no user')
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellung/social`
    )
  }

  console.log('disconnect called', { provider, userId: user.id })

  const { error, count } = await supa
    .from('social_accounts')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) {
    console.error('disconnect error', { provider, userId: user.id, error })
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=${provider}_disconnect`
    )
  }

  console.log('disconnect removed rows', { provider, userId: user.id, count })

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?disconnected=${provider}`
  )
}
