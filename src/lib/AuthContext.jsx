import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { IS_DEMO } from './DataCacheContext'

/**
 * Email allowlist for the dashboard (UX gate).
 *
 * IMPORTANT: This list only controls what the UI shows. The REAL access control
 * lives in Supabase Row Level Security against the `allowed_users` table — keep
 * the two in sync. Anyone not in RLS sees no data even if they bypass this list.
 *
 * All addresses are matched case-insensitively. Fill in your 4–5 addresses.
 */
const ALLOWED_EMAILS = [
  'jordan@ryzlabs.com',
  'sam@ryzlabs.com',
  'm.bianchi@ryzlabs.com',
  'j.barcelo@ryzlabs.com',
]

// Optionally restrict to a Workspace domain as a backstop. Leave '' to disable.
const ALLOWED_DOMAIN = 'ryzlabs.com'

function isEmailAllowed(email) {
  if (!email) return false
  const e = email.trim().toLowerCase()
  if (ALLOWED_EMAILS.length && ALLOWED_EMAILS.map((a) => a.toLowerCase()).includes(e)) return true
  // If no explicit list is configured yet, fall back to domain match so the app
  // is usable during setup. Remove this fallback once ALLOWED_EMAILS is populated.
  if (!ALLOWED_EMAILS.length && ALLOWED_DOMAIN) return e.endsWith('@' + ALLOWED_DOMAIN.toLowerCase())
  return false
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!IS_DEMO)

  useEffect(() => {
    if (IS_DEMO || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })
    return () => {
      active = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        // Force account chooser so users can pick the right Workspace account
        queryParams: { prompt: 'select_account' },
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const email = session?.user?.email ?? null
  const authorized = IS_DEMO || (!!session && isEmailAllowed(email))

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, email, loading, authorized, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
