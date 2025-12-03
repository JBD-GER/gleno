// app/api/social/instagram/delete-data/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  console.log('Instagram data deletion payload:', body)

  // TODO: Daten für diesen User löschen, Job-ID zurückgeben, etc.
  // für Meta reicht normalerweise eine einfache JSON-Antwort mit Auftrags-ID
  return NextResponse.json({ status: 'pending', code: 'gleno-delete-001' })
}
