'use client'

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react'
import { createPortal } from 'react-dom'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

/* ---------------------------- Helpers ---------------------------- */

function clsx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { className, invalid, ...rest } = props
  const base =
    'w-full rounded-lg border bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4'
  return (
    <input
      {...rest}
      className={clsx(
        base,
        invalid
          ? 'border-rose-300 ring-rose-200/60 focus:border-rose-300'
          : 'border-slate-200/80 focus:border-slate-300 ring-indigo-200/60',
        className,
      )}
    />
  )
}

const NumberInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <TextInput type="number" step="1" {...props} />
)

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        ok
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-amber-50 text-amber-800 ring-amber-200',
      )}
    >
      {ok ? (
        <CheckCircleIcon className="h-4 w-4" />
      ) : (
        <ExclamationTriangleIcon className="h-4 w-4" />
      )}
      {label}
    </span>
  )
}

/** Feste Mapping-Logik wie auf der Einstellungen-Seite */
function labelFromTemplateName(fileName: string | null): string {
  if (!fileName) return 'Keine Auswahl'
  const base = fileName.split('/').pop() ?? fileName

  switch (base) {
    case 'Rechnung_Vorlage_Standard_weiss.pdf':
      return 'Standard'
    case 'Rechnung_Vorlage_2_Beige.pdf':
      return 'Beige'
    case 'Rechnung_Vorlage_1_Welle_Standard.pdf':
      return 'Welle'
    case 'Rechnung_Vorlage_3_Schwarz.pdf':
      return 'Schwarz'
    case 'Rechnung_Vorlage_4_Blau.pdf':
      return 'Blau'
    case 'Rechnung_Vorlage_6_Modern.pdf':
      return 'Modern'
    default:
      return 'Layout'
  }
}

/** Beispiel-Nummer aus Prefix/Start/Suffix bauen, z. B. RE-2024-0001 */
function buildNumberExample(prefix: string, start: number | null | undefined, suffix: string) {
  const num = String(start || 1).padStart(4, '0')
  return `${prefix || ''}${num}${suffix || ''}`
}

/* ---------------------------- Types ---------------------------- */

type BillingSettings = {
  user_id: string
  invoice_prefix?: string | null
  invoice_suffix?: string | null
  invoice_start?: number | null
  quote_prefix?: string | null
  quote_suffix?: string | null
  quote_start?: number | null
  order_confirmation_prefix?: string | null
  order_confirmation_suffix?: string | null
  order_confirmation_start?: number | null
  agb_url?: string | null
  privacy_url?: string | null
  account_holder?: string | null
  iban?: string | null
  bic?: string | null
  billing_phone?: string | null
  billing_email?: string | null
  template?: string | null
}

type UsersApiProfile = {
  profile?: {
    id: string
    role?: 'admin' | 'mitarbeiter' | string | null
    first_name?: string | null
    last_name?: string | null
    company_name?: string | null
    vat_number?: string | null
  } | null
  logo_url?: string | null
}

/* ---------------------------- Main Component ---------------------------- */

