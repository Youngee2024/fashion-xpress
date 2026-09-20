import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DEMO_COLLECTION_KEY, completeDemoCheckout, freshCheckoutDraft, readDemoCollection } from '../src/data/demoCheckout.js'
import { MINT_ASSETS_KEY, completeDemoMint, freshMintDraft, readMintAssets } from '../src/data/demoMint.js'
import { productById } from '../src/data/products.js'

const checkoutToken = '12345678-1234-4123-8123-123456789abc'
const mintToken = 'abcdef12-1234-4123-8123-123456789abc'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values),
  }
}

test('Digital Wardrobe contains only commerce records and links to the separate Collectibles Lab', async () => {
  const source = await readFile(new URL('../src/pages/DemoVault.jsx', import.meta.url), 'utf8')
  for (const label of ['Quantity', 'Digital-use licence', 'Base price', 'Licence-adjusted price', 'Line total', 'Demo order reference', 'Demo order date']) assert.match(source, new RegExp(label))
  assert.match(source, /Demo licence.not transferred/)
  for (const action of ['View product', 'Open Virtual Try-On', 'View licence explanation', 'Continue shopping', 'Reset Digital Wardrobe']) assert.match(source, new RegExp(action))
  assert.match(source, /Looking for your demo collectibles/)
  assert.match(source, /to="\/collectibles"/)
  assert.doesNotMatch(source, /readMintAssets|removeMintAsset|asset\.edition|transactionReference/)
  const lab = await readFile(new URL('../src/pages/Collectibles.jsx', import.meta.url), 'utf8')
  assert.match(lab, /readMintAssets/)
  assert.match(lab, /Your demo collectibles/)
  assert.match(lab, /not Naira purchases, Wardrobe items/)
})

test('checkout receipts and mint simulations remain in independent schemas and totals', () => {
  const storage = memoryStorage()
  const cart = [{ product: productById['neo-safari'], quantity: 1 }]
  const checkoutDraft = { ...freshCheckoutDraft(cart, checkoutToken), highestStep: 4, licences: { 'neo-safari': 'social' } }
  const receipt = completeDemoCheckout(cart, checkoutDraft, storage, '2026-09-20T10:00:00.000Z')
  const mintDraft = { ...freshMintDraft('neo-safari', {}, mintToken), step: 'progress', highestStep: 4, progressIndex: 4, walletActive: true, acknowledged: true }
  const collectible = completeDemoMint(mintDraft, storage, '2026-09-20T11:00:00.000Z')

  assert.equal(readDemoCollection(storage)[0].totalKobo, receipt.totalKobo)
  assert.equal(readMintAssets(storage)[0].assetId, collectible.assetId)
  assert.deepEqual(Object.keys(storage.dump()).sort(), [DEMO_COLLECTION_KEY, MINT_ASSETS_KEY].sort())
  assert.equal('totalKobo' in collectible, false)
  assert.equal('transactionReference' in receipt, false)
})

test('corrupted Wardrobe data is removed without disturbing collectible state', () => {
  const storage = memoryStorage({ [DEMO_COLLECTION_KEY]: '{broken', [MINT_ASSETS_KEY]: '[]' })
  assert.deepEqual(readDemoCollection(storage), [])
  assert.equal(storage.getItem(DEMO_COLLECTION_KEY), null)
  assert.equal(storage.getItem(MINT_ASSETS_KEY), '[]')
})
