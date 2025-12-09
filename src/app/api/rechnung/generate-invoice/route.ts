// src/app/api/rechnung/generate-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFPage, PDFFont } from 'pdf-lib'
import { Buffer } from 'buffer'

type Position = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description?: string
  quantity?: number
  unitPrice?: number
  unit?: string
}

type DiscountType = 'percent' | 'amount'
type DiscountBase = 'net' | 'gross'
type Discount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

interface Profile {
  first_name: string
  last_name: string
  company_name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  logo_path: string | null
  website?: string | null
}

/* ---------------- utils ---------------- */

function sanitize(text: string): string {
  return (text ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
}

const fmtNumber = (v: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0)

function toDbDate(input?: string | null): string | null {
  const v = (input ?? '').trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    return `${yyyy}-${mm}-${dd}`
  }
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}
function todayYYYYMMDD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function addDaysYYYYMMDD(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}
function toDisplay(dd: string | null): string {
  if (!dd) return ''
  const [y, m, d] = dd.split('-')
  return `${d}.${m}.${y}`
}

/** Wortumbruch vorab berechnen (keine Zeichnung) */
function getWrappedLines(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number
): string[] {
  const words = sanitize(text).split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** vorbereitete Zeilen zeichnen; gibt Y der letzten gezeichneten Zeile zurück */
function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  font: PDFFont,
  size: number
): number {
  let cursorY = y
  for (const ln of lines) {
    page.drawText(ln, { x, y: cursorY, size, font })
    cursorY -= lineHeight
  }
  return lines.length ? y - (lines.length - 1) * lineHeight : y
}

/** Tabellenkopf */
function drawTableHeader(
  page: PDFPage,
  M: number,
  width: number,
  tableY0: number,
  gray: ReturnType<typeof rgb>,
  fontBold: PDFFont,
  priceX: number,
  totalX: number
) {
  page.drawText('Position', { x: M + 4, y: tableY0 + 6, size: 10, font: fontBold })
  page.drawText('Anzahl',   { x: M + 260, y: tableY0 + 6, size: 10, font: fontBold })
  page.drawText('Einheit',  { x: M + 320, y: tableY0 + 6, size: 10, font: fontBold })
  page.drawText('Preis',    { x: priceX,  y: tableY0 + 6, size: 10, font: fontBold })
  const tl = 'Total'
  const tw = fontBold.widthOfTextAtSize(tl, 10)
  page.drawText(tl, { x: totalX - tw, y: tableY0 + 6, size: 10, font: fontBold })
  page.drawLine({
    start: { x: M, y: tableY0 },
    end: { x: width - M, y: tableY0 },
    thickness: 0.5,
    color: gray,
  })
}

