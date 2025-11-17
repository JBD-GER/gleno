'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../components/Sidebar'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

export default function ResponsiveShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Falls per Router navigiert wird (z. B. programmatic), Drawer schließen
  useEffect(() => {
    if (open) setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Event-Delegation: jeden Link-Klick im Drawer erkennen und schließen
  function handleDrawerClickCapture(e: React.SyntheticEvent) {
    const target = e.target as HTMLElement | null
    if (!target) return
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null
    if (anchor) {
      setOpen(false)
    }
  }

  return (
    <div className="min-h-dvh w-full bg-bg overflow-x-hidden">
      {/* Desktop Sidebar (fixed) */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white">
        <Sidebar userEmail={userEmail} />
      </aside>

      {/* Mobile Topbar */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-1 py-1">
          <Link href="/" className="min-w-0 flex items-center gap-2">
            <Image
              src="/favi.png"
              alt="GLENO"
              width={320}
              height={74}
              priority
              className="h-16 w-auto max-w-[80vw]"
            />
            <span className="sr-only">Start</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-slate-200 hover:bg-slate-50"
            aria-label="Menü öffnen"
          >
            <Bars3Icon className="h-5 w-5 text-slate-700" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[360px] border-r border-slate-200 bg-white shadow-xl"
            // <<< Wichtig: Hier fangen wir alle Link-Klicks im Drawer ab
            onClickCapture={handleDrawerClickCapture}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <span className="text-sm font-medium text-slate-700">Menü</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-slate-200 hover:bg-slate-50"
                aria-label="Menü schließen"
              >
                <XMarkIcon className="h-5 w-5 text-slate-700" />
              </button>
            </div>
            <div className="h-[calc(100%-2.5rem)] overflow-y-auto">
              <Sidebar userEmail={userEmail} />
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="lg:ml-64 px-0 sm:px-1 md:px-2 lg:px-5 py-1 md:py-2 min-h-dvh">
        {children}
      </main>
    </div>
  )
}
