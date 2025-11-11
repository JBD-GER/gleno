'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = { employeeId: string; disabled?: boolean }

export default function InviteEmployeeModal({ employeeId, disabled }: Props) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Status
  const [linked, setLinked] = useState<boolean | null>(null)
  const [isDisabled, setIsDisabled] = useState<boolean>(false)

  useEffect(() => setMounted(true), [])

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/employees/link-status?employeeId=${encodeURIComponent(employeeId)}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Status konnte nicht ermittelt werden')
      setLinked(Boolean(json?.linked))
      setIsDisabled(Boolean(json?.disabled))
    } catch (e: any) {
      setLinked(false)
      setIsDisabled(false)
      setErr(e?.message || 'Status konnte nicht ermittelt werden')
    }
  }

  useEffect(() => { if (open) { setMsg(null); setErr(null); fetchStatus() } }, [open])
  useEffect(() => { fetchStatus() }, [employeeId])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const sendInvite = async () => {
    setLoading(true); setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Einladung fehlgeschlagen')
      setMsg('Einladung wurde gesendet.')
      await fetchStatus()
    } catch (e: any) {
      setErr(e?.message || 'Einladung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const unlinkEmployee = async () => {
    setLoading(true); setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/employees/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Verknüpfung konnte nicht aufgehoben werden')
      setMsg('Zugang wurde deaktiviert. Die Person kann sich nicht mehr einloggen.')
      await fetchStatus()
    } catch (e: any) {
      setErr(e?.message || 'Verknüpfung konnte nicht aufgehoben werden')
    } finally {
      setLoading(false)
    }
  }

  const relinkEmployee = async () => {
    setLoading(true); setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/employees/relink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Reaktivierung fehlgeschlagen')
      setMsg('Zugang wurde reaktiviert.')
      await fetchStatus()
    } catch (e: any) {
      setErr(e?.message || 'Reaktivierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const modalUI = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-[min(560px,95vw)] rounded-2xl border border-white/60 bg-white/90 p-5 shadow-2xl">
        {/* Header + Text */}
        {linked ? (
          <>
            <h3 className="text-base font-semibold text-slate-900">
              {isDisabled ? 'Zugang reaktivieren' : 'Verknüpfung aufheben'}
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {isDisabled
                ? 'Dieser Zugang ist derzeit deaktiviert. Du kannst ihn wieder aktivieren.'
                : 'Dieser Mitarbeiter hat aktuell Zugang. Beim Aufheben wird der Zugang deaktiviert (kein Login mehr möglich).'}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-slate-900">Einladung senden</h3>
            <p className="mt-2 text-sm text-slate-700">
              Dem Mitarbeiter wird eine E-Mail mit Registrierungslink gesendet (gültige E-Mail im Datensatz nötig).
            </p>
          </>
        )}

        {msg && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}
        {err && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white"
          >
            Schließen
          </button>

          {linked ? (
            isDisabled ? (
              <button
                onClick={relinkEmployee}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Aktiviere…' : 'Zugang reaktivieren'}
              </button>
            ) : (
              <button
                onClick={unlinkEmployee}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? 'Entziehe…' : 'Zugang entziehen'}
              </button>
            )
          ) : (
            <button
              onClick={sendInvite}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
            >
              {loading ? 'Sendet…' : 'Einladung senden'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm hover:bg-white disabled:opacity-50"
        title="Zugang verwalten"
      >
        {linked ? (isDisabled ? 'Zugang reaktivieren' : 'Zugang entziehen') : 'Mitarbeiter einladen'}
      </button>
      {mounted && open && createPortal(modalUI, document.body)}
    </>
  )
}
