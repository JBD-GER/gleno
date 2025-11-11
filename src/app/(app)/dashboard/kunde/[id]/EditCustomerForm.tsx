'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  HomeIcon,
  HashtagIcon,
  MapIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

/* ====================== Types ====================== */
interface Customer {
  id: string
  company?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  status: 'Lead' | 'Kunde' | 'Inaktiv' | string
}

/* ================== IconInput (Top-Level) ================== */
type IconInputProps = {
  name: string
  type?: string
  value?: string | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  placeholder?: string
  className?: string
  inputClassName?: string
  autoComplete?: string
}

const inputGlassBase =
  'w-full rounded-lg border border-slate-200 bg-white/80 px-10 py-2 text-sm text-slate-900 ' +
  'outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

const IconInput: React.FC<IconInputProps> = React.memo(
  ({ name, type = 'text', value, onChange, label, Icon, placeholder, className, inputClassName, autoComplete = 'off' }) => (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          className={inputClassName ?? inputGlassBase}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  )
)
IconInput.displayName = 'IconInput'

/* ================== Hauptkomponente ================== */
export default function EditCustomerForm({
  customer,
  startEditing,
}: {
  customer: Customer
  startEditing?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Abgeleiteter, stabiler Wert des URL-Params
  const editParam = searchParams?.get('edit') ?? null
  const initialOpen = Boolean(startEditing ?? (editParam === '1'))

  const [editing, setEditing] = useState<boolean>(initialOpen)
  const [form, setForm] = useState<Customer>({ ...customer })
  const [loading, setLoading] = useState(false)

  // Nur reagieren, wenn sich der tatsächliche Wert von ?edit= ändert (nicht das Objekt)
  useEffect(() => {
    setEditing(Boolean(startEditing ?? (editParam === '1')))
  }, [startEditing, editParam])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value } as Customer))

  // Styles
  const btnWhite =
    'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 ' +
    'shadow-sm hover:bg-white/90 disabled:opacity-50 transition-colors'

  const closeEditing = () => {
    // ?edit=1 aus der URL entfernen
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('edit')
      router.replace(url.pathname + (url.search ? url.search : '') + (url.hash || ''))
    } catch {
      router.replace(window.location.pathname)
    }
    setEditing(false)
  }

  const onSave = async () => {
    setLoading(true)
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message)
      setLoading(false)
      return
    }
    setLoading(false)
    closeEditing()
  }

  const addressPreview = useMemo(() => {
    const parts = [
      [form.street, form.house_number].filter(Boolean).join(' '),
      [form.postal_code, form.city].filter(Boolean).join(' '),
      form.country,
    ].filter(Boolean)
    return parts.join(', ') || form.address || '–'
  }, [form])

  if (!editing) return null

  return (
    <div
      id="edit"
      className="mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.08)]"
    >
      {/* Grid-Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Unternehmen (volle Breite) */}
        <div className="md:col-span-2">
          <IconInput
            name="company"
            label="Unternehmen"
            value={form.company ?? ''}
            onChange={onChange as any}
            Icon={BuildingOfficeIcon}
            placeholder="Firma"
          />
        </div>

        {/* Name */}
        <IconInput
          name="first_name"
          label="Vorname"
          value={form.first_name}
          onChange={onChange as any}
          Icon={UserIcon}
          placeholder="Max"
          autoComplete="given-name"
        />
        <IconInput
          name="last_name"
          label="Nachname"
          value={form.last_name}
          onChange={onChange as any}
          Icon={UserIcon}
          placeholder="Mustermann"
          autoComplete="family-name"
        />

        {/* Kontakt */}
        <IconInput
          name="email"
          type="email"
          label="E-Mail"
          value={form.email}
          onChange={onChange as any}
          Icon={EnvelopeIcon}
          placeholder="max@beispiel.de"
          autoComplete="email"
        />
        <IconInput
          name="phone"
          label="Telefon"
          value={form.phone ?? ''}
          onChange={onChange as any}
          Icon={PhoneIcon}
          placeholder="+49 …"
          autoComplete="tel"
        />

        {/* Adresse 1 */}
        <IconInput
          name="street"
          label="Straße"
          value={form.street ?? ''}
          onChange={onChange as any}
          Icon={MapPinIcon}
          placeholder="Dammstraße"
          autoComplete="address-line1"
        />
        <IconInput
          name="house_number"
          label="Hausnr."
          value={form.house_number ?? ''}
          onChange={onChange as any}
          Icon={HomeIcon}
          placeholder="6G"
          autoComplete="address-line2"
        />

        {/* Adresse 2 */}
        <IconInput
          name="postal_code"
          label="PLZ"
          value={form.postal_code ?? ''}
          onChange={onChange as any}
          Icon={HashtagIcon}
          placeholder="30890"
          autoComplete="postal-code"
        />
        <IconInput
          name="city"
          label="Ort"
          value={form.city ?? ''}
          onChange={onChange as any}
          Icon={MapIcon}
          placeholder="Barsinghausen"
          autoComplete="address-level2"
        />

        {/* Land (volle Breite) */}
        <div className="md:col-span-2">
          <IconInput
            name="country"
            label="Land"
            value={form.country ?? ''}
            onChange={onChange as any}
            Icon={GlobeAltIcon}
            placeholder="Deutschland"
            autoComplete="country-name"
          />
        </div>
      </div>

      {/* Address-Preview */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Vorschau vollständige Adresse
        </label>
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
          {addressPreview}
        </p>
      </div>

      {/* Aktionen */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onSave} disabled={loading} className={btnWhite}>
          {loading ? 'Speichert…' : 'Speichern'}
        </button>
        <button onClick={closeEditing} className={btnWhite}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
