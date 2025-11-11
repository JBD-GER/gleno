'use client'

import type React from 'react'
import { useState, type ComponentType, type SVGProps } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  UserIcon, EnvelopeIcon, PhoneIcon, HomeIcon, HashtagIcon,
  BuildingOfficeIcon, GlobeAltIcon, UserPlusIcon,
} from '@heroicons/react/24/outline'

/* ========================= UI-Helper (außerhalb!) ========================= */

function FieldShell({
  label, children, icon,
}: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      <div className="relative">
        {children}
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-center pl-3 text-slate-400">
            {icon}
          </span>
        )}
      </div>
    </label>
  )
}

const inputBase =
  'w-full h-11 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
  'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2'

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { withIcon?: boolean }
) {
  const { withIcon, className, ...rest } = props
  return (
    <input
      {...rest}
      className={[inputBase, withIcon ? 'pl-10 pr-3' : 'px-3', className || ''].join(' ')}
    />
  )
}

function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { withIcon?: boolean }
) {
  const { withIcon, className, children, ...rest } = props
  return (
    <select
      {...rest}
      className={[
        inputBase,
        'appearance-none bg-[right_0.65rem_center] pr-8',
        withIcon ? 'pl-10' : 'px-3',
        className || '',
      ].join(' ')}
    >
      {children}
    </select>
  )
}

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>
function Field({
  Icon, label, name, type = 'text', value, onChange, placeholder,
}: {
  Icon: HeroIcon; label: string; name: string; type?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string
}) {
  return (
    <FieldShell label={label} icon={<Icon className="h-5 w-5" />}>
      <TextInput
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        withIcon
        autoComplete={name}
      />
    </FieldShell>
  )
}

/* ========================= Hauptkomponente ========================= */

const STATUS_OPTIONS = ['Lead', 'Kunde', 'Inaktiv'] as const

export default function AddCustomerModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    company: '',
    status: 'Lead', // Default
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: '',
    address: '',
  })

  const toggle = () => setOpen(v => !v)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const onSave = async () => {
    if (!form.email && !form.phone) {
      alert('Bitte mindestens E-Mail oder Telefon angeben.')
      return
    }
    try {
      setLoading(true)
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: res.statusText }))
        alert(message)
        return
      }
      toggle()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const btnGhost =
    'rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm text-slate-900 shadow-sm ' +
    'hover:bg-white transition-colors'

  return (
    <>
      <button type="button" onClick={toggle} className={btnGhost}>
        <span className="inline-flex items-center gap-2">
          <UserPlusIcon className="h-5 w-5" /> Kunde hinzufügen
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={toggle} />

          {/* Modal */}
          <div className="absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.15)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">Neuen Kunden anlegen</h2>
              <button
                type="button"
                onClick={toggle}
                className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-white"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Unternehmen – GANZ OBEN, volle Breite */}
              <div className="sm:col-span-2">
                <FieldShell label="Unternehmen" icon={<BuildingOfficeIcon className="h-5 w-5" />}>
                  <TextInput
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    withIcon
                    placeholder="Firma"
                    autoComplete="organization"
                  />
                </FieldShell>
              </div>

              {/* Status-Dropdown */}
              <div className="sm:col-span-2">
                <FieldShell label="Status">
                  <SelectInput name="status" value={form.status} onChange={onChange}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </SelectInput>
                </FieldShell>
              </div>

              {/* Name */}
              <Field Icon={UserIcon}           label="Vorname"   name="first_name"  value={form.first_name}  onChange={onChange as any} />
              <Field Icon={UserIcon}           label="Nachname"  name="last_name"   value={form.last_name}   onChange={onChange as any} />
              {/* Kontakt */}
              <Field Icon={EnvelopeIcon}       label="E-Mail"    name="email"       type="email" value={form.email} onChange={onChange as any} />
              <Field Icon={PhoneIcon}          label="Telefon"   name="phone"       value={form.phone}       onChange={onChange as any} />
              {/* Adresse 1 */}
              <Field Icon={HomeIcon}           label="Straße"    name="street"      value={form.street}      onChange={onChange as any} />
              <Field Icon={HashtagIcon}        label="Hausnr."   name="house_number" value={form.house_number} onChange={onChange as any} />
              {/* Adresse 2 */}
              <Field Icon={HashtagIcon}        label="PLZ"       name="postal_code" value={form.postal_code} onChange={onChange as any} />
              <Field Icon={BuildingOfficeIcon} label="Ort"       name="city"        value={form.city}        onChange={onChange as any} />
              <Field Icon={GlobeAltIcon}       label="Land"      name="country"     value={form.country}     onChange={onChange as any} />
              {/* Optional: Freitext-Adresse
              <Field Icon={HomeIcon} label="Adresse (frei)" name="address" value={form.address} onChange={onChange as any} />
              */}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={toggle} className={btnGhost}>
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
              >
                {loading ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
