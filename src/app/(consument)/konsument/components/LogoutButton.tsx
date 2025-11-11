'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = supabaseClient()

  const handleLogout = async () => {
    if (loading) return
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Abmelden"
      title="Abmelden"
    >
      {loading ? 'Abmelden…' : 'Abmelden'}
    </button>
  )
}
