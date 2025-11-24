'use client'

import type React from 'react'
import { useState, type ComponentType, type SVGProps } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  HomeIcon,
  HashtagIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'

/* ========================= UI-Helper ========================= */

function FieldShell({
  label,
  children,
  icon,
}: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </span>
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
  'w-full h-10 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
  'border-slate-200 bg-white/90 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2'

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { withIcon?: boolean },
) {
  const { withIcon, className, ...rest } = props
  return (
    <input
      {...rest}
      className={[
        inputBase,
        withIcon ? 'pl-9 pr-3' : 'px-3',
        className || '',
      ].join(' ')}
    />
  )
}

function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { withIcon?: boolean },
) {
  const { withIcon, className, children, ...rest } = props
  return (
    <select
      {...rest}
      className={[
        inputBase,
        'appearance-none bg-[right_0.65rem_center] pr-7',
        withIcon ? 'pl-9' : 'px-3',
        className || '',
      ].join(' ')}
    >
      {children}
    </select>
  )
}

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>

function Field({
  Icon,
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  Icon: HeroIcon
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <FieldShell label={label} icon={<Icon className="h-4.5 w-4.5" />}>
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

const STATUS_OPTIONS = ['Lead', 'Kunde', 'Deaktiviert'] as const

export default function AddCustomerModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    company: '',
    status: 'Lead',
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

  const toggle = () => setOpen((v) => !v)

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

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
        const { message } = await res
          .json()
          .catch(() => ({ message: res.statusText }))
        alert(message)
        return
      }
      toggle()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const ghostBtn =
    'rounded-xl border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-white transition-colors'

  return (
    <>
      {/* Trigger-Button (klein & dezent) */}
      <button type="button" onClick={toggle} className={ghostBtn}>
        <span className="inline-flex items-center gap-1.5">
          <UserPlusIcon className="h-4.5 w-4.5" />
          Kunde hinzufügen
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center px-3 sm:px-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Overlay */}
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              onClick={toggle}
              aria-label="Modal schließen"
            />

            {/* Modal-Card – zentriert, mit Rand auf Mobile */}
            <div className="relative z-[1001] w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_20px_60px_rgba(2,6,23,0.18)] backdrop-blur-xl">
              {/* Scrollbarer Inhalt, aber Header/Footer sticky feeling */}
              <div className="max-h-[min(90vh,640px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-medium text-slate-900">
                      Neuen Kunden anlegen
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Nur E-Mail oder Telefon sind Pflicht – alles andere können
                      Sie später ergänzen.
                    </p>
                  </div>
<button
  type="button"
  onClick={toggle}
  aria-label="Schließen"
  className="
    flex items-center justify-center
    h-7 w-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50
    text-sm
    sm:h-8 sm:w-8 sm:rounded-xl
  "
>
  ×
</button>

                </div>

                {/* Formular */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Unternehmen – volle Breite */}
                  <div className="sm:col-span-2">
                    <FieldShell
                      label="Unternehmen"
                      icon={<BuildingOfficeIcon className="h-4.5 w-4.5" />}
                    >
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

                  {/* Status-Dropdown – volle Breite */}
                  <div className="sm:col-span-2">
                    <FieldShell label="Status">
                      <SelectInput
                        name="status"
                        value={form.status}
                        onChange={onChange}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </SelectInput>
                    </FieldShell>
                  </div>

                  {/* Name */}
                  <Field
                    Icon={UserIcon}
                    label="Vorname"
                    name="first_name"
                    value={form.first_name}
                    onChange={onChange as any}
                  />
                  <Field
                    Icon={UserIcon}
                    label="Nachname"
                    name="last_name"
                    value={form.last_name}
                    onChange={onChange as any}
                  />

                  {/* Kontakt */}
                  <Field
                    Icon={EnvelopeIcon}
                    label="E-Mail"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange as any}
                  />
                  <Field
                    Icon={PhoneIcon}
                    label="Telefon"
                    name="phone"
                    value={form.phone}
                    onChange={onChange as any}
                  />

                  {/* Adresse 1 */}
                  <Field
                    Icon={HomeIcon}
                    label="Straße"
                    name="street"
                    value={form.street}
                    onChange={onChange as any}
                  />
                  <Field
                    Icon={HashtagIcon}
                    label="Hausnr."
                    name="house_number"
                    value={form.house_number}
                    onChange={onChange as any}
                  />

                  {/* Adresse 2 */}
                  <Field
                    Icon={HashtagIcon}
                    label="PLZ"
                    name="postal_code"
                    value={form.postal_code}
                    onChange={onChange as any}
                  />
                  <Field
                    Icon={BuildingOfficeIcon}
                    label="Ort"
                    name="city"
                    value={form.city}
                    onChange={onChange as any}
                  />
                  <Field
                    Icon={GlobeAltIcon}
                    label="Land"
                    name="country"
                    value={form.country}
                    onChange={onChange as any}
                  />
                </div>

                {/* Footer / Buttons */}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={toggle}
                    className={ghostBtn}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Speichert…' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
