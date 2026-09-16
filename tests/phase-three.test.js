import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import contactHandler from '../api/contact.js'
import workflowStatusHandler from '../api/workflow-status.js'
import { ConfigurationError, readConfig } from '../server/config.js'
import { contactAdmin } from '../server/emails.js'
import { secureHash, TOKEN_TTL_MS } from '../server/security.js'
import { createDatabase } from '../server/supabase.js'
import { contactWorkflow, creatorWorkflow, newsletterConfirmWorkflow, newsletterSubscribeWorkflow, newsletterUnsubscribeWorkflow } from '../server/workflows.js'

const NOW = Date.parse('2026-09-15T12:00:00.000Z')
const SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters'
const CONFIG = { securitySecret: SECRET, emailAdminTo: 'admin@example.com', publicAppUrl: 'https://example.com' }

function jsonRequest(path, body, options = {}) {
  return new Request(`https://example.com${path}`, {
    method: options.method ?? 'POST',
    headers: { 'content-type': options.contentType ?? 'application/json', 'x-forwarded-for': '203.0.113.4', ...(options.headers ?? {}) },
    body: options.method === 'GET' ? undefined : (options.raw ?? JSON.stringify(body)),
  })
}

async function responseBody(response) {
  return { status: response.status, body: await response.json() }
}

function createMockDependencies(options = {}) {
  let contactId = 0
  let creatorId = 0
  let newsletterId = 0
  const contacts = []
  const creators = []
  const newsletters = []
  const sent = []
  const contactUpdates = []
  const tokens = [...(options.tokens ?? ['A'.repeat(43), 'B'.repeat(43), 'C'.repeat(43)])]
  const database = {
    rateAllowed: options.rateAllowed ?? true,
    consumeRateLimit: async () => database.rateAllowed,
    findContactByDedupe: async (key) => contacts.find((item) => item.dedupe_key === key) ?? null,
    insertContact: async (row) => {
      if (options.databaseFailure) throw new Error('private database detail')
      const record = { id: `contact-${++contactId}`, ...row }
      contacts.push(record)
      return record
    },
    updateContactNotification: async (id, status) => contactUpdates.push({ id, status }),
    findCreatorByDedupe: async (key) => creators.find((item) => item.dedupe_key === key) ?? null,
    insertCreator: async (row) => {
      const record = { id: `creator-${++creatorId}`, ...row }
      creators.push(record)
      return record
    },
    updateCreatorNotification: async () => {},
    findNewsletterByEmail: async (email) => newsletters.find((item) => item.normalized_email === email) ?? null,
    findNewsletterByConfirmationHash: async (hash) => newsletters.find((item) => item.confirmation_token_hash === hash) ?? null,
    findNewsletterByUnsubscribeHash: async (hash) => newsletters.find((item) => item.unsubscribe_token_hash === hash) ?? null,
    insertNewsletter: async (row) => {
      const record = { id: `newsletter-${++newsletterId}`, ...row }
      newsletters.push(record)
      return record
    },
    updateNewsletter: async (id, changes) => {
      const record = newsletters.find((item) => item.id === id)
      if (!record) return null
      Object.assign(record, changes)
      return record
    },
    updateNewsletterByConfirmation: async (id, hash, changes) => {
      const record = newsletters.find((item) => item.id === id && item.confirmation_token_hash === hash)
      if (!record) return null
      Object.assign(record, changes)
      return record
    },
    updateNewsletterByUnsubscribe: async (id, hash, changes) => {
      const record = newsletters.find((item) => item.id === id && item.unsubscribe_token_hash === hash)
      if (!record) return null
      Object.assign(record, changes)
      return record
    },
  }
  const mailer = {
    send: async (template, key) => {
      sent.push({ template, key })
      if (options.emailFailure) throw new Error('private email detail')
      return { id: `email-${sent.length}` }
    },
    setContact: async (email, unsubscribed) => {
      if (options.contactSyncFailure) throw new Error('private provider detail')
      contactUpdates.push({ email, unsubscribed })
      return { id: 'provider-contact' }
    },
  }
  return {
    config: CONFIG, database, mailer, now: () => options.now ?? NOW,
    createReference: (prefix) => `${prefix}-TEST000001`, createToken: () => tokens.shift() ?? 'Z'.repeat(43),
    state: { contacts, creators, newsletters, sent, contactUpdates },
  }
}