export default function OnboardingGate() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  // Schritte: 0 Willkommen, 1 Billing, 2 Vorlage, 3 Logo
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<string[]>([])
  const [settings, setSettings] = useState<BillingSettings | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Step 1
  const [form, setForm] = useState<BillingSettings | null>(null)
  const [saving, setSaving] = useState(false)

  // USt-IdNr. (optional)
  const [vatNumber, setVatNumber] = useState<string>('')

  // Step 2
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Step 3 (Logo)
  const [file, setFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Body-Scroll sperren, solange Modal offen ist
  useEffect(() => {
    if (!mounted || !open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open, mounted])

  // fetch data to decide if onboarding is needed
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        setLoading(true)

        // Profil + evtl. Logo
        const usersRes = await fetch('/api/users')
        if (!usersRes.ok) {
          setOpen(false)
          return
        }
        const up = (await usersRes.json()) as UsersApiProfile
        const role = up.profile?.role ?? 'mitarbeiter'
        if (!ignore) {
          setLogoUrl(up.logo_url || null)
          setVatNumber(up.profile?.vat_number || '')
        }

        // Nur Admins sehen das Gate
        if (role !== 'admin') {
          if (!ignore) {
            setOpen(false)
            setLoading(false)
          }
          return
        }

        // Billing + vorhandene Templates holen
        const res = await fetch('/api/billing-settings', { method: 'GET' })
        if (res.status === 401) return
        if (!res.ok) throw new Error('Billing-Settings konnten nicht geladen werden.')
        const json = await res.json()
        const { files: f, ...s } = json as { files: string[] } & BillingSettings
        if (ignore) return
        setFiles(f || [])
        setSettings(s)
        setForm(s)

        // Onboarding nötig?
        const needBilling =
          !s?.account_holder || !s?.iban || !s?.bic || !s?.billing_phone || !s?.billing_email
        const needNumbering =
          s?.quote_prefix == null ||
          s?.quote_start == null ||
          s?.quote_suffix == null ||
          s?.invoice_prefix == null ||
          s?.invoice_start == null ||
          s?.invoice_suffix == null
        const needTemplate = !s?.template

        const needs = needBilling || needNumbering || needTemplate
        setOpen(needs)
        setStep(0)

        // falls schon Template gespeichert ist, auch in local state spiegeln
        if (s.template) {
          setSelectedTemplate(s.template)
        }
      } catch {
        setOpen(false)
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const ibanOk = useMemo(() => {
    const raw = form?.iban?.replace(/\s+/g, '').toUpperCase() || ''
    return !raw || /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(raw)
  }, [form?.iban])

  const bicOk = useMemo(() => {
    const raw = (form?.bic || '').toUpperCase()
    return !raw || /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(raw)
  }, [form?.bic])

  const status = useMemo(() => {
    const s = settings
    const billingDone = !!(
      s?.account_holder &&
      s?.iban &&
      s?.bic &&
      s?.billing_phone &&
      s?.billing_email
    )
    const numberingDone = !(
      s?.quote_prefix == null ||
      s?.quote_start == null ||
      s?.quote_suffix == null ||
      s?.invoice_prefix == null ||
      s?.invoice_start == null ||
      s?.invoice_suffix == null
    )
    const templateDone = !!s?.template
    const logoDone = !!logoUrl
    return { billingDone, numberingDone, templateDone, logoDone }
  }, [settings, logoUrl])

  const canSaveStep2 =
    !!form &&
    !!form.account_holder &&
    !!form.iban &&
    !!form.bic &&
    !!form.billing_phone &&
    !!form.billing_email &&
    form.quote_prefix !== undefined &&
    form.quote_start !== undefined &&
    form.quote_suffix !== undefined &&
    form.invoice_prefix !== undefined &&
    form.invoice_start !== undefined &&
    form.invoice_suffix !== undefined &&
    ibanOk &&
    bicOk

  const saveStep2 = async () => {
    if (!form) return
    setSaving(true)
    try {
      // USt-IdNr. im Profil speichern (optional)
      if (typeof vatNumber === 'string') {
        await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vat_number: vatNumber.trim() }),
        }).catch(() => {})
      }

      const res = await fetch('/api/billing-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_holder: form.account_holder,
          iban: form.iban,
          bic: form.bic,
          billing_phone: form.billing_phone,
          billing_email: form.billing_email,
          quote_prefix: form.quote_prefix ?? '',
          quote_suffix: form.quote_suffix ?? '',
          quote_start: Number(form.quote_start ?? 1),
          invoice_prefix: form.invoice_prefix ?? '',
          invoice_suffix: form.invoice_suffix ?? '',
          invoice_start: Number(form.invoice_start ?? 1),
          order_confirmation_prefix: form.order_confirmation_prefix ?? 'AB',
          order_confirmation_suffix: form.order_confirmation_suffix ?? '',
          order_confirmation_start: Number(form.order_confirmation_start ?? 1),
        }),
      })
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({
          message: 'Fehler beim Speichern',
        }))
        alert(message)
        return
      }
      const refreshed = await (await fetch('/api/billing-settings')).json()
      setSettings(refreshed)
      setForm(refreshed)
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  const saveStep3 = async () => {
    if (!selectedTemplate && !settings?.template) return
    setSaving(true)
    try {
      if (selectedTemplate) {
        const res = await fetch('/api/billing-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: selectedTemplate }),
        })
        if (!res.ok) {
          const { message } = await res.json().catch(() => ({
            message: 'Fehler beim Speichern',
          }))
          alert(message)
          return
        }
      }
      const refreshed = await (await fetch('/api/billing-settings')).json()
      setSettings(refreshed)
      setStep(3)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  /* -------------------- Logo: Preview & Auto-Upload -------------------- */

  // sichere ObjectURL-Verwaltung
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Dropzone-Events (DOM DragEvent, nicht React.DragEvent)
  useEffect(() => {
    const el = dropRef.current
    if (!el) return

    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const f = Array.from(e.dataTransfer?.files || [])[0]
      if (f) handleNewFile(f)
      el.classList.remove('ring-2', 'ring-slate-300')
    }

    const onOver = (e: DragEvent) => {
      e.preventDefault()
      el.classList.add('ring-2', 'ring-slate-300')
    }

    const onLeave = () => {
      el.classList.remove('ring-2', 'ring-slate-300')
    }

    el.addEventListener('drop', onDrop)
    el.addEventListener('dragover', onOver)
    el.addEventListener('dragleave', onLeave)

    return () => {
      el.removeEventListener('drop', onDrop)
      el.removeEventListener('dragover', onOver)
      el.removeEventListener('dragleave', onLeave)
    }
  }, [])

  const handleNewFile = (f: File) => {
    setLogoError(null)
    setLogoSuccess(null)
    const okType = ['image/png', 'image/jpeg'].includes(f.type)
    const okSize = f.size <= 5 * 1024 * 1024 // 5MB
    if (!okType) {
      setLogoError('Nur PNG oder JPG erlaubt.')
      return
    }
    if (!okSize) {
      setLogoError('Maximale Dateigröße: 5 MB.')
      return
    }
    setFile(f)
    uploadLogo(f).catch(() => {})
  }

  const uploadLogo = async (directFile?: File) => {
    const f = directFile ?? file
    if (!f) return
    setUploadingLogo(true)
    setLogoError(null)
    setLogoSuccess(null)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/users/logo', { method: 'POST', body: fd })
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({
          message: res.statusText,
        }))
        setLogoError(message || 'Upload fehlgeschlagen')
        return
      }
      const up = (await (await fetch('/api/users')).json()) as UsersApiProfile
      setLogoUrl(up.logo_url || null)
      setLogoSuccess('Logo erfolgreich hochgeladen.')
      window.setTimeout(() => setLogoSuccess(null), 3000)
    } catch (e: any) {
      setLogoError(e?.message || 'Upload fehlgeschlagen')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (!mounted) return null
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[1200]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />

      {/* Dialog: Mobil = Vollbild, Desktop = Center-Card */}
      <div
        className={clsx(
          // mobile: fullscreen
          'absolute left-0 top-0 h-[100svh] w-screen translate-x-0 translate-y-0 rounded-none',
          // desktop: centered card
          'md:left-1/2 md:top-1/2 md:w-[min(1100px,95vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:h-auto md:max-h-[80vh]',
          'flex flex-col overflow-hidden border border-white/60 bg-white/92 shadow-[0_25px_90px_rgba(2,6,23,0.35)] backdrop-blur-xl',
        )}
      >
        {/* Header (sticky innerhalb der Card) */}
        <div className="flex items-center justify-between border-b border-white/60 bg-white/90 px-4 py-3 backdrop-blur md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-slate-900">
              Erstes Setup
            </h1>
            <div className="hidden items-center gap-2 sm:flex">
              <Pill ok={status.billingDone} label="Bank & Kontakt" />
              <Pill ok={status.numberingDone} label="Nummernkreise" />
              <Pill ok={status.templateDone} label="Vorlage" />
              <Pill ok={!!logoUrl} label="Logo (optional)" />
            </div>
          </div>
          {/* kleine Zusammenfassung auf sehr kleinen Screens */}
          <div className="sm:hidden text-[11px] text-slate-600">
            Schritt {step + 1}/4
          </div>
        </div>

        {/* Body (scrollbar nur hier) */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-4"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {step === 0 && (
            <>
              <StepHeader
                title="Willkommen 👋"
                subtitle="Wir richten in 3 kurzen Schritten deine Buchhaltung ein (Logo optional im letzten Schritt)."
              />
              <div className="rounded-xl border border-white/60 bg-white/80 p-4 text-sm text-slate-700">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Bank- & Kontaktangaben (für PDFs & Fußzeilen)</li>
                  <li>Nummernkreise (Angebot & Rechnung)</li>
                  <li>Vorlage wählen (PDF-Hintergrund)</li>
                  <li>Logo hochladen (optional)</li>
                </ul>
              </div>
            </>
          )}

          {step === 1 && !!form && (
            <>
              <StepHeader
                title="Bank, Kontakt & Nummernkreise"
                subtitle="Diese Angaben erscheinen in den Fußzeilen und Kopfzeilen deiner Angebote und Rechnungen."
              />

              {/* Hinweis zur USt-IdNr. und E-Rechnung */}
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <strong>Hinweis:</strong> Die USt-IdNr. ist für die Erstellung einer
                E-Rechnung (EN&nbsp;16931/XRechnung) erforderlich. In Deutschland wird die
                E-Rechnung im B2B-Bereich schrittweise verpflichtend (Start 2025; weitere
                Pflichten je nach Unternehmensgröße ab 2027/2028).
              </div>

              {/* Bank + Kontakt */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Kontoinhaber">
                  <TextInput
                    value={form.account_holder ?? ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        account_holder: e.target.value,
                      })
                    }
                  />
                </Field>

                <div className="grid grid-cols-1 gap-2">
                  <Field label="IBAN">
                    <TextInput
                      value={form.iban ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          iban: e.target.value,
                        })
                      }
                      invalid={!ibanOk}
                      placeholder="DE•••• •••• •••• •••• ••"
                    />
                  </Field>
                  {!ibanOk && (
                    <p className="text-xs text-rose-600">Ungültige IBAN.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Field label="BIC">
                    <TextInput
                      value={form.bic ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          bic: e.target.value,
                        })
                      }
                      invalid={!bicOk}
                      placeholder="BANKDEFFXXX"
                    />
                  </Field>
                  {!bicOk && (
                    <p className="text-xs text-rose-600">Ungültige BIC.</p>
                  )}
                </div>

                <Field label="Telefon (Abrechnung)">
                  <TextInput
                    value={form.billing_phone ?? ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        billing_phone: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="E-Mail (Abrechnung)">
                  <TextInput
                    type="email"
                    value={form.billing_email ?? ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        billing_email: e.target.value,
                      })
                    }
                  />
                </Field>

                {/* USt-ID */}
                <div className="md:col-span-2">
                  <Field label="Umsatzsteuer-ID (optional)">
                    <TextInput
                      value={vatNumber}
                      onChange={e => setVatNumber(e.target.value)}
                      placeholder="z. B. DE123456789"
                    />
                  </Field>
                </div>
              </div>

              {/* Nummernkreise + Erklärung */}
              <div className="mt-5 space-y-3 rounded-xl border border-white/60 bg-white/80 p-4">
                <div className="text-sm font-semibold text-slate-800">
                  Nummernkreise
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-medium">Prefix</span> steht vor der laufenden
                  Nummer, <span className="font-medium">Suffix</span> dahinter.
                  GLENO zählt die Nummern automatisch hoch. Beispiel:&nbsp;
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                    RE-2024-0001
                  </code>{' '}
                  → Prefix: <b>RE-2024-</b>, Start: <b>1</b>, Suffix: (leer).
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Angebot Prefix">
                    <TextInput
                      value={form.quote_prefix ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          quote_prefix: e.target.value,
                        })
                      }
                      placeholder="z. B. ANG-2024-"
                    />
                  </Field>
                  <Field label="Angebot Start">
                    <NumberInput
                      value={form.quote_start ?? 1}
                      onChange={e =>
                        setForm({
                          ...form,
                          quote_start: Number(e.target.value || 1),
                        })
                      }
                    />
                  </Field>
                  <Field label="Angebot Suffix">
                    <TextInput
                      value={form.quote_suffix ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          quote_suffix: e.target.value,
                        })
                      }
                      placeholder="z. B. -A"
                    />
                  </Field>

                  <Field label="Rechnung Prefix">
                    <TextInput
                      value={form.invoice_prefix ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          invoice_prefix: e.target.value,
                        })
                      }
                      placeholder="z. B. RE-2024-"
                    />
                  </Field>
                  <Field label="Rechnung Start">
                    <NumberInput
                      value={form.invoice_start ?? 1}
                      onChange={e =>
                        setForm({
                          ...form,
                          invoice_start: Number(e.target.value || 1),
                        })
                      }
                    />
                  </Field>
                  <Field label="Rechnung Suffix">
                    <TextInput
                      value={form.invoice_suffix ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          invoice_suffix: e.target.value,
                        })
                      }
                      placeholder="z. B. -R"
                    />
                  </Field>
                </div>

                {/* Live-Beispiel */}
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div className="mb-1 font-semibold">Beispiele aus deinen Angaben:</div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <div>
                      Angebot:{' '}
                      <code className="rounded bg-white px-1.5 py-0.5">
                        {buildNumberExample(
                          form.quote_prefix ?? '',
                          form.quote_start ?? 1,
                          form.quote_suffix ?? '',
                        )}
                      </code>
                    </div>
                    <div>
                      Rechnung:{' '}
                      <code className="rounded bg-white px-1.5 py-0.5">
                        {buildNumberExample(
                          form.invoice_prefix ?? '',
                          form.invoice_start ?? 1,
                          form.invoice_suffix ?? '',
                        )}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader
                title="Vorlage wählen"
                subtitle="Wähle deinen PDF-Hintergrund für Angebote/Rechnungen."
              />

              {/* Toggles oben, Preview darunter */}
              <div className="space-y-4">
                <div className="rounded-xl border border-white/60 bg-white/80 p-3">
                  {files.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      Keine Vorlagen im Bucket gefunden.
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Layout auswählen
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {files.map(name => {
                          const isActive =
                            (selectedTemplate || settings?.template || '') === name
                          const label = labelFromTemplateName(name)
                          return (
                            <label
                              key={name}
                              className={clsx(
                                'cursor-pointer rounded-full border px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-2 transition',
                                isActive
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                  : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white',
                              )}
                            >
                              <input
                                type="radio"
                                name="tpl"
                                value={name}
                                checked={isActive}
                                onChange={() => setSelectedTemplate(name)}
                                className="hidden"
                              />
                              <span>{label}</span>
                            </label>
                          )
                        })}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Tipp: Lege eigene PDF-Hintergründe im Bucket{' '}
                        <code>rechnungvorlagen</code> ab, um sie hier auszuwählen.
                      </p>
                    </>
                  )}
                </div>

                <div className="h-[260px] overflow-hidden rounded-xl border border-white/60 bg-white/80 sm:h-[340px] md:h-[420px]">
                  <TemplatePreview
                    name={selectedTemplate || settings?.template || ''}
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <StepHeader
                title="Logo hochladen (optional)"
                subtitle="Dein Logo erscheint auf Angebot/Rechnung (wir empfehlen ein Logo mit transparentem Hintergrund)."
              />

              {logoSuccess && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircleIcon className="mr-1 inline h-4 w-4" />
                  {logoSuccess}
                </div>
              )}
              {logoError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {logoError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div
                    ref={dropRef}
                    className="rounded-xl border-2 border-dashed border-slate-200 bg-white/70 p-4 text-center"
                  >
                    <p className="mb-2 text-sm text-slate-600">
                      Logo hierher ziehen oder Datei auswählen
                    </p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleNewFile(f)
                      }}
                      className="mx-auto block text-sm"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      PNG oder JPG, ideal 1500×600&nbsp;px (mind. 1250×500&nbsp;px),
                      sRGB. PNG mit transparentem Hintergrund empfohlen.
                    </p>
                    {uploadingLogo && (
                      <div className="mt-3 text-xs text-slate-600">Lädt hoch…</div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="flex h-full items-center justify-center rounded-xl border border-white/60 bg-white/80 p-3">
                    {filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Logo-Vorschau"
                        className="max-h-32 max-w-full object-contain"
                      />
                    ) : logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Aktuelles Logo"
                        className="max-h-32 max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">
                        Noch kein Logo hochgeladen – dieser Schritt ist optional.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer (sticky am unteren Rand der Card) */}
        <div className="border-t border-white/60 bg-white/90 px-4 py-3 backdrop-blur md:px-5 md:py-3">
          <div className="flex items-center justify-between">
            <div className="hidden text-xs text-slate-600 sm:block">
              Schritt {step + 1} / 4
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(s => (s > 0 ? ((s - 1) as any) : s))}
                  className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow hover:bg-white"
                >
                  Zurück
                </button>
              )}
              {step === 0 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black"
                >
                  Los geht’s <ChevronRightIcon className="h-4 w-4" />
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  onClick={saveStep2}
                  disabled={!canSaveStep2 || saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
                >
                  {saving ? 'Speichert…' : 'Weiter'}
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={saveStep3}
                  disabled={saving || !(selectedTemplate || settings?.template)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
                >
                  {saving ? 'Speichert…' : 'Weiter'}
                </button>
              )}
              {step === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow hover:bg-white"
                  >
                    Später
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black"
                  >
                    Fertigstellen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ---------------------------- Template Preview ---------------------------- */
function TemplatePreview({ name }: { name: string }) {
  const supabase = createClientComponentClient()
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      if (!name) {
        if (!ignore) {
          setUrl(null)
          setError(null)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Bucket-Name = rechnungvorlagen
        const { data } = supabase.storage.from('rechnungvorlagen').getPublicUrl(name)
        const publicUrl = data?.publicUrl ?? null

        if (!publicUrl) {
          if (!ignore) {
            setUrl(null)
            setError('Keine Vorschau möglich.')
          }
          return
        }

        // HEAD-Check, damit im Fehlerfall kein JSON im <object> landet
        const res = await fetch(publicUrl, { method: 'HEAD' })
        if (!res.ok) {
          if (!ignore) {
            setUrl(null)
            setError('Keine Vorschau möglich.')
          }
          return
        }

        if (!ignore) {
          setUrl(publicUrl)
        }
      } catch {
        if (!ignore) {
          setUrl(null)
          setError('Keine Vorschau möglich.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    })()

    return () => {
      ignore = true
    }
  }, [name, supabase])

  if (!name) {
    return (
      <div className="grid h-full place-items-center px-4 text-center text-sm text-slate-500">
        Bitte oben eine Vorlage auswählen.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        Vorschau wird geladen…
      </div>
    )
  }

  if (!url || error) {
    return (
      <div className="grid h-full place-items-center px-4 text-center text-sm text-slate-500">
        Keine Vorschau möglich.
        <br />
        Die Datei konnte nicht aus dem Bucket <code>rechnungvorlagen</code> geladen werden.
      </div>
    )
  }

  return (
    <object data={url} type="application/pdf" className="h-full w-full">
      <p className="p-4 text-sm text-slate-500">
        Ihr Browser kann die PDF-Vorschau nicht anzeigen.
        <a href={url} target="_blank" rel="noreferrer" className="ml-1 underline">
          PDF öffnen
        </a>
      </p>
    </object>
  )
}
