'use client'

import { useState } from 'react'
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'

type Props = {
  email: string
  referralCode: string
  referralLink: string
}

export function ReferralProfileBox({ email, referralCode, referralLink }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // optional: Fehlerhandling
    }
  }

  return (
    <div className="mt-4 w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:mt-0 sm:max-w-md">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Ihr Profil
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">
        {email}
      </p>

      {/* Empfehlungs-Code */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Ihr Empfehlungs-Code
        </p>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900">
          <span className="truncate">
            {referralCode || '— kein Code verfügbar —'}
          </span>
        </div>
      </div>

      {/* Empfehlungs-Link + Kopieren */}
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Ihr Empfehlungs-Link
        </p>

        <div className="flex flex-col gap-2">
          {/* anklickbarer Link */}
          <a
            href={referralLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 underline decoration-dotted underline-offset-2 line-clamp-2 break-all hover:bg-slate-50"
          >
            {referralLink}
          </a>

          {/* Copy-Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                <span>Kopiert</span>
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span>Link kopieren</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-600">
        <p>Teilen Sie den Link zum Beispiel mit:</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>anderen Branchen-Unternehmen</li>
          <li>befreundeten Unternehmer:innen</li>
          <li>Ihrem Netzwerk (WhatsApp, E-Mail, Social Media)</li>
        </ul>
      </div>
    </div>
  )
}
