const REQUIRED_SERVER_VARIABLES = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_ADMIN_TO',
  'PUBLIC_APP_URL',
  'FORM_SECURITY_SECRET',
]

export class ConfigurationError extends Error {
  constructor() {
    super('Server configuration is incomplete.')
    this.name = 'ConfigurationError'
  }
}

export function readConfig(environment = process.env) {
  if (REQUIRED_SERVER_VARIABLES.some((name) => !environment[name]?.trim())) throw new ConfigurationError()

  let publicAppUrl
  let supabaseUrl
  try {
    publicAppUrl = new URL(environment.PUBLIC_APP_URL)
    supabaseUrl = new URL(environment.SUPABASE_URL)
  } catch {
    throw new ConfigurationError()
  }
  if (!['http:', 'https:'].includes(publicAppUrl.protocol) || supabaseUrl.protocol !== 'https:') throw new ConfigurationError()
  if (environment.FORM_SECURITY_SECRET.length < 32) throw new ConfigurationError()

  return {
    supabaseUrl: supabaseUrl.origin,
    supabaseKey: environment.SUPABASE_SERVICE_ROLE_KEY,
    resendKey: environment.RESEND_API_KEY,
    emailFrom: environment.EMAIL_FROM,
    emailAdminTo: environment.EMAIL_ADMIN_TO,
    publicAppUrl: publicAppUrl.origin,
    securitySecret: environment.FORM_SECURITY_SECRET,
  }
}

export function hasServerConfiguration(environment = process.env) {
  try {
    readConfig(environment)
    return true
  } catch {
    return false
  }
}
