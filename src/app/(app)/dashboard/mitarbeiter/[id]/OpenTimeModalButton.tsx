// src/app/dashboard/mitarbeiter/[id]/OpenTimeModalButton.tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ClockIcon } from '@heroicons/react/24/outline'

const TimeEntriesModal = dynamic(() => import('./TimeEntriesModal'), {
  ssr: false,
})

export default function OpenTimeModalButton({
  employeeId,
  employeeName,
}: {
  employeeId: string
  employeeName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-black sm:w-auto"
      >
        <ClockIcon className="h-4 w-4" />
        Zeiteinträge
      </button>

      <TimeEntriesModal
        employeeId={employeeId}
        employeeName={employeeName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
