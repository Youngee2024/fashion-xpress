import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { deleteAccountRequest } from '../server/deleteAccount.js'
import { restoreAuthenticatedUser, requestEmailOtp, signOutSession, verifyEmailOtp } from '../src/data/authWorkflow.js'
import { createDemoCommunityStore, createLiveCommunityStore } from '../src/data/communityStore.js'
import { classifyAuthError, hasValidationErrors, safeReturnTo, validateDiscussion, validateProfile, validateReply, validateReport } from '../src/data/communityRules.js'
import { DEMO_PROFILE } from '../src/data/demoIdentity.js'
import { isPublicSupabaseConfigured } from '../src/data/phaseFourConfig.js'
import { isPublicSupabaseKey } from '../src/data/publicSupabaseKey.js'
import { isHandleAvailable, loadOwnProfile, saveOwnProfile } from '../src/data/profileWorkflow.js'

const demo = () => createDemoCommunityStore(DEMO_PROFILE)
const validDiscussion = { title: 'A thoughtful first discussion', body: 'This is a plain-text discussion about making digital fashion more expressive.', category: 'General' }

test('Phase 4 public configuration is optional in demo and rejects invalid live values', () => {
  assert.equal(isPublicSupabaseConfigured('', ''), false)
  assert.equal(isPublicSupabaseConfigured('https://example.supabase.co', 'sb_publishable_example_key_for_tests'), true)
  assert.equal(isPublicSupabaseConfigured('javascript:alert(1)', 'sb_publishable_example_key_for_tests'), false)
  assert.equal(isPublicSupabaseConfigured('https://example.supabase.co', 'sb_secret_example_key_for_tests'), false)
  const jwt = (role) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature_12345678'].join('.')
  assert.equal(isPublicSupabaseKey(jwt('anon')), true)
  assert.equal(isPublicSupabaseKey(jwt('service_role')), false)
})

test('demo identity is fictional and never needs an email or Supabase client', async () => {
  assert.equal(DEMO_PROFILE.handle, 'runwayguest')
  assert.equal('email' in DEMO_PROFILE, false)
  const store = demo()
  assert.equal((await store.profileByHandle('runwayguest')).id, DEMO_PROFILE.id)
})

test('demo Community makes zero fetch requests through create, reply, like, edit, report, delete and reset', async () => {
  const originalFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests += 1; throw new Error('Demo tried the network') }
  try {
    const store = demo()
    const created = await store.createDiscussion(validDiscussion, DEMO_PROFILE.id)
    const reply = await store.createReply(created.id, 'A complete local reply.', DEMO_PROFILE.id)
    assert.equal(await store.toggleLike(created.id, DEMO_PROFILE.id), true)
    assert.equal(await store.toggleLike(created.id, DEMO_PROFILE.id), false)
    await store.updateDiscussion(created.id, { ...validDiscussion, title: 'An edited local discussion' }, DEMO_PROFILE.id)
    await store.updateReply(reply.id, 'An edited local reply.', DEMO_PROFILE.id)
    await store.report({ discussion_id: created.id, reason: 'Spam', explanation: '' }, DEMO_PROFILE.id)
    assert.equal(store.getPrivateReportCount(), 1)
    await store.deleteReply(reply.id, DEMO_PROFILE.id)
    await store.deleteDiscussion(created.id, DEMO_PROFILE.id)
    store.reset()
    assert.equal(store.getPrivateReportCount(), 0)
    assert.equal(requests, 0)
  } finally { globalThis.fetch = originalFetch }
})

test('demo content ownership is enforced in the local model', async () => {
  const store = demo()
  const created = await store.createDiscussion(validDiscussion, DEMO_PROFILE.id)
  await assert.rejects(store.updateDiscussion(created.id, validDiscussion, 'another-user'), /own content/)
  await assert.rejects(store.deleteDiscussion(created.id, 'another-user'), /own content/)
  const reply = await store.createReply(created.id, 'A thoughtful local reply.', DEMO_PROFILE.id)
  await assert.rejects(store.updateReply(reply.id, 'Changed by another.', 'another-user'), /own content/)
})

test('demo search, categories, sorting, counts and pagination are bounded', async () => {
  const store = demo()
  for (let index = 0; index < 8; index += 1) await store.createDiscussion({ ...validDiscussion, title: `A thoughtful discussion number ${index}` }, DEMO_PROFILE.id)
  const first = await store.list({ page: 0 })
  const second = await store.list({ page: 1 })
  assert.equal(first.items.length, 6)
  assert.equal(second.items.length, 4)
  assert.equal(first.total, 10)
  assert.equal(first.hasMore, true)
  assert.equal((await store.list({ search: 'material', category: 'Tools' })).total, 1)
  assert.equal((await store.list({ sort: 'liked' })).items.length, 6)
})

