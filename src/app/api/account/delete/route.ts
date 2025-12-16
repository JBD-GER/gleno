// src/app/api/account/delete/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

/* ---------- ENV / Clients ---------- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY!

const stripe = new Stripe(STRIPE_KEY)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

/* Bekannte Buckets erweitern (je nach Projekt anpassbar) */
const KNOWN_BUCKETS = ['dokumente', 'logo', 'angebote', 'website', 'markt'] as const

/* ---------- Helpers ---------- */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr))
const chunk = <T,>(arr: T[], size = 100) => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * CSRF/Same-Origin Schutz:
 * Blockt Cross-Site Requests, die Cookies mitsenden könnten.
 */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!origin) return // z.B. server-to-server / tools ohne origin

  const host = req.headers.get('host') || ''
  const originHost = new URL(origin).host

  // erlaube gleiche Hostnames
  if (originHost === host) return

  // zusätzlich erlaubte Hosts aus ENV (z.B. https://www.gleno.de)
  const allowed = new Set<string>()
  const addFromUrl = (u?: string) => {
    if (!u) return
    try {
      allowed.add(new URL(u).host)
    } catch {
      // ignore
    }
  }
  addFromUrl(process.env.NEXT_PUBLIC_SITE_URL)
  addFromUrl(process.env.NEXT_PUBLIC_APP_URL)

  if (allowed.has(originHost)) return

  throw new Error(`CSRF blocked: origin=${originHost} host=${host}`)
}

function parseStorageRef(
  raw?: string | null,
  defaultBucket?: string
): { bucket: string; key: string } | null {
  if (!raw) return null
  const s = raw.trim().replace(/^\/+/, '')
  if (!s) return null

  // Vollständige Supabase-URL
  try {
    const u = new URL(s, s.startsWith('http') ? undefined : 'http://x')
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (m) return { bucket: m[1], key: m[2] }
  } catch {
    // ignore
  }

  // bucket/key Syntax
  const firstSlash = s.indexOf('/')
  if (firstSlash > 0) {
    const maybeBucket = s.slice(0, firstSlash)
    const key = s.slice(firstSlash + 1)
    if (!maybeBucket.includes('.') && key) {
      return { bucket: maybeBucket, key }
    }
  }

  // Fallback: defaultBucket
  if (defaultBucket) return { bucket: defaultBucket, key: s }

  // Versuchen gegen bekannte Buckets zu matchen
  for (const b of KNOWN_BUCKETS) {
    if (s.startsWith(`${b}/`)) {
      return { bucket: b, key: s.slice(b.length + 1) }
    }
  }

  return null
}

/** rekursiv alle Objekte unter prefix entfernen (best effort) */
async function removeAllUnderPrefix(bucket: string, prefix: string) {
  const removed: string[] = []
  const visited: string[] = []

  async function walk(path: string) {
    visited.push(path)
    const { data, error } = await admin.storage.from(bucket).list(path, { limit: 1000 })
    if (error) return
    for (const item of data ?? []) {
      const key = (path ? `${path}/` : '') + item.name
      const isFile = typeof (item as any).size === 'number' || item.name.includes('.')
      if (isFile) {
        await admin.storage.from(bucket).remove([key])
        removed.push(key)
      } else {
        await walk(key)
      }
    }
  }

  const clean = prefix.replace(/^\/+/, '').replace(/\/+$/, '')
  if (clean) await walk(clean)
  return { bucket, prefix: clean, visited, removedCount: removed.length }
}

/* ✅ Helper für FK-Blocker Deletes (mit Report) */
async function safeDeleteByUser(
  table: string,
  col: string,
  uid: string,
  ctx: { deleted: any[]; errors: any[] }
) {
  const { error } = await admin.from(table).delete().eq(col, uid)
  if (error) {
    ctx.errors.push({
      table,
      col,
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    })
  } else {
    ctx.deleted.push({ table, col })
  }
}

function buildOr(parts: string[]) {
  return parts.filter(Boolean).join(',')
}

