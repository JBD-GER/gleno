// src/app/(app)/dashboard/buchhaltung/angebot/angebot-erstellen/AngebotContext.tsx
'use client'

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

  // Nur strukturierte Felder – KEIN address mehr
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
}

export interface BillingSettings {
  quote_prefix: string
  quote_start: number
  quote_suffix: string
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
  offerId?: string
  offerNumber: string
  selectedCustomer: Customer
  date: string
  validUntil: string
  title: string
  intro: string
  positions: Position[]
  taxRate: number
  discount?: Discount
}

interface AngebotContextValue {
  customers: Customer[]
  billingSettings: BillingSettings
  isEdit: boolean

  selectedCustomer: Customer | null
  setSelectedCustomer: Dispatch<SetStateAction<Customer | null>>

  offerId: string | null
  setOfferId: Dispatch<SetStateAction<string | null>>
  offerNumber: string
  setOfferNumber: Dispatch<SetStateAction<string>>

  title: string
  setTitle: Dispatch<SetStateAction<string>>
  intro: string
  setIntro: Dispatch<SetStateAction<string>>
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

const AngebotContext = createContext<AngebotContextValue | undefined>(undefined)

export function useAngebot() {
  const ctx = useContext(AngebotContext)
  if (!ctx) throw new Error('useAngebot must be inside AngebotProvider')
  return ctx
}

export function AngebotProvider({
  children,
  customers,
  billingSettings,
  initialOfferNumber,
  initialData,
  isEdit = false,
}: {
  children: ReactNode
  customers: Customer[]
  billingSettings: BillingSettings
  initialOfferNumber?: string
  initialData?: InitialData
  isEdit?: boolean
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData?.selectedCustomer ?? null
  )

  const [offerId, setOfferId] = useState<string | null>(initialData?.offerId ?? null)
  const [offerNumber, setOfferNumber] = useState(
    initialData?.offerNumber ?? initialOfferNumber ?? ''
  )

  const [title, setTitle] = useState(initialData?.title ?? 'Angebot – ')
  const [intro, setIntro] = useState(
    initialData?.intro ?? 'Wir haben folgende Leistungen zusammengestellt:'
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

  // Im Create-Flow Standardfelder setzen
  useEffect(() => {
    if (!isEdit) {
      const first = (selectedCustomer?.first_name ?? '').trim()
      const last = (selectedCustomer?.last_name ?? '').trim()
      const company = (selectedCustomer?.company ?? '').trim()
      const displayName = company || `${first} ${last}`.trim()

      setTitle(prev => (prev && prev !== 'Angebot – ' ? prev : `Angebot – ${displayName}`))
      const today = new Date()
      setDate(d => d || today.toISOString().slice(0, 10))
      const until = new Date(today)
      until.setDate(until.getDate() + 14)
      setValidUntil(v => v || until.toISOString().slice(0, 10))
    }
  }, [isEdit, billingSettings, selectedCustomer])

  return (
    <AngebotContext.Provider
      value={{
        customers,
        billingSettings,
        isEdit: !!isEdit,

        selectedCustomer,
        setSelectedCustomer,

        offerId,
        setOfferId,
        offerNumber,
        setOfferNumber,

        title,
        setTitle,
        intro,
        setIntro,
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
    </AngebotContext.Provider>
  )
}