test('demo profile updates remain local and reset to the predefined identity', async () => {
  const store = demo()
  store.setProfile({ ...DEMO_PROFILE, display_name: 'Demo Editor' })
  assert.equal((await store.profileByHandle('runwayguest')).display_name, 'Demo Editor')
  store.reset()
  assert.equal((await store.profileByHandle('runwayguest')).display_name, 'Runway Guest')
})

test('profile and content validation rejects unsafe or oversized input', () => {
  assert.equal(hasValidationErrors(validateProfile({ handle: 'BAD!', display_name: 'A', bio: 'x'.repeat(281), location: '', identity: 'Moderator', avatar_id: 'https://example.com/a.jpg' })), true)
  assert.equal(hasValidationErrors(validateDiscussion({ ...validDiscussion, body: '<script>alert(1)</script>' })), true)
  assert.equal(hasValidationErrors(validateDiscussion({ ...validDiscussion, body: 'Visit https://example.com for unsafe embedded links.' })), true)
  assert.ok(validateReply('x'.repeat(2001)))
  assert.equal(hasValidationErrors(validateReport({ reason: 'Other', explanation: '<iframe src="x"></iframe>' })), true)
})

test('safe return destinations reject cross-origin, backslash and auth loops', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/verify', '/path\nHeader:bad']) assert.equal(safeReturnTo(value), '/community')
  assert.equal(safeReturnTo('/community/demo-1?tab=replies'), '/community/demo-1?tab=replies')
})

test('live OTP and session operations call the official client methods', async () => {
  const calls = []
  const client = { auth: {
    getUser: async () => { calls.push('restore'); return { data: { user: { id: 'user-1' } }, error: null } },
    signInWithOtp: async (input) => { calls.push(input); return { error: null } },
    verifyOtp: async (input) => { calls.push(input); return { data: { user: { id: 'user-1' } }, error: null } },
    signOut: async () => { calls.push('sign-out'); return { error: null } },
  } }
  assert.equal((await restoreAuthenticatedUser(client)).user.id, 'user-1')
  await requestEmailOtp(client, 'example@example.test')
  await verifyEmailOtp(client, 'example@example.test', '123456')
  await signOutSession(client)
  assert.deepEqual(calls[1], { email: 'example@example.test', options: { shouldCreateUser: true } })
  assert.deepEqual(calls[2], { email: 'example@example.test', token: '123456', type: 'email' })
  assert.equal(calls[3], 'sign-out')
})

test('OTP errors distinguish invalid, expired, rate-limited and generic failures without account enumeration', () => {
  assert.match(classifyAuthError({ message: 'Invalid OTP' }), /not accepted/)
  assert.match(classifyAuthError({ message: 'Token expired' }), /expired/)
  assert.match(classifyAuthError({ status: 429, message: 'rate limit' }), /Too many/)
  assert.doesNotMatch(classifyAuthError({ message: 'user not found' }), /account|registered/i)
})

test('live adapter refuses writes without authentication and propagates server failures', async () => {
  const client = { from: () => ({ insert: () => { throw new Error('should not query') } }) }
  const store = createLiveCommunityStore(client, () => null)
  await assert.rejects(store.createDiscussion(validDiscussion), /Sign in/)
})

test('profile setup, editing and handle checks use the authenticated owner and server results', async () => {
  const calls = []
  const profile = { id: 'member-1', handle: 'runwayguest', display_name: 'Runway Guest' }
  const client = { from(table) {
    assert.equal(table, 'community_profiles')
    const query = {
      select(fields) { calls.push(['select', fields]); return query },
      eq(field, value) { calls.push(['eq', field, value]); return query },
      insert(value) { calls.push(['insert', value]); return query },
      update(value) { calls.push(['update', value]); return query },
      async maybeSingle() { return { data: profile, error: null } },
      async single() { return { data: profile, error: null } },
    }
    return query
  } }
  assert.equal((await loadOwnProfile(client, 'member-1')).id, 'member-1')
  await saveOwnProfile(client, 'member-1', null, { handle: 'runwayguest' })
  assert.deepEqual(calls.find(([kind]) => kind === 'insert')[1], { handle: 'runwayguest', id: 'member-1' })
  calls.length = 0
  await saveOwnProfile(client, 'member-1', profile, { display_name: 'Updated Guest' })
  assert.deepEqual(calls.find(([kind]) => kind === 'update')[1], { display_name: 'Updated Guest' })
  assert.deepEqual(calls.find(([kind]) => kind === 'eq'), ['eq', 'id', 'member-1'])
  assert.equal(await isHandleAvailable(client, 'runwayguest', 'member-1'), true)
  assert.equal(await isHandleAvailable(client, 'runwayguest', 'member-2'), false)
  await assert.rejects(saveOwnProfile(client, null, profile, { display_name: 'No owner' }), /Sign in/)
})

