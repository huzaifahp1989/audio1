import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'

export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[Auth] failed to load profile', error.message)
    return null
  }

  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const syncUser = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    const nextUser = nextSession?.user ?? null
    setUser(nextUser)

    if (nextUser) {
      const loaded = await fetchProfile(nextUser.id)
      setProfile(loaded ?? {
        id: nextUser.id,
        full_name: (nextUser.user_metadata?.full_name as string) || null,
        email: nextUser.email ?? null,
      })
    } else {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      syncUser(data.session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncUser(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncUser])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) throw error

    const needsEmailConfirmation = !data.session && !!data.user
    return { needsEmailConfirmation }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    trackEvent('sign_out')
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
