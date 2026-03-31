import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Supabase client. Null if env vars are not set (app falls back to CSV). */
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = () => !!supabase
