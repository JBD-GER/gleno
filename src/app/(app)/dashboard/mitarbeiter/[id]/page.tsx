// src/app/dashboard/mitarbeiter/[id]/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import EditEmployeeForm from './EditEmployeeForm'
import EmployeeDocuments from './EmployeeDocuments'
import AbsenceModal from './AbsenceModal'
import AbsenceHistory from './AbsenceHistory'
import InviteEmployeeModal from './InviteEmployeeModal'
import OpenTimeModalButton from './OpenTimeModalButton'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  TagIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  IdentificationIcon,
  WrenchScrewdriverIcon,
  CurrencyEuroIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

type EmpStatus = 'Aktiv' | 'Deaktiviert' | 'Gelöscht'

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const isEditing = sp?.edit === '1'

  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return redirect('/login')

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !employee) return redirect('/dashboard/mitarbeiter')

  const StatusBadge = ({ value }: { value: EmpStatus | string }) => {
    const tone =
      value === 'Aktiv'
        ? 'bg-emerald-100 text-emerald-800 ring-emerald-200/60'
        : value === 'Deaktiviert'
        ? 'bg-amber-100 text-amber-800 ring-amber-200/60'
        : 'bg-rose-100 text-rose-800 ring-rose-200/60'
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}
      >
        <TagIcon className="h-3.5 w-3.5" />
        {String(value)}
      </span>
    )
  }

  const GlassTile = ({
    title,
    value,
    Icon,
    mono,
  }: {
    title: string
    value?: string | number | null
    Icon: any
    mono?: boolean
  }) => (
    <div
      className="relative overflow-hidden rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl ring-1 ring-transparent"
      style={{
        backgroundImage:
          'radial-gradient(400px 180px at 120% -30%, rgba(15,23,42,0.06), transparent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p
            className={`truncate text-sm font-medium text-slate-900 ${
              mono ? 'font-mono tabular-nums' : ''
            }`}
          >
            {value !== undefined && value !== null && String(value).trim() !== ''
              ? String(value)
              : '—'}
          </p>
        </div>
      </div>
    </div>
  )

  const composedAddress =
    [
      [employee.street, employee.house_number].filter(Boolean).join(' '),
      [employee.postal_code, employee.city].filter(Boolean).join(' '),
      employee.country,
    ]
      .filter(Boolean)
      .join(', ') || '—'

  return (
    <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8 space-y-6">
      {/* Zur Übersicht + Zeit-Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/mitarbeiter"
          className="inline-flex w-full items-center justify-start gap-2 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white backdrop-blur sm:w-auto"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zur Übersicht
        </Link>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <OpenTimeModalButton
            employeeId={employee.id}
            employeeName={`${employee.first_name} ${employee.last_name}`}
          />
        </div>
      </div>

      {/* Header Card */}
      <div
        className="relative mb-1 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5"
        style={{
          backgroundImage:
            'radial-gradient(1000px 400px at 110% -30%, rgba(15,23,42,0.07), transparent)',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Links: Titel */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
              <ClockIcon className="h-4 w-4 text-slate-900" />
              Mitarbeiter – Detail
            </div>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {employee.role || '—'}
              {employee.specialization ? ` · ${employee.specialization}` : ''}
            </p>
          </div>

          {/* Rechts: Actions */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="sm:mr-1 flex justify-start sm:inline-flex">
              <StatusBadge value={employee.status as EmpStatus} />
            </div>

            <span
              className="inline-flex w-full justify-start rounded-full px-3 py-2 text-xs font-medium ring-1
                   bg-emerald-50 text-emerald-700 ring-emerald-200
                   data-[state=off]:bg-amber-50 data-[state=off]:text-amber-800 data-[state=off]:ring-amber-200 sm:w-auto"
              data-state={employee.auth_user_id ? 'on' : 'off'}
            >
              {employee.auth_user_id ? 'Verknüpft' : 'Nicht verknüpft'}
            </span>

            <div className="flex w-full justify-start sm:block sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
              <InviteEmployeeModal
                employeeId={employee.id}
                disabled={!employee.email}
              />
            </div>

            <Link
              href={`/dashboard/mitarbeiter/${employee.id}?edit=1`}
              className="inline-flex w-full items-center justify-start rounded-lg border border-white/60
                   bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur
                   transition-colors hover:bg-slate-900 hover:text-white hover:border-slate-900 sm:w-auto"
            >
              Bearbeiten
            </Link>

            <div className="flex w-full justify-start sm:block sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
              <AbsenceModal employeeId={employee.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Mitarbeiterdaten */}
      <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Mitarbeiterdaten
        </h2>

        {!isEditing && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <GlassTile title="E-Mail" value={employee.email} Icon={EnvelopeIcon} />
            <GlassTile title="Telefon" value={employee.phone} Icon={PhoneIcon} />
            <GlassTile title="Rolle" value={employee.role} Icon={BriefcaseIcon} />
            <GlassTile
              title="Spezialisierung"
              value={employee.specialization}
              Icon={WrenchScrewdriverIcon}
            />
            <GlassTile
              title="Anstellungsart"
              value={employee.employment_type}
              Icon={IdentificationIcon}
            />
            <GlassTile
              title="Eingestellt am"
              value={employee.start_date}
              Icon={CalendarDaysIcon}
            />
            <GlassTile
              title="Geburtsdatum"
              value={employee.birth_date}
              Icon={CalendarDaysIcon}
            />
            <GlassTile
              title="Stundensatz (€)"
              value={employee.hourly_rate}
              Icon={CurrencyEuroIcon}
              mono
            />
            <GlassTile
              title="Std./Woche"
              value={employee.working_hours_per_week}
              Icon={DocumentTextIcon}
              mono
            />
            <GlassTile
              title="Urlaubstage"
              value={employee.vacation_days}
              Icon={DocumentTextIcon}
              mono
            />
            <GlassTile
              title="Führerschein"
              value={employee.driving_license}
              Icon={IdentificationIcon}
            />
            <GlassTile
              title="Zertifikate"
              value={employee.certifications}
              Icon={DocumentTextIcon}
            />
            <GlassTile
              title="Straße & Hausnr."
              value={
                [employee.street, employee.house_number]
                  .filter(Boolean)
                  .join(' ') || '—'
              }
              Icon={BuildingOffice2Icon}
            />
            <GlassTile
              title="PLZ & Ort"
              value={
                [employee.postal_code, employee.city]
                  .filter(Boolean)
                  .join(' ') || '—'
              }
              Icon={MapPinIcon}
            />
            <GlassTile title="Land" value={employee.country} Icon={MapPinIcon} />
            <GlassTile
              title="Adresse (vollständig)"
              value={composedAddress}
              Icon={MapPinIcon}
            />
            <GlassTile
              title="Notfallname"
              value={employee.emergency_contact_name}
              Icon={UserIcon}
            />
            <GlassTile
              title="Notfalltelefon"
              value={employee.emergency_contact_phone}
              Icon={PhoneIcon}
            />
            <GlassTile
              title="IBAN"
              value={employee.bank_iban}
              Icon={IdentificationIcon}
              mono
            />
            <GlassTile
              title="BIC"
              value={employee.bank_bic}
              Icon={IdentificationIcon}
              mono
            />
            <GlassTile
              title="Notizen"
              value={employee.notes}
              Icon={DocumentTextIcon}
            />
          </div>
        )}

        <EditEmployeeForm employee={employee} startEditing={isEditing} />
      </section>

      {/* Dokumente */}
      <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Dokumente
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Ihr Mitarbeiter hat nach einer Einladung auch Zugriff auf diese
          Dokumente im Mitarbeiterportal.
        </p>
        <EmployeeDocuments employeeId={employee.id} />
      </section>

      {/* Abwesenheiten */}
      <section className="mb-4 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-5">
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Abwesenheiten
        </h2>
        <AbsenceHistory employeeId={employee.id} />
      </section>
    </div>
  )
}
