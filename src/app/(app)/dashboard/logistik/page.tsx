import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import {
  CubeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

export default async function LogistikOverviewPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const [materialsRes, suppliersRes, fleetRes, toolsRes] = await Promise.all([
    supabase
      .from('materials')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('fleet')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('tools')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const materialsCount = materialsRes.count ?? 0
  const suppliersCount = suppliersRes.count ?? 0
  const fleetCount = fleetRes.count ?? 0
  const toolsCount = toolsRes.count ?? 0

  const tiles = [
    {
      href: '/dashboard/logistik/materialien',
      title: 'Materialien',
      count: materialsCount,
      Icon: CubeIcon,
      chip: 'Bestand',
      accent: 'from-indigo-500/14 to-indigo-500/0',
    },
    {
      href: '/dashboard/logistik/lieferanten',
      title: 'Lieferanten',
      count: suppliersCount,
      Icon: BuildingStorefrontIcon,
      chip: 'Partner',
      accent: 'from-emerald-500/16 to-emerald-500/0',
    },
    {
      href: '/dashboard/logistik/fuhrpark',
      title: 'Fuhrpark',
      count: fleetCount,
      Icon: TruckIcon,
      chip: 'Fahrzeuge',
      accent: 'from-amber-500/16 to-amber-500/0',
    },
    {
      href: '/dashboard/logistik/werkzeug',
      title: 'Werkzeug',
      count: toolsCount,
      Icon: WrenchScrewdriverIcon,
      chip: 'Inventar',
      accent: 'from-rose-500/16 to-rose-500/0',
    },
  ]

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {/* KEIN mx-auto / max-w mehr -> volle Breite im Contentbereich */}
      <div className="w-full space-y-6">
        {/* Hero / Kopf – Glass */}
        <section
          className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 px-4 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.32)] backdrop-blur-2xl sm:px-6 sm:py-6"
          style={{
            backgroundImage:
              'radial-gradient(1100px 420px at 110% -20%, rgba(30,64,175,0.09), transparent)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Logistik – Übersicht
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Logistik
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Materialien, Lieferanten, Fuhrpark und Werkzeug – zentral
                  organisiert, schnell erreichbar und jederzeit im Blick.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-right text-xs text-slate-600">
              <span className="font-medium text-slate-800">
                Aktive Einheiten
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] font-mono text-slate-50">
                  Mat: {materialsCount}
                </span>
                <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-slate-50">
                  Lfr: {suppliersCount}
                </span>
                <span className="rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-mono text-slate-50">
                  Fzg: {fleetCount}
                </span>
                <span className="rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-slate-50">
                  Wzg: {toolsCount}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tiles – volle Breite, aber mit Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map(({ href, title, count, Icon, chip, accent }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_14px_40px_rgba(15,23,42,0.24)] backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(15,23,42,0.32)]"
              style={{
                backgroundImage:
                  'radial-gradient(520px 230px at 120% -30%, rgba(15,23,42,0.06), transparent)',
              }}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
              />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-2.5 shadow-sm">
                      <Icon className="h-6 w-6 text-slate-800" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {title}
                      </h2>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">
                        {chip}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon className="mt-1 h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                </div>

                <div className="mt-5 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Gesamt
                    </p>
                    <p className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                      {count}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tippen zum Öffnen
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
