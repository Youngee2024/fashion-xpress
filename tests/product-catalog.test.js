import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'
import { normalizeCart, readCart, writeCart } from '../src/data/cartStorage.js'
import { calculateDemoTotal, completeDemoCheckout, freshCheckoutDraft, readDemoCollection, selectionsFromCart, validDemoItems } from '../src/data/demoCheckout.js'
import { calculateMintSummary, completeDemoMint, deriveMintMetadata, freshMintDraft, readMintAssets } from '../src/data/demoMint.js'
import { productById, products, selectProducts } from '../src/data/products.js'
import { getRouteMeta } from '../src/data/routeMeta.js'

const checkoutToken = '12345678-1234-4123-8123-123456789abc'
const mintToken = '87654321-4321-4321-8321-cba987654321'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

const originalProducts = [
  ['neo-safari', '/images/collection1.jpg', 25],
  ['quantum-lace', '/images/collection2.jpg', 18],
  ['solaris-cloak', '/images/collection3.jpg', 32],
  ['quantum-silk', '/images/collection4.jpg', 28],
  ['net-xplora', '/images/collection5.jpg', 40],
  ['lavida-locale', '/images/collection6.jpg', 90],
]

const newProducts = [
  { id: 'ancestral-circuit', name: 'Ancestral Circuit', image: '/images/ancestral-circuit.jpg', rarity: 'Rare', stock: 20, price: 3.8, priceUnits: 38, score: 82 },
  { id: 'lagoon-protocol', name: 'Lagoon Protocol', image: '/images/lagoon-protocol.jpg', rarity: 'Ultra Rare', stock: 5, price: 6.5, priceUnits: 65, score: 94 },
  { id: 'harmattan-veil', name: 'Harmattan Veil', image: '/images/harmattan-veil.jpg', rarity: 'Limited', stock: 30, price: 2.9, priceUnits: 29, score: 68 },
]

test('catalogue preserves the original six and appends the three exact new records', () => {
  assert.equal(products.length, 9)
  assert.deepEqual(products.slice(0, 6).map(({ id, image, priceUnits }) => [id, image, priceUnits]), originalProducts)
  assert.deepEqual(products.slice(6).map(({ id }) => id), newProducts.map(({ id }) => id))

  for (const expected of newProducts) {
    const product = productById[expected.id]
    assert.ok(product)
    for (const [field, value] of Object.entries(expected)) assert.equal(product[field], value, `${expected.id}.${field}`)
    assert.equal(product.creator, 'FashionXpress Studio')
    assert.ok(product.description.length >= 70 && product.description.length <= 120)
  }

  for (const product of products) {
    assert.equal(Number.isSafeInteger(product.priceUnits), true)
    assert.equal(product.priceUnits, Math.round(product.price * 10))
  }
})

test('new catalogue images exist at their assigned paths and are JPEG files', async () => {
  for (const product of products.slice(6)) {
    const file = new URL(`../public${product.image}`, import.meta.url)
    const [header, details] = await Promise.all([readFile(file).then((buffer) => buffer.subarray(0, 3)), stat(file)])
    assert.deepEqual([...header], [0xff, 0xd8, 0xff], product.image)
    assert.ok(details.size > 0, product.image)
  }
})

test('catalogue search, rarity filters and integer-price sorting include new products', () => {
  assert.deepEqual(selectProducts({ query: 'tidal' }).map(({ id }) => id), ['lagoon-protocol'])
  assert.deepEqual(selectProducts({ query: 'dry-season' }).map(({ id }) => id), ['harmattan-veil'])
  assert.ok(selectProducts({ filter: 'Rare' }).some(({ id }) => id === 'ancestral-circuit'))
  assert.ok(selectProducts({ filter: 'Ultra Rare' }).some(({ id }) => id === 'lagoon-protocol'))
  assert.ok(selectProducts({ filter: 'Limited' }).some(({ id }) => id === 'harmattan-veil'))
  assert.deepEqual(selectProducts().map(({ id }) => id), products.map(({ id }) => id))
  assert.equal(selectProducts({ sort: 'low' })[0].id, 'quantum-lace')
  assert.equal(selectProducts({ sort: 'high' })[0].id, 'lavida-locale')
})

test('all new product-detail routes receive specific titles and descriptions', () => {
  for (const product of products.slice(6)) {
    const metadata = getRouteMeta(`/collections/${product.id}`)
    assert.equal(metadata.title, `${product.name} | FashionXpress`)
    assert.match(metadata.description, new RegExp(product.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('Ancestral Circuit persists in the cart and completes checkout with integer totals', () => {
  const cartStorage = memoryStorage()
  const cart = normalizeCart([{ id: 'ancestral-circuit', quantity: 2 }])
  assert.equal(writeCart(cart, cartStorage), true)
  assert.deepEqual(readCart(cartStorage).map(({ product, quantity }) => [product.id, quantity]), [['ancestral-circuit', 2]])

  const items = selectionsFromCart(cart, { 'ancestral-circuit': 'social' })
  const totals = calculateDemoTotal(items)
  assert.deepEqual({ subtotal: totals.subtotalUnits, adjustment: totals.adjustmentUnits, total: totals.totalUnits }, { subtotal: 76, adjustment: 16, total: 92 })

  const checkoutStorage = memoryStorage()
  const draft = { ...freshCheckoutDraft(cart, checkoutToken), highestStep: 4, licences: { 'ancestral-circuit': 'social' } }
  const receipt = completeDemoCheckout(cart, draft, checkoutStorage, '2026-09-20T12:00:00.000Z')
  assert.equal(receipt.items[0].id, 'ancestral-circuit')
  assert.equal(readDemoCollection(checkoutStorage)[0].items[0].licence, 'social')
  assert.equal(validDemoItems(products.map(({ id }) => ({ id, quantity: 1, licence: 'personal' }))), true)
})

test('Lagoon Protocol creates trusted mint metadata and an idempotent Demo Vault asset', () => {
  const metadata = deriveMintMetadata('lagoon-protocol', 'personal')
  assert.equal(metadata.product.image, '/images/lagoon-protocol.jpg')
  assert.equal(metadata.identifier, 'demo:metadata:lagoon-protocol')
  assert.equal(metadata.edition, 'Concept 1 of 5')

  const summary = calculateMintSummary('lagoon-protocol', 'loom-garden', 'personal')
  assert.deepEqual({ mint: summary.mintUnits, gas: summary.gasUnits, total: summary.totalUnits }, { mint: 65, gas: 3, total: 68 })

  const storage = memoryStorage()
  const draft = { ...freshMintDraft('lagoon-protocol', { entrySource: 'product' }, mintToken), step: 'progress', highestStep: 4, progressIndex: 4, walletActive: true, acknowledged: true }
  const first = completeDemoMint(draft, storage, '2026-09-20T12:00:00.000Z')
  const second = completeDemoMint(draft, storage, '2026-09-20T13:00:00.000Z')
  assert.deepEqual(second, first)
  assert.equal(readMintAssets(storage)[0].productId, 'lagoon-protocol')
})

test('Harmattan Veil is available to the trusted Virtual Try-On selection', async () => {
  const page = await readFile(new URL('../src/pages/ARTryOn.jsx', import.meta.url), 'utf8')
  assert.equal(productById['harmattan-veil'].image, '/images/harmattan-veil.jpg')
  assert.match(page, /productById\[requestedProduct\] \?\? products\[0\]/)
  assert.match(page, /products\.map\(\(product\) =>/)
  assert.deepEqual(products.slice(0, 3).map(({ id }) => id), ['neo-safari', 'quantum-lace', 'solaris-cloak'])
})
