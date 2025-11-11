'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  UserGroupIcon,
  BriefcaseIcon,
  DocumentChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler, Chart,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

/* ---------------------- Fancy Chart Plugin: Soft Shadows ---------------------- */
const shadowPlugin = {
  id: 'softShadow',
  beforeDatasetDraw(chart: Chart, args: any) {
    const { ctx } = chart
    if (args?.meta?.type === 'line') {
      ctx.save()
      ctx.shadowColor = 'rgba(15, 23, 42, 0.25)' // slate-900/25
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 8
    }
  },
  afterDatasetDraw(chart: Chart) {
    chart.ctx.restore()
  },
}
ChartJS.register(shadowPlugin)

/* ---------------------- Typen ---------------------- */
type SeriesPoint = { month: string; count: number }
type RevenuePoint = { month: string; amount: number }

export default function DashboardClient({
  userEmail,
  kpis,
  series,
  alerts,
  appointments,
  contacts,
}: {
  userEmail: string
  kpis: { employees: number; customers: number; projects: number; invoices: number; revenueYTD: number }
  series: { customers: SeriesPoint[]; projects: SeriesPoint[]; revenue: RevenuePoint[] }
  alerts: {
    lowMaterials: { id: string; name: string; quantity: number; critical_quantity: number }[]
    dueFleet: { id: string; license_plate: string; inspection_due_date: string | null }[]
    dueTools: { id: string; name: string; next_inspection_due: string | null }[]
  }
  appointments: { id: string; title: string | null; location: string; start_time: string; end_time: string | null; reason: string | null }[]
  contacts: { name: string; phone: string; email: string }
}) {
  const [range, setRange] = useState<3 | 6 | 12>(12)

  /* ---------------------- Datenaufbereitung ---------------------- */
  const m = useMemo(() => {
    const take = <T,>(arr: T[]) => arr.slice(-range)
    const labels = take(series.customers).map((p) => p.month)
    return {
      labels,
      customers: take(series.customers).map((p) => p.count),
      projects : take(series.projects).map((p) => p.count),
      revenue  : take(series.revenue).map((p) => p.amount),
    }
  }, [range, series])

  const euro = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)

  /* ---------------------- Charts ---------------------- */
  const lineData = {
    labels: m.labels,
    datasets: [
      {
        label: 'Kunden',
        data: m.customers,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#0f172a', // dunkelblau (Akzent)
        fill: 'start' as const,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(15,23,42,0.10)'
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, 'rgba(15,23,42,0.18)')
          grad.addColorStop(1, 'rgba(15,23,42,0.02)')
          return grad
        },
        tension: 0.35,
      },
{
  label: 'Projekte',
  data: m.projects,
  borderWidth: 2.5,
  pointRadius: 3,
  pointHoverRadius: 5,
  borderColor: '#5865f2',            // cyan-500 (frisch, aber ruhig)
  pointBackgroundColor: '#5865f2',
  fill: 'start' as const,
  backgroundColor: (ctx: any) => {
    const { chart } = ctx
    const { ctx: c, chartArea } = chart
    if (!chartArea) return 'rgba(6,182,212,0.10)'
    const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    grad.addColorStop(0, 'rgba(6,182,212,0.18)')
    grad.addColorStop(1, 'rgba(6,182,212,0.02)')
    return grad
  },
  tension: 0.35,
},
    ],
  }
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 6,
          color: '#334155', font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        displayColors: false,
        callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}` },
      },
      softShadow: {},
    },
    scales: {
      x: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.15)', drawTicks: false },
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 as number | undefined },
      },
    },
  }

  const barData = {
    labels: m.labels,
    datasets: [
      {
        label: 'Umsatz (€)',
        data: m.revenue,
        borderWidth: 1,
        borderColor: 'rgba(15,23,42,0.7)',
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(15,23,42,0.6)'
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, 'rgba(15,23,42,0.85)')
          grad.addColorStop(1, 'rgba(15,23,42,0.25)')
          return grad
        },
        borderRadius: 10,
        hoverBorderWidth: 2,
        hoverBorderColor: '#0f172a',
      },
    ],
  }
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        callbacks: { label: (ctx: any) => ` ${new Intl.NumberFormat('de-DE').format(Number(ctx.parsed.y || 0))} €` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.15)', drawTicks: false },
        ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${new Intl.NumberFormat('de-DE').format(Number(v))} €` },
      },
    },
  }

  /* ---------------------- UI-Helfer ---------------------- */
  const card = (title: string, value: string | number, Icon: any) => (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
      style={{ backgroundImage: 'radial-gradient(600px 300px at 110% -30%, rgba(15,23,42,0.08), transparent)' }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/80 p-2 shadow border border-white/60">
          <Icon className="h-6 w-6 text-slate-900" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )

  /* ---------------------- Render ---------------------- */
  return (
    <section className="space-y-6">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(15,23,42,0.10),transparent)]" />
        <div className="relative p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Willkommen zurück</h1>
          <p className="text-sm text-slate-600">Eingeloggt als {userEmail}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {card('Mitarbeiter', kpis.employees, UserGroupIcon)}
        {card('Kunden', kpis.customers, UserGroupIcon)}
        {card('Projekte', kpis.projects, BriefcaseIcon)}
        {card('Rechnungen', kpis.invoices, DocumentChartBarIcon)}
        {card('Umsatz YTD', euro(kpis.revenueYTD), BanknotesIcon)}
      </div>

      {/* REIHE 1: Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Links: Kunden & Projekte (Line) */}
        <div
          className="relative rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
          style={{ backgroundImage: 'radial-gradient(700px 350px at 120% -20%, rgba(15,23,42,0.08), transparent)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Kunden & Projekte</h3>
            <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow">
              {[3,6,12].map((n) => (
                <button
                  key={n}
                  onClick={() => setRange(n as 3|6|12)}
                  className={`px-3 py-1 text-xs transition ${
                    range===n
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-800 hover:bg-white'
                  }`}
                >
                  {n}M
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <Line data={lineData} options={lineOptions as any} />
          </div>
        </div>

        {/* Rechts: Umsatz/Monat (Bar) */}
        <div
          className="relative rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
          style={{ backgroundImage: 'radial-gradient(700px 350px at 120% -20%, rgba(15,23,42,0.08), transparent)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Umsatz pro Monat</h3>
            <div className="text-xs text-slate-500">Letzte {range} Monate</div>
          </div>
          <div className="h-56">
            <Bar data={barData} options={barOptions as any} />
          </div>
        </div>
      </div>

      {/* REIHE 2: Termine (heute) & Ansprechpartner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Termine HEUTE */}
        <div
          className="relative rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
          style={{ backgroundImage: 'radial-gradient(600px 300px at 110% -30%, rgba(15,23,42,0.06), transparent)' }}
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Heutige Termine</h3>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">Heute stehen keine Termine an.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => {
                const dateYmd = new Date(a.start_time).toISOString().slice(0, 10)
                return (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/kalender?event=${a.id}&date=${dateYmd}`}
                      className="group block rounded-xl border border-white/60 bg-white/70 p-3 shadow hover:-translate-y-0.5 hover:bg-white hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDaysIcon className="h-4 w-4 text-slate-400 transition group-hover:text-slate-900" />
                        <span className="font-medium text-slate-800 group-hover:text-slate-900">
                          {a.title || a.reason || 'Termin'}
                        </span>
                        <span className="ml-auto text-xs text-slate-500">
                          {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="ml-6 text-xs text-slate-500">{a.location}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Ansprechpartner */}
        <div
          className="relative rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
          style={{ backgroundImage: 'radial-gradient(600px 300px at 110% -30%, rgba(15,23,42,0.08), transparent)' }}
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Ansprechpartner</h3>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-content-center rounded-full bg-slate-900 text-white shadow">
              <span className="text-base font-semibold">
                {contacts.name.split(' ').map((n) => n[0]).slice(0,2).join('')}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{contacts.name}</p>
              <p className="truncate text-xs text-slate-500">{contacts.email}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <PhoneIcon className="h-4 w-4 text-slate-400" />
              <a className="hover:underline" href={`tel:${contacts.phone}`}>{contacts.phone}</a>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <EnvelopeIcon className="h-4 w-4 text-slate-400" />
              <a className="hover:underline" href={`mailto:${contacts.email}`}>{contacts.email}</a>
            </div>
          </div>
        </div>
      </div>

      {/* REIHE 3: Warnungen */}
      <div
        className="relative rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
        style={{ backgroundImage: 'radial-gradient(700px 350px at 120% -20%, rgba(245,158,11,0.08), transparent)' }}
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Warnungen (nächste 30 Tage)</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Material knapp */}
          <div>
            <p className="text-xs font-medium text-slate-600">Materialbestand niedrig</p>
            {alerts.lowMaterials.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Alles im grünen Bereich.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.lowMaterials.slice(0, 6).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50/80 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="ml-2">{m.quantity} / {m.critical_quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* TÜV */}
          <div>
            <p className="text-xs font-medium text-slate-600">TÜV (Fuhrpark)</p>
            {alerts.dueFleet.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Keine Fälligkeiten in 30 Tagen.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.dueFleet.slice(0, 6).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50/80 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span>{f.license_plate}</span>
                    <span className="ml-2">{f.inspection_due_date ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Werkzeug-Prüfung */}
          <div>
            <p className="text-xs font-medium text-slate-600">Werkzeug-Prüfungen</p>
            {alerts.dueTools.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Keine Fälligkeiten in 30 Tagen.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.dueTools.slice(0, 6).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50/80 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="ml-2">{t.next_inspection_due ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
