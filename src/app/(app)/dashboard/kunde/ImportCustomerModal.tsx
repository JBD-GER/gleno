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

  const toggle = () => {
    setOpen((o) => !o)
    setRows([])
    setErrors([])
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const data = results.data as any[]
        const errs: string[] = []
        data.forEach((row, i) => {
          if (!row.email && !row.phone) {
            errs.push(`Zeile ${i + 2}: E-Mail oder Telefon fehlt.`)
          }
        })
        setRows(data)
        setErrors(errs)
      },
      error: (err: any) => setErrors([err.message]),
    })
  }

  const onImport = async () => {
    const valid = rows.filter(
      (_: any, i: number) =>
        !errors.some((msg) => msg.startsWith(`Zeile ${i + 2}:`)),
    )
    const res = await fetch('/api/customers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customers: valid }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message)
    } else {
      toggle()
      router.refresh()
    }
  }

  const ghostBtn =
    'rounded-xl border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-white transition-colors'

  return (
    <>
      <button onClick={toggle} className={ghostBtn}>
        Importieren
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[1000]">
            <div className="absolute inset-0 bg-black/45" onClick={toggle} />

            <div className="absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/70 bg-white/95 px-4 py-4 text-sm shadow-[0_20px_60px_rgba(2,6,23,0.18)] backdrop-blur-xl sm:px-5 sm:py-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-slate-900">
                  Kunden per CSV importieren
                </h2>
                <button
                  onClick={toggle}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm hover:bg-slate-50"
                  aria-label="Schließen"
                >
                  ×
                </button>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={onFileChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-900 shadow-inner placeholder:text-slate-400 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs hover:file:bg-white"
              />

              {errors.length > 0 && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}

              {rows.length > 0 && (
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-100 bg-white/80">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr>
                        {Object.keys(rows[0]).map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1 text-left text-[11px] font-semibold text-slate-700"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const invalid = errors.some((msg) =>
                          msg.startsWith(`Zeile ${i + 2}:`),
                        )
                        return (
                          <tr
                            key={i}
                            className={invalid ? 'bg-rose-50/80' : undefined}
                          >
                            {Object.values(r).map((v, j) => (
                              <td
                                key={j}
                                className="px-2 py-1 text-[11px] text-slate-700"
                              >
                                {String(v ?? '')}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={toggle} className={ghostBtn}>
                  Abbrechen
                </button>
                <button
                  onClick={onImport}
                  disabled={errors.length > 0 || rows.length === 0}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Importieren
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
