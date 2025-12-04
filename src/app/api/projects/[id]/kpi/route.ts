// app/api/projects/[id]/kpi/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type ParamsP = Promise<{ id: string }>

async function getSupaUser() {
  const supa = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supa.auth.getUser()
  return { supa, user, error }
}

type DbKpiRow = {
  id: string
  user_id: string
  project_id: string
  budget: number | null
  target_margin_percent: number | null
  planned_duration_days: number | null
  extra_costs: number | null
  notify_on_zero_margin: boolean
  notify_email: string | null
  created_at: string
  updated_at: string
}

type DbEmployee = {
  id: string
  first_name: string | null
  last_name: string | null
  hourly_rate: number | null
}

type DbTimeRow = {
  id: string
  project_id: string | null
  employee_id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  break_minutes: number | null
  employees: DbEmployee | null
}

function computeKpi(settingsRow: DbKpiRow | null, timeRows: DbTimeRow[]) {
  const settings = {
    budget:
      settingsRow?.budget !== null && settingsRow?.budget !== undefined
        ? Number(settingsRow.budget)
        : null,
    target_margin_percent:
      settingsRow?.target_margin_percent !== null &&
      settingsRow?.target_margin_percent !== undefined
        ? Number(settingsRow.target_margin_percent)
        : null,
    planned_duration_days:
      settingsRow?.planned_duration_days !== null &&
      settingsRow?.planned_duration_days !== undefined
        ? Number(settingsRow.planned_duration_days)
        : null,
    extra_costs:
      settingsRow?.extra_costs !== null &&
      settingsRow?.extra_costs !== undefined
        ? Number(settingsRow.extra_costs)
        : null,
    notify_on_zero_margin: Boolean(settingsRow?.notify_on_zero_margin),
    notify_email: settingsRow?.notify_email ?? null,
  }

  let totalHours = 0
  let totalLaborCost = 0

  const byEmployeeMap = new Map<
    string,
    {
      employee_id: string
      name: string
      hours: number
      hourly_rate: number
      cost: number
    }
  >()

  for (const row of timeRows) {
    if (!row.start_time || !row.end_time) continue

    const start = new Date(row.start_time)
    const end = new Date(row.end_time)
    if (isNaN(+start) || isNaN(+end)) continue

    let seconds = (end.getTime() - start.getTime()) / 1000
    const breakMinutes = Number(row.break_minutes || 0)
    seconds = seconds - breakMinutes * 60
    if (seconds <= 0) continue

    const hours = seconds / 3600
    const hr =
      row.employees && row.employees.hourly_rate !== null
        ? Number(row.employees.hourly_rate)
        : 0
    const cost = hours * hr

    totalHours += hours
    totalLaborCost += cost

    const first = row.employees?.first_name?.trim() || ''
    const last = row.employees?.last_name?.trim() || ''
    const name = (first || last) ? `${first} ${last}`.trim() : 'Unbekannt'
    const key = row.employee_id

    const existing = byEmployeeMap.get(key)
    if (!existing) {
      byEmployeeMap.set(key, {
        employee_id: key,
        name,
        hours,
        hourly_rate: hr,
        cost,
      })
    } else {
      existing.hours += hours
      existing.cost += cost
      existing.hourly_rate = hr
    }
  }

  const budget = settings.budget ?? 0
  const extraCosts = settings.extra_costs ?? 0
  const totalCost = totalLaborCost + extraCosts
  const profit = budget > 0 ? budget - totalCost : 0

  const marginPercent = budget > 0 ? (profit / budget) * 100 : null
  const budgetUsagePercent = budget > 0 ? (totalCost / budget) * 100 : null

  const effectiveHourlyRateBudgetBased =
    totalHours > 0 && budget > 0 ? budget / totalHours : null

  const effectiveHourlyRateCostBased =
    totalHours > 0 ? totalCost / totalHours : null

  const time_stats = {
    total_hours: totalHours,
    total_labor_cost: totalLaborCost,
    by_employee: Array.from(byEmployeeMap.values()),
  }

  const finance = {
    budget,
    extra_costs: extraCosts,
    total_labor_cost: totalLaborCost,
    total_cost: totalCost,
    profit,
    margin_percent: marginPercent,
    budget_usage_percent: budgetUsagePercent,
    effective_hourly_rate_budget_based: effectiveHourlyRateBudgetBased,
    effective_hourly_rate_cost_based: effectiveHourlyRateCostBased,
  }

  return { settings, time_stats, finance }
}

