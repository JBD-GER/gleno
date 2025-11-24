'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../components/Sidebar'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

type ResponsiveShellProps = {
  userEmail: string
  children: React.ReactNode
}

export default function ResponsiveShell({ userEmail, children }: ResponsiveShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Drawer schließen, wenn Route wechselt
  useEffect(() => {
    if (open) setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Links im Drawer erkennen und Drawer schließen
  function handleDrawerClickCapture(e: React.SyntheticEvent) {
    const target = e.target as HTMLElement | null
    if (!target) return
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null
    if (anchor) setOpen(false)
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-bg">
      {/* Desktop / großes Layout: feste Sidebar (ab XL) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white xl:block">
        <Sidebar userEmail={userEmail} />
      </aside>

      {/* Mobile + Tablet Topbar (bis < XL) */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl xl:hidden">
        {/* <<< HIER: w-full statt max-w-5xl + mx-auto entfernt, damit Burger & Logo bündig sind >>> */}
        <div className="flex w-full items-center justify-between gap-3">
          {/* Toggle-Button LINKS */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe5f5] bg-white text-[#0a1b40] shadow-[0_6px_16px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5d5f4]"
            aria-label="Menü öffnen"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          {/* Logo RECHTS – führt immer zum Dashboard */}
          <Link href="/dashboard" className="ml-auto flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="GLENO"
              width={140}
              height={32}
              priority
              className="h-7 w-auto"
            />
            <span className="sr-only">Zum Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Mobile / Tablet Drawer (bis < XL) */}
      {open && (
        <div className="xl:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Menü schließen"
          />

          {/* Panel */}
          <div
            className="fixed inset-y-0 left-0 z-50 flex h-full w-[86vw] max-w-[360px] flex-col rounded-r-3xl border-r border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_18px_60px_rgba(15,23,42,0.45)]"
            onClickCapture={handleDrawerClickCapture}
          >
            {/* Drawer-Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  GLENO
                </span>
                <span className="text-sm font-medium text-slate-900">
                  Dein Arbeitsbereich
                </span>
                <span className="max-w-[190px] truncate text-[11px] text-slate-500">
                  {userEmail}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe5f5] bg-white text-[#0a1b40] shadow-[0_6px_16px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5d5f4]"
                aria-label="Menü schließen"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Inhalt: Sidebar füllt den Rest, mit Scroll falls nötig */}
            <div className="flex-1 overflow-y-auto">
              <Sidebar userEmail={userEmail} />
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="min-h-dvh px-1 py-2 sm:px-2 md:px-3 xl:ml-64 xl:px-6 xl:py-4">
        {children}
      </main>
    </div>
  )
}
