import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { normalizeAppMode } from '../src/data/appMode.js'
import { runWorkflow } from '../src/data/workflowApi.js'
import { hasErrors, validateContact, validateCreator, validateNewsletter } from '../src/data/formValidation.js'

test('missing and invalid public modes safely default to demo', () => {
  assert.equal(normalizeAppMode(undefined), 'demo')
  assert.equal(normalizeAppMode('invalid'), 'demo')
  assert.equal(normalizeAppMode('LIVE'), 'demo')
  assert.equal(normalizeAppMode('live'), 'live')
})

test('demo validation remains the same as live validation', () => {
  assert.ok(hasErrors(validateContact({ name: '', email: '', topic: '', message: '', consent: false })))
  assert.ok(hasErrors(validateCreator({ name: '', email: '', location: '', portfolio: '', specialty: '', vision: '', consent: false })))
  assert.ok(hasErrors(validateNewsletter({ email: '', consent: false })))
})

test('demo completion never invokes the API client', async () => {
  let calls = 0
  const result = await runWorkflow({ mode: 'demo', endpoint: '/api/contact', payload: { email: 'private@example.test' }, demoMessage: 'Demo complete—your message was not sent.', delayMs: 0, liveSubmit: () => { calls += 1 } })
  assert.equal(calls, 0)
  assert.deepEqual(result, { ok: true, demo: true, message: 'Demo complete—your message was not sent.' })
})

test('live mode invokes the original API client and never substitutes demo success', async () => {
  const endpoints = []
  const response = await runWorkflow({ mode: 'live', endpoint: '/api/creator-applications', payload: { name: 'Test' }, demoMessage: 'Demo complete', liveSubmit: async (endpoint) => { endpoints.push(endpoint); return { ok: false, message: 'Configuration unavailable' } } })
  assert.deepEqual(endpoints, ['/api/creator-applications'])
  assert.deepEqual(response, { ok: false, message: 'Configuration unavailable' })
})

test('form demo results are explicit and personal entries have no persistence path', async () => {
  const contact = await readFile(new URL('../src/pages/Contact.jsx', import.meta.url), 'utf8')
  const creator = await readFile(new URL('../src/pages/GetStarted.jsx', import.meta.url), 'utf8')
  const newsletter = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  for (const [source, message] of [[contact, 'Demo complete—your message was not sent.'], [creator, 'Demo complete—your application was not submitted.'], [newsletter, 'Demo complete—your email was not subscribed.']]) {
    assert.ok(source.includes(message))
    assert.ok(source.includes('PortfolioDemoIndicator'))
    assert.ok(source.includes('submitting.current'))
    assert.ok(!/localStorage|sessionStorage|document\.cookie|analytics\./.test(source))
  }
})

test('other local journeys preserve honest completion disclosures', async () => {
  const files = await Promise.all(['../src/components/CartDrawer.jsx', '../src/pages/Community.jsx', '../src/pages/Mint.jsx', '../src/pages/ARTryOn.jsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))
  assert.match(files[0], /No payment was taken\. No order was placed\. No wallet was connected\./)
  assert.match(files[1], /not published|not posted|local/i)
  assert.match(files[2], /no (token|blockchain)|not (minted|created)/i)
  assert.match(files[3], /capture|retake|download/i)
  assert.match(files[3], /tracking|fitting/i)
})

test('only public mode configuration enters browser source', async () => {
  const mode = await readFile(new URL('../src/data/appMode.js', import.meta.url), 'utf8')
  assert.match(mode, /VITE_APP_MODE/)
  assert.doesNotMatch(mode, /SUPABASE|RESEND|SERVICE_ROLE|FORM_SECURITY_SECRET/)
})
