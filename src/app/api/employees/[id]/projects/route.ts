// src/app/api/employees/[id]/projects/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const revalidate = 0
export const dynamic = 'force-dynamic'

type ParamsP = Promise<{ id: string }>

/**
 * GET /api/employees/:id/projects
 * → alle Projekte, in denen der Mitarbeiter (employee_id) über project_assignees zugewiesen ist
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: ParamsP }
) {
  const logPrefix = '[EMPLOYEE_PROJECTS_API]'
  try {
    const { id: employeeId } = await ctx.params
    const supa = await supabaseServer()

    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser()

    console.log(logPrefix, 'start', {
      employeeId,
      authError: authErr?.message,
      userId: user?.id,
    })

    if (authErr || !user) {
      console.log(logPrefix, 'unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1) Mitarbeiter gehört zum eingeloggten Account?
    const { data: emp, error: empErr } = await supa
      .from('employees')
      .select('id, user_id, first_name, last_name')
      .eq('id', employeeId)
      .single()

    console.log(logPrefix, 'employee lookup result', {
      empErr: empErr?.message,
      emp,
      expectedUserId: user.id,
    })

    if (!emp || emp.user_id !== user.id) {
      console.log(logPrefix, 'employee not found or not owned by user', {
        employeeId,
        empUserId: emp?.user_id,
        currentUserId: user.id,
      })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2) Zuweisungen aus project_assignees ziehen (statt project_employees)
    const {
      data: rels,
      error: relErr,
    } = await supa
      .from('project_assignees')
      .select('project_id')
      .eq('employee_id', employeeId)

    console.log(logPrefix, 'project_assignees result', {
      relErr: relErr?.message,
      relCount: rels?.length ?? 0,
      rels,
    })

    if (relErr) {
      return NextResponse.json({ error: relErr.message }, { status: 400 })
    }

    if (!rels || rels.length === 0) {
      console.log(logPrefix, 'no project assignments for employee')
      return NextResponse.json([], {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const projectIds = Array.from(
      new Set(
        rels
          .map((r) => r.project_id)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    console.log(logPrefix, 'projectIds derived from relations', {
      projectIds,
    })

    if (projectIds.length === 0) {
      console.log(logPrefix, 'no valid projectIds after filtering')
      return NextResponse.json([], {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // 3) Projekte selbst laden (nur deine Projekte)
    const {
      data: projects,
      error: projErr,
    } = await supa
      .from('projects')
      .select('id, title, user_id')
      .in('id', projectIds)
      .eq('user_id', user.id)

    console.log(logPrefix, 'projects query result', {
      projErr: projErr?.message,
      projectCount: projects?.length ?? 0,
      projects,
    })

    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 400 })
    }

    // 4) Schlanke Antwort für das Frontend
    const result =
      projects?.map((p) => ({
        id: p.id as string,
        title: (p.title as string) || 'Ohne Titel',
      })) ?? []

    console.log(logPrefix, 'final result', {
      resultCount: result.length,
      result,
    })

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    console.error(logPrefix, 'unhandled error', e)
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 },
    )
  }
}
