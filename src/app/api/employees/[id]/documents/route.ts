// src/app/api/employees/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const BUCKET = 'mitarbeiter'

function prefixes(userId: string, employeeId: string) {
  return {
    general: `${userId}/${employeeId}`,
    absences: `abwesenheit/${employeeId}`,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const scope = (new URL(req.url).searchParams.get('scope') ?? 'general') as 'general' | 'absences'
  const { general, absences } = prefixes(user.id, id)
  const prefix = scope === 'absences' ? absences : general

  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  const files = await Promise.all(
    (data ?? []).map(async (f) => {
      const path = `${prefix}/${f.name}`
      const { data: signed, error: signErr } = await supabase
        .storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 10)
      return {
        name: f.name,
        path,
        size: (f as any)?.metadata?.size ?? null,
        signed_url: signErr ? null : signed?.signedUrl ?? null,
        created_at: (f as any)?.created_at ?? null,
        scope,
      }
    })
  )

  return NextResponse.json(files, { status: 200 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const dir  = (form.get('dir') as string | null) ?? 'general'
  if (!file) return NextResponse.json({ message: 'file fehlt' }, { status: 400 })
  if (!['general','absences'].includes(dir)) {
    return NextResponse.json({ message: 'Ungültiges Verzeichnis' }, { status: 400 })
  }

  const { general, absences } = prefixes(user.id, id)
  const base = dir === 'absences' ? absences : general

  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
  const path = `${base}/${safeName}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ path }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ message: 'path fehlt' }, { status: 400 })

  const { general, absences } = prefixes(user.id, id)
  const allowed = path.startsWith(general + '/') || path.startsWith(absences + '/')
  if (!allowed) return NextResponse.json({ message: 'Pfad nicht erlaubt' }, { status: 403 })

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ message: 'removed' }, { status: 200 })
}
