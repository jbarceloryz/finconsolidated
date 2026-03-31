import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// ── Parse error from URL hash (expired magic links, etc.) ───────────────────
function getHashError() {
  try {
    const hash = window.location.hash.substring(1)
    if (!hash) return null
    const params = new URLSearchParams(hash)
    const errorCode = params.get('error_code')
    const errorDesc = params.get('error_description')
    if (errorCode || errorDesc) {
      // Clean the hash so the error doesn't persist on refresh
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      if (errorCode === 'otp_expired') {
        return 'Your login link has expired. Please request a new one.'
      }
      return errorDesc?.replace(/\+/g, ' ') || 'Authentication error. Please try again.'
    }
  } catch (_) {}
  return null
}

// ── Demo mock ────────────────────────────────────────────────────────────────
const DEMO_USER = { email: 'demo@example.com', id: 'demo-user' }

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(IS_DEMO ? DEMO_USER : null)
  const [loading, setLoading] = useState(!IS_DEMO)
  const [error, setError] = useState(null)
  const resolved = useRef(false)
  const pendingUser = useRef(null) // Track session user while allowlist check runs

  // Mark loading as done (only once per auth cycle)
  const finishLoading = useCallback((sessionUser, errorMsg) => {
    if (resolved.current) return
    resolved.current = true
    if (sessionUser) setUser(sessionUser)
    if (errorMsg) setError(errorMsg)
    setLoading(false)
  }, [])

  // Check allowlist — fail-open if table missing or query errors
  const checkAllowlist = useCallback(async (email) => {
    if (!isSupabaseConfigured()) return true
    try {
      const { data, error: qErr } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()
      if (qErr) {
        console.warn('Allowlist check failed (table may not exist yet):', qErr.message)
        return true // fail-open
      }
      return !!data
    } catch (err) {
      console.warn('Allowlist check error:', err)
      return true // fail-open
    }
  }, [])

  useEffect(() => {
    if (IS_DEMO) return
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Check for errors in URL hash (e.g., expired magic link).
    // If the URL contains an auth error, clear any stale session and force re-login
    // so the user doesn't end up authenticated but with an invalid token.
    const hashError = getHashError()
    if (hashError) {
      setError(hashError)
      supabase.auth.signOut().catch(() => {})
      finishLoading(null, hashError)
    }

    // Hard timeout — never stay on loading screen forever.
    // If we have a pending user (allowlist check is slow), let them in (fail-open).
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.warn('Auth loading timeout — forcing completion')
        finishLoading(pendingUser.current, null)
      }
    }, 5000)

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires immediately with the current session (or null).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (session?.user) {
            // Store user so the hard timeout can use it as a fallback
            pendingUser.current = session.user
            const allowed = await checkAllowlist(session.user.email)
            if (allowed) {
              finishLoading(session.user, null)
            } else {
              pendingUser.current = null
              await supabase.auth.signOut().catch(() => {})
              finishLoading(null, 'Your email is not authorized to access this application.')
            }
          } else {
            // No session — show login
            finishLoading(null, null)
          }
        } else if (event === 'SIGNED_OUT') {
          // Reset resolved so the next sign-in cycle works
          resolved.current = false
          pendingUser.current = null
          setUser(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [checkAllowlist, finishLoading])

  const signOut = useCallback(async () => {
    if (IS_DEMO) return
    // Reset auth cycle so re-login works
    resolved.current = false
    pendingUser.current = null
    // Always clear local state, even if the API call fails
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn('Sign out API error (session cleared locally):', err)
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
