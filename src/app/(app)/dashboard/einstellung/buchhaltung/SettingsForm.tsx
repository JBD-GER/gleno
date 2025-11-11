'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface BillingSettings {
  user_id: string
  invoice_prefix: string
  invoice_suffix: string
  invoice_start: number
  quote_prefix: string
  quote_suffix: string
  quote_start: number
  order_confirmation_prefix: string
  order_confirmation_suffix: string
  order_confirmation_start: number
  agb_url?: string | null
  privacy_url?: string | null
  account_holder?: string | null
  iban?: string | null
  bic?: string | null
  billing_phone?: string | null
  billing_email?: string | null
  template: string
}

export default function SettingsForm({ initial }: { initial: BillingSettings }) {
  const router = useRouter()
  const [form, setForm] = useState<BillingSettings>({ ...initial })
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])

  const ibanOk = useMemo(() => {
    if (!form.iban) return true
    const normalized = form.iban.replace(/\s+/g, '').toUpperCase()
    return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(normalized)
  }, [form.iban])

  const bicOk = useMemo(() => {
    if (!form.bic) return true
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(form.bic.toUpperCase())
  }, [form.bic])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
  }

  const onSave = async () => {
    setSaving(true)
    const res = await fetch('/api/billing-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const { message } = (await res.json()).catch(() => ({ message: 'Fehler' }))
      alert(message)
    } else {
      router.refresh()
    }
    setSaving(false)
  }

  const inputCls =
    'w-full rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-slate-300'

  return (
    <div className="space-y-8">
      {/* Nummernkreise */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Nummernkreise</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label:'Rechnung Prefix', name:'invoice_prefix', type:'text' },
            { label:'Rechnung Suffix', name:'invoice_suffix', type:'text' },
            { label:'Startnummer Rechnung', name:'invoice_start', type:'number' },
            { label:'Angebot Prefix', name:'quote_prefix', type:'text' },
            { label:'Angebot Suffix', name:'quote_suffix', type:'text' },
            { label:'Startnummer Angebot', name:'quote_start', type:'number' },
            { label:'Auftragsbestätigung Prefix', name:'order_confirmation_prefix', type:'text' },
            { label:'Auftragsbestätigung Suffix', name:'order_confirmation_suffix', type:'text' },
            { label:'Startnummer Auftragsbestätigung', name:'order_confirmation_start', type:'number' },
          ].map(f => (
            <div key={f.name}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
              <input
                name={f.name}
                type={f.type as any}
                value={(form as any)[f.name] ?? ''}
                onChange={onChange}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Bank & Kontakt */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Bank & Kontakt</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label:'Kontoinhaber', name:'account_holder', type:'text' },
            { label:'IBAN', name:'iban', type:'text' },
            { label:'BIC', name:'bic', type:'text' },
            { label:'Telefon (Abrechnung)', name:'billing_phone', type:'text' },
            { label:'E-Mail (Abrechnung)', name:'billing_email', type:'text' },
          ].map(f => (
            <div key={f.name}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
              <input
                name={f.name}
                type={f.type as any}
                value={(form as any)[f.name] ?? ''}
                onChange={onChange}
                className={[
                  inputCls,
                  f.name==='iban' && !ibanOk ? 'ring-2 ring-rose-300' : '',
                  f.name==='bic'  && !bicOk  ? 'ring-2 ring-rose-300' : '',
                ].join(' ')}
              />
              {f.name==='iban' && !ibanOk && <p className="mt-1 text-xs text-rose-600">Ungültige IBAN.</p>}
              {f.name==='bic' && !bicOk && <p className="mt-1 text-xs text-rose-600">Ungültige BIC.</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Rechtliches */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Rechtliches</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label:'AGB-Link (URL)', name:'agb_url' },
            { label:'Datenschutz-Link (URL)', name:'privacy_url' },
          ].map(f => (
            <div key={f.name}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
              <input
                name={f.name}
                type="text"
                value={(form as any)[f.name] ?? ''}
                onChange={onChange}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !dirty || !ibanOk || !bicOk}
          className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
