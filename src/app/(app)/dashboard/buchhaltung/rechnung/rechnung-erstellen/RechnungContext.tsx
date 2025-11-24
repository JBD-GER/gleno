'use client'

// src/app/(app)/dashboard/buchhaltung/rechnung/rechnung-erstellen/RechnungContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'

export interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  company?: string | null
  customer_number?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
}

export interface BillingSettings {
  invoice_prefix: string
  invoice_start: number
  invoice_suffix: string
  template: string
}

export interface Position {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description: string
  quantity?: number
  unit?: string
  unitPrice?: number
}

export type DiscountType = 'percent' | 'amount'
export type DiscountBase = 'net' | 'gross'
export interface Discount {
  enabled: boolean
  label: string
  type: DiscountType
  base: DiscountBase
  value: number
}

export interface InitialData {
  invoiceNumber: string
  selectedCustomer: Customer
  date: string
  validUntil: string
  title: string
  intro: string
  positions: Position[]
  taxRate: number
  discount?: Discount
}

interface RechnungContextValue {
  customers: Customer[]
  billingSettings: BillingSettings
  isEdit: boolean

  selectedCustomer: Customer | null
  setSelectedCustomer: Dispatch<SetStateAction<Customer | null>>

  title: string
  setTitle: Dispatch<SetStateAction<string>>
  intro: string
  setIntro: Dispatch<SetStateAction<string>>
  invoiceNumber: string
  setinvoiceNumber: Dispatch<SetStateAction<string>>
  date: string
  setDate: Dispatch<SetStateAction<string>>
  validUntil: string
  setValidUntil: Dispatch<SetStateAction<string>>
  positions: Position[]
  setPositions: Dispatch<SetStateAction<Position[]>>
  taxRate: number
  setTaxRate: Dispatch<SetStateAction<number>>

  discount: Discount
  setDiscount: Dispatch<SetStateAction<Discount>>
}

const RechnungContext = createContext<RechnungContextValue | undefined>(
  undefined
)

export function useRechnung() {
  const ctx = useContext(RechnungContext)
  if (!ctx) throw new Error('useRechnung must be inside RechnungProvider')
  return ctx
}

export function RechnungProvider({
  children,
  customers,
  billingSettings,
  initialinvoiceNumber,
  initialData,
  isEdit = false,
}: {
  children: ReactNode
  customers: Customer[]
  billingSettings: BillingSettings
  initialinvoiceNumber?: string
  initialData?: InitialData
  isEdit?: boolean
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData?.selectedCustomer ?? null
  )

  const [title, setTitle] = useState(initialData?.title ?? 'Rechnung – ')
  const [intro, setIntro] = useState(
    initialData?.intro ?? 'Wir haben folgende Leistungen zusammengestellt:'
  )
  const [invoiceNumber, setinvoiceNumber] = useState(
    initialData?.invoiceNumber ?? initialinvoiceNumber ?? ''
  )
  const [date, setDate] = useState(initialData?.date ?? '')
  const [validUntil, setValidUntil] = useState(initialData?.validUntil ?? '')
  const [positions, setPositions] = useState<Position[]>(
    initialData?.positions ?? [
      { type: 'item', description: '', quantity: 1, unit: 'Stück', unitPrice: 0 },
    ]
  )
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 19)

  const [discount, setDiscount] = useState<Discount>(
    initialData?.discount ?? {
      enabled: false,
      label: 'Rabatt',
      type: 'percent',
      base: 'net',
      value: 0,
    }
  )

  useEffect(() => {
    if (!isEdit) {
      const first = (selectedCustomer?.first_name ?? '').trim()
      const last = (selectedCustomer?.last_name ?? '').trim()
      const company = (selectedCustomer?.company ?? '').trim()
      const displayName = company || `${first} ${last}`.trim()

      setTitle((prev) =>
        prev && prev !== 'Rechnung – ' ? prev : `Rechnung – ${displayName}`
      )

      const today = new Date()
      setDate((d) => d || today.toISOString().slice(0, 10))
      const until = new Date(today)
      until.setDate(until.getDate() + 14)
      setValidUntil((v) => v || until.toISOString().slice(0, 10))
    }
  }, [isEdit, billingSettings, selectedCustomer])

  return (
    <RechnungContext.Provider
      value={{
        customers,
        billingSettings,
        isEdit: !!isEdit,
        selectedCustomer,
        setSelectedCustomer,
        title,
        setTitle,
        intro,
        setIntro,
        invoiceNumber,
        setinvoiceNumber,
        date,
        setDate,
        validUntil,
        setValidUntil,
        positions,
        setPositions,
        taxRate,
        setTaxRate,
        discount,
        setDiscount,
      }}
    >
      {children}
    </RechnungContext.Provider>
  )
}
