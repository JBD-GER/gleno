'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewInvoiceButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rechnung/next-invoice-number')
      if (!res.ok) throw new Error(await res.text())
      const { nextNumber } = await res.json()
      router.push(
        `/dashboard/buchhaltung/rechnung/rechnung-erstellen?invoiceNumber=${encodeURIComponent(
          nextNumber,
        )}`,
      )
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={loading}
        title="Rechnung erstellen"
        className={[
          'inline-flex items-center gap-2 rounded-full px-4 py-2',
          // HIER ebenfalls kleiner:
          'text-xs sm:text-sm font-medium transition',
          'border border-white/60 bg-white/90 text-slate-900 shadow hover:bg-white',
          'focus:outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-200',
          loading ? 'cursor-wait opacity-60' : '',
        ].join(' ')}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              className="opacity-25"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10h-3"
              className="opacity-90"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        )}
        <span>Rechnung erstellen</span>
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
