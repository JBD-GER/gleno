// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  let res = NextResponse.redirect(new URL('/login', req.url))
  if (!code) return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookies) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return res

  // Aktuellen User ziehen
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  // Rolle aus profiles lesen (RLS: eigener Datensatz)
  let role: string | null = null
  try {
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    role = p?.role ?? null
  } catch {
    // Fallback: ensure anstoßen
    try {
      const ensureRes = await fetch(new URL('/api/profiles/ensure', req.url), { method: 'POST', headers: { cookie: res.headers.get('set-cookie') ?? '' } })
      if (ensureRes.ok) {
        const j = await ensureRes.json()
        role = j?.role ?? null
      }
    } catch { /* ignore */ }
  }

  if (role === 'konsument') {
    res = NextResponse.redirect(new URL('/konsument', req.url))
  } else {
    res = NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return res
}
