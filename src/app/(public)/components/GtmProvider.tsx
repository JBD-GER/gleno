'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window { dataLayer?: any[] }
}

export default function GtmProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const page_path = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ''}`
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: 'page_view', page_path })
  }, [pathname, searchParams])

  return null
}