test('profile uniqueness and ownership failures never become simulated success', async () => {
  const conflict = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '23505' } }) }) }) }) }
  await assert.rejects(saveOwnProfile(conflict, 'member-1', null, { handle: 'taken' }), (error) => error.code === '23505')
  const denied = { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '42501' } }) }) }) }) }) }
  await assert.rejects(saveOwnProfile(denied, 'member-1', { id: 'member-1' }, { display_name: 'No access' }), (error) => error.code === '42501')
})

test('account deletion requires confirmation, live configuration and a verified user token', async () => {
  const url = 'https://example.test/api/account/delete'
  const request = (confirmation, authorization) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify({ confirmation }) })
  assert.equal((await deleteAccountRequest(request('no'), {})).status, 400)
  assert.equal((await deleteAccountRequest(request('DELETE MY ACCOUNT'), { environment: {} })).status, 503)
  const environment = { VITE_APP_MODE: 'live', SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_example_key_for_tests', SUPABASE_SERVICE_ROLE_KEY: 'test-only-service-key' }
  assert.equal((await deleteAccountRequest(request('DELETE MY ACCOUNT'), { environment })).status, 401)
  const deletions = []
  const makeClient = (_, key) => key === environment.VITE_SUPABASE_ANON_KEY ? { auth: { getUser: async () => ({ data: { user: { id: 'only-the-caller' } }, error: null }) } } : { auth: { admin: { deleteUser: async (id) => { deletions.push(id); return { error: null } } } } }
  const response = await deleteAccountRequest(request('DELETE MY ACCOUNT', `Bearer ${'a'.repeat(30)}`), { environment, makeClient })
  assert.equal(response.status, 200)
  assert.deepEqual(deletions, ['only-the-caller'])
})

test('account deletion rejects wrong methods and media types and ignores body identity claims', async () => {
  const url = 'https://example.test/api/account/delete'
  assert.equal((await deleteAccountRequest(new Request(url, { method: 'GET' }), {})).status, 405)
  assert.equal((await deleteAccountRequest(new Request(url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'DELETE MY ACCOUNT' }), {})).status, 415)
  const environment = { VITE_APP_MODE: 'live', SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_example_key_for_tests', SUPABASE_SERVICE_ROLE_KEY: 'test-only-service-key' }
  let verificationCount = 0
  const deleted = []
  const makeClient = (_, key) => key === environment.VITE_SUPABASE_ANON_KEY ? { auth: { getUser: async () => {
    verificationCount += 1
    return verificationCount === 1 ? { data: { user: { id: 'verified-member' } }, error: null } : { data: { user: null }, error: { message: 'User not found' } }
  } } } : { auth: { admin: { deleteUser: async (id) => { deleted.push(id); return { error: null } } } } }
  const body = JSON.stringify({ confirmation: 'DELETE MY ACCOUNT', userId: 'someone-else', email: 'other@example.test' })
  const request = () => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${'a'.repeat(30)}` }, body })
  assert.equal((await deleteAccountRequest(request(), { environment, makeClient })).status, 200)
  assert.equal((await deleteAccountRequest(request(), { environment, makeClient })).status, 401)
  assert.deepEqual(deleted, ['verified-member'])
})

test('migration enables RLS, owner policies, report privacy, unique likes and write cooldowns', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202609160001_phase_four_community.sql', import.meta.url), 'utf8')
  for (const table of ['profiles', 'discussions', 'replies', 'likes', 'reports', 'rate_limits']) assert.match(sql, new RegExp(`alter table public\\.community_${table} enable row level security`))
  assert.match(sql, /primary key \(user_id, discussion_id\)/)
  assert.match(sql, /profiles_update_self[\s\S]*?auth\.uid\(\)\) = id/)
  assert.match(sql, /discussions_update_self[\s\S]*?auth\.uid\(\)\) = author_id/)
  assert.match(sql, /replies_update_self[\s\S]*?auth\.uid\(\)\) = author_id/)
  assert.match(sql, /status = 'published'/)
  assert.doesNotMatch(sql, /grant select[^;]*community_reports/i)
  assert.match(sql, /wait_seconds := 30/)
  assert.match(sql, /wait_seconds := 10/)
  assert.match(sql, /wait_seconds := 5/)
  assert.equal((sql.match(/security definer set search_path = ''/g) ?? []).length, 3)
})

test('frontend code and bundle never reference server-only credentials', async () => {
  const files = ['../src/data/phaseFourConfig.js', '../src/data/supabaseClient.js', '../src/auth/AuthContext.jsx', '../src/data/communityStore.js']
  const combined = (await Promise.all(files.map((path) => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n')
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|FORM_SECURITY_SECRET|EMAIL_ADMIN_TO/)
})
