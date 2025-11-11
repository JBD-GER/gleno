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
  // ✨ KEIN Auto-Advance mehr – Create startet bei 0, Edit startet bei 1
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
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <Inner />
      </div>
    </AngebotProvider>
  )
}
