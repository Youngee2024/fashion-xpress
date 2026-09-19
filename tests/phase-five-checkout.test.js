import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CHECKOUT_DRAFT_KEY,
  DEMO_COLLECTION_KEY,
  calculateDemoTotal,
  completeDemoCheckout,
  formatConceptUnits,
  freshCheckoutDraft,
  readCheckoutDraft,
  readDemoCollection,
  removeCompletedFromCart,
  resetDemoCollection,
  selectionsFromCart,
} from '../src/data/demoCheckout.js'
import { productById } from '../src/data/products.js'

const token = '12345678-1234-4123-8123-123456789abc'
const cart = [
  { product: productById['neo-safari'], quantity: 2 },
  { product: productById['quantum-lace'], quantity: 1 },
]

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values),
  }
}

test('checkout totals use deterministic integer tenths and derive prices from product data', () => {
  const items = selectionsFromCart(cart, { 'neo-safari': 'social', 'quantum-lace': 'extended' })
  const total = calculateDemoTotal(items)
  assert.deepEqual({ subtotal: total.subtotalUnits, adjustment: total.adjustmentUnits, final: total.totalUnits }, { subtotal: 68, adjustment: 19, final: 87 })
  assert.equal(formatConceptUnits(total.totalUnits), '8.7 concept ETH')
  assert.throws(() => calculateDemoTotal([{ id: 'unknown', quantity: 1, licence: 'personal' }]), /Invalid/)
  assert.throws(() => calculateDemoTotal([{ id: 'neo-safari', quantity: 0, licence: 'personal' }]), /Invalid/)
  assert.throws(() => calculateDemoTotal([{ id: 'neo-safari', quantity: 1, licence: 'commercial' }]), /Invalid/)
})

test('checkout drafts preserve safe choices and reject corrupt or unrelated state', () => {
  const valid = { ...freshCheckoutDraft(cart, token), highestStep: 3, licences: { 'neo-safari': 'social' } }
  const storage = memoryStorage({ [CHECKOUT_DRAFT_KEY]: JSON.stringify(valid) })
  assert.deepEqual(readCheckoutDraft(cart, storage), valid)
  storage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ ...valid, licences: { unknown: 'personal' } }))
  const recovered = readCheckoutDraft(cart, storage)
  assert.equal(recovered.highestStep, 0)
  assert.equal(recovered.signature, 'neo-safari:2|quantum-lace:1')
  assert.equal(storage.getItem(CHECKOUT_DRAFT_KEY), null)
})

test('completion creates one session-only record and repeated completion is idempotent', () => {
  const storage = memoryStorage()
  const draft = { ...freshCheckoutDraft(cart, token), highestStep: 4, licences: { 'neo-safari': 'social' } }
  const first = completeDemoCheckout(cart, draft, storage, '2026-09-19T12:00:00.000Z')
  const second = completeDemoCheckout(cart, draft, storage, '2026-09-19T13:00:00.000Z')
  assert.deepEqual(second, first)
  assert.equal(first.reference, 'FX-DEMO-12345678')
  assert.equal(readDemoCollection(storage).length, 1)
  assert.deepEqual(Object.keys(storage.dump()), [DEMO_COLLECTION_KEY])
})

test('completion is blocked for empty carts, skipped steps, forged tokens and unavailable storage', () => {
  const ready = { ...freshCheckoutDraft(cart, token), highestStep: 4 }
  assert.throws(() => completeDemoCheckout([], ready, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, { ...ready, highestStep: 3 }, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, { ...ready, token: 'not-a-token' }, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, ready, { getItem: () => null, setItem: () => { throw new Error('disabled') } }), /storage is unavailable/)
})

test('only completed quantities leave the active cart', () => {
  assert.deepEqual(removeCompletedFromCart(cart, [{ id: 'neo-safari', quantity: 1, licence: 'personal' }]).map(({ product, quantity }) => ({ id: product.id, quantity })), [
    { id: 'neo-safari', quantity: 1 },
    { id: 'quantum-lace', quantity: 1 },
  ])
  assert.deepEqual(removeCompletedFromCart(cart, selectionsFromCart(cart)), [])
})

test('Demo Collection recovers safely from corruption and can be reset', () => {
  const storage = memoryStorage({ [DEMO_COLLECTION_KEY]: '{broken' })
  assert.deepEqual(readDemoCollection(storage), [])
  assert.equal(storage.getItem(DEMO_COLLECTION_KEY), null)
  storage.setItem(DEMO_COLLECTION_KEY, '[]')
  resetDemoCollection(storage)
  assert.equal(storage.getItem(DEMO_COLLECTION_KEY), null)
})

test('checkout source contains no sensitive payment fields or payment-provider integration', async () => {
  const checkout = await readFile(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')
  const appSource = `${checkout}\n${await readFile(new URL('../src/data/demoCheckout.js', import.meta.url), 'utf8')}`
  assert.doesNotMatch(appSource, /card.?number|\bcvv\b|expiry.?date|wallet.?address|billing.?address|one.?time.?password/i)
  assert.doesNotMatch(appSource, /paystack|flutterwave|stripe|paymentintent|\/api\//i)
  assert.match(checkout, /No payment will be taken\./)
  assert.match(checkout, /No personal information will be transmitted\./)
})

test('checkout routes and metadata cover checkout, completion and Demo Collection', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const meta = await readFile(new URL('../src/data/routeMeta.js', import.meta.url), 'utf8')
  for (const route of ['/checkout', '/checkout/complete', '/demo-collection']) {
    assert.match(app, new RegExp(`path="${route.replaceAll('/', '\\/')}"`))
    assert.match(meta, new RegExp(`'${route.replaceAll('/', '\\/')}'`))
  }
})
