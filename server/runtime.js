import { readConfig } from './config.js'
import { publicError, withAllow } from './http.js'
import { createMailer } from './resend.js'
import { createDatabase } from './supabase.js'

export function runtimeDependencies() {
  const config = readConfig()
  return { config, database: createDatabase(config), mailer: createMailer(config) }
}

export function handleWorkflow(request, workflow) {
  if (request.method !== 'POST') return withAllow(publicError(405, 'method_not_allowed', 'This endpoint only accepts POST requests.'), 'POST')
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return publicError(415, 'unsupported_media_type', 'Send this request as JSON.')
  try {
    return workflow(request, runtimeDependencies())
  } catch {
    return publicError(503, 'service_unavailable', 'Online submissions are not configured yet. Please use the direct contact option where available.')
  }
}
