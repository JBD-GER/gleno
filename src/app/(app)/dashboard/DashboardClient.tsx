// src/app/(app)/dashboard/DashboardClient.tsx
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
  MegaphoneIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  Chart,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

/* Soft Shadow Plugin für Line-Chart (dezent) */
const shadowPlugin = {
  id: 'softShadow',
  beforeDatasetDraw(chart: Chart, args: any) {
    const { ctx } = chart
    if (args?.meta?.type === 'line') {
      ctx.save()
      ctx.shadowColor = 'rgba(15,23,42,0.18)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 6
    }
  },
  afterDatasetDraw(chart: Chart) {
    chart.ctx.restore()
  },
}
ChartJS.register(shadowPlugin as any)

/* Typen */
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
  kpis: {
    employees: number
    customers: number
    projects: number
    invoices: number
    revenueYTD: number
  }
  series: { customers: SeriesPoint[]; projects: SeriesPoint[]; revenue: RevenuePoint[] }
  alerts: {
    lowMaterials: { id: string; name: string; quantity: number; critical_quantity: number }[]
    dueFleet: { id: string; license_plate: string; inspection_due_date: string | null }[]
    dueTools: { id: string; name: string; next_inspection_due: string | null }[]
  }
  appointments: {
    id: string
    title: string | null
    location: string
    start_time: string
    end_time: string | null
    reason: string | null
  }[]
  contacts: { name: string; phone: string; email: string }
}) {
  const [range, setRange] = useState<3 | 6 | 12>(12)

  /* Datenaufbereitung */
  const m = useMemo(() => {
    const take = <T,>(arr: T[]) => arr.slice(-range)
    const labels = take(series.customers).map((p) => p.month)
    return {
      labels,
      customers: take(series.customers).map((p) => p.count),
      projects: take(series.projects).map((p) => p.count),
      revenue: take(series.revenue).map((p) => p.amount),
    }
  }, [range, series])

  const euro = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v || 0)

  /* Charts */
  const lineData = {
    labels: m.labels,
    datasets: [
      {
        label: 'Kunden',
        data: m.customers,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#0a1b40',
        pointBackgroundColor: '#0a1b40',
        fill: 'start' as const,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(10,27,64,0.10)'
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, 'rgba(10,27,64,0.18)')
          grad.addColorStop(1, 'rgba(10,27,64,0.02)')
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
        borderColor: '#2563eb',
        pointBackgroundColor: '#2563eb',
        fill: 'start' as const,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(37,99,235,0.10)'
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, 'rgba(37,99,235,0.18)')
          grad.addColorStop(1, 'rgba(37,99,235,0.02)')
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
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 6,
          color: '#334155',
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
      softShadow: {},
    },
    scales: {
      x: {
        grid: { color: 'rgba(148,163,184,0.15)' },
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 },
      },
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
        borderColor: 'rgba(10,27,64,0.8)',
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(10,27,64,0.75)'
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, 'rgba(10,27,64,0.9)')
          grad.addColorStop(1, 'rgba(10,27,64,0.35)')
          return grad
        },
        borderRadius: 10,
        hoverBorderWidth: 2,
        hoverBorderColor: '#0a1b40',
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (ctx: any) =>
            ` ${new Intl.NumberFormat('de-DE').format(Number(ctx.parsed.y || 0))} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.15)', drawTicks: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (v: any) =>
            `${new Intl.NumberFormat('de-DE').format(Number(v))} €`,
        },
      },
    },
  }

  /* UI-Helfer: flachere KPI-Card */
  const kpiCard = (title: string, value: string | number, Icon: any) => (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
          {title}
        </p>
        <p className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          {value}
        </p>
      </div>
    </div>
  )

  /* Render */
  return (
    <section className="space-y-6">
      {/* OBERE WEISSE BOX */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4 lg:px-6 lg:py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Willkommen zurück
            </h1>
            <p className="text-sm text-slate-600">
              Eingeloggt als <span className="font-medium">{userEmail}</span>
            </p>
            <p className="text-xs text-slate-500 sm:text-sm">
              Behalten Sie Mitarbeiter, Kunden, Projekte und Ihren Umsatz jederzeit im Blick.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs – flacher + Umsatz-Card breit, aber nicht hoch */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>{kpiCard('Mitarbeiter', kpis.employees, UserGroupIcon)}</div>
        <div>{kpiCard('Kunden', kpis.customers, UserGroupIcon)}</div>
        <div>{kpiCard('Projekte', kpis.projects, BriefcaseIcon)}</div>
        <div>{kpiCard('Rechnungen', kpis.invoices, DocumentChartBarIcon)}</div>
        <div className="col-span-2 md:col-span-1">
          {kpiCard('Umsatz YTD', euro(kpis.revenueYTD), BanknotesIcon)}
        </div>
      </div>

      {/* KUNDEN-WERBEN-KUNDEN – mobil sehr kompakt, Desktop normal */}
      <div className="rounded-2xl bg-slate-900 px-4 py-4 text-slate-50 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-800 p-2 sm:p-2.5">
              <MegaphoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Kunden werben Kunden
              </p>
              <h2 className="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl">
                Empfehlen Sie GLENO weiter & sichern Sie sich{' '}
                <span className="text-emerald-300">59 € Gutschrift</span> pro geworbenem Unternehmen.
              </h2>
              <p className="text-xs text-slate-200 sm:text-[13px]">
                Für jedes Unternehmen, das über Ihren Link startet und mindestens{' '}
                <span className="font-semibold">3 Monate aktiv Kunde</span> bleibt, schreiben wir
                Ihnen <span className="font-semibold">59 € gut</span>.
              </p>

              {/* CTA – auf Mobile direkt unter dem Text */}
              <div className="mt-2 md:hidden">
                <Link
                  href="/dashboard/kunden-werben-kunden"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm"
                >
                  Jetzt Empfehlungslink ansehen
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Rechte Seite / Steps – nur ab md sichtbar, mobil haben wir nur Text + CTA */}
          <div className="hidden text-xs text-slate-100 md:block md:text-sm">
            <p className="font-medium">So funktioniert&apos;s:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Persönlichen Empfehlungslink aus Ihrem Profil kopieren</li>
              <li>Mit befreundeten Unternehmen teilen</li>
              <li>Unternehmen bleibt 3 Monate aktiv – Sie erhalten 59 € Gutschrift</li>
            </ul>
            <Link
              href="/dashboard/kunden-werben-kunden"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-200 underline-offset-2 hover:underline"
            >
              Mehr zum Empfehlungsprogramm
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kunden & Projekte */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Kunden- & Projektentwicklung
            </h3>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs">
              {[3, 6, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setRange(n as 3 | 6 | 12)}
                  className={`px-2.5 py-1 ${
                    range === n
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-white'
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

        {/* Umsatz pro Monat */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Umsatz pro Monat</h3>
            <span className="text-xs text-slate-500">
              Netto nach Rabatt – letzte {range} Monate
            </span>
          </div>
          <div className="h-56">
            <Bar data={barData} options={barOptions as any} />
          </div>
        </div>
      </div>

      {/* TERMINE & SUPPORT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Termine heute */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Heutige Termine</h3>
            <span className="text-xs text-slate-500">
              {appointments.length === 0
                ? 'Keine Termine'
                : `${appointments.length} Termin(e)`}
            </span>
          </div>

          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Heute ist frei – perfekt für Angebote, Rechnungen oder Organisation.
            </p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => {
                const dateYmd = new Date(a.start_time).toISOString().slice(0, 10)
                return (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/kalender?event=${a.id}&date=${dateYmd}`}
                      className="group block rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
                        <span className="font-medium text-slate-800 group-hover:text-slate-900">
                          {a.title || a.reason || 'Termin'}
                        </span>
                        <span className="ml-auto text-xs text-slate-500">
                          {new Date(a.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="ml-6 mt-0.5 text-xs text-slate-500">
                        {a.location}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Support */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Ihr persönlicher Kundenberater
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {contacts.name}
              </p>
              <p className="text-xs text-slate-500">
                Gründer von GLENO & erster Ansprechpartner für Einrichtung, Fragen zur Software
                und neue Ideen.
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                <li>• Unterstützung bei der Einrichtung</li>
                <li>• Praxisnahe Tipps aus Kundensicht</li>
                <li>• Gemeinsame Weiterentwicklung Ihrer Prozesse</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a
              href={`tel:${contacts.phone}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-white"
            >
              <PhoneIcon className="h-4 w-4" />
              Anrufen
            </a>
            <a
              href={`mailto:${contacts.email}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <EnvelopeIcon className="h-4 w-4" />
              E-Mail an Support
            </a>
            <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] text-slate-500">
              Antwort in der Regel innerhalb von 24 Stunden.
            </span>
          </div>
        </div>
      </div>

      {/* WARNUNGEN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Wichtige Hinweise (nächste 30 Tage)
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Materialbestand */}
          <div>
            <p className="text-xs font-medium text-slate-600">Materialbestand niedrig</p>
            {alerts.lowMaterials.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Aktuell alles im grünen Bereich.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.lowMaterials.slice(0, 6).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="ml-2">
                      {m.quantity} / {m.critical_quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* TÜV */}
          <div>
            <p className="text-xs font-medium text-slate-600">TÜV (Fuhrpark)</p>
            {alerts.dueFleet.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Keine Fälligkeiten innerhalb der nächsten 30 Tage.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.dueFleet.slice(0, 6).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span>{f.license_plate}</span>
                    <span className="ml-2">
                      {f.inspection_due_date ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Werkzeugprüfungen */}
          <div>
            <p className="text-xs font-medium text-slate-600">Werkzeug-Prüfungen</p>
            {alerts.dueTools.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Keine Prüfungen in den nächsten 30 Tagen fällig.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.dueTools.slice(0, 6).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="ml-2">
                      {t.next_inspection_due ?? '—'}
                    </span>
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
