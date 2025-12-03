// app/api/social/instagram/webhook/route.ts
import { NextResponse } from 'next/server'

const VERIFY_TOKEN =
  process.env.INSTAGRAM_VERIFY_TOKEN || 'gleno-instagram-webhook-secret'

/**
 * GET = Verifizierung durch Meta (hub.challenge)
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    // Erfolgreich verifiziert → Challenge als Plain-Text zurückgeben
    return new Response(challenge, { status: 200 })
  }

  console.error('Invalid webhook verify request', { mode, token, challenge })
  return new Response('Forbidden', { status: 403 })
}

/**
 * POST = echte Webhook-Events (Dummy: wir loggen nur)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  console.log('Instagram Webhook Event:', body)

  // Optional kannst du hier später richtig verarbeiten
  return NextResponse.json({ received: true }, { status: 200 })
}
