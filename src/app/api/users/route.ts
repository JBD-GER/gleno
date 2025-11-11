// src/app/api/users/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const LEGAL_IP_SALT = process.env.LEGAL_IP_SALT || 'change-me-super-random-salt'

// 🔹 SITE_URL immer auf https://www.gleno.de normalisieren
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'
const SITE_URL = (() => {
  try {
    const url = new URL(RAW_SITE_URL)

    // Wenn jemand "https://gleno.de" (ohne www) gesetzt hat → auf www drehen
    if (url.hostname === 'gleno.de') {
      url.hostname = 'www.gleno.de'
    }

    // Nur Origin zurückgeben (Schema + Host + Port)
    return url.origin
  } catch {
    return 'https://www.gleno.de'
  }
})()

// 👉 falls du weitere Buckets nutzt, hier ergänzen:
const KNOWN_BUCKETS = ['dokumente', 'logo'] as const

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)
const authClient  = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/* ----------------- Helpers ----------------- */

function norm(v?: unknown) {
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') return v as any
  const t = v.trim()
  return t.length ? t : null
}

function buildAddress(
  street?: string | null,
  house_number?: string | null,
  postal_code?: string | null,
  city?: string | null,
  country?: string | null
) {
  if (!street || !house_number || !postal_code || !city) return null
  const parts = [`${street} ${house_number}`, `${postal_code} ${city}`, country || undefined].filter(Boolean)
  return parts.join(', ')
}

function splitLooseAddress(address?: string | null) {
  if (!address) return { street: null, house_number: null, postal_code: null, city: null, country: null }
  const [line1, line2, line3] = address.split(',').map(s => s.trim())

  let street: string | null = null
  let house_number: string | null = null
  if (line1) {
    const m = line1.match(/^(.+?)\s+(\S+)$/)
    if (m) { street = m[1]; house_number = m[2] } else { street = line1 }
  }

  let postal_code: string | null = null
  let city: string | null = null
  if (line2) {
    const m = line2.match(/^(\d{4,6})\s+(.+)$/)
    if (m) { postal_code = m[1]; city = m[2] } else { city = line2 }
  }

  const country = line3 || null
  return { street, house_number, postal_code, city, country }
}

function firstIP(req: Request) {
  const xff = req.headers.get('x-forwarded-for') || ''
  const xr  = req.headers.get('x-real-ip') || ''
  return (xff.split(',')[0] || xr || '').trim()
}
function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

/** Parse Supabase Storage reference from:
 * - full public URL: .../storage/v1/object/public/<bucket>/<key>
 * - "bucket/key"
 * - "key"  (falls nur key in DB liegt → defaultBucket verwenden)
 */
function parseStorageRef(raw?: string | null, defaultBucket?: string): { bucket: string, key: string } | null {
  if (!raw) return null
  const s = raw.trim().replace(/^\/+/, '')
  if (!s) return null

  // Voll-URL?
  try {
    const u = new URL(s, s.startsWith('http') ? undefined : 'http://x')
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (m) {
      return { bucket: m[1], key: m[2] }
    }
  } catch {/* ignore */}

  // "bucket/key"?
  const firstSlash = s.indexOf('/')
  if (firstSlash > 0) {
    const maybeBucket = s.slice(0, firstSlash)
    const key = s.slice(firstSlash + 1)
    // Nur wenn der erste Teil wie ein Bucket aussieht (keine Datei-Endung)
    if (!maybeBucket.includes('.') && key) {
      return { bucket: maybeBucket, key }
    }
  }

  // nur "key" → auf defaultBucket buchen
  if (defaultBucket) return { bucket: defaultBucket, key: s }
  // fallback: wenn key mit bekanntem Bucket startet, extrahieren
  for (const b of KNOWN_BUCKETS) {
    if (s.startsWith(`${b}/`)) return { bucket: b, key: s.slice(b.length + 1) }
  }
  return null
}

// uniq + chunk helpers
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr))
const chunk = <T,>(arr: T[], size = 100) => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/* ----------------- GET: aktuelles Profil ----------------- */
export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select(`
      id, email, role,
      first_name, last_name, company_name,
      street, house_number, postal_code, city, country,
      address, vat_number, payment_method, website, logo_path,
      terms_accepted, privacy_accepted,
      terms_version, privacy_version, legal_acceptance_at
    `)
    .eq('id', user.id)
    .single()

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  let logo_url: string | null = null
  if (profile?.logo_path) {
    const { data: urlData } = await adminClient.storage.from('logo').createSignedUrl(profile.logo_path, 3600)
    logo_url = urlData?.signedUrl ?? null
  }

  return NextResponse.json({ profile, logo_url })
}

