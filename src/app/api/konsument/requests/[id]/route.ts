// src/app/api/konsument/requests/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hilfs-JSON, übernimmt Base-Headers (Cookies etc.) aus supabaseServerRoute
function jsonWithBaseHeaders(body: any, init: number | ResponseInit, baseHeaders: Headers) {
  const headers = new Headers(typeof init === 'number' ? undefined : init?.headers)
  baseHeaders.forEach((v, k) => headers.set(k, v))
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('x-route-hit', 'request-detail-api')
  return new NextResponse(
    JSON.stringify(body),
    typeof init === 'number' ? { status: init, headers } : { ...init, headers }
  )
}

/**
 * GET /api/konsument/requests/:id
 * Liefert NUR die Anfrage (wenn sie dem eingeloggten Konsumenten gehört).
 * Bewerbungen gehören in: /api/konsument/requests/:id/applications
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = supabaseServerRoute(req)
  const { id } = await params

  try {
    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if (uerr || !user) {
      return jsonWithBaseHeaders({ error: 'unauthorized' }, 401, response.headers)
    }

    // Anfrage laden und Besitz prüfen
    const { data: reqRow, error: reqErr } = await supabase
      .from('market_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (reqErr || !reqRow) {
      return jsonWithBaseHeaders({ error: 'not_found' }, 404, response.headers)
    }
    if (reqRow.user_id !== user.id) {
      return jsonWithBaseHeaders({ error: 'forbidden' }, 403, response.headers)
    }

    return jsonWithBaseHeaders({ request: reqRow }, 200, response.headers)
  } catch (e: any) {
    return jsonWithBaseHeaders({ error: e?.message || 'server_error' }, 500, response.headers)
  }
}
