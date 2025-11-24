// src/app/(app)/dashboard/buchhaltung/angebot/angebot-erstellen/OfferWizard.tsx
'use client'

import React, { useState } from 'react'
import {
  Customer,
  BillingSettings,
  AngebotProvider,
  useAngebot,
  InitialData,
} from './AngebotContext'
import CustomerSelect from './CustomerSelect'
import DetailsPositions from './DetailsPositions'
import Summary from './Summary'

export interface OfferWizardProps {
  customers: Customer[]
  billingSettings: BillingSettings
  /** Create-Flow: nur Nummer initial übergeben */
  initialOfferNumber?: string
  /** Edit-Flow: komplette Daten übergeben */
  initialData?: InitialData
  isEdit?: boolean
}

function Inner() {
  const { isEdit } = useAngebot()
  // KEIN Auto-Advance mehr – Create startet bei 0, Edit startet bei 1
  const [step, setStep] = useState<number>(isEdit ? 1 : 0)

  return (
    <>
      {step === 0 && <CustomerSelect onNext={() => setStep(1)} />}
      {step === 1 && <DetailsPositions onNext={() => setStep(2)} />}
      {step === 2 && <Summary onBack={() => setStep(1)} />}
    </>
  )
}

export default function OfferWizard({
  customers,
  billingSettings,
  initialOfferNumber,
  initialData,
  isEdit = false,
}: OfferWizardProps) {
  return (
    <AngebotProvider
      customers={customers}
      billingSettings={billingSettings}
      initialOfferNumber={initialOfferNumber}
      initialData={initialData}
      isEdit={isEdit}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <Inner />
      </div>
    </AngebotProvider>
  )
}
