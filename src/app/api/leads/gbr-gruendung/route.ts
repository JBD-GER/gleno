// src/app/api/leads/gbr-gruendung/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendBrevo } from '@/app/mails/sendBrevo'
import {
  renderGbrStarterpaketMail,
  renderGbrLeadInternal,
} from '@/app/mails/emailTemplates'
import fs from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const email = (form.get('email') as string | null)?.trim()
    const phone = (form.get('phone') as string | null)?.trim() || undefined

    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'E-Mail-Adresse fehlt.' },
        { status: 400 }
      )
    }

    // Dateien aus /public/gbr laden
    const baseDir = path.join(process.cwd(), 'public', 'gbr')

    type FileDef = {
      filename: string
      filepath: string
      contentType: string
    }

    const files: FileDef[] = [
      {
        filename: 'GbR-grunden-2025-Der-komplette-Leitfaden.pdf',
        filepath: path.join(
          baseDir,
          'GbR-grunden-2025-Der-komplette-Leitfaden.pdf'
        ),
        contentType: 'application/pdf',
      },
      {
        filename: 'Einfache-Checkliste-Grundung-einer-GbR.pdf',
        filepath: path.join(
          baseDir,
          'Einfache-Checkliste-Grundung-einer-GbR.pdf'
        ),
        contentType: 'application/pdf',
      },
      {
        filename: 'muster_gbr_vertrag_2025_2026.docx',
        filepath: path.join(baseDir, 'muster_gbr_vertrag_2025_2026.docx'),
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      {
        filename: 'Finanzplanung_2025.xlsx',
        filepath: path.join(baseDir, 'Finanzplanung_2025.xlsx'),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      {
        filename: 'Woche-1-Grundlagen-and-Formalitäten.pdf',
        filepath: path.join(
          baseDir,
          'Woche-1-Grundlagen-and-Formalitäten.pdf'
        ),
        contentType: 'application/pdf',
      },
      {
        filename: 'Woche-2-Finanzen-Konto-and-Basis-Infrastruktur.pdf',
        filepath: path.join(
          baseDir,
          'Woche-2-Finanzen-Konto-and-Basis-Infrastruktur.pdf'
        ),
        contentType: 'application/pdf',
      },
      {
        filename: 'Woche-3-Professioneller-Auftritt-and-Angebotsprozess.pdf',
        filepath: path.join(
          baseDir,
          'Woche-3-Professioneller-Auftritt-and-Angebotsprozess.pdf'
        ),
        contentType: 'application/pdf',
      },
      {
        filename: 'Woche-4-Erste-Kunden-and-operative-Routine.pdf',
        filepath: path.join(
          baseDir,
          'Woche-4-Erste-Kunden-and-operative-Routine.pdf'
        ),
        contentType: 'application/pdf',
      },
    ]

    const attachmentsJson = JSON.stringify(
      await Promise.all(
        files.map(async (f) => {
          const data = await fs.readFile(f.filepath)
          return {
            filename: f.filename,
            contentType: f.contentType,
            base64: data.toString('base64'),
          }
        })
      )
    )

    // 1) Mail an User mit allen Anhängen
    {
      const fd = new FormData()
      fd.set('to', email)
      fd.set('subject', 'Ihr Starterpaket „GbR gründen 2025“')
      fd.set(
        'htmlContent',
        renderGbrStarterpaketMail({
          email,
        })
      )
      fd.set(
        'textContent',
        'Vielen Dank für Ihr Interesse an der Gründung einer GbR. Im Anhang finden Sie den Leitfaden, die Checkliste, den Mustervertrag, die Finanzplanung und den 30-Tage-Plan.'
      )
      fd.set('attachmentsJson', attachmentsJson)

      await sendBrevo(fd)
    }

    // 2) Interne Mail an support@gleno.de ohne Anhänge
    {
      const fdInternal = new FormData()
      fdInternal.set('to', 'support@gleno.de')
      fdInternal.set('subject', 'Neuer GbR-Starterpaket-Lead')
      fdInternal.set(
        'htmlContent',
        renderGbrLeadInternal({
          email,
          phone,
        })
      )
      fdInternal.set(
        'textContent',
        `Neuer Lead für das GbR-Starterpaket.\nE-Mail: ${email}\nTelefon: ${
          phone ?? '-'
        }`
      )

      await sendBrevo(fdInternal)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[gbr-gruendung] error', error)
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Versand der E-Mail.' },
      { status: 500 }
    )
  }
}
