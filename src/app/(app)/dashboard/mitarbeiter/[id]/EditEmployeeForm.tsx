// src/app/dashboard/mitarbeiter/[id]/EditEmployeeForm.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  CurrencyEuroIcon,
  IdentificationIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  role?: string | null
  specialization?: string | null
  start_date?: string | null
  status: 'Aktiv' | 'Deaktiviert' | 'Gelöscht' | string
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  birth_date?: string | null
  employment_type?: string | null
  hourly_rate?: number | null
  working_hours_per_week?: number | null
  vacation_days?: number | null
  driving_license?: string | null
  certifications?: string | null
  bank_iban?: string | null
  bank_bic?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
}

type ChangeEvt =
  | React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >

export default function EditEmployeeForm({
  employee,
  startEditing,
}: {
  employee: Employee
  startEditing?: boolean
}) {
  const router = useRouter()
  const sp = useSearchParams()

  const shouldOpenFromUrl = sp?.get('edit') === '1'
  const initialOpen = startEditing ?? shouldOpenFromUrl

  const [editing, setEditing] = useState<boolean>(initialOpen)
  const [form, setForm] = useState<Employee>({ ...employee })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEditing(startEditing ?? (sp?.get('edit') === '1'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startEditing, sp])

  const inputGlass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ' +
    'outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200'

  const btnGlass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm ' +
    'hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors'

  const onChange = (e: ChangeEvt) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const closeEditing = () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('edit')
      router.replace(
        url.pathname +
          (url.search ? url.search : '') +
          (url.hash || ''),
      )
    } catch {
      router.replace(window.location.pathname)
    }
    setEditing(false)
  }

  const onSave = async () => {
    setLoading(true)
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      alert(await res.text().catch(() => 'Speichern fehlgeschlagen'))
      return
    }
    closeEditing()
    router.refresh()
  }

  const addressPreview = useMemo(() => {
    const parts = [
      [form.street, form.house_number].filter(Boolean).join(' '),
      [form.postal_code, form.city].filter(Boolean).join(' '),
      form.country,
    ].filter(Boolean)
    return parts.join(', ') || '—'
  }, [form])

  if (!editing) return null

  return (
    <div className="mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] sm:p-5">
      {/* Person */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vorname" icon={<UserIcon className="h-5 w-5" />}>
          <input
            name="first_name"
            value={form.first_name ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="Nachname" icon={<UserIcon className="h-5 w-5" />}>
          <input
            name="last_name"
            value={form.last_name ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="E-Mail" icon={<EnvelopeIcon className="h-5 w-5" />}>
          <input
            type="email"
            name="email"
            value={form.email ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="Telefon" icon={<PhoneIcon className="h-5 w-5" />}>
          <input
            name="phone"
            value={form.phone ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
      </div>

      {/* Job */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Rolle" icon={<BriefcaseIcon className="h-5 w-5" />}>
          <input
            name="role"
            value={form.role ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Spezialisierung"
          icon={<WrenchScrewdriverIcon className="h-5 w-5" />}
        >
          <input
            name="specialization"
            value={form.specialization ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Anstellungsart"
          icon={<IdentificationIcon className="h-5 w-5" />}
        >
          <select
            name="employment_type"
            value={form.employment_type ?? ''}
            onChange={onChange}
            className={inputGlass}
          >
            <option value="">—</option>
            <option>Vollzeit</option>
            <option>Teilzeit</option>
            <option>Minijob</option>
            <option>Freelancer</option>
            <option>Azubi</option>
          </select>
        </Field>
        <Field
          label="Eingestellt am"
          icon={<CalendarDaysIcon className="h-5 w-5" />}
        >
          <input
            type="date"
            name="start_date"
            value={form.start_date ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Stundensatz (€)"
          icon={<CurrencyEuroIcon className="h-5 w-5" />}
        >
          <input
            type="number"
            step="0.01"
            name="hourly_rate"
            value={form.hourly_rate ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Std./Woche"
          icon={<DocumentTextIcon className="h-5 w-5" />}
        >
          <input
            type="number"
            step="0.5"
            name="working_hours_per_week"
            value={form.working_hours_per_week ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Urlaubstage"
          icon={<DocumentTextIcon className="h-5 w-5" />}
        >
          <input
            type="number"
            name="vacation_days"
            value={form.vacation_days ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
      </div>

      {/* Adresse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Straße" icon={<MapPinIcon className="h-5 w-5" />}>
          <input
            name="street"
            value={form.street ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Hausnr."
          icon={<BuildingOffice2Icon className="h-5 w-5" />}
        >
          <input
            name="house_number"
            value={form.house_number ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="PLZ" icon={<MapPinIcon className="h-5 w-5" />}>
          <input
            name="postal_code"
            value={form.postal_code ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="Ort" icon={<MapPinIcon className="h-5 w-5" />}>
          <input
            name="city"
            value={form.city ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field label="Land" icon={<MapPinIcon className="h-5 w-5" />}>
          <input
            name="country"
            value={form.country ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
      </div>

      {/* Adresse Vorschau */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Vorschau Adresse
        </label>
        <p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
          {addressPreview}
        </p>
      </div>

      {/* Sonstiges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Geburtsdatum"
          icon={<CalendarDaysIcon className="h-5 w-5" />}
        >
          <input
            type="date"
            name="birth_date"
            value={form.birth_date ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Führerschein"
          icon={<IdentificationIcon className="h-5 w-5" />}
        >
          <input
            name="driving_license"
            value={form.driving_license ?? ''}
            onChange={onChange}
            className={inputGlass}
            placeholder="z. B. B, BE"
          />
        </Field>
        <Field
          label="Zertifikate"
          icon={<DocumentTextIcon className="h-5 w-5" />}
        >
          <input
            name="certifications"
            value={form.certifications ?? ''}
            onChange={onChange}
            className={inputGlass}
            placeholder="Abdichtung, Großformat …"
          />
        </Field>
        <Field
          label="IBAN"
          icon={<IdentificationIcon className="h-5 w-5" />}
        >
          <input
            name="bank_iban"
            value={form.bank_iban ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="BIC"
          icon={<IdentificationIcon className="h-5 w-5" />}
        >
          <input
            name="bank_bic"
            value={form.bank_bic ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Notfallname"
          icon={<UserIcon className="h-5 w-5" />}
        >
          <input
            name="emergency_contact_name"
            value={form.emergency_contact_name ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
        <Field
          label="Notfalltelefon"
          icon={<PhoneIcon className="h-5 w-5" />}
        >
          <input
            name="emergency_contact_phone"
            value={form.emergency_contact_phone ?? ''}
            onChange={onChange}
            className={inputGlass}
          />
        </Field>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Notizen
        </label>
        <textarea
          name="notes"
          value={form.notes ?? ''}
          onChange={onChange}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onSave}
          disabled={loading}
          className={btnGlass + ' w-full sm:w-auto disabled:opacity-50'}
        >
          {loading ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          onClick={closeEditing}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <div className={icon ? 'pl-10' : ''}>{children}</div>
      </div>
    </div>
  )
}
