'use client'

type Props = {
  requestId: string
  applicationId: string
  locked: boolean
}

export default function AcceptDeclineButtons({ requestId, applicationId, locked }: Props) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <form
        action={`/api/konsument/applications/${applicationId}/decision`}
        method="post"
        onSubmit={(e) => {
          if (locked) {
            e.preventDefault()
            return
          }
          const ok = window.confirm(
            'Sie können für diese Anfrage nur EINE Bewerbung annehmen. Wenn Sie fortfahren, werden alle anderen Bewerbungen automatisch abgelehnt. Fortfahren?'
          )
          if (!ok) e.preventDefault()
        }}
      >
        <input type="hidden" name="action" value="accept" />
        <input type="hidden" name="request_id" value={requestId} />
        <button
          disabled={locked}
          className="rounded-2xl bg-emerald-600 text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annehmen
        </button>
      </form>

      <form action={`/api/konsument/applications/${applicationId}/decision`} method="post">
        <input type="hidden" name="action" value="decline" />
        <input type="hidden" name="request_id" value={requestId} />
        <button
          disabled={locked}
          className="rounded-2xl bg-rose-600 text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ablehnen
        </button>
      </form>
    </div>
  )
}
