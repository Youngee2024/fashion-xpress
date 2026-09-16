import { contactAcknowledgement, contactAdmin, creatorAcknowledgement, creatorAdmin, newsletterConfirmation, newsletterConfirmed, unsubscribeConfirmation } from './emails.js'
import { publicError, json, readJson, withAllow } from './http.js'
import { clientKey, createReference, createToken, secureHash, spamReason, TOKEN_TTL_MS, tokenIsWellFormed } from './security.js'
import { hasValidationErrors, validateContactPayload, validateCreatorPayload, validateNewsletterPayload } from './validation.js'

const PUBLIC_FAILURE = 'The service is temporarily unavailable. Your information was not cleared; please try again.'

async function parseSubmission(request, bytes) {
  const parsed = await readJson(request, bytes)
  return parsed.allow ? { ...parsed, response: withAllow(parsed.response, parsed.allow) } : parsed
}

async function protectSubmission(request, body, dependencies, scope, limit = 5) {
  const now = dependencies.now?.() ?? Date.now()
  const reason = spamReason(body, now)
  if (reason) return { response: publicError(400, 'automation_rejected', 'This submission could not be accepted.'), now }
  const key = clientKey(request, dependencies.config.securitySecret)
  const allowed = await dependencies.database.consumeRateLimit(key, scope, limit, 900)
  if (!allowed) return { response: json(429, { ok: false, code: 'rate_limited', message: 'Too many attempts. Please wait before trying again.' }, { 'retry-after': '900' }), now }
  return { now, key }
}

async function protectTokenAction(request, dependencies, scope) {
  const now = dependencies.now?.() ?? Date.now()
  const key = clientKey(request, dependencies.config.securitySecret)
  const allowed = await dependencies.database.consumeRateLimit(key, scope, 10, 900)
  if (!allowed) return { response: json(429, { ok: false, code: 'rate_limited', message: 'Too many attempts. Please wait before trying again.' }, { 'retry-after': '900' }), now }
  return { now }
}

function configurationFailure() {
  return publicError(503, 'service_unavailable', 'Online submissions are not configured yet. Please use the direct contact option where available.')
}

function failed(error) {
  return error?.name === 'ConfigurationError' ? configurationFailure() : publicError(503, 'server_error', PUBLIC_FAILURE)
}

export async function contactWorkflow(request, dependencies) {
  const parsed = await parseSubmission(request, 16_384)
  if (parsed.response) return parsed.response
  try {
    const guarded = await protectSubmission(request, parsed.body, dependencies, 'contact')
    if (guarded.response) return guarded.response
    const { value, fields } = validateContactPayload(parsed.body)
    if (hasValidationErrors(fields)) return publicError(422, 'validation_error', 'Review the highlighted fields.', fields)
    const bucket = Math.floor(guarded.now / 600_000)
    const dedupeKey = secureHash(`${guarded.key}|${bucket}|${JSON.stringify(value)}`, dependencies.config.securitySecret)
    const duplicate = await dependencies.database.findContactByDedupe(dedupeKey)
    if (duplicate) return json(200, { ok: true, duplicate: true, reference: duplicate.submission_reference, notification: duplicate.notification_status ?? 'pending' })

    const reference = dependencies.createReference?.('FXC') ?? createReference('FXC')
    const record = await dependencies.database.insertContact({
      name: value.name, email: value.email, enquiry_type: value.topic, message: value.message,
      consent_at: new Date(guarded.now).toISOString(), status: 'new', source: 'website_contact',
      submission_reference: reference, dedupe_key: dedupeKey, notification_status: 'pending',
    })
    const deliveries = await Promise.allSettled([
      dependencies.mailer.send(contactAdmin({ submission: value, reference, adminTo: dependencies.config.emailAdminTo }), `contact-admin-${record.id}`),
      dependencies.mailer.send(contactAcknowledgement({ name: value, reference }), `contact-ack-${record.id}`),
    ])
    const notification = deliveries[0].status === 'fulfilled' ? 'sent' : 'pending'
    await dependencies.database.updateContactNotification?.(record.id, notification).catch(() => {})
    return json(201, { ok: true, reference, notification })
  } catch (error) {
    return failed(error)
  }
}

