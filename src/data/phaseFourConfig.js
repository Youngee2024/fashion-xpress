import { APP_MODE } from './appMode.js'
import { isPublicSupabaseKey } from './publicSupabaseKey.js'

export const PUBLIC_SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL?.trim() ?? ''
export const PUBLIC_SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export function isPublicSupabaseConfigured(url = PUBLIC_SUPABASE_URL, key = PUBLIC_SUPABASE_ANON_KEY) {
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) && isPublicSupabaseKey(key)
  } catch {
    return false
  }
}

export const LIVE_COMMUNITY_CONFIGURED = APP_MODE === 'live' && isPublicSupabaseConfigured()
