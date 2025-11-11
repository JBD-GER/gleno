'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

type Props = { employeeId: string }
type ChangeEvt = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>

export default function AbsenceModal({ employeeId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [mounted, setMounted] = useState(false) // wichtig fürs Portal
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    type: 'Urlaub',
    reason: '',
  })

  useEffect(() => { setMounted(true) }, [])

  const onChange = (e: ChangeEvt) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const reset = () => {
    setForm({ start_date: '', end_date: '', type: 'Urlaub', reason: '' })
    setFile(null)
  }

  const save = async () => {
    if (!form.start_date || !form.end_date) {
      alert('Bitte Von- und Bis-Datum angeben.')
      return
    }
    setLoading(true)
    try {
      // optional: Datei hochladen
      let document_path: string | undefined
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('dir', 'absences')
        const upRes = await fetch(`/api/employees/${employeeId}/documents`, {
          method: 'POST',
          body: fd,
        })
        if (!upRes.ok) throw new Error(await upRes.text() || 'Upload fehlgeschlagen')
        const { path } = await upRes.json()
        document_path = path
      }

      // Abwesenheit speichern
      const res = await fetch(`/api/employees/${employeeId}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, document_path }),
      })
      if (!res.ok) throw new Error(await res.text() || 'Fehler beim Speichern')

      window.dispatchEvent(new CustomEvent('absences:updated', { detail: { employeeId } }))
      router.refresh()
      setOpen(false)
      reset()
    } catch (e: any) {
      alert(`Fehler: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const inputGlass =
    'w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 ' +
    'placeholder:text-slate-400 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 backdrop-blur'

  const btnGlass =
    'rounded-lg border border-white/60 bg-white/80 px-5 py-2 text-sm text-slate-900 shadow-sm backdrop-blur ' +
    'hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors'

  // Trigger-Button (immer sichtbar)
  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
    >
      + Abwesenheit erfassen
    </button>
  )

  // Modal-Inhalt (per Portal in <body>)
  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

            {/* Scroll-Wrapper für lange Inhalte */}
            <div className="absolute inset-0 overflow-y-auto">
              <div className="mx-auto my-8 w-full max-w-xl px-4">
                {/* Dialog */}
                <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl">
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Abwesenheit eintragen</h3>
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-white"
                      aria-label="Schließen"
                    >
                      ×
                    </button>
                  </div>

                  {/* Formular */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Von *</label>
                      <input type="date" name="start_date" value={form.start_date} onChange={onChange} className={inputGlass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Bis *</label>
                      <input type="date" name="end_date" value={form.end_date} onChange={onChange} className={inputGlass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Grund *</label>
                      <select name="type" value={form.type} onChange={onChange} className={inputGlass}>
                        {['Urlaub','Krankheit','Unfall','Fortbildung','Sonstiges'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Notiz</label>
                      <textarea
                        name="reason"
                        value={form.reason}
                        onChange={onChange}
                        rows={3}
                        className={inputGlass}
                        placeholder="z. B. AU vorgelegt, Resturlaub usw."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Dokument (optional)</label>
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-900
                                   file:mr-3 file:rounded-lg file:border file:border-white/60
                                   file:bg-white/80 file:px-3 file:py-2 file:text-slate-900
                                   hover:file:bg-white backdrop-blur"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Wird privat gespeichert unter: <code>mitarbeiter/abwesenheit/{employeeId}/…</code>
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => { setOpen(false); reset(); }}
                      className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm hover:bg-white"
                      disabled={loading}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={save}
                      disabled={loading}
                      className={btnGlass + ' disabled:opacity-50'}
                    >
                      {loading ? 'Speichert…' : 'Speichern'}
                    </button>
                  </div>
                </div>
                {/* /Dialog */}
              </div>
            </div>
            {/* /Scroll-Wrapper */}
          </div>,
          document.body
        )
      : null

  return (
    <>
      {trigger}
      {modal}
    </>
  )
}
