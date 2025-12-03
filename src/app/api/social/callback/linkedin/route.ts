// app/api/social/connect/linkedin/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!

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
      `${SITE_URL}/login?returnTo=/dashboard/einstellungen/social`
    )
  }

  const state = randomState()
  const redirectUri = `${SITE_URL}/api/social/callback/linkedin`

  // 👉 Nur Standard-Scopes, die immer gehen
  const scope = ['r_liteprofile', 'r_emailaddress', 'w_member_social'].join(' ')

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', scope)

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('li_oauth_state', state, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })
  return res
}