const validContact = { name: 'Ada Okafor', email: ' ADA@Example.com ', topic: 'Press', message: 'A detailed message about a possible editorial feature.', consent: true, website: '', startedAt: NOW - 5_000 }
const validCreator = { name: 'Ada Okafor', email: 'ada@example.com', location: 'Lagos, Nigeria', portfolio: 'https://example.com/work', specialty: '3D streetwear', vision: 'I build expressive digital garments rooted in material culture.', consent: true, website: '', startedAt: NOW - 5_000 }
const validNewsletter = { email: ' ADA@Example.com ', consent: true, website: '', startedAt: NOW - 5_000 }

test('contact persists before notifications and returns a reference', async () => {
  const dependencies = createMockDependencies()
  const result = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  assert.equal(result.status, 201)
  assert.equal(result.body.reference, 'FXC-TEST000001')
  assert.equal(dependencies.state.contacts[0].email, 'ada@example.com')
  assert.equal(dependencies.state.sent.length, 2)
})

test('creator application validates and persists all relevant fields', async () => {
  const dependencies = createMockDependencies()
  const result = await responseBody(await creatorWorkflow(jsonRequest('/api/creator-applications', validCreator), dependencies))
  assert.equal(result.status, 201)
  assert.equal(dependencies.state.creators[0].location, 'Lagos, Nigeria')
  assert.equal(dependencies.state.creators[0].portfolio_url, 'https://example.com/work')
})

test('newsletter remains pending until a valid token is confirmed', async () => {
  const dependencies = createMockDependencies({ tokens: ['A'.repeat(43), 'B'.repeat(43)] })
  const pending = await responseBody(await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies))
  assert.equal(pending.status, 202)
  assert.equal(dependencies.state.newsletters[0].status, 'pending')
  assert.equal(dependencies.state.newsletters[0].confirmation_token_hash, secureHash('A'.repeat(43), SECRET))
  const confirmed = await responseBody(await newsletterConfirmWorkflow(jsonRequest('/api/newsletter/confirm', { token: 'A'.repeat(43) }), dependencies))
  assert.equal(confirmed.status, 200)
  assert.equal(dependencies.state.newsletters[0].status, 'confirmed')
  assert.equal(dependencies.state.newsletters[0].confirmation_token_hash, null)
  assert.equal(dependencies.state.newsletters[0].unsubscribe_token_hash, secureHash('B'.repeat(43), SECRET))
  assert.match(confirmed.body.unsubscribeUrl, /newsletter\/unsubscribe\?token=/)
})

test('duplicate active newsletter requests receive a privacy-preserving response without another email', async () => {
  const dependencies = createMockDependencies()
  await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies)
  dependencies.state.newsletters[0].status = 'confirmed'
  const result = await responseBody(await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies))
  assert.equal(result.status, 202)
  assert.match(result.body.message, /If this address/)
  assert.equal(dependencies.state.sent.length, 1)
})

test('confirmation tokens expire and cannot be reused', async () => {
  const expiredDependencies = createMockDependencies({ now: NOW - TOKEN_TTL_MS - 1 })
  await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', { ...validNewsletter, startedAt: NOW - TOKEN_TTL_MS - 5_000 }), expiredDependencies)
  expiredDependencies.now = () => NOW
  const expired = await responseBody(await newsletterConfirmWorkflow(jsonRequest('/api/newsletter/confirm', { token: 'A'.repeat(43) }), expiredDependencies))
  assert.equal(expired.status, 410)

  const dependencies = createMockDependencies()
  await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies)
  await newsletterConfirmWorkflow(jsonRequest('/api/newsletter/confirm', { token: 'A'.repeat(43) }), dependencies)
  const reused = await responseBody(await newsletterConfirmWorkflow(jsonRequest('/api/newsletter/confirm', { token: 'A'.repeat(43) }), dependencies))
  assert.equal(reused.status, 400)
})

