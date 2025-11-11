// lib/supabase-client.ts
'use client'
import { createBrowserClient } from '@supabase/ssr'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Globaler Client für die App (Header, Dashboard, Login usw.) */
export const supabaseClient = () =>
  createBrowserClient(URL, ANON, {
    auth: {
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false, // ⬅️ wichtig: NICHT automatisch aus URL ziehen
      flowType: 'pkce',          // ok für künftige Flows
    },
  })

/** Ephemeraler Client NUR für Reset-Seite – keine Persistenz, darf URL parsen */
export const supabaseEphemeral = () =>
  createBrowserClient(URL, ANON, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,    // ⬅️ nichts in localStorage
      detectSessionInUrl: true,   // ⬅️ Recovery-URL hier verarbeiten
      flowType: 'pkce',
    },
  })
