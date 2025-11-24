import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

type SeriesPoint = { month: string; count: number }
type RevenuePoint = { month: string; amount: number }

/* ===== Helpers für Datum ===== */
function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
}
function firstDayOfMonth(d = new Date()) {
  const x = new Date(d)
  x.setDate(1); x.setHours(0, 0, 0, 0)
  return x
}
function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function lastNMonths(n: number) {
  const out: string[] = []
  const d = firstDayOfMonth()
  for (let i = 0; i < n; i++) {
    out.unshift(ym(new Date(d)))
    d.setMonth(d.getMonth() - 1)
  }
  return out
}
function bucketCountByMonth(dates: string[], months: string[]): SeriesPoint[] {
  const map = new Map(months.map((m) => [m, 0]))
  for (const iso of dates) {
    const key = ym(new Date(iso))
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
  }
  return months.map((m) => ({ month: m, count: map.get(m) || 0 }))
}

/* ===== Zahlen/Positionen robust ===== */
function num(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = v.replace?.(',', '.') ?? v
    const n = Number(t)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}
function parseMaybeJsonArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const a = JSON.parse(val); return Array.isArray(a) ? a : [] } catch { return [] }
  }
  return []
}
function lineTotal(p: any): number {
  const direct = num(p.total) || num(p.line_total) || num(p.amount) || num(p.subtotal) || 0
  if (direct) return direct
  const qty = num(p.quantity ?? p.qty ?? p.q ?? 1)
  const unit = num(p.unit_price ?? p.price ?? p.unitPrice ?? p.unit ?? 0)
  const fallback = qty * unit
  return Number.isFinite(fallback) ? fallback : 0
}

/* ===== Rabatt-/Netto-Logik (wie Angebot/Rechnung) ===== */
type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'
type Discount = {
  enabled: boolean
  label?: string
  type: DiscountType
  base: DiscountBase
  value: number
}
const clamp = (n: number) => (n < 0 ? 0 : n)
const parseTax = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

type InvoiceLite = {
  date: string
  positions: any
  tax_rate?: number | string | null
  discount?: Discount | null
  net_after_discount?: number | null
}

function computeNetAfter(inv: InvoiceLite): number {
  if (typeof inv.net_after_discount === 'number' && isFinite(inv.net_after_discount)) {
    return inv.net_after_discount
  }

  const items = parseMaybeJsonArray(inv.positions)
  const net = items.reduce((acc, it) => acc + lineTotal(it), 0)

  const d = inv.discount
  if (!d || !d.enabled || !d.value) return net

  const taxRate = parseTax(inv.tax_rate ?? 0)
  const taxFactor = 1 + taxRate / 100

  if (d.base === 'net') {
    const disc = d.type === 'percent' ? (net * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, disc), net)
    return clamp(net - capped)
  } else {
    const grossBefore = net * taxFactor
    const disc = d.type === 'percent' ? (grossBefore * d.value) / 100 : d.value
    const capped = Math.min(Math.max(0, disc), grossBefore)
    const grossAfter = clamp(grossBefore - capped)
    return grossAfter / taxFactor
  }
}

/* ===== Umsatz (nur NETTO nach Rabatt) ===== */
type RevenuePoint2 = RevenuePoint
function sumRevenueByMonth(invoices: InvoiceLite[], months: string[]): RevenuePoint2[] {
  const map = new Map(months.map((m) => [m, 0]))
  for (const inv of invoices) {
    const key = ym(new Date(inv.date))
    if (!map.has(key)) continue
    map.set(key, (map.get(key) || 0) + computeNetAfter(inv))
  }
  return months.map((m) => ({ month: m, amount: map.get(m) || 0 }))
}
function sumRevenueBetween(invoices: InvoiceLite[], fromIncl: Date, toIncl: Date): number {
  const from = fromIncl.getTime()
  const to = toIncl.getTime()
  let total = 0
  for (const inv of invoices) {
    const t = new Date(inv.date).getTime()
    if (t < from || t > to) continue
    total += computeNetAfter(inv)
  }
  return total
}