test('unsubscribe changes local status first and hides arbitrary-address existence', async () => {
  const dependencies = createMockDependencies({ tokens: ['A'.repeat(43), 'B'.repeat(43)] })
  await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies)
  await newsletterConfirmWorkflow(jsonRequest('/api/newsletter/confirm', { token: 'A'.repeat(43) }), dependencies)
  const result = await responseBody(await newsletterUnsubscribeWorkflow(jsonRequest('/api/newsletter/unsubscribe', { token: 'B'.repeat(43) }), dependencies))
  assert.equal(result.status, 200)
  assert.equal(dependencies.state.newsletters[0].status, 'unsubscribed')
  const reused = await responseBody(await newsletterUnsubscribeWorkflow(jsonRequest('/api/newsletter/unsubscribe', { token: 'B'.repeat(43) }), dependencies))
  assert.equal(reused.status, 200)
  assert.match(reused.body.message, /^If this was/)
  const unknown = await responseBody(await newsletterUnsubscribeWorkflow(jsonRequest('/api/newsletter/unsubscribe', { token: 'Q'.repeat(43) }), dependencies))
  assert.equal(unknown.status, 200)
  assert.match(unknown.body.message, /^If this was/)
})

test('invalid email and portfolio protocols are rejected server-side', async () => {
  const dependencies = createMockDependencies()
  const contact = await responseBody(await contactWorkflow(jsonRequest('/api/contact', { ...validContact, email: 'bad' }), dependencies))
  const creator = await responseBody(await creatorWorkflow(jsonRequest('/api/creator-applications', { ...validCreator, portfolio: 'javascript:alert(1)' }), dependencies))
  assert.equal(contact.status, 422)
  assert.ok(contact.body.fields.email)
  assert.equal(creator.status, 422)
  assert.ok(creator.body.fields.portfolio)
})

test('oversized, honeypot, and too-fast submissions are rejected', async () => {
  const dependencies = createMockDependencies()
  const oversized = await responseBody(await contactWorkflow(jsonRequest('/api/contact', {}, { raw: JSON.stringify({ message: 'x'.repeat(17_000) }) }), dependencies))
  const honeypot = await responseBody(await contactWorkflow(jsonRequest('/api/contact', { ...validContact, website: 'https://spam.invalid' }), dependencies))
  const tooFast = await responseBody(await contactWorkflow(jsonRequest('/api/contact', { ...validContact, startedAt: NOW - 100 }), dependencies))
  assert.equal(oversized.status, 413)
  assert.equal(honeypot.body.code, 'automation_rejected')
  assert.equal(tooFast.body.code, 'automation_rejected')
})

test('rate limits, methods, and content types are enforced', async () => {
  const dependencies = createMockDependencies({ rateAllowed: false })
  const limited = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  const method = await contactWorkflow(jsonRequest('/api/contact', {}, { method: 'GET' }), dependencies)
  const content = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact, { contentType: 'text/plain' }), dependencies))
  assert.equal(limited.status, 429)
  assert.equal(limited.body.code, 'rate_limited')
  assert.equal(method.status, 405)
  assert.equal(method.headers.get('allow'), 'POST')
  assert.equal(content.status, 415)
})

test('database failures return generic errors without leaking details', async () => {
  const dependencies = createMockDependencies({ databaseFailure: true })
  const result = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  assert.equal(result.status, 503)
  assert.doesNotMatch(JSON.stringify(result.body), /private database detail/)
})

test('email failure after contact storage reports delayed notification without losing data', async () => {
  const dependencies = createMockDependencies({ emailFailure: true })
  const result = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  assert.equal(result.status, 201)
  assert.equal(result.body.notification, 'pending')
  assert.equal(dependencies.state.contacts.length, 1)
})

