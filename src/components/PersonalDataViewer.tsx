// src/components/PersonalDataViewer.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'

type Props = { open: boolean; onClose: () => void; requestId: string }

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

export default function PersonalDataViewer({ open, onClose, requestId }: Props) {
  const sb = supabaseClient()

  const [loading, setLoading] = React.useState(true)
  const [row, setRow] = React.useState<any | null>(null)

  // Bearbeiten-Status + Formularzustand
  const [edit, setEdit] = React.useState(false)
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

  // Darf bearbeiten? (Owner der Request)
  const [canEdit, setCanEdit] = React.useState(false)

  // Initial laden (Viewer) + Owner prüfen
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)

      // 1) Daten laden
      const { data } = await sb
        .from('market_request_personal_data')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle()

      // 2) Owner prüfen
      let ownerOk = false
      const { data: sess } = await sb.auth.getSession()
      const uid = sess?.session?.user?.id ?? null
      if (uid) {
        const { data: reqRow } = await sb
          .from('market_requests')
          .select('user_id')
          .eq('id', requestId)
          .single()
        ownerOk = !!reqRow?.user_id && reqRow.user_id === uid
      }

      if (!cancelled) {
        setRow(data ?? null)
        setCanEdit(ownerOk)
        setLoading(false)
        // Edit-Mode zurücksetzen, wenn keine Daten mehr da
        if (!data) {
          setEdit(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [open, requestId, sb])

  // Realtime: INSERT/UPDATE -> neu laden; DELETE -> sofort leeren & Edit-Mode aus
  React.useEffect(() => {
    if (!open) return
    const ch = sb.channel(`pdviewer:${requestId}`)

    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'market_request_personal_data', filter: `request_id=eq.${requestId}` },
      async (payload: any) => {
        if (payload?.eventType === 'DELETE') {
          setRow(null)
          setEdit(false)
          setLoading(false)
          return
        }
        // INSERT / UPDATE -> frisch laden
        setLoading(true)
        const { data } = await sb
          .from('market_request_personal_data')
          .select('*')
          .eq('request_id', requestId)
          .maybeSingle()
        setRow(data ?? null)
        setLoading(false)
      }
    )

    ch.subscribe(() => {})
    return () => { sb.removeChannel(ch) }
  }, [sb, requestId, open])

  // Custom-Event (z. B. nach Save/Delete)
  React.useEffect(() => {
    if (!open) return
    const onUpdated = async (e: any) => {
      if (e?.detail?.requestId !== requestId) return
      setLoading(true)
      const { data } = await sb
        .from('market_request_personal_data')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle()
      setRow(data ?? null)
      setLoading(false)
      if (!data) setEdit(false)
    }
    window.addEventListener('personal-data:updated', onUpdated)
    return () => window.removeEventListener('personal-data:updated', onUpdated)
  }, [open, requestId, sb])

  // ESC zum Schließen
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Wenn Edit-Mode startet, Felder aus row übernehmen
  React.useEffect(() => {
    if (!edit || !row) return
    const billState = {
      first_name: row.bill_first_name ?? '',
      last_name: row.bill_last_name ?? '',
      company: row.bill_company ?? '',
      street: row.bill_street ?? '',
      house_number: row.bill_house_number ?? '',
      postal_code: row.bill_postal_code ?? '',
      city: row.bill_city ?? '',
      phone: row.bill_phone ?? '',
      email: row.bill_email ?? '',
    }
    const sameFlag = !!row.exec_same_as_billing
    const execState = sameFlag
      ? { street: billState.street, house_number: billState.house_number, postal_code: billState.postal_code, city: billState.city }
      : {
          street: row.exec_street ?? '',
          house_number: row.exec_house_number ?? '',
          postal_code: row.exec_postal_code ?? '',
          city: row.exec_city ?? '',
        }
    setBill(billState)
    setSame(sameFlag)
    setExec(execState)
  }, [edit, row])

  // Spiegelung Ausführungsort
  React.useEffect(() => {
    if (!edit) return
    if (same) {
      setExec({
        street: bill.street,
        house_number: bill.house_number,
        postal_code: bill.postal_code,
        city: bill.city,
      })
    }
  }, [edit, same, bill.street, bill.house_number, bill.postal_code, bill.city])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      // Speichern via bestehender API
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
          exec_street: same ? bill.street : exec.street,
          exec_house_number: same ? bill.house_number : exec.house_number,
          exec_postal_code: same ? bill.postal_code : exec.postal_code,
          exec_city: same ? bill.city : exec.city,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)

      // Optional eigene Chat-Nachricht "aktualisiert" (ersetzt per startsWith die API-"bereitgestellt"-Box)
      const { data: conv } = await sb
        .from('market_conversations')
        .select('id')
        .eq('request_id', requestId)
        .single()
      const { data: sess } = await sb.auth.getSession()
      const uid = sess?.session?.user?.id ?? null
      if (conv?.id && uid) {
        // WICHTIG: beginnt mit dem gleichen Prefix wie im Chat, damit nur EINE grüne Box übrig bleibt (die neueste)
        await sb.from('market_messages').insert({
          conversation_id: conv.id,
          sender_user_id: uid,
          body_text: 'Personen- und Adressdaten wurden bereitgestellt (aktualisiert).',
        })
      }

      // Event für Header/Chips/Chat
      window.dispatchEvent(new CustomEvent('personal-data:updated', { detail: { requestId } }))

      // Edit-Mode verlassen
      setEdit(false)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const node = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/10" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_34px_rgba(2,6,23,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-medium">Personendaten</h3>
          <div className="flex items-center gap-2">
            {/* Bearbeiten nur wenn Daten vorhanden + Owner */}
            {row && canEdit && !edit && (
              <button
                onClick={() => setEdit(true)}
                className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm"
              >
                Bearbeiten
              </button>
            )}
            {edit && (
              <button
                onClick={() => setEdit(false)}
                className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm"
              >
                Abbrechen
              </button>
            )}
            <button onClick={onClose} className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm">
              Schließen
            </button>
          </div>
        </div>

        {/* Anzeige */}
        {!edit && (
          <>
            {loading && <div className="mt-4 text-sm text-slate-600">Lade…</div>}
            {!loading && !row && <div className="mt-4 text-sm text-slate-600">Es wurden noch keine Personendaten hinterlegt.</div>}

            {!loading && row && (
              <div className="mt-4 space-y-6">
                <section>
                  <div className="text-sm font-medium text-slate-900">Rechnungsadresse</div>
                  <dl className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <DT v={`${row.bill_first_name ?? ''} ${row.bill_last_name ?? ''}`.trim()} k="Name" />
                    <DT v={row.bill_company} k="Firma" />
                    <DT v={`${row.bill_street ?? ''} ${row.bill_house_number ?? ''}`.trim()} k="Straße / Nr." />
                    <DT v={`${row.bill_postal_code ?? ''} ${row.bill_city ?? ''}`.trim()} k="PLZ / Ort" />
                    <DT v={row.bill_phone} k="Telefon" />
                    <DT v={row.bill_email} k="E-Mail" />
                  </dl>
                </section>

                <section>
                  <div className="text-sm font-medium text-slate-900">Ausführungsort</div>
                  <div className="mt-1 text-xs text-slate-500">{row.exec_same_as_billing ? 'Wie Rechnungsadresse' : 'Abweichend'}</div>
                  {!row.exec_same_as_billing && (
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <DT v={`${row.exec_street ?? ''} ${row.exec_house_number ?? ''}`.trim()} k="Straße / Nr." />
                      <DT v={`${row.exec_postal_code ?? ''} ${row.exec_city ?? ''}`.trim()} k="PLZ / Ort" />
                    </dl>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {/* Edit-Form */}
        {edit && (
          <form onSubmit={onSave} className="mt-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] text-amber-900">
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

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEdit(false)}
                className="rounded-xl border border-white/60 bg-white px-4 py-2 text-sm hover:shadow-sm"
              >
                Abbrechen
              </button>
              <button
                disabled={busy}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node
}

function DT({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
      <div className="text-[11px] text-slate-500">{k}</div>
      <div className="text-sm text-slate-900">{v || '—'}</div>
    </div>
  )
}
