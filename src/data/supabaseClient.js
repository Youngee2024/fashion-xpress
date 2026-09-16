import { createClient } from '@supabase/supabase-js'
import { LIVE_COMMUNITY_CONFIGURED, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from './phaseFourConfig.js'

// The SDK owns session persistence. Demo Mode does not construct a client.
export const supabase = LIVE_COMMUNITY_CONFIGURED
  ? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null
