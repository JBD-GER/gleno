// src/lib/supabase-server.ts

// ────────────────────────────────────────────────────────────────────────────────
// Unterdrücke nur die spezifische Supabase-Session-Warnung in der Server-Konsole
if (typeof console !== 'undefined' && typeof console.warn === 'function') {
  const originalWarn = console.warn.bind(console)
  console.warn = (...args: any[]) => {
    const msg = String(args[0] ?? '')
    if (
      msg.includes(
        'Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure'
      )
    ) {
      return
    }
    originalWarn(...args)
  }
}
// ────────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server' // ⬅️ kein NextResponseInit exportiert

/**
 * SSR-Helfer für **Server Components/Layouts/Pages**:
 * - liest Auth-Cookies (read-only)
 * - setzt **keine** Cookies (Next 15 verbietet das im Render-Kontext)
 * - Token-Refresh passiert in deiner Middleware.
 */
export async function supabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // Wichtig: no-op! In Server Components darf NICHT gesetzt werden.
        setAll() {
          /* noop – Cookie-Setzen nur in Middleware/Route Handler/Server Action */
        },
      },
    }
  )
}

/**
 * Für **Route Handler** (app/api/*) oder **Server Actions**:
 * - darf Cookies setzen (z. B. nach exchangeCodeForSession, signOut etc.)
 * - gibt dir sowohl den Supabase-Client als auch eine Response zurück,
 *   in die alle von Supabase gesetzten Cookies geschrieben werden.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const { supabase, response } = supabaseServerRoute(req)
 *     await supabase.auth.getUser() // schreibt evtl. Cookies in response
 *     return response
 *   }
 */
export function supabaseServerRoute(
  req: NextRequest,
  init?: ResponseInit // ⬅️ Web-Standardtyp statt "NextResponseInit"
): { supabase: ReturnType<typeof createServerClient>, response: NextResponse } {
  // neutrale Response; Cookies werden hierauf gesetzt
  const response = new NextResponse(null, init)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              ...options,
            })
          })
        },
      },
    }
  )

  return { supabase, response }
}

/**
 * Admin-Client mit Service-Role-Key für private Storage- und DB-Operationen.
 * Achtung: nur serverseitig nutzen!
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
