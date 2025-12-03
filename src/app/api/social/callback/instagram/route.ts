// app/api/social/connect/instagram/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!

function randomState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function GET() {
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellung/social`
    )
  }

  const state = randomState()
  const redirectUri = `${SITE_URL}/api/social/callback/instagram`

  // Instagram Basic Display Login
  const authUrl = new URL('https://api.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'user_profile')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })
  return res
}
