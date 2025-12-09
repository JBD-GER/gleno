'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  UserPlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  CurrencyEuroIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { DateInputWithCalendar } from '@/components/ui/DateInputs'

type ChangeEvt =
  | React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >

type FormState = {
  // Person
  first_name: string
  last_name: string
  email: string
  phone: string
  birth_date: string
  // Job
  role: string
  specialization: string
  employment_type: string
  start_date: string
  hourly_rate: string
  monthly_salary: string
  working_hours_per_week: string
  vacation_days: string
  overtime_balance: string
  // Adresse
  street: string
  house_number: string
  postal_code: string
  city: string
  country: string
  // Qualifikationen
  driving_license: string
  vehicle_assigned: string
  certifications: string
  tools: string
  health_certificate: '' | 'Ja' | 'Nein'
  first_aid_valid_until: string
  // Notfall & Notizen
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
  // Bankdaten
  bank_iban: string
  bank_bic: string
}

export default function AddEmployeeModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    role: '',
    specialization: '',
    employment_type: 'Vollzeit',
    start_date: '',
    hourly_rate: '',
    monthly_salary: '',
    working_hours_per_week: '',
    vacation_days: '',
    overtime_balance: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: '',
    driving_license: '',
    vehicle_assigned: '',
    certifications: '',
    tools: '',
    health_certificate: '',
    first_aid_valid_until: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    bank_iban: '',
    bank_bic: '',
  })

  const toggle = () => {
    setOpen((v) => !v)
    if (!open) setStep(0)
  }

  const onChange = (e: ChangeEvt) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const steps = useMemo(
    () => [
      {
        key: 'person',
        title: 'Person',
        required: ['first_name', 'last_name', 'email'],
      },
      { key: 'job', title: 'Job', required: ['employment_type', 'start_date'] },
      { key: 'address', title: 'Adresse', required: [] },
      { key: 'skills', title: 'Qualifikationen', required: [] },
      { key: 'emergency', title: 'Notfall & Notizen', required: [] },
    ],
    [],
  )

  const percent = ((step + 1) / steps.length) * 100

  const validateStep = () => {
    const req = steps[step].required as (keyof FormState)[]
    const missing = req.filter((k) => !String(form[k] ?? '').trim())
    if (missing.length) {
      alert(
        `Bitte folgende Pflichtfelder ausfüllen: ${missing.join(', ')}`,
      )
      return false
    }
    return true
  }

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, steps.length - 1))
  }
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const asJsonArray = (v: string) =>
    v.trim()
      ? v.trim().startsWith('[')
        ? v
        : JSON.stringify(
            v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
      : undefined

  const save = async () => {
    if (!validateStep()) return
    setLoading(true)
    try {
      const body: Record<string, any> = { ...form }

      if (form.health_certificate !== '')
        body.health_certificate = form.health_certificate === 'Ja'

      for (const k of [
        'hourly_rate',
        'monthly_salary',
        'overtime_balance',
        'working_hours_per_week',
      ] as const) {
        if (body[k] !== '')
          body[k] = Number(String(body[k]).replace(',', '.'))
        else delete body[k]
      }

      if (body.vacation_days !== '')
        body.vacation_days = Number(body.vacation_days)
      else delete body.vacation_days

      const cert = asJsonArray(form.certifications)
      const tools = asJsonArray(form.tools)
      if (cert) body.certifications = JSON.parse(cert)
      if (tools) body.tools = JSON.parse(tools)

      if (!body.bank_iban) delete body.bank_iban
      if (!body.bank_bic) delete body.bank_bic

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok)
        throw new Error(
          (await res.text().catch(() => 'Unbekannter Fehler')) ??
            'Unbekannter Fehler',
        )
      toggle()
      router.refresh()
    } catch (e: any) {
      alert(`Fehler: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const btnGlassPrimary =
    'inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors'

  return (
    <>
      <button onClick={toggle} className={btnGlassPrimary} type="button">
        <UserPlusIcon className="h-4.5 w-4.5" />
        Mitarbeiter hinzufügen
      </button>

      {/* MODAL via Portal */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[120]" role="dialog" aria-modal>
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={toggle}
            />

            {/* Scroll-Wrapper */}
            <div className="absolute inset-0 overflow-y-auto">
              <div className="mx-auto my-4 w-full max-w-5xl px-3 sm:my-8 sm:px-4">
                {/* Dialog */}
                <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/95 text-sm shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl">
                  {/* Header */}
                  <div className="px-4 pt-4 sm:px-6 sm:pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                          Neuen Mitarbeiter anlegen
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 sm:text-[13px]">
                          Nur Name und E-Mail sind Pflicht – alles andere
                          können Sie später ergänzen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggle}
                        aria-label="Schließen"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-600 shadow-sm hover:bg-slate-50 sm:h-8 sm:w-8 sm:rounded-xl"
                      >
                        ×
                      </button>
                    </div>

                    {/* Step-Pills */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {steps.map((s, i) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setStep(i)}
                          className={[
                            'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                            i === step
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-white/60 bg-white/80 text-slate-700 hover:bg-white',
                          ].join(' ')}
                        >
                          {i + 1}. {s.title}
                        </button>
                      ))}
                    </div>

                    {/* Progressbar */}
                    <div className="mt-4 h-2 w-full rounded-full bg-white/60">
                      <div
                        className="h-2 rounded-full bg-slate-900 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
                    {step === 0 && (
                      <Section title="Person">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Input
                            icon={<UserIcon className="h-5 w-5" />}
                            label="Vorname *"
                            name="first_name"
                            value={form.first_name}
                            onChange={onChange}
                            required
                          />
                          <Input
                            icon={<UserIcon className="h-5 w-5" />}
                            label="Nachname *"
                            name="last_name"
                            value={form.last_name}
                            onChange={onChange}
                            required
                          />
                          <Input
                            icon={<EnvelopeIcon className="h-5 w-5" />}
                            label="E-Mail *"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={onChange}
                            required
                          />
                          <Input
                            icon={<PhoneIcon className="h-5 w-5" />}
                            label="Telefon"
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                          />

                          {/* Geburtsdatum mit DateInputWithCalendar */}
                          <FieldShell
                            label="Geburtsdatum"
                            icon={<CalendarDaysIcon className="h-5 w-5" />}
                          >
                            <DateInputWithCalendar
                              value={form.birth_date}
                              onChange={(val) =>
                                setForm((f) => ({
                                  ...f,
                                  birth_date: val,
                                }))
                              }
                              wrapperClassName="w-full"
                              inputClassName={
                                'w-full h-7 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
                                'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2 pl-10 pr-3'
                              }
                            />
                          </FieldShell>
                        </div>
                      </Section>
                    )}

                    {step === 1 && (
                      <Section title="Job">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Input
                            icon={<BriefcaseIcon className="h-5 w-5" />}
                            label="Rolle"
                            name="role"
                            value={form.role}
                            onChange={onChange}
                            placeholder="z. B. Vorarbeiter"
                          />
                          <Input
                            icon={
                              <WrenchScrewdriverIcon className="h-5 w-5" />
                            }
                            label="Spezialisierung"
                            name="specialization"
                            value={form.specialization}
                            onChange={onChange}
                            placeholder="z. B. Großformat, Mosaik"
                          />
                          <Select
                            icon={
                              <IdentificationIcon className="h-5 w-5" />
                            }
                            label="Anstellungsart *"
                            name="employment_type"
                            value={form.employment_type}
                            onChange={onChange}
                            options={[
                              'Vollzeit',
                              'Teilzeit',
                              'Minijob',
                              'Werkstudent',
                              'Freelancer',
                            ]}
                          />

                          {/* Eingestellt am mit DateInputWithCalendar */}
                          <FieldShell
                            label="Eingestellt am *"
                            icon={<CalendarDaysIcon className="h-5 w-5" />}
                          >
                            <DateInputWithCalendar
                              value={form.start_date}
                              onChange={(val) =>
                                setForm((f) => ({
                                  ...f,
                                  start_date: val,
                                }))
                              }
                              wrapperClassName="w-full"
                              inputClassName={
                                'w-full h-7 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
                                'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2 pl-11 pr-3'
                              }
                            />
                          </FieldShell>

                          <Input
                            icon={<CurrencyEuroIcon className="h-5 w-5" />}
                            label="Stundenlohn (€)"
                            name="hourly_rate"
                            value={form.hourly_rate}
                            onChange={onChange}
                            placeholder="z. B. 22,50"
                          />
                          <Input
                            icon={<CurrencyEuroIcon className="h-5 w-5" />}
                            label="Monatsgehalt (€)"
                            name="monthly_salary"
                            value={form.monthly_salary}
                            onChange={onChange}
                            placeholder="z. B. 3200"
                          />
                          <Input
                            icon={<DocumentTextIcon className="h-5 w-5" />}
                            label="Arbeitsstunden/Woche"
                            name="working_hours_per_week"
                            value={form.working_hours_per_week}
                            onChange={onChange}
                            placeholder="z. B. 40"
                          />
                          <Input
                            icon={
                              <ClipboardDocumentCheckIcon className="h-5 w-5" />
                            }
                            label="Urlaubstage/Jahr"
                            name="vacation_days"
                            value={form.vacation_days}
                            onChange={onChange}
                            placeholder="z. B. 28"
                          />
                          <Input
                            icon={
                              <ClipboardDocumentCheckIcon className="h-5 w-5" />
                            }
                            label="Überstundenkonto (Std.)"
                            name="overtime_balance"
                            value={form.overtime_balance}
                            onChange={onChange}
                            placeholder="z. B. 3.5"
                          />
                          <Input
                            icon={<IdentificationIcon className="h-5 w-5" />}
                            label="IBAN"
                            name="bank_iban"
                            value={form.bank_iban}
                            onChange={onChange}
                            placeholder="z. B. DE12 3456 7890 1234 5678 00"
                          />
                          <Input
                            icon={<IdentificationIcon className="h-5 w-5" />}
                            label="BIC"
                            name="bank_bic"
                            value={form.bank_bic}
                            onChange={onChange}
                            placeholder="z. B. GENODEF1XXX"
                          />
                        </div>
                      </Section>
                    )}

                    {step === 2 && (
                      <Section title="Adresse">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Input
                            icon={<MapPinIcon className="h-5 w-5" />}
                            label="Straße"
                            name="street"
                            value={form.street}
                            onChange={onChange}
                          />
                          <Input
                            icon={<BuildingOffice2Icon className="h-5 w-5" />}
                            label="Hausnr."
                            name="house_number"
                            value={form.house_number}
                            onChange={onChange}
                          />
                          <Input
                            icon={<MapPinIcon className="h-5 w-5" />}
                            label="PLZ"
                            name="postal_code"
                            value={form.postal_code}
                            onChange={onChange}
                          />
                          <Input
                            icon={<MapPinIcon className="h-5 w-5" />}
                            label="Stadt"
                            name="city"
                            value={form.city}
                            onChange={onChange}
                          />
                          <Input
                            icon={<MapPinIcon className="h-5 w-5" />}
                            label="Land"
                            name="country"
                            value={form.country}
                            onChange={onChange}
                          />
                        </div>
                      </Section>
                    )}

                    {step === 3 && (
                      <Section title="Qualifikationen & Ausrüstung">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Input
                            icon={
                              <IdentificationIcon className="h-5 w-5" />
                            }
                            label="Führerschein (z. B. B, BE, C1)"
                            name="driving_license"
                            value={form.driving_license}
                            onChange={onChange}
                          />
                          <Input
                            icon={
                              <WrenchScrewdriverIcon className="h-5 w-5" />
                            }
                            label="Zugewiesenes Fahrzeug"
                            name="vehicle_assigned"
                            value={form.vehicle_assigned}
                            onChange={onChange}
                          />
                          <Textarea
                            icon={
                              <ClipboardDocumentCheckIcon className="h-5 w-5" />
                            }
                            label="Zertifikate (durch Komma trennen)"
                            name="certifications"
                            value={form.certifications}
                            onChange={onChange}
                            placeholder="z. B. Abdichtungsschein, Erste-Hilfe, Gerüstschein"
                          />
                          <Textarea
                            icon={
                              <WrenchScrewdriverIcon className="h-5 w-5" />
                            }
                            label="Werkzeuge / Ausrüstung (durch Komma trennen)"
                            name="tools"
                            value={form.tools}
                            onChange={onChange}
                            placeholder="z. B. Nivelliersystem, Diamantsäge, Rührwerk"
                          />
                          <Select
                            icon={
                              <CalendarDaysIcon className="h-5 w-5" />
                            }
                            label="Gesundheitszeugnis vorhanden?"
                            name="health_certificate"
                            value={form.health_certificate}
                            onChange={onChange}
                            options={['', 'Ja', 'Nein']}
                          />

                          {/* Erste-Hilfe gültig bis mit DateInputWithCalendar */}
                          <FieldShell
                            label="Erste-Hilfe gültig bis"
                            icon={<CalendarDaysIcon className="h-5 w-5" />}
                          >
                            <DateInputWithCalendar
                              value={form.first_aid_valid_until}
                              onChange={(val) =>
                                setForm((f) => ({
                                  ...f,
                                  first_aid_valid_until: val,
                                }))
                              }
                              wrapperClassName="w-full"
                              inputClassName={
                                'w-full h-11 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
                                'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2 pl-10 pr-3'
                              }
                            />
                          </FieldShell>
                        </div>
                      </Section>
                    )}

                    {step === 4 && (
                      <Section title="Notfall & Notizen">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Input
                            icon={<UserIcon className="h-5 w-5" />}
                            label="Notfallname"
                            name="emergency_contact_name"
                            value={form.emergency_contact_name}
                            onChange={onChange}
                          />
                          <Input
                            icon={<PhoneIcon className="h-5 w-5" />}
                            label="Notfalltelefon"
                            name="emergency_contact_phone"
                            value={form.emergency_contact_phone}
                            onChange={onChange}
                          />
                        </div>
                        <div className="mt-4">
                          <Textarea
                            icon={
                              <ClipboardDocumentCheckIcon className="h-5 w-5" />
                            }
                            label="Interne Notizen"
                            name="notes"
                            value={form.notes}
                            onChange={onChange}
                          />
                        </div>
                      </Section>
                    )}

                    {/* Footer */}
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={step === 0 ? toggle : prev}
                        className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-xs text-slate-800 shadow-sm hover:bg-white sm:text-sm"
                        disabled={loading}
                      >
                        {step === 0 ? 'Abbrechen' : 'Zurück'}
                      </button>

                      <div className="flex gap-2 sm:gap-3">
                        {step < steps.length - 1 ? (
                          <button
                            type="button"
                            onClick={next}
                            className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-xs text-slate-900 shadow-sm transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:text-sm"
                          >
                            Weiter
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={save}
                            disabled={loading}
                            className="rounded-lg border border-white/60 bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50 sm:text-sm"
                          >
                            {loading ? 'Speichert…' : 'Speichern'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* /Body */}
                </div>
              </div>
            </div>
            {/* /Scroll-Wrapper */}
          </div>,
          document.body,
        )}
    </>
  )
}

/* ----------------- UI-Helper ----------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
        {title}
      </div>
      {children}
    </div>
  )
}

/** Icon-Wrapper + Label */
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
    <div className="flex flex-col">
      <label className="mb-1 text-xs font-medium text-slate-700 sm:text-sm">
        {label}
      </label>
      <div className="relative">
        {children}
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-center pl-3 text-slate-400">
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}

function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  icon,
}: {
  label: string
  name: keyof FormState | string
  value: string
  onChange: (e: ChangeEvt) => void
  type?: string
  required?: boolean
  placeholder?: string
  icon?: React.ReactNode
}) {
  const base =
    'w-full h-11 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
    'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2'
  return (
    <FieldShell label={label} icon={icon}>
      <input
        id={String(name)}
        name={String(name)}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[base, icon ? 'pl-10 pr-3' : 'px-3'].join(' ')}
      />
    </FieldShell>
  )
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
  icon,
}: {
  label: string
  name: keyof FormState | string
  value: string
  onChange: (e: ChangeEvt) => void
  options: string[]
  icon?: React.ReactNode
}) {
  const base =
    'w-full h-11 rounded-lg border text-sm leading-5 text-slate-900 outline-none ' +
    'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2 appearance-none'
  return (
    <FieldShell label={label} icon={icon}>
      <select
        id={String(name)}
        name={String(name)}
        value={value}
        onChange={onChange}
        className={[base, icon ? 'pl-10 pr-10' : 'px-3 pr-10'].join(' ')}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || '— bitte wählen —'}
          </option>
        ))}
      </select>
      {/* eigener Chevron rechts */}
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400">
        <ChevronDownIcon className="h-5 w-5" />
      </span>
    </FieldShell>
  )
}

function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string
  name: keyof FormState | string
  value: string
  onChange: (e: ChangeEvt) => void
  placeholder?: string
  icon?: React.ReactNode
}) {
  const base =
    'w-full min-h-[112px] rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 outline-none ' +
    'border-white/60 bg-white/80 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2 py-2'
  return (
    <FieldShell label={label} icon={icon}>
      <textarea
        id={String(name)}
        name={String(name)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className={[base, icon ? 'pl-10 pr-3' : 'px-3'].join(' ')}
      />
    </FieldShell>
  )
}