/* ---------- Core Handler ---------- */
async function handleDelete(req: NextRequest) {
  // ✅ CSRF Schutz
  try {
    assertSameOrigin(req)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Forbidden' }, { status: 403 })
  }

  /* -------- Auth / User -------- */
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = user.id

  /* ✅ Report (für Debug/Support) */
  const deletionReport: { deleted: any[]; errors: any[] } = { deleted: [], errors: [] }

  /* -------- Profil laden (Stripe, Logo etc.) -------- */
  let profile: any = null
  try {
    const { data, error } = await admin
      .from('profiles')
      .select('id, stripe_customer_id, stripe_subscription_id, logo_path')
      .eq('id', uid)
      .single()
    if (error) throw error
    profile = data
  } catch {
    // ok, best effort
  }

  /* -------- Mitarbeiter + verbundene Tabellen -------- */
  const employeeRefTables = [
    { table: 'tools', col: 'assigned_employee_id', action: 'update-null' as const },
    { table: 'project_assignees', col: 'employee_id', action: 'delete' as const },
    { table: 'project_employees', col: 'employee_id', action: 'delete' as const },
    { table: 'project_members', col: 'employee_id', action: 'delete' as const },
    { table: 'appointment_employees', col: 'employee_id', action: 'delete' as const },
    { table: 'time_entries', col: 'employee_id', action: 'delete' as const },
    { table: 'absences', col: 'employee_id', action: 'delete' as const },
    { table: 'project_schedule_items', col: 'employee_id', action: 'delete' as const },
  ]

  let employeeIds: string[] = []
  let employeeAuthIds: string[] = []

  try {
    const { data: employees } = await admin.from('employees').select('id, auth_user_id').eq('user_id', uid)

    employeeIds = (employees ?? []).map((e: any) => e.id)
    employeeAuthIds = (employees ?? [])
      .map((e: any) => e.auth_user_id)
      .filter((x: any): x is string => !!x)

    if (employeeIds.length) {
      for (const ref of employeeRefTables) {
        if (ref.action === 'update-null') {
          try {
            await admin.from(ref.table).update({ [ref.col]: null }).in(ref.col, employeeIds)
          } catch {}
        } else {
          try {
            await admin.from(ref.table).delete().in(ref.col, employeeIds)
          } catch {}
        }
      }

      // Mitarbeiter-spezifische Abhängigkeiten sind weg -> Mitarbeiter löschen
      try {
        await admin.from('employees').delete().in('id', employeeIds)
      } catch {}
    }

    // Zugehörige Auth-User der Mitarbeiter löschen (best effort)
    for (const eid of employeeAuthIds) {
      try {
        await admin.auth.admin.deleteUser(eid)
      } catch {}
    }
  } catch {
    // best effort
  }

  /* -------- IDs für Projekte, Termine etc. -------- */
  let appointmentIds: string[] = []
  let projectIds: string[] = []
  let projectRoomIds: string[] = []
  let materialIds: string[] = []

  try {
    const { data: appointments } = await admin.from('appointments').select('id').eq('user_id', uid)
    appointmentIds = (appointments ?? []).map((r: any) => r.id)
  } catch {}

  try {
    const { data: projects } = await admin.from('projects').select('id').eq('user_id', uid)
    projectIds = (projects ?? []).map((r: any) => r.id)

    if (projectIds.length) {
      const { data: rooms } = await admin.from('project_rooms').select('id').in('project_id', projectIds)
      projectRoomIds = (rooms ?? []).map((r: any) => r.id)
    }
  } catch {}

  try {
    const { data: materials } = await admin.from('materials').select('id').eq('user_id', uid)
    materialIds = (materials ?? []).map((m: any) => m.id)
  } catch {}

  /* -------- Markt / Partner IDs sammeln -------- */
  let partnerIds: string[] = []
  let marketRequestIds: string[] = []
  let marketConversationIds: string[] = []
  let marketApplicationIds: string[] = []
  let marketOfferIds: string[] = []
  let marketOrderIds: string[] = []
  let marketInquiryIds: string[] = []

  // Partner, die diesem Account gehören
  try {
    const { data: partners } = await admin.from('partners').select('id').eq('owner_user_id', uid)
    partnerIds = (partners ?? []).map((p: any) => p.id)
  } catch {}

  // Requests des Users (als Konsument)
  try {
    const { data: reqs } = await admin.from('market_requests').select('id').eq('user_id', uid)
    marketRequestIds = (reqs ?? []).map((r: any) => r.id)
  } catch {}

  // Inquiries des Users
  try {
    const { data: inquiries } = await admin.from('market_inquiries').select('id').eq('created_by', uid)
    marketInquiryIds = (inquiries ?? []).map((i: any) => i.id)
  } catch {}

  // ✅ Conversations serverseitig filtern (statt ganze Tabelle ziehen)
  try {
    const ors: string[] = [`consumer_user_id.eq.${uid}`]
    if (marketRequestIds.length) ors.push(`request_id.in.(${marketRequestIds.join(',')})`)
    if (partnerIds.length) ors.push(`partner_id.in.(${partnerIds.join(',')})`)

    const { data: convs } = await admin.from('market_conversations').select('id').or(buildOr(ors))
    marketConversationIds = (convs ?? []).map((c: any) => c.id)
  } catch {}

  // ✅ Applications serverseitig filtern
  try {
    const ors: string[] = []
    if (marketRequestIds.length) ors.push(`request_id.in.(${marketRequestIds.join(',')})`)
    if (partnerIds.length) ors.push(`partner_id.in.(${partnerIds.join(',')})`)

    if (ors.length) {
      const { data: apps } = await admin.from('market_applications').select('id').or(buildOr(ors))
      marketApplicationIds = (apps ?? []).map((a: any) => a.id)
    }
  } catch {}

  // Offers (ok: selektiert nur notwendige Spalten, aber trotzdem besser filtern)
  try {
    const ors: string[] = [`created_by_user_id.eq.${uid}`]
    if (marketRequestIds.length) ors.push(`request_id.in.(${marketRequestIds.join(',')})`)
    const { data: offers } = await admin.from('market_offers').select('id').or(buildOr(ors))
    marketOfferIds = (offers ?? []).map((o: any) => o.id)
  } catch {}

  // ✅ Orders serverseitig filtern (request_id / offer_id)
  try {
    const ors: string[] = []
    if (marketRequestIds.length) ors.push(`request_id.in.(${marketRequestIds.join(',')})`)
    if (marketOfferIds.length) ors.push(`offer_id.in.(${marketOfferIds.join(',')})`)
    if (ors.length) {
      const { data: orders } = await admin.from('market_orders').select('id').or(buildOr(ors))
      marketOrderIds = (orders ?? []).map((o: any) => o.id)
    }
  } catch {}

  /* -------- Storage-Refs sammeln -------- */
  type Ref = { bucket: string; key: string }
  const refs: Ref[] = []

  const addRef = (raw?: string | null, defBucket?: string) => {
    const p = parseStorageRef(raw, defBucket)
    if (p?.bucket && p.key) {
      refs.push({
        bucket: p.bucket,
        key: p.key.replace(/^\/+/, ''),
      })
    }
  }

  // Profil-Logo
  try {
    if (profile?.logo_path) addRef(profile.logo_path, 'logo')
  } catch {}

  // Websites (Logo / Favicon)
  try {
    const { data: websites } = await admin.from('websites').select('logo_url, favicon_url').eq('user_id', uid)
    for (const w of websites ?? []) {
      addRef((w as any).logo_url || undefined, 'website')
      addRef((w as any).favicon_url || undefined, 'website')
    }
  } catch {}

  // Partner-Logos
  try {
    if (partnerIds.length) {
      const { data: pData } = await admin.from('partners').select('logo_path').in('id', partnerIds)
      for (const p of pData ?? []) {
        if ((p as any).logo_path) addRef((p as any).logo_path, 'logo')
      }
    }
  } catch {}

  // Helper: Spalte mit user_id = uid einsammeln
  const collectColEqUser = async (table: string, col: string, defaultBucket: string) => {
    const { data } = await admin.from(table).select(col).eq('user_id', uid)
    for (const r of data ?? []) addRef((r as any)[col], defaultBucket)
  }

  // Helper: Spalte mit in(ids)
  const collectColIn = async (
    table: string,
    col: string,
    ids: string[],
    filterCol: string,
    defaultBucket: string
  ) => {
    if (!ids.length) return
    const { data } = await admin.from(table).select(col).in(filterCol, ids)
    for (const r of data ?? []) addRef((r as any)[col], defaultBucket)
  }

  // PDFs & Doks klassisch
  try {
    await collectColEqUser('offers', 'pdf_path', 'dokumente')
  } catch {}
  try {
    await collectColEqUser('order_confirmations', 'pdf_path', 'dokumente')
  } catch {}
  try {
    await collectColEqUser('invoices', 'pdf_path', 'dokumente')
  } catch {}
  try {
    await collectColEqUser('absences', 'document_path', 'dokumente')
  } catch {}

  // Termine / Projekte Doks
  try {
    await collectColIn('appointment_documents', 'path', appointmentIds, 'appointment_id', 'dokumente')
  } catch {}
  try {
    await collectColIn('project_documents', 'path', projectIds, 'project_id', 'dokumente')
  } catch {}
  try {
    await collectColIn('project_before_images', 'path', projectIds, 'project_id', 'dokumente')
  } catch {}
  try {
    await collectColIn('project_after_images', 'path', projectIds, 'project_id', 'dokumente')
  } catch {}

  // Markt Dateien
  try {
    await collectColIn('market_application_files', 'path', marketApplicationIds, 'application_id', 'markt')
  } catch {}
  try {
    await collectColIn('market_offer_files', 'path', marketOfferIds, 'offer_id', 'markt')
  } catch {}
  try {
    await collectColIn('market_order_files', 'path', marketOrderIds, 'order_id', 'markt')
  } catch {}
  try {
    await collectColIn('market_documents', 'path', marketConversationIds, 'conversation_id', 'markt')
  } catch {}
  try {
    await collectColIn('market_documents', 'path', marketRequestIds, 'request_id', 'markt')
  } catch {}
  try {
    if (marketConversationIds.length) {
      const { data: msgFiles } = await admin
        .from('market_messages')
        .select('file_path, conversation_id')
        .in('conversation_id', marketConversationIds)
      for (const m of msgFiles ?? []) {
        if ((m as any).file_path) addRef((m as any).file_path, 'markt')
      }
    }
  } catch {}

  /* -------- Storage löschen (direkte Keys + Prefix-Sweeps) -------- */
  try {
    const byBucket: Record<string, string[]> = {}
    for (const r of refs) {
      if (!byBucket[r.bucket]) byBucket[r.bucket] = []
      byBucket[r.bucket].push(r.key)
    }

    for (const [bucket, keys] of Object.entries(byBucket)) {
      const unique = uniq(keys).filter(Boolean)
      for (const batch of chunk(unique, 100)) {
        if (!batch.length) continue
        try {
          await admin.storage.from(bucket).remove(batch)
        } catch {}
      }
    }

    const sweepBuckets = uniq([
      ...(KNOWN_BUCKETS as unknown as string[]),
      ...Object.keys(byBucket),
    ])

    const prefixes = new Set<string>()
    prefixes.add(`${uid}/`)
    for (const pid of projectIds) prefixes.add(`projects/${pid}/`)
    for (const aid of appointmentIds) prefixes.add(`appointments/${aid}/`)

    for (const { key } of refs) {
      const parts = key.split('/').filter(Boolean)
      if (parts.length >= 1) prefixes.add(parts[0] + '/')
      if (parts.length >= 2) prefixes.add(parts.slice(0, 2).join('/') + '/')
    }

    for (const bucket of sweepBuckets) {
      for (const prefix of prefixes) {
        try {
          await removeAllUnderPrefix(bucket, prefix)
        } catch {}
      }
    }
  } catch {
    // best effort
  }

  /* -------- Detail-Löschungen: Termine / Projekte / Räume -------- */
  try {
    if (appointmentIds.length) {
      try {
        await admin.from('appointment_documents').delete().in('appointment_id', appointmentIds)
      } catch {}
      try {
        await admin.from('appointment_notes').delete().in('appointment_id', appointmentIds)
      } catch {}
      try {
        await admin.from('appointments').delete().in('id', appointmentIds)
      } catch {}
    }
  } catch {}

  try {
    if (projectRoomIds.length) {
      try {
        await admin.from('project_room_materials').delete().in('room_id', projectRoomIds)
      } catch {}
      try {
        await admin.from('project_room_tasks').delete().in('room_id', projectRoomIds)
      } catch {}
      try {
        await admin.from('project_rooms').delete().in('id', projectRoomIds)
      } catch {}
    }
  } catch {}

  try {
    if (projectIds.length) {
      const projectTables = [
        'project_before_images',
        'project_after_images',
        'project_documents',
        'project_offers',
        'project_assignees',
        'project_employees',
        'project_members',
        'project_plans',
        'project_schedule_items',
        'project_comments',
      ] as const

      for (const t of projectTables) {
        try {
          await admin.from(t).delete().in('project_id', projectIds)
        } catch {}
      }

      try {
        await admin.from('projects').delete().in('id', projectIds)
      } catch {}
    }
  } catch {}

  /* -------- Material-abhängige Tabellen -------- */
  try {
    if (materialIds.length) {
      try {
        await admin.from('project_room_materials').delete().in('material_id', materialIds)
      } catch {}
      try {
        await admin.from('materials').delete().in('id', materialIds)
      } catch {}
    }
  } catch {}

  /* -------- Markt: Tabellen in richtiger Reihenfolge -------- */
  try {
    // Files & Messages & Docs
    try {
      if (marketApplicationIds.length) {
        await admin.from('market_application_files').delete().in('application_id', marketApplicationIds)
      }
    } catch {}
    try {
      if (marketOfferIds.length) {
        await admin.from('market_offer_files').delete().in('offer_id', marketOfferIds)
      }
    } catch {}
    try {
      if (marketOrderIds.length) {
        await admin.from('market_order_files').delete().in('order_id', marketOrderIds)
      }
    } catch {}
    try {
      if (marketConversationIds.length) {
        await admin.from('market_messages').delete().in('conversation_id', marketConversationIds)
      }
    } catch {}
    try {
      if (marketConversationIds.length) {
        await admin.from('market_documents').delete().in('conversation_id', marketConversationIds)
      }
    } catch {}
    try {
      if (marketRequestIds.length) {
        await admin.from('market_documents').delete().in('request_id', marketRequestIds)
      }
    } catch {}

    // Ratings / Termine / Issues / Personal Data / Inquiry History
    try {
      const ors: string[] = [`consumer_user_id.eq.${uid}`, `created_by.eq.${uid}`]
      if (partnerIds.length) ors.push(`partner_id.in.(${partnerIds.join(',')})`)
      if (marketRequestIds.length) ors.push(`request_id.in.(${marketRequestIds.join(',')})`)
      await admin.from('market_partner_ratings').delete().or(buildOr(ors))
    } catch {}

    try {
      if (marketRequestIds.length) {
        await admin.from('market_appointments').delete().in('request_id', marketRequestIds)
      }
      await admin.from('market_appointments').delete().eq('created_by_user_id', uid)
    } catch {}

    try {
      if (marketRequestIds.length) {
        await admin.from('market_request_issues').delete().in('request_id', marketRequestIds)
      }
      await admin.from('market_request_issues').delete().eq('user_id', uid)
    } catch {}

    try {
      if (marketRequestIds.length) {
        await admin.from('market_request_personal_data').delete().in('request_id', marketRequestIds)
      }
      await admin.from('market_request_personal_data').delete().eq('user_id', uid)
    } catch {}

    try {
      if (marketInquiryIds.length) {
        await admin.from('market_inquiry_status_history').delete().in('inquiry_id', marketInquiryIds)
      }
      await admin.from('market_inquiry_status_history').delete().eq('changed_by', uid)
    } catch {}

    try {
      if (marketInquiryIds.length) {
        await admin.from('market_inquiries').delete().in('id', marketInquiryIds)
      }
      await admin.from('market_inquiries').delete().eq('created_by', uid)
    } catch {}

    // Applications / Offers / Orders / Conversations / Requests
    try {
      if (marketApplicationIds.length) {
        await admin.from('market_applications').delete().in('id', marketApplicationIds)
      }
      if (partnerIds.length) {
        await admin.from('market_applications').delete().in('partner_id', partnerIds)
      }
      if (marketRequestIds.length) {
        await admin.from('market_applications').delete().in('request_id', marketRequestIds)
      }
    } catch {}

    try {
      if (marketOfferIds.length) {
        await admin.from('market_offers').delete().in('id', marketOfferIds)
      }
      if (marketRequestIds.length) {
        await admin.from('market_offers').delete().in('request_id', marketRequestIds)
      }
      await admin.from('market_offers').delete().eq('created_by_user_id', uid)
    } catch {}

    try {
      if (marketOrderIds.length) {
        await admin.from('market_orders').delete().in('id', marketOrderIds)
      }
      if (marketRequestIds.length) {
        await admin.from('market_orders').delete().in('request_id', marketRequestIds)
      }
    } catch {}

    try {
      if (marketConversationIds.length) {
        await admin.from('market_conversations').delete().in('id', marketConversationIds)
      }
    } catch {}

    try {
      if (marketRequestIds.length) {
        await admin.from('market_requests').delete().in('id', marketRequestIds)
      }
      await admin.from('market_requests').delete().eq('user_id', uid)
    } catch {}

    // Partner Sub-Tabellen & Partner selbst
    if (partnerIds.length) {
      const partnerSubTables = [
        'partner_ai_findings',
        'partner_branch_map',
        'partner_category_map',
        'partner_links',
        'partner_services',
      ] as const

      for (const t of partnerSubTables) {
        try {
          await admin.from(t).delete().in('partner_id', partnerIds)
        } catch {}
      }

      try {
        await admin.from('partners').delete().in('id', partnerIds)
      } catch {}
    }
  } catch {
    // best effort
  }

  /* -------- Tabellen mit user_id = uid (generisch) -------- */
  const tablesByUserId = [
    'appointments',
    'projects',
    'offers',
    'order_confirmations',
    'invoices',
    'customers',
    'materials',
    'tools',
    'suppliers',
    'fleet',
    'billing_settings',
    'catalog_items',
    'offer_templates',
    'customer_notes',
    'customer_number_ranges',
    'project_plans',
    'project_schedule_items',
    'cookie_consents',
    'websites',
  ]

  for (const t of tablesByUserId) {
    try {
      await admin.from(t).delete().eq('user_id', uid)
    } catch {}
  }

  /* -------- Stripe Cleanup (best effort) -------- */
  try {
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id)
      } catch {}
    }
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id)
      } catch {}
    }
  } catch {}

  /* ✅ FK-Blocker explizit löschen (created_by / actor_user_id etc.) */
  try {
    await safeDeleteByUser('appointment_notes', 'created_by', uid, deletionReport)
  } catch {}
  try {
    await safeDeleteByUser('activity_log', 'actor_user_id', uid, deletionReport)
  } catch {}
  try {
    await safeDeleteByUser('project_todos', 'created_by', uid, deletionReport)
  } catch {}
  try {
    await safeDeleteByUser('project_rooms', 'user_id', uid, deletionReport)
  } catch {}
  try {
    await safeDeleteByUser('social_pages', 'user_id', uid, deletionReport)
  } catch {}
  try {
    await safeDeleteByUser('telephony_calls', 'created_by', uid, deletionReport)
  } catch {}

  /* -------- Profil löschen -------- */
  try {
    const { error } = await admin.from('profiles').delete().eq('id', uid)
    if (error) {
      deletionReport.errors.push({
        table: 'profiles',
        col: 'id',
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
      })
    } else {
      deletionReport.deleted.push({ table: 'profiles', col: 'id' })
    }
  } catch {}

  /* -------- Auth-User löschen -------- */
  try {
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) {
      return NextResponse.json(
        { error: 'Auth deletion failed', deletionReport, authError: error },
        { status: 500 }
      )
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Auth deletion failed', deletionReport, exception: String(e?.message ?? e) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, deletionReport })
}

/* --- POST/DELETE Handler --- */
export async function POST(req: NextRequest) {
  return handleDelete(req)
}
export async function DELETE(req: NextRequest) {
  return handleDelete(req)
}
