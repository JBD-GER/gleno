// src/lib/ai-draft.ts

export type AIDraftPosition = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
}

export type AIDraftDiscount = {
  enabled?: boolean | string | number
  label?: string
  type?: 'percent' | 'amount'
  base?: 'net' | 'gross'
  value?: number
}

export type AIDraft = {
  title?: string
  intro?: string
  tax_rate?: number
  discount?: AIDraftDiscount | null
  positions: AIDraftPosition[]
}

/* ===================== Helpers ===================== */

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.toLowerCase().trim() === 'true'
  return false
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asDiscountType(v: unknown): 'percent' | 'amount' {
  return v === 'amount' ? 'amount' : 'percent'
}

function asDiscountBase(v: unknown): 'net' | 'gross' {
  return v === 'gross' ? 'gross' : 'net'
}

/**
 * Platzhalter ersetzen – unterstützt z. B.:
 * {{customer.first_name}}, {{customer.last_name}}, {{customer.company}},
 * {{customer.display_name}}, {{customer.street}}, {{customer.house_number}},
 * {{customer.postal_code}}, {{customer.city}}, {{customer.address}}, {{today}}
 */
export function replacePlaceholders(input: string, customer: any): string {
  if (!input) return input
  const first = (customer?.first_name ?? '').toString().trim()
  const last = (customer?.last_name ?? '').toString().trim()
  const company = (customer?.company ?? '').toString().trim()
  const street = (customer?.street ?? '').toString().trim()
  const house  = (customer?.house_number ?? '').toString().trim()
  const postal = (customer?.postal_code ?? '').toString().trim()
  const city   = (customer?.city ?? '').toString().trim()

  const displayName = (company || `${first} ${last}`.trim()).trim()
  const address2 = [street, house].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const address3 = [postal, city].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const address = [displayName, address2, address3].filter(Boolean).join('\n')

  const map: Record<string, string> = {
    '{{customer.first_name}}': first,
    '{{customer.last_name}}': last,
    '{{customer.company}}': company,
    '{{customer.display_name}}': displayName,
    '{{customer.street}}': street,
    '{{customer.house_number}}': house,
    '{{customer.postal_code}}': postal,
    '{{customer.city}}': city,
    '{{customer.address}}': address,
    '{{today}}': new Date().toISOString().slice(0, 10),
  }

  return Object.entries(map).reduce((s, [k, v]) => s.replaceAll(k, v), input)
}

/* ===================== Normalisierung ===================== */

export function normalizeDraft(raw: any): AIDraft {
  const rawPositions: any[] = Array.isArray(raw?.positions) ? raw.positions : []
  const safePositions: AIDraftPosition[] = rawPositions.map((p: any) => {
    const allowed = ['item', 'heading', 'description', 'subtotal', 'separator'] as const
    const type = allowed.includes(p?.type) ? p.type : 'item'
    return {
      type,
      description: typeof p?.description === 'string' ? p.description : '',
      quantity: Number.isFinite(p?.quantity) ? Number(p.quantity) : undefined,
      unit: typeof p?.unit === 'string' ? p.unit : undefined,
      unitPrice: Number.isFinite(p?.unitPrice) ? Number(p.unitPrice) : undefined,
    }
  })

  const tax = Number.isFinite(raw?.tax_rate) ? Number(raw.tax_rate) : 19

  const rawDiscount: AIDraftDiscount | null = raw?.discount ?? null
  const normalizedDiscount: AIDraft['discount'] =
    rawDiscount
      ? {
          enabled: toBool(rawDiscount.enabled),
          label: typeof rawDiscount.label === 'string' ? rawDiscount.label : 'Rabatt',
          type: asDiscountType(rawDiscount.type),
          base: asDiscountBase(rawDiscount.base),
          value: toNumber(rawDiscount.value, 0),
        }
      : null

  return {
    title: typeof raw?.title === 'string' ? raw.title : undefined,
    intro: typeof raw?.intro === 'string' ? raw.intro : undefined,
    tax_rate: tax,
    discount: normalizedDiscount,
    positions: safePositions,
  }
}
