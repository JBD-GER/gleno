'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'
import {
  PlusIcon,
  CalendarDaysIcon,
  CalendarIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

/* ===================== Typen ===================== */
type PlanRow = {
  id: string
  project_id: string
  start_date: string
  end_date: string
  color: string
  title: string
  customer: string
  status: 'open' | 'done'
}
type ProjectOpt = { id: string; title: string; customer: string }

/* ===================== Tunables ===================== */
const MS_PER_DAY = 86400000
const today = new Date(new Date().toDateString())

// Höhe & Layout
const ROW_H_MOBILE  = 96      // höher für Mobile
const ROW_H_DESKTOP = 64
const BAR_VERTICAL_PADDING = 12

// Breiten-Schwellen (%)
const LABEL_USE_THRESHOLD_PCT     = 3
const NANO_THRESHOLD_PCT          = 6
const MICRO_THRESHOLD_PCT         = 10
const SMALL_THRESHOLD_PCT         = 14
const DATE_SHOW_THRESHOLD_PCT_DESKTOP = 12 // Desktop: Datum ab 12%
const DATE_SHOW_THRESHOLD_PCT_MOBILE  = 8  // Mobile: Datum ab 8%

// Balken-Minbreite (px), damit immer klickbar
const MIN_WIDTH_PX = 12

/* ===================== Utils ===================== */
function firstOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function clampDateToRange(d: Date, min: Date, max: Date) { return new Date(Math.min(Math.max(d.getTime(), min.getTime()), max.getTime())) }
function formatDE(d: Date) { return d.toLocaleDateString('de-DE') }
function addMonths(date: Date, n: number) { const d = new Date(date); d.setMonth(d.getMonth() + n, 1); return d }
function hexToRgb(hex: string) { let h = hex.replace('#',''); if (h.length===3) h=h.split('').map(c=>c+c).join(''); const num=parseInt(h,16); return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 } }
function luminance({r,g,b}:{r:number,g:number,b:number}) {
  const s = [r,g,b].map(v=>{ const x=v/255; return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4) })
  return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]
}
function isLight(hex:string){ try{ return luminance(hexToRgb(hex))>0.55 }catch{ return false } }

