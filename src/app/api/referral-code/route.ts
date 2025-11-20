// src/app/api/referral-code/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Nicht eingeloggt' },
      { status: 401 }
    )
  }

  // 1) Prüfen, ob für diesen User schon ein Code existiert
  const { data: existing, error: selectError } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .maybeSingle()

  if (selectError) {
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 }
    )
  }

  if (existing?.code) {
    return NextResponse.json({ code: existing.code })
  }

  // 2) Falls noch kein Code vorhanden: anlegen (Code kommt aus Default-Funktion)
  const { data: inserted, error: insertError } = await supabase
    .from('referral_codes')
    .insert({ user_id: user.id })
    .select('code')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Fehler beim Erstellen des Referral-Codes' },
      { status: 500 }
    )
  }

  return NextResponse.json({ code: inserted.code })
}