export async function creatorWorkflow(request, dependencies) {
  const parsed = await parseSubmission(request, 16_384)
  if (parsed.response) return parsed.response
  try {
    const guarded = await protectSubmission(request, parsed.body, dependencies, 'creator', 3)
    if (guarded.response) return guarded.response
    const { value, fields } = validateCreatorPayload(parsed.body)
    if (hasValidationErrors(fields)) return publicError(422, 'validation_error', 'Review the highlighted fields.', fields)
    const bucket = Math.floor(guarded.now / 600_000)
    const dedupeKey = secureHash(`${guarded.key}|${bucket}|${JSON.stringify(value)}`, dependencies.config.securitySecret)
    const duplicate = await dependencies.database.findCreatorByDedupe(dedupeKey)
    if (duplicate) return json(200, { ok: true, duplicate: true, reference: duplicate.submission_reference, notification: duplicate.notification_status ?? 'pending' })

    const reference = dependencies.createReference?.('FXA') ?? createReference('FXA')
    const record = await dependencies.database.insertCreator({
      creator_name: value.name, email: value.email, location: value.location, portfolio_url: value.portfolio,
      specialty: value.specialty, vision: value.vision, consent_at: new Date(guarded.now).toISOString(),
      review_status: 'new', source: 'website_creator_application', submission_reference: reference,
      dedupe_key: dedupeKey, notification_status: 'pending',
    })
    const deliveries = await Promise.allSettled([
      dependencies.mailer.send(creatorAdmin({ submission: value, reference, adminTo: dependencies.config.emailAdminTo }), `creator-admin-${record.id}`),
      dependencies.mailer.send(creatorAcknowledgement({ submission: value, reference }), `creator-ack-${record.id}`),
    ])
    const notification = deliveries[0].status === 'fulfilled' ? 'sent' : 'pending'
    await dependencies.database.updateCreatorNotification?.(record.id, notification).catch(() => {})
    return json(201, { ok: true, reference, notification })
  } catch (error) {
    return failed(error)
  }
}

export async function newsletterSubscribeWorkflow(request, dependencies) {
  const parsed = await parseSubmission(request, 4_096)
  if (parsed.response) return parsed.response
  try {
    const guarded = await protectSubmission(request, parsed.body, dependencies, 'newsletter', 5)
    if (guarded.response) return guarded.response
    const { value, fields } = validateNewsletterPayload(parsed.body)
    if (hasValidationErrors(fields)) return publicError(422, 'validation_error', 'Review the highlighted fields.', fields)
    const existing = await dependencies.database.findNewsletterByEmail(value.email)
    if (existing?.status === 'confirmed') return json(202, { ok: true, message: 'If this address can be subscribed, a confirmation message will arrive shortly.' })

    const token = dependencies.createToken?.() ?? createToken()
    const tokenHash = secureHash(token, dependencies.config.securitySecret)
    const changes = {
      status: 'pending', consent_at: new Date(guarded.now).toISOString(), confirmation_token_hash: tokenHash,
      confirmation_expires_at: new Date(guarded.now + TOKEN_TTL_MS).toISOString(), confirmed_at: null,
      unsubscribed_at: null, unsubscribe_token_hash: null, source: 'website_newsletter',
    }
    const record = existing
      ? await dependencies.database.updateNewsletter(existing.id, changes)
      : await dependencies.database.insertNewsletter({ normalized_email: value.email, ...changes })
    const confirmationUrl = `${dependencies.config.publicAppUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`
    try {
      await dependencies.mailer.send(newsletterConfirmation({ email: value.email, confirmationUrl }), `newsletter-confirm-${record.id}-${tokenHash.slice(0, 12)}`)
    } catch {
      return publicError(502, 'delivery_error', 'We could not send the confirmation message. Please try again; your subscription is not confirmed.')
    }
    return json(202, { ok: true, message: 'Check your email and confirm within 24 hours to finish subscribing.' })
  } catch (error) {
    return failed(error)
  }
}