export default async function DashboardPage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'mitarbeiter') {
    return redirect('/dashboard/kalender')
  }

  const userId = user.id

  const months = lastNMonths(12)
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const in30Iso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  // KPIs
  const [{ count: employeesCount }] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const [{ count: customersCount }] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const [{ count: projectsCount }] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const [{ count: invoicesCount }] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  // Zeitreihen
  const since12m = new Date(firstDayOfMonth())
  since12m.setMonth(since12m.getMonth() - 11)
  const since12mIso = since12m.toISOString()

  const [customersCreatedRes, projectsCreatedRes] = await Promise.all([
    supabase
      .from('customers')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', since12mIso),
    supabase
      .from('projects')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', since12mIso),
  ])

  const seriesCustomers = bucketCountByMonth(
    (customersCreatedRes.data ?? []).map((r: any) => r.created_at),
    months,
  )
  const seriesProjects = bucketCountByMonth(
    (projectsCreatedRes.data ?? []).map((r: any) => r.created_at),
    months,
  )

  // Umsatz (NETTO nach Rabatt)
  const earliestMonthIso = (() => {
    const [y, m] = months[0].split('-').map((x) => Number(x))
    const d = new Date(y, m - 1, 1)
    return d.toISOString().slice(0, 10)
  })()

  const invoicesForChartRes = await supabase
    .from('invoices')
    .select('date, positions, tax_rate, discount, net_after_discount')
    .eq('user_id', userId)
    .gte('date', earliestMonthIso)

  const chartInvoices = (invoicesForChartRes.data ?? []) as InvoiceLite[]
  const revenueByMonth = sumRevenueByMonth(chartInvoices, months)

  const startOfYear = new Date(new Date().getFullYear(), 0, 1)
  const invoicesForYtdRes = await supabase
    .from('invoices')
    .select('date, positions, tax_rate, discount, net_after_discount')
    .eq('user_id', userId)
    .gte('date', startOfYear.toISOString().slice(0, 10))
    .lte('date', todayIso)

  const ytdInvoices = (invoicesForYtdRes.data ?? []) as InvoiceLite[]
  const revenueYTD = sumRevenueBetween(ytdInvoices, startOfYear, endOfDay(today))

  // Termine HEUTE
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const todaysAppointmentsRes = await supabase
    .from('appointments')
    .select('id, title, location, start_time, end_time, reason')
    .eq('user_id', userId)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true })

  const todaysAppointments = (todaysAppointmentsRes.data ?? []) as {
    id: string
    title: string | null
    location: string
    start_time: string
    end_time: string | null
    reason: string | null
  }[]

  // Warnungen
  const materialsRes = await supabase
    .from('materials')
    .select('id, name, quantity, critical_quantity')
    .eq('user_id', userId)

  const lowMaterials = ((materialsRes.data ?? []) as any[])
    .filter((m) => Number(m.quantity) <= Number(m.critical_quantity))
    .slice(0, 10)
    .map((m) => ({
      id: String(m.id),
      name: String(m.name),
      quantity: Number(m.quantity),
      critical_quantity: Number(m.critical_quantity),
    }))

  const dueRangeStart = todayIso
  const dueRangeEnd = in30Iso

  const dueFleetRes = await supabase
    .from('fleet')
    .select('id, license_plate, inspection_due_date')
    .eq('user_id', userId)
    .not('inspection_due_date', 'is', null)
    .gte('inspection_due_date', dueRangeStart)
    .lte('inspection_due_date', dueRangeEnd)
    .order('inspection_due_date', { ascending: true })

  const dueFleet = (dueFleetRes.data ?? []).map((f: any) => ({
    id: String(f.id),
    license_plate: String(f.license_plate),
    inspection_due_date: f.inspection_due_date as string | null,
  }))

  const dueToolsRes = await supabase
    .from('tools')
    .select('id, name, next_inspection_due')
    .eq('user_id', userId)
    .not('next_inspection_due', 'is', null)
    .gte('next_inspection_due', dueRangeStart)
    .lte('next_inspection_due', dueRangeEnd)
    .order('next_inspection_due', { ascending: true })

  const dueTools = (dueToolsRes.data ?? []).map((t: any) => ({
    id: String(t.id),
    name: String(t.name),
    next_inspection_due: t.next_inspection_due as string | null,
  }))

  return (
    <div className="w-full px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <DashboardClient
        userEmail={user.email ?? ''}
        kpis={{
          employees: employeesCount ?? 0,
          customers: customersCount ?? 0,
          projects: projectsCount ?? 0,
          invoices: invoicesCount ?? 0,
          revenueYTD,
        }}
        series={{
          customers: seriesCustomers,
          projects: seriesProjects,
          revenue: revenueByMonth,
        }}
        alerts={{ lowMaterials, dueFleet, dueTools }}
        appointments={todaysAppointments}
        contacts={{
          name: 'Christoph Pfad',
          phone: '050353169999',
          email: 'support@gleno.de',
        }}
      />
    </div>
  )
}
