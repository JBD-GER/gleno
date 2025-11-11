// src/app/api/employees/[id]/documents/sign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
const BUCKET = 'mitarbeiter'
const prefixes = (userId: string, employeeId: string) => ({
  general: `${userId}/${employeeId}`,
  absences: `abwesenheit/${employeeId}`,
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { path } = await req.json() as { path?: string }
  if (!path) return NextResponse.json({ message: 'path fehlt' }, { status: 400 })

  const { general, absences } = prefixes(user.id, id)
  const allowed = path.startsWith(general + '/') || path.startsWith(absences + '/')
  if (!allowed) return NextResponse.json({ message: 'Pfad nicht erlaubt' }, { status: 403 })

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ signed_url: data?.signedUrl }, { status: 200 })
}
