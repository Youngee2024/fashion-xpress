import assert from 'node:assert/strict'
import test from 'node:test'
import { CART_STORAGE_KEY, normalizeCart, readCart, writeCart } from '../src/data/cartStorage.js'
import { hasErrors, validateContact, validateCreator } from '../src/data/formValidation.js'
import { getRouteMeta } from '../src/data/routeMeta.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key) ?? null,
  }
}

test('cart data is normalized, consolidated, and capped safely', () => {
  const cart = normalizeCart([
    { id: 'neo-safari', quantity: 2 },
    { id: 'neo-safari', quantity: 98 },
    { id: 'missing-piece', quantity: 3 },
    { id: 'quantum-lace', quantity: -1 },
  ])
  assert.equal(cart.length, 1)
  assert.equal(cart[0].product.id, 'neo-safari')
  assert.equal(cart[0].quantity, 99)
})

test('cart persistence stores identifiers only and recovers from corruption', () => {
  const storage = memoryStorage()
  const entries = normalizeCart([{ id: 'solaris-cloak', quantity: 3 }])
  assert.equal(writeCart(entries, storage), true)
  assert.equal(storage.value(CART_STORAGE_KEY), '[{"id":"solaris-cloak","quantity":3}]')
  assert.equal(readCart(storage)[0].quantity, 3)

  const corrupt = memoryStorage({ [CART_STORAGE_KEY]: '{not-json' })
  assert.deepEqual(readCart(corrupt), [])
  assert.equal(corrupt.value(CART_STORAGE_KEY), null)
})

test('contact and creator validation expose useful local errors and accept complete demos', () => {
  assert.equal(hasErrors(validateContact({ name: '', email: 'wrong', topic: '', message: 'short' })), true)
  assert.equal(hasErrors(validateContact({ name: 'Ada', email: 'ada@example.com', topic: 'Press', message: 'This is a complete local demonstration message.' })), false)
  assert.equal(hasErrors(validateCreator({ name: 'Ada', email: 'ada@example.com', portfolio: 'ftp://example.com', specialty: '3D streetwear', vision: 'A sufficiently developed creative direction for this demo.' })), true)
  assert.equal(hasErrors(validateCreator({ name: 'Ada', email: 'ada@example.com', portfolio: 'https://example.com/work', specialty: '3D streetwear', vision: 'A sufficiently developed creative direction for this demo.' })), false)
})

test('Phase 2 information routes have distinct metadata', () => {
  const routes = ['/privacy', '/terms', '/licensing', '/refund-policy', '/accessibility']
  const metadata = routes.map(getRouteMeta)
  assert.equal(new Set(metadata.map(({ title }) => title)).size, routes.length)
  for (const meta of metadata) {
    assert.match(meta.title, /FashionXpress/)
    assert.ok(meta.description.length > 40)
  }
})
