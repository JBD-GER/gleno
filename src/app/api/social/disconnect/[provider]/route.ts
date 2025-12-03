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
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellungen/social`
    )
  }

  const { error } = await supa
    .from('social_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) {
    console.error('disconnect error', error)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=${provider}_disconnect`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellungen/social?disconnected=${provider}`
  )
}
