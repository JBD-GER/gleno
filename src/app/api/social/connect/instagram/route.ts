import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
// Facebook / Graph API Version
const FB_API_VERSION = 'v21.0'

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

  // Scopes passend zu deiner Meta-Konfiguration
  const scopes = [
    'email',
    'instagram_basic',
    'instagram_business_basic',
    'instagram_manage_comments',
    'instagram_business_manage_messages',
  ]

  // WICHTIG: Für Instagram Graph API läuft das Login über Facebook OAuth
  const authUrl = new URL(
    `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`
  )
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', scopes.join(','))

  const res = NextResponse.redirect(authUrl.toString())

  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })

  return res
}
