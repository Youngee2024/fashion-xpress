import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { normalizeCart, readCart, writeCart } from '../src/data/cartStorage.js'
import { calculateLicenceUpliftKobo, formatNaira } from '../src/data/commercePricing.js'
import {
  CHECKOUT_DRAFT_KEY,
  CHECKOUT_STEPS,
  DEMO_COLLECTION_KEY,
  DIGITAL_USE_LICENCES,
  LEGACY_COLLECTION_NOTICE_KEY,
  LEGACY_DEMO_COLLECTION_KEY,
  RECEIPT_SCHEMA_VERSION,
  calculateDemoTotal,
  completeDemoCheckout,
  consumeLegacyCollectionNotice,
  freshCheckoutDraft,
  readCheckoutDraft,
  readDemoCollection,
  receiptSummary,
  removeCompletedFromCart,
  resetDemoCollection,
  selectionsFromCart,
} from '../src/data/demoCheckout.js'
import { productById, products, selectProducts } from '../src/data/products.js'

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

test('all nine products expose the approved integer-kobo Naira prices', () => {
  assert.deepEqual(products.map(({ id, currency, priceKobo }) => [id, currency, priceKobo]), [
    ['neo-safari', 'NGN', 8500000],
    ['quantum-lace', 'NGN', 6000000],
    ['solaris-cloak', 'NGN', 12000000],
    ['quantum-silk', 'NGN', 10000000],
    ['net-xplora', 'NGN', 15500000],
    ['lavida-locale', 'NGN', 25000000],
    ['ancestral-circuit', 'NGN', 14500000],
    ['lagoon-protocol', 'NGN', 19500000],
    ['harmattan-veil', 'NGN', 10500000],
  ])
  assert.ok(products.every(({ priceKobo }) => Number.isSafeInteger(priceKobo) && priceKobo > 0))
})

test('the centralized formatter and integer licence uplifts produce exact Naira values', () => {
  assert.equal(formatNaira(8500000), '₦85,000')
  assert.equal(formatNaira(29400000), '₦294,000')
  assert.equal(calculateLicenceUpliftKobo(8500000, 0), 0)
  assert.equal(calculateLicenceUpliftKobo(8500000, 20), 1700000)
  assert.equal(calculateLicenceUpliftKobo(8500000, 50), 4250000)
  assert.throws(() => formatNaira(1.5), /Invalid/)
})

test('licence-first checkout order and permission copy match the approved structures', () => {
  assert.deepEqual(CHECKOUT_STEPS, ['bag', 'licence', 'ownership', 'payment', 'review'])
  assert.deepEqual(DIGITAL_USE_LICENCES.map(({ label, adjustmentPercent }) => [label, adjustmentPercent]), [
    ['Personal-use licence', 0],
    ['Creator/content licence', 20],
    ['Commercial/extended licence', 50],
  ])
  assert.deepEqual(DIGITAL_USE_LICENCES[0].permissions, ['Personal digital styling', 'Private Virtual Try-On use', 'Personal device and profile use', 'No commercial use', 'No resale or ownership transfer'])
  assert.match(DIGITAL_USE_LICENCES[1].permissions.join(' '), /Social-media and editorial content.*Monetized personal content.*No resale or transfer/i)
  assert.match(DIGITAL_USE_LICENCES[2].permissions.join(' '), /Commercial campaign or brand-content concept.*No copyright transfer.*No resale unless separately agreed/i)
})

test('checkout applies the licence price before quantity and rejects untrusted selections', () => {
  const items = selectionsFromCart(cart, { 'neo-safari': 'social', 'quantum-lace': 'extended' })
  const total = calculateDemoTotal(items)
  assert.deepEqual({ subtotal: total.subtotalKobo, adjustment: total.adjustmentKobo, final: total.totalKobo }, { subtotal: 23000000, adjustment: 6400000, final: 29400000 })
  assert.deepEqual(total.lines.map(({ licensedUnitPriceKobo, lineTotalKobo }) => [licensedUnitPriceKobo, lineTotalKobo]), [[10200000, 20400000], [9000000, 9000000]])
  assert.throws(() => calculateDemoTotal([{ id: 'unknown', quantity: 1, licence: 'personal' }]), /Invalid/)
  assert.throws(() => calculateDemoTotal([{ id: 'neo-safari', quantity: 0, licence: 'personal' }]), /Invalid/)
  assert.throws(() => calculateDemoTotal([{ id: 'neo-safari', quantity: 1, licence: 'commercial' }]), /Invalid/)
})