/* --------------- supabase --------------- */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* --------------- route --------------- */
export async function POST(req: NextRequest) {
  try {
    // --- 1) Cron-Erkennung über Secret-Token ---
    const url = new URL(req.url)
    const authHeader = req.headers.get('authorization') || ''
    const headerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''
    const queryToken = url.searchParams.get('token') || ''
    const automationSecret = process.env.INVOICE_AUTOMATION_SECRET || ''
    const isAutomationCall =
      !!automationSecret &&
      (headerToken === automationSecret || queryToken === automationSecret)

    // --- 2) Payload EINMAL lesen ---
    const {
      customer,
      meta,
      positions: rawPositions,
      systemUserId,
    } = await req.json()
    const positions = (rawPositions ?? []) as Position[]

    // --- 3) User ermitteln (normaler Login ODER Cron-Ausnahme) ---
    let userId: string

    if (isAutomationCall) {
      if (!systemUserId || typeof systemUserId !== 'string') {
        throw new Error('systemUserId fehlt für Automation-Aufruf')
      }
      userId = systemUserId
    } else {
      const supabase = await supabaseServer()
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Nicht eingeloggt')
      userId = user.id
    }

    // --- 4) Meta aus Payload ---
    const {
      date,
      title,
      intro,
      taxRate,
      billingSettings,
      invoiceNumber: existingInvoiceNumber,
      discount: metaDiscount,
      commit, // Preview vs. Commit
      idempotencyKey,
    } = (meta ?? {}) as {
      date?: string
      title: string
      intro: string
      taxRate: number
      billingSettings: { template: string }
      invoiceNumber?: string
      discount?: Discount
      commit?: boolean
      idempotencyKey?: string
    }

    const discount: Discount = {
      enabled: !!metaDiscount?.enabled,
      label: (metaDiscount?.label ?? 'Rabatt').toString(),
      type: (metaDiscount?.type as DiscountType) ?? 'percent',
      base: (metaDiscount?.base as DiscountBase) ?? 'net',
      value: Number(metaDiscount?.value ?? 0),
    }

    const isPreview = !commit
    const isUpdate = !!(existingInvoiceNumber && existingInvoiceNumber.trim())

    // --- 5) Rechnungsdatum (bei Bearbeitung unverändert) ---
    let persistedDateDb: string | null = null
    if (existingInvoiceNumber) {
      const { data: existing } = await supabaseAdmin
        .from('invoices')
        .select('date')
        .eq('user_id', userId)
        .eq('invoice_number', existingInvoiceNumber)
        .maybeSingle()
      if (existing?.date) persistedDateDb = existing.date as string
    }
    const metaDateDb = toDbDate(date)
    const baseDateDb = persistedDateDb ?? metaDateDb ?? todayYYYYMMDD()
    const dueDb = addDaysYYYYMMDD(baseDateDb, 14)

    // --- 6) Billing/Kontakt & Profil ---
    const { data: bsData, error: bsErr } = await supabaseAdmin
      .from('billing_settings')
      .select(
        'account_holder, iban, bic, billing_phone, billing_email, invoice_prefix, invoice_start, invoice_suffix'
      )
      .eq('user_id', userId)
      .single()
    if (bsErr || !bsData) throw new Error('Billing‐Settings nicht gefunden')

    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'first_name,last_name,company_name,street,house_number,postal_code,city,logo_path,website'
      )
      .eq('id', userId)
      .single()
    if (profErr || !prof) throw new Error('Profil-Daten nicht gefunden')
    const profile = prof as Profile

    // --- 7) Rechnungsnummer – immer VOR PDF-Erstellung bestimmen ---
    let invoiceNumber = existingInvoiceNumber?.trim() || ''

    if (!isPreview && !isUpdate) {
      if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        throw new Error('idempotencyKey fehlt')
      }

      const existingByKey = await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingByKey.data?.invoice_number) {
        invoiceNumber = existingByKey.data.invoice_number
      } else {
        const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc(
          'next_invoice_number',
          { p_user_id: userId }
        )
        if (rpcErr) throw rpcErr
        const newNo = Array.isArray(rpcRes)
          ? (rpcRes as any)[0]?.invoice_number
          : (rpcRes as any)?.invoice_number
        if (!newNo) throw new Error('Konnte nächste Rechnungsnummer nicht vergeben')
        invoiceNumber = String(newNo)
      }
    }

    // --- 8) Template laden – via Storage.download ---
    const tplBlobResp = await supabaseAdmin.storage
      .from('rechnungvorlagen')
      .download(billingSettings.template)
    if (tplBlobResp.error || !tplBlobResp.data) {
      throw new Error(`Template nicht gefunden: ${billingSettings.template}`)
    }
    const tplBytes = await tplBlobResp.data.arrayBuffer()
    const templateDoc = await PDFDocument.load(tplBytes)

    // --- 9) PDF erstellen ---
    const pdfDoc = await PDFDocument.create()
    const [tplPageRef] = await pdfDoc.copyPages(templateDoc, [0])
    let page = pdfDoc.addPage(tplPageRef)
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // --- 10) Logo-Zone ---
    const M = 32
    const reservedLogoH = 120
    const maxLogoDrawH = 80
    const reservedLogoW = Math.min(width - 2 * (M + 8), 260)
    const topY = height - M
    const logoBoxBottom = topY - reservedLogoH
    let logoImage: any = null
    let imgDims = { width: 0, height: 0 }
    let imgX = 0

    if (profile.logo_path) {
      const logoResp = await supabaseAdmin.storage.from('logo').download(profile.logo_path)
      if (logoResp.data) {
        const arr = await logoResp.data.arrayBuffer()
        const mime = logoResp.data.type || ''
        try {
          if (/png/i.test(mime)) logoImage = await pdfDoc.embedPng(arr)
          else if (/jpe?g/i.test(mime)) logoImage = await pdfDoc.embedJpg(arr)
          else {
            try {
              logoImage = await pdfDoc.embedJpg(arr)
            } catch {
              logoImage = await pdfDoc.embedPng(arr)
            }
          }
        } catch {
          logoImage = await pdfDoc.embedPng(arr)
        }
        if (logoImage) {
          const sW = reservedLogoW / logoImage.width
          const sH = maxLogoDrawH / logoImage.height
          const s = Math.min(1, sW, sH)
          imgDims = { width: logoImage.width * s, height: logoImage.height * s }
          imgX = (width - imgDims.width) / 2
          const imgY = logoBoxBottom + (reservedLogoH - imgDims.height) / 2
          page.drawImage(logoImage, {
            x: imgX,
            y: imgY,
            width: imgDims.width,
            height: imgDims.height,
          })
        }
      }
    }

    // --- 11) Summen ---
    const netSubtotal = positions.reduce<number>(
      (s, p) =>
        s +
        (p.type === 'item'
          ? (p.quantity ?? 0) * (p.unitPrice ?? 0)
          : 0),
      0
    )
    const taxFactor = 1 + (Number(taxRate) || 0) / 100
    const grossBefore = netSubtotal * taxFactor
    const clamp = (n: number) => (n < 0 ? 0 : n)

    let discountAmount = 0
    let netAfterDiscount = netSubtotal
    let taxAmount = 0
    let grossTotal = 0

    if (discount.enabled && discount.value > 0) {
      if (discount.base === 'net') {
        discountAmount =
          discount.type === 'percent'
            ? (netSubtotal * discount.value) / 100
            : discount.value
        discountAmount = Math.min(Math.max(0, discountAmount), netSubtotal)
        netAfterDiscount = clamp(netSubtotal - discountAmount)
        taxAmount = netAfterDiscount * (taxFactor - 1)
        grossTotal = netAfterDiscount + taxAmount
      } else {
        discountAmount =
          discount.type === 'percent'
            ? (grossBefore * discount.value) / 100
            : discount.value
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

    // --- 12) Layout-Konstanten ---
    const grayLine = rgb(0.8, 0.8, 0.8)
    const footerH = 40
    const minSpaceToFooter = 5
    const lineH = 12
    const rowSpacing = 4
    const titleGap = 28
    const initialGapFirst = 14
    const initialGapNext = 8
    const headerOffsetFirst = 36
    const headerOffsetNext = 24
    const priceX = width - M - 125
    const totalX = width - M - 10

    // --- 13) Kopf & Kunde ---
    const baseY = logoBoxBottom - 20
    const headerCompanyOrName = profile.company_name?.trim()
      ? profile.company_name
      : `${profile.first_name} ${profile.last_name}`

    page.drawText(
      `${headerCompanyOrName} – ${profile.street} ${profile.house_number} – ${profile.postal_code} ${profile.city}`,
      { x: M, y: baseY, size: 9, font }
    )

    const cFirst = ((customer as any).first_name ?? '').toString().trim()
    const cLast = ((customer as any).last_name ?? '').toString().trim()
    const cCompany = ((customer as any).company ?? '').toString().trim()
    const displayName = (cCompany || `${cFirst} ${cLast}`.trim()).trim()

    const cStreet = ((customer as any).street ?? '').toString().trim()
    const cHausnr = ((customer as any).house_number ?? '').toString().trim()
    const cPostal = ((customer as any).postal_code ?? '').toString().trim()
    const cCity = ((customer as any).city ?? '').toString().trim()

    const addrLine2 = (cStreet || cHausnr)
      ? `${cStreet} ${cHausnr}`.replace(/\s+/g, ' ').trim()
      : (((customer as any).address ?? '').toString().trim() || '')

    const addrLine3 = [cPostal, cCity]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    let custY = baseY - 20
    page.drawText(displayName || '', {
      x: M,
      y: custY,
      size: 10,
      font: fontBold,
    })

    if (addrLine2) {
      custY -= 13
      page.drawText(addrLine2, { x: M, y: custY, size: 10, font })
    }
    if (addrLine3) {
      custY -= 13
      page.drawText(addrLine3, { x: M, y: custY, size: 10, font })
    }

    // Meta rechts
    let metaY = baseY
    const metaX = width - M - 150
    page.drawText('Rechnungsnr.:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(invoiceNumber || '', {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    page.drawText('Datum:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(toDisplay(baseDateDb), {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    page.drawText('Zahlen bis:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(toDisplay(dueDb), {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    const customerNumber: string | undefined = (customer as any).customer_number || undefined
    if (customerNumber) {
      page.drawText('Kundennr.:', {
        x: metaX,
        y: metaY,
        size: 10,
        font: fontBold,
      })
      page.drawText(customerNumber, {
        x: metaX + 80,
        y: metaY,
        size: 10,
        font,
      })
      metaY -= 13
    }

    // Titel & Intro
    let y0 = Math.min(custY, metaY) - 70

    const heading = String(title || '')
    const maxTitleWidth = width - 2 * M
    const maxSize = 16
    const minSize = 10
    let headingSize = 14
    let testSize = maxSize
    let headingWidth = fontBold.widthOfTextAtSize(heading, testSize)
    if (headingWidth > maxTitleWidth) {
      const scale = maxTitleWidth / headingWidth
      testSize = Math.max(minSize, Math.floor(testSize * scale))
    }
    headingSize = testSize

    page.drawText(heading, {
      x: M,
      y: y0,
      size: headingSize,
      font: fontBold,
    })
    y0 -= headingSize + (titleGap - 14)

    const introText = (intro ??
      'Vielen Dank für Ihren Auftrag. Nachfolgend die abgerechneten Positionen:'
    )
      .toString()
      .replace(/\r\n/g, '\n')

    if (introText.trim()) {
      const introMaxW = width - 2 * M
      const introLineH = lineH
      const paragraphs = introText.split('\n').map((s) => s.trim())

      let cursorY = y0
      for (const p of paragraphs) {
        if (!p) {
          cursorY -= introLineH
          continue
        }
        const lines = getWrappedLines(p, introMaxW, font, 10)
        cursorY = drawLines(page, lines, M, cursorY, introLineH, font, 10) - introLineH
      }
      y0 = cursorY - 6
    } else {
      y0 -= 18
    }

    // --- 14) Tabelle + Positionen ---
    let tableY0 = y0 - headerOffsetFirst
    if (tableY0 < footerH + minSpaceToFooter + 40) {
      const [p] = await pdfDoc.copyPages(templateDoc, [0])
      page = pdfDoc.addPage(p)

      const topY2 = height - M
      const logoBoxBottom2 = topY2 - reservedLogoH
      if (logoImage) {
        const imgY2 = logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
        page.drawImage(logoImage, {
          x: imgX,
          y: imgY2,
          width: imgDims.width,
          height: imgDims.height,
        })
      }

      tableY0 = logoBoxBottom2 - headerOffsetNext
    }

    drawTableHeader(page, M, width, tableY0, grayLine, fontBold, priceX, totalX)
    let rowY = tableY0 - initialGapFirst

    const descX = M + 4
    const descW = M + 260 - descX - 4

    const newPage = async () => {
      const [newTpl] = await pdfDoc.copyPages(templateDoc, [0])
      page = pdfDoc.addPage(newTpl)
      const topY2 = height - M
      const logoBoxBottom2 = topY2 - reservedLogoH
      if (logoImage) {
        const imgY2 = logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
        page.drawImage(logoImage, {
          x: imgX,
          y: imgY2,
          width: imgDims.width,
          height: imgDims.height,
        })
      }
      tableY0 = logoBoxBottom2 - headerOffsetNext
      drawTableHeader(page, M, width, tableY0, grayLine, fontBold, priceX, totalX)
      rowY = tableY0 - initialGapNext
    }

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      let requiredH = lineH + rowSpacing
      let lines: string[] = []
      if (p.type === 'item') {
        lines = getWrappedLines(p.description || '', descW, font, 10)
        requiredH = Math.max(1, lines.length) * lineH + rowSpacing
      } else if (p.type === 'description') {
        lines = getWrappedLines(
          p.description || '',
          width - M - descX,
          font,
          10
        )
        requiredH = Math.max(1, lines.length) * lineH + rowSpacing
      }
      if (rowY - requiredH < footerH + minSpaceToFooter) await newPage()

      if (p.type === 'item') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        page.drawText(fmtNumber(p.quantity ?? 0), {
          x: M + 260,
          y: rowY,
          size: 10,
          font,
        })
        page.drawText(p.unit ?? '', {
          x: M + 320,
          y: rowY,
          size: 10,
          font,
        })
        page.drawText(fmtNumber(p.unitPrice ?? 0), {
          x: priceX,
          y: rowY,
          size: 10,
          font,
        })
        const totalStr = fmtNumber(
          (p.quantity ?? 0) * (p.unitPrice ?? 0)
        )
        const twItem = font.widthOfTextAtSize(totalStr, 10)
        page.drawText(totalStr, {
          x: totalX - twItem,
          y: rowY,
          size: 10,
          font,
        })
        rowY = endY - lineH - rowSpacing
      } else if (p.type === 'heading') {
        page.drawText(p.description || '', {
          x: descX,
          y: rowY,
          size: 10,
          font: fontBold,
        })
        rowY -= lineH + rowSpacing
      } else if (p.type === 'description') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        rowY = endY - lineH - rowSpacing
      } else if (p.type === 'subtotal') {
        const sub = positions
          .slice(0, i)
          .reduce(
            (s, pp) =>
              s +
              (pp.type === 'item'
                ? (pp.quantity ?? 0) * (pp.unitPrice ?? 0)
                : 0),
            0
          )
        const subStr = fmtNumber(sub)
        page.drawText('Zwischensumme:', {
          x: descX,
          y: rowY,
          size: 10,
          font: fontBold,
        })
        page.drawText(subStr, {
          x: totalX - fontBold.widthOfTextAtSize(subStr, 10),
          y: rowY,
          size: 10,
          font: fontBold,
        })
        rowY -= lineH + rowSpacing
      } else if (p.type === 'separator') {
        page.drawLine({
          start: { x: M, y: rowY },
          end: { x: width - M, y: rowY },
          thickness: 0.5,
          color: grayLine,
        })
        rowY -= lineH + rowSpacing
      }
    }

    // --- 15) Summenblock ---
    const linesCount =
      discount.enabled && discount.value > 0 ? 5 : 3
    const summaryBlockH = 20 + linesCount * 16 + 12
    if (rowY - summaryBlockH < footerH + minSpaceToFooter) {
      await newPage()
      rowY = tableY0 - 10
    }

    const sumY = rowY - 40
    page.drawLine({
      start: { x: M, y: sumY + 18 },
      end: { x: width - M, y: sumY + 18 },
      thickness: 0.5,
      color: grayLine,
    })

    let sy2 = sumY + 2
    page.drawText('Netto', {
      x: M,
      y: sy2,
      size: 10,
      font,
    })
    page.drawText('EUR', {
      x: priceX,
      y: sy2,
      size: 10,
      font,
    })
    {
      const s = fmtNumber(netSubtotal)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy2,
        size: 10,
        font,
      })
    }
    sy2 -= 16

    if (discount.enabled && discount.value > 0) {
      const label = discount.label?.trim()
        ? discount.label.trim()
        : 'Rabatt'
      const suffix =
        discount.type === 'percent'
          ? ` (${String(Number(discount.value)).replace('.', ',')}%)`
          : ''
      const basis =
        discount.base === 'net' ? 'auf Netto' : 'auf Brutto'
      page.drawText(`${label} – ${basis}${suffix}`, {
        x: M,
        y: sy2,
        size: 10,
        font,
      })
      page.drawText('EUR', {
        x: priceX,
        y: sy2,
        size: 10,
        font,
      })
      {
        const s = `-${fmtNumber(discountAmount)}`
        page.drawText(s, {
          x: totalX - font.widthOfTextAtSize(s, 10),
          y: sy2,
          size: 10,
          font,
        })
      }
      sy2 -= 16

      page.drawText('Netto nach Rabatt', {
        x: M,
        y: sy2,
        size: 10,
        font,
      })
      page.drawText('EUR', {
        x: priceX,
        y: sy2,
        size: 10,
        font,
      })
      {
        const s = fmtNumber(netAfterDiscount)
        page.drawText(s, {
          x: totalX - font.widthOfTextAtSize(s, 10),
          y: sy2,
          size: 10,
          font,
        })
      }
      sy2 -= 16
    }

    {
      const taxLabel = `USt (${Number(taxRate ?? 0)
        .toFixed(2)
        .replace('.', ',')} %)`
      page.drawText(taxLabel, {
        x: M,
        y: sy2,
        size: 10,
        font,
      })
      page.drawText('EUR', {
        x: priceX,
        y: sy2,
        size: 10,
        font,
      })
      const s = fmtNumber(taxAmount)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy2,
        size: 10,
        font,
      })
    }
    sy2 -= 16

    page.drawText('Brutto', {
      x: M,
      y: sy2,
      size: 10,
      font,
    })
    page.drawText('EUR', {
      x: priceX,
      y: sy2,
      size: 10,
      font,
    })
    {
      const s = fmtNumber(grossTotal)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy2,
        size: 10,
        font,
      })
    }
    sy2 -= 16

    if (commit && discount.enabled && discount.value > 0) {
      const note = `Hinweis: Es wurde ein Rabatt namens "${discount.label?.trim() || 'Rabatt'}" angewendet.`
      const noteY = Math.max(footerH + 22, sy2 - 22)
      page.drawText(note, {
        x: M,
        y: noteY,
        size: 9,
        font,
        color: rgb(0.25, 0.25, 0.25),
      })
    }

    // --- 16) Fußzeilen auf allen Seiten ---
    const pagesAll = pdfDoc.getPages()
    for (const pg of pagesAll) {
      pg.drawLine({
        start: { x: M, y: footerH },
        end: { x: width - M, y: footerH },
        thickness: 0.5,
        color: grayLine,
      })
      const leftLines = profile.company_name?.trim()
        ? [
            profile.company_name,
            `${profile.street} ${profile.house_number}`,
            `${profile.postal_code} ${profile.city}`,
          ]
        : [
            `${profile.first_name} ${profile.last_name}`,
            `${profile.street} ${profile.house_number}`,
            `${profile.postal_code} ${profile.city}`,
          ]
      leftLines.forEach((ln, i) =>
        pg.drawText(ln, {
          x: M,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        })
      )

      const midLines = [
        `Kontoinhaber: ${bsData.account_holder}`,
        `IBAN: ${bsData.iban}`,
        `BIC: ${bsData.bic}`,
      ]
      midLines.forEach((ln, i) => {
        const w = font.widthOfTextAtSize(ln, 9)
        pg.drawText(ln, {
          x: width / 2 - w / 2,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        })
      })

      const rightLines = [
        `Tel: ${bsData.billing_phone}`,
        `E-Mail: ${bsData.billing_email}`,
        profile.website ?? '',
      ]
      rightLines.forEach((ln, i) => {
        const w = font.widthOfTextAtSize(ln, 9)
        pg.drawText(ln, {
          x: width - M - w,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        })
      })
    }

    // --- 17) Bytes erzeugen ---
    const pdfBytes = await pdfDoc.save()

    // --- 18) Persistenz (nur COMMIT) ---
    if (commit) {
      const isUpdateCommit = isUpdate

      if (isUpdateCommit) {
        if (!invoiceNumber) {
          throw new Error('Rechnungsnummer fehlt beim Update')
        }

        const filePath = `rechnung/${invoiceNumber}.pdf`
        const upload = await supabaseAdmin.storage
          .from('dokumente')
          .upload(filePath, Buffer.from(pdfBytes), { upsert: true })
        if (upload.error) throw new Error('Upload fehlgeschlagen')

        const payloadUpdate: Record<string, any> = {
          user_id: userId,
          customer_id: (customer as any).id,
          invoice_number: invoiceNumber,
          date: baseDateDb,
          valid_until: dueDb,
          title,
          intro,
          tax_rate: taxRate,
          positions,
          pdf_path: filePath,
          due_date: dueDb,
          discount: {
            enabled: !!discount.enabled,
            label: discount.label ?? 'Rabatt',
            type: discount.type,
            base: discount.base,
            value: Number(discount.value ?? 0),
          },
          net_subtotal: Number(netSubtotal.toFixed(2)),
          discount_amount: Number(discountAmount.toFixed(2)),
          net_after_discount: Number(netAfterDiscount.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          gross_total: Number(grossTotal.toFixed(2)),
        }

        let upsertErr = (
          await supabaseAdmin
            .from('invoices')
            .upsert(payloadUpdate, { onConflict: 'user_id,invoice_number' })
        ).error

        if (upsertErr && /due_date/i.test(upsertErr.message)) {
          const { due_date, ...withoutDue } = payloadUpdate
          upsertErr = (
            await supabaseAdmin
              .from('invoices')
              .upsert(withoutDue, { onConflict: 'user_id,invoice_number' })
          ).error
          if (upsertErr) throw upsertErr
        }

        try {
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'Erstellt',
              status_changed_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('invoice_number', invoiceNumber)
            .is('status', null)
        } catch {}
      } else {
        if (!idempotencyKey || typeof idempotencyKey !== 'string') {
          throw new Error('idempotencyKey fehlt')
        }
        if (!invoiceNumber) {
          throw new Error('Rechnungsnummer fehlt bei neuer Rechnung')
        }

        const filePath = `rechnung/${invoiceNumber}.pdf`
        const upload = await supabaseAdmin.storage
          .from('dokumente')
          .upload(filePath, Buffer.from(pdfBytes), { upsert: true })
        if (upload.error) throw new Error('Upload fehlgeschlagen')

        const payloadCreate: Record<string, any> = {
          user_id: userId,
          customer_id: (customer as any).id,
          invoice_number: invoiceNumber,
          date: baseDateDb,
          valid_until: dueDb,
          title,
          intro,
          tax_rate: taxRate,
          positions,
          pdf_path: filePath,
          due_date: dueDb,
          idempotency_key: idempotencyKey,
          discount: {
            enabled: !!discount.enabled,
            label: discount.label ?? 'Rabatt',
            type: discount.type,
            base: discount.base,
            value: Number(discount.value ?? 0),
          },
          net_subtotal: Number(netSubtotal.toFixed(2)),
          discount_amount: Number(discountAmount.toFixed(2)),
          net_after_discount: Number(netAfterDiscount.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          gross_total: Number(grossTotal.toFixed(2)),
        }

        let upsertErr = (
          await supabaseAdmin
            .from('invoices')
            .upsert(payloadCreate, { onConflict: 'user_id,invoice_number' })
        ).error

        if (upsertErr && /due_date/i.test(upsertErr.message)) {
          const { due_date, ...withoutDue } = payloadCreate
          upsertErr = (
            await supabaseAdmin
              .from('invoices')
              .upsert(withoutDue, { onConflict: 'user_id,invoice_number' })
          ).error
          if (upsertErr) throw upsertErr
        }

        try {
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'Erstellt',
              status_changed_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('invoice_number', invoiceNumber)
            .is('status', null)
        } catch {}
      }
    }

    // --- 19) Response (PDF direkt) ---
    const pdfAb = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(pdfAb).set(pdfBytes)

    const safe = (s: string) =>
      (s || '')
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '')
    const comp = safe(((customer as any).company ?? '').toString().trim())
    const first = safe(((customer as any).first_name ?? '').toString().trim())
    const last = safe(((customer as any).last_name ?? '').toString().trim())
    const custNo = safe(
      ((customer as any).customer_number ?? '').toString().trim()
    )
    const namePart = comp || [first, last].filter(Boolean).join('_')
    const friendlyName =
      [namePart, invoiceNumber, custNo].filter(Boolean).join('_') + '.pdf'

    return new NextResponse(pdfAb, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${friendlyName}"`,
        'Cache-Control': 'no-store',
        'X-Preview': isPreview ? 'true' : 'false',
        'X-Invoice-Number': encodeURIComponent(invoiceNumber || ''),
      },
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim Erstellen des PDF' },
      { status: 500 }
    )
  }
}
