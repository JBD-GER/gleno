// src/app/(app)/dashboard/buchhaltung/rechnung-erstellen/OfferWizard.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Customer,
  BillingSettings,
  RechnungProvider,
  useRechnung,
  Position,
  InitialData,
} from './RechnungContext'
import CustomerSelect from './CustomerSelect'
import DetailsPositions from './DetailsPositions'
import Summary from './Summary'

export interface InvoiceWizardProps {
  customers: Customer[]
  billingSettings: BillingSettings
  /** Create-Flow: nur Nummer initial übergeben */
  initialinvoiceNumber?: string
  /** Edit-Flow: komplette Daten übergeben */
  initialData?: InitialData
  isEdit?: boolean
}

function Inner() {
  const { selectedCustomer, isEdit } = useRechnung()
  const [step, setStep] = useState<number>(isEdit ? 1 : 0)

  useEffect(() => {
    if (!isEdit && selectedCustomer && step === 0) setStep(1)
  }, [isEdit, selectedCustomer, step])

  return (
    <>
      {step === 0 && <CustomerSelect />}
      {step === 1 && <DetailsPositions onNext={() => setStep(2)} />}
      {step === 2 && <Summary onBack={() => setStep(1)} />}
    </>
  )
}

export default function InvoiceWizard({
  customers,
  billingSettings,
  initialinvoiceNumber,
  initialData,
  isEdit = false,
}: InvoiceWizardProps) {
  return (
    <RechnungProvider
      customers={customers}
      billingSettings={billingSettings}
      initialinvoiceNumber={initialinvoiceNumber}
      initialData={initialData}
      isEdit={isEdit}
    >
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Inner />
      </div>
    </RechnungProvider>
  )
}