test('newsletter email failure leaves a pending, unconfirmed record', async () => {
  const dependencies = createMockDependencies({ emailFailure: true })
  const result = await responseBody(await newsletterSubscribeWorkflow(jsonRequest('/api/newsletter/subscribe', validNewsletter), dependencies))
  assert.equal(result.status, 502)
  assert.equal(dependencies.state.newsletters[0].status, 'pending')
})

test('missing or unsafe environment configuration fails closed', () => {
  assert.throws(() => readConfig({}), ConfigurationError)
  assert.throws(() => readConfig({ SUPABASE_URL: 'http://unsafe.test', SUPABASE_SERVICE_ROLE_KEY: 'key', RESEND_API_KEY: 'key', EMAIL_FROM: 'from@example.com', EMAIL_ADMIN_TO: 'to@example.com', PUBLIC_APP_URL: 'https://example.com', FORM_SECURITY_SECRET: SECRET }), ConfigurationError)
})

test('public function rejects unsupported requests before reading configuration', async () => {
  const method = await contactHandler.fetch(jsonRequest('/api/contact', {}, { method: 'GET' }))
  const content = await contactHandler.fetch(jsonRequest('/api/contact', validContact, { contentType: 'text/plain' }))
  assert.equal(method.status, 405)
  assert.equal(method.headers.get('allow'), 'POST')
  assert.equal(content.status, 415)
})

test('unconfigured deployment reports unavailable and does not accept a valid submission', async () => {
  const status = await workflowStatusHandler.fetch(new Request('https://example.com/api/workflow-status'))
  const statusBody = await status.json()
  assert.equal(statusBody.available, false)
  const response = await contactHandler.fetch(jsonRequest('/api/contact', validContact))
  assert.equal(response.status, 503)
  const body = await response.json()
  assert.equal(body.code, 'service_unavailable')
})

test('Supabase rate limiting uses the protected RPC endpoint', async () => {
  let requestedUrl = ''
  const database = createDatabase({ supabaseUrl: 'https://project.example', supabaseKey: 'test-only-key' }, async (url) => {
    requestedUrl = url
    return new Response('true', { status: 200 })
  })
  assert.equal(await database.consumeRateLimit('a'.repeat(64), 'contact', 5, 900), true)
  assert.equal(requestedUrl, 'https://project.example/rest/v1/rpc/consume_submission_rate_limit')
})

test('email HTML escapes submitted content and includes a text alternative', () => {
  const template = contactAdmin({ submission: { name: '<script>alert(1)</script>', email: 'ada@example.com', topic: 'Press', message: '<b>unsafe</b>' }, reference: 'FXC-TEST', adminTo: 'admin@example.com' })
  assert.doesNotMatch(template.html, /<script>|<b>unsafe<\/b>/)
  assert.match(template.html, /&lt;script&gt;/)
  assert.match(template.text, /<b>unsafe<\/b>/)
})

test('duplicate contact submissions return the original reference and do not resend', async () => {
  const dependencies = createMockDependencies()
  const first = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  const second = await responseBody(await contactWorkflow(jsonRequest('/api/contact', validContact), dependencies))
  assert.equal(second.body.reference, first.body.reference)
  assert.equal(second.body.duplicate, true)
  assert.equal(dependencies.state.contacts.length, 1)
  assert.equal(dependencies.state.sent.length, 2)
})

test('forms expose accessible busy, status, error, and duplicate-click guards', async () => {
  const sources = await Promise.all(['src/pages/Contact.jsx', 'src/pages/GetStarted.jsx', 'src/components/Layout.jsx'].map((path) => readFile(path, 'utf8')))
  for (const source of sources) {
    assert.match(source, /aria-busy/)
    assert.match(source, /submitting\.current/)
    assert.match(source, /role="(alert|status)"/)
    assert.match(source, /disabled=/)
  }
})
