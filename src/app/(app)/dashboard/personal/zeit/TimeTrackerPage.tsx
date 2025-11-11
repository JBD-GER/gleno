'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

type Entry = {
  id: string
  employee_id: string
  start_time: string
  end_time: string | null
  work_date: string             // YYYY-MM-DD
  notes: string | null
  break_minutes?: number | null // optional
}

/* ---------- Helpers ---------- */
const pad = (n:number)=>String(n).padStart(2,'0')
const fmtHMS = (sec:number)=>{
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s/3600)
  const m = Math.floor((s%3600)/60)
  const r = Math.floor(s%60)
  return `${pad(h)}:${pad(m)}:${pad(r)}`
}
// FIX: floor statt round
const diffSeconds = (aIso:string, bIso:string)=>
  Math.max(0, Math.floor((+new Date(bIso) - +new Date(aIso))/1000))

const ymd = (d:Date)=>d.toISOString().slice(0,10)
const monthKey = (d:Date)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}` // YYYY-MM
const fmtDateLong = (d:Date)=>d.toLocaleDateString('de-DE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
const fmtTime = (iso:string)=>new Date(iso).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})

export default function TimeTrackerPage() {
  const supa = supabaseClient()

  // Identität
  const [employeeId, setEmployeeId] = useState<string|null>(null)

  // Auswahl Monat & Tag
  const [currentDate, setCurrentDate] = useState(new Date())
  const [months, setMonths] = useState<string[]>([])                 // ← nur echte Monate mit Einträgen
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKey(new Date()))

  // Eingaben
  const [notes, setNotes] = useState('')
  const [pauseChecked, setPauseChecked] = useState(false)
  const [pauseMin, setPauseMin] = useState(30)

  // Laufender Timer
  const [runningEntry, setRunningEntry] = useState<Entry|null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Listen / Summen
  const [loading, setLoading] = useState(true)
  const [dayEntries, setDayEntries] = useState<Entry[]>([])
  const [monthTotalSec, setMonthTotalSec] = useState(0)

  // Filter
  const [statusFilter, setStatusFilter] = useState<'alle'|'laufend'|'fertig'>('alle')
  const [q, setQ] = useState('')

  /* ---------- Mitarbeiter-ID bestimmen ---------- */
  useEffect(()=>{
    let ignore=false
    ;(async ()=>{
      const { data:{ user } } = await supa.auth.getUser()
      if (!user || !user.email) return
      const { data: byMail } = await supa.from('employees').select('id').eq('email', user.email).maybeSingle()
      if (!ignore) setEmployeeId(byMail?.id ?? null)
    })()
    return ()=>{ ignore=true }
  },[supa])

  /* ---------- Monate dynamisch aus DB laden (nur Monate mit Einträgen) ---------- */
  useEffect(() => {
    if (!employeeId) return
    let ignore = false
    ;(async () => {
      const { data, error } = await supa
        .from('time_entries')
        .select('work_date')
        .eq('employee_id', employeeId)

      if (error) return

      const uniq = Array.from(
        new Set((data ?? []).map(r => String((r as any).work_date).slice(0, 7))) // YYYY-MM
      ).filter(m => /^\d{4}-\d{2}$/.test(m))
       .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)) // neueste zuerst

      if (ignore) return
      setMonths(uniq)

      if (uniq.length && !uniq.includes(selectedMonth)) {
        setSelectedMonth(uniq[0])
      }
    })()
    return () => { ignore = true }
  }, [employeeId, supa]) // nur wenn Mitarbeiter feststeht

  /* ---------- currentDate auf selectedMonth einschnappen ---------- */
  useEffect(()=> {
    if (!selectedMonth) return
    const [Y,M] = selectedMonth.split('-').map(n=>+n)
    const d = new Date(currentDate)
    d.setFullYear(Y, M-1, Math.min(currentDate.getDate(), 28)) // safe
    setCurrentDate(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  /* ---------- Tages- & Monatsdaten laden ---------- */
  async function loadForDay(empId:string, date:Date) {
    setLoading(true)
    try {
      const day = ymd(date)

      // Tagesliste
      const { data: list } = await supa
        .from('time_entries')
        .select('id, employee_id, start_time, end_time, work_date, notes, break_minutes')
        .eq('employee_id', empId)
        .eq('work_date', day)
        .order('start_time', { ascending: false })
      setDayEntries((list ?? []) as Entry[])

      // Laufend?
      const running = (list ?? []).find(e => e.end_time === null) as Entry | undefined
      setRunningEntry(running ?? null)
      setElapsedSec(running ? diffSeconds(running.start_time, new Date().toISOString()) : 0)

      // Monatssumme
      let mStart = new Date(date)
      let mEnd = new Date(date)
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(Number)
        mStart = new Date(y, m - 1, 1, 0, 0, 0, 0)
        mEnd   = new Date(y, m, 0, 23, 59, 59, 999)
      } else {
        mStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
        mEnd   = new Date(date.getFullYear(), date.getMonth()+1, 0, 23, 59, 59, 999)
      }

      const { data: monthRows } = await supa
        .from('time_entries')
        .select('start_time, end_time, break_minutes, work_date')
        .eq('employee_id', empId)
        .gte('work_date', ymd(mStart))
        .lte('work_date', ymd(mEnd))

      const mSec = (monthRows ?? []).reduce((acc, r:any)=>{
        if (!r.end_time) return acc
        const base = diffSeconds(r.start_time, r.end_time)
        const minus = Number(r.break_minutes||0) * 60
        return acc + Math.max(0, base - minus)
      }, 0)
      setMonthTotalSec(mSec)
    } finally {
      setLoading(false)
    }
  }

  // initial + bei Änderungen laden
  useEffect(()=>{
    if (!employeeId) return
    loadForDay(employeeId, currentDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, currentDate, selectedMonth])

  /* ---------- Realtime für den aktuellen Tag ---------- */
  useEffect(()=>{
    if (!employeeId) return
    const ch = supa
      .channel(`time_entries_${employeeId}`)
      .on('postgres_changes',
        { event:'*', schema:'public', table:'time_entries', filter:`employee_id=eq.${employeeId}` },
        ()=> loadForDay(employeeId, currentDate)
      ).subscribe()
    return ()=> { supa.removeChannel(ch) }
  }, [supa, employeeId, currentDate])

  /* ---------- Live Tick (Echtzeit, unabhängig von FPS) ---------- */
  useEffect(() => {
    if (!runningEntry) { setElapsedSec(0); return }
    const startMs = new Date(runningEntry.start_time).getTime()

    const tick = () => {
      setElapsedSec(Math.max(0, (Date.now() - startMs) / 1000))
    }

    tick() // sofort initialisieren
    const id = window.setInterval(tick, 250) // 4x pro Sekunde
    return () => window.clearInterval(id)
  }, [runningEntry])

  /* ---------- Aktionen ---------- */
  const start = async ()=>{
    if (!employeeId || runningEntry) return
    const now = new Date()
    const payload: Partial<Entry> & { break_minutes?: number } = {
      employee_id: employeeId,
      start_time: now.toISOString(),
      end_time: null,
      work_date: ymd(currentDate),
      notes: notes.trim() || null,
      break_minutes: 0,
    }
    const { data, error } = await supa.from('time_entries').insert(payload).select('*').single()
    if (error) return alert(error.message)
    setNotes('')
    setPauseChecked(false)
    setPauseMin(30)
    setDayEntries(prev=> [data as Entry, ...prev])
    setRunningEntry(data as Entry)
    setElapsedSec(0)
  }

  const stop = async ()=>{
    if (!runningEntry) return
    const endIso = new Date().toISOString()
    const extraPause = pauseChecked ? Math.max(0, Math.round(pauseMin)) : 0

    const { data, error } = await supa
      .from('time_entries')
      .update({
        end_time: endIso,
        notes: runningEntry.notes ?? null,
        break_minutes: extraPause,
      })
      .eq('id', runningEntry.id)
      .select('*')
      .single()
    if (error) return alert(error.message)

    setRunningEntry(null)
    setElapsedSec(0)
    setPauseChecked(false)
    setPauseMin(30)
    setDayEntries(prev => prev.map(e=> e.id===data.id ? (data as Entry) : e))
  }

  /* ---------- Abgeleitet ---------- */
  const filteredEntries = useMemo(()=>{
    return dayEntries.filter(e=>{
      if (statusFilter === 'laufend' && e.end_time) return false
      if (statusFilter === 'fertig' && !e.end_time) return false
      if (q && !(e.notes||'').toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [dayEntries, statusFilter, q])

  const totalDaySec = useMemo(()=>{
    return dayEntries.reduce((acc, e)=>{
      const base = e.end_time
        ? diffSeconds(e.start_time, e.end_time)
        : (runningEntry && e.id===runningEntry.id ? Math.floor(elapsedSec) : 0)
      const minus = Number(e.break_minutes||0)*60
      return acc + Math.max(0, base - minus)
    }, 0)
  }, [dayEntries, runningEntry, elapsedSec])

  /* ---------- UI ---------- */
  const goDay = (delta:number)=>{
    const d = new Date(currentDate)
    d.setDate(d.getDate()+delta)
    setCurrentDate(d)
    const mk = monthKey(d)
    if (mk !== selectedMonth) setSelectedMonth(mk)
  }

  const PausePreset = ({ v }:{ v:number }) => (
    <button
      type="button"
      onClick={() => { setPauseChecked(true); setPauseMin(v) }}
      className={[
        'rounded-lg border px-2.5 py-1 text-xs shadow transition',
        pauseChecked && pauseMin === v
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-white/60 bg-white/80 text-slate-800 hover:bg-white'
      ].join(' ')}
      title={`${v} Minuten Pause ansetzen`}
    >
      {v}m
    </button>
  )

  return (
    <div className="w-full flex flex-col gap-6">
      {/* TOOLBAR (linksbündig, volle Breite) */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl"
        style={{ backgroundImage: 'radial-gradient(1200px 600px at 80% -20%, rgba(15,23,42,0.10), transparent)' }}
      >
        <div className="relative p-4 sm:p-5">
          <div className="mb-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Zeiterfassung</h1>
            <p className="text-sm text-slate-600">{fmtDateLong(currentDate)}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Monats-Chips */}
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 pr-2">
                {months.length === 0 ? (
                  <span className="text-xs text-slate-500">Noch keine Zeiten erfasst</span>
                ) : months.map((m) => {
                  const active = selectedMonth === m
                  const label = new Date(m + '-01').toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={[
                        'whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm shadow transition',
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-white/60 bg-white/80 text-slate-800 hover:bg-white',
                      ].join(' ')}
                      title={label}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tages-Navi + Monats-Summe */}
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow">
                <button onClick={() => goDay(-1)} className="px-3 py-2 text-sm text-slate-800 hover:bg-white">‹ Gestern</button>
                <button
                  onClick={() => { const t = new Date(); setSelectedMonth(monthKey(t)); setCurrentDate(t) }}
                  className="px-3 py-2 text-sm bg-slate-900 text-white"
                >
                  Heute
                </button>
                <button onClick={() => goDay(1)} className="px-3 py-2 text-sm text-slate-800 hover:bg-white">Morgen ›</button>
              </div>

              <div className="hidden sm:inline-flex items-center rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
                Monat: <span className="ml-1 font-mono">{fmtHMS(monthTotalSec)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIMER */}
      <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Live-Timer</div>
            <div className="mt-1 text-4xl font-mono tabular-nums text-slate-900">{fmtHMS(Math.floor(elapsedSec))}</div>
            {runningEntry
              ? <div className="mt-1 text-xs text-slate-500">gestartet um {fmtTime(runningEntry.start_time)}</div>
              : <div className="mt-1 text-xs text-slate-500">bereit zum Starten</div>
            }
          </div>

          <div className="w/full sm:max-w-sm">
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Tätigkeit / Notiz (optional)"
              value={notes}
              onChange={e=>setNotes(e.target.value)}
              disabled={!!runningEntry}
            />
            {runningEntry && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={pauseChecked}
                    onChange={e=>setPauseChecked(e.target.checked)}
                  />
                  Pause abziehen
                </label>

                {/* Presets 30 / 45 / 60 Minuten */}
                <div className="inline-flex items-center gap-1">
                  {[30,45,60].map(v => <PausePreset key={v} v={v} />)}
                </div>

                <input
                  type="number" min={0} step={5}
                  value={pauseMin}
                  onChange={e=>setPauseMin(Math.max(0, Number(e.target.value||0)))}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-50"
                  disabled={!pauseChecked}
                />
                <span className="text-sm text-slate-500">Min</span>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {!runningEntry ? (
                <button
                  onClick={start}
                  disabled={!employeeId || loading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
                >
                  Stop
                </button>
              )}
              <div className="ml-auto inline-flex items-center rounded-xl bg-white/80 px-3 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 sm:hidden">
                Monat: <span className="ml-1 font-mono">{fmtHMS(monthTotalSec)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow">
          {(['alle','laufend','fertig'] as const).map(k=>(
            <button key={k}
              onClick={()=>setStatusFilter(k)}
              className={[
                'px-3 py-2 text-sm transition',
                statusFilter===k ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-white',
              ].join(' ')}
            >
              {k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </div>
        <input
          placeholder="Suche in Notizen…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          className="w-full sm:w-72 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow"
        />
      </div>

      {/* LISTE */}
      <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Einträge am {fmtDateLong(currentDate)}</div>
          <div className="text-sm font-medium text-slate-700">
            Tagessumme: <span className="font-mono">{fmtHMS(totalDaySec)}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Lade…</div>
        ) : !employeeId ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Für deinen Account wurde kein Mitarbeiter-Datensatz gefunden.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-sm text-slate-500">Keine Einträge für diesen Tag.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filteredEntries.map(e=>{
              const running = e.end_time===null
              const baseSec = running
                ? (runningEntry && e.id===runningEntry.id ? Math.floor(elapsedSec) : 0)
                : diffSeconds(e.start_time, e.end_time!)
              const minus = Number(e.break_minutes||0)*60
              const dur = Math.max(0, baseSec - minus)
              return (
                <li key={e.id} className="py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-800">
                      <span className="font-mono">{fmtTime(e.start_time)}</span>
                      {' — '}
                      <span className="font-mono">{e.end_time ? fmtTime(e.end_time) : 'läuft…'}</span>
                      <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {fmtHMS(dur)}
                      </span>
                      {!!(e.break_minutes) && (
                        <span className="ml-2 text-[11px] text-slate-500">Pause {e.break_minutes}m</span>
                      )}
                      {running && <span className="ml-2 text-[11px] text-emerald-700">läuft</span>}
                    </div>
                    <div className="text-sm text-slate-600">{e.notes || '—'}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
