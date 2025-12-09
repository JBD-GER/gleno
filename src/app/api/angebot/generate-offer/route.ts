// src/app/api/angebot/generate-offer/route.ts
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

function sanitize(text: string): string {
  return (text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, '')
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
  tableY0: number,
  grayLine: ReturnType<typeof rgb>,
  fontBold: PDFFont,
  priceX: number,
  totalX: number,
) {
  page.drawText('Position', {
    x: M + 4,
    y: tableY0 + 6,
    size: 10,
    font: fontBold,
  })
  page.drawText('Anzahl', {
    x: M + 260,
    y: tableY0 + 6,
    size: 10,
    font: fontBold,
  })
  page.drawText('Einheit', {
    x: M + 320,
    y: tableY0 + 6,
    size: 10,
    font: fontBold,
  })
  page.drawText('Preis', {
    x: priceX,
    y: tableY0 + 6,
    size: 10,
    font: fontBold,
  })
  const label = 'Total'
  const tw = fontBold.widthOfTextAtSize(label, 10)
  page.drawText(label, {
    x: totalX - tw,
    y: tableY0 + 6,
    size: 10,
    font: fontBold,
  })
  page.drawLine({
    start: { x: M, y: tableY0 },
    end: { x: width - M, y: tableY0 },
    thickness: 0.5,
    color: grayLine,
  })
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Deutsche Formatierung: 1.000.000,00
const fmt = (v: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0)

export async function POST(req: NextRequest) {
  try {
    // 1) User
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Nicht eingeloggt')

    // 2) Settings + Profil
    const { data: bsData, error: bsErr } = await supabaseAdmin
      .from('billing_settings')
      .select(
        'account_holder,iban,bic,billing_phone,billing_email,quote_prefix,quote_start,quote_suffix',
      )
      .eq('user_id', user.id)
      .single()
    if (bsErr || !bsData) throw new Error('Billing-Settings nicht gefunden')

    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'first_name,last_name,company_name,street,house_number,postal_code,city,logo_path,website',
      )
      .eq('id', user.id)
      .single()
    if (profErr || !prof) throw new Error('Profil-Daten nicht gefunden')
    const profile = prof as Profile

    // 3) Payload
    const { customer, meta, positions: rawPositions } = await req.json()
    const positions: Position[] = Array.isArray(rawPositions) ? rawPositions : []

    const {
      date,
      validUntil,
      title,
      intro,
      taxRate,
      billingSettings,
      offerId,
      commit,
      discount: metaDiscount,
      idempotencyKey: metaIdemKey,
      offerNumber: clientOfferNumber, // <- vom Frontend (next-offer-number)
    } = (meta ?? {}) as {
      date: string
      validUntil: string
      title: string
      intro: string
      taxRate: number
      billingSettings: { template: string }
      offerId?: string
      commit?: boolean
      discount?: Discount
      idempotencyKey?: string
      offerNumber?: string
    }

    const discount: Discount = {
      enabled: !!metaDiscount?.enabled,
      label: (metaDiscount?.label ?? 'Rabatt').toString(),
      type: (metaDiscount?.type as DiscountType) ?? 'percent',
      base: (metaDiscount?.base as DiscountBase) ?? 'net',
      value: Number(metaDiscount?.value ?? 0),
    }

    // 4) Idempotency-Key
    const idempotencyKey =
      req.headers.get('x-idempotency-key')?.trim() ||
      metaIdemKey?.trim() ||
      null

    // --------------------------------------------------------
    // 5) Angebotsnummer bestimmen – ohne Doppel-Inkrement
    // --------------------------------------------------------
    let offerNumber: string | undefined =
      clientOfferNumber?.toString().trim() || undefined

    if (commit) {
      const isUpdate = Boolean(offerId && String(offerId).length)

      if (isUpdate) {
        // Update: Nummer aus DB (nicht verändern)
        const { data: existing, error: exErr } = await supabaseAdmin
          .from('offers')
          .select('offer_number')
          .eq('user_id', user.id)
          .eq('id', offerId)
          .maybeSingle()
        if (exErr) throw new Error('Angebot zum Aktualisieren nicht gefunden')

        // Falls Client hier eine Nummer mitschickt, ignorieren wir sie und nehmen die DB-Nummer
        offerNumber = existing?.offer_number ?? offerNumber
      } else {
        // Neuer Datensatz
        if (!offerNumber) {
          // Client hat KEINE Nummer mitgeschickt -> Server vergibt jetzt eine und erhöht Zähler
          const nextQuoteNumber = Number(bsData.quote_start ?? 0) + 1
          const { error: updErr } = await supabaseAdmin
            .from('billing_settings')
            .update({ quote_start: nextQuoteNumber })
            .eq('user_id', user.id)
          if (updErr)
            throw new Error('Konnte neuen Quote-Startwert nicht speichern')
          offerNumber = `${bsData.quote_prefix ?? ''}${nextQuoteNumber}${
            bsData.quote_suffix ?? ''
          }`
        }
        // Wenn offerNumber vom Client kam: NICHT erhöhen, einfach verwenden
      }
    } else {
      // Preview (commit:false): NIEMALS incrementieren
      // - Falls offerId existiert: bestehende Nummer anzeigen
      if (offerId && !offerNumber) {
        const { data: existing } = await supabaseAdmin
          .from('offers')
          .select('offer_number')
          .eq('user_id', user.id)
          .eq('id', offerId)
          .maybeSingle()
        offerNumber = existing?.offer_number ?? undefined
      }
      // - Falls keine Nummer vorhanden (weder Client noch DB): einfach leer lassen (PDF zeigt '—')
    }

    // --------------------------------------------------------
    // 6) PDF-Vorlage laden
    // --------------------------------------------------------
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from('rechnungvorlagen')
      .getPublicUrl(billingSettings.template)
    if (!publicUrl) throw new Error('Template nicht gefunden')
    const tplBytes = await (await fetch(publicUrl)).arrayBuffer()
    const templateDoc = await PDFDocument.load(tplBytes)

    // 7) PDF erstellen
    const pdfDoc = await PDFDocument.create()
    const [tplPageRef] = await pdfDoc.copyPages(templateDoc, [0])
    let page = pdfDoc.addPage(tplPageRef)
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Logo – Layout-Box wie früher, tatsächliche Logo-Höhe kleiner
    let logoImage: any = null
    let imgDims = { width: 0, height: 0 }
    let imgX = 0
    const M = 32

    // Layout-Box für Logo (wie vorher, damit Adressblock wieder auf Fensterhöhe)
    const reservedLogoH = 120 // Box-Höhe für Layout
    const maxLogoDrawH = 80   // effektive max. Höhe des Logos (kleiner)
    const reservedLogoW = Math.min(width - 2 * (M + 8), 260)

    if (profile.logo_path) {
      const { data: blob } = await supabaseAdmin.storage
        .from('logo')
        .download(profile.logo_path)
      if (blob) {
        const arr = await (blob as Blob).arrayBuffer()
        const mime = (blob as Blob).type || ''
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
          imgDims = {
            width: logoImage.width * s,
            height: logoImage.height * s,
          }
          imgX = (width - imgDims.width) / 2
        }
      }
    }

    // Summen (mit Rabatt)
    const netSubtotal = positions.reduce<number>(
      (s, p) =>
        s +
        (p.type === 'item'
          ? (p.quantity ?? 0) * (p.unitPrice ?? 0)
          : 0),
      0,
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

    // Layout
    const grayLine = rgb(0.8, 0.8, 0.8)
    const footerH = 40 // Footer deutlich weiter nach unten (statt height * 0.1)
    const minSpaceToFooter = 5
    const lineH = 12
    const rowSpacing = 4
    const initialGapFirst = 14
    const initialGapNext = 8
    const headerOffsetFirst = 36
    const priceX = width - M - 125
    const totalX = width - M - 10

    // Kopf (Absender)
    const topY = height - M
    const logoBoxBottom = topY - reservedLogoH
    if (logoImage) {
      const imgY =
        logoBoxBottom + (reservedLogoH - imgDims.height) / 2
      page.drawImage(logoImage, {
        x: imgX,
        y: imgY,
        width: imgDims.width,
        height: imgDims.height,
      })
    }
    const baseY = logoBoxBottom - 20
    const headerCompanyOrName = profile.company_name?.trim()
      ? profile.company_name
      : `${profile.first_name} ${profile.last_name}`
    const headerAddress =
      `${headerCompanyOrName} – ${profile.street} ${profile.house_number}` +
      ` – ${profile.postal_code} ${profile.city}`
    page.drawText(headerAddress, { x: M, y: baseY, size: 9, font })

    // Kunde
    const cFirst = ((customer as any).first_name ?? '').toString().trim()
    const cLast = ((customer as any).last_name ?? '').toString().trim()
    const cCompany = ((customer as any).company ?? '').toString().trim()
    const displayName = (cCompany || `${cFirst} ${cLast}`.trim()).trim()

    const cStreet = ((customer as any).street ?? '').toString().trim()
    const cHausnr = ((customer as any).house_number ?? '').toString().trim()
    const cPostal = ((customer as any).postal_code ?? '').toString().trim()
    const cCity = ((customer as any).city ?? '').toString().trim()

    let custY = baseY - 20
    page.drawText(displayName, { x: M, y: custY, size: 10, font: fontBold })
    if (cStreet || cHausnr) {
      custY -= 13
      page.drawText(`${cStreet} ${cHausnr}`.trim(), {
        x: M,
        y: custY,
        size: 10,
        font,
      })
    }
    if (cPostal || cCity) {
      custY -= 13
      page.drawText(`${cPostal} ${cCity}`.trim(), {
        x: M,
        y: custY,
        size: 10,
        font,
      })
    }

    // Meta rechts – inkl. Angebotsnr. (NICHT erhöhen)
    let metaY = baseY
    const metaX = width - M - 150
    page.drawText('Angebotsnr.:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(String(offerNumber ?? '—'), {
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
    page.drawText(date ?? '', {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    page.drawText('Gültig bis:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(validUntil ?? '', {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })
    metaY -= 13
    const customerNumberDisplay = (customer as any).customer_number ?? '—'
    page.drawText('Kundennr.:', {
      x: metaX,
      y: metaY,
      size: 10,
      font: fontBold,
    })
    page.drawText(String(customerNumberDisplay), {
      x: metaX + 80,
      y: metaY,
      size: 10,
      font,
    })

    // Titel & Intro (mit sauberem Umbruch und Seitenplatz-Prüfung)
    let y0 = Math.min(custY, metaY) - 70

    // Titel (einzeilig, dynamische Größe je nach Länge)
    const titleStr = (title ?? '').toString().trim()
    if (titleStr) {
      const maxTitleWidth = width - 2 * M
      const maxSize = 16
      const minSize = 10
      let titleSize = 14 // Basis etwas kleiner

      // Start bei maxSize, ggf. verkleinern wenn zu lang
      let testSize = maxSize
      let titleWidth = fontBold.widthOfTextAtSize(titleStr, testSize)
      if (titleWidth > maxTitleWidth) {
        const scale = maxTitleWidth / titleWidth
        testSize = Math.max(minSize, Math.floor(testSize * scale))
      }
      titleSize = testSize

      page.drawText(titleStr, {
        x: M,
        y: y0,
        size: titleSize,
        font: fontBold,
      })
      y0 -= titleSize + 12
    }

    // Intro: Absätze (\n) + Wortumbruch über die volle Textbreite
    const introStr = (intro ?? '').toString().replace(/\r\n/g, '\n')
    if (introStr.trim()) {
      const introLineH = lineH
      const introMaxW = width - 2 * M
      const paras = introStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      let cursorY = y0
      for (let p = 0; p < paras.length; p++) {
        const lines = getWrappedLines(paras[p], introMaxW, font, 10)
        cursorY =
          drawLines(page, lines, M, cursorY, introLineH, font, 10) -
          introLineH // kleiner Absatzabstand
      }
      y0 = cursorY - 6 // kleiner Gap nach Intro
    } else {
      y0 -= 18 // kein Intro => Standardabstand
    }

    // Falls der Platz nach Intro zu gering ist, beginne die Tabelle auf einer neuen Seite
    let tableY0 = y0 - headerOffsetFirst
    if (tableY0 < footerH + minSpaceToFooter + 40) {
      const [newTpl] = await pdfDoc.copyPages(templateDoc, [0])
      page = pdfDoc.addPage(newTpl)
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
      // Tabelle auf neuer Seite oben starten
      tableY0 = logoBoxBottom2 - 34
    }

    // Tabellenkopf
    drawTableHeader(page, M, width, tableY0, grayLine, fontBold, priceX, totalX)
    let rowY = tableY0 - initialGapFirst

    const addNewContentPage = async () => {
      const [newTpl] = await pdfDoc.copyPages(templateDoc, [0])
      page = pdfDoc.addPage(newTpl)
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
      drawTableHeader(page, M, width, tableY0, grayLine, fontBold, priceX, totalX)
      rowY = tableY0 - initialGapNext
    }

    // Positionen
    const descX = M + 4
    const descW = M + 260 - descX - 4
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      let requiredH = lineH + rowSpacing
      let lines: string[] = []
      if (p.type === 'item' || p.type === 'description') {
        lines = getWrappedLines(
          p.description || '',
          p.type === 'item' ? descW : width - M - descX,
          font,
          10,
        )
        const n = Math.max(1, lines.length)
        requiredH = n * lineH + rowSpacing
      }
      if (rowY - requiredH < footerH + minSpaceToFooter)
        await addNewContentPage()

      if (p.type === 'item') {
        const endY = drawLines(page, lines, descX, rowY, lineH, font, 10)
        page.drawText((p.quantity ?? 0).toString(), {
          x: M + 260,
          y: rowY,
          size: 10,
          font,
        })
        page.drawText(p.unit || '', {
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
        const totalStr = fmt(
          (p.quantity ?? 0) * (p.unitPrice ?? 0),
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
            0,
          )
        const subStr = fmt(sub)
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

    // Summenblock
    const linesCount =
      discount.enabled && discount.value > 0 ? 5 : 3
    const summaryBlockH = 20 + linesCount * 16 + 12
    if (rowY - summaryBlockH < footerH + minSpaceToFooter) {
      const [newTpl] = await pdfDoc.copyPages(templateDoc, [0])
      page = pdfDoc.addPage(newTpl)
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
      rowY = logoBoxBottom2 - 40
    }

    const sumY = rowY - 50
    page.drawLine({
      start: { x: M, y: sumY + 18 },
      end: { x: width - M, y: sumY + 18 },
      thickness: 0.5,
      color: grayLine,
    })
    let sy2 = sumY + 2

    page.drawText('Netto', { x: M, y: sy2, size: 10, font })
    page.drawText('EUR', { x: priceX, y: sy2, size: 10, font })
    {
      const s = fmt(netSubtotal)
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
          ? ` (${Number(discount.value)
              .toString()
              .replace('.', ',')}%)`
          : ''
      const basis =
        discount.base === 'net' ? 'auf Netto' : 'auf Brutto'
      page.drawText(`${label} – ${basis}${suffix}`, {
        x: M,
        y: sy2,
        size: 10,
        font,
      })
      page.drawText('EUR', { x: priceX, y: sy2, size: 10, font })
      {
        const s = `-${fmt(discountAmount)}`
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
      page.drawText('EUR', { x: priceX, y: sy2, size: 10, font })
      {
        const s = fmt(netAfterDiscount)
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
      // USt
      const taxLabel = `USt (${Number(taxRate ?? 0)
        .toFixed(2)
        .replace('.', ',')} %)`
      page.drawText(taxLabel, {
        x: M,
        y: sy2,
        size: 10,
        font,
      })
      page.drawText('EUR', { x: priceX, y: sy2, size: 10, font })
      const s = fmt(taxAmount)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy2,
        size: 10,
        font,
      })
    }
    sy2 -= 16

    page.drawText('Brutto', { x: M, y: sy2, size: 10, font })
    page.drawText('EUR', { x: priceX, y: sy2, size: 10, font })
    {
      const s = fmt(grossTotal)
      page.drawText(s, {
        x: totalX - font.widthOfTextAtSize(s, 10),
        y: sy2,
        size: 10,
        font,
      })
    }
    sy2 -= 16

    if (discount.enabled && discount.value > 0) {
      const note = `Hinweis: Es wurde ein Rabatt namens "${
        discount.label?.trim() || 'Rabatt'
      }" angewendet.`
      const noteY = Math.max(footerH + 22, sy2 - 22)
      page.drawText(note, {
        x: M,
        y: noteY,
        size: 9,
        font,
        color: rgb(0.25, 0.25, 0.25),
      })
    }

    // Fußzeilen auf allen Seiten
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
        }),
      )

      const midLines = [
        `Kontoinhaber: ${bsData.account_holder}`,
        `IBAN: ${bsData.iban}`,
        `BIC: ${bsData.bic}`,
      ]
      midLines.forEach((ln, i) => {
        const w = font.widthOfTextAtSize(ln, 9)
        const centerX = width / 2
        pg.drawText(ln, {
          x: centerX - w / 2,
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

    // PDF Bytes
    const pdfBytes = await pdfDoc.save()

    // Upload + Dateiname
    const firstName = ((customer as any).first_name ?? '')
      .toString()
      .trim()
    const lastName = ((customer as any).last_name ?? '')
      .toString()
      .trim()
    const safeName = `${firstName} ${lastName}`
      .trim()
      .replace(/[^\w\s\-]/g, '')
      .replace(/\s+/g, '_')
    const custNo = (customer as any).customer_number
      ? `_${(customer as any).customer_number}`
      : ''
    const fileName = `${safeName || 'Kunde'}_${offerNumber || 'Angebot'}${custNo}.pdf`
    const filePath = `angebote/${fileName}`

    const { error: uploadErr } = await supabaseAdmin
      .storage.from('dokumente')
      .upload(filePath, Buffer.from(pdfBytes), { upsert: true })
    if (uploadErr) throw new Error('Upload fehlgeschlagen')

    // Persistenz nur bei commit
    let savedId: string | undefined
    let savedNumber: string | undefined

    if (commit) {
      // 🔁 Update-Detection via offer_number (falls offerId fehlt)
      let effectiveOfferId =
        offerId && String(offerId).length ? String(offerId) : undefined
      if (!effectiveOfferId && offerNumber) {
        const { data: existingByNo } = await supabaseAdmin
          .from('offers')
          .select('id, offer_number')
          .eq('user_id', user.id)
          .eq('offer_number', offerNumber)
          .maybeSingle()
        if (existingByNo) {
          effectiveOfferId = existingByNo.id
          // Sicherheitsnetz: übernehme exakt die DB-Nummer
          offerNumber = existingByNo.offer_number
        }
      }

      const payload = {
        user_id: user.id,
        customer_id: (customer as any).id,
        offer_number: offerNumber || null,
        date,
        valid_until: validUntil,
        title,
        intro,
        tax_rate: taxRate,
        positions,
        pdf_path: filePath,
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
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      }

      if (effectiveOfferId) {
        const { error: updErr } = await supabaseAdmin
          .from('offers')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('id', effectiveOfferId)
        if (updErr) throw new Error('DB-Update fehlgeschlagen')
        savedId = effectiveOfferId
        savedNumber = offerNumber || undefined
      } else {
        const { data: ins, error: insErr } = await supabaseAdmin
          .from('offers')
          .insert({
            ...payload,
            status: 'Erstellt',
            status_changed_at: new Date().toISOString(),
          })
          .select('id, offer_number')
          .single()
        if (insErr)
          throw new Error('DB-Insert fehlgeschlagen: ' + insErr.message)
        savedId = ins?.id
        savedNumber = ins?.offer_number ?? offerNumber ?? undefined
      }

      const ab = new ArrayBuffer(pdfBytes.byteLength)
      new Uint8Array(ab).set(pdfBytes)
      return new Response(ab, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Offer-Id': savedId ?? '',
          'X-Offer-Number': savedNumber ?? offerNumber ?? '',
        },
      })
    }

    // Preview-Response
    const ab = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(ab).set(pdfBytes)
    return new Response(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Offer-Id': '',
        'X-Offer-Number': offerNumber ?? '',
      },
    })
  } catch (err: any) {
    console.error('[angebot/generate-offer] ERROR:', err?.message || err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim Erstellen/Speichern' },
      { status: 500 },
    )
  }
}
