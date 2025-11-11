// src/app/api/consent/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const IP_SALT       = process.env.CONSENT_IP_SALT || 'change-me-long-random-salt'

// Service-Client (umgeht RLS bewusst)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

type Body = {
  version?: string
  necessary?: boolean
  functional?: boolean
  analytics?: boolean
  marketing?: boolean
  source?: 'banner' | 'settings'
  device_id?: string // UUID aus dem Browser
}

function firstIP(req: Request) {
  // Vercel/Proxy: X-Forwarded-For = "ip, ip2, ..."
  const xff = req.headers.get('x-forwarded-for') || ''
  const xr  = req.headers.get('x-real-ip') || ''
  const ip  = (xff.split(',')[0] || xr || '').trim()
  // Keine IP? Leere Zeichenkette -> Hash ist trotzdem deterministisch
  return ip
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body

  const version    = String(body.version ?? '1')
  const necessary  = body.necessary  ?? true
  const functional = body.functional ?? false
  const analytics  = body.analytics  ?? false
  const marketing  = body.marketing  ?? false
  const source     = body.source     ?? 'banner'
  const device_id  = body.device_id  ?? null

  // Optional: eingeloggten User mappen (falls vorhanden)
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const user_id = user?.id ?? null

  if (!user_id && !device_id) {
    return NextResponse.json({ error: 'device_id oder User erforderlich.' }, { status: 400 })
  }

  // Soft Forensics (pseudonym): IP-Hash & User-Agent
  const ip = firstIP(req)
  const ip_hash = sha256Hex(`${IP_SALT}|${ip}`)
  const user_agent = req.headers.get('user-agent')?.slice(0, 1024) || null

  const row = {
    user_id,
    device_id,
    version,
    necessary,
    functional,
    analytics,
    marketing,
    source,
    ip_hash,
    user_agent,
    consented_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }

  // Konfliktziel abhängig davon, ob wir einen Nutzer haben
  const onConflict = user_id ? 'user_id,version' : 'device_id,version'

  const { error } = await admin
    .from('cookie_consents')
    .upsert(row as any, { onConflict })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET(req: Request) {
  // Optionaler Lookup (praktisch für Audits)
  const { searchParams } = new URL(req.url)
  const device_id = searchParams.get('device_id')

  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const user_id = user?.id ?? null

  if (!user_id && !device_id) {
    return NextResponse.json({ consent: null }, { status: 200 })
  }

  let q = admin
    .from('cookie_consents')
    .select('*')
    .order('consented_at', { ascending: false })
    .limit(1)

  if (user_id) q = q.eq('user_id', user_id)
  else         q = q.eq('device_id', device_id!)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ consent: data?.[0] ?? null }, { status: 200 })
}
