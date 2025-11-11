// src/app/api/rechnung/generate-from-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { Buffer } from 'buffer'

/* ======================= Types ======================= */
type Position = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description?: string
  quantity?: number
  unitPrice?: number
  unit?: string
}

type CustomerRow = {
  id: string
  first_name: string
  last_name: string
  company?: string | null
  email?: string | null
  street?: string | null
  house_number?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  customer_number?: string | null
}

type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'

/** Roh-Datentyp aus DB (value kann string oder number sein) */
type DbDiscount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number | string
}

/** Normalisiert für Berechnung/Anzeige (value garantiert number) */
type Discount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* ======================= Helpers ======================= */
function sanitize(text: string) {
  return (text ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
}

function toDisplay(dd: string | null): string {
  if (!dd) return ''
  const [y, m, d] = dd.split('-')
  return `${d}.${m}.${y}`
}

function addDaysYYYYMMDD(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m - 1), d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

/** Zahl robust parsen (unterstützt "12,5" und Zahlen). */
function parseNumber(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && isFinite(n)) return n
  if (typeof n === 'string') {
    const s = n.trim().replace(',', '.')
    const v = Number(s)
    return isNaN(v) ? fallback : v
  }
  return fallback
}

/** Wortumbruch nur berechnen */
function getWrappedLines(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = sanitize(text).split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(t, size) > maxWidth && line) {
      lines.push(line); line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}

/** vorbereitete Zeilen zeichnen */
function drawLines(
  page: PDFPage, lines: string[], x: number, y: number,
  lineHeight: number, font: PDFFont, size: number
): number {
  let cursorY = y
  for (const ln of lines) {
    page.drawText(ln, { x, y: cursorY, size, font })
    cursorY -= lineHeight
  }
  return lines.length ? (y - (lines.length - 1) * lineHeight) : y
}

function drawTableHeader(
  page: PDFPage, M: number, width: number, y0: number,
  gray: ReturnType<typeof rgb>, bold: PDFFont, priceX: number, totalX: number
) {
  page.drawText('Position', { x: M + 4,   y: y0 + 6, size: 10, font: bold })
  page.drawText('Anzahl',   { x: M + 260, y: y0 + 6, size: 10, font: bold })
  page.drawText('Einheit',  { x: M + 320, y: y0 + 6, size: 10, font: bold })
  page.drawText('Preis',    { x: priceX,  y: y0 + 6, size: 10, font: bold })
  const tl = 'Total'
  const tw = bold.widthOfTextAtSize(tl, 10)
  page.drawText(tl, { x: totalX - tw, y: y0 + 6, size: 10, font: bold })
  page.drawLine({ start: { x: M, y: y0 }, end: { x: width - M, y: y0 }, thickness: 0.5, color: gray })
}

const fmt = (v: number) => v.toFixed(2).replace('.', ',')