/** Mobile-Breakpoint */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width:${breakpoint - 1}px)`)
    const on = () => setIsMobile(mql.matches)
    on(); mql.addEventListener?.('change', on)
    return () => mql.removeEventListener?.('change', on)
  }, [breakpoint])
  return isMobile
}

/* ===================== Header ===================== */
type ViewTypeDesktop = 'month' | 'year'
type ViewTypeMobile = 'month' | 'quarter' | 'half'
type HeaderBarProps = {
  isMobile: boolean
  viewDesktop: ViewTypeDesktop
  setViewDesktop: (v: ViewTypeDesktop) => void
  viewMobile: ViewTypeMobile
  setViewMobile: (v: ViewTypeMobile) => void
  cursorMonth: Date
  setCursorMonth: (d: Date) => void
  cursorYear: number
  setCursorYear: (fn: (y: number) => number) => void
  globalQ: string
  setGlobalQ: (s: string) => void
  onAdd: () => void
}

const HeaderBar = React.memo(function HeaderBar({
  isMobile, viewDesktop, setViewDesktop, viewMobile, setViewMobile,
  cursorMonth, setCursorMonth, cursorYear, setCursorYear, globalQ, setGlobalQ, onAdd,
}: HeaderBarProps) {
  const view = isMobile ? viewMobile : viewDesktop
  const step = isMobile && view==='quarter' ? 3 : isMobile && view==='half' ? 6 : 1
  const isMonthLike = view==='month' || (isMobile && (view==='quarter'||view==='half'))

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 backdrop-blur md:flex-row md:items-center md:justify-between" style={{ boxShadow: '0 10px 40px rgba(2,6,23,0.08)' }}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900">Projektplaner</h1>
        <p className="text-sm text-slate-600">Monats- & Jahresübersicht.</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
        {/* View Switch */}
        <div className="inline-flex overflow-hidden rounded-lg border border-white/60 bg-white/90 shadow-sm backdrop-blur">
          {isMobile ? (
            <>
              <button className={`px-3 py-2 text-sm ${view==='month'?'bg-slate-900 text-white':'text-slate-800 hover:bg-white'}`} onClick={()=>setViewMobile('month')}><CalendarDaysIcon className="h-5 w-5 inline mr-1"/>Monat</button>
              <button className={`px-3 py-2 text-sm ${view==='quarter'?'bg-slate-900 text-white':'text-slate-800 hover:bg-white'}`} onClick={()=>setViewMobile('quarter')}><CalendarIcon className="h-5 w-5 inline mr-1"/>Quartal</button>
              <button className={`px-3 py-2 text-sm ${view==='half'?'bg-slate-900 text-white':'text-slate-800 hover:bg-white'}`} onClick={()=>setViewMobile('half')}>½ Jahr</button>
            </>
          ) : (
            <>
              <button className={`px-3 py-2 text-sm ${view==='month'?'bg-slate-900 text-white':'text-slate-800 hover:bg-white'}`} onClick={()=>setViewDesktop('month')}><CalendarDaysIcon className="h-5 w-5 inline mr-1"/>Monat</button>
              <button className={`px-3 py-2 text-sm ${view==='year'?'bg-slate-900 text-white':'text-slate-800 hover:bg-white'}`} onClick={()=>setViewDesktop('year')}><CalendarIcon className="h-5 w-5 inline mr-1"/>Jahr</button>
            </>
          )}
        </div>

        {/* Navigator */}
        {isMonthLike ? (
          <div className="flex items-center gap-1">
            <button className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-sm shadow hover:bg-white backdrop-blur" onClick={()=> setCursorMonth(addMonths(cursorMonth, -step))}>←</button>
            <div className="min-w-[16ch] px-2 text-center text-sm text-slate-700 tabular-nums">
              {view==='month'
                ? cursorMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'})
                : view==='quarter'
                  ? `Q${Math.floor(cursorMonth.getMonth()/3)+1} ${cursorMonth.getFullYear()}`
                  : `${cursorMonth.getMonth()<6?'H1':'H2'} ${cursorMonth.getFullYear()}`
              }
            </div>
            <button className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-sm shadow hover:bg-white backdrop-blur" onClick={()=> setCursorMonth(addMonths(cursorMonth, step))}>→</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-sm shadow hover:bg-white backdrop-blur" onClick={()=> setCursorYear(y=>y-1)}>←</button>
            <div className="min-w-[6ch] px-2 text-center text-sm text-slate-700 tabular-nums">{cursorYear}</div>
            <button className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-sm shadow hover:bg-white backdrop-blur" onClick={()=> setCursorYear(y=>y+1)}>→</button>
          </div>
        )}

        {/* Globale Suche (mit Blur) */}
        <label className="flex w-full items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-[16px] shadow-sm backdrop-blur sm:w-auto">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
          <input
            value={globalQ}
            onChange={(e)=>setGlobalQ(e.target.value)}
            placeholder="Globale Suche (Titel/Kunde)…"
            className="w-full bg-transparent outline-none placeholder-slate-400"
            inputMode="search" autoComplete="off" enterKeyHint="search"
          />
        </label>

        <button onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
          <PlusIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Plan hinzufügen</span><span className="sm:hidden">Neu</span>
        </button>
      </div>
    </div>
  )
})

/* ===================== Hauptkomponente ===================== */
export default function PlannerClient() {
  const supa = supabaseClient()
  const isMobile = useIsMobile(640)

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [projects, setProjects] = useState<ProjectOpt[]>([])

  // Views
  const [viewDesktop, setViewDesktop] = useState<ViewTypeDesktop>('month')
  const [viewMobile, setViewMobile] = useState<ViewTypeMobile>('month')
  const [cursorMonth, setCursorMonth] = useState<Date>(firstOfMonth())
  const [cursorYear, setCursorYear] = useState<number>(new Date().getFullYear())

  // Modal
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const isEdit = !!editId
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [status, setStatus] = useState<'open' | 'done'>('open')

  // Suche im Modal
  const [filterQ, setFilterQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Global
  const [globalQ, setGlobalQ] = useState('')

  /* ===== Daten laden ===== */
  async function fetchData() {
    setLoading(true)
    try {
      const { data: proj } = await supa
        .from('projects')
        .select('id, title, customers(id, first_name, last_name)')
        .order('created_at', { ascending: false })

      const projOpts: ProjectOpt[] = (proj ?? []).map((p: any) => ({
        id: p.id, title: p.title ?? '—',
        customer: `${(p.customers?.first_name ?? '')} ${(p.customers?.last_name ?? '')}`.trim() || '—',
      }))

      const res = await fetch('/api/project-plans', { credentials: 'include' })
      let rows: any = []
      try { rows = await res.json() } catch { rows = [] }

      setProjects(projOpts)
      setPlans(Array.isArray(rows) ? rows : [])
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const matches = (title: string, customer: string, q: string) => {
    const qq = q.trim().toLowerCase()
    if (!qq) return true
    return (title||'').toLowerCase().includes(qq) || (customer||'').toLowerCase().includes(qq)
  }

  /* ===== Cursor ranges ===== */
  const monthMeta = useMemo(() => {
    const y = cursorMonth.getFullYear(), m = cursorMonth.getMonth()
    const dim = daysInMonth(y, m)
    const days = Array.from({ length: dim }, (_, i) => new Date(y, m, i + 1))
    return { y, m, dim, days }
  }, [cursorMonth])

  const yearMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(cursorYear, i, 1)), [cursorYear])

  /* ---------- Lane-Packing ---------- */
  function withLayout(pls: PlanRow[], start: Date, end: Date, totalDays: number) {
    const visible = pls
      .map((p) => {
        const s = clampDateToRange(new Date(p.start_date), start, end)
        const e = clampDateToRange(new Date(p.end_date), start, end)
        const overdue = new Date(p.end_date) < today && p.status !== 'done'
        const isMatch = matches(p.title, p.customer, globalQ)
        return { ...p, s, e, overdue, isMatch }
      })
      .filter((p) => p.isMatch && new Date(p.end_date) >= start && new Date(p.start_date) <= end)
      .sort((a,b)=> +a.s - +b.s || a.title.localeCompare(b.title,'de'))

    const lanesEnd: number[] = []
    const laid: any[] = []

    for (const p of visible) {
      const startMs = p.s.getTime()
      let lane = lanesEnd.findIndex((endMs) => endMs < startMs)
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0) }
      lanesEnd[lane] = p.e.getTime()

      const leftPct = ((p.s.getTime() - start.getTime()) / MS_PER_DAY) / totalDays * 100
      const widthPct = (((p.e.getTime() - p.s.getTime()) / MS_PER_DAY) + 1) / totalDays * 100
      laid.push({ ...p, leftPct, widthPct, row: lane })
    }
    return { laid, rowsCount: Math.max(1, lanesEnd.length) }
  }

  const layoutMonth = useMemo(() => {
    const s = new Date(monthMeta.y, monthMeta.m, 1), e = new Date(monthMeta.y, monthMeta.m, monthMeta.dim)
    return withLayout(plans, s, e, (e.getTime()-s.getTime())/MS_PER_DAY + 1)
  }, [plans, monthMeta, globalQ])

  const layoutQuarter = useMemo(() => {
    const m = cursorMonth.getMonth(), q = Math.floor(m/3)*3
    const s = new Date(cursorMonth.getFullYear(), q, 1), e = new Date(cursorMonth.getFullYear(), q+3, 0)
    return withLayout(plans, s, e, (e.getTime()-s.getTime())/MS_PER_DAY + 1)
  }, [plans, cursorMonth, globalQ])

  const layoutHalf = useMemo(() => {
    const h = cursorMonth.getMonth()<6 ? 0 : 6
    const s = new Date(cursorMonth.getFullYear(), h, 1), e = new Date(cursorMonth.getFullYear(), h+6, 0)
    return withLayout(plans, s, e, (e.getTime()-s.getTime())/MS_PER_DAY + 1)
  }, [plans, cursorMonth, globalQ])

  const layoutYear = useMemo(() => {
    const s = new Date(cursorYear, 0, 1), e = new Date(cursorYear, 11, 31)
    return withLayout(plans, s, e, (e.getTime()-s.getTime())/MS_PER_DAY + 1)
  }, [plans, cursorYear, globalQ])

  /* ---------- Floating-Label ---------- */
  const SmallLabel: React.FC<{p: any, containerTop: number, isMobile: boolean}> = ({ p, containerTop, isMobile }) => {
    return createPortal(
      <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full select-none"
           style={{ left: `calc(${p.leftPct + Math.max(1, p.widthPct)/2}% + 3px)`, top: containerTop }}>
        <div className="rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 shadow">
          {/* MOBILE: Titel / Name / Datum */}
          {isMobile ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-slate-900 truncate max-w-[70vw] text-[12px]">{p.title}</div>
                {p.status==='done' ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white border border-white" title="Abgeschlossen">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                ) : p.overdue ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[10px] font-bold text-amber-900" title="Überfällig">!</span>
                ) : null}
              </div>
              <div className="truncate text-slate-700 text-[11px]">{p.customer}</div>
              <div className="text-slate-600 text-[10px]">{formatDE(p.s)} – {formatDE(p.e)}</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-slate-900 truncate max-w-[52vw] md:max-w-[420px] text-[11px]">
                  {p.title} • {p.customer}
                </div>
                {p.status==='done' ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white border border-white" title="Abgeschlossen">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                ) : p.overdue ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[10px] font-bold text-amber-900" title="Überfällig">!</span>
                ) : null}
              </div>
              <div className="text-slate-600 text-[11px]">{formatDE(p.s)} – {formatDE(p.e)}</div>
            </>
          )}
        </div>
      </div>,
      document.body
    )
  }

  /* ===== Modal open/close helpers ===== */
  function openEdit(p: PlanRow) {
    setEditId(p.id)
    setProjectId(p.project_id)
    setProjectLabel(`${p.title} — ${p.customer}`)
    setStartDate(p.start_date)
    setEndDate(p.end_date)
    setColor(p.color || '#3b82f6')
    setStatus(p.status ?? 'open')
    setFilterQ('')
    setOpenForm(true)
  }
  function closeModal() { setOpenForm(false); setEditId(null) }

  /* ===================== Balken ===================== */
  const BarRow = ({ p, rowHeight, labelTop, isMobile }: { p: any, rowHeight: number, labelTop: number, isMobile: boolean }) => {
    const BAR_H = Math.max(48, rowHeight - BAR_VERTICAL_PADDING)
    const w = Math.max(1, p.widthPct)

    let variant: 'tinyLabel'|'nano'|'micro'|'small'|'normal' = 'normal'
    if (w < LABEL_USE_THRESHOLD_PCT) variant = 'tinyLabel'
    else if (w < NANO_THRESHOLD_PCT) variant = 'nano'
    else if (w < MICRO_THRESHOLD_PCT) variant = 'micro'
    else if (w < SMALL_THRESHOLD_PCT) variant = 'small'
    else variant = 'normal'

    const lightBg = isLight(p.color)
    const textColor = lightBg ? '#0f172a' : '#ffffff'
    const subText = lightBg ? 'rgba(15,23,42,.75)' : 'rgba(255,255,255,.92)'

    // Desktop vs Mobile Typografie
    const showDate = w >= (isMobile ? DATE_SHOW_THRESHOLD_PCT_MOBILE : DATE_SHOW_THRESHOLD_PCT_DESKTOP)

    // Desktop-Fonts (kompakt)
    const titleFsDesk = variant==='normal' ? 13 : variant==='small' ? 12 : 11
    const dateFsDesk  = variant==='normal' ? 11 : variant==='small' ? 10.5 : 10
    // Mobile-Fonts (kleiner)
    const titleFsMob  = 12
    const nameFsMob   = 11
    const dateFsMob   = 10

    const useMobileStack = isMobile && w >= 9 // ab ~9% Platz: drei Zeilen im Balken

    const StatusIcon = () => (
      p.status==='done' ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white shadow" title="Abgeschlossen">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
      ) : p.overdue ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-[11px] font-bold text-amber-900" title="Überfällig">!</span>
      ) : null
    )

    const Affordance = () => (
      <span
        className="absolute right-1 top-1 inline-flex items-center justify-center rounded-full px-1.5 py-[2px] text-[11px] opacity-85"
        style={{ background: lightBg ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.22)', color: textColor, backdropFilter: 'blur(3px)' }}
        aria-hidden
      >⋯</span>
    )

    return (
      <>
        {variant === 'tinyLabel' && <SmallLabel p={p} containerTop={labelTop + p.row * rowHeight} isMobile={isMobile} />}

        <div className="absolute left-0 right-0 transition-all duration-300 ease-out" style={{ top: p.row * rowHeight }}>
          <button
            type="button"
            onClick={() => openEdit(p)}
            className="group relative cursor-pointer w-full text-left rounded-xl border border-transparent shadow-lg backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70"
            style={{
              position: 'absolute',
              left: `${p.leftPct}%`,
              width: `max(${w}%, ${MIN_WIDTH_PX}px)`,
              height: BAR_H,
              padding: useMobileStack ? '9px 12px' : (variant==='normal' ? '8px 12px' : variant==='small' ? '7px 10px' : '6px 8px'),
              background: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(0,0,0,0.08)), ${p.color}`,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.75), 0 10px 30px rgba(2,6,23,0.20), inset 0 1px 0 rgba(255,255,255,0.25)',
              color: textColor,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            title={`${p.title} • ${p.customer}\n${formatDE(p.s)} – ${formatDE(p.e)}`}
          >
            <Affordance />

            {/* Inhalt */}
            {useMobileStack ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold tracking-tight" style={{ fontSize: titleFsMob, lineHeight: `${titleFsMob+2}px`, textShadow: lightBg ? 'none' : '0 1px 1px rgba(0,0,0,.25)' }}>
                    {p.title}
                  </span>
                  <StatusIcon />
                </div>
                <div className="truncate" style={{ fontSize: nameFsMob, lineHeight: `${nameFsMob+2}px`, color: subText }}>{p.customer}</div>
                {showDate && (
                  <div className="mt-0.5" style={{ fontSize: dateFsMob, lineHeight: `${dateFsMob+1}px`, color: subText }}>
                    {formatDE(p.s)} – {formatDE(p.e)}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="truncate font-semibold tracking-tight"
                    style={{ fontSize: titleFsDesk, lineHeight: `${titleFsDesk+2}px`, textShadow: lightBg ? 'none' : '0 1px 1px rgba(0,0,0,.25)' }}
                  >
                    {p.title} • {p.customer}
                  </span>
                  <StatusIcon />
                  {(variant==='nano' || variant==='micro') && (
                    <span className="ml-1 block rounded-full" style={{ width: 6, height: 6, backgroundColor: textColor, boxShadow: '0 0 0 2px rgba(255,255,255,0.85)' }} />
                  )}
                </div>
                {showDate && (
                  <div className="mt-0.5" style={{ fontSize: dateFsDesk, lineHeight: `${dateFsDesk+1}px`, color: subText }}>
                    {formatDE(p.s)} – {formatDE(p.e)}
                  </div>
                )}
              </>
            )}

            {/* Soft Fade rechts */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-6"
              style={{ background: lightBg
                ? 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,.8))'
                : 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,.25))'
              }}
            />
          </button>
        </div>
      </>
    )
  }

  /* ===================== Grids ===================== */
  const GridFromLayout: React.FC<{
    layout: { laid: any[], rowsCount: number },
    columns: number | Date[],
    isMonthStyle?: boolean,
    rangeStart?: Date,
    rangeEnd?: Date,
  }> = ({ layout, columns, isMonthStyle, rangeStart, rangeEnd }) => {
    const rowHeight = isMobile ? ROW_H_MOBILE : ROW_H_DESKTOP
    const minH = isMobile ? 160 : 140
    const trackHeight = Math.max(minH, layout.rowsCount * rowHeight)
    const labelTop = 8

    const gridColsStyle = Array.isArray(columns)
      ? { gridTemplateColumns: `repeat(${columns.length}, minmax(${isMobile ? 42 : 28}px,1fr))` }
      : { gridTemplateColumns: `repeat(${columns as number}, minmax(${isMobile ? 42 : 28}px,1fr))` }

    // Heute-Linie
    let showTodayLine = false, todayLeft = 0
    if (rangeStart && rangeEnd) {
      showTodayLine = today >= rangeStart && today <= rangeEnd
      const totalDays = ((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY) + 1
      todayLeft = showTodayLine ? (((today.getTime() - rangeStart.getTime()) / MS_PER_DAY) / totalDays) * 100 : 0
    }

    return (
      <div className="relative rounded-2xl border border-white/60 bg-white/75 p-0 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur" style={{ overflow: 'visible' }}>
        {/* Kopf */}
        <div className="grid px-3 py-2" style={gridColsStyle}>
          {Array.isArray(columns)
            ? (columns as Date[]).map((d,i)=>(
                <div key={i} className="border-b border-white/60 py-1.5 text-center text-[12px] text-slate-700">
                  {isMonthStyle ? d.getDate() : d.toLocaleString('de-DE', { month: 'short' })}
                </div>
              ))
            : Array.from({ length: columns as number }).map((_, i) => (
                <div key={i} className="border-b border-white/60 py-1.5 text-center text-[12px] text-slate-700" />
              ))
          }
        </div>

        {/* Track */}
        <div className="relative mt-2 min-h-[120px] px-3 pb-3 overflow-x-auto no-scrollbar" style={{ overflowY: 'visible' }}>
          {/* Spalten */}
          <div className="absolute inset-x-3 inset-y-3 grid opacity-70" style={gridColsStyle}>
            {Array.isArray(columns)
              ? (columns as Date[]).map((d,i)=>(
                  <div key={i} className="relative border-r border-white/50 last:border-r-0">
                    {(!isMonthStyle && i%2===1) || (isMonthStyle && (d.getDay()===0||d.getDay()===6)) ? (
                      <div className="absolute inset-0 bg-slate-900/[0.03]" />
                    ) : null}
                  </div>
                ))
              : Array.from({ length: columns as number }).map((_, i) => (
                  <div key={i} className="relative border-r border-white/50 last:border-r-0" />
                ))
            }
          </div>

          {/* Heute-Linie */}
          {showTodayLine && (
            <div className="pointer-events-none absolute inset-y-3" style={{ left: `calc(${todayLeft}% + 3px)`, width: 0 }}>
              <div className="h-full w-[2px] bg-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,.55)]" />
            </div>
          )}

          {/* Lane-Hintergrund */}
          <div className="absolute inset-x-3" style={{
            top: '12px', bottom: '12px',
            backgroundImage: `repeating-linear-gradient(to bottom, rgba(2,6,23,0.08), rgba(2,6,23,0.08) 1px, transparent 1px, transparent ${rowHeight}px)`,
            pointerEvents: 'none',
          }} />

          {/* Balken */}
          <div className="relative" style={{ minHeight: trackHeight }}>
            {layout.laid.map((p) => (
              <BarRow key={p.id} p={p} rowHeight={rowHeight} labelTop={labelTop} isMobile={isMobile} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const GridMonth   = () => <GridFromLayout layout={layoutMonth}  columns={monthMeta.days} isMonthStyle rangeStart={new Date(monthMeta.y, monthMeta.m, 1)} rangeEnd={new Date(monthMeta.y, monthMeta.m, monthMeta.dim)} />
  const GridQuarter = () => { const m=cursorMonth.getMonth(), q=Math.floor(m/3)*3; const months=[0,1,2].map(i=>new Date(cursorMonth.getFullYear(), q+i, 1)); const s=new Date(cursorMonth.getFullYear(), q, 1), e=new Date(cursorMonth.getFullYear(), q+3, 0); return <GridFromLayout layout={layoutQuarter} columns={months} rangeStart={s} rangeEnd={e}/> }
  const GridHalf    = () => { const h=cursorMonth.getMonth()<6?0:6; const months=[0,1,2,3,4,5].map(i=>new Date(cursorMonth.getFullYear(), h+i, 1)); const s=new Date(cursorMonth.getFullYear(), h, 1), e=new Date(cursorMonth.getFullYear(), h+6, 0); return <GridFromLayout layout={layoutHalf} columns={months} rangeStart={s} rangeEnd={e}/> }
  const GridYear    = () => { const s=new Date(cursorYear,0,1), e=new Date(cursorYear,11,31); return <GridFromLayout layout={layoutYear} columns={yearMonths} rangeStart={s} rangeEnd={e}/> }

  /* ===== Modal-Logik (Suche + Create/Edit) ===== */
  const normalizedFilter = filterQ.trim().toLowerCase()
  const filteredProjects = useMemo(() => {
    if (normalizedFilter.length < 2) return []
    return projects
      .filter((p) =>
        p.title.toLowerCase().includes(normalizedFilter) ||
        p.customer.toLowerCase().includes(normalizedFilter)
      )
      .slice(0, 20)
  }, [projects, normalizedFilter])

  function selectProject(p: ProjectOpt) {
    if (isEdit) return setProjectId(p.id) // beim Bearbeiten nur ID tauschen
    setProjectId(p.id)
    setProjectLabel(`${p.title} — ${p.customer}`)
    setFilterQ('')
    setActiveIndex(0)
    searchInputRef.current?.blur()
  }

  function onKeyDownSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!filteredProjects.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const next = Math.max(0, Math.min(activeIndex + delta, filteredProjects.length - 1))
      setActiveIndex(next)
      const btns = resultsRef.current?.querySelectorAll<HTMLButtonElement>('button')
      btns?.[next]?.scrollIntoView({ block: 'nearest' })
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const p = filteredProjects[activeIndex]
      if (p) selectProject(p)
    }
  }

  async function submitCreate() {
    const res = await fetch('/api/project-plans', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, start_date: startDate, end_date: endDate, color, status }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
  }
  async function submitEdit() {
    const res = await fetch(`/api/project-plans/${editId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, color, status }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
  }
  async function onDelete() {
    if (!editId) return
    if (!confirm('Diesen Plan wirklich löschen?')) return
    const res = await fetch(`/api/project-plans/${editId}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { alert((await res.json()).error || 'Löschen fehlgeschlagen'); return }
    closeModal()
    await fetchData()
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate || (!projectId && !isEdit)) return
    try {
      if (isEdit) await submitEdit()
      else await submitCreate()
      closeModal()
      await fetchData()
    } catch (err: any) {
      alert(err?.message ?? 'Fehler')
    }
  }

  /* ===================== Render ===================== */
  const currentView = isMobile ? viewMobile : viewDesktop

  return (
    <div className="p-3 sm:p-6">
      <HeaderBar
        isMobile={isMobile}
        viewDesktop={viewDesktop} setViewDesktop={setViewDesktop}
        viewMobile={viewMobile} setViewMobile={setViewMobile}
        cursorMonth={cursorMonth} setCursorMonth={setCursorMonth}
        cursorYear={cursorYear} setCursorYear={setCursorYear}
        globalQ={globalQ} setGlobalQ={setGlobalQ}
        onAdd={()=>{
          setEditId(null); setProjectId(''); setProjectLabel('');
          setStartDate(''); setEndDate(''); setColor('#3b82f6'); setStatus('open');
          setFilterQ(''); setOpenForm(true);
        }}
      />

      {loading ? (
        <div className="rounded-2xl border border-white/60 bg-white/75 p-6 text-slate-600 backdrop-blur">Lädt …</div>
      ) : (
        <>
          {currentView==='month'   && <GridMonth/>}
          {currentView==='quarter' && <GridQuarter/>}
          {currentView==='half'    && <GridHalf/>}
          {currentView==='year'    && <GridYear/>}
          <p className="mt-3 text-xs text-slate-600">Klicke auf einen Balken zum Bearbeiten/Löschen/Abschließen. Rote Linie = heute.</p>
        </>
      )}

      {openForm && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur">
          <div className="w-full h-[92vh] sm:h-auto sm:max-w-xl overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(2,6,23,0.35)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
              <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Plan bearbeiten' : 'Plan hinzufügen'}</h3>
              <button className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50" onClick={closeModal}>
                <XMarkIcon className="h-5 w-5 text-slate-900" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 p-4">
              {/* Projekt-Auswahl */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Projekt</label>

                {/* Sichtbarer Toggle/Chip bei ausgewähltem Projekt */}
                {projectId && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{projectLabel}</span>
                    {!isEdit && (
                      <button type="button" className="ml-1 rounded p-1 hover:bg-slate-50" onClick={()=>{setProjectId(''); setProjectLabel('')}}>
                        <XMarkIcon className="h-4 w-4 text-slate-500" />
                      </button>
                    )}
                  </div>
                )}

                {/* Suche im Modal */}
                <div className={`relative ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm focus-within:border-slate-300 focus-within:ring-4 ring-indigo-200/60 backdrop-blur">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      value={filterQ}
                      onChange={(e)=>{ setFilterQ(e.target.value); setActiveIndex(0) }}
                      onKeyDown={onKeyDownSearch}
                      placeholder={isEdit ? 'Projekt ändern deaktiviert' : 'Suche nach Projekttitel oder Kunde …'}
                      className="w-full bg-transparent text-base sm:text-sm text-slate-900 outline-none placeholder-slate-400"
                      inputMode="search" autoComplete="off" enterKeyHint="search"
                    />
                  </div>

                  {/* Ergebnisse */}
                  {filterQ.trim().toLowerCase().length >= 2 && !isEdit && (
                    <div ref={resultsRef} className="mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                      {filteredProjects.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500">Keine Treffer.</div>
                      ) : (
                        filteredProjects.map((p, i) => {
                          const isActive = i === activeIndex
                          const selected = p.id === projectId
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={()=>selectProject(p)}
                              className={[
                                'flex w-full items-center justify-between px-3 py-3 text-left text-base sm:text-sm transition hover:bg-slate-50',
                                isActive ? 'ring-1 ring-slate-200 bg-slate-50' : '',
                              ].join(' ')}
                            >
                              <span className="truncate">
                                <span className="font-medium">{p.title}</span>
                                <span className="text-slate-500"> — {p.customer}</span>
                              </span>
                              {selected && (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white">
                                  <CheckIcon className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="block text-xs font-medium text-slate-600 mb-2">Status</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm cursor-pointer">
                    <input type="radio" name="status" value="open" checked={status === 'open'} onChange={() => setStatus('open')} />
                    <span className="text-sm text-slate-800">Offen</span>
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 shadow-sm cursor-pointer">
                    <input type="radio" name="status" value="done" checked={status === 'done'} onChange={() => setStatus('done')} />
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-emerald-800">Abgeschlossen</span>
                  </label>
                </div>
              </div>

              {/* Zeiten & Farbe */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
                  <input type="date" required value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 sm:py-2 text-base sm:text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Ende</label>
                  <input type="date" required value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 sm:py-2 text-base sm:text-sm outline-none focus:border-slate-300 focus:ring-4 ring-indigo-200/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Farbe</label>
                  <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="h-[48px] sm:h-[42px] w-full cursor-pointer rounded-lg border border-slate-200 bg-white" />
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
                <span className="text-xs text-slate-500">{isEdit ? 'Plan bearbeiten' : projectId ? 'Projekt gewählt' : 'Bitte ein Projekt auswählen'}</span>
                <div className="flex items-center gap-2">
                  {isEdit && (
                    <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-rose-600 shadow-sm hover:bg-rose-50">
                      <TrashIcon className="h-4 w-4" /> Löschen
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm hover:bg-slate-50">Abbrechen</button>
                  <button type="submit" disabled={!startDate || !endDate || (!projectId && !isEdit)} className={['rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm', (!startDate || !endDate || (!projectId && !isEdit)) ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:opacity-90' ].join(' ')}>Speichern</button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
