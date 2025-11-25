// src/app/api/zoom/slots/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const date = url.searchParams.get('date') // Format: YYYY-MM-DD

    if (!date) {
      return NextResponse.json(
        { error: 'Parameter "date" (YYYY-MM-DD) ist erforderlich.' },
        { status: 400 }
      )
    }

    const from = new Date(`${date}T00:00:00.000Z`)
    const to = new Date(`${date}T23:59:59.999Z`)

    const { data, error } = await supabaseAdmin
      .from('zoom_bookings')
      .select('start_time')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())

    if (error) {
      console.error('Zoom slots error', error)
      return NextResponse.json(
        { error: 'Slots konnten nicht geladen werden.' },
        { status: 500 }
      )
    }

    const booked = (data ?? []).map((row: any) => row.start_time as string)

    return NextResponse.json({ booked })
  } catch (err: any) {
    console.error('Zoom slots error', err?.message || err)
    return NextResponse.json(
      { error: 'Unbekannter Fehler beim Laden der Slots.' },
      { status: 500 }
    )
  }
}
