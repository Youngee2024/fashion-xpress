const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_TOPICS = new Set(['Collecting concept', 'Creator support', 'Partnerships', 'Press'])
const CREATOR_SPECIALTIES = new Set(['3D streetwear', 'Virtual couture', 'Digital accessories', 'Material artist'])

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n') : ''
}

export function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function validEmail(email) {
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

function fieldLength(value, minimum, maximum) {
  return value.length >= minimum && value.length <= maximum
}

export function validateContactPayload(input) {
  const value = { name: clean(input.name), email: normalizeEmail(input.email), topic: clean(input.topic), message: clean(input.message), consent: input.consent === true }
  const fields = {}
  if (!fieldLength(value.name, 2, 100)) fields.name = 'Enter a name between 2 and 100 characters.'
  if (!validEmail(value.email)) fields.email = 'Enter a valid email address.'
  if (!CONTACT_TOPICS.has(value.topic)) fields.topic = 'Choose a valid enquiry type.'
  if (!fieldLength(value.message, 20, 3000)) fields.message = 'Enter a message between 20 and 3,000 characters.'
  if (!value.consent) fields.consent = 'Consent is required to send this message.'
  return { value, fields }
}

export function validateCreatorPayload(input) {
  const value = {
    name: clean(input.name), email: normalizeEmail(input.email), location: clean(input.location),
    portfolio: clean(input.portfolio), specialty: clean(input.specialty), vision: clean(input.vision), consent: input.consent === true,
  }
  const fields = {}
  if (!fieldLength(value.name, 2, 100)) fields.name = 'Enter a name between 2 and 100 characters.'
  if (!validEmail(value.email)) fields.email = 'Enter a valid email address.'
  if (!fieldLength(value.location, 2, 120)) fields.location = 'Enter a location between 2 and 120 characters.'
  try {
    const url = new URL(value.portfolio)
    if (!['http:', 'https:'].includes(url.protocol) || value.portfolio.length > 500) throw new Error('Unsupported URL')
    value.portfolio = url.toString()
  } catch {
    fields.portfolio = 'Enter a complete http or https portfolio URL.'
  }
  if (!CREATOR_SPECIALTIES.has(value.specialty)) fields.specialty = 'Choose a valid design practice.'
  if (!fieldLength(value.vision, 30, 3000)) fields.vision = 'Enter a vision between 30 and 3,000 characters.'
  if (!value.consent) fields.consent = 'Consent is required to submit this application.'
  return { value, fields }
}

export function validateNewsletterPayload(input) {
  const value = { email: normalizeEmail(input.email), consent: input.consent === true }
  const fields = {}
  if (!validEmail(value.email)) fields.email = 'Enter a valid email address.'
  if (!value.consent) fields.consent = 'Consent is required to join the newsletter.'
  return { value, fields }
}

export function hasValidationErrors(fields) {
  return Object.keys(fields).length > 0
}
