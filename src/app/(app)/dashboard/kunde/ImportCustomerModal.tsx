'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
// @ts-ignore
import Papa from 'papaparse'

export default function ImportCustomersModal() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const router = useRouter()

  const toggle = () => { setOpen(o => !o); setRows([]); setErrors([]) }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results: any) => {
        const data = results.data as any[]
        const errs: string[] = []
        data.forEach((row, i) => { if (!row.email && !row.phone) errs.push(`Zeile ${i + 2}: E-Mail oder Telefon fehlt.`) })
        setRows(data); setErrors(errs)
      },
      error: (err: any) => setErrors([err.message]),
    })
  }

  const onImport = async () => {
    const valid = rows.filter((_, i) => !errors.some(msg => msg.startsWith(`Zeile ${i + 2}:`)))
    const res = await fetch('/api/customers/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customers: valid }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message)
    } else { toggle(); router.refresh() }
  }

  return (
    <>
      <button onClick={toggle}
        className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow hover:bg-white">
        Importieren
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={toggle} />
          <div className="absolute left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.15)] backdrop-blur-xl">
            <h2 className="text-lg font-medium text-slate-900">Kunden per CSV importieren</h2>

            <input type="file" accept=".csv" onChange={onFileChange}
              className="mt-4 block w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm shadow hover:bg-white file:mr-4 file:rounded-md file:border file:border-white/60 file:bg-white file:px-3 file:py-2 file:text-sm hover:file:bg-white" />

            {errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {rows.length > 0 && (
              <div className="mt-4 max-h-60 overflow-auto rounded border border-white/60 bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/70">
                    <tr>
                      {Object.keys(rows[0]).map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const invalid = errors.some(msg => msg.startsWith(`Zeile ${i + 2}:`))
                      return (
                        <tr key={i} className={invalid ? 'bg-rose-50' : ''}>
                          {Object.values(r).map((v, j) => (
                            <td key={j} className="px-2 py-1">{String(v ?? '')}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={toggle} className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow hover:bg-white">
                Abbrechen
              </button>
              <button onClick={onImport} disabled={errors.length > 0 || rows.length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50">
                Importieren
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
