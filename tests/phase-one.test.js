import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { getRouteMeta } from '../src/data/routeMeta.js'

const legacyRouteFiles = ['about.html', 'ar-tryon.html', 'collections.html', 'community.html', 'contact.html', 'started.html']

test('legacy HTML cannot shadow active React routes', () => {
  for (const file of legacyRouteFiles) {
    assert.equal(existsSync(file), false, `${file} should not exist at the Vite root`)
    assert.equal(existsSync(`legacy-archive/${file}`), true, `${file} should be preserved in the archive`)
  }
})

test('Vercel rewrites direct routes to the SPA entry', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
  assert.equal(config.rewrites.length, 1)
  assert.equal(config.rewrites[0].destination, '/index.html')
  const spaRewrite = new RegExp(`^${config.rewrites[0].source}$`)
  for (const route of ['/about', '/contact', '/newsletter/confirm', '/newsletter/unsubscribe', '/collections/neo-safari']) assert.equal(spaRewrite.test(route), true, route)
  for (const assetOrFunction of ['/api/contact', '/api/newsletter/confirm', '/assets/index.js', '/images/hero-model.jpg', '/favicon.svg', '/robots.txt']) assert.equal(spaRewrite.test(assetOrFunction), false, assetOrFunction)
})

test('Vercel applies restrictive browser headers without blocking local Try-On media or Live Supabase', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
  const globalHeaders = Object.fromEntries(config.headers.find(({ source }) => source === '/(.*)').headers.map(({ key, value }) => [key, value]))
  assert.match(globalHeaders['Content-Security-Policy'], /frame-ancestors 'none'/)
  assert.match(globalHeaders['Content-Security-Policy'], /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/)
  assert.match(globalHeaders['Content-Security-Policy'], /img-src 'self' blob: data:/)
  assert.equal(globalHeaders['Permissions-Policy'], 'camera=(self), microphone=(), geolocation=(), payment=()')
  assert.equal(globalHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.equal(globalHeaders['X-Content-Type-Options'], 'nosniff')
  assert.equal(globalHeaders['X-Frame-Options'], 'DENY')
  assert.equal(config.headers.find(({ source }) => source === '/assets/(.*)').headers[0].value, 'public, max-age=31536000, immutable')
})

test('every public route has distinct useful metadata', () => {
  const routes = ['/', '/collections', '/collections/neo-safari', '/ar-tryon', '/community', '/about', '/contact', '/get-started', '/mint/neo-safari', '/newsletter/confirm', '/newsletter/unsubscribe', '/missing']
  const metadata = routes.map(getRouteMeta)
  for (const meta of metadata) {
    assert.match(meta.title, /FashionXpress/)
    assert.ok(meta.description.length > 40)
  }
  assert.equal(new Set(metadata.map(({ title }) => title)).size, routes.length)
})
