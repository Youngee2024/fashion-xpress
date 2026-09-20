export const COMMUNITY_CATEGORIES = ['Marketplace', 'Tools', 'Showcase', 'Technology', 'General']
export const PROFILE_IDENTITIES = ['Creator', 'Collector', 'Community Member']
export function displayIdentity(identity) { return identity === 'Collector' ? 'Fashion Enthusiast' : identity }
export const PRESET_AVATARS = ['acid', 'cream', 'ember', 'violet']
export const REPORT_REASONS = ['Spam', 'Harassment', 'Hate or abuse', 'Unsafe content', 'Other']
export const PAGE_SIZE = 6

export function safeReturnTo(value, fallback = '/community') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback
  try {
    const parsed = new URL(value, 'https://fashionxpress.invalid')
    if (parsed.origin !== 'https://fashionxpress.invalid' || /^\/auth(?:\/|$)/.test(parsed.pathname)) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function validateProfile(value) {
  const handle = value.handle?.trim().toLowerCase() ?? ''
  const displayName = value.display_name?.trim() ?? ''
  const bio = value.bio?.trim() ?? ''
  const location = value.location?.trim() ?? ''
  return {
    handle: /^[a-z0-9_]{3,24}$/.test(handle) ? '' : 'Use 3–24 lowercase letters, numbers, or underscores.',
    display_name: displayName.length >= 2 && displayName.length <= 60 ? '' : 'Use 2–60 characters.',
    bio: bio.length <= 280 ? '' : 'Keep your bio to 280 characters.',
    location: location.length <= 80 ? '' : 'Keep your location to 80 characters.',
    identity: PROFILE_IDENTITIES.includes(value.identity) ? '' : 'Choose an identity.',
    avatar_id: PRESET_AVATARS.includes(value.avatar_id) ? '' : 'Choose a preset avatar.',
  }
}

function hasMarkup(value) {
  return /<[^>]*>|\[[^\]]*\]\([^)]*\)|(?:javascript|data):|https?:\/\/|\bwww\./i.test(value)
}

export function validateDiscussion(value) {
  const title = value.title?.trim() ?? ''
  const body = value.body?.trim() ?? ''
  return {
    title: title.length >= 8 && title.length <= 120 && !hasMarkup(title) ? '' : 'Use 8–120 plain-text characters without links or markup.',
    body: body.length >= 20 && body.length <= 5000 && !hasMarkup(body) ? '' : 'Use 20–5,000 plain-text characters without links or markup.',
    category: COMMUNITY_CATEGORIES.includes(value.category) ? '' : 'Choose a category.',
  }
}

export function validateReply(value) {
  const body = value?.trim() ?? ''
  return body.length >= 2 && body.length <= 2000 && !hasMarkup(body) ? '' : 'Use 2–2,000 plain-text characters without links or markup.'
}

export function validateReport(value) {
  return {
    reason: REPORT_REASONS.includes(value.reason) ? '' : 'Choose a reason.',
    explanation: (value.explanation?.trim().length ?? 0) <= 500 && !hasMarkup(value.explanation ?? '') ? '' : 'Use at most 500 plain-text characters without links or markup.',
  }
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean)
}

export function classifyAuthError(error) {
  if (!error) return ''
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'You appear to be offline. Reconnect and try again.'
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (error.status === 429 || /rate|too many|over_request/.test(text)) return 'Too many attempts. Wait a moment before retrying.'
  if (/expired/.test(text)) return 'This code has expired. Request a new one.'
  if (/invalid|token|otp/.test(text)) return 'That code was not accepted. Check the six digits or request a new code.'
  return 'The secure sign-in service could not complete this step. Please retry.'
}
