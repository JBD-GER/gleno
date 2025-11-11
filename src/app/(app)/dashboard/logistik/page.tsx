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

  const { count: materialsCount } = await supabase
    .from('materials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: suppliersCount } = await supabase
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: fleetCount } = await supabase
    .from('fleet')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: toolsCount } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const tiles = [
    {
      href: '/dashboard/logistik/materialien',
      title: 'Materialien',
      count: materialsCount ?? 0,
      Icon: CubeIcon,
      chip: 'Bestand',
      accent: 'from-indigo-500/15 to-indigo-500/0',
    },
    {
      href: '/dashboard/logistik/lieferanten',
      title: 'Lieferanten',
      count: suppliersCount ?? 0,
      Icon: BuildingStorefrontIcon,
      chip: 'Partner',
      accent: 'from-emerald-500/15 to-emerald-500/0',
    },
    {
      href: '/dashboard/logistik/fuhrpark',
      title: 'Fuhrpark',
      count: fleetCount ?? 0,
      Icon: TruckIcon,
      chip: 'Fahrzeuge',
      accent: 'from-amber-500/15 to-amber-500/0',
    },
    {
      href: '/dashboard/logistik/werkzeug',
      title: 'Werkzeug',
      count: toolsCount ?? 0,
      Icon: WrenchScrewdriverIcon,
      chip: 'Inventar',
      accent: 'from-rose-500/15 to-rose-500/0',
    },
  ]

  return (
    <div className="px-6 py-6">
      {/* Hero / Kopf – Glass */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl"
        style={{ backgroundImage: 'radial-gradient(1100px 420px at 110% -20%, rgba(30,64,175,0.08), transparent)' }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
          Logistik – Übersicht
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Logistik</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bestand, Lieferanten, Fuhrpark und Werkzeug – schnell erreichbar, zentral verwaltet.
        </p>
      </div>

      {/* Tiles – Glass */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ href, title, count, Icon, chip, accent }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundImage: 'radial-gradient(500px 220px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
            <div className="relative p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow-sm">
                    <Icon className="h-6 w-6 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">
                      {chip}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5" />
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">Gesamt</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">{count}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
