// ✅ PFAD: src/app/(app)/dashboard/buchhaltung/angebot/templates/neu/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewOfferTemplatePage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setLoading(true)
    try {
      const res = await fetch('/api/angebot/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Fehler')
      router.push(`/dashboard/buchhaltung/angebot/templates/${data.id}`)
    } catch (e: any) {
      alert(e?.message || 'Fehler beim Anlegen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Neues Angebots-Template</h1>
      <form onSubmit={onSubmit} className="max-w-md space-y-3">
        <label className="block text-sm font-medium text-slate-700">Name des Templates</label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z. B. Standard Bad | Material & Arbeit"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {loading ? 'Erstelle…' : 'Weiter'}
          </button>
        </div>
      </form>
    </div>
  )
}
