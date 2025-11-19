'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Transition } from '@headlessui/react'
import {
  Bars3Icon, XMarkIcon, HomeIcon, ChartPieIcon, Cog6ToothIcon, LifebuoyIcon, PresentationChartBarIcon,
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

const PRIMARY = '#0a1b40'

const navLinks = [
  { href: '/',           label: 'Startseite',  icon: HomeIcon },
  { href: '/funktionen', label: 'Funktionen',  icon: Cog6ToothIcon },
  { href: '/preis',      label: 'Preis',       icon: ChartPieIcon },
  { href: '/support',    label: 'Support',     icon: LifebuoyIcon },
  { href: '/markt',      label: 'Markt',       icon: PresentationChartBarIcon },
]

export default function Header() {
  const supabase = supabaseClient()
  const path = usePathname()

  // 👉 Auf diesen Routen soll der Header IMMER „public“ bleiben (kein Auth-Status laden)
  const blindAuthOn = ['/neues-passwort', '/auth/callback']
  const onBlindRoute = blindAuthOn.some(p => (path ?? '').startsWith(p))

  const [open, setOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (onBlindRoute) {
      // Erzwinge public-UI (so „sieht“ der Header den temporären Recovery-Login nicht)
      setUserEmail(null)
      return
    }
    // Auf allen anderen Routen: echten Auth-Status laden
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [supabase, onBlindRoute])

  const isDashboard = !onBlindRoute && path?.startsWith('/dashboard')

  return (
    <>
      {/* Mobile Topbar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/60 bg-white/80 px-4 backdrop-blur-xl md:hidden min-w-0 max-w-[100vw] overflow-x-hidden">
        <Link href="/" className="flex items-center gap-2 min-w-0" aria-label="Startseite">
          <Image
            src="/logo.png"
            alt="GLENO"
            width={320}
            height={74}
            priority
            /* Logo nicht höher als die Bar */
            className="h-10 w-auto max-w-[60vw]"
          />
          <span className="sr-only">GLENO</span>
        </Link>
        <button
          aria-label="Menü öffnen"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg p-2 hover:bg-white/80"
        >
          <Bars3Icon className="h-6 w-6 text-slate-700" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <Transition show={open}>
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed right-0 top-0 h-full w-72 overflow-y-auto border-l border-white/60 bg-white/80 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-semibold text-slate-900">Menü</span>
              <button
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-white/80"
              >
                <XMarkIcon className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <ul className="space-y-2">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = path === href
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition ${
                        active
                          ? 'text-white'
                          : 'border border-white/60 bg-white/70 text-slate-800 hover:bg-white'
                      }`}
                      style={active ? { backgroundColor: PRIMARY } : {}}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="mt-6">
              <Link href={userEmail ? '/dashboard' : '/login'}>
                <button
                  onClick={() => setOpen(false)}
                  className="group relative w-full overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 hover:shadow-[0_12px_30px_rgba(10,27,64,.35)]"
                  style={{ backgroundColor: PRIMARY, boxShadow: '0 6px 18px rgba(10,27,64,.25)' }}
                >
                  <span className="pointer-events-none absolute inset-y-0 -left-24 w-24 -skew-x-12 bg-white/25 opacity-0 blur-sm transition-all duration-500 group-hover:left-full group-hover:opacity-100" />
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-white/0 transition group-hover:ring-2 group-hover:ring-white/20" />
                  {userEmail ? 'Dashboard' : 'Login'}
                </button>
              </Link>
            </div>
          </nav>
        </div>
      </Transition>

      {/* Desktop Header */}
      <header className="fixed inset-x-0 top-0 z-50 hidden h-16 items-center justify-between border-b border-white/60 bg-white/80 px-8 backdrop-blur-xl md:flex max-w-[100vw] overflow-x-hidden">
        <Link href="/" className="flex items-center gap-3 min-w-0" aria-label="Startseite">
          <Image
            src="/logo.png"
            alt="GLENO"
            width={480}
            height={112}
            priority
            /* Logo nicht höher als die Bar */
            className="h-12 w-auto max-w-[40vw]"
          />
          <span className="sr-only">GLENO</span>
        </Link>

        <nav className="flex gap-2">
          {navLinks.map(({ href, label }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active ? 'text-white' : 'border border-white/60 bg-white/70 text-slate-800 hover:bg-white'
                }`}
                style={active ? { backgroundColor: PRIMARY } : {}}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <Link href={userEmail ? '/dashboard' : '/login'} aria-current={!onBlindRoute && path?.startsWith('/dashboard') ? 'page' : undefined}>
          <button
            className={`group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition
                        hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20
                        hover:shadow-[0_14px_34px_rgba(10,27,64,.38)] ${!onBlindRoute && path?.startsWith('/dashboard') ? 'ring-2 ring-white/30' : ''}`}
            style={{ backgroundColor: PRIMARY, boxShadow: '0 6px 18px rgba(10,27,64,.25)' }}
          >
            <span className="pointer-events-none absolute inset-y-0 -left-24 w-24 -skew-x-12 bg-white/25 opacity-0 blur-sm transition-all duration-500 group-hover:left-full group-hover:opacity-100" />
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-white/0 transition group-hover:ring-2 group-hover:ring-white/20" />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 to-white/0 transition group-hover:from-white/5 group-hover:to-white/0" />
            {userEmail ? 'Dashboard' : 'Login'}
          </button>
        </Link>
      </header>
    </>
  )
}
