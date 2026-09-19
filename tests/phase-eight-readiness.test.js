import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { evaluateReadiness, runReadiness } from '../scripts/readiness.mjs'
import { PUBLIC_VARIABLES, SERVER_VARIABLES } from '../config/environment-contract.js'

const completeLiveEnvironment = {
  VITE_APP_MODE: 'live',
  VITE_SUPABASE_URL: 'https://portfolio-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: ['sb', 'publishable', 'exampleonly1234'].join('_'),
  SUPABASE_URL: 'https://portfolio-test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: ['sb', 'secret', 'exampleonly12345678'].join('_'),
  RESEND_API_KEY: ['re', 'exampleonly12345678'].join('_'),
  EMAIL_FROM: 'FashionXpress Test <sender@example.invalid>',
  EMAIL_ADMIN_TO: 'operator@example.invalid',
  PUBLIC_APP_URL: 'https://preview.example.invalid',
  FORM_SECURITY_SECRET: 'example-only-secret-with-32-characters',
}

test('canonical contract separates the three public variables from server-only configuration', () => {
  assert.deepEqual(PUBLIC_VARIABLES, ['VITE_APP_MODE', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
  assert.deepEqual(SERVER_VARIABLES, [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM',
    'EMAIL_ADMIN_TO', 'PUBLIC_APP_URL', 'FORM_SECURITY_SECRET',
  ])
  assert.ok(SERVER_VARIABLES.every((name) => !name.startsWith('VITE_')))
})

test('missing and invalid public modes remain credential-free Demo deployments', () => {
  assert.equal(evaluateReadiness({}).ready, true)
  assert.equal(evaluateReadiness({ VITE_APP_MODE: 'unexpected' }).mode, 'demo')
  assert.equal(evaluateReadiness({ VITE_APP_MODE: 'unexpected' }).ready, true)
})

test('explicit incomplete Live validation fails closed and identifies unavailable capabilities', () => {
  const report = evaluateReadiness({}, 'live')
  assert.equal(report.ready, false)
  assert.ok(report.capabilities.every((capability) => !capability.ready))
  assert.equal(runReadiness({ environment: {}, argumentsList: ['--mode=live'], write: () => {} }), 1)
  assert.equal(evaluateReadiness({ ...completeLiveEnvironment, VITE_APP_MODE: 'demo' }, 'live').ready, false)
})

test('structurally plausible Live configuration passes without contacting a provider', () => {
  const report = evaluateReadiness(completeLiveEnvironment, 'live')
  assert.equal(report.ready, true)
  assert.ok(report.capabilities.every((capability) => capability.ready))
})

test('readiness output reports statuses but never values or fragments of secrets', () => {
  const output = []
  runReadiness({ environment: completeLiveEnvironment, argumentsList: ['--mode=live'], write: (line) => output.push(line) })
  const combined = output.join('\n')
  assert.match(combined, /SUPABASE_SERVICE_ROLE_KEY: plausible/)
  for (const [name, value] of Object.entries(completeLiveEnvironment)) {
    if (name !== 'VITE_APP_MODE') assert.doesNotMatch(combined, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('.env.example contains Demo mode plus empty provider placeholders only', async () => {
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  for (const name of [...PUBLIC_VARIABLES, ...SERVER_VARIABLES]) {
    const expected = name === 'VITE_APP_MODE' ? `${name}=demo` : `${name}=`
    assert.match(example, new RegExp(`^${expected}$`, 'm'))
  }
  assert.doesNotMatch(example, /(?:sb_secret_|sb_publishable_|re_)[A-Za-z0-9_-]{8,}/)
})

test('frontend source does not reference server-only variable names', async () => {
  const frontendFiles = [
    '../src/data/appMode.js',
    '../src/data/phaseFourConfig.js',
    '../src/data/supabaseClient.js',
    '../vite.config.js',
  ]
  const source = (await Promise.all(frontendFiles.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n')
  for (const name of SERVER_VARIABLES) assert.doesNotMatch(source, new RegExp(`(?<![A-Z0-9_])${name}(?![A-Z0-9_])`))
})
