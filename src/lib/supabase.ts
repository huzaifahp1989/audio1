import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Shared master Supabase project - always use this for auth & data
// This ensures all sites connect to the same database for notices & users
const SHARED_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co'
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w'

// Use env vars if set, otherwise fall back to the shared master project
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://thywxzrrurfhdnhybjdz.supabase.co')
  ? import.meta.env.VITE_SUPABASE_URL
  : SHARED_SUPABASE_URL

const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.length > 20)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : SHARED_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }
export default getSupabase
