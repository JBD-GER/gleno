// src/components/AddressModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

type AddressModalProps = {
  open: boolean
  onClose: () => void
  requestId: string
}

function Input({
  label, type = 'text', value, onChange, placeholder, className = '',
}: {
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-[15px]
                   shadow-sm outline-none ring-0 focus:border-white/60 focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  )
}

export default function AddressModal({ open, onClose, requestId }: AddressModalProps) {
  const [busy, setBusy] = React.useState(false)
  const [same, setSame] = React.useState(true)

  const [bill, setBill] = React.useState({
    first_name: '', last_name: '', company: '',
    street: '', house_number: '', postal_code: '', city: '',
    phone: '', email: '',
  })
  const [exec, setExec] = React.useState({
    street: '', house_number: '', postal_code: '', city: '',
  })

  React.useEffect(() => {
    if (same) {
      setExec({
        street: bill.street,
        house_number: bill.house_number,
        postal_code: bill.postal_code,
        city: bill.city,
      })
    }
  }, [same, bill.street, bill.house_number, bill.postal_code, bill.city])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/konsument/chat/${requestId}/personal-data`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bill_first_name: bill.first_name,
          bill_last_name: bill.last_name,
          bill_company: bill.company,
          bill_street: bill.street,
          bill_house_number: bill.house_number,
          bill_postal_code: bill.postal_code,
          bill_city: bill.city,
          bill_phone: bill.phone,
          bill_email: bill.email,
          exec_same_as_billing: same,
          exec_street: exec.street,
          exec_house_number: exec.house_number,
          exec_postal_code: exec.postal_code,
          exec_city: exec.city,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)

      // Header/Chat informieren (Presence neu laden)
      window.dispatchEvent(new CustomEvent('personal-data:updated', { detail: { requestId } }))

      // Erfolgreich -> Modal sofort schließen
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const modalNode = (
    <div
      className="fixed inset-0 z-[100000] flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-white/10 backdrop-blur-2xl"
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        className="relative z-10 my-6 sm:my-10 w-full max-w-3xl rounded-3xl border border-white/60
                   bg-white/90 backdrop-blur-xl p-4 sm:p-6 shadow-[0_10px_34px_rgba(2,6,23,0.12)]
                   max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900">Personendaten</h3>
            <p className="mt-1 text-xs text-slate-500">
              Bitte trage deine Rechnungsadresse ein. Falls der Ausführungsort abweicht, kannst du ihn unten angeben.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-sm hover:shadow-sm mt-1 sm:mt-0"
          >
            Schließen
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 sm:px-4 py-3 text-[13px] text-amber-900">
          <div className="font-medium">Hinweis zum Datenschutz</div>
          <p className="mt-1 leading-relaxed">
            Du kannst diese Daten später jederzeit über „Personendaten löschen“ entfernen.
            Eine vollständige Löschung lokal gespeicherter Daten beim Partner kann nicht garantiert werden,
            da diese vom Partner eigenverantwortlich zu löschen sind.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Vorname" value={bill.first_name} onChange={(e)=>setBill(s=>({ ...s, first_name: e.target.value }))} />
          <Input label="Nachname" value={bill.last_name} onChange={(e)=>setBill(s=>({ ...s, last_name: e.target.value }))} />
          <Input label="Firma (optional)" value={bill.company} onChange={(e)=>setBill(s=>({ ...s, company: e.target.value }))} className="md:col-span-2" />
          <Input label="Straße" value={bill.street} onChange={(e)=>setBill(s=>({ ...s, street: e.target.value }))} />
          <Input label="Hausnummer" value={bill.house_number} onChange={(e)=>setBill(s=>({ ...s, house_number: e.target.value }))} />
          <Input label="PLZ" value={bill.postal_code} onChange={(e)=>setBill(s=>({ ...s, postal_code: e.target.value }))} />
          <Input label="Ort" value={bill.city} onChange={(e)=>setBill(s=>({ ...s, city: e.target.value }))} />
          <Input label="Telefon" value={bill.phone} onChange={(e)=>setBill(s=>({ ...s, phone: e.target.value }))} />
          <Input label="E-Mail" type="email" value={bill.email} onChange={(e)=>setBill(s=>({ ...s, email: e.target.value }))} />
        </div>

        <div className="mt-6">
          <label className="inline-flex select-none items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={same}
              onChange={(e)=>setSame(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Ausführungsort wie Rechnungsadresse
          </label>

          {!same && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Ausführungsort: Straße" value={exec.street} onChange={(e)=>setExec(s=>({ ...s, street: e.target.value }))} />
              <Input label="Hausnummer" value={exec.house_number} onChange={(e)=>setExec(s=>({ ...s, house_number: e.target.value }))} />
              <Input label="PLZ" value={exec.postal_code} onChange={(e)=>setExec(s=>({ ...s, postal_code: e.target.value }))} />
              <Input label="Ort" value={exec.city} onChange={(e)=>setExec(s=>({ ...s, city: e.target.value }))} />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-white/60 bg-white px-4 py-2 text-sm hover:shadow-sm"
          >
            Abbrechen
          </button>
          <button
            disabled={busy}
            className="w-full sm:w-auto rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode
}
