import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  // Header klonen (Edge-stabil)
  const headers = new Headers(request.headers)
  const response = NextResponse.next({ request: { headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              sameSite: 'lax',
              ...options,
              secure: process.env.NODE_ENV === 'production'
                ? true
                : options?.secure ?? false,
            })
          })
        },
      },
    }
  )

  // Token refresh → schreibt Cookies in `response`
  await supabase.auth.getUser()
  return response
}
