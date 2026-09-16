import { createHmac, randomBytes } from 'node:crypto'

export const MIN_COMPLETION_MS = 2_000
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1_000

export function createToken() {
  return randomBytes(32).toString('base64url')
}

export function createReference(prefix) {
  return `${prefix}-${randomBytes(5).toString('hex').toUpperCase()}`
}

export function secureHash(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function clientKey(request, secret) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown'
  const agent = request.headers.get('user-agent') || 'unknown'
  return secureHash(`${address}|${agent}`, secret)
}

export function spamReason(body, now = Date.now()) {
  if (typeof body.website === 'string' && body.website.trim()) return 'spam'
  const startedAt = Number(body.startedAt)
  if (!Number.isFinite(startedAt) || startedAt <= 0 || now - startedAt < MIN_COMPLETION_MS || startedAt > now) return 'too_fast'
  return ''
}

export function tokenIsWellFormed(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(value)
}
