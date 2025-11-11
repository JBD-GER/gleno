'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ChromeGuard() {
  const pathname = usePathname()
  useEffect(() => {
    const off = pathname?.startsWith('/w/')
    document.documentElement.classList.toggle('no-chrome', !!off)
  }, [pathname])
  return null
}
