// src/app/api/employees/[id]/absences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('user_id', user.id)
    .eq('employee_id', id)
    .order('start_date', { ascending: false })

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json(data ?? [], { status: 200 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { start_date, end_date, type, reason, document_path } = await req.json()

  if (!start_date || !end_date || !type) {
    return NextResponse.json({ message: 'start_date, end_date und type sind Pflicht.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('absences')
    .insert([{
      user_id: user.id,
      employee_id: id,
      start_date,
      end_date,
      type,
      reason: reason?.trim() || null,
      document_path: document_path || null,
    }])
    .select('*')

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json(data?.[0], { status: 201 })
}
