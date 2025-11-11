// src/app/api/templates/[template]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ template: string }> }
) {
  // await the dynamic params before accessing
  const { template } = await context.params

  const { data, error } = await supabase
    .from('notification_templates')
    .select('subject, html_content')
    .eq('template_key', template)
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ template: string }> }
) {
  // await the dynamic params before accessing
  const { template } = await context.params

  const body = await req.json()
  const { subject, htmlContent } = body

  const { error } = await supabase
    .from('notification_templates')
    .upsert({
      template_key:  template,
      subject,
      html_content: htmlContent,
      updated_at:    new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