/* ----------------- POST: Registrierung ----------------- */
export async function POST(req: Request) {
  const body = await req.json()

  const email        = norm(body.email)
  const password     = norm(body.password)
  const first_name   = norm(body.first_name)
  const last_name    = norm(body.last_name)
  const company_name = norm(body.company_name)
  const vat_number   = norm(body.vat_number)
  const website      = norm(body.website)
  const payment_method = norm(body.payment_method) || 'invoice'

  const accept_terms    = Boolean(body.accept_terms)
  const accept_privacy  = Boolean(body.accept_privacy)
  const terms_version   = norm(body.terms_version)   || '1'
  const privacy_version = norm(body.privacy_version) || '1'

  let street       = norm(body.street)
  let house_number = norm(body.house_number)
  let postal_code  = norm(body.postal_code)
  let city         = norm(body.city)
  let country      = norm(body.country)

  if (!street && !house_number && !postal_code && !city && norm(body.address)) {
    const sp = splitLooseAddress(norm(body.address))
    street       = norm(sp.street)
    house_number = norm(sp.house_number)
    postal_code  = norm(sp.postal_code)
    city         = norm(sp.city)
    country      = norm(sp.country)
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'E-Mail & Passwort sind erforderlich.' }, { status: 400 })
  }
  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'Vorname & Nachname sind erforderlich.' }, { status: 400 })
  }
  if (!street || !house_number || !postal_code || !city || !country) {
    return NextResponse.json({ error: 'Adresse unvollständig (Straße, Nr., PLZ, Ort, Land).' }, { status: 400 })
  }
  if (!accept_terms || !accept_privacy) {
    return NextResponse.json({ error: 'Bitte AGB und Datenschutz akzeptieren.' }, { status: 400 })
  }

  const { data: sign, error: signErr } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/login`,
      data: {
        first_name, last_name, company_name,
        street, house_number, postal_code, city, country,
        vat_number, website, payment_method,
        terms_accepted: true,
        privacy_accepted: true,
        terms_version, privacy_version,
      },
    },
  })

  if (signErr) {
    return NextResponse.json({ error: signErr.message }, { status: 400 })
  }

  const userId = sign.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Registrierung unvollständig. Bitte erneut versuchen.' }, { status: 500 })
  }

  // (Rollenlogik ggf. erweitern – hier schlicht admin)
  const { error: cntErr } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
  if (cntErr) {
    return NextResponse.json({ error: cntErr.message }, { status: 500 })
  }
  const role = 'admin'

  const address = buildAddress(street, house_number, postal_code, city, country)
  const ua      = req.headers.get('user-agent')?.slice(0, 1024) || null
  const ip      = firstIP(req)
  const ip_hash = ip ? sha256Hex(`${LEGAL_IP_SALT}|${ip}`) : null
  const trialMs = (parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '7', 10)) * 24 * 60 * 60 * 1000
  const trialEndsAt = new Date(Date.now() + trialMs).toISOString()

  const { error: upErr } = await adminClient
    .from('profiles')
    .upsert({
      id:           userId,
      email,
      role,
      first_name,
      last_name,
      company_name,
      street,
      house_number,
      postal_code,
      city,
      country,
      address,
      vat_number,
      payment_method,
      website,
      logo_path: null,
      terms_accepted:      true,
      privacy_accepted:    true,
      terms_version,
      privacy_version,
      legal_acceptance_at: new Date().toISOString(),
      legal_ip_hash:       ip_hash,
      legal_user_agent:    ua,
      trial_ends_at:       trialEndsAt,
      subscription_status: 'trialing',
      plan: 'starter',
      current_period_end: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    }, { onConflict: 'id' })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json(
    { role, next: `${SITE_URL}/login?check-email=1` },
    { status: 201 }
  )
}

/* ----------------- PUT: Profil aktualisieren ----------------- */
export async function PUT(req: Request) {
  const {
    id,
    first_name, last_name, company_name,
    street, house_number, postal_code, city, country,
    vat_number, payment_method, website,
  } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'ID ist erforderlich.' }, { status: 400 })
  }

  const sStreet      = norm(street)
  const sHouseNumber = norm(house_number)
  const sPostal      = norm(postal_code)
  const sCity        = norm(city)
  const sCountry     = norm(country)
  const address      = buildAddress(sStreet, sHouseNumber, sPostal, sCity, sCountry)

  const updates: Record<string, any> = {
    first_name:   norm(first_name),
    last_name:    norm(last_name),
    company_name: norm(company_name),
    street:       sStreet,
    house_number: sHouseNumber,
    postal_code:  sPostal,
    city:         sCity,
    country:      sCountry,
    address,
    vat_number:   norm(vat_number),
    payment_method: norm(payment_method),
    website:      norm(website),
  }

  const { error: updErr } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

/* ----------------- DELETE: Account (inkl. Mitarbeiter + Inhalte + Storage + Auth) ----------------- */
export async function DELETE(req: Request) {
  const startedAt = new Date().toISOString()
  const ops = {
    startedAt,
    logs: [] as string[],
    steps: [] as { name: string; ok: boolean; detail?: any; error?: string }[],
  }
  const log = (msg: string, detail?: any) => {
    const line = detail ? `${msg} :: ${JSON.stringify(detail)}` : msg
    ops.logs.push(line)
    console.log('[DELETE users]', line)
  }
  const debugMode = new URL(req.url).searchParams.get('debug') === '1'

  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }
  const uid = user.id
  log('Start Löschung', { uid })

  /* ---------- Helper zum Step-abschluss ---------- */
  const done = (name: string, ok: boolean, detail?: any, error?: any) => {
    const eMsg = error?.message || (typeof error === 'string' ? error : undefined)
    ops.steps.push({ name, ok, detail, error: eMsg })
    if (ok) log(`✓ ${name}`, detail)
    else log(`✗ ${name} FEHLER`, { error: eMsg, detail })
  }

  /* ---------- A) Mitarbeiter + Verknüpfungen ---------- */
  // Tabellen, die (vermutlich) auf employees.employee_id verweisen → Reihenfolge wichtig!
  const employeeRefTables = [
    { table: 'tools',                  col: 'assigned_employee_id', action: 'update-null' as const },
    { table: 'project_assignees',      col: 'employee_id',          action: 'delete'     as const },
    { table: 'project_employees',      col: 'employee_id',          action: 'delete'     as const },
    { table: 'project_members',        col: 'employee_id',          action: 'delete'     as const },
    { table: 'appointment_employees',  col: 'employee_id',          action: 'delete'     as const },
    { table: 'time_entries',           col: 'employee_id',          action: 'delete'     as const },
    { table: 'absences',               col: 'employee_id',          action: 'delete'     as const },
  ]

  let employeeIds: string[] = []
  let employeeAuthIds: string[] = []

  try {
    const { data: employees, error: empErr } = await adminClient
      .from('employees')
      .select('id, auth_user_id')
      .eq('user_id', uid)

    if (empErr) throw empErr

    employeeIds     = (employees ?? []).map(e => e.id)
    employeeAuthIds = (employees ?? []).map(e => e.auth_user_id).filter((x): x is string => !!x)

    log('Gefundene Mitarbeiter', { count: employeeIds.length })

    // 1) Referenzen bereinigen
    for (const ref of employeeRefTables) {
      try {
        if (!employeeIds.length) break
        if (ref.action === 'update-null') {
          const { error } = await adminClient.from(ref.table)
            .update({ [ref.col]: null })
            .in(ref.col, employeeIds)
          if (error) throw error
        } else {
          const { error } = await adminClient.from(ref.table)
            .delete()
            .in(ref.col, employeeIds)
          if (error) throw error
        }
        done(`RefCleanup ${ref.table}.${ref.col}`, true, { affectedOf: employeeIds.length })
      } catch (e: any) {
        done(`RefCleanup ${ref.table}.${ref.col}`, false, null, e)
      }
    }

    // 2) Mitarbeiter selbst löschen
    if (employeeIds.length) {
      const { error } = await adminClient.from('employees').delete().in('id', employeeIds)
      if (error) throw error
    }
    done('Mitarbeiter gelöscht', true, { count: employeeIds.length })

    // 3) Auth-User der Mitarbeiter löschen (best effort)
    const authResults: { auth_user_id: string; ok: boolean; error?: string }[] = []
    for (const authId of employeeAuthIds) {
      try {
        const { error } = await adminClient.auth.admin.deleteUser(authId)
        if (error) throw error
        authResults.push({ auth_user_id: authId, ok: true })
      } catch (e: any) {
        authResults.push({ auth_user_id: authId, ok: false, error: e?.message })
      }
    }
    done('Auth-User der Mitarbeiter gelöscht', true, { results: authResults })
  } catch (e: any) {
    done('Mitarbeiter-Löschung', false, null, e)
  }

  /* ---------- B) Storage-Referenzen einsammeln ---------- */
  type Ref = { bucket: string, key: string }
  const refs: Ref[] = []
  const addRef = (raw?: string | null, defBucket?: string) => {
    const p = parseStorageRef(raw, defBucket)
    if (p?.bucket && p.key) refs.push({ bucket: p.bucket, key: p.key.replace(/^\/+/, '') })
  }
  const collectColEqUser = async (table: string, col: string, defaultBucket: string) => {
    const { data, error } = await adminClient.from(table).select(col).eq('user_id', uid)
    if (error) {
      done(`Collect ${table}.${col}`, false, null, error)
      return
    }
    for (const r of data ?? []) addRef((r as any)[col], defaultBucket)
    done(`Collect ${table}.${col}`, true, { count: (data ?? []).length })
  }

  // Profile-Logo
  try {
    const { data, error } = await adminClient.from('profiles').select('logo_path').eq('id', uid).single()
    if (!error && data?.logo_path) addRef(data.logo_path, 'logo')
    done('Collect profiles.logo_path', true, { has: !!data?.logo_path })
  } catch (e: any) {
    done('Collect profiles.logo_path', false, null, e)
  }

  await collectColEqUser('offers',              'pdf_path', 'dokumente')
  await collectColEqUser('order_confirmations', 'pdf_path', 'dokumente')
  await collectColEqUser('invoices',            'pdf_path', 'dokumente')
  await collectColEqUser('absences',            'document_path', 'dokumente')

  // Termine/Projekte → abhängige Sammlungen
  let appointmentIds: string[] = []
  let projectIds: string[] = []

  try {
    const [appointmentsRes, projectsRes] = await Promise.all([
      adminClient.from('appointments').select('id').eq('user_id', uid),
      adminClient.from('projects').select('id').eq('user_id', uid),
    ])
    appointmentIds = (appointmentsRes.data ?? []).map(r => r.id)
    projectIds     = (projectsRes.data ?? []).map(r => r.id)
    done('Collect appointments/projects IDs', true, { appointments: appointmentIds.length, projects: projectIds.length })
  } catch (e: any) {
    done('Collect appointments/projects IDs', false, null, e)
  }

  const collectIn = async (table: string, col: string, ids: string[], defaultBucket: string, idCol = 'project_id') => {
    if (!ids.length) { done(`Collect ${table}.${col}`, true, { count: 0 }); return }
    const { data, error } = await adminClient.from(table).select(col).in(idCol, ids)
    if (error) { done(`Collect ${table}.${col}`, false, null, error); return }
    for (const r of data ?? []) addRef((r as any)[col], defaultBucket)
    done(`Collect ${table}.${col}`, true, { count: (data ?? []).length })
  }

  await collectIn('appointment_documents', 'path', appointmentIds, 'dokumente', 'appointment_id')
  await collectIn('project_documents',     'path', projectIds,     'dokumente', 'project_id')
  await collectIn('project_before_images', 'path', projectIds,     'dokumente', 'project_id')
  await collectIn('project_after_images',  'path', projectIds,     'dokumente', 'project_id')

  /* ---------- C) Storage löschen: direkte Keys + rekursive Sweeps ---------- */
  try {
    // 1) direkte Keys
    const byBucket: Record<string, string[]> = {}
    for (const r of refs) {
      if (!byBucket[r.bucket]) byBucket[r.bucket] = []
      byBucket[r.bucket].push(r.key)
    }
    for (const [bucket, keys] of Object.entries(byBucket)) {
      const unique = Array.from(new Set(keys)).filter(Boolean)
      for (const batch of chunk(unique, 100)) {
        if (!batch.length) continue
        const { error } = await adminClient.storage.from(bucket).remove(batch)
        if (error) log('Storage.remove Fehler', { bucket, error: error.message, batch })
      }
      done(`Storage remove direkte Keys (${bucket})`, true, { removedTried: unique.length })
    }

    // 2) Safety-Sweeps per Präfix (benutzer- und objektbezogen)
    const prefixes = new Set<string>()
    prefixes.add(`${uid}/`)
    for (const pid of projectIds) prefixes.add(`projects/${pid}/`)
    for (const aid of appointmentIds) prefixes.add(`appointments/${aid}/`)

    // evtl. generische Top-Ordner aus den Refs ableiten (1–2 Ebenen)
    for (const { key } of refs) {
      const parts = key.split('/').filter(Boolean)
      if (parts.length >= 1) prefixes.add(parts[0] + '/')
      if (parts.length >= 2) prefixes.add(parts.slice(0, 2).join('/') + '/')
    }

    for (const bucket of KNOWN_BUCKETS) {
      for (const prefix of prefixes) {
        try {
          const res = await removeAllUnderPrefixWithLogs(bucket, prefix, log)
          done(`Sweep ${bucket}:${prefix}`, true, res)
        } catch (e: any) {
          done(`Sweep ${bucket}:${prefix}`, false, null, e)
        }
      }
    }
  } catch (e: any) {
    done('Storage-Löschung', false, null, e)
  }

  /* ---------- D) Inhalte löschen (by user_id) ---------- */
  // Alles, was sicher dem Nutzer gehört – Reihenfolge so, dass FK-Ketten fallen
  const tablesByUserId = [
    'appointment_documents',
    'appointments',
    'project_before_images',
    'project_after_images',
    'project_documents',
    'projects',
    'offers',
    'order_confirmations',
    'invoices',
    'customers',
    'materials',
    'tools',
    // ... hier bei Bedarf erweitern
  ]
  for (const t of tablesByUserId) {
    try {
      const { error } = await adminClient.from(t).delete().eq('user_id', uid)
      if (error) throw error
      done(`Delete ${t} by user_id`, true)
    } catch (e: any) {
      done(`Delete ${t} by user_id`, false, null, e)
    }
  }

  /* ---------- E) Profil löschen ---------- */
  try {
    const { error } = await adminClient.from('profiles').delete().eq('id', uid)
    if (error) throw error
    done('Profil gelöscht', true)
  } catch (e: any) {
    done('Profil gelöscht', false, null, e)
    // Falls Profile nicht fällt, blockiert es Auth-Löschung (lassen wir aber weiterlaufen, damit du es siehst)
  }

  /* ---------- F) Admin-Auth löschen ---------- */
  try {
    const { error } = await adminClient.auth.admin.deleteUser(uid)
    if (error) throw error
    done('Admin Auth gelöscht', true)
  } catch (e: any) {
    done('Admin Auth gelöscht', false, null, e)
    // Bei Auth-Fehler brechen wir mit 500 ab, weil der Account sonst "halb" existiert
    return NextResponse.json({ error: 'Auth-Löschung fehlgeschlagen', report: ops }, { status: 500 })
  }

  log('Löschung abgeschlossen', { uid })
  if (debugMode) {
    return NextResponse.json({ ok: true, report: ops }, { status: 200 })
  }
  return new NextResponse(null, { status: 204 })
}

/* ---------- Storage Helpers (robust & mit Logging) ---------- */

/** rekursiv alle Objekte unter prefix entfernen (best effort) + Log-Daten zurückgeben */
async function removeAllUnderPrefixWithLogs(bucket: string, prefix: string, logFn: (m: string, d?: any)=>void) {
  const removed: string[] = []
  const visited: string[] = []

  // Supabase hat keine echten Ordner. Wir simulieren rekursiv, indem wir "Ordnerpfade" aufsplitten.
  async function walk(path: string) {
    visited.push(path)
    const { data, error } = await adminClient.storage.from(bucket).list(path, { limit: 1000 })
    if (error) {
      logFn('list error', { bucket, path, error: error.message })
      return
    }
    for (const item of data ?? []) {
      const key = (path ? `${path}/` : '') + item.name
      // Annahme: Wenn size vorhanden/zahl → Datei; wenn size fehlt oder 0 & kein Punkt → eher "Ordner"
      const isFile = typeof (item as any).size === 'number' || item.name.includes('.')
      if (isFile) {
        const { error: remErr } = await adminClient.storage.from(bucket).remove([key])
        if (!remErr) removed.push(key)
        else logFn('remove error', { bucket, key, error: remErr.message })
      } else {
        await walk(key)
      }
    }
  }

  const clean = prefix.replace(/^\/+/, '').replace(/\/+$/, '')
  if (clean) await walk(clean)
  return { bucket, prefix: clean, visited, removedCount: removed.length }
}

/* ----------------- PATCH: eigenes Profil partiell aktualisieren (z. B. USt-IdNr.) ----------------- */
export async function PATCH(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  // Body lesen (best-effort)
  let body: any = {}
  try { body = await req.json() } catch { body = {} }

  // Erlaubte Felder whitelisten – aktuell nur USt-IdNr.
  const updates: Record<string, any> = {}
  if (Object.prototype.hasOwnProperty.call(body, 'vat_number')) {
    updates.vat_number = norm(body.vat_number)
  }

  // Optional: weitere Felder freischalten (bei Bedarf)
  // if (Object.prototype.hasOwnProperty.call(body, 'company_name')) {
  //   updates.company_name = norm(body.company_name)
  // }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine gültigen Felder im PATCH gefunden.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, vat_number, company_name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile: data }, { status: 200 })
}