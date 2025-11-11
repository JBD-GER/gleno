'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

function isHandwerkerSite(path: string | null) {
  return !!path && path.startsWith('/w/')
}

/** Rendert seine Kinder NICHT auf /w/... */
export function MaybeChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isHandwerkerSite(pathname)) return null
  return <>{children}</>
}

/** Gibt dem <main> nur auf Nicht-/w/... den Header-Offset */
export function MainWithOffset({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const base =
    'bg-bg-200 font-sans text-text-700 overflow-x-hidden max-w-[100vw]'
  const withOffset = 'pt-14 md:pt-16 ' + base
  const noOffset = base
  return <main className={isHandwerkerSite(pathname) ? noOffset : withOffset}>{children}</main>
}