/* ======================= Route ======================= */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Nicht eingeloggt')

    const { orderConfirmationNumber } = await req.json() as { orderConfirmationNumber: string }
    if (!orderConfirmationNumber) throw new Error('orderConfirmationNumber fehlt')

    /* 1) AB + Kunde laden (inkl. optionalem discount, from_offer_number) */
    const { data: oc, error: ocErr } = await supabaseAdmin
      .from('order_confirmations')
      .select(`
        *,
        customers (
          id, first_name, last_name, company,
          email, street, house_number, address,
          postal_code, city, customer_number
        )
      `)
      .eq('user_id', user.id)
      .eq('order_confirmation_number', orderConfirmationNumber)
      .single()
    if (ocErr || !oc) throw new Error('Auftragsbestätigung nicht gefunden')

    const rawCustomer = (oc as any).customers
    const customer: CustomerRow | null = Array.isArray(rawCustomer)
      ? (rawCustomer[0] as CustomerRow | undefined) ?? null
      : (rawCustomer as CustomerRow | null)
    if (!customer) throw new Error('Kunde nicht gefunden')

    const positions = (oc.positions ?? []) as Position[]

    /* 1b) Rabatt normalisieren:
          - bevorzugt AB.discount wenn aktiv (>0)
          - sonst Rabatt aus Angebot übernehmen */
    const ocDiscount = (oc as any).discount as DbDiscount | null
    let sourceDiscount: DbDiscount | null = ocDiscount ?? null

    const isActiveRaw = (d: DbDiscount | null | undefined) => {
      if (!d) return false
      const val = parseNumber(d.value, 0)
      return !!d.enabled && val > 0
    }

    if (!isActiveRaw(sourceDiscount) && (oc as any).from_offer_number) {
      const { data: offer } = await supabaseAdmin
        .from('offers')
        .select('discount')
        .eq('user_id', user.id)
        .eq('offer_number', (oc as any).from_offer_number)
        .maybeSingle()
      if (offer?.discount) sourceDiscount = offer.discount as DbDiscount
    }

    // Normalisieren -> garantiert number
    const normalizedDiscount: Discount = {
      enabled: !!sourceDiscount?.enabled && parseNumber(sourceDiscount?.value, 0) > 0,
      label: (sourceDiscount?.label ?? 'Rabatt').toString(),
      type: (sourceDiscount?.type as DiscountType) ?? 'percent',
      base: (sourceDiscount?.base as DiscountBase) ?? 'net',
      value: parseNumber(sourceDiscount?.value, 0),
    }

    /* 2) Rechnungsnummer erzeugen (RPC mit Fallback) */
    let invoiceNumber: string
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('next_invoice_number', { p_user_id: user.id })
    if (!rpcErr && Array.isArray(rpcRes) && (rpcRes as any)[0]?.invoice_number) {
      invoiceNumber = (rpcRes as any)[0].invoice_number as string
    } else {
      const { data: bsFallback, error: bsFallbackErr } = await supabaseAdmin
        .from('billing_settings')
        .select('invoice_prefix, invoice_start, invoice_suffix')
        .eq('user_id', user.id)
        .single()
      if (bsFallbackErr || !bsFallback) throw new Error('Billing-Settings nicht gefunden')
      const next = (bsFallback.invoice_start ?? 0) + 1
      const { error: updErr } = await supabaseAdmin
        .from('billing_settings')
        .update({ invoice_start: next })
        .eq('user_id', user.id)
      if (updErr) throw new Error('Konnte invoice_start nicht speichern')
      invoiceNumber = `${bsFallback.invoice_prefix ?? ''}${next}${bsFallback.invoice_suffix ?? ''}`
    }

    /* 3) Billing / Template */
    const { data: bs, error: bsErr } = await supabaseAdmin
      .from('billing_settings')
      .select('template, account_holder, iban, bic, billing_phone, billing_email')
      .eq('user_id', user.id)
      .single()
    if (bsErr || !bs) throw new Error('Billing-Settings nicht gefunden')

    /* 4) Profil */
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('first_name,last_name,company_name,street,house_number,postal_code,city,logo_path,website')
      .eq('id', user.id)
      .single()
    if (profErr || !prof) throw new Error('Profil-Daten nicht gefunden')

    /* 5) Template laden */
    const { data: tplPub } = supabaseAdmin.storage.from('rechnungvorlagen').getPublicUrl(bs.template)
    const publicUrl = tplPub.publicUrl
    if (!publicUrl) throw new Error('Template nicht gefunden')
    const tplBytes = await (await fetch(publicUrl)).arrayBuffer()
    const tplDoc = await PDFDocument.load(tplBytes)

    /* 6) PDF */
    const pdf = await PDFDocument.create()
    const [tplPage] = await pdf.copyPages(tplDoc, [0])
    let page = pdf.addPage(tplPage)
    const { width, height } = page.getSize()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    // Layout
    const M = 32
    const reservedLogoH = 120
    const reservedLogoW = Math.min(width - 2 * (M + 8), 420)
    const topY = height - M
    const logoBoxBottom = topY - reservedLogoH

    let logoImage: any = null
    let imgDims = { width: 0, height: 0 }
    let imgX = 0
    if (prof.logo_path) {
      const { data: blob } = await supabaseAdmin.storage.from('logo').download(prof.logo_path)
      if (blob) {
        const arr = await (blob as Blob).arrayBuffer()
        const mime = (blob as Blob).type || ''
        try {
          if (/png/i.test(mime))        logoImage = await pdf.embedPng(arr)
          else if (/jpe?g/i.test(mime)) logoImage = await pdf.embedJpg(arr)
          else { try { logoImage = await pdf.embedJpg(arr) } catch { logoImage = await pdf.embedPng(arr) } }
        } catch { logoImage = await pdf.embedPng(arr) }
        if (logoImage) {
          const sW = reservedLogoW / logoImage.width
          const sH = reservedLogoH / logoImage.height
          const s  = Math.min(1, sW, sH)
          imgDims = { width: logoImage.width * s, height: logoImage.height * s }
          imgX = (width - imgDims.width) / 2
          const imgY = logoBoxBottom + (reservedLogoH - imgDims.height) / 2
          page.drawImage(logoImage, { x: imgX, y: imgY, width: imgDims.width, height: imgDims.height })
        }
      }
    }

    const gray = rgb(0.8, 0.8, 0.8)
    const footerH = height * 0.10
    const minSpaceToFooter = 5
    const lineH = 12
    const rowSpacing = 4
    const titleGap = 28
    const initialGapFirst = 14
    const initialGapNext  = 8
    const headerOffsetFirst = 36
    const headerOffsetNext  = 24
    const priceX = width - M - 125
    const totalX = width - M - 10

    // Kopf unter Logo
    const baseY = logoBoxBottom - 20

    // Absender
    const companyOrName = prof.company_name?.trim()
      ? prof.company_name
      : `${prof.first_name} ${prof.last_name}`
    page.drawText(
      `${companyOrName} – ${prof.street} ${prof.house_number} – ${prof.postal_code} ${prof.city}`,
      { x: M, y: baseY, size: 9, font }
    )

    // Kunde – DisplayName & Adresse: bevorzugt Firmenname
    const displayName = (customer.company?.trim())
      ? customer.company!.trim()
      : `${(customer.first_name ?? '').trim()} ${(customer.last_name ?? '').trim()}`.trim()

    const streetLine = (customer.street?.trim() || customer.house_number?.trim())
      ? `${customer.street ?? ''} ${customer.house_number ?? ''}`.trim()
      : (customer.address ?? '').trim()

    let custY = baseY - 20
    page.drawText(displayName, { x: M, y: custY, size: 10, font: bold })
    if (streetLine) { custY -= 13; page.drawText(streetLine, { x: M, y: custY, size: 10, font }) }
    const cityLine = `${customer.postal_code ?? ''} ${customer.city ?? ''}`.trim()
    if (cityLine) { custY -= 13; page.drawText(cityLine, { x: M, y: custY, size: 10, font }) }

    // Meta (Datum = oc.date; Fällig +14 Tage)
    const ocDateDb = (oc.date as string)
    const dueDb = addDaysYYYYMMDD(ocDateDb, 14)

    let metaY = baseY
    const metaX = width - M - 150
    page.drawText('Rechnungsnr.:', { x: metaX, y: metaY, size: 10, font: bold })
    page.drawText(String(invoiceNumber), { x: metaX + 80, y: metaY, size: 10, font }); metaY -= 13
    page.drawText('Datum:', { x: metaX, y: metaY, size: 10, font: bold })
    page.drawText(toDisplay(ocDateDb), { x: metaX + 80, y: metaY, size: 10, font }); metaY -= 13
    page.drawText('Zahlen bis:', { x: metaX, y: metaY, size: 10, font: bold })
    page.drawText(toDisplay(dueDb), { x: metaX + 80, y: metaY, size: 10, font }); metaY -= 13
    if (customer.customer_number) {
      page.drawText('Kundennr.:', { x: metaX, y: metaY, size: 10, font: bold })
      page.drawText(String(customer.customer_number), { x: metaX + 80, y: metaY, size: 10, font }); metaY -= 13
    }

