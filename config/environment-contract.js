const present = (value) => typeof value === 'string' && value.trim().length > 0

function isHttpsUrl(value) {
  if (!present(value)) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function decodeJwtRole(value) {
  if (!/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return ''
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role ?? ''
  } catch {
    return ''
  }
}

const validPublicKey = (value) => present(value) && (
  /^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(value.trim()) || decodeJwtRole(value.trim()) === 'anon'
)

const validServiceKey = (value) => present(value) && (
  /^sb_secret_[A-Za-z0-9_-]{8,}$/.test(value.trim()) || decodeJwtRole(value.trim()) === 'service_role'
)

const mailbox = '[^\\s<>@]+@[^\\s<>@]+\\.[^\\s<>@]+'
const validEmail = (value) => present(value) && new RegExp(`^(?:${mailbox}|[^<>\\r\\n]+ <${mailbox}>)$`).test(value.trim())

export const ENVIRONMENT_CONTRACT = Object.freeze({
  VITE_APP_MODE: {
    visibility: 'public',
    description: 'Public application mode: demo or live.',
    validate: (value) => value === 'demo' || value === 'live',
  },
  VITE_SUPABASE_URL: {
    visibility: 'public',
    description: 'Public Supabase project URL used by Auth and Community.',
    validate: isHttpsUrl,
  },
  VITE_SUPABASE_ANON_KEY: {
    visibility: 'public',
    description: 'Public Supabase publishable or legacy anon key.',
    validate: validPublicKey,
  },
  SUPABASE_URL: {
    visibility: 'server',
    description: 'Server-side Supabase project URL.',
    validate: isHttpsUrl,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    visibility: 'server',
    description: 'Server-only Supabase secret or legacy service-role key.',
    validate: validServiceKey,
  },
  RESEND_API_KEY: {
    visibility: 'server',
    description: 'Server-only restricted Resend API key.',
    validate: (value) => present(value) && /^re_[A-Za-z0-9_-]{8,}$/.test(value.trim()),
  },
  EMAIL_FROM: {
    visibility: 'server',
    description: 'Verified sender mailbox, optionally with a display name.',
    validate: validEmail,
  },
  EMAIL_ADMIN_TO: {
    visibility: 'server',
    description: 'Private administrative notification mailbox.',
    validate: validEmail,
  },
  PUBLIC_APP_URL: {
    visibility: 'server',
    description: 'Canonical HTTPS origin used in email links.',
    validate: isHttpsUrl,
  },
  FORM_SECURITY_SECRET: {
    visibility: 'server',
    description: 'Server-only random HMAC secret of at least 32 characters.',
    validate: (value) => present(value) && value.length >= 32,
  },
})

export const PUBLIC_VARIABLES = Object.freeze(
  Object.keys(ENVIRONMENT_CONTRACT).filter((name) => ENVIRONMENT_CONTRACT[name].visibility === 'public'),
)

export const SERVER_VARIABLES = Object.freeze(
  Object.keys(ENVIRONMENT_CONTRACT).filter((name) => ENVIRONMENT_CONTRACT[name].visibility === 'server'),
)

export const SERVER_WORKFLOW_VARIABLES = Object.freeze([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_ADMIN_TO',
  'PUBLIC_APP_URL',
  'FORM_SECURITY_SECRET',
])

export const LIVE_CAPABILITIES = Object.freeze({
  'Contact, Creator Application, and Newsletter': SERVER_WORKFLOW_VARIABLES,
  'Authentication, Profiles, and Community': ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  'Account deletion': ['VITE_APP_MODE', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
})

export function inspectVariable(name, environment) {
  const definition = ENVIRONMENT_CONTRACT[name]
  const value = environment[name]
  if (!present(value)) return 'missing'
  return definition?.validate(value) ? 'plausible' : 'invalid'
}
