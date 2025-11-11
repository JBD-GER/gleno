// /konsument/anfragen/DeleteLeadToggle.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteLeadToggle({ id, isDeleted }: { id: string; isDeleted: boolean }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function onToggle() {
    if (busy) return
    if (!isDeleted) {
      const ok = window.confirm('Diese Anfrage als „Gelöscht“ markieren? Bewerbungen/Nachrichten sind dann nicht mehr möglich.')
      if (!ok) return
    }
    setBusy(true)
    try {
      const targetStatus = isDeleted ? 'anfrage' : 'geloescht'
      const res = await fetch(`/api/markt/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (!res.ok) throw new Error('failed')
      router.refresh()
    } catch {
      alert(isDeleted ? 'Konnte nicht reaktivieren.' : 'Konnte nicht löschen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className={
        isDeleted
          ? 'rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50'
          : 'rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50'
      }
      type="button"
      title={isDeleted ? 'Anfrage reaktivieren' : 'Anfrage als gelöscht markieren'}
    >
      {busy ? (isDeleted ? 'Reaktiviere…' : 'Lösche…') : (isDeleted ? 'Reaktivieren' : 'Löschen')}
    </button>
  )
}
