// app/(public)/paywall/page.tsx
import { redirect } from 'next/navigation'

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function PaywallPage(_props: Props) {
  // Egal was kommt (canceled=1, ohne Param, …) -> immer zurück in die Abo-Einstellungen
  redirect('/dashboard/einstellung/abonnement')
}