/** GET: KPI-Daten + berechnete Kennzahlen */
export async function GET(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prüfen, ob Projekt zum User gehört
  const { data: project, error: projectError } = await supa
    .from('projects')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Projekt nicht gefunden.' },
      { status: 404 },
    )
  }

  if (project.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Keine Berechtigung für dieses Projekt.' },
      { status: 403 },
    )
  }

  // Settings laden
  const { data: kpiRow, error: kpiError } = await supa
    .from('project_kpi')
    .select('*')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (kpiError && kpiError.code !== 'PGRST116') {
    return NextResponse.json(
      { error: 'KPI-Einstellungen konnten nicht geladen werden.' },
      { status: 500 },
    )
  }

  // Zeiteinträge + Mitarbeiter-Stundensätze laden (roh)
  const { data: timeRowsRaw, error: timeError } = await supa
    .from('time_entries')
    .select(
      `
        id,
        project_id,
        employee_id,
        work_date,
        start_time,
        end_time,
        break_minutes,
        employees:employees!inner(
          id,
          first_name,
          last_name,
          hourly_rate
        )
      `,
    )
    .eq('project_id', id)
    .eq('user_id', user.id)

  if (timeError) {
    return NextResponse.json(
      { error: 'Zeiteinträge konnten nicht geladen werden.' },
      { status: 500 },
    )
  }

  // Normalisieren: employees kann als Array kommen -> nimm erstes Element
  const timeRows: DbTimeRow[] = (timeRowsRaw ?? []).map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    employee_id: row.employee_id,
    work_date: row.work_date,
    start_time: row.start_time,
    end_time: row.end_time,
    break_minutes: row.break_minutes,
    employees: Array.isArray(row.employees)
      ? (row.employees[0] as DbEmployee | undefined) ?? null
      : (row.employees as DbEmployee | null),
  }))

  const result = computeKpi(
    (kpiRow as DbKpiRow | null) ?? null,
    timeRows,
  )

  return NextResponse.json(result)
}

/** POST: KPI-Einstellungen upsert + berechnete Kennzahlen zurückgeben */
export async function POST(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const rawBudget = body?.budget ?? null
  const rawMargin = body?.target_margin_percent ?? null
  const rawDuration = body?.planned_duration_days ?? null
  const rawExtra = body?.extra_costs ?? null
  const notifyOnZero = Boolean(body?.notify_on_zero_margin)
  const notifyEmail =
    typeof body?.notify_email === 'string' ? body.notify_email : null

  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined) return null
    if (typeof val === 'number') {
      return isNaN(val) ? null : val
    }
    if (typeof val === 'string') {
      const replaced = val.replace(',', '.')
      const n = Number(replaced)
      return isNaN(n) ? null : n
    }
    return null
  }

  const budget = parseNum(rawBudget)
  const target_margin_percent = parseNum(rawMargin)
  const planned_duration_days =
    rawDuration === null || rawDuration === undefined
      ? null
      : Number(rawDuration)
  const extra_costs = parseNum(rawExtra)

  // Projekt-Check
  const { data: project, error: projectError } = await supa
    .from('projects')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Projekt nicht gefunden.' },
      { status: 404 },
    )
  }

  if (project.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Keine Berechtigung für dieses Projekt.' },
      { status: 403 },
    )
  }

  const nowIso = new Date().toISOString()

  const upsertPayload = {
    user_id: user.id,
    project_id: id,
    budget,
    target_margin_percent,
    planned_duration_days,
    extra_costs,
    notify_on_zero_margin: notifyOnZero,
    notify_email: notifyEmail,
    updated_at: nowIso,
  }

  const { data: upserted, error: upsertError } = await supa
    .from('project_kpi')
    .upsert(upsertPayload, {
      onConflict: 'user_id,project_id',
    })
    .select('*')
    .single()

  if (upsertError || !upserted) {
    return NextResponse.json(
      {
        error:
          upsertError?.message ||
          'KPI-Einstellungen konnten nicht gespeichert werden.',
      },
      { status: 500 },
    )
  }

  // Zeiteinträge neu laden
  const { data: timeRowsRaw, error: timeError } = await supa
    .from('time_entries')
    .select(
      `
        id,
        project_id,
        employee_id,
        work_date,
        start_time,
        end_time,
        break_minutes,
        employees:employees!inner(
          id,
          first_name,
          last_name,
          hourly_rate
        )
      `,
    )
    .eq('project_id', id)
    .eq('user_id', user.id)

  if (timeError) {
    return NextResponse.json(
      { error: 'Zeiteinträge konnten nicht geladen werden.' },
      { status: 500 },
    )
  }

  const timeRows: DbTimeRow[] = (timeRowsRaw ?? []).map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    employee_id: row.employee_id,
    work_date: row.work_date,
    start_time: row.start_time,
    end_time: row.end_time,
    break_minutes: row.break_minutes,
    employees: Array.isArray(row.employees)
      ? (row.employees[0] as DbEmployee | undefined) ?? null
      : (row.employees as DbEmployee | null),
  }))

  const result = computeKpi(upserted as DbKpiRow, timeRows)

  return NextResponse.json(result)
}
