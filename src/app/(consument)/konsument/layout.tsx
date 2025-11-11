import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import KonsumentNav from './components/KonsumentNav'

export const dynamic = 'force-dynamic'

export default async function KonsumentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await supabaseServer()

  // Session prüfen
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Rolle laden
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profErr) {
    redirect('/login')
  }

  // Nur Konsument
  if (profile?.role !== 'konsument') {
    redirect('/dashboard')
  }

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        bg-[radial-gradient(1200px_520px_at_50%_-10%,rgba(10,27,64,0.06),transparent),
            radial-gradient(900px_420px_at_10%_0%,rgba(10,27,64,0.04),transparent),
            radial-gradient(900px_420px_at_90%_0%,rgba(10,27,64,0.04),transparent)]
      "
    >
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Logo + Label */}
          <div className="flex items-center gap-3">
            <Link href="/konsument" className="flex items-center gap-3">
              {/* Vertikales Logo deutlich größer */}
              <div className="relative h-12 w-12 sm:h-14 sm:w-25">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Konsumentenbereich
              </span>
              <span className="text-[10px] text-slate-400">
                Angebote einholen & Aufträge steuern
              </span>
            </div>
          </div>

          {/* Navigation (Desktop + Mobile via Client-Komponente) */}
          <KonsumentNav />
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
        <div
          className="
            rounded-3xl
          "
        >
          {children}
        </div>
      </main>
    </div>
  )
}
