'use client'

type Status =
  | 'Erstellt'
  | 'Verschickt'
  | 'Bestätigt'
  | 'Bestaetigt'
  | 'Abgerechnet'
  | 'Überfällig'
  | 'Ueberfaellig'
  | 'Bezahlt'
  | string
  | null
  | undefined

export default function StatusBadge({ status }: { status: Status }) {
  const s = (status ?? 'Erstellt').toString()

  const map: Record<string, string> = {
    Erstellt:     'bg-slate-100 text-slate-700 ring-slate-200',
    Verschickt:   'bg-indigo-50 text-indigo-700 ring-indigo-100',
    Bestätigt:    'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Bestaetigt:   'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Abgerechnet:  'bg-amber-50 text-amber-700 ring-amber-100',
    Bezahlt:      'bg-teal-50 text-teal-700 ring-teal-100',
    Überfällig:   'bg-rose-50 text-rose-700 ring-rose-100',
    Ueberfaellig: 'bg-rose-50 text-rose-700 ring-rose-100',
  }

  const cls = map[s] ?? map.Erstellt
  const label = s === 'Bestaetigt' ? 'Bestätigt' : s === 'Ueberfaellig' ? 'Überfällig' : s

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  )
}
