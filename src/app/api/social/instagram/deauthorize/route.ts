// app/api/social/instagram/deauthorize/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  console.log('Instagram deauthorize payload:', body)

  // später könntest du hier social_accounts für diesen User entfernen
  return NextResponse.json({ success: true })
}
