// src/app/api/auftrag/generate-from-offer/route.ts
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
type Discount = {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

type OfferRow = {
  id: string
  user_id: string
  customer_id: string
  offer_number: string
  date: string
  valid_until?: string | null
  title?: string | null
  intro?: string | null
  tax_rate: number
  positions: Position[]
  pdf_path?: string | null
  status?: string | null
  discount?: Discount | null
  customers: CustomerRow | CustomerRow[]
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

function getWrappedLines(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  const words = sanitize(text).split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(t, size) > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = t
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  font: PDFFont,
  size: number,
): number {
  let cursorY = y
  for (const ln of lines) {
    page.drawText(ln, { x, y: cursorY, size, font })
    cursorY -= lineHeight
  }
  return lines.length ? y - (lines.length - 1) * lineHeight : y
}

function drawTableHeader(
  page: PDFPage,
  M: number,
  width: number,
  y0: number,
  gray: ReturnType<typeof rgb>,
  bold: PDFFont,
  priceX: number,
  totalX: number,
) {
  page.drawText('Position', {
    x: M + 4,
    y: y0 + 6,
    size: 10,
    font: bold,
  })
  page.drawText('Anzahl', {
    x: M + 260,
    y: y0 + 6,
    size: 10,
    font: bold,
  })
  page.drawText('Einheit', {
    x: M + 320,
    y: y0 + 6,
    size: 10,
    font: bold,
  })
  page.drawText('Preis', { x: priceX, y: y0 + 6, size: 10, font: bold })
  const tl = 'Total'
  const tw = bold.widthOfTextAtSize(tl, 10)
  page.drawText(tl, {
    x: totalX - tw,
    y: y0 + 6,
    size: 10,
    font: bold,
  })
  page.drawLine({
    start: { x: M, y: y0 },
    end: { x: width - M, y: y0 },
    thickness: 0.5,
    color: gray,
  })
}

// Deutsche Formatierung wie 1.000.000,00
const fmt = (v: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0)

/* ======================= Handler ======================= */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Nicht eingeloggt')

    // Payload
    const { offerNumber } = (await req.json()) as { offerNumber: string }
    if (!offerNumber) throw new Error('offerNumber fehlt')

    // Angebot + Kunde
    const { data: offer, error: offErr } = await supabaseAdmin
      .from('offers')
      .select(
        `
        id, user_id, customer_id, offer_number, date, valid_until,
        title, intro, tax_rate, positions, pdf_path, status,
        discount,
        customers (
          id, first_name, last_name, company,
          email, street, house_number, address,
          postal_code, city, customer_number
        )
      `,
      )
      .eq('user_id', user.id)
      .eq('offer_number', offerNumber)
      .single()

    if (offErr || !offer) throw new Error('Angebot nicht gefunden')

    const o = offer as unknown as OfferRow
    const rawCustomer = o.customers
    const customer: CustomerRow | null = Array.isArray(rawCustomer)
      ? ((rawCustomer[0] as CustomerRow | undefined) ?? null)
      : ((rawCustomer as CustomerRow | null) ?? null)

    if (!customer) throw new Error('Kunde zum Angebot nicht gefunden')

    const positions = (o.positions ?? []) as Position[]

    // Billing-Settings (OC)
    const { data: bs, error: bsErr } = await supabaseAdmin
      .from('billing_settings')
      .select(
        'order_confirmation_prefix, order_confirmation_start, order_confirmation_suffix, template, account_holder, iban, bic, billing_phone, billing_email',
      )
      .eq('user_id', user.id)
      .single()
    if (bsErr || !bs) throw new Error('Billing-Settings nicht gefunden')

    // Profil
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'first_name,last_name,company_name,street,house_number,postal_code,city,logo_path,website',
      )
      .eq('id', user.id)
      .single()
    if (profErr || !prof) throw new Error('Profil-Daten nicht gefunden')

    // OC-Nummer
    const nextNr = (bs.order_confirmation_start ?? 0) + 1
    const ocNumber = `${bs.order_confirmation_prefix ?? ''}${nextNr}${
      bs.order_confirmation_suffix ?? ''
    }`
    const { error: updStartErr } = await supabaseAdmin
      .from('billing_settings')
      .update({ order_confirmation_start: nextNr })
      .eq('user_id', user.id)
    if (updStartErr) throw new Error('Konnte neue OC-Nummer nicht speichern')

    // Template
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from('rechnungvorlagen')
      .getPublicUrl(bs.template)
    if (!publicUrl) throw new Error('Template nicht gefunden')
    const tplBytes = await (await fetch(publicUrl)).arrayBuffer()
    const tplDoc = await PDFDocument.load(tplBytes)

    // PDF Setup
    const pdf = await PDFDocument.create()
    const [tplPage] = await pdf.copyPages(tplDoc, [0])
    let page = pdf.addPage(tplPage)
    const { width, height } = page.getSize()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    // Layout
    const M = 32
    const reservedLogoH = 120 // Layout-Box wie beim Angebot
    const maxLogoDrawH = 80   // tatsächliche max. Logohöhe (kleiner)
    const reservedLogoW = Math.min(width - 2 * (M + 8), 260)
    const topY = height - M
    const logoBoxBottom = topY - reservedLogoH
    const gray = rgb(0.8, 0.8, 0.8)
    const footerH = 40 // Footer weiter nach unten
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

    // Logo
    let logoImage: any = null
    let imgDims = { width: 0, height: 0 }
    let imgX = 0
    if (prof.logo_path) {
      const { data: blob } = await supabaseAdmin.storage
        .from('logo')
        .download(prof.logo_path)
      if (blob) {
        const arr = await (blob as Blob).arrayBuffer()
        const mime = (blob as Blob).type || ''
        try {
          if (/png/i.test(mime)) logoImage = await pdf.embedPng(arr)
          else if (/jpe?g/i.test(mime)) logoImage = await pdf.embedJpg(arr)
          else {
            try {
              logoImage = await pdf.embedJpg(arr)
            } catch {
              logoImage = await pdf.embedPng(arr)
            }
          }
        } catch {
          logoImage = await pdf.embedPng(arr)
        }
        if (logoImage) {
          const sW = reservedLogoW / logoImage.width
          const sH = maxLogoDrawH / logoImage.height
          const s = Math.min(1, sW, sH)
          imgDims = {
            width: logoImage.width * s,
            height: logoImage.height * s,
          }
          imgX = (width - imgDims.width) / 2
          const imgY =
            logoBoxBottom + (reservedLogoH - imgDims.height) / 2
          page.drawImage(logoImage, {
            x: imgX,
            y: imgY,
            width: imgDims.width,
            height: imgDims.height,
          })
        }
      }
    }

    // Kopfbereich
    const baseY = logoBoxBottom - 20

    // Absender
    const companyOrName = prof.company_name?.trim()
      ? prof.company_name
      : `${prof.first_name} ${prof.last_name}`
    page.drawText(
      `${companyOrName} – ${prof.street} ${prof.house_number} – ${prof.postal_code} ${prof.city}`,
      { x: M, y: baseY, size: 9, font },
    )

    // Kunde – DisplayName & Adresse
    const displayName = customer.company?.trim()
      ? customer.company!.trim()
      : `${(customer.first_name ?? '').trim()} ${(customer.last_name ?? '').trim()}`.trim()

    const streetLine =
      (customer.street?.trim() || customer.house_number?.trim())
        ? `${customer.street ?? ''} ${customer.house_number ?? ''}`.trim()
        : (customer.address ?? '').trim()

    let custY = baseY - 20
    page.drawText(displayName, { x: M, y: custY, size: 10, font: bold })
    if (streetLine) {
      custY -= 13
      page.drawText(streetLine, { x: M, y: custY, size: 10, font })
    }
    const cityLine = `${customer.postal_code ?? ''} ${
      customer.city ?? ''
    }`.trim()
    if (cityLine) {
      custY -= 13
      page.drawText(cityLine, { x: M, y: custY, size: 10, font })
    }

    // Meta rechts
    let metaY = baseY
    const metaX = width - M - 170
    page.drawText('Auftragsbestätigungsnr.:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: bold,
    })
    page.drawText(String(ocNumber), {
      x: metaX + 140,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    page.drawText('Datum:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: bold,
    })
    page.drawText(String(o.date ?? ''), {
      x: metaX + 140,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    if (customer.customer_number) {
      page.drawText('Kundennr.:', {
        x: metaX,
        y: metaY,
        size: 10,
        font: bold,
      })
      page.drawText(String(customer.customer_number), {
        x: metaX + 140,
        y: metaY,
        size: 10,
        font,
      })
      metaY -= 13
    }

    // Titel & Intro (mit Umbruch + Platzprüfung)
    let y0 = Math.min(custY, metaY) - 70

    // Dynamische Überschrift-Größe
    const headingBase = `Auftragsbestätigung – ${displayName}`
    const maxTitleWidth = width - 2 * M
    const maxSize = 16
    const minSize = 10
    let headingSize = 14

    let testSize = maxSize
    let headingWidth = bold.widthOfTextAtSize(headingBase, testSize)
    if (headingWidth > maxTitleWidth) {
      const scale = maxTitleWidth / headingWidth
      testSize = Math.max(minSize, Math.floor(testSize * scale))
    }
    headingSize = testSize

    page.drawText(headingBase, {
      x: M,
      y: y0,
      size: headingSize,
      font: bold,
    })
    y0 -= headingSize + (titleGap - 14) // ungefähr gleicher Abstand wie vorher

    // Intro-Text: vorhandenes o.intro verwenden, sonst Fallback
    const introText = (o.intro ??
      'Vielen Dank für Ihre Auftragsbestätigung. Nachfolgend die bestätigten Positionen:'
    )
      .toString()
      .replace(/\r\n/g, '\n')

    if (introText.trim()) {
      const introMaxW = width - 2 * M
      const introLineH = lineH
      const paras = introText.split('\n').map((s) => s.trim())

      let cursorY = y0
      for (const p of paras) {
        if (!p) {
          cursorY -= introLineH
          continue
        }
        const lines = getWrappedLines(p, introMaxW, font, 10)
        cursorY =
          drawLines(page, lines, M, cursorY, introLineH, font, 10) -
          introLineH
      }
      y0 = cursorY - 6
    } else {
      y0 -= 18
    }

    // Tabelle: Platz prüfen, ggf. neue Seite
    let tableY0 = y0 - headerOffsetFirst
    if (tableY0 < footerH + minSpaceToFooter + 40) {
      const [p] = await pdf.copyPages(tplDoc, [0])
      page = pdf.addPage(p)

      const topY2 = height - M
      const logoBoxBottom2 = topY2 - reservedLogoH
      if (logoImage) {
        const imgY2 =
          logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
        page.drawImage(logoImage, {
          x: imgX,
          y: imgY2,
          width: imgDims.width,
          height: imgDims.height,
        })
      }

      tableY0 = logoBoxBottom2 - 34
    }

    drawTableHeader(page, M, width, tableY0, gray, bold, priceX, totalX)
    let rowY = tableY0 - initialGapFirst

    const newPage = async () => {
      const [p] = await pdf.copyPages(tplDoc, [0])
      page = pdf.addPage(p)
      const topY2 = height - M
      const logoBoxBottom2 = topY2 - reservedLogoH
      if (logoImage) {
        const imgY2 =
          logoBoxBottom2 + (reservedLogoH - imgDims.height) / 2
        page.drawImage(logoImage, {
          x: imgX,
          y: imgY2,
          width: imgDims.width,
          height: imgDims.height,
        })
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
        lines = getWrappedLines(
          p.description || '',
          width - M - descX,
          font,
          10,
        )
        requiredH = Math.max(1, lines.length) * lineH + rowSpacing
      }
      if (rowY - requiredH < footerH + minSpaceToFooter) await newPage()

      if (p.type === 'item') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        page.drawText((p.quantity ?? 0).toString(), {
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
        page.drawText(fmt(p.unitPrice ?? 0), {
          x: priceX,
          y: rowY,
          size: 10,
          font,
        })
        const tot = fmt((p.quantity ?? 0) * (p.unitPrice ?? 0))
        const tw = font.widthOfTextAtSize(tot, 10)
        page.drawText(tot, {
          x: totalX - tw,
          y: rowY,
          size: 10,
          font,
        })
        rowY = endY - lineH - rowSpacing
      } else if (p.type === 'heading') {
        page.drawText(p.description ?? '', {
          x: descX,
          y: rowY,
          size: 10,
          font: bold,
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
            0,
          )
        const subStr = fmt(sub)
        page.drawText('Zwischensumme:', {
          x: descX,
          y: rowY,
          size: 10,
          font: bold,
        })
        page.drawText(subStr, {
          x: totalX - bold.widthOfTextAtSize(subStr, 10),
          y: rowY,
          size: 10,
          font: bold,
        })
        rowY -= lineH + rowSpacing
      } else if (p.type === 'separator') {
        page.drawLine({
          start: { x: M, y: rowY },
          end: { x: width - M, y: rowY },
          thickness: 0.5,
          color: gray,
        })
        rowY -= lineH + rowSpacing
      }
    }

    /* ========== Summen mit Rabatt (wie Angebot) ========== */
    const taxRate = Number(o.tax_rate ?? 0)
    const taxFactor = 1 + taxRate / 100
    const netSubtotal = positions.reduce<number>(
      (s, p) =>
        s +
        (p.type === 'item'
          ? (p.quantity ?? 0) * (p.unitPrice ?? 0)
          : 0),
      0,
    )
    const grossBefore = netSubtotal * taxFactor

    const offerDiscountRaw = (o.discount ?? null) as Discount | null
    const discount: Discount = {
      enabled: !!offerDiscountRaw?.enabled,
      label: (offerDiscountRaw?.label ?? 'Rabatt').toString(),
      type: (offerDiscountRaw?.type as DiscountType) ?? 'percent',
      base: (offerDiscountRaw?.base as DiscountBase) ?? 'net',
      value: Number(offerDiscountRaw?.value ?? 0),
    }

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
        discountAmount = Math.min(
          Math.max(0, discountAmount),
          netSubtotal,
        )
        netAfterDiscount = clamp(netSubtotal - discountAmount)
        taxAmount = netAfterDiscount * (taxFactor - 1)
        grossTotal = netAfterDiscount + taxAmount
      } else {
        // base: 'gross'
        discountAmount =
          discount.type === 'percent'
            ? (grossBefore * discount.value) / 100
            : discount.value
        discountAmount = Math.min(
          Math.max(0, discountAmount),
          grossBefore,
        )
        const grossAfter = clamp(grossBefore - discountAmount)
        netAfterDiscount = grossAfter / taxFactor
        taxAmount = grossAfter - netAfterDiscount
        grossTotal = grossAfter
      }
    } else {
      taxAmount = netSubtotal * (taxFactor - 1)
      grossTotal = netSubtotal + taxAmount
    }

    // Platz für Summenblock prüfen
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
      color: gray,
    })

    let sy = sumY + 2
    // Netto
    page.drawText('Netto', { x: M, y: sy, size: 10, font })
    page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
    {
      const s = fmt(netSubtotal)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy,
        size: 10,
        font,
      })
    }
    sy -= 16

    // Rabatt (falls aktiv)
    if (discount.enabled && discount.value > 0) {
      const label = discount.label?.trim()
        ? discount.label.trim()
        : 'Rabatt'
      const suffix =
        discount.type === 'percent'
          ? ` (${String(discount.value).replace('.', ',')}%)`
          : ''
      const basis =
        discount.base === 'net' ? 'auf Netto' : 'auf Brutto'
      page.drawText(`${label} – ${basis}${suffix}`, {
        x: M,
        y: sy,
        size: 10,
        font,
      })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      {
        const s = `-${fmt(discountAmount)}`
        page.drawText(s, {
          x: totalX - font.widthOfTextAtSize(s, 10),
          y: sy,
          size: 10,
          font,
        })
      }
      sy -= 16

      page.drawText('Netto nach Rabatt', {
        x: M,
        y: sy,
        size: 10,
        font,
      })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      {
        const s = fmt(netAfterDiscount)
        page.drawText(s, {
          x: totalX - font.widthOfTextAtSize(s, 10),
          y: sy,
          size: 10,
          font,
        })
      }
      sy -= 16
    }

    // USt
    {
      const taxLabel = `USt (${taxRate
        .toFixed(2)
        .replace('.', ',')} %)`
      page.drawText(taxLabel, {
        x: M,
        y: sy,
        size: 10,
        font,
      })
      page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
      const s = fmt(taxAmount)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy,
        size: 10,
        font,
      })
    }
    sy -= 16

    // Brutto
    page.drawText('Brutto', { x: M, y: sy, size: 10, font })
    page.drawText('EUR', { x: priceX, y: sy, size: 10, font })
    {
      const s = fmt(grossTotal)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy,
        size: 10,
        font,
      })
    }
    sy -= 16

    // Hinweiszeile (Rabatt)
    if (discount.enabled && discount.value > 0) {
      const note = `Hinweis: Es wurde ein Rabatt namens "${
        discount.label?.trim() || 'Rabatt'
      }" angewendet.`
      const noteY = Math.max(footerH + 22, sy - 22)
      page.drawText(note, {
        x: M,
        y: noteY,
        size: 9,
        font,
        color: rgb(0.25, 0.25, 0.25),
      })
    }

    // Fußzeilen
    const pages = pdf.getPages()
    for (const pg of pages) {
      pg.drawLine({
        start: { x: M, y: footerH },
        end: { x: width - M, y: footerH },
        thickness: 0.5,
        color: gray,
      })
      const left = prof.company_name?.trim()
        ? [
            prof.company_name,
            `${prof.street} ${prof.house_number}`,
            `${prof.postal_code} ${prof.city}`,
          ]
        : [
            `${prof.first_name} ${prof.last_name}`,
            `${prof.street} ${prof.house_number}`,
            `${prof.postal_code} ${prof.city}`,
          ]
      left.forEach((t, i) =>
        pg.drawText(t, {
          x: M,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        }),
      )

      const mid = [
        `Kontoinhaber: ${bs.account_holder}`,
        `IBAN: ${bs.iban}`,
        `BIC: ${bs.bic}`,
      ]
      mid.forEach((t, i) => {
        const w = font.widthOfTextAtSize(t, 9)
        pg.drawText(t, {
          x: width / 2 - w / 2,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        })
      })

      const right = [
        `Tel: ${bs.billing_phone}`,
        `E-Mail: ${bs.billing_email}`,
        prof.website ?? '',
      ]
      right.forEach((t, i) => {
        const w = font.widthOfTextAtSize(t, 9)
        pg.drawText(t, {
          x: width - M - w,
          y: footerH - 12 - i * 11,
          size: 9,
          font,
        })
      })
    }

    // Datei speichern / hochladen
    const bytes = await pdf.save()
    const safe = (s: string) =>
      (s || '')
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '')
    const fname =
      [
        'Auftragsbestaetigung',
        safe(ocNumber),
        safe(customer.customer_number ?? ''),
      ]
        .filter(Boolean)
        .join('_') + '.pdf'
    const filePath = `auftrag/${fname}`

    const { error: upErr } = await supabaseAdmin
      .storage.from('dokumente')
      .upload(filePath, Buffer.from(bytes), {
        upsert: true,
        contentType: 'application/pdf',
      })
    if (upErr) throw new Error('Upload fehlgeschlagen')

    // Payload inkl. Rabatt/Summen
    const payload = {
      user_id: user.id,
      customer_id: o.customer_id,
      order_confirmation_number: ocNumber,
      from_offer_number: o.offer_number,
      date: o.date,
      title: `Auftragsbestätigung – ${displayName}`,
      intro:
        'Vielen Dank für Ihre Auftragsbestätigung. Nachfolgend die bestätigten Positionen:',
      tax_rate: o.tax_rate,
      positions,
      pdf_path: filePath,
      status: 'Erstellt' as const,
      status_changed_at: new Date().toISOString(),
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

    const { error: insertErr } = await supabaseAdmin
      .from('order_confirmations')
      .insert(payload)
    if (insertErr) throw new Error('DB-Insert fehlgeschlagen')

    // Angebot auf „Bestätigt“
    const { error: statusErr } = await supabaseAdmin
      .from('offers')
      .update({
        status: 'Bestätigt',
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('offer_number', offerNumber)
    if (statusErr)
      console.error('Status-Update fehlgeschlagen:', statusErr)

    // Download
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    return new NextResponse(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    })
  } catch (err: any) {
    console.error(
      '[auftrag/generate-from-offer] ERROR:',
      err?.message || err,
    )
    return NextResponse.json(
      { message: err?.message || 'Fehler' },
      { status: 500 },
    )
  }
}
