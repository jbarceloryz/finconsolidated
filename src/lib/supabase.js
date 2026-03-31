import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom fetch with a 15-second timeout to prevent queries from hanging forever.
// Without this, a stalled Supabase request would leave skeleton loaders on screen indefinitely.
const FETCH_TIMEOUT_MS = 15_000

function fetchWithTimeout(input, init) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  // Merge any existing signal (Supabase may pass one)
  const signal = init?.signal
    ? AbortSignal.any
      ? AbortSignal.any([init.signal, controller.signal]) // Modern browsers
      : controller.signal // Fallback
    : controller.signal

  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timeoutId))
}

/** Supabase client. Null if env vars are not set (app falls back to CSV). */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { global: { fetch: fetchWithTimeout } })
    : null

export const isSupabaseConfigured = () => !!supabase
