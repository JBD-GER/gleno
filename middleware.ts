// /src/middleware.ts
import { type NextRequest } from 'next/server'
// ⚠️ relativer Pfad statt '@/...' (Edge-bundle-sicher)
import { updateSession } from './src/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|public/).*)',
  ],
}
