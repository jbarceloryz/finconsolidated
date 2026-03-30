import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// ── Demo mock ────────────────────────────────────────────────────────────────
const DEMO_USER = { email: 'demo@example.com', id: 'demo-user' }

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(IS_DEMO ? DEMO_USER : null)
  const [loading, setLoading] = useState(!IS_DEMO)
  const [error, setError] = useState(null)

  // Check allowlist after successful authentication
  const checkAllowlist = useCallback(async (email) => {
    if (!isSupabaseConfigured()) return true
    const { data, error: rpcErr } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()
    if (rpcErr || !data) return false
    return true
  }, [])

  // Handle auth state changes (login, logout, token refresh)
  useEffect(() => {
    if (IS_DEMO) return

    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // 1. Restore existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const allowed = await checkAllowlist(session.user.email)
        if (allowed) {
          setUser(session.user)
        } else {
          await supabase.auth.signOut()
          setError('Your email is not authorized to access this application.')
        }
      }
      setLoading(false)
    })

    // 2. Listen for auth changes (magic link callback, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const allowed = await checkAllowlist(session.user.email)
          if (allowed) {
            setUser(session.user)
            setError(null)
          } else {
            await supabase.auth.signOut()
            setUser(null)
            setError('Your email is not authorized to access this application.')
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [checkAllowlist])

  const signOut = useCallback(async () => {
    if (IS_DEMO) return
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}