test('price sorting reads Naira kobo while featured order remains editorial', () => {
  assert.equal(selectProducts({ sort: 'low' })[0].id, 'quantum-lace')
  assert.equal(selectProducts({ sort: 'high' })[0].id, 'lavida-locale')
  assert.deepEqual(selectProducts().map(({ id }) => id), products.map(({ id }) => id))
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

test('one complete checkout stores an immutable versioned Naira receipt snapshot', () => {
  const storage = memoryStorage()
  const draft = { ...freshCheckoutDraft(cart, token), highestStep: 4, licences: { 'neo-safari': 'social', 'quantum-lace': 'extended' } }
  const first = completeDemoCheckout(cart, draft, storage, '2026-09-19T12:00:00.000Z')
  const second = completeDemoCheckout(cart, draft, storage, '2026-09-19T13:00:00.000Z')
  assert.deepEqual(second, first)
  assert.equal(first.schemaVersion, RECEIPT_SCHEMA_VERSION)
  assert.equal(first.currency, 'NGN')
  assert.equal(first.reference, 'FX-DEMO-12345678')
  assert.equal(first.totalKobo, 29400000)
  assert.deepEqual(first.items[0], {
    schemaVersion: 2,
    currency: 'NGN',
    productId: 'neo-safari',
    productTitle: 'Neo-Safari 2026',
    quantity: 2,
    baseUnitPriceKobo: 8500000,
    licenceId: 'social',
    licenceLabel: 'Creator/content licence',
    licenceUpliftPercent: 20,
    licensedUnitPriceKobo: 10200000,
    lineTotalKobo: 20400000,
    orderTotalKobo: 29400000,
    orderReference: 'FX-DEMO-12345678',
    completedAt: '2026-09-19T12:00:00.000Z',
  })

  const originalPrice = productById['neo-safari'].priceKobo
  productById['neo-safari'].priceKobo = 1
  try { assert.equal(receiptSummary(readDemoCollection(storage)[0]).totalKobo, 29400000) } finally { productById['neo-safari'].priceKobo = originalPrice }
  assert.deepEqual(Object.keys(storage.dump()), [DEMO_COLLECTION_KEY])
})

test('legacy ETH receipts are cleared without conversion while the cart is preserved', () => {
  const oldReceipt = { token, reference: 'FX-DEMO-12345678', items: [{ id: 'neo-safari', quantity: 1, licence: 'personal' }] }
  const session = memoryStorage({ [LEGACY_DEMO_COLLECTION_KEY]: JSON.stringify([oldReceipt]) })
  const local = memoryStorage()
  const savedCart = normalizeCart([{ id: 'neo-safari', quantity: 2 }])
  assert.equal(writeCart(savedCart, local), true)

  assert.deepEqual(readDemoCollection(session), [])
  assert.equal(session.getItem(LEGACY_DEMO_COLLECTION_KEY), null)
  assert.equal(session.getItem(LEGACY_COLLECTION_NOTICE_KEY), '1')
  assert.equal(consumeLegacyCollectionNotice(session), true)
  assert.equal(consumeLegacyCollectionNotice(session), false)
  assert.deepEqual(readCart(local).map(({ product, quantity }) => [product.id, quantity]), [['neo-safari', 2]])
})

test('completion rejects skipped or forged states and cart removal uses trusted snapshot IDs', () => {
  const ready = { ...freshCheckoutDraft(cart, token), highestStep: 4 }
  assert.throws(() => completeDemoCheckout([], ready, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, { ...ready, highestStep: 3 }, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, { ...ready, token: 'not-a-token' }, memoryStorage()), /earlier checkout steps/)
  assert.throws(() => completeDemoCheckout(cart, ready, { getItem: () => null, setItem: () => { throw new Error('disabled') } }), /storage is unavailable/)

  const receipt = completeDemoCheckout(cart, ready, memoryStorage())
  assert.deepEqual(removeCompletedFromCart(cart, receipt.items), [])
})

test('Digital Wardrobe recovers safely from corruption and can be reset', () => {
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
  assert.match(checkout, /No real payment will be taken\./)
  assert.match(checkout, /No personal information will be transmitted\./)
})

test('checkout routes and metadata remain stable', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const meta = await readFile(new URL('../src/data/routeMeta.js', import.meta.url), 'utf8')
  for (const route of ['/checkout', '/checkout/complete', '/digital-wardrobe', '/demo-collection']) {
    assert.match(app, new RegExp(`path="${route.replaceAll('/', '\\/')}"`))
    assert.match(meta, new RegExp(`'${route.replaceAll('/', '\\/')}'`))
  }
  assert.match(app, /path="\/demo-collection" element={<Navigate to="\/digital-wardrobe" replace/)
})
