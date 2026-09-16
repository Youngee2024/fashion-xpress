import { createClient } from '@supabase/supabase-js'
import { json, publicError, readJson, withAllow } from './http.js'

function configured(environment) {
  try {
    const url = new URL(environment.SUPABASE_URL)
    return environment.VITE_APP_MODE === 'live' && url.protocol === 'https:' && Boolean(environment.VITE_SUPABASE_ANON_KEY?.trim()) && Boolean(environment.SUPABASE_SERVICE_ROLE_KEY?.trim())
  } catch { return false }
}

export async function deleteAccountRequest(request, { environment = process.env, makeClient = createClient } = {}) {
  const parsed = await readJson(request, 256)
  if (parsed.response) return parsed.allow ? withAllow(parsed.response, parsed.allow) : parsed.response
  if (parsed.body.confirmation !== 'DELETE MY ACCOUNT') return publicError(400, 'confirmation_required', 'Confirm account deletion exactly as shown.')
  if (!configured(environment)) return publicError(503, 'unavailable', 'Account deletion is unavailable on this deployment.')
  const authorization = request.headers.get('authorization') ?? ''
  const match = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(authorization)
  if (!match) return publicError(401, 'unauthorized', 'Sign in again before deleting your account.')

  try {
    const authClient = makeClient(environment.SUPABASE_URL, environment.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await authClient.auth.getUser(match[1])
    if (error || !data?.user?.id) return publicError(401, 'unauthorized', 'Sign in again before deleting your account.')
    const adminClient = makeClient(environment.SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const result = await adminClient.auth.admin.deleteUser(data.user.id)
    if (result.error) return publicError(503, 'deletion_unavailable', 'Account deletion could not be completed. Please retry later.')
    return json(200, { ok: true, message: 'Account and Community data deleted.' })
  } catch {
    return publicError(503, 'deletion_unavailable', 'Account deletion could not be completed. Please retry later.')
  }
}