// Titel & Intro (Intro mit automatischem Zeilenumbruch + Platzprüfung vor Tabellenstart)
let y0 = Math.min(custY, metaY) - 70

// Titel
const heading = `Rechnung – ${displayName}`
page.drawText(heading, { x: M, y: y0, size: 14, font: bold })
y0 -= titleGap

// Intro-Text (Absätze mit \n unterstützt)
const intro =
  `Vielen Dank für Ihren Auftrag (AB: ${orderConfirmationNumber}). ` +
  `Nachfolgend berechnen wir die vereinbarten Leistungen:`

const introText = intro.replace(/\r\n/g, '\n')
if (introText.trim()) {
  const introMaxW = width - 2 * M
  const introLineH = lineH // 12
  const paragraphs = introText.split('\n').map(s => s.trim())

  let cursorY = y0
  for (const p of paragraphs) {
    if (!p) { cursorY -= introLineH; continue } // leerer Absatz = Abstand
    const lines = getWrappedLines(p, introMaxW, font, 10)
    cursorY = drawLines(page, lines, M, cursorY, introLineH, font, 10) - introLineH // Absatzabstand
  }
  y0 = cursorY - 6 // kleiner Gap nach dem Intro
} else {
  y0 -= 18
}

// Tabelle: erst starten, wenn genug Platz; sonst neue Seite + Logo neu zeichnen
let tableY0 = y0 - headerOffsetFirst
if (tableY0 < footerH + minSpaceToFooter + 40) {
  const [p] = await pdf.copyPages(tplDoc, [0])
  page = pdf.addPage(p)

  // Logo auf neuer Seite erneut einzeichnen
  const topY2 = height - M
  const logoBoxBottom2 = topY2 - reservedLogoH
  if (logoImage) {
    const imgY2 = logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
    page.drawImage(logoImage, { x: imgX, y: imgY2, width: imgDims.width, height: imgDims.height })
  }

  // Tabellenkopf auf der neuen Seite tiefer ansetzen
  tableY0 = logoBoxBottom2 - headerOffsetNext
}

    drawTableHeader(page, M, width, tableY0, gray, bold, priceX, totalX)
    let rowY = tableY0 - initialGapFirst

    const newPage = async () => {
      const [p] = await pdf.copyPages(tplDoc, [0])
      page = pdf.addPage(p)
      const topY2 = height - M
      const logoBoxBottom2 = topY2 - reservedLogoH
      if (logoImage) {
        const imgY2 = logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
        page.drawImage(logoImage, { x: imgX, y: imgY2, width: imgDims.width, height: imgDims.height })
      }
      tableY0 = logoBoxBottom2 - headerOffsetNext
      drawTableHeader(page, M, width, tableY0, gray, bold, priceX, totalX)
      rowY = tableY0 - initialGapNext
    }

    const descX = M + 4
    const descW = M + 260 - descX - 4
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      let requiredH = lineH + rowSpacing
      let lines: string[] = []

      if (p.type === 'item') {
        lines = getWrappedLines(p.description || '', descW, font, 10)
        requiredH = Math.max(1, lines.length) * lineH + rowSpacing
      } else if (p.type === 'description') {
        lines = getWrappedLines(p.description || '', (width - M - descX), font, 10)
        requiredH = Math.max(1, lines.length) * lineH + rowSpacing
      }

      if (rowY - requiredH < footerH + minSpaceToFooter) await newPage()

      if (p.type === 'item') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        page.drawText(((p.quantity ?? 0)).toString(), { x: M + 260, y: rowY, size: 10, font })
        page.drawText(p.unit ?? '', { x: M + 320, y: rowY, size: 10, font })
        page.drawText(fmt(p.unitPrice ?? 0), { x: priceX, y: rowY, size: 10, font })
        const tot = fmt((p.quantity ?? 0) * (p.unitPrice ?? 0))
        const tw  = font.widthOfTextAtSize(tot, 10)
        page.drawText(tot, { x: totalX - tw, y: rowY, size: 10, font })
        rowY = endY - lineH - rowSpacing
      } else if (p.type === 'heading') {
        page.drawText(p.description ?? '', { x: descX, y: rowY, size: 10, font: bold })
        rowY -= lineH + rowSpacing
      } else if (p.type === 'description') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        rowY = endY - lineH - rowSpacing
      } else if (p.type === 'subtotal') {
        const sub = positions
          .slice(0, i)
          .reduce((s, pp) => s + (pp.type === 'item' ? (pp.quantity ?? 0) * (pp.unitPrice ?? 0) : 0), 0)
        const subStr = fmt(sub)
        page.drawText('Zwischensumme:', { x: descX, y: rowY, size: 10, font: bold })
        page.drawText(subStr, { x: totalX - bold.widthOfTextAtSize(subStr, 10), y: rowY, size: 10, font: bold })
        rowY -= lineH + rowSpacing
      } else if (p.type === 'separator') {
        page.drawLine({ start: { x: M, y: rowY }, end: { x: width - M, y: rowY }, thickness: 0.5, color: gray })
        rowY -= lineH + rowSpacing
      }
    }

    /* ========== Summen mit Rabatt (analog Angebot/AB) ========== */
    // taxRate robust (Komma -> Punkt)
    const taxRate = parseNumber((oc as any).tax_rate, 0)
    const taxFactor = 1 + taxRate / 100
    const netSubtotal = positions.reduce<number>(
      (s, p) => s + (p.type === 'item' ? (p.quantity ?? 0) * (p.unitPrice ?? 0) : 0),
      0
    )
    const grossBefore = netSubtotal * taxFactor
    const clamp = (n: number) => (n < 0 ? 0 : n)

    let discountAmount = 0
    let netAfterDiscount = netSubtotal
    let taxAmount = 0
    let grossTotal = 0

    const hasDiscount = normalizedDiscount.enabled && normalizedDiscount.value > 0

    if (hasDiscount) {
      if (normalizedDiscount.base === 'net') {
        discountAmount = normalizedDiscount.type === 'percent'
          ? (netSubtotal * normalizedDiscount.value) / 100
          : normalizedDiscount.value
        discountAmount = Math.min(Math.max(0, discountAmount), netSubtotal)
        netAfterDiscount = clamp(netSubtotal - discountAmount)
        taxAmount = netAfterDiscount * (taxFactor - 1)
        grossTotal = netAfterDiscount + taxAmount
      } else {
        // base: 'gross'
        discountAmount = normalizedDiscount.type === 'percent'
          ? (grossBefore * normalizedDiscount.value) / 100
          : normalizedDiscount.value
        discountAmount = Math.min(Math.max(0, discountAmount), grossBefore)
        const grossAfter = clamp(grossBefore - discountAmount)
        netAfterDiscount = grossAfter / taxFactor
        taxAmount = grossAfter - netAfterDiscount
        grossTotal = grossAfter
      }
    } else {
      taxAmount = netSubtotal * (taxFactor - 1)
      grossTotal = netSubtotal + taxAmount
    }

    // Platz prüfen und Summenblock zeichnen
    const linesCount = hasDiscount ? 5 : 3
    const summaryBlockH = 20 + (linesCount * 16) + 12
    if (rowY - summaryBlockH < footerH + minSpaceToFooter) {
      await newPage()
      rowY = tableY0 - 10
    }

    const sumY = rowY - 40
    page.drawLine({ start: { x: M, y: sumY + 18 }, end: { x: width - M, y: sumY + 18 }, thickness: 0.5, color: gray })
    let sy = sumY + 2

    // Netto (vor Rabatt)
    page.drawText('Netto', { x: M, y: sy, size: 10, font })
    page.drawText('EUR',   { x: priceX, y: sy, size: 10, font })
    { const s = fmt(netSubtotal); page.drawText(s, { x: totalX - font.widthOfTextAtSize(s, 10), y: sy, size: 10, font }) }
    sy -= 16

    // Rabatt (falls aktiv)
    if (hasDiscount) {
      const label = (normalizedDiscount.label ?? 'Rabatt').toString().trim() || 'Rabatt'
      const suffix = normalizedDiscount.type === 'percent' ? ` (${String(normalizedDiscount.value).replace('.', ',')}%)` : ''
      const basis = normalizedDiscount.base === 'net' ? 'auf Netto' : 'auf Brutto'
      page.drawText(`${label} – ${basis}${suffix}`, { x: M, y: sy, size: 10, font })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      { const s = `-${fmt(discountAmount)}`; page.drawText(s, { x: totalX - font.widthOfTextAtSize(s, 10), y: sy, size: 10, font }) }
      sy -= 16

      page.drawText('Netto nach Rabatt', { x: M, y: sy, size: 10, font })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      { const s = fmt(netAfterDiscount); page.drawText(s, { x: totalX - font.widthOfTextAtSize(s, 10), y: sy, size: 10, font }) }
      sy -= 16
    }

    // USt (auf Basis nach Rabatt)
    {
      const taxLabel = `USt (${taxRate.toFixed(2).replace('.', ',')} %)`
      page.drawText(taxLabel, { x: M, y: sy, size: 10, font })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      const s = fmt(taxAmount)
      page.drawText(s, { x: totalX - font.widthOfTextAtSize(s, 10), y: sy, size: 10, font })
    }
    sy -= 16

    // Brutto
    page.drawText('Brutto', { x: M, y: sy, size: 10, font })
    page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
    { const s = fmt(grossTotal); page.drawText(s, { x: totalX - font.widthOfTextAtSize(s, 10), y: sy, size: 10, font }) }
    sy -= 16

    // Hinweis bei Rabatt
    if (hasDiscount) {
      const note = `Hinweis: Es wurde ein Rabatt namens "${(normalizedDiscount.label ?? 'Rabatt').toString().trim() || 'Rabatt'}" angewendet.`
      const noteY = Math.max(footerH + 22, sy - 22)
      page.drawText(note, { x: M, y: noteY, size: 9, font, color: rgb(0.25, 0.25, 0.25) })
    }

    // Fußzeile
    const pages = pdf.getPages()
    for (const pg of pages) {
      pg.drawLine({ start: { x: M, y: footerH }, end: { x: width - M, y: footerH }, thickness: 0.5, color: gray })
      const left = prof.company_name?.trim()
        ? [prof.company_name, `${prof.street} ${prof.house_number}`, `${prof.postal_code} ${prof.city}`]
        : [`${prof.first_name} ${prof.last_name}`, `${prof.street} ${prof.house_number}`, `${prof.postal_code} ${prof.city}`]
      left.forEach((t, i) => pg.drawText(t, { x: M, y: footerH - 12 - i * 11, size: 9, font }))

      const mid = [`Kontoinhaber: ${bs.account_holder}`, `IBAN: ${bs.iban}`, `BIC: ${bs.bic}`]
      mid.forEach((t, i) => {
        const w = font.widthOfTextAtSize(t, 9)
        pg.drawText(t, { x: width / 2 - w / 2, y: footerH - 12 - i * 11, size: 9, font })
      })

      const right = [`Tel: ${bs.billing_phone}`, `E-Mail: ${bs.billing_email}`, prof.website ?? '']
      right.forEach((t, i) => {
        const w = font.widthOfTextAtSize(t, 9)
        pg.drawText(t, { x: width - M - w, y: footerH - 12 - i * 11, size: 9, font })
      })
    }

    const bytes = await pdf.save()

    /* Datei speichern + Upload */
    const safe = (s: string) => (s || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')
    const fname = ['Rechnung', safe(invoiceNumber), safe(customer.customer_number ?? '')]
      .filter(Boolean).join('_') + '.pdf'
    const filePath = `rechnung/${fname}`

    const { error: upErr } = await supabaseAdmin
      .storage.from('dokumente')
      .upload(filePath, Buffer.from(bytes), { upsert: true, contentType: 'application/pdf' })
    if (upErr) throw new Error('Upload fehlgeschlagen')

    /* invoices upsert — due_date = oc.date + 14; Rabatt & Summen mitpersistieren */
    const payload = {
      user_id:        user.id,
      customer_id:    customer.id,
      invoice_number: invoiceNumber,
      date:           ocDateDb,
      valid_until:    dueDb,
      title:          `Rechnung – ${displayName}`,
      intro,
      tax_rate:       taxRate,
      positions,
      pdf_path:       filePath,
      due_date:       dueDb,

      discount: {
        enabled: !!normalizedDiscount.enabled,
        label: (normalizedDiscount.label ?? 'Rabatt').toString(),
        type: normalizedDiscount.type,
        base: normalizedDiscount.base,
        value: Number(normalizedDiscount.value ?? 0),
      },
      net_subtotal:       Number(netSubtotal.toFixed(2)),
      discount_amount:    Number(discountAmount.toFixed(2)),
      net_after_discount: Number(netAfterDiscount.toFixed(2)),
      tax_amount:         Number(taxAmount.toFixed(2)),
      gross_total:        Number(grossTotal.toFixed(2)),
    }

    let upsertErr = (await supabaseAdmin
      .from('invoices')
      .upsert(payload, { onConflict: 'user_id,invoice_number' })
    ).error

    if (upsertErr && /column .*due_date/i.test(upsertErr.message)) {
      const { due_date, ...withoutDue } = payload as any
      upsertErr = (await supabaseAdmin
        .from('invoices')
        .upsert(withoutDue, { onConflict: 'user_id,invoice_number' })
      ).error
      if (upsertErr) throw upsertErr
    } else if (upsertErr) {
      throw upsertErr
    }

    /* AB → Abgerechnet (best effort) */
    try {
      await supabaseAdmin
        .from('order_confirmations')
        .update({
          status: 'Abgerechnet',
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('order_confirmation_number', orderConfirmationNumber)
        .neq('status', 'Abgerechnet')
    } catch (e) {
      console.warn('[generate-from-order] Status-Update Warnung:', e)
    }

    // Download Response
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return new NextResponse(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    })
  } catch (err: any) {
    console.error('[rechnung/generate-from-order] ERROR:', err?.message || err)
    return NextResponse.json({ message: err?.message || 'Fehler' }, { status: 500 })
  }
}
