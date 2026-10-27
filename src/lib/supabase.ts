import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Shared master Supabase project - always use this for auth & data
// This ensures all sites connect to the same database for notices & users
const SHARED_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co'
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w'

/** Project ref embedded in a Supabase anon key (`ref` claim of the JWT). */
function projectRefFromAnonKey(anonKey: string): string | null {
  try {
    const payload = anonKey.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = JSON.parse(atob(padded)) as { ref?: string }
    return typeof json.ref === 'string' ? json.ref : null
  } catch {
    return null
  }
}

/** Project ref encoded in a Supabase project URL host. */
function projectRefFromUrl(url: string): string | null {
  const match = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(url.trim())
  return match ? match[1] : null
}

/**
 * Only trust the env pair when the anon key actually belongs to the project URL.
 * Otherwise a stale URL/key mismatch from an old deployment reaches production and
 * every auth call fails with "Invalid API key".
 */
function resolveCredentials(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  const shared = { url: SHARED_SUPABASE_URL, anonKey: SHARED_SUPABASE_ANON_KEY }

  if (!envUrl || !envAnonKey) return shared
  if (projectRefFromAnonKey(envAnonKey) === projectRefFromUrl(envUrl)) {
    return { url: envUrl, anonKey: envAnonKey }
  }

  console.warn(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY belong to different projects. ' +
      'Falling back to the shared master project. Fix the env vars to silence this warning.',
  )
  return shared
}

const credentials = resolveCredentials()

export const SUPABASE_URL = credentials.url
export const SUPABASE_ANON_KEY = credentials.anonKey
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

export default getSupabase