export async function newsletterConfirmWorkflow(request, dependencies) {
  const parsed = await parseSubmission(request, 2_048)
  if (parsed.response) return parsed.response
  try {
    const token = parsed.body.token
    if (!tokenIsWellFormed(token)) return publicError(400, 'invalid_token', 'This confirmation link is invalid or has already been used.')
    const guarded = await protectTokenAction(request, dependencies, 'newsletter-confirm')
    if (guarded.response) return guarded.response
    const tokenHash = secureHash(token, dependencies.config.securitySecret)
    const record = await dependencies.database.findNewsletterByConfirmationHash(tokenHash)
    if (!record) return publicError(400, 'invalid_token', 'This confirmation link is invalid or has already been used.')
    if (new Date(record.confirmation_expires_at).getTime() <= guarded.now) {
      await dependencies.database.updateNewsletterByConfirmation(record.id, tokenHash, { confirmation_token_hash: null, confirmation_expires_at: null })
      return publicError(410, 'expired_token', 'This confirmation link has expired. Submit the newsletter form again for a new link.')
    }
    const unsubscribeToken = dependencies.createToken?.() ?? createToken()
    const unsubscribeHash = secureHash(unsubscribeToken, dependencies.config.securitySecret)
    const updated = await dependencies.database.updateNewsletterByConfirmation(record.id, tokenHash, {
      status: 'confirmed', confirmed_at: new Date(guarded.now).toISOString(), confirmation_token_hash: null,
      confirmation_expires_at: null, unsubscribe_token_hash: unsubscribeHash, provider_sync_status: 'pending',
    })
    if (!updated) return publicError(400, 'invalid_token', 'This confirmation link is invalid or has already been used.')
    const unsubscribeUrl = `${dependencies.config.publicAppUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    const results = await Promise.allSettled([
      dependencies.mailer.setContact(record.normalized_email, false),
      dependencies.mailer.send(newsletterConfirmed({ email: record.normalized_email, unsubscribeUrl }), `newsletter-welcome-${record.id}`),
    ])
    const provider = results[0].status === 'fulfilled' ? 'synced' : 'pending'
    await dependencies.database.updateNewsletter(record.id, { provider_sync_status: provider }).catch(() => {})
    return json(200, { ok: true, provider, unsubscribeUrl, message: provider === 'synced' ? 'Your newsletter subscription is confirmed.' : 'Your subscription is confirmed. Mailing-list synchronization is pending.' })
  } catch (error) {
    return failed(error)
  }
}

export async function newsletterUnsubscribeWorkflow(request, dependencies) {
  const parsed = await parseSubmission(request, 2_048)
  if (parsed.response) return parsed.response
  try {
    const token = parsed.body.token
    if (!tokenIsWellFormed(token)) return json(200, { ok: true, message: 'If this was an active unsubscribe link, the subscription is now inactive.' })
    const guarded = await protectTokenAction(request, dependencies, 'newsletter-unsubscribe')
    if (guarded.response) return guarded.response
    const tokenHash = secureHash(token, dependencies.config.securitySecret)
    const record = await dependencies.database.findNewsletterByUnsubscribeHash(tokenHash)
    if (!record) return json(200, { ok: true, message: 'If this was an active unsubscribe link, the subscription is now inactive.' })
    const updated = await dependencies.database.updateNewsletterByUnsubscribe(record.id, tokenHash, {
      status: 'unsubscribed', unsubscribed_at: new Date(guarded.now).toISOString(), unsubscribe_token_hash: null, provider_sync_status: 'pending',
    })
    if (!updated) return json(200, { ok: true, message: 'If this was an active unsubscribe link, the subscription is now inactive.' })
    const results = await Promise.allSettled([
      dependencies.mailer.setContact(record.normalized_email, true),
      dependencies.mailer.send(unsubscribeConfirmation({ email: record.normalized_email }), `newsletter-unsubscribe-${record.id}`),
    ])
    const provider = results[0].status === 'fulfilled' ? 'synced' : 'pending'
    await dependencies.database.updateNewsletter(record.id, { provider_sync_status: provider }).catch(() => {})
    return json(200, { ok: true, provider, message: provider === 'synced' ? 'The subscription is inactive and the mailing contact is unsubscribed.' : 'Your unsubscribe request is recorded, but the email provider has not updated yet. Please contact us if you receive another newsletter.' })
  } catch (error) {
    return failed(error)
  }
}
